/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
export type DelhiveryEnvironment = 'staging' | 'production';

export interface DelhiveryConfig {
  environment: DelhiveryEnvironment;
  baseUrl: string;
  token?: string;
  rateBaseUrl: string;
  rateToken?: string;
  requestTimeoutMs: number;
  labelSize: 'A4' | '4R';
  shippingMode: 'Surface' | 'Express';
  pickupTime: string;
  pickupLocationName?: string;
  debugLogs: boolean;
  configured: boolean;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadDelhiveryConfig(
  env: NodeJS.ProcessEnv = process.env,
): DelhiveryConfig {
  const requestedEnvironment = env.DELHIVERY_ENV?.trim().toLowerCase();
  const environment: DelhiveryEnvironment =
    requestedEnvironment === 'production' ||
    (!requestedEnvironment && env.NODE_ENV?.trim().toLowerCase() === 'production')
      ? 'production'
      : 'staging';
  const defaultBaseUrl =
    environment === 'production'
      ? 'https://track.delhivery.com'
      : 'https://staging-express.delhivery.com';
  const labelSize = env.DELHIVERY_LABEL_SIZE?.trim().toUpperCase();
  const shippingMode = env.DELHIVERY_SHIPPING_MODE?.trim().toLowerCase();
  const tokenValue = env.DELHIVERY_API_TOKEN?.trim();
  const token = tokenValue ? tokenValue : undefined;
  const rateTokenValue = env.DELHIVERY_RATE_API_TOKEN?.trim();
  const rateToken = rateTokenValue
    ? rateTokenValue
    : environment === 'production'
      ? token
      : undefined;
  const baseUrlValue = env.DELHIVERY_BASE_URL?.trim();
  const pickupTimeValue = env.DELHIVERY_PICKUP_TIME?.trim();
  const pickupLocationNameValue = env.DELHIVERY_PICKUP_LOCATION_NAME?.trim();

  return {
    environment,
    baseUrl: (baseUrlValue ? baseUrlValue : defaultBaseUrl).replace(/\/$/, ''),
    token,
    rateBaseUrl: (env.DELHIVERY_RATE_BASE_URL?.trim() || 'https://track.delhivery.com')
      .replace(/\/$/, ''),
    rateToken,
    requestTimeoutMs: positiveNumber(env.DELHIVERY_REQUEST_TIMEOUT_MS, 30000),
    labelSize: labelSize === 'A4' ? 'A4' : '4R',
    shippingMode: shippingMode === 'express' ? 'Express' : 'Surface',
    pickupTime: pickupTimeValue ? pickupTimeValue : '11:00:00',
    pickupLocationName: pickupLocationNameValue || undefined,
    debugLogs: env.DELHIVERY_DEBUG_LOGS?.trim().toLowerCase() === 'true',
    configured: Boolean(token),
  };
}
