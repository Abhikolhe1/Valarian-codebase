import {strict as assert} from 'assert';
import {loadBlueDartConfig} from '../../../config/bluedart.config';
import {BlueDartDeveloperPortalProvider} from '../../../services/shipping-providers/bluedart-developer-portal.provider';
import {BlueDartConfigurationError, BlueDartProviderError, BlueDartRateLimitError} from '../../../services/shipping-providers/bluedart-errors';
import {ShippingService} from '../../../services/shipping.service';
import {ShippingMonitorService} from '../../../services/shipping-monitor.service';
import {TrackingSyncCronJob} from '../../../services/tracking-sync.cron';

describe('Tracking credential failures and shipping alerts', () => {
  const envKeys = ['NODE_ENV', 'SHIPPING_ALERTS_ENABLED', 'SHIPPING_FAILURE_ALERT_THRESHOLD', 'SHIPPING_ALERT_COOLDOWN_MS', 'SHIPPING_API_MAX_RETRIES', 'SHIPPING_API_RETRY_DELAY_MS', 'TRACKING_SYNC_CONFIG_ERROR_COOLDOWN_MS', 'BACKGROUND_JOBS_ENABLED', 'TRACKING_SYNC_RUN_ON_STARTUP'];
  let previous: NodeJS.ProcessEnv;
  beforeEach(() => {
    previous = {...process.env};
    for (const key of envKeys) delete process.env[key];
    process.env.NODE_ENV = 'test';
    process.env.SHIPPING_API_MAX_RETRIES = '3';
    process.env.SHIPPING_API_RETRY_DELAY_MS = '1';
  });
  afterEach(() => {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  function config(overrides: NodeJS.ProcessEnv = {}) {
    return loadBlueDartConfig({
      BLUEDART_PROVIDER_MODE: 'developer-portal', BLUEDART_ENV: 'sandbox',
      BLUEDART_LOGIN_ID: 'booking-login', BLUEDART_LICENCE_KEY: 'booking-key',
      BLUEDART_SANDBOX_TRACKING_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/tracking/v1',
      ...overrides,
    });
  }

  it('uses tracking overrides without changing booking credentials', async () => {
    const c = config({BLUEDART_TRACKING_LOGIN_ID: 'tracking-login', BLUEDART_TRACKING_LICENCE_KEY: 'tracking-key'});
    let query = '';
    const provider = new BlueDartDeveloperPortalProvider(c, {get: async (_base: string, value: string) => {
      query = value;
      return '<Shipment><StatusType>DL</StatusType><Status>Delivered</Status></Shipment>';
    }} as any);
    const result = await provider.trackShipment('fixture-awb');
    const params = new URLSearchParams(query);
    assert.equal(params.get('loginid'), 'tracking-login');
    assert.equal(params.get('lickey'), 'tracking-key');
    assert.equal(c.account.licenceKey, 'booking-key');
    assert.equal(result.currentStatus, 'delivered');
  });

  it('preserves existing credential fallback', () => {
    const c = config();
    assert.equal(c.account.trackingLoginId, 'booking-login');
    assert.equal(c.account.trackingLicenceKey, 'booking-key');
  });

  it('rejects missing tracking credentials before a network request', async () => {
    let calls = 0;
    const provider = new BlueDartDeveloperPortalProvider(config({BLUEDART_LOGIN_ID: '', BLUEDART_LICENCE_KEY: ''}), {get: async () => {calls++;}} as any);
    await assert.rejects(provider.trackShipment('fixture'), BlueDartConfigurationError);
    assert.equal(calls, 0);
  });

  for (const tag of ['Error', 'Instructions']) {
    it(`classifies XML ${tag} License Mismatch as a configuration error`, async () => {
      const provider = new BlueDartDeveloperPortalProvider(config(), {get: async () => `<Response><${tag}>License Mismatch</${tag}></Response>`} as any);
      await assert.rejects(provider.trackShipment('fixture'), (error: Error) => {
        assert.ok(error instanceof BlueDartConfigurationError);
        assert.ok(!error.message.includes('booking-key'));
        return true;
      });
    });
  }

  it('does not classify an AWB-not-found response as an account failure', async () => {
    const provider = new BlueDartDeveloperPortalProvider(config(), {get: async () => '<Error>AWB not found</Error>'} as any);
    await assert.rejects(provider.trackShipment('fixture'), (error: Error) => error instanceof BlueDartProviderError && !(error instanceof BlueDartConfigurationError));
  });

  it('does not retry credential failures and releases the concurrency slot', async () => {
    let calls = 0;
    const recorded: unknown[][] = [];
    const service = new ShippingService(undefined, undefined, {recordFailure: async (...args: unknown[]) => {recorded.push(args);}} as any);
    (service as any).activeProvider = {courierName: 'BlueDart', trackShipment: async () => {calls++; throw new BlueDartConfigurationError('License Mismatch', 'trackShipment');}};
    await assert.rejects(service.trackShipment('fixture'), BlueDartConfigurationError);
    assert.equal(calls, 1);
    assert.equal((service as any).activeCalls, 0);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0][3], true);
  });

  it('retains retries for transient read errors', async () => {
    const service = new ShippingService();
    let calls = 0;
    (service as any).activeProvider = {courierName: 'BlueDart', trackShipment: async () => {
      if (++calls < 3) throw new BlueDartProviderError('Temporary outage', {operation: 'trackShipment', httpStatus: 503, retryable: true});
      return {currentStatus: 'in_transit'};
    }};
    await service.trackShipment('fixture');
    assert.equal(calls, 3);
    assert.equal((service as any).activeCalls, 0);
  });

  for (const failure of [new BlueDartConfigurationError('License Mismatch', 'trackShipment'), new BlueDartRateLimitError('Rate limit', {operation: 'trackShipment'})]) {
    it(`stops the batch and cools down on ${failure.name}`, async () => {
      let calls = 0;
      const cron = new TrackingSyncCronJob({find: async () => [{awbNumber: 'one'}, {awbNumber: 'two'}]} as any, {} as any, {} as any, {} as any, {} as any,
        {trackShipment: async () => {calls++; throw failure;}} as any, {} as any, {} as any);
      await cron.syncAllActiveShipments();
      await cron.syncAllActiveShipments();
      assert.equal(calls, 1);
      assert.equal((cron as any).sweepRunning, false);
      assert.ok((cron as any).rateLimitCooldownUntil > Date.now());
      (cron as any).rateLimitCooldownUntil = Date.now() - 1;
      await cron.syncAllActiveShipments();
      assert.equal(calls, 2);
    });
  }

  it('does not sweep at startup unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'dev';
    const cron = new TrackingSyncCronJob(...Array(8).fill({}) as [any, any, any, any, any, any, any, any]);
    let calls = 0;
    cron.syncAllActiveShipments = async () => {calls++;};
    try {await cron.start(); assert.equal(calls, 0);} finally {await cron.stop();}
  });

  function monitor() {
    const messages: any[] = [];
    return {messages, service: new ShippingMonitorService({sendMail: async (mail: unknown) => {messages.push(mail);}} as any)};
  }

  it('does not send email by default in development or test', async () => {
    const {messages, service} = monitor();
    process.env.NODE_ENV = 'dev';
    for (let i = 0; i < 8; i++) await service.recordFailure('BlueDart', 'trackShipment', 'error');
    process.env.NODE_ENV = 'test'; process.env.SHIPPING_ALERTS_ENABLED = 'true';
    await service.recordFailure('BlueDart', 'trackShipment', 'configuration', true);
    assert.equal(messages.length, 0);
    assert.equal(service.getHealthReport().status, 'degraded');
  });

  it('keeps production threshold alerts and deduplicates flapping failures', async () => {
    process.env.NODE_ENV = 'production';
    const {messages, service} = monitor();
    for (let i = 0; i < 4; i++) await service.recordFailure('BlueDart', 'trackShipment', 'error');
    assert.equal(messages.length, 0);
    await service.recordFailure('BlueDart', 'trackShipment', 'error');
    assert.equal(messages.length, 1);
    assert.match(messages[0].subject, /CRITICAL/);
    await service.recordSuccess('BlueDart', 'trackShipment');
    for (let i = 0; i < 8; i++) await service.recordFailure('BlueDart', 'trackShipment', 'error');
    assert.equal(messages.length, 1);
    (service as any).lastAlertTimestamps['BlueDart:trackShipment'] = Date.now() - 7 * 60 * 60 * 1000;
    await service.recordFailure('BlueDart', 'trackShipment', 'error');
    assert.equal(messages.length, 2);
  });

  it('reports configuration problems immediately once, using the correct subject', async () => {
    process.env.NODE_ENV = 'production';
    const {messages, service} = monitor();
    await Promise.all(Array.from({length: 8}, () => service.recordFailure('BlueDart', 'trackShipment', 'License Mismatch', true)));
    assert.equal(messages.length, 1);
    assert.match(messages[0].subject, /CONFIGURATION/);
    assert.equal(service.getHealthReport().status, 'degraded');
  });

  it('supports explicit development opt-in and production opt-out', async () => {
    const {messages, service} = monitor();
    process.env.NODE_ENV = 'dev'; process.env.SHIPPING_ALERTS_ENABLED = 'true';
    await service.recordFailure('BlueDart', 'trackShipment', 'config', true);
    assert.equal(messages.length, 1);
    process.env.NODE_ENV = 'production'; process.env.SHIPPING_ALERTS_ENABLED = 'false';
    await service.recordFailure('BlueDart', 'otherOperation', 'config', true);
    assert.equal(messages.length, 1);
  });
});
