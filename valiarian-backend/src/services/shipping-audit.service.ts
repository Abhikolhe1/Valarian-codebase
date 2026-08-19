import {BindingScope, injectable, inject} from '@loopback/core';
import {Request} from '@loopback/rest';
import {AuditService} from './audit.service';
import {Shipment} from '../models';

@injectable({scope: BindingScope.TRANSIENT})
export class ShippingAuditService {
  constructor(
    @inject('services.audit')
    public auditService: AuditService,
  ) {}

  async logCreateShipment(
    userId: string,
    userEmail: string | undefined,
    shipment: Shipment,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'create',
      entityType: 'shipment',
      entityId: shipment.id,
      entityName: `AWB: ${shipment.awbNumber}`,
      changes: {created: shipment},
      metadata: {orderId: shipment.orderId, awbNumber: shipment.awbNumber},
      request,
    });
  }

  async logCancelShipment(
    userId: string,
    userEmail: string | undefined,
    shipment: Shipment,
    reason: string,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'cancel',
      entityType: 'shipment',
      entityId: shipment.id,
      entityName: `AWB: ${shipment.awbNumber}`,
      changes: {
        before: {status: shipment.status},
        after: {status: 'cancelled', cancellationReason: reason},
      },
      metadata: {orderId: shipment.orderId, awbNumber: shipment.awbNumber, reason},
      request,
    });
  }

  async logSyncTracking(
    userId: string,
    userEmail: string | undefined,
    shipment: Shipment,
    previousStatus: string,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'sync_tracking',
      entityType: 'shipment',
      entityId: shipment.id,
      entityName: `AWB: ${shipment.awbNumber}`,
      changes: {
        before: {status: previousStatus},
        after: {status: shipment.status, currentLocation: shipment.currentLocation},
      },
      metadata: {orderId: shipment.orderId, awbNumber: shipment.awbNumber},
      request,
    });
  }

  async logGenerateLabel(
    userId: string,
    userEmail: string | undefined,
    shipment: Shipment,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'generate_label',
      entityType: 'shipment',
      entityId: shipment.id,
      entityName: `AWB: ${shipment.awbNumber}`,
      metadata: {orderId: shipment.orderId, awbNumber: shipment.awbNumber},
      request,
    });
  }

  async logReversePickup(
    userId: string,
    userEmail: string | undefined,
    shipment: Shipment,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'reverse_pickup',
      entityType: 'shipment',
      entityId: shipment.id,
      entityName: `Reverse AWB: ${shipment.awbNumber}`,
      changes: {created: shipment},
      metadata: {
        orderId: shipment.orderId,
        awbNumber: shipment.awbNumber,
        isReverse: true,
        parentShipmentId: shipment.parentShipmentId,
      },
      request,
    });
  }

  async logInventoryMutation(
    userId: string,
    userEmail: string | undefined,
    orderId: string,
    mutationAction: 'reserve' | 'deduct' | 'release' | 'restore_void' | 'restore_rto' | 'restore_return',
    changes: object,
    request?: Request,
  ) {
    return this.auditService.log({
      userId,
      userEmail,
      action: 'update',
      entityType: 'inventory',
      entityId: orderId,
      entityName: `Order Ref: ${orderId}`,
      changes,
      metadata: {mutationAction},
      request,
    });
  }
}
