import {randomUUID} from 'crypto';

export interface DelhiveryErrorOptions {
  operation: string;
  httpStatus?: number;
  providerCode?: string;
  retryable?: boolean;
  reconciliationRequired?: boolean;
  correlationId?: string;
}

export class DelhiveryProviderError extends Error {
  readonly operation: string;
  readonly httpStatus?: number;
  readonly providerCode?: string;
  readonly retryable: boolean;
  readonly reconciliationRequired: boolean;
  readonly correlationId: string;

  constructor(message: string, options: DelhiveryErrorOptions) {
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

export class DelhiveryConfigurationError extends DelhiveryProviderError {}
export class DelhiveryAuthenticationError extends DelhiveryProviderError {}
export class DelhiveryRateLimitError extends DelhiveryProviderError {}
export class DelhiveryTimeoutError extends DelhiveryProviderError {}
export class DelhiveryValidationError extends DelhiveryProviderError {}
