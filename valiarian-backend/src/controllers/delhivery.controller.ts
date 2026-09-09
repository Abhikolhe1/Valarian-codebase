import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {ShipmentRepository} from '../repositories';
import {ShippingService} from '../services/shipping.service';
import {WarehouseService} from '../services/warehouse.service';
import {
  DelhiveryShippingCostParams,
  DelhiveryWarehouseRequest,
} from '../services/shipping-providers/delhivery.provider';

const DOCUMENT_TYPES = [
  'SIGNATURE_URL',
  'RVP_QC_IMAGE',
  'EPOD',
  'SELLER_RETURN_IMAGE',
];

@authenticate('jwt')
export class DelhiveryController {
  constructor(
    @repository(ShipmentRepository)
    private shipmentRepository: ShipmentRepository,
    @inject('services.shipping')
    private shippingService: ShippingService,
    @inject('services.warehouse')
    private warehouseService: WarehouseService,
  ) {}

  private async delhiveryShipment(shipmentId: string) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (shipment.courierName !== 'Delhivery') {
      throw new HttpErrors.UnprocessableEntity(
        'This operation is available only for a Delhivery shipment.',
      );
    }
    return shipment;
  }

  @patch('/api/admin/delhivery/shipments/{shipmentId}')
  @authorize({roles: ['super_admin', 'admin']})
  async updateShipment(
    @param.path.string('shipmentId') shipmentId: string,
    @requestBody() request: {
      name?: string;
      phone?: string;
      paymentMode?: 'COD' | 'Prepaid';
      codAmount?: number;
      address?: string;
      productsDescription?: string;
      weightGrams?: number;
      heightCm?: number;
      widthCm?: number;
      lengthCm?: number;
    },
  ): Promise<{success: true; providerResponse: unknown}> {
    const shipment = await this.delhiveryShipment(shipmentId);
    if (!Object.values(request).some(value => value !== undefined)) {
      throw new HttpErrors.BadRequest('Provide at least one shipment field to update.');
    }
    const tracking = await this.shippingService.trackShipment(
      shipment.awbNumber,
      shipment.courierName,
    );
    if (!['created', 'pickup_pending', 'in_transit', 'exception'].includes(tracking.currentStatus)) {
      throw new HttpErrors.Conflict(
        `Delhivery shipment status '${tracking.courierRawStatus}' cannot be edited.`,
      );
    }
    if (request.paymentMode === 'COD' && !(Number(request.codAmount) > 0)) {
      throw new HttpErrors.BadRequest(
        'A positive COD amount is required when changing to COD.',
      );
    }
    const currentPaymentMode = shipment.isCod ? 'COD' : 'Prepaid';
    if (request.paymentMode === currentPaymentMode) {
      throw new HttpErrors.BadRequest(
        `Delhivery does not allow ${currentPaymentMode}-to-${currentPaymentMode} payment-mode updates. Omit paymentMode when editing other fields.`,
      );
    }
    const providerResponse = await this.shippingService.updateDelhiveryShipment({
      waybill: shipment.awbNumber,
      ...request,
    });
    await this.shipmentRepository.updateById(shipment.id, {
      weightGrams: request.weightGrams ?? shipment.weightGrams,
      heightCm: request.heightCm ?? shipment.heightCm,
      breadthCm: request.widthCm ?? shipment.breadthCm,
      lengthCm: request.lengthCm ?? shipment.lengthCm,
      isCod: request.paymentMode ? request.paymentMode === 'COD' : shipment.isCod,
      codAmount: request.paymentMode === 'COD'
        ? request.codAmount
        : request.paymentMode === 'Prepaid'
          ? 0
          : shipment.codAmount,
      updatedAt: new Date(),
    });
    return {success: true, providerResponse};
  }

  @post('/api/admin/delhivery/shipments/{shipmentId}/ewaybill')
  @authorize({roles: ['super_admin', 'admin']})
  async updateEwaybill(
    @param.path.string('shipmentId') shipmentId: string,
    @requestBody() request: {invoiceNumber: string; ewaybillNumber: string},
  ): Promise<{success: true; providerResponse: unknown}> {
    const shipment = await this.delhiveryShipment(shipmentId);
    if (!request.invoiceNumber?.trim() || !request.ewaybillNumber?.trim()) {
      throw new HttpErrors.BadRequest(
        'Invoice number and E-Waybill number are required.',
      );
    }
    const providerResponse = await this.shippingService.updateDelhiveryEwaybill(
      shipment.awbNumber,
      request.invoiceNumber.trim(),
      request.ewaybillNumber.trim(),
    );
    return {success: true, providerResponse};
  }

  @post('/api/admin/delhivery/shipping-cost')
  @authorize({roles: ['super_admin', 'admin']})
  async calculateShippingCost(
    @requestBody() request: DelhiveryShippingCostParams,
  ): Promise<unknown> {
    if (!/^[1-9]\d{5}$/.test(request.originPincode) ||
      !/^[1-9]\d{5}$/.test(request.destinationPincode)) {
      throw new HttpErrors.BadRequest('Origin and destination must be valid six-digit Indian PIN codes.');
    }
    if (!(Number(request.weightGrams) > 0)) {
      throw new HttpErrors.BadRequest('Weight must be greater than zero grams.');
    }
    for (const [name, value] of [
      ['lengthCm', request.lengthCm],
      ['breadthCm', request.breadthCm],
      ['heightCm', request.heightCm],
    ] as const) {
      if (value !== undefined && !(Number(value) > 0)) {
        throw new HttpErrors.BadRequest(`${name} must be greater than zero when provided.`);
      }
    }
    return this.shippingService.calculateDelhiveryShippingCost(request);
  }

  @get('/api/admin/delhivery/waybills')
  @authorize({roles: ['super_admin', 'admin']})
  async fetchWaybills(
    @param.query.number('count') count?: number,
  ): Promise<unknown> {
    if (count !== undefined &&
      (!Number.isInteger(count) || count < 1 || count > 10000)) {
      throw new HttpErrors.BadRequest(
        'Waybill count must be an integer between 1 and 10,000.',
      );
    }
    return this.shippingService.fetchDelhiveryWaybills(count);
  }

  @get('/api/admin/delhivery/shipments/{shipmentId}/documents/{documentType}')
  @authorize({roles: ['super_admin', 'admin']})
  async downloadDocument(
    @param.path.string('shipmentId') shipmentId: string,
    @param.path.string('documentType') documentType: string,
  ): Promise<unknown> {
    const shipment = await this.delhiveryShipment(shipmentId);
    const normalized = documentType.trim().toUpperCase();
    if (!DOCUMENT_TYPES.includes(normalized)) {
      throw new HttpErrors.BadRequest('Unsupported Delhivery document type.');
    }
    return this.shippingService.downloadDelhiveryDocument(
      shipment.awbNumber,
      normalized,
    );
  }

  @post('/api/admin/delhivery/shipments/{shipmentId}/ndr')
  @authorize({roles: ['super_admin', 'admin']})
  async submitNdr(
    @param.path.string('shipmentId') shipmentId: string,
    @requestBody() request: {action: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE'},
  ): Promise<unknown> {
    const shipment = await this.delhiveryShipment(shipmentId);
    if (!['RE-ATTEMPT', 'PICKUP_RESCHEDULE'].includes(request.action)) {
      throw new HttpErrors.BadRequest('Unsupported NDR action.');
    }
    const tracking = await this.shippingService.trackShipment(
      shipment.awbNumber,
      shipment.courierName,
    );
    const allowedCodes = request.action === 'RE-ATTEMPT'
      ? ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6']
      : ['EOD-777', 'EOD-21'];
    if (!tracking.courierNdrCode || !allowedCodes.includes(tracking.courierNdrCode)) {
      throw new HttpErrors.Conflict(
        `NDR action ${request.action} is not allowed for current NSL code ${tracking.courierNdrCode ?? 'unknown'}.`,
      );
    }
    if (![1, 2].includes(tracking.attemptNumber ?? -1)) {
      throw new HttpErrors.Conflict(
        `NDR action ${request.action} requires delivery attempt 1 or 2; Delhivery reported ${tracking.attemptNumber ?? 'an unknown attempt count'}.`,
      );
    }
    return this.shippingService.submitDelhiveryNdr(
      shipment.awbNumber,
      request.action,
    );
  }

  @get('/api/admin/delhivery/ndr/{requestId}')
  @authorize({roles: ['super_admin', 'admin']})
  async getNdrStatus(
    @param.path.string('requestId') requestId: string,
  ): Promise<unknown> {
    if (!/^UPL[0-9A-Za-z_-]+$/.test(requestId)) {
      throw new HttpErrors.BadRequest('Invalid Delhivery NDR request ID.');
    }
    return this.shippingService.getDelhiveryNdrStatus(requestId);
  }

  @post('/api/admin/delhivery/warehouses')
  @authorize({roles: ['super_admin', 'admin']})
  async createWarehouse(
    @requestBody() request: DelhiveryWarehouseRequest,
  ): Promise<unknown> {
    if (!request.name?.trim() || !request.phone?.trim() ||
      !request.returnAddress?.trim()) {
      throw new HttpErrors.BadRequest(
        'Warehouse name, phone, and return address are required.',
      );
    }
    if (!/^[1-9]\d{5}$/.test(request.pin) ||
      (request.returnPin !== undefined && !/^[1-9]\d{5}$/.test(request.returnPin))) {
      throw new HttpErrors.BadRequest(
        'Warehouse and return PINs must be valid six-digit Indian PIN codes.',
      );
    }
    return this.shippingService.createDelhiveryWarehouse(request);
  }

  @patch('/api/admin/delhivery/warehouses/{name}')
  @authorize({roles: ['super_admin', 'admin']})
  async updateWarehouse(
    @param.path.string('name') name: string,
    @requestBody() request: {pin: string; address?: string; phone?: string},
  ): Promise<unknown> {
    if (!/^[1-9]\d{5}$/.test(request.pin)) {
      throw new HttpErrors.BadRequest('Warehouse PIN must be a valid six-digit Indian PIN code.');
    }
    return this.shippingService.updateDelhiveryWarehouse(
      name,
      request.pin,
      request.address,
      request.phone,
    );
  }

  @post('/api/admin/delhivery/pickups')
  @authorize({roles: ['super_admin', 'admin']})
  async createPickup(
    @requestBody() request: {
      shipmentIds: string[];
      warehouseId?: string;
      pickupDate: string;
      pickupTime?: string;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: true; pickupReference: string}> {
    const ids = [...new Set(request.shipmentIds ?? [])];
    if (ids.length === 0 || ids.length > 500) {
      throw new HttpErrors.BadRequest('Select between 1 and 500 shipments for pickup.');
    }
    const shipments = await this.shipmentRepository.find({where: {id: {inq: ids}}});
    if (shipments.length !== ids.length || shipments.some(item =>
      item.courierName !== 'Delhivery' || item.isReverse || item.isDeleted)) {
      throw new HttpErrors.BadRequest('Every selected record must be an active forward Delhivery shipment.');
    }
    if (shipments.some(item => item.pickupReference)) {
      throw new HttpErrors.Conflict('At least one selected shipment already has a pickup request.');
    }
    if (shipments.some(item => item.status !== 'created')) {
      throw new HttpErrors.Conflict(
        'Pickup can be requested only for newly created, packed Delhivery shipments.',
      );
    }
    const warehouseNames = new Set(shipments.map(item => item.warehouseName));
    if (warehouseNames.size !== 1) {
      throw new HttpErrors.BadRequest('All selected shipments must use the same warehouse.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.pickupDate)) {
      throw new HttpErrors.BadRequest('Pickup date must use YYYY-MM-DD format.');
    }
    const pickupDate = new Date(`${request.pickupDate}T00:00:00`);
    if (Number.isNaN(pickupDate.getTime()) ||
      pickupDate.getFullYear() !== Number(request.pickupDate.slice(0, 4)) ||
      pickupDate.getMonth() + 1 !== Number(request.pickupDate.slice(5, 7)) ||
      pickupDate.getDate() !== Number(request.pickupDate.slice(8, 10))) {
      throw new HttpErrors.BadRequest('Pickup date is not a valid calendar date.');
    }
    const pickupTime = request.pickupTime ?? '11:00';
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(pickupTime)) {
      throw new HttpErrors.BadRequest('Pickup time must use HH:mm or HH:mm:ss format.');
    }
    const origin = await this.warehouseService.getOriginDetailsForShipment(
      request.warehouseId,
    );
    if (origin.name !== shipments[0].warehouseName) {
      throw new HttpErrors.BadRequest('Selected warehouse does not match the shipment warehouse.');
    }
    const result = await this.shippingService.registerPickup({
      providerRequestId: `delhivery-pickup:${request.pickupDate}:${origin.name}`,
      awbNumber: shipments[0].awbNumber,
      areaCode: '',
      customerCode: '',
      customerName: origin.name,
      addressLine1: origin.addressLine1,
      addressLine2: origin.city,
      addressLine3: origin.state,
      pincode: origin.pincode,
      phone: origin.phone,
      numberOfPieces: shipments.length,
      weightKg: shipments.reduce((sum, item) => sum + Number(item.weightGrams ?? 0), 0) / 1000,
      pickupDate,
      pickupTime,
      officeCloseTime: '18:00',
      productCode: 'S',
    }, 'Delhivery');
    const now = new Date();
    await Promise.all(shipments.map(shipment => this.shipmentRepository.updateById(
      shipment.id,
      {
        pickupReference: result.pickupReference,
        pickupRegisteredAt: now,
        status: 'pickup_pending',
        updatedAt: now,
      },
    )));
    return {success: true, pickupReference: result.pickupReference};
  }
}
