import {BindingScope, injectable, inject} from '@loopback/core';
import {EmailService} from './email.service';

@injectable({scope: BindingScope.SINGLETON})
export class ShippingMonitorService {
  private failureCounts: Record<string, number> = {};
  private lastSyncTimestamps: Record<string, Date> = {};
  private lastAlertTimestamps: Record<string, number> = {};
  private connectivityStatus: Record<string, boolean> = {
    BlueDart: true,
    Delhivery: true,
  };

  constructor(
    @inject('services.email')
    private emailService: EmailService,
  ) {}

  private getAlertEmail(): string {
    return process.env.SHIPPING_ALERT_EMAIL || 'valiarian.wear@gmail.com';
  }

  private getThreshold(): number {
    const value = Number(process.env.SHIPPING_FAILURE_ALERT_THRESHOLD || '5');
    return Number.isInteger(value) && value > 0 ? value : 5;
  }

  private areAlertsEnabled(): boolean {
    const environment = process.env.NODE_ENV?.trim().toLowerCase();
    const enabled = process.env.SHIPPING_ALERTS_ENABLED?.trim().toLowerCase();
    return environment !== 'test' &&
      (enabled === 'true' || (environment === 'production' && enabled !== 'false'));
  }

  /**
   * Log a successful API call.
   */
  async recordSuccess(provider: string, operation: string) {
    this.failureCounts[`${provider}:${operation}`] = 0;
    this.connectivityStatus[provider] = true;
    this.lastSyncTimestamps[`${provider}:${operation}`] = new Date();
  }

  /**
   * Log a failed API call. Send alert if it exceeds threshold.
   */
  async recordFailure(provider: string, operation: string, errorMsg: string, configurationError = false) {
    const key = `${provider}:${operation}`;
    this.failureCounts[key] = (this.failureCounts[key] || 0) + 1;
    this.connectivityStatus[provider] = false;

    const threshold = this.getThreshold();
    const configuredCooldown = Number(process.env.SHIPPING_ALERT_COOLDOWN_MS);
    const cooldown = Number.isFinite(configuredCooldown) && configuredCooldown >= 60_000
      ? configuredCooldown : 6 * 60 * 60 * 1000;
    const lastAlert = this.lastAlertTimestamps[key];
    if (this.areAlertsEnabled() && (configurationError || this.failureCounts[key] >= threshold) &&
      (lastAlert === undefined || Date.now() - lastAlert >= cooldown)) {
      // Reserve before awaiting mail delivery to deduplicate concurrent failures.
      this.lastAlertTimestamps[key] = Date.now();
      await this.sendAlertEmail(provider, operation, errorMsg, this.failureCounts[key], configurationError);
    }
  }

  private async sendAlertEmail(
    provider: string,
    operation: string,
    errorMsg: string,
    consecutiveCount: number,
    configurationError: boolean,
  ) {
    const alertEmail = this.getAlertEmail();
    const mailObj = {
      from: process.env.EMAIL_FROM || 'valiarian.wear@gmail.com',
      to: alertEmail,
      subject: configurationError
        ? `[CONFIGURATION] Shipping API Alert: ${provider} tracking credentials/configuration`
        : `[CRITICAL] Shipping API Alert: ${provider} consecutive failures`,
      html: `
        <h2>Courier API Connectivity Alert</h2>
        <p>This is an automated system alert from Valarian. The courier provider <strong>${provider}</strong> has encountered consecutive failures.</p>
        <ul>
          <li><strong>Operation:</strong> ${operation}</li>
          <li><strong>Consecutive Failure Count:</strong> ${consecutiveCount}</li>
          <li><strong>Last Error Message:</strong> ${errorMsg}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>Please check the API credentials and provider status, then contact ${provider} support if the issue continues.</p>
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
