import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository, Filter} from '@loopback/repository';
import {
  post,
  param,
  requestBody,
  get,
  del,
  HttpErrors,
  Response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {TrackingResult} from '../interfaces/shipping-provider.interface';
import {Shipment, ShipmentEvent, ShipmentItem, ShipmentLabel} from '../models';
import {
  ShipmentRepository,
  ShipmentEventRepository,
  ShipmentItemRepository,
  ShipmentLabelRepository,
  OrderRepository,
  OrderItemRepository,
  ReturnRequestRepository,
  ProductRepository,
  ProductVariantRepository,
} from '../repositories';
import {ShippingService} from '../services/shipping.service';
import {InventoryLifecycleService} from '../services/inventory-lifecycle.service';
import {WarehouseService} from '../services/warehouse.service';
import {ShippingAuditService} from '../services/shipping-audit.service';
import {validateShipmentAddress} from '../utils/shipment-address-validator';
import {
  calculateOrderShippingDimensions,
  ProductShippingData,
} from '../utils/shipping-dimensions.utils';
import * as fs from 'fs';
import * as path from 'path';

interface CreateShipmentRequest {
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  serviceType?: string;
  generateLabelNow?: boolean;
  warehouseId?: string;
}

interface CreateReversePickupRequest {
  weightGrams?: number;
  itemDescription?: string;
}

export class ShipmentController {
  constructor(
    @repository(ShipmentRepository)
    public shipmentRepository: ShipmentRepository,
    @repository(ShipmentEventRepository)
    public shipmentEventRepository: ShipmentEventRepository,
    @repository(ShipmentItemRepository)
    public shipmentItemRepository: ShipmentItemRepository,
    @repository(ShipmentLabelRepository)
    public shipmentLabelRepository: ShipmentLabelRepository,
    @repository(OrderRepository) public orderRepository: OrderRepository,
    @repository(OrderItemRepository)
    public orderItemRepository: OrderItemRepository,
    @repository(ReturnRequestRepository)
    public returnRequestRepository: ReturnRequestRepository,
    @repository(ProductRepository) public productRepository: ProductRepository,
    @repository(ProductVariantRepository)
    public productVariantRepository: ProductVariantRepository,
    @inject('services.shipping') public shippingService: ShippingService,
    @inject('services.inventory-lifecycle')
    public inventoryLifecycleService: InventoryLifecycleService,
    @inject('services.warehouse') public warehouseService: WarehouseService,
    @inject('services.shipping-audit')
    public auditService: ShippingAuditService,
  ) {}

  /**
   * Serializes shipment creation for an order across backend instances using a
   * PostgreSQL transaction-scoped advisory lock. All application creation paths
   * must enter through this helper; the database unique index remains the final
   * safety net.
   */
  private async withOrderCreationLock<T>(
    lockKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const transaction = await this.orderRepository.dataSource.beginTransaction();
    try {
      await this.orderRepository.dataSource.execute(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [lockKey],
        {transaction},
      );
      const result = await action();
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  @post('/api/admin/orders/{id}/shipments')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async createShipment(
    @param.path.string('id') id: string,
    @requestBody() req: CreateShipmentRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<Shipment> {
    return this.withOrderCreationLock(`forward:${id}`, () =>
      this.createShipmentUnlocked(id, req, currentUser),
    );
  }

  private async createShipmentUnlocked(
    id: string,
    req: CreateShipmentRequest,
    currentUser: UserProfile,
  ): Promise<Shipment> {
    const order = await this.orderRepository.findById(id);

    // 1. Enforce order packed state
    if (order.status !== 'packed') {
      throw new HttpErrors.UnprocessableEntity(
        `AWB cannot be generated. Order status must be 'packed'. Current: '${order.status}'`,
      );
    }

    // 2. Validate shipment address
    const validation = validateShipmentAddress(order.shippingAddress);
    if (!validation.isValid) {
      throw new HttpErrors.UnprocessableEntity(
        JSON.stringify({
          message: 'Shipment address is invalid.',
          errors: validation.errors,
        }),
      );
    }

    // 3. Idempotent check
    const existing = await this.shipmentRepository.findOne({
      where: {orderId: id, isReverse: false, status: {neq: 'cancelled'}},
    });
    if (existing) {
      return existing;
    }

    // 4. Calculate default weight / dimensions
    const orderItems = await this.orderItemRepository.find({
      where: {orderId: id},
    });
    const products: ProductShippingData[] = [];
    for (const item of orderItems) {
      const prod = await this.productRepository.findById(item.productId);
      let variant = undefined;
      if (item.variantId) {
        try {
          variant = await this.productVariantRepository.findById(
            item.variantId,
          );
        } catch (e) {
          // ignore
        }
      }
      products.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        productDimensions: prod?.shippingDimensions,
        variantDimensions: variant?.shippingDimensions,
      });
    }
    const computedDims = calculateOrderShippingDimensions(products);

    const weightGrams = req.weightGrams ?? computedDims.chargeableWeightGrams;
    const lengthCm = req.lengthCm ?? computedDims.lengthCm;
    const breadthCm = req.breadthCm ?? computedDims.breadthCm;
    const heightCm = req.heightCm ?? computedDims.heightCm;

    // 5. Check serviceability
    const servCheck = await this.shippingService.checkServiceability({
      pincode: order.shippingAddress.zipCode,
    });
    if (!servCheck.isServiceable) {
      throw new HttpErrors.UnprocessableEntity(
        'Pincode is not serviceable by Blue Dart.',
      );
    }
    if (order.paymentMethod === 'cod' && !servCheck.isCodAvailable) {
      throw new HttpErrors.UnprocessableEntity(
        'COD is not available for this pincode.',
      );
    }

    // 6. Resolve warehouse origin details
    const origin = await this.warehouseService.getOriginDetailsForShipment(
      req.warehouseId,
    );

    // 7. Invoke provider waybill generation
    const creationResult = await this.shippingService.createShipment({
      providerRequestId: `forward:${order.id}`,
      orderReference: order.id,
      orderNumber: order.orderNumber,
      receiverName: order.shippingAddress.fullName,
      receiverPhone: order.shippingAddress.phone,
      receiverEmail: order.shippingAddress.email,
      receiverAddress: order.shippingAddress.address,
      receiverCity: order.shippingAddress.city,
      receiverState: order.shippingAddress.state,
      receiverPincode: order.shippingAddress.zipCode,
      receiverCountry: order.shippingAddress.country,
      warehouseAreaCode: origin.bluedartAreaCode,
      warehouseOriginArea: origin.bluedartOriginArea,
      warehousePincode: origin.pincode,
      warehouseName: origin.name,
      warehouseAddressLine1: origin.addressLine1,
      warehouseCity: origin.city,
      warehouseState: origin.state,
      warehousePhone: origin.phone,
      weightGrams,
      lengthCm,
      breadthCm,
      heightCm,
      declaredValue: order.total,
      isCod: order.paymentMethod === 'cod',
      codAmount: order.paymentMethod === 'cod' ? order.total : 0,
      codFavorOf: process.env.BLUEDART_COD_FAVOR_OF || 'Valarian Pvt Ltd',
    });

    // 8. Create Shipment record
    const shipment = await this.shipmentRepository.create({
      orderId: order.id,
      awbNumber: creationResult.awbNumber,
      courierName: 'BlueDart',
      courierReferenceNumber: creationResult.courierReferenceNumber,
      weightGrams,
      lengthCm,
      breadthCm,
      heightCm,
      isCod: order.paymentMethod === 'cod',
      codAmount: order.paymentMethod === 'cod' ? order.total : 0,
      status: 'created',
      estimatedDelivery: creationResult.estimatedDelivery,
      warehouseId: req.warehouseId,
      warehouseName: origin.name,
      shippingCharge: creationResult.shippingCharge,
      fuelSurcharge: creationResult.fuelSurcharge,
      codCharge: creationResult.codCharge,
      otherCharges: creationResult.otherCharges,
      totalCourierCost: creationResult.totalCourierCost,
      chargesUnavailable: creationResult.chargesUnavailable,
      providerRequestId: `forward:${order.id}`,
      providerMode: this.shippingService.getProviderVersion() as any,
      creationState: 'CREATED',
      reconciliationRequired: false,
      isReverse: false,
      isActive: true,
      isDeleted: false,
    });

    // 9. Map order items to shipment join table
    for (const item of orderItems) {
      await this.shipmentItemRepository.create({
        shipmentId: shipment.id,
        orderItemId: item.id,
        quantity: item.quantity,
      });
    }

    // 10. Deduct inventory
    await this.inventoryLifecycleService.deductOnShipment(
      order.id,
      currentUser.id,
      currentUser.email,
    );

    // 11. Update Order status
    await this.orderRepository.updateById(order.id, {
      status: 'shipped',
      trackingNumber: creationResult.awbNumber,
      carrier: 'BlueDart',
      estimatedDelivery: creationResult.estimatedDelivery,
      updatedAt: new Date(),
    });

    // 12. Create Shipment Label if requested
    if (req.generateLabelNow) {
      const labelRes = await this.shippingService.generateLabel(
        creationResult.awbNumber,
      );
      const storageDir =
        process.env.STORAGE_PATH || path.join(__dirname, '../../uploads');
      const labelPath = path.join(storageDir, 'labels');
      if (!fs.existsSync(labelPath)) {
        fs.mkdirSync(labelPath, {recursive: true});
      }
      const labelFile = `${creationResult.awbNumber}.pdf`;
      const fileUrl = `/uploads/labels/${labelFile}`;
      fs.writeFileSync(path.join(labelPath, labelFile), labelRes.pdf);

      await this.shipmentLabelRepository.create({
        shipmentId: shipment.id,
        labelType: 'awb_label',
        fileUrl,
        generatedAt: new Date(),
        generatedBy: currentUser.id,
      });

      await this.shipmentRepository.updateById(shipment.id, {
        labelUrl: fileUrl,
      });
      shipment.labelUrl = fileUrl;
    }

    await this.auditService.logCreateShipment(
      currentUser.id,
      currentUser.email,
      shipment,
    );

    return shipment;
  }

  @del('/api/admin/shipments/{shipmentId}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async cancelShipment(
    @param.path.string('shipmentId') shipmentId: string,
    @param.query.string('reason') reason = 'Cancelled by Admin',
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; message: string}> {
    const shipment = await this.shipmentRepository.findById(shipmentId);

    // Cancellable states: created, pickup_pending
    const cancellableStates = ['created', 'pickup_pending'];
    if (!cancellableStates.includes(shipment.status)) {
      throw new HttpErrors.Conflict(
        `Shipment status '${shipment.status}' cannot be cancelled via API. Standard fallback: Contact Blue Dart customer service to recall.`,
      );
    }

    try {
      const cancelRes = await this.shippingService.cancelShipment(
        shipment.awbNumber,
      );
      if (!cancelRes.success) {
        throw new HttpErrors.UnprocessableEntity(
          `Courier rejected cancellation request: ${cancelRes.message || 'Unknown reason'}`,
        );
      }

      // Success cancellation
      await this.shipmentRepository.updateById(shipmentId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      });

      // Restore inventory
      await this.inventoryLifecycleService.restoreOnVoidedShipment(
        shipment.orderId,
        currentUser.id,
        currentUser.email,
      );

      // Revert Order status
      await this.orderRepository.updateById(shipment.orderId, {
        status: 'packed',
        trackingNumber: undefined,
        carrier: undefined,
        estimatedDelivery: undefined,
        updatedAt: new Date(),
      });

      await this.auditService.logCancelShipment(
        currentUser.id,
        currentUser.email,
        shipment,
        reason,
      );

      return {
        success: true,
        message: 'Shipment cancelled successfully and inventory restored.',
      };
    } catch (err) {
      if (err instanceof HttpErrors.HttpError) throw err;

      // System / Network failure: transition to cancel_pending
      await this.shipmentRepository.updateById(shipmentId, {
        status: 'cancel_pending',
        cancellationReason: reason,
        updatedAt: new Date(),
      });

      return {
        success: false,
        message: `Network error during cancellation. Status set to 'cancel_pending': ${err.message || err}`,
      };
    }
  }

  @post('/api/admin/shipments/{shipmentId}/regenerate-awb')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async regenerateAwb(
    @param.path.string('shipmentId') shipmentId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<Shipment> {
    const oldShipment = await this.shipmentRepository.findById(shipmentId);

    // Cancel old shipment
    await this.cancelShipment(shipmentId, 'AWB Regenerated', currentUser);

    // Generate new AWB with same package dimensions
    return this.createShipment(
      oldShipment.orderId,
      {
        weightGrams: oldShipment.weightGrams,
        lengthCm: oldShipment.lengthCm,
        breadthCm: oldShipment.breadthCm,
        heightCm: oldShipment.heightCm,
        warehouseId: oldShipment.warehouseId,
        generateLabelNow: true,
      },
      currentUser,
    );
  }

  @post('/api/admin/shipments/{shipmentId}/sync-tracking')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async syncTracking(
    @param.path.string('shipmentId') shipmentId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<TrackingResult> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    const prevStatus = shipment.status;

    const tracking = await this.shippingService.trackShipment(
      shipment.awbNumber,
    );

    const updates: Partial<Shipment> = {
      status: tracking.currentStatus,
      currentLocation: tracking.currentLocation,
      deliveredAt: tracking.deliveredAt,
      trackingLastSyncedAt: new Date(),
      rawTrackingData: tracking.rawResponse as object,
      updatedAt: new Date(),
    };
    await this.shipmentRepository.updateById(shipmentId, updates);

    // Persist new events
    for (const event of tracking.events) {
      const existingEvent = await this.shipmentEventRepository.findOne({
        where: {
          shipmentId,
          courierRawCode: event.courierRawCode,
          timestamp: event.timestamp,
        },
      });

      if (!existingEvent) {
        await this.shipmentEventRepository.create({
          shipmentId,
          internalStatus: event.internalStatus,
          courierRawCode: event.courierRawCode,
          courierDescription: event.courierDescription,
          description: event.description,
          location: event.location,
          timestamp: event.timestamp,
          rawData: scanDetails(event),
          createdAt: new Date(),
        });
      }
    }

    // Update order status if delivered or RTO
    if (tracking.currentStatus === 'delivered') {
      await this.orderRepository.updateById(shipment.orderId, {
        status: 'delivered',
        deliveredAt: tracking.deliveredAt || new Date(),
        updatedAt: new Date(),
      });
    } else if (tracking.currentStatus === 'rto_initiated') {
      await this.orderRepository.updateById(shipment.orderId, {
        status: 'rto_initiated',
        rtoStatus: 'initiated',
        rtoInitiatedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const updatedShipment = await this.shipmentRepository.findById(shipmentId);
    await this.auditService.logSyncTracking(
      currentUser.id,
      currentUser.email,
      updatedShipment,
      prevStatus,
    );

    return tracking;
  }

  @get('/api/admin/shipments/{shipmentId}/label')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async downloadLabel(
    @param.path.string('shipmentId') shipmentId: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<any> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    const existingLabel = await this.shipmentLabelRepository.findOne({
      where: {shipmentId, labelType: 'awb_label'},
    });

    let pdfBuffer: Buffer;

    if (existingLabel) {
      const storageDir =
        process.env.STORAGE_PATH || path.join(__dirname, '../../uploads');
      const fileName = path.basename(existingLabel.fileUrl);
      const filePath = path.join(storageDir, 'labels', fileName);
      if (fs.existsSync(filePath)) {
        pdfBuffer = fs.readFileSync(filePath);
      } else {
        const labelRes = await this.shippingService.generateLabel(
          shipment.awbNumber,
        );
        pdfBuffer = labelRes.pdf;
        fs.writeFileSync(filePath, pdfBuffer);
      }
    } else {
      const labelRes = await this.shippingService.generateLabel(
        shipment.awbNumber,
      );
      pdfBuffer = labelRes.pdf;

      const storageDir =
        process.env.STORAGE_PATH || path.join(__dirname, '../../uploads');
      const labelPath = path.join(storageDir, 'labels');
      if (!fs.existsSync(labelPath)) {
        fs.mkdirSync(labelPath, {recursive: true});
      }
      const labelFile = `${shipment.awbNumber}.pdf`;
      const fileUrl = `/uploads/labels/${labelFile}`;
      fs.writeFileSync(path.join(labelPath, labelFile), pdfBuffer);

      await this.shipmentLabelRepository.create({
        shipmentId,
        labelType: 'awb_label',
        fileUrl,
        generatedAt: new Date(),
        generatedBy: currentUser.id,
      });

      await this.shipmentRepository.updateById(shipmentId, {labelUrl: fileUrl});
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=Label_${shipment.awbNumber}.pdf`,
    );
    response.send(pdfBuffer);
    return response;
  }

  @post('/api/admin/orders/{id}/reverse-pickup')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async createReversePickup(
    @param.path.string('id') id: string,
    @requestBody() req: CreateReversePickupRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<Shipment> {
    return this.withOrderCreationLock(`reverse:${id}`, () =>
      this.createReversePickupUnlocked(id, req, currentUser),
    );
  }

  private async createReversePickupUnlocked(
    id: string,
    req: CreateReversePickupRequest,
    currentUser: UserProfile,
  ): Promise<Shipment> {
    const order = await this.orderRepository.findById(id);
    const returnRequest = await this.returnRequestRepository.findOne({
      where: {orderId: id, status: 'APPROVED'},
    });

    if (!returnRequest) {
      throw new HttpErrors.BadRequest(
        'No approved return request found for this order.',
      );
    }

    const existingReverse = await this.shipmentRepository.findOne({
      where: {orderId: id, isReverse: true, status: {neq: 'cancelled'}},
    });
    if (existingReverse) return existingReverse;

    const forwardShipment = await this.shipmentRepository.findOne({
      where: {orderId: id, isReverse: false},
    });

    const weightGrams = req.weightGrams ?? 500;
    const origin = await this.warehouseService.getOriginDetailsForShipment();

    const reverseRes = await this.shippingService.createReversePickup({
      providerRequestId: `reverse:${returnRequest.id}`,
      originalAwbNumber: forwardShipment?.awbNumber || '',
      orderReference: order.id,
      pickupName: order.shippingAddress.fullName,
      pickupPhone: order.shippingAddress.phone,
      pickupAddress: order.shippingAddress.address,
      pickupCity: order.shippingAddress.city,
      pickupState: order.shippingAddress.state,
      pickupPincode: order.shippingAddress.zipCode,
      warehouseAreaCode: origin.bluedartAreaCode,
      warehouseOriginArea: origin.bluedartOriginArea,
      warehousePincode: origin.pincode,
      warehouseName: origin.name,
      weightGrams,
      itemDescription: req.itemDescription,
    });

    const shipment = await this.shipmentRepository.create({
      orderId: order.id,
      awbNumber: reverseRes.reverseAwbNumber,
      courierName: 'BlueDart',
      courierReferenceNumber: reverseRes.courierReferenceNumber,
      weightGrams,
      status: 'created',
      warehouseId: origin.bluedartAreaCode,
      warehouseName: origin.name,
      isReverse: true,
      parentShipmentId: forwardShipment?.id,
      providerRequestId: `reverse:${returnRequest.id}`,
      providerMode: this.shippingService.getProviderVersion() as any,
      creationState: 'CREATED',
      reconciliationRequired: false,
      isActive: true,
      isDeleted: false,
    });

    await this.returnRequestRepository.updateById(returnRequest.id, {
      reversePickupAwb: reverseRes.reverseAwbNumber,
      reversePickupRequestedAt: new Date(),
      updatedAt: new Date(),
    });

    await this.orderRepository.updateById(id, {
      reversePickupAwb: reverseRes.reverseAwbNumber,
      reversePickupRequestedAt: new Date(),
      status: 'return_requested',
      updatedAt: new Date(),
    });

    await this.auditService.logReversePickup(
      currentUser.id,
      currentUser.email,
      shipment,
    );

    return shipment;
  }

  @get('/api/admin/shipments')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async listShipments(
    @param.query.object('filter') filter?: Filter<Shipment>,
  ): Promise<Shipment[]> {
    return this.shipmentRepository.find(filter);
  }

  @get('/api/admin/orders/{id}/shipments')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async listOrderShipments(
    @param.path.string('id') id: string,
  ): Promise<Shipment[]> {
    return this.shipmentRepository.find({where: {orderId: id}});
  }

  private async productRepositoryGetter(id: string): Promise<any> {
    try {
      return await this.productRepository.findById(id);
    } catch {
      return null;
    }
  }
}

function scanDetails(event: any): object {
  return {
    raw: event,
  };
}
