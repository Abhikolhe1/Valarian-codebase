import {BindingScope, injectable} from '@loopback/core';
import {createClient, RedisClientType} from 'redis';

/**
 * Cache key prefixes for different content types
 */
export const CACHE_KEYS = {
  PAGE_BY_SLUG: 'cms:page:slug:',
  PAGE_BY_ID: 'cms:page:id:',
  SECTIONS: 'cms:sections:',
  MEDIA: 'cms:media:',
  NAVIGATION: 'cms:navigation:',
  SETTINGS: 'cms:settings',
  PUBLISHED_PAGES: 'cms:pages:published',
};

/**
 * TTL (Time To Live) configurations in seconds
 */
export const CACHE_TTL = {
  PAGE: 3600, // 1 hour
  SECTIONS: 3600, // 1 hour
  MEDIA: 7200, // 2 hours
  NAVIGATION: 86400, // 24 hours
  SETTINGS: 86400, // 24 hours
  PUBLISHED_PAGES: 1800, // 30 minutes
};

/**
 * Cache service for Redis integration
 * Provides caching functionality for CMS content
 */
@injectable({scope: BindingScope.SINGLETON})
export class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Initialize Redis connection
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with timeout
   */
  private async initializeRedis(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const connectionTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '2000', 10);

        this.client = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: connectionTimeout,
            reconnectStrategy: (retries: number) => {
              // Stop reconnecting after 3 attempts
              if (retries > 3) {
                console.log('Redis reconnection attempts exhausted. Running without cache.');
                return false;
              }
              // Exponential backoff with max 3 seconds
              return Math.min(retries * 100, 3000);
            },
          },
        });

        // Error handling
        this.client.on('error', (err: Error) => {
          console.error('Redis Client Error:', err.message);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('Redis Client Connected');
          this.isConnected = true;
        });

        this.client.on('disconnect', () => {
          console.log('Redis Client Disconnected');
          this.isConnected = false;
        });

        // Connect to Redis with timeout
        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Redis connection timeout')), connectionTimeout);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        this.isConnected = true;
        console.log('✓ Cache service initialized with Redis');
      } catch (error) {
        console.warn('⚠ Redis unavailable - running without cache:', (error as Error).message);
        this.isConnected = false;
        this.client = null;
        // Don't throw - allow app to continue without cache
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Ensure Redis is connected
   * Returns immediately if connection failed previously
   */
  private async ensureConnected(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    // If we already tried to connect and failed, don't retry
    if (this.connectionPromise && !this.isConnected) {
      return false;
    }

    try {
      await this.initializeRedis();
      return this.isConnected && this.client !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return null;
      }

      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   * @returns true if successful
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return false;
      }

      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param key - Cache key
   * @returns true if successful
   */
  async delete(key: string): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern - Key pattern (e.g., 'cms:page:*')
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns true if successful
   */
  async clear(): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return false;
      }

      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns true if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      const connected = await this.ensureConnected();
      if (!connected || !this.client) {
        return -2;
      }

      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  // ===== CMS-specific cache methods =====

  /**
   * Cache a page by slug
   */
  async cachePage(slug: string, page: any): Promise<boolean> {
    const key = `${CACHE_KEYS.PAGE_BY_SLUG}${slug}`;
    return this.set(key, page, CACHE_TTL.PAGE);
  }

  /**
   * Get cached page by slug
   */
  async getCachedPage(slug: string): Promise<any | null> {
    const key = `${CACHE_KEYS.PAGE_BY_SLUG}${slug}`;
    return this.get(key);
  }

  /**
   * Cache page by ID
   */
  async cachePageById(id: string, page: any): Promise<boolean> {
    const key = `${CACHE_KEYS.PAGE_BY_ID}${id}`;
    return this.set(key, page, CACHE_TTL.PAGE);
  }

  /**
   * Get cached page by ID
   */
  async getCachedPageById(id: string): Promise<any | null> {
    const key = `${CACHE_KEYS.PAGE_BY_ID}${id}`;
    return this.get(key);
  }

  /**
   * Cache sections for a page
   */
  async cacheSections(pageId: string, sections: any[]): Promise<boolean> {
    const key = `${CACHE_KEYS.SECTIONS}${pageId}`;
    return this.set(key, sections, CACHE_TTL.SECTIONS);
  }

  /**
   * Get cached sections for a page
   */
  async getCachedSections(pageId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.SECTIONS}${pageId}`;
    return this.get(key);
  }

  /**
   * Cache media item
   */
  async cacheMedia(id: string, media: any): Promise<boolean> {
    const key = `${CACHE_KEYS.MEDIA}${id}`;
    return this.set(key, media, CACHE_TTL.MEDIA);
  }

  /**
   * Get cached media item
   */
  async getCachedMedia(id: string): Promise<any | null> {
    const key = `${CACHE_KEYS.MEDIA}${id}`;
    return this.get(key);
  }

  /**
   * Cache navigation menu
   */
  async cacheNavigation(location: string, navigation: any): Promise<boolean> {
    const key = `${CACHE_KEYS.NAVIGATION}${location}`;
    return this.set(key, navigation, CACHE_TTL.NAVIGATION);
  }

  /**
   * Get cached navigation menu
   */
  async getCachedNavigation(location: string): Promise<any | null> {
    const key = `${CACHE_KEYS.NAVIGATION}${location}`;
    return this.get(key);
  }

  /**
   * Cache site settings
   */
  async cacheSettings(settings: any): Promise<boolean> {
    return this.set(CACHE_KEYS.SETTINGS, settings, CACHE_TTL.SETTINGS);
  }

  /**
   * Get cached site settings
   */
  async getCachedSettings(): Promise<any | null> {
    return this.get(CACHE_KEYS.SETTINGS);
  }

  /**
   * Cache published pages list
   */
  async cachePublishedPages(pages: any[]): Promise<boolean> {
    return this.set(CACHE_KEYS.PUBLISHED_PAGES, pages, CACHE_TTL.PUBLISHED_PAGES);
  }

  /**
   * Get cached published pages list
   */
  async getCachedPublishedPages(): Promise<any[] | null> {
    return this.get(CACHE_KEYS.PUBLISHED_PAGES);
  }

  // ===== Cache invalidation methods =====

  /**
   * Invalidate all caches for a page
   */
  async invalidatePage(pageId: string, slug?: string): Promise<void> {
    const promises: Promise<any>[] = [
      this.delete(`${CACHE_KEYS.PAGE_BY_ID}${pageId}`),
      this.delete(`${CACHE_KEYS.SECTIONS}${pageId}`),
    ];

    if (slug) {
      promises.push(this.delete(`${CACHE_KEYS.PAGE_BY_SLUG}${slug}`));
    }

    // Also invalidate published pages list
    promises.push(this.delete(CACHE_KEYS.PUBLISHED_PAGES));

    await Promise.all(promises);
  }

  /**
   * Invalidate sections cache for a page
   */
  async invalidateSections(pageId: string): Promise<void> {
    await this.delete(`${CACHE_KEYS.SECTIONS}${pageId}`);
  }

  /**
   * Invalidate media cache
   */
  async invalidateMedia(id: string): Promise<void> {
    await this.delete(`${CACHE_KEYS.MEDIA}${id}`);
  }

  /**
   * Invalidate navigation cache
   */
  async invalidateNavigation(location?: string): Promise<void> {
    if (location) {
      await this.delete(`${CACHE_KEYS.NAVIGATION}${location}`);
    } else {
      // Invalidate all navigation caches
      await this.deletePattern(`${CACHE_KEYS.NAVIGATION}*`);
    }
  }

  /**
   * Invalidate settings cache
   */
  async invalidateSettings(): Promise<void> {
    await this.delete(CACHE_KEYS.SETTINGS);
  }

  /**
   * Invalidate all CMS caches
   */
  async invalidateAll(): Promise<void> {
    await this.deletePattern('cms:*');
  }

  // ===== Cache warming methods =====

  /**
   * Warm cache for published pages
   * This should be called after publishing a page
   */
  async warmPublishedPages(pages: any[]): Promise<void> {
    // Cache the list of published pages
    await this.cachePublishedPages(pages);

    // Cache individual pages
    const cachePromises = pages.map(page => {
      const promises = [
        this.cachePage(page.slug, page),
        this.cachePageById(page.id, page),
      ];

      // Cache sections if available
      if (page.sections) {
        promises.push(this.cacheSections(page.id, page.sections));
      }

      return Promise.all(promises);
    });

    await Promise.all(cachePromises);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
  }
}
