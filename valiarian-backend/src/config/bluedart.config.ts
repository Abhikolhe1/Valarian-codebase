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
  baseUrl?: string;
  requestTimeoutMs: number;
  tokenRefreshBufferSeconds: number;
  tokenFallbackTtlSeconds: number;
  modernProfileMode: BlueDartModernProfileMode;
  enableTestMocks: boolean;
  account: Record<string, string | undefined>;
  endpoints: BlueDartEndpointConfig;
}

function enumValue<T extends string>(name: string, value: string, allowed: T[]): T {
  if (!allowed.includes(value as T)) {
    throw new BlueDartConfigurationError(`${name} must be one of: ${allowed.join(', ')}`, 'loadConfig');
  }
  return value as T;
}

function positiveNumber(name: string, value: string | undefined, fallback: number): number {
  const result = Number(value ?? fallback);
  if (!Number.isFinite(result) || result <= 0) {
    throw new BlueDartConfigurationError(`${name} must be a positive number`, 'loadConfig');
  }
  return result;
}

function optionalPath(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    throw new BlueDartConfigurationError('Blue Dart endpoint paths must be relative paths beginning with /', 'loadConfig');
  }
  return value;
}

export function loadBlueDartConfig(env: NodeJS.ProcessEnv = process.env): BlueDartConfig {
  const providerMode = enumValue('BLUEDART_PROVIDER_MODE', env.BLUEDART_PROVIDER_MODE || 'legacy-soap', ['legacy-soap', 'developer-portal']);
  const environment = enumValue('BLUEDART_ENVIRONMENT', env.BLUEDART_ENVIRONMENT || (env.BLUEDART_ENV === 'PROD' ? 'production' : 'sandbox'), ['sandbox', 'production']);
  const modernProfileMode = enumValue('BLUEDART_MODERN_PROFILE_MODE', env.BLUEDART_MODERN_PROFILE_MODE || 'none', ['none', 'customer-only', 'legacy-profile']);
  const enableTestMocks = env.BLUEDART_ENABLE_TEST_MOCKS === 'true';

  if (environment === 'production' && enableTestMocks) {
    throw new BlueDartConfigurationError('Blue Dart test mocks are prohibited in production', 'loadConfig');
  }
  if (providerMode === 'developer-portal') {
    const missing = ['BLUEDART_API_KEY', 'BLUEDART_API_SECRET', 'BLUEDART_AUTH_URL', 'BLUEDART_BASE_URL'].filter(name => !env[name]?.trim());
    if (missing.length) {
      throw new BlueDartConfigurationError(`Missing required Developer Portal configuration: ${missing.join(', ')}`, 'loadConfig');
    }
  }

  return {
    providerMode,
    environment,
    apiKey: env.BLUEDART_API_KEY,
    apiSecret: env.BLUEDART_API_SECRET,
    authUrl: env.BLUEDART_AUTH_URL,
    baseUrl: env.BLUEDART_BASE_URL,
    requestTimeoutMs: positiveNumber('BLUEDART_REQUEST_TIMEOUT_MS', env.BLUEDART_REQUEST_TIMEOUT_MS, 30000),
    tokenRefreshBufferSeconds: positiveNumber('BLUEDART_TOKEN_REFRESH_BUFFER_SECONDS', env.BLUEDART_TOKEN_REFRESH_BUFFER_SECONDS, 300),
    tokenFallbackTtlSeconds: positiveNumber('BLUEDART_TOKEN_FALLBACK_TTL_SECONDS', env.BLUEDART_TOKEN_FALLBACK_TTL_SECONDS, 900),
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
    },
    endpoints: {
      serviceability: optionalPath(env.BLUEDART_SERVICEABILITY_PATH),
      waybill: optionalPath(env.BLUEDART_WAYBILL_PATH),
      cancelWaybill: optionalPath(env.BLUEDART_CANCEL_WAYBILL_PATH),
      tracking: optionalPath(env.BLUEDART_TRACKING_PATH),
      pickupRegistration: optionalPath(env.BLUEDART_PICKUP_REGISTRATION_PATH),
      pickupCancellation: optionalPath(env.BLUEDART_PICKUP_CANCELLATION_PATH),
      transitTime: optionalPath(env.BLUEDART_TRANSIT_TIME_PATH),
      products: optionalPath(env.BLUEDART_PRODUCTS_PATH),
      label: optionalPath(env.BLUEDART_LABEL_PATH),
    },
  };
}

export function getMaskedBlueDartDiagnostics(config: BlueDartConfig) {
  return {
    providerMode: config.providerMode,
    environment: config.environment,
    apiKeyConfigured: Boolean(config.apiKey),
    apiSecretConfigured: Boolean(config.apiSecret),
    authUrlConfigured: Boolean(config.authUrl),
    baseUrlConfigured: Boolean(config.baseUrl),
    configuredEndpoints: Object.keys(config.endpoints).filter(key => Boolean(config.endpoints[key as keyof BlueDartEndpointConfig])),
    modernProfileMode: config.modernProfileMode,
    testMocksEnabled: config.enableTestMocks,
  };
}
