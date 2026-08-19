import axios = require('axios');
import {BlueDartConfig} from '../../config/bluedart.config';
import {BlueDartAuthenticationError, BlueDartTimeoutError} from './bluedart-errors';

export interface BlueDartTokenResponse {
  accessToken: string;
  expiresAt: number;
  tokenType?: string;
}

export interface BlueDartTokenCache {
  get(): Promise<BlueDartTokenResponse | null>;
  set(token: BlueDartTokenResponse): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryBlueDartTokenCache implements BlueDartTokenCache {
  private token: BlueDartTokenResponse | null = null;
  async get() { return this.token; }
  async set(token: BlueDartTokenResponse) { this.token = token; }
  async clear() { this.token = null; }
}

export interface AuthenticationRequest {
  method: 'POST';
  headers: Record<string, string>;
  body: Record<string, string>;
}

interface HttpClient { request(config: Record<string, unknown>): Promise<{data: unknown}>; }

/**
 * UNCONFIRMED CONTRACT: credential placement is isolated here. Blue Dart/DHL
 * documentation must confirm or replace this mapper before live use.
 */
export function buildAuthenticationRequest(config: BlueDartConfig): AuthenticationRequest {
  return {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-api-secret': config.apiSecret!},
    body: {apiKey: config.apiKey!},
  };
}

function decodeJwtExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : undefined;
  } catch { return undefined; }
}

export function parseAuthenticationResponse(data: unknown, fallbackTtlSeconds = 900, now = Date.now()): BlueDartTokenResponse {
  const value = (data || {}) as Record<string, unknown>;
  const accessToken = [value.access_token, value.accessToken, value.token, value.jwt].find(item => typeof item === 'string') as string | undefined;
  if (!accessToken) {
    throw new BlueDartAuthenticationError('Blue Dart authentication response did not contain a supported token field', {operation: 'authenticate'});
  }
  let expiresAt: number | undefined;
  if (typeof value.expiresAt === 'number') expiresAt = value.expiresAt > 1e12 ? value.expiresAt : value.expiresAt * 1000;
  else if (typeof value.expires_in === 'number') expiresAt = now + value.expires_in * 1000;
  else if (typeof value.exp === 'number') expiresAt = value.exp > 1e12 ? value.exp : value.exp * 1000;
  expiresAt = expiresAt ?? decodeJwtExpiry(accessToken) ?? now + fallbackTtlSeconds * 1000;
  return {accessToken, expiresAt, tokenType: typeof value.token_type === 'string' ? value.token_type : undefined};
}

export class BlueDartAuthService {
  private refreshPromise?: Promise<BlueDartTokenResponse>;

  constructor(
    private readonly config: BlueDartConfig,
    private readonly cache: BlueDartTokenCache = new InMemoryBlueDartTokenCache(),
    private readonly http: HttpClient = axios.create({}) as any,
  ) {}

  async getToken(forceRefresh = false): Promise<BlueDartTokenResponse> {
    if (!forceRefresh) {
      const cached = await this.cache.get();
      if (cached && cached.expiresAt - this.config.tokenRefreshBufferSeconds * 1000 > Date.now()) return cached;
    }
    if (!this.refreshPromise) this.refreshPromise = this.authenticate().finally(() => { this.refreshPromise = undefined; });
    return this.refreshPromise;
  }

  async invalidate(): Promise<void> { await this.cache.clear(); }

  private async authenticate(): Promise<BlueDartTokenResponse> {
    const request = buildAuthenticationRequest(this.config);
    try {
      const response = await this.http.request({url: this.config.authUrl!, method: request.method, headers: request.headers, data: request.body, timeout: this.config.requestTimeoutMs});
      const token = parseAuthenticationResponse(response.data, this.config.tokenFallbackTtlSeconds);
      await this.cache.set(token);
      return token;
    } catch (error) {
      if (error instanceof BlueDartAuthenticationError) throw error;
      const clientError = error as any;
      if (clientError?.code === 'ECONNABORTED') {
        throw new BlueDartTimeoutError('Blue Dart authentication timed out', {operation: 'authenticate', retryable: true});
      }
      const status = clientError?.response?.status;
      throw new BlueDartAuthenticationError('Blue Dart authentication failed', {operation: 'authenticate', httpStatus: status, retryable: Boolean(status && status >= 500)});
    }
  }
}
