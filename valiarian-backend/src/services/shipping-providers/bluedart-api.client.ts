import axios = require('axios');
import {randomUUID} from 'crypto';
import {BlueDartConfig} from '../../config/bluedart.config';
import {BlueDartAuthService} from './bluedart-auth.service';
import {BlueDartProviderError, BlueDartRateLimitError, BlueDartTimeoutError, BlueDartUnauthorizedError} from './bluedart-errors';

export type BlueDartOperationType = 'read' | 'mutation' | 'auth';

export interface BlueDartRequestOptions<TBody> {
  method: string;
  path: string;
  operation: string;
  operationType: BlueDartOperationType;
  body?: TBody;
  responseType?: 'json' | 'arraybuffer';
}

interface HttpClient { request<T>(config: Record<string, unknown>): Promise<{data: T}>; }

export class BlueDartApiClient {
  constructor(private readonly config: BlueDartConfig, private readonly auth: BlueDartAuthService, private readonly http: HttpClient = axios.create({}) as any) {}

  async request<TResponse, TBody = never>(options: BlueDartRequestOptions<TBody>): Promise<TResponse> {
    const correlationId = randomUUID();
    let authRetried = false;
    let transientRetried = false;
    for (;;) {
      const token = await this.auth.getToken(authRetried);
      const request: Record<string, unknown> = {
        baseURL: this.config.baseUrl,
        url: options.path,
        method: options.method,
        data: options.body,
        timeout: this.config.requestTimeoutMs,
        responseType: options.responseType || 'json',
        headers: {Authorization: `${token.tokenType || 'Bearer'} ${token.accessToken}`, 'X-Correlation-ID': correlationId},
      };
      try {
        return (await this.http.request<TResponse>(request)).data;
      } catch (error) {
        const clientError = error as any;
        const status = clientError?.response?.status;
        if (status === 401 && !authRetried) { authRetried = true; await this.auth.invalidate(); continue; }
        if (options.operationType === 'read' && !transientRetried && status && [429, 500, 502, 503, 504].includes(status)) { transientRetried = true; continue; }
        if (clientError?.code === 'ECONNABORTED') {
          throw new BlueDartTimeoutError('Blue Dart request timed out', {operation: options.operation, correlationId, retryable: options.operationType === 'read', reconciliationRequired: options.operationType === 'mutation'});
        }
        if (status === 401) throw new BlueDartUnauthorizedError('Blue Dart rejected authorization', {operation: options.operation, httpStatus: status, correlationId});
        if (status === 429) throw new BlueDartRateLimitError('Blue Dart rate limit exceeded', {operation: options.operation, httpStatus: status, correlationId, retryable: options.operationType === 'read'});
        throw new BlueDartProviderError('Blue Dart provider request failed', {operation: options.operation, httpStatus: status, correlationId, retryable: options.operationType === 'read' && Boolean(status && status >= 500), reconciliationRequired: options.operationType === 'mutation' && !status});
      }
    }
  }

  get<T>(path: string, operation: string) { return this.request<T>({method: 'GET', path, operation, operationType: 'read'}); }
  post<T, B>(path: string, body: B, operation: string) { return this.request<T, B>({method: 'POST', path, body, operation, operationType: 'mutation'}); }
  delete<T>(path: string, operation: string) { return this.request<T>({method: 'DELETE', path, operation, operationType: 'mutation'}); }
}
