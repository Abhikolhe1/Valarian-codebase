import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {repository, IsolationLevel} from '@loopback/repository';
import {ShipmentEventRepository, ArchivedShipmentEventRepository} from '../repositories';
import {AuditService} from './audit.service';
import {ArchivedShipmentEvent} from '../models';

const DEFAULT_RETENTION_SWEEP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (weekly)
const DEFAULT_RETENTION_MONTHS = 24;
const DEFAULT_RETENTION_BATCH_SIZE = 1000;

@lifeCycleObserver('application')
export class EventRetentionCronJob implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(ShipmentEventRepository)
    private shipmentEventRepository: ShipmentEventRepository,
    @repository(ArchivedShipmentEventRepository)
    private archivedShipmentEventRepository: ArchivedShipmentEventRepository,
    @inject('services.audit')
    private auditService: AuditService,
    @inject('services.retention.sweep.interval.ms', {optional: true})
    private sweepIntervalMs: number = DEFAULT_RETENTION_SWEEP_INTERVAL_MS,
    @inject('services.tracking.event.retention.months', {optional: true})
    private retentionMonths: number = DEFAULT_RETENTION_MONTHS,
    @inject('services.retention.batch.size', {optional: true})
    private batchSize: number = DEFAULT_RETENTION_BATCH_SIZE,
  ) {}

  async start(): Promise<void> {
    console.log('[Event Retention Cron] observer started');
    // Run initial sweep on application startup
    await this.runRetentionSweep();

    this.timer = setInterval(() => {
      console.log('[Event Retention Cron] tick triggered');
      void this.runRetentionSweep();
    }, this.sweepIntervalMs);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runRetentionSweep(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - this.retentionMonths);

      console.log('[Event Retention Cron] Starting sweep of tracking events...', {
        cutoffDate: cutoffDate.toISOString(),
        retentionMonths: this.retentionMonths,
        batchSize: this.batchSize,
      });

      let totalArchived = 0;
      let hasMore = true;

      while (hasMore) {
        const eventsToArchive = await this.shipmentEventRepository.find({
          where: {
            timestamp: {lt: cutoffDate},
          },
          limit: this.batchSize,
        });

        if (eventsToArchive.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`[Event Retention Cron] Archiving batch of ${eventsToArchive.length} events...`);

        const transaction = await this.shipmentEventRepository.dataSource.beginTransaction(
          IsolationLevel.READ_COMMITTED
        );

        try {
          const archivedEvents = eventsToArchive.map(event => {
            return new ArchivedShipmentEvent({
              id: event.id,
              shipmentId: event.shipmentId,
              internalStatus: event.internalStatus,
              courierRawCode: event.courierRawCode,
              courierDescription: event.courierDescription,
              description: event.description,
              location: event.location,
              timestamp: event.timestamp,
              activityType: event.activityType,
              rawData: event.rawData,
              createdAt: event.createdAt,
              archivedAt: new Date(),
            });
          });

          await this.archivedShipmentEventRepository.createAll(archivedEvents, {transaction});
          await this.shipmentEventRepository.deleteAll(
            {
              id: {inq: eventsToArchive.map(e => e.id)},
            },
            {transaction}
          );

          await transaction.commit();
          totalArchived += eventsToArchive.length;

          if (eventsToArchive.length < this.batchSize) {
            hasMore = false;
          }
        } catch (err) {
          await transaction.rollback();
          throw err;
        }
      }

      console.log(`[Event Retention Cron] Sweep completed. Archived ${totalArchived} events.`);

      if (totalArchived > 0) {
        await this.auditService.log({
          userId: '00000000-0000-0000-0000-000000000000', // System user UUID placeholder
          userEmail: 'system@valarian.com',
          action: 'delete',
          entityType: 'shipment',
          entityId: '00000000-0000-0000-0000-000000000000',
          entityName: 'Shipment Event Archiver',
          changes: {
            archivedCount: totalArchived,
          },
          metadata: {
            retentionMonths: this.retentionMonths,
            sweepIntervalMs: this.sweepIntervalMs,
          },
        });
      }
    } catch (err) {
      console.error('[Event Retention Cron] Error during retention sweep:', err.message || err);
    }
  }
}
