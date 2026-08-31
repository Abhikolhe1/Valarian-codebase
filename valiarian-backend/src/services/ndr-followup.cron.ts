import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {NdrService} from './ndr.service';
import {areBackgroundJobsEnabled} from '../utils/background-jobs';

const DEFAULT_NDR_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

@lifeCycleObserver('application')
export class NdrFollowUpCronJob implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @inject('services.ndr')
    private ndrService: NdrService,
    @inject('services.ndr.followup.interval.ms', {optional: true})
    private sweepIntervalMs: number = DEFAULT_NDR_SWEEP_INTERVAL_MS,
  ) {}

  async start(): Promise<void> {
    if (!areBackgroundJobsEnabled()) {
      console.log('[NDR Follow-Up Cron] disabled via BACKGROUND_JOBS_ENABLED=false');
      return;
    }
    console.log('[NDR Follow-Up Cron] observer started');
    // Run initial sweep on application startup
    await this.runNdrFollowUp();

    this.timer = setInterval(() => {
      console.log('[NDR Follow-Up Cron] tick triggered');
      void this.runNdrFollowUp();
    }, this.sweepIntervalMs);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runNdrFollowUp(): Promise<void> {
    try {
      console.log('[NDR Follow-Up Cron] Starting sweep of pending NDRs...');
      const escalatedCount = await this.ndrService.escalatePendingNdrs();
      console.log(`[NDR Follow-Up Cron] Sweep completed. Escalated ${escalatedCount} NDRs to RTO.`);
    } catch (err) {
      console.error('[NDR Follow-Up Cron] Error during sweep:', err.message || err);
    }
  }
}
