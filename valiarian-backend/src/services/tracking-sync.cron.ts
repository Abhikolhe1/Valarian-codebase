import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {IsolationLevel, repository} from '@loopback/repository';
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
import {areBackgroundJobsEnabled} from '../utils/background-jobs';
import {BlueDartRateLimitError} from './shipping-providers/bluedart-errors';
import {Order} from '../models';

const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@lifeCycleObserver('application')
export class TrackingSyncCronJob implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;
  private sweepRunning = false;
  private rateLimitCooldownUntil = 0;

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
    if (!areBackgroundJobsEnabled()) {
      console.log('[Tracking Sync Cron] disabled via BACKGROUND_JOBS_ENABLED=false');
      return;
    }
    console.log('[Tracking Sync Cron] observer started');
    if (process.env.TRACKING_SYNC_RUN_ON_STARTUP?.trim().toLowerCase() === 'true') {
      await this.syncAllActiveShipments();
    }

    this.timer = setInterval(() => {
      console.log('[Tracking Sync Cron] tick triggered');
      void this.syncAllActiveShipments();
    }, this.getSyncIntervalMs());

    this.timer.unref?.();
  }

  private getSyncIntervalMs(): number {
    const configured = Number(process.env.TRACKING_SYNC_INTERVAL_MS);
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : DEFAULT_SYNC_INTERVAL_MS;
  }

  private getBatchSize(): number {
    const configured = Number(process.env.TRACKING_SYNC_BATCH_SIZE || '10');
    return Number.isInteger(configured) && configured > 0 ? configured : 10;
  }

  private getRateLimitCooldownMs(): number {
    const configured = Number(
      process.env.TRACKING_SYNC_RATE_LIMIT_COOLDOWN_MS || String(30 * 60 * 1000),
    );
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : 30 * 60 * 1000;
  }

  private async transitionOrder(
    orderId: string,
    update: Partial<Order>,
    status: string,
    comment: string,
  ): Promise<void> {
    const transaction = await this.orderRepository.dataSource.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    try {
      await this.orderRepository.updateById(orderId, update, {transaction});
      await this.orderStatusHistoryRepository.createStatusEntry(
        orderId,
        status,
        'system:tracking-sync-cron',
        comment,
        {transaction},
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async syncAllActiveShipments(): Promise<void> {
    if (this.sweepRunning) {
      console.log('[Tracking Sync Cron] Previous sweep still running; skipping overlapping tick');
      return;
    }
    if (Date.now() < this.rateLimitCooldownUntil) {
      console.warn(
        `[Tracking Sync Cron] Blue Dart cooldown active until ${new Date(this.rateLimitCooldownUntil).toISOString()}; skipping sweep`,
      );
      return;
    }

    this.sweepRunning = true;
    try {
      const activeShipments = await this.shipmentRepository.find({
        where: {
          status: {nin: ['delivered', 'cancelled', 'rto_delivered']},
        },
        order: ['trackingLastSyncedAt ASC'],
        limit: this.getBatchSize(),
      });

      console.log(`[Tracking Sync Cron] Syncing ${activeShipments.length} active shipments`);

      for (const shipment of activeShipments) {
        try {
          const tracking = await this.shippingService.trackShipment(shipment.awbNumber);
          const nextShipmentStatus =
            tracking.currentStatus === 'created' && shipment.status !== 'created'
              ? shipment.status
              : tracking.currentStatus;
          await this.shipmentRepository.updateById(shipment.id, {
            status: nextShipmentStatus,
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

          // A pickup token only schedules collection. Physical collection is
          // confirmed by the first picked-up/transit (or later) tracking scan.
          // Deduction is idempotent, so a later status jump is also safe.
          const confirmsPhysicalCollection = [
            'picked_up',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'exception',
            'rto_initiated',
            'rto_in_transit',
            'rto_delivered',
          ].includes(tracking.currentStatus);
          const trackedOrder = (confirmsPhysicalCollection || shipment.isReverse)
            ? await this.orderRepository.findById(shipment.orderId)
            : undefined;
          if (!shipment.isReverse && trackedOrder && !trackedOrder.inventoryDeducted) {
            await this.inventoryLifecycleService.deductOnShipment(shipment.orderId);
          }

          // A reverse AWB travels from the customer back to the warehouse.
          // Never apply forward-delivery states or forward inventory deduction
          // to it. Stock remains untouched until warehouse QC explicitly says
          // which units are sellable and may be restocked.
          if (shipment.isReverse) {
            if (
              ['picked_up', 'in_transit', 'out_for_delivery'].includes(tracking.currentStatus) &&
              trackedOrder?.status === 'return_requested'
            ) {
              await this.transitionOrder(
                shipment.orderId,
                {status: 'returned', returnStatus: 'picked', returnPickedAt: new Date(), updatedAt: new Date()},
                'returned',
                `Blue Dart collected the customer return. Reverse AWB: ${shipment.awbNumber}`,
              );
            } else if (
              tracking.currentStatus === 'delivered' &&
              trackedOrder?.status !== 'parcel_received'
            ) {
              await this.transitionOrder(
                shipment.orderId,
                {status: 'parcel_received', returnStatus: 'completed', parcelReceivedAt: tracking.deliveredAt || new Date(), updatedAt: new Date()},
                'parcel_received',
                `Blue Dart delivered the return to the warehouse. Reverse AWB: ${shipment.awbNumber}. Awaiting QC/restock decision.`,
              );
            }
            continue;
          }

          // Close active NDR if shipment is delivered
          if (
            tracking.currentStatus === 'delivered' &&
            trackedOrder?.status !== 'delivered'
          ) {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'delivered');
            }

            await this.transitionOrder(
              shipment.orderId,
              {
                status: 'delivered',
                deliveredAt: tracking.deliveredAt || new Date(),
                updatedAt: new Date(),
              },
              'delivered',
              `Blue Dart confirmed delivery. AWB: ${shipment.awbNumber}`,
            );
          }
          // Auto-advance to out_for_delivery when Blue Dart reports it (OA/OFD
          // codes — see courier-status-mapper.ts). Guarded on the previous
          // order status so this only fires once per real transition, not
          // on every sync tick while the shipment sits in this state.
          else if (
            tracking.currentStatus === 'out_for_delivery' &&
            trackedOrder?.status !== 'out_for_delivery'
          ) {
            await this.transitionOrder(
              shipment.orderId,
              {status: 'out_for_delivery', updatedAt: new Date()},
              'out_for_delivery',
              `Blue Dart: shipment out for delivery. AWB: ${shipment.awbNumber}`,
            );
          }
          // Mark the order shipped only after Blue Dart confirms physical
          // collection or an in-transit scan. Never regress a later state.
          else if (
            ['picked_up', 'in_transit'].includes(tracking.currentStatus) &&
            trackedOrder?.status === 'packed'
          ) {
            await this.transitionOrder(
              shipment.orderId,
              {status: 'shipped', updatedAt: new Date()},
              'shipped',
              `Blue Dart confirmed physical pickup. AWB: ${shipment.awbNumber}`,
            );
          }
          // Close active NDR if RTO initiated
          else if (
            tracking.currentStatus === 'rto_initiated' &&
            trackedOrder?.status !== 'rto_initiated'
          ) {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'rto_initiated');
            }

            await this.transitionOrder(
              shipment.orderId,
              {
                status: 'rto_initiated',
                rtoStatus: 'initiated',
                rtoInitiatedAt: new Date(),
                updatedAt: new Date(),
              },
              'rto_initiated',
              `Blue Dart initiated Return to Origin (RTO). AWB: ${shipment.awbNumber}`,
            );
          }
          else if (
            tracking.currentStatus === 'rto_in_transit' &&
            trackedOrder?.status !== 'rto_in_transit'
          ) {
            await this.transitionOrder(
              shipment.orderId,
              {
                status: 'rto_in_transit',
                rtoStatus: 'in_transit',
                updatedAt: new Date(),
              },
              'rto_in_transit',
              `Blue Dart: RTO shipment in transit. AWB: ${shipment.awbNumber}`,
            );
          }
          // Close active NDR if RTO delivered
          else if (
            tracking.currentStatus === 'rto_delivered' &&
            trackedOrder?.status !== 'rto_delivered'
          ) {
            const activeNdr = await this.ndrRepository.findOne({
              where: {shipmentId: shipment.id, ndrStatus: {neq: 'closed'}},
            });
            if (activeNdr) {
              await this.ndrService.closeNdr(activeNdr.id, 'rto_initiated');
            }

            await this.transitionOrder(
              shipment.orderId,
              {
                status: 'rto_delivered',
                rtoStatus: 'delivered',
                rtoDeliveredAt: new Date(),
                updatedAt: new Date(),
              },
              'rto_delivered',
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
          if (shipmentErr instanceof BlueDartRateLimitError) {
            this.rateLimitCooldownUntil =
              Date.now() + this.getRateLimitCooldownMs();
            console.warn(
              `[Tracking Sync Cron] Blue Dart rate limit reached; pausing tracking requests until ${new Date(this.rateLimitCooldownUntil).toISOString()}`,
            );
            break;
          }
          console.error(
            `[Tracking Sync Cron] Failed for AWB ${shipment.awbNumber}:`,
            shipmentErr.message || shipmentErr,
          );
        }
      }
    } catch (err) {
      console.error('[Tracking Sync Cron] Sweep error:', err.message || err);
    } finally {
      this.sweepRunning = false;
    }
  }
}
