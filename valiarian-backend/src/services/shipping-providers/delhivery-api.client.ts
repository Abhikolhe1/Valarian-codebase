/* eslint-disable @typescript-eslint/no-explicit-any */
import axios = require('axios');
import {randomUUID} from 'crypto';
import {DelhiveryConfig} from '../../config/delhivery.config';
import {
  DelhiveryAuthenticationError,
  DelhiveryConfigurationError,
  DelhiveryProviderError,
  DelhiveryRateLimitError,
  DelhiveryTimeoutError,
} from './delhivery-errors';

interface HttpClient {
  request<T>(config: Record<string, unknown>): Promise<{data: T}>;
}

export interface DelhiveryRequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  operation: string;
  mutation?: boolean;
  params?: Record<string, unknown>;
  data?: unknown;
  contentType?: string;
  responseType?: 'json' | 'arraybuffer';
  includeTokenQuery?: boolean;
}

function providerMessage(data: unknown): string | undefined {
  if (typeof data === 'string') return data.slice(0, 500);
  if (!data || typeof data !== 'object') return undefined;
  const body = data as Record<string, unknown>;
  for (const key of ['error', 'message', 'rmk', 'remarks', 'detail']) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value.slice(0, 500);
  }
  return undefined;
}

export class DelhiveryApiClient {
  constructor(
    private readonly config: DelhiveryConfig,
    private readonly http: HttpClient = axios.create({}) as unknown as HttpClient,
  ) {}

  async request<T>(options: DelhiveryRequestOptions): Promise<T> {
    if (!this.config.token) {
      throw new DelhiveryConfigurationError(
        'DELHIVERY_API_TOKEN is not configured',
        {operation: options.operation},
      );
    }
    const correlationId = randomUUID();
    try {
      const response = await this.http.request<T>({
        baseURL: this.config.baseUrl,
        url: options.path,
        method: options.method,
        params: options.includeTokenQuery
          ? {...options.params, token: this.config.token}
          : options.params,
        data: options.data,
        timeout: this.config.requestTimeoutMs,
        responseType: options.responseType ?? 'json',
        maxContentLength: 10 * 1024 * 1024,
        maxBodyLength: 10 * 1024 * 1024,
        headers: {
          Accept: 'application/json',
          Authorization: `Token ${this.config.token}`,
          'Content-Type': options.contentType ?? 'application/json',
          'X-Correlation-ID': correlationId,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof DelhiveryProviderError) throw error;
      const clientError = error as any;
      const status = clientError?.response?.status as number | undefined;
      const detail = providerMessage(clientError?.response?.data);
      if (clientError?.code === 'ECONNABORTED') {
        throw new DelhiveryTimeoutError('Delhivery request timed out', {
          operation: options.operation,
          correlationId,
          retryable: !options.mutation,
          reconciliationRequired: Boolean(options.mutation),
        });
      }
      if (status === 401 || status === 403) {
        throw new DelhiveryAuthenticationError(
          'Delhivery rejected the configured API token',
          {operation: options.operation, httpStatus: status, correlationId},
        );
      }
      if (status === 429) {
        throw new DelhiveryRateLimitError('Delhivery rate limit exceeded', {
          operation: options.operation,
          httpStatus: status,
          correlationId,
          retryable: !options.mutation,
        });
      }
      throw new DelhiveryProviderError(
        status
          ? `Delhivery request failed (HTTP ${status})${detail ? `: ${detail}` : ''}`
          : 'Delhivery provider request failed',
        {
          operation: options.operation,
          httpStatus: status,
          providerCode: detail,
          correlationId,
          retryable: !options.mutation && Boolean(status && status >= 500),
          reconciliationRequired: Boolean(options.mutation && !status),
        },
      );
    }
  }
}
