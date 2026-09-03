import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {IsolationLevel, repository, Filter} from '@loopback/repository';
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
import {selectForwardWaybillService} from '../utils/bluedart-forward-service.utils';
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
    const transaction = await this.orderRepository.dataSource.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
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

    // Blue Dart receives Dimensions: [], so use actual/dead weight rather
    // than the locally calculated volumetric chargeable weight.
    const weightGrams = req.weightGrams ?? computedDims.deadWeightGrams;
    const lengthCm = req.lengthCm ?? computedDims.lengthCm;
    const breadthCm = req.breadthCm ?? computedDims.breadthCm;
    const heightCm = req.heightCm ?? computedDims.heightCm;

    const isCod = order.paymentMethod === 'cod';
    const forwardService = selectForwardWaybillService(isCod);

    // 5. Check the exact service that will be used for the waybill.
    const servCheck = await this.shippingService.checkServiceability({
      pincode: order.shippingAddress.zipCode,
      deliveryMode: forwardService.deliveryMode,
      paymentType: forwardService.paymentType,
    });
    if (!servCheck.isServiceable) {
      if (forwardService.deliveryMode === 'surface') {
        throw new HttpErrors.UnprocessableEntity(
          'Surface delivery is not available for this PIN code.',
        );
      }
      throw new HttpErrors.UnprocessableEntity(
        'Pincode is not serviceable by Blue Dart.',
      );
    }
    if (isCod && !servCheck.isCodAvailable) {
      throw new HttpErrors.UnprocessableEntity(
        'COD is not available for this pincode.',
      );
    }

    // Secure the exact product/variant stock after courier serviceability is
    // known but before creating anything externally. This is idempotent and
    // prevents orphaned AWBs/pickups when local inventory cannot be reserved.
    await this.inventoryLifecycleService.reserveOnOrderConfirmed(
      order.id,
      currentUser.id,
      currentUser.email,
    );

    // 6. Resolve warehouse origin details
    const origin = await this.warehouseService.getOriginDetailsForShipment(
      req.warehouseId,
    );

    // 7. Invoke provider waybill generation
    const creationResult = existing ?? await this.shippingService.createShipment({
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
      productCode: forwardService.productCode,
      subProductCode: forwardService.subProductCode,
      packType: forwardService.packType,
      serviceType: forwardService.serviceType,
      isCod,
      codAmount: isCod ? order.total : 0,
      codFavorOf: process.env.BLUEDART_COD_FAVOR_OF || 'Valarian Pvt Ltd',
    });

    // 8. Create Shipment record
    const shipment = existing ?? await this.shipmentRepository.create({
      orderId: order.id,
      awbNumber: creationResult.awbNumber,
      courierName: 'BlueDart',
      courierReferenceNumber: creationResult.courierReferenceNumber,
      weightGrams,
      lengthCm,
      breadthCm,
      heightCm,
      isCod,
      codAmount: isCod ? order.total : 0,
      productCode: forwardService.productCode,
      subProductCode: forwardService.subProductCode,
      serviceType: forwardService.serviceType,
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

    // 9. Register the packed shipment for collection at the warehouse.
    // Waybill generation and pickup registration are separate Blue Dart APIs.
    if (!shipment.pickupReference) try {
      const now = new Date();
      const pickupTime = process.env.BLUEDART_PICKUP_TIME || '09:00';
      const officeCloseTime = process.env.BLUEDART_OFFICE_CLOSE_TIME || '22:00';
      const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
      const [closeHour, closeMinute] = officeCloseTime.split(':').map(Number);
      const pickupDate = new Date(now);
      const warehouseOpen = new Date(now);
      warehouseOpen.setHours(pickupHour, pickupMinute, 0, 0);
      const warehouseClose = new Date(now);
      warehouseClose.setHours(closeHour, closeMinute, 0, 0);
      let requestedPickupTime = pickupTime;

      if (now.getTime() > warehouseClose.getTime()) {
        pickupDate.setDate(pickupDate.getDate() + 1);
      } else if (now.getTime() >= warehouseOpen.getTime()) {
        requestedPickupTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }

      const pickupResult = await this.shippingService.registerPickup({
        providerRequestId: `pickup:${order.id}`,
        awbNumber: creationResult.awbNumber,
        areaCode: origin.bluedartAreaCode,
        customerCode: process.env.BLUEDART_CUSTOMER_CODE || '',
        customerName: origin.name,
        addressLine1: origin.addressLine1,
        addressLine2: origin.city,
        addressLine3: origin.state,
        pincode: origin.pincode,
        phone: origin.phone,
        numberOfPieces: orderItems.reduce(
          (total, item) => total + Number(item.quantity || 0),
          0,
        ),
        weightKg: weightGrams / 1000,
        pickupDate,
        pickupTime: requestedPickupTime,
        officeCloseTime,
        productCode: process.env.BLUEDART_PICKUP_PRODUCT_CODE || process.env.BLUEDART_PRODUCT_CODE || 'D',
        subProducts: (process.env.BLUEDART_PICKUP_SUB_PRODUCTS || '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
      });

      const pickupRegisteredAt = new Date();
      await this.shipmentRepository.updateById(shipment.id, {
        status: 'pickup_pending',
        pickupReference: pickupResult.pickupReference,
        pickupRegisteredAt,
        pickupRegistrationError: '',
        updatedAt: new Date(),
      });
      shipment.status = 'pickup_pending';
      shipment.pickupReference = pickupResult.pickupReference;
      shipment.pickupRegisteredAt = pickupRegisteredAt;
    } catch (pickupError) {
      const pickupMessage =
        pickupError instanceof Error
          ? pickupError.message
          : 'Blue Dart pickup registration failed';
      await this.shipmentRepository.updateById(shipment.id, {
        pickupRegistrationError: pickupMessage,
        reconciliationRequired: true,
        updatedAt: new Date(),
      });
      throw new HttpErrors.UnprocessableEntity(
        `AWB ${creationResult.awbNumber} was created, but pickup registration failed: ${pickupMessage}`,
      );
    }

    // 10. Map order items to shipment join table
    for (const item of orderItems) {
      const existingShipmentItem = await this.shipmentItemRepository.findOne({
        where: {shipmentId: shipment.id, orderItemId: item.id},
      });
      if (!existingShipmentItem) {
        await this.shipmentItemRepository.create({
          shipmentId: shipment.id,
          orderItemId: item.id,
          quantity: item.quantity,
        });
      }
    }

    // 11. Store courier metadata, but keep the order packed until Blue Dart
    // tracking confirms that the parcel was physically collected.
    await this.orderRepository.updateById(order.id, {
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
      if (shipment.pickupReference && shipment.pickupRegisteredAt) {
        const pickupCancelResult = await this.shippingService.cancelPickup({
          pickupReference: shipment.pickupReference,
          pickupRegistrationDate: shipment.pickupRegisteredAt,
          remarks: reason,
        });
        if (!pickupCancelResult.success) {
          throw new HttpErrors.UnprocessableEntity(
            `Blue Dart rejected pickup cancellation: ${pickupCancelResult.message || 'Unknown reason'}`,
          );
        }
      }

      const cancelRes = await this.shippingService.cancelShipment(
        shipment.awbNumber,
      );
      if (!cancelRes.success) {
        await this.shipmentRepository.updateById(shipmentId, {
          status: 'cancel_pending',
          reconciliationRequired: true,
          cancellationReason: reason,
          updatedAt: new Date(),
        });
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

    if (!returnRequest && order.returnStatus !== 'approved') {
      throw new HttpErrors.BadRequest(
        'No approved return request found for this order.',
      );
    }

    const existingReverse = await this.shipmentRepository.findOne({
      where: {orderId: id, isReverse: true, status: {neq: 'cancelled'}},
    });
    if (existingReverse) return existingReverse;
    if (order.reversePickupAwb) {
      throw new HttpErrors.Conflict(
        `Reverse AWB ${order.reversePickupAwb} already exists but its shipment record requires reconciliation. Do not create another reverse pickup.`,
      );
    }

    const forwardShipment = await this.shipmentRepository.findOne({
      where: {orderId: id, isReverse: false},
    });

    const weightGrams = req.weightGrams ?? 500;
    const origin = await this.warehouseService.getOriginDetailsForShipment();

    const returnReference = returnRequest?.id || order.id;
    const reverseRes = await this.shippingService.createReversePickup({
      providerRequestId: `reverse:${returnReference}`,
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
      warehouseAddress: origin.addressLine1,
      warehouseCity: origin.city,
      warehouseState: origin.state,
      warehousePhone: origin.phone,
      weightGrams,
      declaredValue: Number(order.total || order.totalAmount || 0),
      itemDescription: req.itemDescription,
      returnReason: returnRequest?.reason || order.returnReason,
    });

    let shipment: Shipment;
    try {
      shipment = await this.shipmentRepository.create({
        orderId: order.id,
        awbNumber: reverseRes.reverseAwbNumber,
        courierName: 'BlueDart',
        courierReferenceNumber: reverseRes.courierReferenceNumber,
        pickupReference: reverseRes.pickupTokenNumber,
        pickupRegisteredAt: reverseRes.pickupTokenNumber ? new Date() : undefined,
        weightGrams,
        status: 'created',
        // `warehouseId` is a PostgreSQL UUID foreign key. BOM/NSK belongs in
        // the Blue Dart request as an area code, never in this database column.
        warehouseId: origin.warehouseId,
        warehouseName: origin.name,
        isReverse: true,
        parentShipmentId: forwardShipment?.id,
        providerRequestId: `reverse:${returnReference}`,
        providerMode: this.shippingService.getProviderVersion() as any,
        creationState: 'CREATED',
        reconciliationRequired: false,
        isActive: true,
        isDeleted: false,
      });
    } catch (persistenceError) {
      // The courier mutation has already succeeded. Preserve the AWB on the
      // order so an unrelated database failure can never make a retry create
      // an untracked duplicate reverse shipment.
      await this.orderRepository.updateById(id, {
        reversePickupAwb: reverseRes.reverseAwbNumber,
        reversePickupRequestedAt: new Date(),
        needsManualShipping: true,
        manualShippingReason: `Reverse AWB ${reverseRes.reverseAwbNumber} was created but its shipment record could not be saved`,
        updatedAt: new Date(),
      });
      console.error('[Reverse Pickup] AWB created but local persistence failed', {
        orderId: id,
        reverseAwbNumber: reverseRes.reverseAwbNumber,
        pickupTokenNumber: reverseRes.pickupTokenNumber,
        error: persistenceError instanceof Error ? persistenceError.message : String(persistenceError),
      });
      throw new HttpErrors.InternalServerError(
        `Reverse AWB ${reverseRes.reverseAwbNumber} was created by Blue Dart, but the local shipment record could not be saved. Do not retry; reconciliation is required.`,
      );
    }

    if (returnRequest) {
      await this.returnRequestRepository.updateById(returnRequest.id, {
        reversePickupAwb: reverseRes.reverseAwbNumber,
        reversePickupRequestedAt: new Date(),
        updatedAt: new Date(),
      });
    }

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
