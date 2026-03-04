import {BindingScope, injectable} from '@loopback/core';

interface BlacklistEntry {
  token: string;
  expiresAt: Date;
}

@injectable({scope: BindingScope.SINGLETON})
export class TokenBlacklistService {
  private blacklist: Map<string, BlacklistEntry> = new Map();

  /**
   * Add a token to the blacklist
   * @param token - JWT token to blacklist
   * @param expiresAt - When the token expires (for cleanup)
   */
  addToken(token: string, expiresAt: Date): void {
    this.blacklist.set(token, {
      token,
      expiresAt,
    });
  }

  /**
   * Add multiple tokens to the blacklist (for logout all devices)
   * @param tokens - Array of JWT tokens to blacklist
   * @param expiresAt - When the tokens expire
   */
  addTokens(tokens: string[], expiresAt: Date): void {
    tokens.forEach(token => {
      this.blacklist.set(token, {
        token,
        expiresAt,
      });
    });
  }

  /**
   * Check if a token is blacklisted
   * @param token - JWT token to check
   * @returns true if token is blacklisted
   */
  isBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  /**
   * Clean up expired tokens from blacklist
   * Should be called periodically
   */
  cleanup(): void {
    const now = new Date();
    for (const [token, entry] of this.blacklist.entries()) {
      if (entry.expiresAt < now) {
        this.blacklist.delete(token);
      }
    }
  }

  /**
   * Get the number of blacklisted tokens
   * @returns count of blacklisted tokens
   */
  getCount(): number {
    return this.blacklist.size;
  }
}
