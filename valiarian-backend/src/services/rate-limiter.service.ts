import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

interface RateLimitEntry {
  count: number;
  firstAttempt: Date;
  blockedUntil?: Date;
}

@injectable({scope: BindingScope.SINGLETON})
export class RateLimiterService {
  private loginAttempts: Map<string, RateLimitEntry> = new Map();
  private otpRequests: Map<string, RateLimitEntry> = new Map();
  private passwordResetRequests: Map<string, RateLimitEntry> = new Map();
  private bootstrapAttempts: Map<string, RateLimitEntry> = new Map();

  private cap(map: Map<string, RateLimitEntry>): void {
    // Prevent attacker-controlled identifiers/IPs from growing these in-memory
    // maps without bound when the service is exposed to the internet.
    if (map.size < 10000) return;
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }

  /**
   * Check and track login attempts
   * Limit: 5 attempts per 15 minutes per IP
   */
  checkLoginAttempt(ipAddress: string): void {
    this.cap(this.loginAttempts);
    const key = `login:${ipAddress}`;
    const entry = this.loginAttempts.get(key);
    const now = new Date();

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (entry.blockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new HttpErrors.TooManyRequests(
        `Too many login attempts. Please try again in ${remainingMinutes} minute(s).`,
      );
    }

    // Reset if window expired (15 minutes)
    if (entry && now.getTime() - entry.firstAttempt.getTime() > 15 * 60 * 1000) {
      this.loginAttempts.delete(key);
      this.loginAttempts.set(key, {count: 1, firstAttempt: now});
      return;
    }

    // Increment counter
    if (entry) {
      entry.count++;

      // Block after 5 attempts
      if (entry.count >= 5) {
        entry.blockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
        throw new HttpErrors.TooManyRequests(
          'Too many login attempts. Please try again in 15 minutes.',
        );
      }
    } else {
      this.loginAttempts.set(key, {count: 1, firstAttempt: now});
    }
  }

  /**
   * Reset login attempts on successful login
   */
  resetLoginAttempts(ipAddress: string): void {
    const key = `login:${ipAddress}`;
    this.loginAttempts.delete(key);
  }

  /**
   * Check and track OTP requests
   * Limit: 3 requests per hour per identifier (mobile/email)
   */
  checkOtpRequest(identifier: string): void {
    this.cap(this.otpRequests);
    const key = `otp:${identifier}`;
    const entry = this.otpRequests.get(key);
    const now = new Date();

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (entry.blockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new HttpErrors.TooManyRequests(
        `Too many OTP requests. Please try again in ${remainingMinutes} minute(s).`,
      );
    }

    // Reset if window expired (1 hour)
    if (entry && now.getTime() - entry.firstAttempt.getTime() > 60 * 60 * 1000) {
      this.otpRequests.delete(key);
      this.otpRequests.set(key, {count: 1, firstAttempt: now});
      return;
    }

    // Increment counter
    if (entry) {
      entry.count++;

      // Block after 3 attempts
      if (entry.count >= 3) {
        entry.blockedUntil = new Date(now.getTime() + 60 * 60 * 1000);
        throw new HttpErrors.TooManyRequests(
          'Too many OTP requests. Please try again in 1 hour.',
        );
      }
    } else {
      this.otpRequests.set(key, {count: 1, firstAttempt: now});
    }
  }

  /**
   * Check and track password reset requests
   * Limit: 3 requests per hour per identifier
   */
  checkPasswordResetRequest(identifier: string): void {
    this.cap(this.passwordResetRequests);
    const key = `reset:${identifier}`;
    const entry = this.passwordResetRequests.get(key);
    const now = new Date();

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (entry.blockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new HttpErrors.TooManyRequests(
        `Too many password reset requests. Please try again in ${remainingMinutes} minute(s).`,
      );
    }

    // Reset if window expired (1 hour)
    if (entry && now.getTime() - entry.firstAttempt.getTime() > 60 * 60 * 1000) {
      this.passwordResetRequests.delete(key);
      this.passwordResetRequests.set(key, {count: 1, firstAttempt: now});
      return;
    }

    // Increment counter
    if (entry) {
      entry.count++;

      // Block after 3 attempts
      if (entry.count >= 3) {
        entry.blockedUntil = new Date(now.getTime() + 60 * 60 * 1000);
        throw new HttpErrors.TooManyRequests(
          'Too many password reset requests. Please try again in 1 hour.',
        );
      }
    } else {
      this.passwordResetRequests.set(key, {count: 1, firstAttempt: now});
    }
  }

  /** Limit bootstrap-token guesses to 5 attempts per hour per source IP. */
  checkBootstrapAttempt(ipAddress: string): void {
    this.cap(this.bootstrapAttempts);
    const key = `bootstrap:${ipAddress}`;
    const now = new Date();
    const entry = this.bootstrapAttempts.get(key);
    if (entry && now.getTime() - entry.firstAttempt.getTime() <= 60 * 60 * 1000 && entry.count >= 5) {
      throw new HttpErrors.TooManyRequests('Too many bootstrap attempts. Please try again later.');
    }
    if (!entry || now.getTime() - entry.firstAttempt.getTime() > 60 * 60 * 1000) {
      this.bootstrapAttempts.set(key, {count: 1, firstAttempt: now});
      return;
    }
    entry.count++;
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = new Date();

    // Clean login attempts
    for (const [key, entry] of this.loginAttempts.entries()) {
      if (now.getTime() - entry.firstAttempt.getTime() > 15 * 60 * 1000) {
        this.loginAttempts.delete(key);
      }
    }

    // Clean OTP requests
    for (const [key, entry] of this.otpRequests.entries()) {
      if (now.getTime() - entry.firstAttempt.getTime() > 60 * 60 * 1000) {
        this.otpRequests.delete(key);
      }
    }

    // Clean password reset requests
    for (const [key, entry] of this.passwordResetRequests.entries()) {
      if (now.getTime() - entry.firstAttempt.getTime() > 60 * 60 * 1000) {
        this.passwordResetRequests.delete(key);
      }
    }
  }
}
