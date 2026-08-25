import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {OtpService} from './otp.service';

@lifeCycleObserver('otp-cleanup')
export class OtpCleanupService implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;
  constructor(@inject('services.otp') private otpService: OtpService) {}

  start(): void {
    const interval = Number(process.env.OTP_CLEANUP_INTERVAL_MS ?? 86400000);
    this.timer = setInterval(() => {
      this.otpService.cleanup().catch(error => console.error('[OtpCleanup] failed:', error.message));
    }, interval);
    this.timer.unref();
  }

  stop(): void {if (this.timer) clearInterval(this.timer);}
}
