import axios = require('axios');
import {randomUUID} from 'crypto';
import {BlueDartConfig} from '../../config/bluedart.config';
import {BlueDartAuthService} from './bluedart-auth.service';
import {BlueDartProviderError, BlueDartRateLimitError, BlueDartTimeoutError, BlueDartUnauthorizedError} from './bluedart-errors';

/**
 * Pulls a short, sanitized diagnostic summary out of a Blue Dart error body
 * for internal logs/error objects — never sent to frontend clients as-is.
 * Recognizes the shapes seen in practice: {error-response:[{msg|ErrorMessage}]},
 * an ASP.NET-style {title, errors: {Field: [messages]}}, and a bare {title}.
 * Falls back to a truncated JSON dump of the body (internal-only — this is
 * never forwarded to an external client, only logged/stored for admins) so a
 * shape we haven't seen before still surfaces *something* instead of nothing.
 */
function summarizeProviderErrorBody(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const body = data as Record<string, unknown>;
  const entry = Array.isArray(body['error-response']) ? (body['error-response'] as unknown[])[0] : undefined;
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const msg = e.msg ?? e.message ?? e.ErrorMessage ?? e.detail ?? e.title;
    if (typeof msg === 'string') return msg;
    // Waybill-shaped errors nest the real message under Status[0] instead
    // (confirmed via live sandbox, 2026-08-26): {Status: [{StatusCode, StatusInformation}]}.
    const status = Array.isArray(e.Status) ? (e.Status as unknown[])[0] : undefined;
    if (status && typeof status === 'object') {
      const s = status as Record<string, unknown>;
      if (typeof s.StatusInformation === 'string') {
        return typeof s.StatusCode === 'string' ? `${s.StatusCode}: ${s.StatusInformation}` : s.StatusInformation;
      }
    }
  }
  // ASP.NET Core ValidationProblemDetails shape — common on Apigee-fronted
  // .NET backends: {title, status, errors: {FieldName: ["message", ...]}}.
  // The bare {title} case (e.g. "Bad Request" with no further structure)
  // carries no field-level detail, so prefer this when present.
  if (body.errors && typeof body.errors === 'object') {
    const fieldMessages = Object.entries(body.errors as Record<string, unknown>)
      .map(([field, messages]) => {
        const text = Array.isArray(messages) ? messages.join('; ') : String(messages);
        return `${field}: ${text}`;
      })
      .join(' | ');
    if (fieldMessages) {
      const title = typeof body.title === 'string' ? `${body.title} — ` : '';
      return `${title}${fieldMessages}`;
    }
  }
  if (typeof body.title === 'string') return body.title;
  try {
    const dump = JSON.stringify(body);
    if (dump && dump !== '{}') return dump.length > 500 ? `${dump.slice(0, 500)}…` : dump;
  } catch {
    // not serializable — fall through to undefined
  }
  return undefined;
}

export type BlueDartOperationType = 'read' | 'mutation' | 'auth';

export interface BlueDartRequestOptions<TBody> {
  method: string;
  /** Full base URL for this specific Apigee proxy (Finder/Transit/Product/
   * Master Download/Waybill each have their own) — required, never implicit,
   * since Blue Dart is not a single shared host across API families. */
  baseUrl: string;
  path: string;
  operation: string;
  operationType: BlueDartOperationType;
  body?: TBody;
  responseType?: 'json' | 'arraybuffer';
}

interface HttpClient { request<T>(config: Record<string, unknown>): Promise<{data: T}>; }

const SANDBOX_HOST = 'apigateway-sandbox.bluedart.com';

const sanitizeForDiagnosticLog = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeForDiagnosticLog);
  if (!value || typeof value !== 'object') return value;
  const sensitiveFields = /(LicenceKey|LoginID|JWTToken|Authorization|clientSecret|Address|Name|Telephone|Mobile|Phone|Email)/i;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveFields.test(key) ? '<redacted>' : sanitizeForDiagnosticLog(item),
    ]),
  );
};

const diagnosticJson = (value: unknown): string => {
  try {
    return JSON.stringify(sanitizeForDiagnosticLog(value));
  } catch {
    return '"<unserializable>"';
  }
};

export class BlueDartApiClient {
  constructor(private readonly config: BlueDartConfig, private readonly auth: BlueDartAuthService, private readonly http: HttpClient = axios.create({}) as any) {}

  /**
   * Defense in depth: if BLUEDART_ENV=sandbox, refuse to call anything whose
   * base URL isn't the sandbox host, even if a caller/config mistake supplies
   * a production URL. Never silently "upgrades" a call to production.
   */
  private assertSandboxHostIfSandboxEnv(baseUrl: string, operation: string): void {
    if (this.config.environment !== 'sandbox') return;
    if (!baseUrl.includes(SANDBOX_HOST)) {
      throw new BlueDartProviderError(
        `Refusing to call a non-sandbox host while BLUEDART_ENV=sandbox: ${baseUrl}`,
        {operation},
      );
    }
  }

  async request<TResponse, TBody = never>(options: BlueDartRequestOptions<TBody>): Promise<TResponse> {
    this.assertSandboxHostIfSandboxEnv(options.baseUrl, options.operation);
    const correlationId = randomUUID();
    let authRetried = false;
    let transientRetried = false;
    for (;;) {
      const token = await this.auth.getToken(authRetried);
      const request: Record<string, unknown> = {
        baseURL: options.baseUrl,
        url: options.path,
        method: options.method,
        data: options.body,
        timeout: this.config.requestTimeoutMs,
        responseType: options.responseType || 'json',
        // Confirmed via live gateway test (2026-08-24): the Finder proxy's own
        // CORS Access-Control-Allow-Headers list whitelists a custom `JWTToken`
        // header (alongside clientID/clientSecret), not a standard Authorization
        // bearer scheme. Sending `Authorization: Bearer <token>` returned 401
        // "Access to the method is not allowed"; `JWTToken: <raw token>` passed
        // the gateway and reached the real business logic (400 UserDoesNotExists).
        headers: {JWTToken: token.accessToken, Accept: 'application/json', 'X-Correlation-ID': correlationId},
      };
      try {
        return (await this.http.request<TResponse>(request)).data;
      } catch (error) {
        const clientError = error as any;
        const status = clientError?.response?.status;
        if (process.env.BLUEDART_DEBUG_LOGGING === 'true' && ['createShipment', 'registerPickup'].includes(options.operation)) {
          const responseHeaders = clientError?.response?.headers;
          console.error('[BlueDart API diagnostic]', {
            operation: options.operation,
            method: options.method,
            baseUrl: options.baseUrl,
            path: options.path,
            httpStatus: status,
            correlationId,
            providerCorrelationId: responseHeaders?.['correlation-id'],
            providerRequestId: responseHeaders?.['x-request-id'],
            contentType: responseHeaders?.['content-type'],
            requestBodyJson: diagnosticJson(options.body),
            responseBodyJson: diagnosticJson(clientError?.response?.data),
          });
        }
        if (status === 401 && !authRetried) { authRetried = true; await this.auth.invalidate(); continue; }
        // A 429 applies to the caller/account, so an immediate retry only adds
        // load and extends the throttle. Let the tracking scheduler cool down.
        if (options.operationType === 'read' && !transientRetried && status && [500, 502, 503, 504].includes(status)) { transientRetried = true; continue; }
        if (clientError?.code === 'ECONNABORTED') {
          throw new BlueDartTimeoutError('Blue Dart request timed out', {operation: options.operation, correlationId, retryable: options.operationType === 'read', reconciliationRequired: options.operationType === 'mutation'});
        }
        if (status === 401) throw new BlueDartUnauthorizedError('Blue Dart rejected authorization', {operation: options.operation, httpStatus: status, correlationId});
        if (status === 429) throw new BlueDartRateLimitError('Blue Dart rate limit exceeded', {operation: options.operation, httpStatus: status, correlationId, retryable: options.operationType === 'read'});
        // Internal diagnostic detail only — callers decide what (if anything)
        // is safe to surface to an external client; never forward this payload as-is.
        const providerCode = summarizeProviderErrorBody(clientError?.response?.data);
        const message = status
          ? `Blue Dart request failed (HTTP ${status})${providerCode ? `: ${providerCode}` : ''}`
          : 'Blue Dart provider request failed';
        throw new BlueDartProviderError(message, {operation: options.operation, httpStatus: status, providerCode, correlationId, retryable: options.operationType === 'read' && Boolean(status && status >= 500), reconciliationRequired: options.operationType === 'mutation' && !status});
      }
    }
  }

  get<T>(baseUrl: string, path: string, operation: string) { return this.request<T>({method: 'GET', baseUrl, path, operation, operationType: 'read'}); }
  post<T, B>(baseUrl: string, path: string, body: B, operation: string) { return this.request<T, B>({method: 'POST', baseUrl, path, body, operation, operationType: 'mutation'}); }
  delete<T>(baseUrl: string, path: string, operation: string) { return this.request<T>({method: 'DELETE', baseUrl, path, operation, operationType: 'mutation'}); }
}
