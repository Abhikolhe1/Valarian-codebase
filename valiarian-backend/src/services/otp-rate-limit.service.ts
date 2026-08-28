import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {createClient, RedisClientType} from 'redis';

interface MemoryCounter {count: number; expiresAt: number}

@injectable({scope: BindingScope.SINGLETON})
export class OtpRateLimitService {
  private client?: RedisClientType;
  private connectPromise?: Promise<boolean>;
  private counters = new Map<string, MemoryCounter>();
  private warnedFallback = false;

  private async connect(): Promise<boolean> {
    if (!process.env.REDIS_URL) return false;
    if (this.client?.isReady) return true;
    if (!this.connectPromise) {
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT ?? 2000)},
      });
      this.client.on('error', error => {
        console.error('[OtpRateLimit] Redis error:', error.message);
      });
      this.connectPromise = this.client.connect().then(() => true).catch(() => false);
    }
    return this.connectPromise;
  }

  private memoryIncrement(key: string, windowSeconds: number): number {
    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || current.expiresAt <= now) {
      this.counters.set(key, {count: 1, expiresAt: now + windowSeconds * 1000});
      return 1;
    }
    current.count += 1;
    return current.count;
  }

  async assertLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
    let count: number;
    try {
      if (!(await this.connect()) || !this.client?.isReady) throw new Error('Redis unavailable');
      count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, windowSeconds);
    } catch {
      if (!this.warnedFallback) {
        console.warn('[OtpRateLimit] Redis unavailable; using single-process fallback. Configure REDIS_URL for distributed enforcement.');
        this.warnedFallback = true;
      }
      count = this.memoryIncrement(key, windowSeconds);
    }
    if (count > limit) throw new HttpErrors.TooManyRequests('Too many requests. Please try again later.');
  }

  async assertCooldown(key: string, seconds: number): Promise<void> {
    try {
      if (!(await this.connect()) || !this.client?.isReady) throw new Error('Redis unavailable');
      const result = await this.client.set(key, '1', {NX: true, EX: seconds});
      if (result !== 'OK') throw new HttpErrors.TooManyRequests('Please wait before requesting another verification code.');
      return;
    } catch (error) {
      if (error instanceof HttpErrors.HttpError) throw error;
    }
    const now = Date.now();
    const existing = this.counters.get(key);
    if (existing && existing.expiresAt > now) {
      throw new HttpErrors.TooManyRequests('Please wait before requesting another verification code.');
    }
    this.counters.set(key, {count: 1, expiresAt: now + seconds * 1000});
  }

  async clearCooldown(key: string): Promise<void> {
    try {if (await this.connect() && this.client?.isReady) await this.client.del(key);} catch {}
    this.counters.delete(key);
  }
}
