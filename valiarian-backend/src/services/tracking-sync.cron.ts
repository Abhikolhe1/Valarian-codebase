import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  ShipmentRepository,
  ShipmentEventRepository,
  OrderRepository,
  OrderStatusHistoryRepository,
  NdrRepository
} from '../repositories';
import {ShippingService} from './shipping.service';
import {InventoryLifecycleService} from './inventory-lifecycle.service';
import {NdrService} from './ndr.service';

const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@lifeCycleObserver('application')
export class TrackingSyncCronJob implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(ShipmentRepository)
    private shipmentRepository: ShipmentRepository,
    @repository(ShipmentEventRepository)
    private shipmentEventRepository: ShipmentEventRepository,
    @repository(OrderRepository)
    private orderRepository: OrderRepository,
    @repository(OrderStatusHistoryRepository)
    private orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @repository(NdrRepository)
    private ndrRepository: NdrRepository,
    @inject('services.shipping')
    private shippingService: ShippingService,
    @inject('services.inventory-lifecycle')
    private inventoryLifecycleService: InventoryLifecycleService,
    @inject('services.ndr')
    private ndrService: NdrService,
  ) {}

  async start(): Promise<void> {
    console.log('[Tracking Sync Cron] observer started');
    // Run initial sweep on application startup
    await this.syncAllActiveShipments();

    this.timer = setInterval(() => {
      console.log('[Tracking Sync Cron] tick triggered');
      void this.syncAllActiveShipments();
    }, DEFAULT_SYNC_INTERVAL_MS);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async syncAllActiveShipments(): Promise<void> {
    try {
      const activeShipments = await this.shipmentRepository.find({
        where: {
          status: {nin: ['delivered', 'cancelled', 'rto_delivered']},
        },
      });

      console.log(`[Tracking Sync Cron] Syncing ${activeShipments.length} active shipments`);

      for (const shipment of activeShipments) {
        try {
          const tracking = await this.shippingService.trackShipment(shipment.awbNumber);

          await this.shipmentRepository.updateById(shipment.id, {
            status: tracking.currentStatus,
            currentLocation: tracking.currentLocation,
            deliveredAt: tracking.deliveredAt,
            trackingLastSyncedAt: new Date(),
            rawTrackingData: tracking.rawResponse as object,
            updatedAt: new Date(),
          });

          // Sync tracking events
          for (const ev of tracking.events) {
            const existingEvent = await this.shipmentEventRepository.findOne({
              where: {
                shipmentId: shipment.id,
                courierRawCode: ev.courierRawCode,
                timestamp: ev.timestamp,
              },
            });

            if (!existingEvent) {
              await this.shipmentEventRepository.create({
                shipmentId: shipment.id,
                internalStatus: ev.internalStatus,
                courierRawCode: ev.courierRawCode,
                courierDescription: ev.courierDescription,
                description: ev.description,
                location: ev.location,
                timestamp: ev.timestamp,
                createdAt: new Date(),
              });
            }
          }

          // Close active NDR if shipment is delivered
          if (tracking.currentStatus === 'delivered') {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'delivered');
            }

            await this.orderRepository.updateById(shipment.orderId, {
              status: 'delivered',
              deliveredAt: tracking.deliveredAt || new Date(),
              updatedAt: new Date(),
            });
            await this.orderStatusHistoryRepository.createStatusEntry(
              shipment.orderId,
              'delivered',
              'system:tracking-sync-cron',
              `Blue Dart confirmed delivery. AWB: ${shipment.awbNumber}`,
            );
          } 
          // Close active NDR if RTO initiated
          else if (tracking.currentStatus === 'rto_initiated') {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'rto_initiated');
            }

            await this.orderRepository.updateById(shipment.orderId, {
              status: 'rto_initiated',
              rtoStatus: 'initiated',
              rtoInitiatedAt: new Date(),
              updatedAt: new Date(),
            });
            await this.orderStatusHistoryRepository.createStatusEntry(
              shipment.orderId,
              'rto_initiated',
              'system:tracking-sync-cron',
              `Blue Dart initiated Return to Origin (RTO). AWB: ${shipment.awbNumber}`,
            );
          } 
          // Close active NDR if RTO delivered
          else if (tracking.currentStatus === 'rto_delivered') {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'rto_initiated');
            }

            await this.orderRepository.updateById(shipment.orderId, {
              status: 'rto_delivered',
              rtoStatus: 'delivered',
              rtoDeliveredAt: new Date(),
              updatedAt: new Date(),
            });
            await this.orderStatusHistoryRepository.createStatusEntry(
              shipment.orderId,
              'rto_delivered',
              'system:tracking-sync-cron',
              `RTO delivered back to warehouse. AWB: ${shipment.awbNumber}`,
            );
            // Restore inventory on RTO delivery
            await this.inventoryLifecycleService.restoreOnRtoDelivered(shipment.orderId);
          }
          // Create/update NDR on exception (undelivered/failed attempt)
          else if (tracking.currentStatus === 'exception') {
            // Find failure reason from tracking details
            // Find last event that has 'exception' status
            const failedEvent = tracking.events
              .filter(e => e.internalStatus === 'exception')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const failureReason = failedEvent?.description || 'Delivery Exception';
            const courierNdrCode = failedEvent?.courierRawCode || 'EXCEPTION';

            await this.ndrService.createNdr({
              shipmentId: shipment.id,
              orderId: shipment.orderId,
              failureReason,
              courierNdrCode,
              attemptNumber: 1, // Service handles incrementing if active NDR exists
            });
          }
        } catch (shipmentErr) {
          console.error(
            `[Tracking Sync Cron] Failed for AWB ${shipment.awbNumber}:`,
            shipmentErr.message || shipmentErr,
          );
        }
      }
    } catch (err) {
      console.error('[Tracking Sync Cron] Sweep error:', err.message || err);
    }
  }
}
