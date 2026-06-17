import {expect} from '@loopback/testlab';
import {ValiarianBackendApplication} from '../../..';
import {MediaRepository} from '../../../repositories';
import {
  MediaUploadService,
  UploadedFile,
} from '../../../services/media-upload.service';
import {setupApplication} from '../../acceptance/test-helper';

describe('MediaUploadService - Image Processing (unit)', () => {
  let app: ValiarianBackendApplication;
  let mediaUploadService: MediaUploadService;
  let mediaRepository: MediaRepository;

  // Sample image buffer for testing (1x1 red pixel PNG)
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64',
  );

  before('setupApplication', async () => {
    ({app} = await setupApplication());
    mediaRepository = await app.getRepository(MediaRepository);
    mediaUploadService = new MediaUploadService(mediaRepository);
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await mediaRepository.deleteAll();
  });

  describe('extractImageMetadata', () => {
    it('extracts metadata from image buffer', async () => {
      const metadata = await mediaUploadService.extractImageMetadata(
        samplePngBuffer,
      );

      expect(metadata).to.have.properties([
        'width',
        'height',
        'format',
        'size',
        'hasAlpha',
        'space',
      ]);
      expect(metadata.width).to.be.greaterThan(0);
      expect(metadata.height).to.be.greaterThan(0);
      expect(metadata.format).to.be.String();
    });

    it('throws error for invalid image buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.extractImageMetadata(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('generateThumbnail', () => {
    it('generates thumbnail with correct dimensions', async () => {
      const thumbnail = await mediaUploadService.generateThumbnail(
        samplePngBuffer,
      );

      expect(thumbnail).to.have.properties(['buffer', 'width', 'height', 'size']);
      expect(thumbnail.width).to.equal(150);
      expect(thumbnail.height).to.equal(150);
      expect(thumbnail.buffer).to.be.instanceOf(Buffer);
      expect(thumbnail.size).to.be.greaterThan(0);
    });

    it('throws error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.generateThumbnail(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('generateMediumVariant', () => {
    it('generates medium variant with correct max dimensions', async () => {
      const medium = await mediaUploadService.generateMediumVariant(
        samplePngBuffer,
      );

      expect(medium).to.have.properties(['buffer', 'width', 'height', 'size']);
      expect(medium.width).to.be.lessThanOrEqual(800);
      expect(medium.height).to.be.lessThanOrEqual(600);
      expect(medium.buffer).to.be.instanceOf(Buffer);
    });
  });

  describe('generateLargeVariant', () => {
    it('generates large variant with correct max dimensions', async () => {
      const large = await mediaUploadService.generateLargeVariant(
        samplePngBuffer,
      );

      expect(large).to.have.properties(['buffer', 'width', 'height', 'size']);
      expect(large.width).to.be.lessThanOrEqual(1920);
      expect(large.height).to.be.lessThanOrEqual(1080);
      expect(large.buffer).to.be.instanceOf(Buffer);
    });
  });

  describe('convertToWebP', () => {
    it('converts image to WebP format', async () => {
      const webp = await mediaUploadService.convertToWebP(samplePngBuffer);

      expect(webp).to.have.properties(['buffer', 'width', 'height', 'size']);
      expect(webp.buffer).to.be.instanceOf(Buffer);
      expect(webp.size).to.be.greaterThan(0);
    });

    it('throws error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.convertToWebP(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('generateImageVariants', () => {
    it('generates all image variants', async () => {
      const variants = await mediaUploadService.generateImageVariants(
        samplePngBuffer,
      );

      expect(variants).to.have.properties([
        'thumbnail',
        'medium',
        'large',
        'webp',
      ]);

      // Check thumbnail
      expect(variants.thumbnail).to.not.be.undefined();
      expect(variants.thumbnail?.width).to.equal(150);
      expect(variants.thumbnail?.height).to.equal(150);

      // Check medium
      expect(variants.medium).to.not.be.undefined();
      expect(variants.medium?.width).to.be.lessThanOrEqual(800);

      // Check large
      expect(variants.large).to.not.be.undefined();
      expect(variants.large?.width).to.be.lessThanOrEqual(1920);

      // Check webp
      expect(variants.webp).to.not.be.undefined();
      expect(variants.webp?.buffer).to.be.instanceOf(Buffer);
    });

    it('throws error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.generateImageVariants(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('processImage', () => {
    it('processes image and returns metadata and variants', async () => {
      const result = await mediaUploadService.processImage(samplePngBuffer);

      expect(result).to.have.properties(['metadata', 'variants']);

      // Check metadata
      expect(result.metadata).to.have.properties([
        'width',
        'height',
        'format',
        'size',
      ]);

      // Check variants
      expect(result.variants).to.have.properties([
        'thumbnail',
        'medium',
        'large',
        'webp',
      ]);
    });

    it('throws error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.processImage(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('optimizeImage', () => {
    it('optimizes image with default settings', async () => {
      const optimized = await mediaUploadService.optimizeImage(
        samplePngBuffer,
      );

      expect(optimized).to.be.instanceOf(Buffer);
      expect(optimized.length).to.be.greaterThan(0);
    });

    it('optimizes image with custom quality', async () => {
      const optimized = await mediaUploadService.optimizeImage(
        samplePngBuffer,
        {quality: 50},
      );

      expect(optimized).to.be.instanceOf(Buffer);
    });

    it('optimizes image with max dimensions', async () => {
      const optimized = await mediaUploadService.optimizeImage(
        samplePngBuffer,
        {maxWidth: 500, maxHeight: 500},
      );

      expect(optimized).to.be.instanceOf(Buffer);
    });

    it('optimizes image to WebP format', async () => {
      const optimized = await mediaUploadService.optimizeImage(
        samplePngBuffer,
        {format: 'webp'},
      );

      expect(optimized).to.be.instanceOf(Buffer);
    });

    it('throws error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        mediaUploadService.optimizeImage(invalidBuffer),
      ).to.be.rejected();
    });
  });

  describe('Integration with existing validation', () => {
    it('validates and processes image file', async () => {
      const mockFile: UploadedFile = {
        fieldname: 'file',
        originalname: 'test-image.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: samplePngBuffer.length,
        buffer: samplePngBuffer,
      };

      // Validate file
      const validation = mediaUploadService.validateFile(mockFile);
      expect(validation.valid).to.be.true();

      // Process image
      const result = await mediaUploadService.processImage(
        mockFile.buffer!,
      );

      expect(result.metadata).to.not.be.undefined();
      expect(result.variants).to.not.be.undefined();
    });
  });
});

describe('MediaUploadService - File Validation (unit)', () => {
  let app: ValiarianBackendApplication;
  let mediaUploadService: MediaUploadService;
  let mediaRepository: MediaRepository;

  before('setupApplication', async () => {
    ({app} = await setupApplication());
    mediaRepository = await app.getRepository(MediaRepository);
    mediaUploadService = new MediaUploadService(mediaRepository);
  });

  after(async () => {
    await app.stop();
  });

  describe('validateFileType', () => {
    it('accepts valid image types', () => {
      const imageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon',
      ];

      imageTypes.forEach(mimetype => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype,
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileType(file);
        expect(isValid).to.be.true();
      });
    });

    it('accepts valid video types', () => {
      const videoTypes = ['video/mp4', 'video/webm'];

      videoTypes.forEach(mimetype => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: 'test.mp4',
          encoding: '7bit',
          mimetype,
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileType(file);
        expect(isValid).to.be.true();
      });
    });

    it('rejects invalid file types', () => {
      const invalidTypes = [
        'text/plain',
        'application/zip',
        'application/x-executable',
      ];

      invalidTypes.forEach(mimetype => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: 'test.pdf',
          encoding: '7bit',
          mimetype,
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileType(file);
        expect(isValid).to.be.false();
      });
    });
  });

  describe('isTransformableImage', () => {
    it('returns false for ico files', () => {
      expect(mediaUploadService.isTransformableImage('image/x-icon')).to.be.false();
      expect(mediaUploadService.isTransformableImage('image/vnd.microsoft.icon')).to.be.false();
    });

    it('returns true for standard images', () => {
      expect(mediaUploadService.isTransformableImage('image/png')).to.be.true();
    });
  });

  describe('validateFileSize', () => {
    it('accepts images within size limit', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
      };

      const isValid = mediaUploadService.validateFileSize(file);
      expect(isValid).to.be.true();
    });

    it('rejects images exceeding size limit', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB
      };

      const isValid = mediaUploadService.validateFileSize(file);
      expect(isValid).to.be.false();
    });

    it('accepts videos within size limit', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 40 * 1024 * 1024, // 40MB
      };

      const isValid = mediaUploadService.validateFileSize(file);
      expect(isValid).to.be.true();
    });

    it('rejects videos exceeding size limit', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 60 * 1024 * 1024, // 60MB
      };

      const isValid = mediaUploadService.validateFileSize(file);
      expect(isValid).to.be.false();
    });
  });

  describe('validateFileSecurity', () => {
    it('accepts safe filenames', () => {
      const safeFilenames = [
        'image.jpg',
        'my-photo.png',
        'document_2024.pdf',
        'file with spaces.jpg',
      ];

      safeFilenames.forEach(filename => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileSecurity(file);
        expect(isValid).to.be.true();
      });
    });

    it('rejects filenames with null bytes', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'test\0.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1000,
      };

      const isValid = mediaUploadService.validateFileSecurity(file);
      expect(isValid).to.be.false();
    });

    it('rejects path traversal attempts', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'test%2e%2e/file.jpg',
      ];

      maliciousFilenames.forEach(filename => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileSecurity(file);
        expect(isValid).to.be.false();
      });
    });

    it('rejects executable file extensions', () => {
      const dangerousExtensions = [
        'malware.exe',
        'script.bat',
        'hack.sh',
        'virus.com',
        'trojan.scr',
      ];

      dangerousExtensions.forEach(filename => {
        const file: UploadedFile = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
        };

        const isValid = mediaUploadService.validateFileSecurity(file);
        expect(isValid).to.be.false();
      });
    });

    it('validates SVG content for scripts', () => {
      const maliciousSvg = Buffer.from(
        '<svg><script>alert("XSS")</script></svg>',
      );

      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'image.svg',
        encoding: '7bit',
        mimetype: 'image/svg+xml',
        size: maliciousSvg.length,
        buffer: maliciousSvg,
      };

      const isValid = mediaUploadService.validateFileSecurity(file);
      expect(isValid).to.be.false();
    });

    it('validates SVG content for event handlers', () => {
      const maliciousSvg = Buffer.from(
        '<svg onload="alert(1)"><rect /></svg>',
      );

      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'image.svg',
        encoding: '7bit',
        mimetype: 'image/svg+xml',
        size: maliciousSvg.length,
        buffer: maliciousSvg,
      };

      const isValid = mediaUploadService.validateFileSecurity(file);
      expect(isValid).to.be.false();
    });

    it('accepts safe SVG content', () => {
      const safeSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" /></svg>',
      );

      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'image.svg',
        encoding: '7bit',
        mimetype: 'image/svg+xml',
        size: safeSvg.length,
        buffer: safeSvg,
      };

      const isValid = mediaUploadService.validateFileSecurity(file);
      expect(isValid).to.be.true();
    });
  });

  describe('validateFile', () => {
    it('validates complete file successfully', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      };

      const result = mediaUploadService.validateFile(file);

      expect(result.valid).to.be.true();
      expect(result.file).to.equal(file);
      expect(result.error).to.be.undefined();
    });

    it('returns error for missing file', () => {
      const result = mediaUploadService.validateFile(null as any);

      expect(result.valid).to.be.false();
      expect(result.error).to.equal('No file provided');
    });

    it('returns error for invalid file type', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1000,
      };

      const result = mediaUploadService.validateFile(file);

      expect(result.valid).to.be.false();
      expect(result.error).to.containEql('not allowed');
    });

    it('returns error for oversized file', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: 'huge.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
      };

      const result = mediaUploadService.validateFile(file);

      expect(result.valid).to.be.false();
      expect(result.error).to.containEql('exceeds maximum');
    });

    it('returns error for security violation', () => {
      const file: UploadedFile = {
        fieldname: 'file',
        originalname: '../../../etc/passwd',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1000,
      };

      const result = mediaUploadService.validateFile(file);

      expect(result.valid).to.be.false();
      expect(result.error).to.containEql('security validation');
    });
  });

  describe('validateFiles', () => {
    it('validates multiple files successfully', () => {
      const files: UploadedFile[] = [
        {
          fieldname: 'file',
          originalname: 'photo1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
        },
        {
          fieldname: 'file',
          originalname: 'photo2.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 2000,
        },
      ];

      const results = mediaUploadService.validateFiles(files);

      expect(results).to.have.length(2);
      expect(results[0].valid).to.be.true();
      expect(results[1].valid).to.be.true();
    });

    it('identifies invalid files in batch', () => {
      const files: UploadedFile[] = [
        {
          fieldname: 'file',
          originalname: 'photo.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
        },
        {
          fieldname: 'file',
          originalname: 'document.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1000,
        },
      ];

      const results = mediaUploadService.validateFiles(files);

      expect(results).to.have.length(2);
      expect(results[0].valid).to.be.true();
      expect(results[1].valid).to.be.false();
    });
  });

  describe('Helper methods', () => {
    it('getFileExtension extracts extension correctly', () => {
      expect(mediaUploadService.getFileExtension('photo.jpg')).to.equal('jpg');
      expect(mediaUploadService.getFileExtension('document.pdf')).to.equal('pdf');
      expect(mediaUploadService.getFileExtension('archive.tar.gz')).to.equal('gz');
      expect(mediaUploadService.getFileExtension('noextension')).to.equal('');
    });

    it('generateSafeFilename creates safe filenames', () => {
      const filename = mediaUploadService.generateSafeFilename('My Photo!@#.jpg');

      // Should contain timestamp, random string, and sanitized name
      expect(filename).to.match(/^\d+_[a-z0-9]+_My_Photo.*\.jpg$/);
      expect(filename).to.not.containEql('!');
      expect(filename).to.not.containEql('@');
      expect(filename).to.not.containEql('#');
    });

    it('formatFileSize formats bytes correctly', () => {
      expect(mediaUploadService.formatFileSize(0)).to.equal('0 Bytes');
      expect(mediaUploadService.formatFileSize(1024)).to.equal('1 KB');
      expect(mediaUploadService.formatFileSize(1024 * 1024)).to.equal('1 MB');
      expect(mediaUploadService.formatFileSize(1536 * 1024)).to.equal('1.5 MB');
    });

    it('isImage identifies image types correctly', () => {
      expect(mediaUploadService.isImage('image/jpeg')).to.be.true();
      expect(mediaUploadService.isImage('image/png')).to.be.true();
      expect(mediaUploadService.isImage('video/mp4')).to.be.false();
      expect(mediaUploadService.isImage('application/pdf')).to.be.false();
    });

    it('isVideo identifies video types correctly', () => {
      expect(mediaUploadService.isVideo('video/mp4')).to.be.true();
      expect(mediaUploadService.isVideo('video/webm')).to.be.true();
      expect(mediaUploadService.isVideo('image/jpeg')).to.be.false();
      expect(mediaUploadService.isVideo('application/pdf')).to.be.false();
    });
  });
});
