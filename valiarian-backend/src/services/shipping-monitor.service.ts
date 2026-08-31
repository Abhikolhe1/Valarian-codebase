import {BindingScope, injectable, inject} from '@loopback/core';
import {EmailService} from './email.service';

@injectable({scope: BindingScope.SINGLETON})
export class ShippingMonitorService {
  private failureCounts: Record<string, number> = {};
  private lastSyncTimestamps: Record<string, Date> = {};
  private connectivityStatus: Record<string, boolean> = {
    BlueDart: true,
  };

  constructor(
    @inject('services.email')
    private emailService: EmailService,
  ) {}

  private getAlertEmail(): string {
    return process.env.SHIPPING_ALERT_EMAIL || 'valiarian.wear@gmail.com';
  }

  private getThreshold(): number {
    return Number(process.env.SHIPPING_FAILURE_ALERT_THRESHOLD || '5');
  }

  private areAlertsEnabled(): boolean {
    return (
      process.env.NODE_ENV?.trim().toLowerCase() !== 'test' &&
      process.env.SHIPPING_ALERTS_ENABLED?.trim().toLowerCase() !== 'false'
    );
  }

  /**
   * Log a successful API call.
   */
  async recordSuccess(provider: string, operation: string) {
    this.failureCounts[operation] = 0;
    this.connectivityStatus[provider] = true;
    this.lastSyncTimestamps[operation] = new Date();
  }

  /**
   * Log a failed API call. Send alert if it exceeds threshold.
   */
  async recordFailure(provider: string, operation: string, errorMsg: string) {
    this.failureCounts[operation] = (this.failureCounts[operation] || 0) + 1;
    this.connectivityStatus[provider] = false;

    const threshold = this.getThreshold();
    if (this.areAlertsEnabled() && this.failureCounts[operation] === threshold) {
      await this.sendAlertEmail(provider, operation, errorMsg, this.failureCounts[operation]);
    }
  }

  private async sendAlertEmail(
    provider: string,
    operation: string,
    errorMsg: string,
    consecutiveCount: number,
  ) {
    const alertEmail = this.getAlertEmail();
    const mailObj = {
      from: process.env.EMAIL_FROM || 'valiarian.wear@gmail.com',
      to: alertEmail,
      subject: `[CRITICAL] Shipping API Alert: ${provider} consecutive failures`,
      html: `
        <h2>Courier API Connectivity Alert</h2>
        <p>This is an automated system alert from Valarian. The courier provider <strong>${provider}</strong> has encountered consecutive failures.</p>
        <ul>
          <li><strong>Operation:</strong> ${operation}</li>
          <li><strong>Consecutive Failure Count:</strong> ${consecutiveCount}</li>
          <li><strong>Last Error Message:</strong> ${errorMsg}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>Please check the API credentials, network/WSDL statuses, or contact Blue Dart customer support immediately.</p>
      `,
    };

    try {
      await this.emailService.sendMail(mailObj);
      console.log(`[ShippingMonitorService] Alert email sent to ${alertEmail}`);
    } catch (err) {
      console.error('[ShippingMonitorService] Failed to send alert email:', err.message || err);
    }
  }

  getHealthReport() {
    return {
      status: Object.values(this.connectivityStatus).every(v => v) ? 'healthy' : 'degraded',
      connectivity: this.connectivityStatus,
      failures: this.failureCounts,
      lastSyncs: this.lastSyncTimestamps,
      timestamp: new Date(),
    };
  }
}
