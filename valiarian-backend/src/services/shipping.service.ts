import {BindingScope, injectable, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {
  CancelShipmentResult,
  CreateReversePickupParams,
  CreateReversePickupResult,
  CreateShipmentParams,
  CreateShipmentResult,
  GenerateLabelResult,
  MasterDownloadResult,
  ProductCatalogResult,
  ServiceabilityParams,
  ServiceabilityResult,
  ShippingProvider,
  TrackingResult,
  TransitTimeParams,
  TransitTimeResult,
} from '../interfaces/shipping-provider.interface';
import {BlueDartProvider} from './shipping-providers/bluedart.provider';
import {BlueDartDeveloperPortalProvider} from './shipping-providers/bluedart-developer-portal.provider';
import {loadBlueDartConfig} from '../config/bluedart.config';
import {CacheService} from './cache.service';
import {ShippingAuditService} from './shipping-audit.service';
import {ShippingMonitorService} from './shipping-monitor.service';

@injectable({scope: BindingScope.SINGLETON})
export class ShippingService {
  private activeProvider: ShippingProvider;
  private localServiceabilityCache = new Map<
    string,
    {data: ServiceabilityResult; expiresAt: number}
  >();
  // Simple concurrency semaphore
  private activeCalls = 0;
  private callQueue: (() => void)[] = [];

  constructor(
    @inject('services.cache', {optional: true})
    private cacheService?: CacheService,
    @inject('services.shipping-audit')
    private auditService?: ShippingAuditService,
    @inject('services.shipping-monitor')
    private monitorService?: ShippingMonitorService,
  ) {
    const blueDartConfig = loadBlueDartConfig();
    this.activeProvider =
      blueDartConfig.providerMode === 'developer-portal'
        ? new BlueDartDeveloperPortalProvider(blueDartConfig)
        : new BlueDartProvider();
  }

  private getMaxConcurrent(): number {
    return Number(process.env.SHIPPING_API_MAX_CONCURRENT || '5');
  }

  private getMaxRetries(): number {
    return Number(process.env.SHIPPING_API_MAX_RETRIES || '3');
  }

  private getRetryDelay(): number {
    return Number(process.env.SHIPPING_API_RETRY_DELAY_MS || '1000');
  }

  /**
   * Concurrency limiting gatekeeper
   */
  private async acquireLock(): Promise<void> {
    const maxConcurrent = this.getMaxConcurrent();
    if (this.activeCalls < maxConcurrent) {
      this.activeCalls++;
      return;
    }

    return new Promise<void>(resolve => {
      this.callQueue.push(resolve);
    });
  }

  private releaseLock(): void {
    this.activeCalls--;
    if (this.callQueue.length > 0) {
      this.activeCalls++;
      const nextCall = this.callQueue.shift();
      if (nextCall) nextCall();
    }
  }

  /**
   * Retry with exponential backoff on eligible network/server errors
   */
  private async runWithRetry<T>(
    operationName: string,
    action: () => Promise<T>,
    allowRetry = true,
  ): Promise<T> {
    await this.acquireLock();

    const maxRetries = allowRetry ? this.getMaxRetries() : 1;
    const delayMs = this.getRetryDelay();
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await action();
        this.releaseLock();
        if (this.monitorService) {
          await this.monitorService.recordSuccess(
            this.activeProvider.courierName,
            operationName,
          );
        }
        return result;
      } catch (err) {
        lastError = err;
        console.warn(
          `[ShippingService] Attempt ${attempt} failed for ${operationName}:`,
          err.message || err,
        );

        // Do not retry on auth (403) or bad request / validation (400, 422) errors
        const status = err.status || err.statusCode;
        if (status === 400 || status === 403 || status === 422) {
          this.releaseLock();
          if (this.monitorService) {
            await this.monitorService.recordFailure(
              this.activeProvider.courierName,
              operationName,
              err.message || 'Validation error',
            );
          }
          throw err;
        }

        if (attempt < maxRetries) {
          // Exponential backoff delay
          await new Promise(resolve => setTimeout(resolve, attempt * delayMs));
        }
      }
    }

    this.releaseLock();
    if (this.monitorService) {
      await this.monitorService.recordFailure(
        this.activeProvider.courierName,
        operationName,
        lastError.message || 'Operation exhausted all retries',
      );
    }
    throw lastError;
  }

  /**
   * checkServiceability
   * Caches results per pincode for 24 hours.
   */
  async checkServiceability(
    params: ServiceabilityParams,
  ): Promise<ServiceabilityResult> {
    const cacheKey = `shipping:serviceability:${params.pincode}`;
    const ttlHours = Number(process.env.SERVICEABILITY_CACHE_TTL_HOURS || '24');
    const ttlSeconds = ttlHours * 3600;

    // 1. Try Redis cache if available
    if (this.cacheService) {
      const cached =
        await this.cacheService.get<ServiceabilityResult>(cacheKey);
      if (cached) return cached;
    } else {
      // 2. Fallback to in-memory map
      const cached = this.localServiceabilityCache.get(params.pincode);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // 3. Fetch live result from active provider
    const result = await this.runWithRetry('checkServiceability', () =>
      this.activeProvider.checkServiceability(params),
    );

    // 4. Populate cache
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, ttlSeconds);
    } else {
      this.localServiceabilityCache.set(params.pincode, {
        data: result,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }

    return result;
  }

  async createShipment(
    params: CreateShipmentParams,
  ): Promise<CreateShipmentResult> {
    return this.runWithRetry(
      'createShipment',
      () => this.activeProvider.createShipment(params),
      false,
    );
  }

  async cancelShipment(awbNumber: string): Promise<CancelShipmentResult> {
    return this.runWithRetry(
      'cancelShipment',
      () => this.activeProvider.cancelShipment(awbNumber),
      false,
    );
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    return this.runWithRetry('trackShipment', () =>
      this.activeProvider.trackShipment(awbNumber),
    );
  }

  async generateLabel(awbNumber: string): Promise<GenerateLabelResult> {
    return this.runWithRetry(
      'generateLabel',
      () => this.activeProvider.generateLabel(awbNumber),
      false,
    );
  }

  async createReversePickup(
    params: CreateReversePickupParams,
  ): Promise<CreateReversePickupResult> {
    return this.runWithRetry(
      'createReversePickup',
      () => this.activeProvider.createReversePickup(params),
      false,
    );
  }

  getProviderVersion(): string {
    return this.activeProvider.providerVersion || 'bluedart-legacy-soap';
  }

  /**
   * Transit Time / Product-Subproduct catalog / Master Download are Blue
   * Dart-specific capabilities, not part of the generic multi-courier
   * ShippingProvider interface (same precedent as registerPickup/
   * cancelPickup above) — accessed via a narrow runtime capability check
   * rather than widening the interface for every courier.
   */
  async getTransitTime(params: TransitTimeParams): Promise<TransitTimeResult> {
    const provider = this.activeProvider as unknown as {getTransitTime?: (p: TransitTimeParams) => Promise<TransitTimeResult>};
    if (!provider.getTransitTime) {
      throw new Error(`${this.activeProvider.courierName} does not support transit time lookup`);
    }
    return this.runWithRetry('getTransitTime', () => provider.getTransitTime!(params));
  }

  async getProductsAndSubProducts(): Promise<ProductCatalogResult> {
    const provider = this.activeProvider as unknown as {getProductsAndSubProducts?: () => Promise<ProductCatalogResult>};
    if (!provider.getProductsAndSubProducts) {
      throw new Error(`${this.activeProvider.courierName} does not support product catalog lookup`);
    }
    return this.runWithRetry('getProductsAndSubProducts', () => provider.getProductsAndSubProducts!());
  }

  async downloadPinCodeMaster(lastSynchDate: Date): Promise<MasterDownloadResult> {
    const provider = this.activeProvider as unknown as {downloadPinCodeMaster?: (d: Date) => Promise<MasterDownloadResult>};
    if (!provider.downloadPinCodeMaster) {
      throw new Error(`${this.activeProvider.courierName} does not support master data download`);
    }
    return this.runWithRetry('downloadPinCodeMaster', () => provider.downloadPinCodeMaster!(lastSynchDate));
  }
}
