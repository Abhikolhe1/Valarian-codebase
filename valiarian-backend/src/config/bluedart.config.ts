import {BlueDartConfigurationError} from '../services/shipping-providers/bluedart-errors';

export type BlueDartProviderMode = 'legacy-soap' | 'developer-portal';
export type BlueDartEnvironment = 'sandbox' | 'production';
export type BlueDartModernProfileMode = 'none' | 'customer-only' | 'legacy-profile';

export interface BlueDartEndpointConfig {
  serviceability?: string;
  waybill?: string;
  cancelWaybill?: string;
  tracking?: string;
  pickupRegistration?: string;
  pickupCancellation?: string;
  transitTime?: string;
  products?: string;
  label?: string;
}

export interface BlueDartConfig {
  providerMode: BlueDartProviderMode;
  environment: BlueDartEnvironment;
  apiKey?: string;
  apiSecret?: string;
  authUrl?: string;
  /** Location Finder base URL (`.../finder/v1`). Kept as `baseUrl` for backward compatibility. */
  baseUrl?: string;
  transitBaseUrl?: string;
  productBaseUrl?: string;
  masterDownloadBaseUrl?: string;
  waybillBaseUrl?: string;
  pickupBaseUrl?: string;
  cancelPickupBaseUrl?: string;
  trackingBaseUrl?: string;
  requestTimeoutMs: number;
  tokenRefreshBufferSeconds: number;
  tokenFallbackTtlSeconds: number;
  modernProfileMode: BlueDartModernProfileMode;
  enableTestMocks: boolean;
  account: Record<string, string | undefined>;
  endpoints: BlueDartEndpointConfig;
  /**
   * Human-readable, secret-free descriptions of missing/invalid Developer
   * Portal configuration. Empty when fully configured for `providerMode`.
   *
   * loadBlueDartConfig() NEVER throws — an incomplete or broken Blue Dart
   * setup must not be able to crash unrelated backend startup (this config
   * is read eagerly by a lifecycle observer at boot). Callers that are about
   * to make a live Blue Dart call must check `configErrors` (or call
   * `assertBlueDartConfigured`) first and fail clearly at that point instead.
   */
  configErrors: string[];
}

function resolveEnum<T extends string>(
  label: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
  errors: string[],
): T {
  if (!value) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${label} must be one of: ${allowed.join(', ')} (defaulting to "${fallback}")`);
  return fallback;
}

function positiveNumber(name: string, value: string | undefined, fallback: number, errors: string[]): number {
  if (value === undefined) return fallback;
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) {
    errors.push(`${name} must be a positive number (defaulting to ${fallback})`);
    return fallback;
  }
  return result;
}

function optionalPath(name: string, value: string | undefined, errors: string[]): string | undefined {
  if (!value?.trim()) return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    errors.push(`${name} must be a relative path beginning with / (ignoring invalid value)`);
    return undefined;
  }
  return value;
}

export function loadBlueDartConfig(env: NodeJS.ProcessEnv = process.env): BlueDartConfig {
  const errors: string[] = [];

  const providerMode = resolveEnum('BLUEDART_PROVIDER_MODE', env.BLUEDART_PROVIDER_MODE, ['legacy-soap', 'developer-portal'] as const, 'legacy-soap', errors);
  // BLUEDART_ENV is the single source of truth for environment selection
  // (sandbox | production). It is also read by the legacy-soap provider
  // (checked there against the older 'PROD' convention) — 'sandbox' and
  // 'production' both safely fall through that check as "not PROD".
  const environment = resolveEnum('BLUEDART_ENV', env.BLUEDART_ENV, ['sandbox', 'production'] as const, 'sandbox', errors);
  const modernProfileMode = resolveEnum('BLUEDART_MODERN_PROFILE_MODE', env.BLUEDART_MODERN_PROFILE_MODE, ['none', 'customer-only', 'legacy-profile'] as const, 'none', errors);
  const enableTestMocks = env.BLUEDART_ENABLE_TEST_MOCKS === 'true';

  if (environment === 'production' && enableTestMocks) {
    errors.push('BLUEDART_ENABLE_TEST_MOCKS must not be true when BLUEDART_ENV=production (test mocks disabled)');
  }

  // Environment-scoped URLs — switching BLUEDART_ENV is the only change
  // needed later; no code/service/controller change required. Each Blue Dart
  // API family (Finder, Transit, Product, Master Download, Waybill) is a
  // separate Apigee proxy with its own base URL — confirmed individually
  // from the Developer Portal Reference Docs, never guessed.
  const authUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_AUTH_URL : env.BLUEDART_SANDBOX_AUTH_URL;
  const baseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_BASE_URL : env.BLUEDART_SANDBOX_BASE_URL;
  const transitBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_TRANSIT_BASE_URL : env.BLUEDART_SANDBOX_TRANSIT_BASE_URL;
  const productBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_PRODUCT_BASE_URL : env.BLUEDART_SANDBOX_PRODUCT_BASE_URL;
  const masterDownloadBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_MASTERDOWNLOAD_BASE_URL : env.BLUEDART_SANDBOX_MASTERDOWNLOAD_BASE_URL;
  const waybillBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_WAYBILL_BASE_URL : env.BLUEDART_SANDBOX_WAYBILL_BASE_URL;
  const pickupBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_PICKUP_BASE_URL : env.BLUEDART_SANDBOX_PICKUP_BASE_URL;
  const cancelPickupBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_CANCEL_PICKUP_BASE_URL : env.BLUEDART_SANDBOX_CANCEL_PICKUP_BASE_URL;
  const trackingBaseUrl = environment === 'production' ? env.BLUEDART_PRODUCTION_TRACKING_BASE_URL : env.BLUEDART_SANDBOX_TRACKING_BASE_URL;

  if (providerMode === 'developer-portal') {
    const requiredVars: Array<[string, string | undefined]> = [
      ['BLUEDART_API_KEY', env.BLUEDART_API_KEY],
      ['BLUEDART_API_SECRET', env.BLUEDART_API_SECRET],
      [environment === 'production' ? 'BLUEDART_PRODUCTION_AUTH_URL' : 'BLUEDART_SANDBOX_AUTH_URL', authUrl],
      [environment === 'production' ? 'BLUEDART_PRODUCTION_BASE_URL' : 'BLUEDART_SANDBOX_BASE_URL', baseUrl],
    ];
    const missing = requiredVars.filter(([, value]) => !value?.trim()).map(([name]) => name);
    if (missing.length) {
      errors.push(`Blue Dart developer-portal configuration incomplete: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing`);
    }
  }

  return {
    providerMode,
    environment,
    apiKey: env.BLUEDART_API_KEY,
    apiSecret: env.BLUEDART_API_SECRET,
    authUrl,
    baseUrl,
    transitBaseUrl,
    productBaseUrl,
    masterDownloadBaseUrl,
    waybillBaseUrl,
    pickupBaseUrl,
    cancelPickupBaseUrl,
    trackingBaseUrl,
    requestTimeoutMs: positiveNumber('BLUEDART_REQUEST_TIMEOUT_MS', env.BLUEDART_REQUEST_TIMEOUT_MS, 30000, errors),
    tokenRefreshBufferSeconds: positiveNumber('BLUEDART_TOKEN_REFRESH_BUFFER_SECONDS', env.BLUEDART_TOKEN_REFRESH_BUFFER_SECONDS, 300, errors),
    tokenFallbackTtlSeconds: positiveNumber('BLUEDART_TOKEN_FALLBACK_TTL_SECONDS', env.BLUEDART_TOKEN_FALLBACK_TTL_SECONDS, 900, errors),
    modernProfileMode,
    enableTestMocks,
    account: {
      customerCode: env.BLUEDART_CUSTOMER_CODE,
      loginId: env.BLUEDART_LOGIN_ID,
      licenceKey: env.BLUEDART_LICENCE_KEY,
      originArea: env.BLUEDART_ORIGIN_AREA,
      areaCode: env.BLUEDART_AREA_CODE,
      pickupLocationCode: env.BLUEDART_PICKUP_LOCATION_CODE,
      productCode: env.BLUEDART_PRODUCT_CODE,
      subProductCode: env.BLUEDART_SUB_PRODUCT_CODE,
      serviceType: env.BLUEDART_SERVICE_TYPE,
      codFavorOf: env.BLUEDART_COD_FAVOR_OF,
      shipperAddressLine1: env.BLUEDART_SHIPPER_ADDRESS_LINE1,
      shipperCity: env.BLUEDART_SHIPPER_CITY,
      shipperState: env.BLUEDART_SHIPPER_STATE,
      shipperPhone: env.BLUEDART_SHIPPER_PHONE,
    },
    endpoints: {
      serviceability: optionalPath('BLUEDART_SERVICEABILITY_PATH', env.BLUEDART_SERVICEABILITY_PATH, errors),
      waybill: optionalPath('BLUEDART_WAYBILL_PATH', env.BLUEDART_WAYBILL_PATH, errors),
      cancelWaybill: optionalPath('BLUEDART_CANCEL_WAYBILL_PATH', env.BLUEDART_CANCEL_WAYBILL_PATH, errors),
      tracking: optionalPath('BLUEDART_TRACKING_PATH', env.BLUEDART_TRACKING_PATH, errors),
      pickupRegistration: optionalPath('BLUEDART_PICKUP_REGISTRATION_PATH', env.BLUEDART_PICKUP_REGISTRATION_PATH, errors),
      pickupCancellation: optionalPath('BLUEDART_PICKUP_CANCELLATION_PATH', env.BLUEDART_PICKUP_CANCELLATION_PATH, errors),
      transitTime: optionalPath('BLUEDART_TRANSIT_TIME_PATH', env.BLUEDART_TRANSIT_TIME_PATH, errors),
      products: optionalPath('BLUEDART_PRODUCTS_PATH', env.BLUEDART_PRODUCTS_PATH, errors),
      label: optionalPath('BLUEDART_LABEL_PATH', env.BLUEDART_LABEL_PATH, errors),
    },
    configErrors: errors,
  };
}

/**
 * Throws a BlueDartConfigurationError (secret-free) if the config is not
 * usable for `providerMode === 'developer-portal'`. Call this at the point a
 * live Blue Dart call is about to be made — never at module/app boot time.
 */
export function assertBlueDartConfigured(config: BlueDartConfig, operation: string): void {
  if (!config.configErrors.length) return;
  throw new BlueDartConfigurationError(config.configErrors.join('; '), operation);
}

/**
 * Lazy, per-call check for a specific API family's base URL (Transit,
 * Product, Master Download, Waybill — each an independent, optionally-used
 * Apigee proxy). Unlike the core Finder base URL, these are NOT required for
 * the app to boot or for developer-portal mode to be considered "configured"
 * — only for that specific operation to run.
 */
export function assertBlueDartBaseUrlConfigured(
  baseUrl: string | undefined,
  envVarName: string,
  operation: string,
): asserts baseUrl is string {
  if (!baseUrl) {
    throw new BlueDartConfigurationError(`${envVarName} is not configured`, operation);
  }
}

export function getMaskedBlueDartDiagnostics(config: BlueDartConfig) {
  return {
    providerMode: config.providerMode,
    environment: config.environment,
    apiKeyConfigured: Boolean(config.apiKey),
    apiSecretConfigured: Boolean(config.apiSecret),
    authUrlConfigured: Boolean(config.authUrl),
    baseUrlConfigured: Boolean(config.baseUrl),
    transitBaseUrlConfigured: Boolean(config.transitBaseUrl),
    productBaseUrlConfigured: Boolean(config.productBaseUrl),
    masterDownloadBaseUrlConfigured: Boolean(config.masterDownloadBaseUrl),
    waybillBaseUrlConfigured: Boolean(config.waybillBaseUrl),
    pickupBaseUrlConfigured: Boolean(config.pickupBaseUrl),
    cancelPickupBaseUrlConfigured: Boolean(config.cancelPickupBaseUrl),
    trackingBaseUrlConfigured: Boolean(config.trackingBaseUrl),
    loginIdConfigured: Boolean(config.account.loginId),
    licenceKeyConfigured: Boolean(config.account.licenceKey),
    configuredEndpoints: Object.keys(config.endpoints).filter(key => Boolean(config.endpoints[key as keyof BlueDartEndpointConfig])),
    modernProfileMode: config.modernProfileMode,
    testMocksEnabled: config.enableTestMocks,
    configErrors: config.configErrors,
  };
}
