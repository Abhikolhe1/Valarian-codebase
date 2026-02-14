import {expect} from '@loopback/testlab';
import {CACHE_KEYS, CacheService} from '../../../services/cache.service';

// Suppress Redis connection errors during tests
const originalConsoleError = console.error;
let suppressRedisErrors = false;

before(() => {
  console.error = (...args: any[]) => {
    if (suppressRedisErrors && args[0]?.includes?.('Redis')) {
      return;
    }
    originalConsoleError(...args);
  };
});

after(() => {
  console.error = originalConsoleError;
});

describe('CacheService (unit)', () => {
  let cacheService: CacheService;
  let isRedisAvailable = false;

  before(async function () {
    this.timeout(10000);
    suppressRedisErrors = true;
    cacheService = new CacheService();
    // Wait for Redis connection attempt
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if Redis is available
    try {
      isRedisAvailable = await cacheService.set('test:connection', 'ok');
      if (isRedisAvailable) {
        await cacheService.delete('test:connection');
      }
    } catch (error) {
      isRedisAvailable = false;
    }

    suppressRedisErrors = false;

    if (!isRedisAvailable) {
      console.log('\n⚠️  Redis is not available. Skipping CacheService tests.');
      console.log('   To run these tests, start Redis server on localhost:6379\n');
      return this.skip();
    }
  });

  after(async function () {
    this.timeout(5000);
    if (isRedisAvailable && cacheService) {
      try {
        await cacheService.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  });

  beforeEach(async function () {
    this.timeout(5000);
    if (!isRedisAvailable) {
      return this.skip();
    }
    // Clear cache before each test
    await cacheService.clear();
  });

  describe('Basic cache operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = {name: 'Test', count: 42};

      const setResult = await cacheService.set(key, value);
      expect(setResult).to.be.true();

      const cachedValue = await cacheService.get(key);
      expect(cachedValue).to.deepEqual(value);
    });

    it('should return null for non-existent key (cache miss)', async () => {
      const result = await cacheService.get('non:existent:key');
      expect(result).to.be.null();
    });

    it('should set value with TTL', async () => {
      const key = 'test:ttl';
      const value = {data: 'expires soon'};

      await cacheService.set(key, value, 2);

      const ttl = await cacheService.ttl(key);
      expect(ttl).to.be.greaterThan(0);
      expect(ttl).to.be.lessThanOrEqual(2);
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      await cacheService.set(key, {data: 'to be deleted'});

      const deleteResult = await cacheService.delete(key);
      expect(deleteResult).to.be.true();

      const cachedValue = await cacheService.get(key);
      expect(cachedValue).to.be.null();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await cacheService.set(key, {data: 'exists'});

      const exists = await cacheService.exists(key);
      expect(exists).to.be.true();

      await cacheService.delete(key);
      const notExists = await cacheService.exists(key);
      expect(notExists).to.be.false();
    });

    it('should delete keys by pattern', async () => {
      await cacheService.set('test:pattern:1', {id: 1});
      await cacheService.set('test:pattern:2', {id: 2});
      await cacheService.set('test:other:3', {id: 3});

      const deletedCount = await cacheService.deletePattern('test:pattern:*');
      expect(deletedCount).to.equal(2);

      const value1 = await cacheService.get('test:pattern:1');
      const value2 = await cacheService.get('test:pattern:2');
      const value3 = await cacheService.get('test:other:3');

      expect(value1).to.be.null();
      expect(value2).to.be.null();
      expect(value3).to.not.be.null();
    });

    it('should clear all cache', async () => {
      await cacheService.set('key1', {data: 1});
      await cacheService.set('key2', {data: 2});

      const clearResult = await cacheService.clear();
      expect(clearResult).to.be.true();

      const value1 = await cacheService.get('key1');
      const value2 = await cacheService.get('key2');

      expect(value1).to.be.null();
      expect(value2).to.be.null();
    });
  });

  describe('TTL expiration', () => {
    it('should expire key after TTL', async function () {
      this.timeout(5000);

      const key = 'test:expire';
      const value = {data: 'will expire'};

      await cacheService.set(key, value, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const cachedValue = await cacheService.get(key);
      expect(cachedValue).to.be.null();
    });

    it('should return correct TTL for key', async () => {
      const key = 'test:ttl:check';
      await cacheService.set(key, {data: 'test'}, 10);

      const ttl = await cacheService.ttl(key);
      expect(ttl).to.be.greaterThan(0);
      expect(ttl).to.be.lessThanOrEqual(10);
    });

    it('should return -2 for non-existent key', async () => {
      const ttl = await cacheService.ttl('non:existent');
      expect(ttl).to.equal(-2);
    });
  });

  describe('CMS-specific cache methods', () => {
    describe('Page caching', () => {
      it('should cache and retrieve page by slug', async () => {
        const page = {
          id: '1',
          slug: 'test-page',
          title: 'Test Page',
          status: 'published',
        };

        const setResult = await cacheService.cachePage('test-page', page);
        expect(setResult).to.be.true();

        const cachedPage = await cacheService.getCachedPage('test-page');
        expect(cachedPage).to.deepEqual(page);
      });

      it('should cache and retrieve page by ID', async () => {
        const page = {
          id: '1',
          slug: 'test-page',
          title: 'Test Page',
        };

        await cacheService.cachePageById('1', page);
        const cachedPage = await cacheService.getCachedPageById('1');
        expect(cachedPage).to.deepEqual(page);
      });

      it('should use correct cache key prefix for pages', async () => {
        const page = {id: '1', slug: 'test'};
        await cacheService.cachePage('test', page);

        const key = `${CACHE_KEYS.PAGE_BY_SLUG}test`;
        const exists = await cacheService.exists(key);
        expect(exists).to.be.true();
      });
    });

    describe('Sections caching', () => {
      it('should cache and retrieve sections', async () => {
        const sections = [
          {id: '1', type: 'hero', order: 1},
          {id: '2', type: 'features', order: 2},
        ];

        await cacheService.cacheSections('page-1', sections);
        const cachedSections = await cacheService.getCachedSections('page-1');
        expect(cachedSections).to.deepEqual(sections);
      });
    });

    describe('Media caching', () => {
      it('should cache and retrieve media', async () => {
        const media = {
          id: '1',
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        };

        await cacheService.cacheMedia('1', media);
        const cachedMedia = await cacheService.getCachedMedia('1');
        expect(cachedMedia).to.deepEqual(media);
      });
    });

    describe('Navigation caching', () => {
      it('should cache and retrieve navigation', async () => {
        const navigation = {
          location: 'header',
          items: [{label: 'Home', url: '/'}],
        };

        await cacheService.cacheNavigation('header', navigation);
        const cachedNav = await cacheService.getCachedNavigation('header');
        expect(cachedNav).to.deepEqual(navigation);
      });
    });

    describe('Settings caching', () => {
      it('should cache and retrieve settings', async () => {
        const settings = {
          siteName: 'Test Site',
          siteDescription: 'A test site',
        };

        await cacheService.cacheSettings(settings);
        const cachedSettings = await cacheService.getCachedSettings();
        expect(cachedSettings).to.deepEqual(settings);
      });
    });

    describe('Published pages caching', () => {
      it('should cache and retrieve published pages list', async () => {
        const pages = [
          {id: '1', slug: 'page-1', status: 'published'},
          {id: '2', slug: 'page-2', status: 'published'},
        ];

        await cacheService.cachePublishedPages(pages);
        const cachedPages = await cacheService.getCachedPublishedPages();
        expect(cachedPages).to.deepEqual(pages);
      });
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate page cache', async () => {
      const page = {id: '1', slug: 'test-page', title: 'Test'};

      await cacheService.cachePage('test-page', page);
      await cacheService.cachePageById('1', page);
      await cacheService.cacheSections('1', [{id: 's1'}]);

      await cacheService.invalidatePage('1', 'test-page');

      const cachedPage = await cacheService.getCachedPage('test-page');
      const cachedPageById = await cacheService.getCachedPageById('1');
      const cachedSections = await cacheService.getCachedSections('1');

      expect(cachedPage).to.be.null();
      expect(cachedPageById).to.be.null();
      expect(cachedSections).to.be.null();
    });

    it('should invalidate sections cache', async () => {
      const sections = [{id: '1', type: 'hero'}];
      await cacheService.cacheSections('page-1', sections);

      await cacheService.invalidateSections('page-1');

      const cachedSections = await cacheService.getCachedSections('page-1');
      expect(cachedSections).to.be.null();
    });

    it('should invalidate media cache', async () => {
      const media = {id: '1', filename: 'test.jpg'};
      await cacheService.cacheMedia('1', media);

      await cacheService.invalidateMedia('1');

      const cachedMedia = await cacheService.getCachedMedia('1');
      expect(cachedMedia).to.be.null();
    });

    it('should invalidate specific navigation cache', async () => {
      await cacheService.cacheNavigation('header', {items: []});
      await cacheService.cacheNavigation('footer', {items: []});

      await cacheService.invalidateNavigation('header');

      const headerNav = await cacheService.getCachedNavigation('header');
      const footerNav = await cacheService.getCachedNavigation('footer');

      expect(headerNav).to.be.null();
      expect(footerNav).to.not.be.null();
    });

    it('should invalidate all navigation caches', async () => {
      await cacheService.cacheNavigation('header', {items: []});
      await cacheService.cacheNavigation('footer', {items: []});

      await cacheService.invalidateNavigation();

      const headerNav = await cacheService.getCachedNavigation('header');
      const footerNav = await cacheService.getCachedNavigation('footer');

      expect(headerNav).to.be.null();
      expect(footerNav).to.be.null();
    });

    it('should invalidate settings cache', async () => {
      await cacheService.cacheSettings({siteName: 'Test'});

      await cacheService.invalidateSettings();

      const cachedSettings = await cacheService.getCachedSettings();
      expect(cachedSettings).to.be.null();
    });

    it('should invalidate all CMS caches', async () => {
      await cacheService.cachePage('test', {id: '1'});
      await cacheService.cacheMedia('1', {filename: 'test.jpg'});
      await cacheService.cacheSettings({siteName: 'Test'});

      await cacheService.invalidateAll();

      const page = await cacheService.getCachedPage('test');
      const media = await cacheService.getCachedMedia('1');
      const settings = await cacheService.getCachedSettings();

      expect(page).to.be.null();
      expect(media).to.be.null();
      expect(settings).to.be.null();
    });
  });

  describe('Cache warming', () => {
    it('should warm cache for published pages', async () => {
      const pages = [
        {
          id: '1',
          slug: 'page-1',
          title: 'Page 1',
          sections: [{id: 's1', type: 'hero'}],
        },
        {
          id: '2',
          slug: 'page-2',
          title: 'Page 2',
          sections: [{id: 's2', type: 'features'}],
        },
      ];

      await cacheService.warmPublishedPages(pages);

      // Verify published pages list is cached
      const cachedList = await cacheService.getCachedPublishedPages();
      expect(cachedList).to.deepEqual(pages);

      // Verify individual pages are cached
      const page1BySlug = await cacheService.getCachedPage('page-1');
      const page1ById = await cacheService.getCachedPageById('1');
      const page2BySlug = await cacheService.getCachedPage('page-2');
      const page2ById = await cacheService.getCachedPageById('2');

      expect(page1BySlug).to.deepEqual(pages[0]);
      expect(page1ById).to.deepEqual(pages[0]);
      expect(page2BySlug).to.deepEqual(pages[1]);
      expect(page2ById).to.deepEqual(pages[1]);

      // Verify sections are cached
      const sections1 = await cacheService.getCachedSections('1');
      const sections2 = await cacheService.getCachedSections('2');

      expect(sections1).to.deepEqual(pages[0].sections);
      expect(sections2).to.deepEqual(pages[1].sections);
    });
  });
});
