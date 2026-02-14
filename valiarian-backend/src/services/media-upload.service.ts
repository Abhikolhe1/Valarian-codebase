import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {Media} from '../models';
import {MediaRepository} from '../repositories';
import {IStorageService, LocalStorageService} from './storage.service';

// Import sharp using require for CommonJS compatibility
const sharp = require('sharp');

/**
 * Allowed file types for upload
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
];

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

/**
 * File size limits (in bytes)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (videos can be larger)

/**
 * Interface for uploaded file information
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
  filename?: string;
}

/**
 * Interface for file validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: UploadedFile;
}

/**
 * Interface for media upload options
 */
export interface MediaUploadOptions {
  folder?: string;
  altText?: string;
  caption?: string;
  tags?: string[];
  uploadedBy?: string;
}

/**
 * Image variant sizes
 */
export const IMAGE_VARIANTS = {
  thumbnail: {width: 150, height: 150},
  medium: {width: 800, height: 600},
  large: {width: 1920, height: 1080},
};

/**
 * Interface for image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  space: string;
}

/**
 * Interface for image variants
 */
export interface ImageVariants {
  thumbnail?: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  medium?: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  large?: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  webp?: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
}

@injectable({scope: BindingScope.TRANSIENT})
export class MediaUploadService {
  constructor(
    @repository(MediaRepository)
    private mediaRepository: MediaRepository,
    @inject('services.StorageService', {optional: true})
    private storageService?: IStorageService,
  ) {
    // Use LocalStorageService as default if no storage service is injected
    if (!this.storageService) {
      this.storageService = new LocalStorageService();
    }
  }

  /**
   * Validate file type
   * @param file - The uploaded file
   * @returns true if file type is allowed
   */
  validateFileType(file: UploadedFile): boolean {
    return ALLOWED_MIME_TYPES.includes(file.mimetype);
  }

  /**
   * Validate file size
   * @param file - The uploaded file
   * @returns true if file size is within limits
   */
  validateFileSize(file: UploadedFile): boolean {
    // Check if it's an image or video
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

    if (isImage) {
      return file.size <= MAX_IMAGE_SIZE;
    } else if (isVideo) {
      return file.size <= MAX_VIDEO_SIZE;
    }

    // Default to general max file size
    return file.size <= MAX_FILE_SIZE;
  }

  /**
   * Check for potentially malicious file content
   * Basic security checks for file uploads
   * @param file - The uploaded file
   * @returns true if file passes security checks
   */
  validateFileSecurity(file: UploadedFile): boolean {
    // Check for null bytes in filename (path traversal attempt)
    if (file.originalname.includes('\0')) {
      return false;
    }

    // Check for path traversal patterns
    const pathTraversalPatterns = ['../', '..\\', '%2e%2e', '%252e%252e'];
    const filename = file.originalname.toLowerCase();
    for (const pattern of pathTraversalPatterns) {
      if (filename.includes(pattern)) {
        return false;
      }
    }

    // Check for executable extensions disguised as images/videos
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.sh',
      '.php',
      '.js',
      '.jar',
      '.app',
      '.dmg',
      '.com',
      '.scr',
      '.vbs',
    ];

    const lowerFilename = file.originalname.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerFilename.endsWith(ext)) {
        return false;
      }
    }

    // For SVG files, check for potentially malicious content
    if (file.mimetype === 'image/svg+xml') {
      return this.validateSVGContent(file);
    }

    return true;
  }

  /**
   * Validate SVG file content for malicious scripts
   * @param file - The uploaded SVG file
   * @returns true if SVG is safe
   */
  validateSVGContent(file: UploadedFile): boolean {
    // If we have buffer content, check for script tags
    if (file.buffer) {
      const content = file.buffer.toString('utf-8').toLowerCase();

      // Check for script tags
      if (content.includes('<script')) {
        return false;
      }

      // Check for event handlers
      const eventHandlers = [
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onmousemove',
        'onmousedown',
        'onmouseup',
      ];

      for (const handler of eventHandlers) {
        if (content.includes(handler)) {
          return false;
        }
      }

      // Check for javascript: protocol
      if (content.includes('javascript:')) {
        return false;
      }

      // Check for data: protocol with script
      if (content.includes('data:') && content.includes('script')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate an uploaded file
   * Performs all validation checks
   * @param file - The uploaded file
   * @returns Validation result with error message if invalid
   */
  validateFile(file: UploadedFile): FileValidationResult {
    // Check if file exists
    if (!file) {
      return {
        valid: false,
        error: 'No file provided',
      };
    }

    // Validate file type
    if (!this.validateFileType(file)) {
      return {
        valid: false,
        error: `File type "${file.mimetype}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      };
    }

    // Validate file size
    if (!this.validateFileSize(file)) {
      const maxSize = ALLOWED_IMAGE_TYPES.includes(file.mimetype)
        ? MAX_IMAGE_SIZE
        : ALLOWED_VIDEO_TYPES.includes(file.mimetype)
          ? MAX_VIDEO_SIZE
          : MAX_FILE_SIZE;

      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`,
      };
    }

    // Validate file security
    if (!this.validateFileSecurity(file)) {
      return {
        valid: false,
        error: 'File failed security validation. The file may contain malicious content.',
      };
    }

    return {
      valid: true,
      file,
    };
  }

  /**
   * Validate multiple files
   * @param files - Array of uploaded files
   * @returns Array of validation results
   */
  validateFiles(files: UploadedFile[]): FileValidationResult[] {
    return files.map(file => this.validateFile(file));
  }

  /**
   * Get file extension from filename
   * @param filename - The filename
   * @returns File extension (e.g., 'jpg', 'png')
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Generate a safe filename
   * @param originalName - Original filename
   * @returns Safe filename with timestamp
   */
  generateSafeFilename(originalName: string): string {
    // Remove any path components
    const basename = originalName.replace(/^.*[\\\/]/, '');

    // Get extension
    const ext = this.getFileExtension(basename);

    // Generate timestamp
    const timestamp = Date.now();

    // Generate random string
    const random = Math.random().toString(36).substring(2, 8);

    // Create safe filename
    const safeName = basename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    return `${timestamp}_${random}_${safeName}`;
  }

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file is an image
   * @param mimetype - File MIME type
   * @returns true if file is an image
   */
  isImage(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype);
  }

  /**
   * Check if file is a video
   * @param mimetype - File MIME type
   * @returns true if file is a video
   */
  isVideo(mimetype: string): boolean {
    return ALLOWED_VIDEO_TYPES.includes(mimetype);
  }

  /**
   * Extract image metadata using Sharp
   * @param buffer - Image buffer
   * @returns Image metadata
   */
  async extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        space: metadata.space || 'unknown',
      };
    } catch (error) {
      throw new HttpErrors.BadRequest(
        `Failed to extract image metadata: ${error}`,
      );
    }
  }

  /**
   * Generate thumbnail variant (150x150)
   * @param buffer - Original image buffer
   * @returns Thumbnail buffer and metadata
   */
  async generateThumbnail(buffer: Buffer): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  }> {
    try {
      const {width, height} = IMAGE_VARIANTS.thumbnail;

      const thumbnailBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({quality: 80})
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();

      return {
        buffer: thumbnailBuffer,
        width: metadata.width || width,
        height: metadata.height || height,
        size: thumbnailBuffer.length,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to generate thumbnail: ${error}`,
      );
    }
  }

  /**
   * Generate medium variant (800x600)
   * @param buffer - Original image buffer
   * @returns Medium variant buffer and metadata
   */
  async generateMediumVariant(buffer: Buffer): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  }> {
    try {
      const {width, height} = IMAGE_VARIANTS.medium;

      const mediumBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({quality: 85})
        .toBuffer();

      const metadata = await sharp(mediumBuffer).metadata();

      return {
        buffer: mediumBuffer,
        width: metadata.width || width,
        height: metadata.height || height,
        size: mediumBuffer.length,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to generate medium variant: ${error}`,
      );
    }
  }

  /**
   * Generate large variant (1920x1080)
   * @param buffer - Original image buffer
   * @returns Large variant buffer and metadata
   */
  async generateLargeVariant(buffer: Buffer): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  }> {
    try {
      const {width, height} = IMAGE_VARIANTS.large;

      const largeBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({quality: 90})
        .toBuffer();

      const metadata = await sharp(largeBuffer).metadata();

      return {
        buffer: largeBuffer,
        width: metadata.width || width,
        height: metadata.height || height,
        size: largeBuffer.length,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to generate large variant: ${error}`,
      );
    }
  }

  /**
   * Convert image to WebP format for better compression
   * @param buffer - Original image buffer
   * @returns WebP buffer and metadata
   */
  async convertToWebP(buffer: Buffer): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  }> {
    try {
      const webpBuffer = await sharp(buffer)
        .webp({quality: 85})
        .toBuffer();

      const metadata = await sharp(webpBuffer).metadata();

      return {
        buffer: webpBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: webpBuffer.length,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to convert to WebP: ${error}`,
      );
    }
  }

  /**
   * Generate all image variants (thumbnail, medium, large, webp)
   * @param buffer - Original image buffer
   * @returns Object containing all variants
   */
  async generateImageVariants(buffer: Buffer): Promise<ImageVariants> {
    try {
      // Generate all variants in parallel for better performance
      const [thumbnail, medium, large, webp] = await Promise.all([
        this.generateThumbnail(buffer),
        this.generateMediumVariant(buffer),
        this.generateLargeVariant(buffer),
        this.convertToWebP(buffer),
      ]);

      return {
        thumbnail,
        medium,
        large,
        webp,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to generate image variants: ${error}`,
      );
    }
  }

  /**
   * Process image: extract metadata and generate variants
   * This method should be called after file validation
   * @param buffer - Image buffer
   * @returns Image metadata and variants
   */
  async processImage(buffer: Buffer): Promise<{
    metadata: ImageMetadata;
    variants: ImageVariants;
  }> {
    try {
      // Extract metadata and generate variants in parallel
      const [metadata, variants] = await Promise.all([
        this.extractImageMetadata(buffer),
        this.generateImageVariants(buffer),
      ]);

      return {
        metadata,
        variants,
      };
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to process image: ${error}`,
      );
    }
  }

  /**
   * Optimize image without generating variants
   * Useful for images that don't need multiple sizes
   * @param buffer - Original image buffer
   * @param options - Optimization options
   * @returns Optimized image buffer
   */
  async optimizeImage(
    buffer: Buffer,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
    },
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      // Resize if max dimensions specified
      if (options?.maxWidth || options?.maxHeight) {
        pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to specified format or keep original
      const format = options?.format || 'jpeg';
      const quality = options?.quality || 85;

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({quality});
          break;
        case 'png':
          pipeline = pipeline.png({quality});
          break;
        case 'webp':
          pipeline = pipeline.webp({quality});
          break;
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to optimize image: ${error}`,
      );
    }
  }

  /**
   * Create a media record in the database
   * Enhanced with image processing support
   * @param file - The validated uploaded file
   * @param url - The URL where the file is stored
   * @param options - Additional media options
   * @param imageData - Optional image metadata and dimensions
   * @returns The created media record
   */
  async createMediaRecord(
    file: UploadedFile,
    url: string,
    options?: MediaUploadOptions,
    imageData?: {
      width?: number;
      height?: number;
      thumbnailUrl?: string;
      mediumUrl?: string;
      largeUrl?: string;
    },
  ): Promise<Media> {
    const now = new Date();
    const safeFilename = this.generateSafeFilename(file.originalname);

    const media = new Media({
      id: uuidv4(),
      filename: safeFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      width: imageData?.width,
      height: imageData?.height,
      url: url,
      thumbnailUrl: imageData?.thumbnailUrl,
      mediumUrl: imageData?.mediumUrl,
      largeUrl: imageData?.largeUrl,
      folder: options?.folder || '/',
      altText: options?.altText,
      caption: options?.caption,
      tags: options?.tags,
      uploadedBy: options?.uploadedBy,
      createdAt: now,
      updatedAt: now,
    });

    return this.mediaRepository.create(media);
  }

  /**
   * Validate and prepare file for upload
   * @param file - The uploaded file
   * @returns Validation result
   * @throws HttpErrors.BadRequest if validation fails
   */
  async validateAndPrepareFile(file: UploadedFile): Promise<UploadedFile> {
    const validation = this.validateFile(file);

    if (!validation.valid) {
      throw new HttpErrors.BadRequest(validation.error);
    }

    return validation.file!;
  }

  /**
   * Validate and prepare multiple files for upload
   * @param files - Array of uploaded files
   * @returns Array of validated files
   * @throws HttpErrors.BadRequest if any validation fails
   */
  async validateAndPrepareFiles(
    files: UploadedFile[],
  ): Promise<UploadedFile[]> {
    const validations = this.validateFiles(files);

    // Check if all files are valid
    const invalidFiles = validations.filter(v => !v.valid);
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map(v => v.error).join('; ');
      throw new HttpErrors.BadRequest(`File validation failed: ${errors}`);
    }

    return validations.map(v => v.file!);
  }

  /**
   * Upload a file with image processing and variant generation
   * This is the main method for uploading media files
   * @param file - The uploaded file
   * @param options - Upload options
   * @returns Created media record with all URLs
   */
  async uploadMedia(
    file: UploadedFile,
    options?: MediaUploadOptions,
  ): Promise<Media> {
    // Validate file
    await this.validateAndPrepareFile(file);

    const isImage = this.isImage(file.mimetype);
    const isVideo = this.isVideo(file.mimetype);

    // Determine folder based on file type
    const folder = isImage ? 'images' : isVideo ? 'videos' : 'files';

    let imageData: {
      width?: number;
      height?: number;
      thumbnailUrl?: string;
      mediumUrl?: string;
      largeUrl?: string;
    } = {};

    // Process images
    if (isImage && file.buffer) {
      // Process image and generate variants
      const {metadata, variants} = await this.processImage(file.buffer);

      // Upload original file
      const originalPath = await this.storageService!.uploadFile(
        file.buffer,
        this.generateSafeFilename(file.originalname),
        folder,
      );

      // Upload variants
      const [thumbnailPath, mediumPath, largePath] = await Promise.all([
        this.storageService!.uploadFile(
          variants.thumbnail!.buffer,
          this.generateSafeFilename(`thumb_${file.originalname}`),
          folder,
        ),
        this.storageService!.uploadFile(
          variants.medium!.buffer,
          this.generateSafeFilename(`medium_${file.originalname}`),
          folder,
        ),
        this.storageService!.uploadFile(
          variants.large!.buffer,
          this.generateSafeFilename(`large_${file.originalname}`),
          folder,
        ),
      ]);

      // Generate URLs
      const originalUrl = this.storageService!.getFileUrl(originalPath);
      const thumbnailUrl = this.storageService!.getFileUrl(thumbnailPath);
      const mediumUrl = this.storageService!.getFileUrl(mediumPath);
      const largeUrl = this.storageService!.getFileUrl(largePath);

      imageData = {
        width: metadata.width,
        height: metadata.height,
        thumbnailUrl,
        mediumUrl,
        largeUrl,
      };

      // Create media record
      return this.createMediaRecord(file, originalUrl, options, imageData);
    }

    // For non-images (videos, etc.), just upload the file
    if (file.buffer) {
      const filePath = await this.storageService!.uploadFile(
        file.buffer,
        this.generateSafeFilename(file.originalname),
        folder,
      );

      const fileUrl = this.storageService!.getFileUrl(filePath);

      return this.createMediaRecord(file, fileUrl, options);
    }

    throw new HttpErrors.BadRequest('File buffer is required');
  }

  /**
   * Upload multiple media files
   * @param files - Array of uploaded files
   * @param options - Upload options (applied to all files)
   * @returns Array of created media records
   */
  async uploadMultipleMedia(
    files: UploadedFile[],
    options?: MediaUploadOptions,
  ): Promise<Media[]> {
    // Validate all files first
    await this.validateAndPrepareFiles(files);

    // Upload files sequentially to avoid overwhelming the system
    const uploadedMedia: Media[] = [];

    for (const file of files) {
      const media = await this.uploadMedia(file, options);
      uploadedMedia.push(media);
    }

    return uploadedMedia;
  }

  /**
   * Delete media and its associated files from storage
   * @param mediaId - ID of the media to delete
   * @returns true if deleted successfully
   */
  async deleteMedia(mediaId: string): Promise<boolean> {
    try {
      // Get media record
      const media = await this.mediaRepository.findById(mediaId);

      // Collect all file URLs to delete
      const urlsToDelete: string[] = [media.url];

      if (media.thumbnailUrl) urlsToDelete.push(media.thumbnailUrl);
      if (media.mediumUrl) urlsToDelete.push(media.mediumUrl);
      if (media.largeUrl) urlsToDelete.push(media.largeUrl);

      // Delete files from storage
      await this.storageService!.deleteFiles(urlsToDelete);

      // Delete media record from database
      await this.mediaRepository.deleteById(mediaId);

      return true;
    } catch (error) {
      console.error(`Failed to delete media ${mediaId}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple media records and their files
   * @param mediaIds - Array of media IDs
   * @returns Number of media records deleted
   */
  async deleteMultipleMedia(mediaIds: string[]): Promise<number> {
    const deletePromises = mediaIds.map(id => this.deleteMedia(id));
    const results = await Promise.all(deletePromises);

    return results.filter(result => result).length;
  }
}

