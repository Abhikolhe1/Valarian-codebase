import {HttpErrors} from '@loopback/rest';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate mobile format (10 digits)
 */
export function validateMobile(mobile: string): boolean {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
}

/**
 * Validate password strength
 * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize UUID string by trimming whitespace and stripping repeated quotes.
 * Handles cases like: "uuid", ""uuid"", 'uuid', etc.
 */
export function sanitizeUuid(value: any): string | null {
  if (!value) {
    return null;
  }

  let sanitized = String(value).trim();

  while (true) {
    const cleaned = sanitized.replace(/^['"]+|['"]+$/g, '').trim();
    if (cleaned === sanitized) {
      break;
    }
    sanitized = cleaned;
  }

  return sanitized || null;
}

/**
 * Validate UUID format (v4)
 */
export function isValidUuid(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize email
 */
export function validateAndSanitizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();

  if (!validateEmail(trimmed)) {
    throw new HttpErrors.BadRequest('Invalid email format');
  }

  return trimmed;
}

/**
 * Validate and sanitize mobile
 */
export function validateAndSanitizeMobile(mobile: string): string {
  const trimmed = mobile.trim().replace(/\s+/g, '');

  if (!validateMobile(trimmed)) {
    throw new HttpErrors.BadRequest(
      'Invalid mobile format. Must be 10 digits.',
    );
  }

  return trimmed;
}

/**
 * Validate and check password strength
 */
export function validateAndCheckPassword(password: string): void {
  const {isValid, errors} = validatePasswordStrength(password);

  if (!isValid) {
    throw new HttpErrors.BadRequest(
      `Password does not meet requirements: ${errors.join(', ')}`,
    );
  }
}

/**
 * Detect if input is email or mobile
 */
export function detectInputType(input: string): 'email' | 'mobile' {
  const trimmed = input.trim();

  if (trimmed.includes('@')) {
    return 'email';
  }

  return 'mobile';
}
