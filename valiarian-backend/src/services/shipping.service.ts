import {BindingScope, injectable, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {
  CancelShipmentResult,
  AlternateInstructionParams,
  AlternateInstructionResult,
  CreateReversePickupParams,
  CreateReversePickupResult,
  CreateShipmentParams,
  CreateShipmentResult,
  GenerateLabelResult,
  MasterDownloadResult,
  PickupCancellationParams,
  PickupCancellationResult,
  PickupRegistrationParams,
  PickupRegistrationResult,
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
import {BlueDartAuthenticationError, BlueDartConfigurationError, BlueDartProviderError, BlueDartRateLimitError, BlueDartUnauthorizedError} from './shipping-providers/bluedart-errors';
import {
  DelhiveryProvider,
  DelhiveryShipmentUpdate,
  DelhiveryShippingCostParams,
  DelhiveryWarehouseRequest,
} from './shipping-providers/delhivery.provider';
import {
  DelhiveryAuthenticationError,
  DelhiveryConfigurationError,
  DelhiveryProviderError,
  DelhiveryRateLimitError,
} from './shipping-providers/delhivery-errors';

export type ForwardShippingProvider = 'Delhivery' | 'BlueDart' | 'Manual';

export interface PreferredServiceabilityResult {
  selectedProvider: ForwardShippingProvider;
  result?: ServiceabilityResult;
  delhivery?: ServiceabilityResult;
  blueDart?: ServiceabilityResult;
  delhiveryCheckFailed: boolean;
  blueDartCheckFailed: boolean;
}

@injectable({scope: BindingScope.SINGLETON})
export class ShippingService {
  private activeProvider: ShippingProvider;
  private readonly delhiveryProvider: DelhiveryProvider;
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
    this.delhiveryProvider = new DelhiveryProvider();
  }

  private getProvider(courierName = 'BlueDart'): ShippingProvider {
    if (courierName.toLowerCase() === 'delhivery') return this.delhiveryProvider;
    if (courierName.toLowerCase() === 'bluedart') return this.activeProvider;
    throw new HttpErrors.BadRequest(`Unsupported shipping provider: ${courierName}`);
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
    provider: ShippingProvider = this.activeProvider,
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
            provider.courierName,
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

        // Do not retry account-wide throttling here. The tracking scheduler
        // applies a longer cooldown before making another Blue Dart request.
        if (
          err instanceof BlueDartRateLimitError ||
          err instanceof DelhiveryRateLimitError
        ) {
          this.releaseLock();
          if (this.monitorService) {
            await this.monitorService.recordFailure(
              provider.courierName,
              operationName,
              err.message,
            );
          }
          throw err;
        }

        // Do not retry on auth (403) or bad request / validation (400, 422) errors
        const status = err.status || err.statusCode || err.httpStatus;
        if (status === 400 || status === 401 || status === 403 || status === 422 ||
          ((err instanceof BlueDartProviderError ||
            err instanceof DelhiveryProviderError) &&
            !err.retryable)) {
          this.releaseLock();
          if (this.monitorService) {
            await this.monitorService.recordFailure(
              provider.courierName,
              operationName,
              err.message || 'Validation error',
              err instanceof BlueDartConfigurationError ||
                err instanceof BlueDartAuthenticationError ||
                err instanceof BlueDartUnauthorizedError ||
                err instanceof DelhiveryConfigurationError ||
                err instanceof DelhiveryAuthenticationError,
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
        provider.courierName,
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
    forceRefresh = false,
  ): Promise<ServiceabilityResult> {
    const cacheKey = params.deliveryMode && params.paymentType
      ? `shipping:serviceability:${params.pincode}:${params.deliveryMode}:${params.paymentType}`
      : `shipping:serviceability:${params.pincode}`;
    const ttlHours = Number(process.env.SERVICEABILITY_CACHE_TTL_HOURS || '24');
    const ttlSeconds = ttlHours * 3600;

    // 1. Try Redis cache if available
    if (!forceRefresh && this.cacheService) {
      const cached =
        await this.cacheService.get<ServiceabilityResult>(cacheKey);
      if (cached) return cached;
    } else if (!forceRefresh) {
      // 2. Fallback to in-memory map
      const cached = this.localServiceabilityCache.get(cacheKey);
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
      this.localServiceabilityCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }

    return result;
  }

  private async checkProviderServiceability(
    provider: ShippingProvider,
    params: ServiceabilityParams,
    forceRefresh: boolean,
  ): Promise<ServiceabilityResult> {
    const cacheKey =
      `shipping:serviceability:${provider.courierName.toLowerCase()}:` +
      `${params.pincode}:${params.deliveryMode ?? 'configured'}:` +
      `${params.paymentType ?? 'prepaid'}`;
    const ttlHours = Number(process.env.SERVICEABILITY_CACHE_TTL_HOURS || '24');
    const ttlSeconds = ttlHours * 3600;

    if (!forceRefresh && this.cacheService) {
      const cached = await this.cacheService.get<ServiceabilityResult>(cacheKey);
      if (cached) return cached;
    } else if (!forceRefresh) {
      const cached = this.localServiceabilityCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.data;
    }

    const result = await this.runWithRetry(
      'checkServiceability',
      () => provider.checkServiceability(params),
      true,
      provider,
    );
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, ttlSeconds);
    } else {
      this.localServiceabilityCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
    return result;
  }

  async checkServiceabilityForProvider(
    courierName: 'Delhivery' | 'BlueDart',
    params: ServiceabilityParams,
    forceRefresh = false,
  ): Promise<ServiceabilityResult> {
    return this.checkProviderServiceability(
      this.getProvider(courierName),
      params,
      forceRefresh,
    );
  }

  /**
   * Checks Delhivery first, then Blue Dart. A provider outage is distinct from
   * a genuine non-serviceable response and does not stop the next provider.
   */
  async checkPreferredServiceability(
    params: ServiceabilityParams,
    forceRefresh = false,
  ): Promise<PreferredServiceabilityResult> {
    const isCod = params.paymentType === 'cod';
    let delhivery: ServiceabilityResult | undefined;
    let blueDart: ServiceabilityResult | undefined;
    let delhiveryCheckFailed = false;
    let blueDartCheckFailed = false;

    if (this.delhiveryProvider.isConfigured) {
      try {
        delhivery = await this.checkProviderServiceability(
          this.delhiveryProvider,
          params,
          forceRefresh,
        );
      } catch (error) {
        delhiveryCheckFailed = true;
        console.error(
          '[ShippingService] Delhivery serviceability check failed:',
          error instanceof Error ? error.message : error,
        );
      }
    } else {
      delhiveryCheckFailed = true;
    }

    try {
      blueDart = await this.checkProviderServiceability(
        this.activeProvider,
        params,
        forceRefresh,
      );
    } catch (error) {
      blueDartCheckFailed = true;
      console.error(
        '[ShippingService] Blue Dart serviceability check failed:',
        error instanceof Error ? error.message : error,
      );
    }

    const delhiveryUsable =
      delhivery?.isServiceable === true && (!isCod || delhivery.isCodAvailable);
    const blueDartUsable =
      blueDart?.isServiceable === true && (!isCod || blueDart.isCodAvailable);
    let selectedProvider: ForwardShippingProvider = 'Manual';
    let result = blueDart ?? delhivery;
    if (delhiveryUsable) {
      selectedProvider = 'Delhivery';
      result = delhivery;
    } else if (blueDartUsable) {
      selectedProvider = 'BlueDart';
      result = blueDart;
    }
    return {
      selectedProvider,
      result,
      delhivery,
      blueDart,
      delhiveryCheckFailed,
      blueDartCheckFailed,
    };
  }

  async createShipment(
    params: CreateShipmentParams,
    courierName = 'BlueDart',
  ): Promise<CreateShipmentResult> {
    const provider = this.getProvider(courierName);
    return this.runWithRetry(
      'createShipment',
      () => provider.createShipment(params),
      false,
      provider,
    );
  }

  async registerPickup(
    params: PickupRegistrationParams,
    courierName = 'BlueDart',
  ): Promise<PickupRegistrationResult> {
    const activeProvider = this.getProvider(courierName);
    const provider = activeProvider as ShippingProvider & {
      registerPickup?: (request: PickupRegistrationParams) => Promise<PickupRegistrationResult>;
    };
    if (!provider.registerPickup) {
      throw new HttpErrors.NotImplemented(
        `${activeProvider.courierName} does not support pickup registration`,
      );
    }
    return this.runWithRetry(
      'registerPickup',
      () => provider.registerPickup!(params),
      false,
      activeProvider,
    );
  }

  async cancelPickup(
    params: PickupCancellationParams,
  ): Promise<PickupCancellationResult> {
    const provider = this.activeProvider as ShippingProvider & {
      cancelPickup?: (request: PickupCancellationParams) => Promise<PickupCancellationResult>;
    };
    if (!provider.cancelPickup) {
      throw new HttpErrors.NotImplemented(
        `${this.activeProvider.courierName} does not support pickup cancellation`,
      );
    }
    return this.runWithRetry(
      'cancelPickup',
      () => provider.cancelPickup!(params),
      false,
    );
  }

  async cancelShipment(
    awbNumber: string,
    courierName = 'BlueDart',
  ): Promise<CancelShipmentResult> {
    const provider = this.getProvider(courierName);
    return this.runWithRetry(
      'cancelShipment',
      () => provider.cancelShipment(awbNumber),
      false,
      provider,
    );
  }

  async trackShipment(
    awbNumber: string,
    courierName = 'BlueDart',
  ): Promise<TrackingResult> {
    const provider = this.getProvider(courierName);
    return this.runWithRetry(
      'trackShipment',
      () => provider.trackShipment(awbNumber),
      true,
      provider,
    );
  }

  async generateLabel(
    awbNumber: string,
    courierName = 'BlueDart',
  ): Promise<GenerateLabelResult> {
    const provider = this.getProvider(courierName);
    return this.runWithRetry(
      'generateLabel',
      () => provider.generateLabel(awbNumber),
      false,
      provider,
    );
  }

  async createReversePickup(
    params: CreateReversePickupParams,
    courierName = 'BlueDart',
  ): Promise<CreateReversePickupResult> {
    const provider = this.getProvider(courierName);
    return this.runWithRetry(
      'createReversePickup',
      () => provider.createReversePickup(params),
      false,
      provider,
    );
  }

  async updateAlternateInstruction(
    params: AlternateInstructionParams,
  ): Promise<AlternateInstructionResult> {
    const provider = this.activeProvider as ShippingProvider & {
      updateAlternateInstruction?: (
        request: AlternateInstructionParams,
      ) => Promise<AlternateInstructionResult>;
    };
    if (!provider.updateAlternateInstruction) {
      throw new HttpErrors.NotImplemented(
        `${this.activeProvider.courierName} does not support alternate instructions`,
      );
    }
    return this.runWithRetry(
      'updateAlternateInstruction',
      () => provider.updateAlternateInstruction!(params),
      false,
    );
  }

  getProviderVersion(courierName = 'BlueDart'): string {
    return this.getProvider(courierName).providerVersion || 'bluedart-legacy-soap';
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

  async updateDelhiveryShipment(params: DelhiveryShipmentUpdate): Promise<unknown> {
    return this.runWithRetry(
      'updateShipment',
      () => this.delhiveryProvider.updateShipment(params),
      false,
      this.delhiveryProvider,
    );
  }

  async updateDelhiveryEwaybill(
    waybill: string,
    invoice: string,
    ewaybill: string,
  ): Promise<unknown> {
    return this.runWithRetry(
      'updateEwaybill',
      () => this.delhiveryProvider.updateEwaybill(waybill, invoice, ewaybill),
      false,
      this.delhiveryProvider,
    );
  }

  async calculateDelhiveryShippingCost(
    params: DelhiveryShippingCostParams,
  ): Promise<unknown> {
    return this.runWithRetry(
      'calculateShippingCost',
      () => this.delhiveryProvider.calculateShippingCost(params),
      true,
      this.delhiveryProvider,
    );
  }

  async fetchDelhiveryWaybills(count?: number): Promise<unknown> {
    return this.runWithRetry(
      count ? 'fetchBulkWaybills' : 'fetchSingleWaybill',
      () => this.delhiveryProvider.fetchWaybills(count),
      true,
      this.delhiveryProvider,
    );
  }

  async createDelhiveryWarehouse(params: DelhiveryWarehouseRequest): Promise<unknown> {
    return this.runWithRetry(
      'createWarehouse',
      () => this.delhiveryProvider.createWarehouse(params),
      false,
      this.delhiveryProvider,
    );
  }

  async updateDelhiveryWarehouse(
    name: string,
    pin: string,
    address?: string,
    phone?: string,
  ): Promise<unknown> {
    return this.runWithRetry(
      'updateWarehouse',
      () => this.delhiveryProvider.updateWarehouse(name, pin, address, phone),
      false,
      this.delhiveryProvider,
    );
  }

  async downloadDelhiveryDocument(
    waybill: string,
    documentType: string,
  ): Promise<unknown> {
    return this.runWithRetry(
      'downloadDocument',
      () => this.delhiveryProvider.downloadDocument(waybill, documentType),
      true,
      this.delhiveryProvider,
    );
  }

  async submitDelhiveryNdr(
    waybill: string,
    action: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE',
  ): Promise<unknown> {
    return this.runWithRetry(
      'submitNdr',
      () => this.delhiveryProvider.submitNdr(waybill, action),
      false,
      this.delhiveryProvider,
    );
  }

  async getDelhiveryNdrStatus(requestId: string): Promise<unknown> {
    return this.runWithRetry(
      'getNdrStatus',
      () => this.delhiveryProvider.getNdrStatus(requestId),
      true,
      this.delhiveryProvider,
    );
  }
}
