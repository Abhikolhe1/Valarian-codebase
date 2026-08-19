import {randomUUID} from 'crypto';

export interface BlueDartErrorOptions {
  operation: string;
  httpStatus?: number;
  providerCode?: string;
  retryable?: boolean;
  reconciliationRequired?: boolean;
  correlationId?: string;
}

export class BlueDartProviderError extends Error {
  readonly operation: string;
  readonly httpStatus?: number;
  readonly providerCode?: string;
  readonly retryable: boolean;
  readonly reconciliationRequired: boolean;
  readonly correlationId: string;

  constructor(message: string, options: BlueDartErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.operation = options.operation;
    this.httpStatus = options.httpStatus;
    this.providerCode = options.providerCode;
    this.retryable = options.retryable ?? false;
    this.reconciliationRequired = options.reconciliationRequired ?? false;
    this.correlationId = options.correlationId ?? randomUUID();
  }
}

export class BlueDartConfigurationError extends BlueDartProviderError {
  constructor(message: string, operation: string) { super(message, {operation}); }
}
export class BlueDartAuthenticationError extends BlueDartProviderError {}
export class BlueDartValidationError extends BlueDartProviderError {}
export class BlueDartUnauthorizedError extends BlueDartProviderError {}
export class BlueDartRateLimitError extends BlueDartProviderError {}
export class BlueDartTimeoutError extends BlueDartProviderError {}
export class BlueDartUnknownCreationStateError extends BlueDartProviderError {}
export class BlueDartUnsupportedOperationError extends BlueDartProviderError {}
export class LabelGenerationNotSupportedError extends BlueDartUnsupportedOperationError {}

const SENSITIVE_KEYS = /authorization|cookie|set-cookie|headers|config|api[_-]?key|api[_-]?secret|access[_-]?token|jwt|client[_-]?secret/i;

export function sanitizeProviderData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeProviderData);
  if (!value || typeof value !== 'object') return typeof value === 'string' && /^Bearer\s/i.test(value) ? '[REDACTED]' : value;
  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    safe[key] = SENSITIVE_KEYS.test(key) ? '[REDACTED]' : sanitizeProviderData(child);
  }
  return safe;
}
