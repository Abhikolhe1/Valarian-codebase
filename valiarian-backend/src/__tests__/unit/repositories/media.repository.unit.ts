import {expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../../..';
import {Media} from '../../../models';
import {MediaRepository} from '../../../repositories';
import {setupApplication} from '../../acceptance/test-helper';

describe('MediaRepository (unit)', () => {
  let app: ValiarianBackendApplication;
  let mediaRepository: MediaRepository;

  before('setupApplication', async () => {
    ({app} = await setupApplication());
    mediaRepository = await app.getRepository(MediaRepository);
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await mediaRepository.deleteAll();
  });

  describe('searchMedia', () => {
    it('searches media by filename', async () => {
      await createTestMedia({
        filename: 'hero-image.jpg',
        originalName: 'hero-image.jpg',
      });

      await createTestMedia({
        filename: 'logo.png',
        originalName: 'logo.png',
      });

      const result = await mediaRepository.searchMedia({search: 'hero'});

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('hero-image.jpg');
      expect(result.total).to.equal(1);
    });

    it('searches media by originalName', async () => {
      await createTestMedia({
        filename: 'abc123.jpg',
        originalName: 'my-photo.jpg',
      });

      const result = await mediaRepository.searchMedia({search: 'my-photo'});

      expect(result.data).to.have.length(1);
      expect(result.data[0].originalName).to.equal('my-photo.jpg');
    });

    it('searches media by altText', async () => {
      await createTestMedia({
        filename: 'image.jpg',
        originalName: 'image.jpg',
        altText: 'Beautiful sunset over mountains',
      });

      const result = await mediaRepository.searchMedia({search: 'sunset'});

      expect(result.data).to.have.length(1);
    });

    it('searches media by caption', async () => {
      await createTestMedia({
        filename: 'image.jpg',
        originalName: 'image.jpg',
        caption: 'Team photo from 2024 conference',
      });

      const result = await mediaRepository.searchMedia({search: 'conference'});

      expect(result.data).to.have.length(1);
    });

    it('filters by mimeType', async () => {
      await createTestMedia({
        filename: 'image.jpg',
        originalName: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      await createTestMedia({
        filename: 'video.mp4',
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
      });

      const result = await mediaRepository.searchMedia({mimeType: 'image/'});

      expect(result.data).to.have.length(1);
      expect(result.data[0].mimeType).to.equal('image/jpeg');
    });

    it('filters by folder', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        folder: '/products',
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        folder: '/banners',
      });

      const result = await mediaRepository.searchMedia({folder: '/products'});

      expect(result.data).to.have.length(1);
      expect(result.data[0].folder).to.equal('/products');
    });

    it('filters by tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product', 'featured'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: ['banner', 'seasonal'],
      });

      const result = await mediaRepository.searchMedia({tags: ['featured']});

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('image1.jpg');
    });

    it('filters by multiple tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product', 'featured', 'sale'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: ['product', 'featured'],
      });

      const result = await mediaRepository.searchMedia({
        tags: ['featured', 'sale'],
      });

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('image1.jpg');
    });

    it('combines multiple filters', async () => {
      await createTestMedia({
        filename: 'product-hero.jpg',
        originalName: 'product-hero.jpg',
        mimeType: 'image/jpeg',
        folder: '/products',
        tags: ['featured'],
      });

      await createTestMedia({
        filename: 'banner-hero.jpg',
        originalName: 'banner-hero.jpg',
        mimeType: 'image/jpeg',
        folder: '/banners',
        tags: ['featured'],
      });

      const result = await mediaRepository.searchMedia({
        search: 'hero',
        mimeType: 'image/',
        folder: '/products',
        tags: ['featured'],
      });

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('product-hero.jpg');
    });

    it('supports pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestMedia({
          filename: `image${i}.jpg`,
          originalName: `image${i}.jpg`,
        });
      }

      const result = await mediaRepository.searchMedia({limit: 3});

      expect(result.data).to.have.length(3);
      expect(result.total).to.equal(5);
      expect(result.limit).to.equal(3);
    });

    it('supports pagination with skip', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestMedia({
          filename: `image${i}.jpg`,
          originalName: `image${i}.jpg`,
        });
      }

      const result = await mediaRepository.searchMedia({
        limit: 2,
        skip: 2,
        order: ['filename ASC'],
      });

      expect(result.data).to.have.length(2);
      expect(result.skip).to.equal(2);
      expect(result.data[0].filename).to.equal('image2.jpg');
    });

    it('uses default limit of 20', async () => {
      const result = await mediaRepository.searchMedia({});

      expect(result.limit).to.equal(20);
    });

    it('orders by createdAt DESC by default', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        createdAt: date1,
      });

      await createTestMedia({
        filename: 'image3.jpg',
        originalName: 'image3.jpg',
        createdAt: date3,
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        createdAt: date2,
      });

      const result = await mediaRepository.searchMedia({});

      // Results should be ordered by createdAt DESC
      expect(result.data.length).to.be.greaterThan(0);
      // Check that the first result has the latest date
      const dates = result.data.map(m => m.createdAt?.getTime() || 0);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).to.be.greaterThanOrEqual(dates[i]);
      }
    });

    it('supports custom ordering', async () => {
      await createTestMedia({
        filename: 'zebra.jpg',
        originalName: 'zebra.jpg',
      });

      await createTestMedia({
        filename: 'apple.jpg',
        originalName: 'apple.jpg',
      });

      const result = await mediaRepository.searchMedia({
        order: ['filename ASC'],
      });

      expect(result.data[0].filename).to.equal('apple.jpg');
      expect(result.data[1].filename).to.equal('zebra.jpg');
    });
  });

  describe('findByFolder', () => {
    it('finds media in specific folder', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        folder: '/products',
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        folder: '/banners',
      });

      const result = await mediaRepository.findByFolder('/products');

      expect(result.data).to.have.length(1);
      expect(result.data[0].folder).to.equal('/products');
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestMedia({
          filename: `image${i}.jpg`,
          originalName: `image${i}.jpg`,
          folder: '/products',
        });
      }

      const result = await mediaRepository.findByFolder('/products', 2, 1);

      expect(result.data).to.have.length(2);
      expect(result.skip).to.equal(1);
      expect(result.total).to.equal(5);
    });
  });

  describe('findByMimeType', () => {
    it('finds media by mimeType prefix', async () => {
      await createTestMedia({
        filename: 'image.jpg',
        originalName: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      await createTestMedia({
        filename: 'image.png',
        originalName: 'image.png',
        mimeType: 'image/png',
      });

      await createTestMedia({
        filename: 'video.mp4',
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
      });

      const result = await mediaRepository.findByMimeType('image/');

      expect(result.data).to.have.length(2);
    });

    it('finds media by exact mimeType', async () => {
      await createTestMedia({
        filename: 'image.jpg',
        originalName: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      await createTestMedia({
        filename: 'image.png',
        originalName: 'image.png',
        mimeType: 'image/png',
      });

      const result = await mediaRepository.findByMimeType('image/jpeg');

      expect(result.data).to.have.length(1);
      expect(result.data[0].mimeType).to.equal('image/jpeg');
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestMedia({
          filename: `image${i}.jpg`,
          originalName: `image${i}.jpg`,
          mimeType: 'image/jpeg',
        });
      }

      const result = await mediaRepository.findByMimeType('image/', 3, 0);

      expect(result.data).to.have.length(3);
      expect(result.total).to.equal(5);
    });
  });

  describe('findByTags', () => {
    it('finds media with specified tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product', 'featured'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: ['banner'],
      });

      const result = await mediaRepository.findByTags(['featured']);

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('image1.jpg');
    });

    it('requires all specified tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product', 'featured', 'sale'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: ['product', 'featured'],
      });

      const result = await mediaRepository.findByTags(['featured', 'sale']);

      expect(result.data).to.have.length(1);
      expect(result.data[0].filename).to.equal('image1.jpg');
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestMedia({
          filename: `image${i}.jpg`,
          originalName: `image${i}.jpg`,
          tags: ['featured'],
        });
      }

      const result = await mediaRepository.findByTags(['featured'], 2, 1);

      expect(result.data).to.have.length(2);
      expect(result.skip).to.equal(1);
    });
  });

  describe('getFolders', () => {
    it('returns unique folder paths', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        folder: '/products',
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        folder: '/products',
      });

      await createTestMedia({
        filename: 'image3.jpg',
        originalName: 'image3.jpg',
        folder: '/banners',
      });

      const folders = await mediaRepository.getFolders();

      expect(folders).to.have.length(2);
      expect(folders).to.containEql('/products');
      expect(folders).to.containEql('/banners');
    });

    it('returns sorted folder list', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        folder: '/zebra',
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        folder: '/apple',
      });

      await createTestMedia({
        filename: 'image3.jpg',
        originalName: 'image3.jpg',
        folder: '/banana',
      });

      const folders = await mediaRepository.getFolders();

      expect(folders[0]).to.equal('/apple');
      expect(folders[1]).to.equal('/banana');
      expect(folders[2]).to.equal('/zebra');
    });

    it('returns empty array when no media exists', async () => {
      const folders = await mediaRepository.getFolders();

      expect(folders).to.be.Array();
      expect(folders).to.have.length(0);
    });

    it('excludes undefined folders', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        folder: '/products',
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        folder: '',
      });

      const folders = await mediaRepository.getFolders();

      // Should only include non-empty folders
      expect(folders.length).to.be.greaterThan(0);
      expect(folders).to.containEql('/products');
      // Empty string folders should be excluded
      folders.forEach(folder => {
        expect(folder).to.not.equal('');
      });
    });
  });

  describe('getTags', () => {
    it('returns unique tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product', 'featured'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: ['product', 'sale'],
      });

      await createTestMedia({
        filename: 'image3.jpg',
        originalName: 'image3.jpg',
        tags: ['banner'],
      });

      const tags = await mediaRepository.getTags();

      expect(tags).to.have.length(4);
      expect(tags).to.containEql('product');
      expect(tags).to.containEql('featured');
      expect(tags).to.containEql('sale');
      expect(tags).to.containEql('banner');
    });

    it('returns sorted tag list', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['zebra', 'apple', 'banana'],
      });

      const tags = await mediaRepository.getTags();

      expect(tags[0]).to.equal('apple');
      expect(tags[1]).to.equal('banana');
      expect(tags[2]).to.equal('zebra');
    });

    it('returns empty array when no media exists', async () => {
      const tags = await mediaRepository.getTags();

      expect(tags).to.be.Array();
      expect(tags).to.have.length(0);
    });

    it('handles media without tags', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        tags: ['product'],
      });

      await createTestMedia({
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        tags: undefined,
      });

      const tags = await mediaRepository.getTags();

      expect(tags).to.have.length(1);
      expect(tags[0]).to.equal('product');
    });
  });

  describe('getMediaStats', () => {
    it('returns media count by base mimeType', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
      });

      await createTestMedia({
        filename: 'image2.png',
        originalName: 'image2.png',
        mimeType: 'image/png',
      });

      await createTestMedia({
        filename: 'video1.mp4',
        originalName: 'video1.mp4',
        mimeType: 'video/mp4',
      });

      const stats = await mediaRepository.getMediaStats();

      expect(stats.image).to.equal(2);
      expect(stats.video).to.equal(1);
    });

    it('returns empty object when no media exists', async () => {
      const stats = await mediaRepository.getMediaStats();

      expect(stats).to.be.Object();
      expect(Object.keys(stats)).to.have.length(0);
    });

    it('groups different subtypes under same base type', async () => {
      await createTestMedia({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
      });

      await createTestMedia({
        filename: 'image2.png',
        originalName: 'image2.png',
        mimeType: 'image/png',
      });

      await createTestMedia({
        filename: 'image3.webp',
        originalName: 'image3.webp',
        mimeType: 'image/webp',
      });

      const stats = await mediaRepository.getMediaStats();

      expect(stats.image).to.equal(3);
    });
  });

  // Helper function
  async function createTestMedia(data: Partial<Media>): Promise<Media> {
    return mediaRepository.create({
      id: uuidv4(),
      filename: data.filename || 'test.jpg',
      originalName: data.originalName || 'test.jpg',
      mimeType: data.mimeType || 'image/jpeg',
      size: data.size || 1024,
      url: data.url || 'https://example.com/test.jpg',
      folder: data.folder !== undefined ? data.folder : '/',
      ...data,
    });
  }
});
