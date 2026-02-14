import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Interface for storage service
 * Allows for different storage implementations (local, S3, etc.)
 */
export interface IStorageService {
  /**
   * Upload a file to storage
   * @param buffer - File buffer
   * @param filename - Filename
   * @param folder - Folder path
   * @returns URL of the uploaded file
   */
  uploadFile(buffer: Buffer, filename: string, folder: string): Promise<string>;

  /**
   * Upload multiple files to storage
   * @param files - Array of file data
   * @returns Array of URLs
   */
  uploadFiles(
    files: Array<{buffer: Buffer; filename: string; folder: string}>,
  ): Promise<string[]>;

  /**
   * Delete a file from storage
   * @param fileUrl - URL or path of the file to delete
   * @returns true if deleted successfully
   */
  deleteFile(fileUrl: string): Promise<boolean>;

  /**
   * Delete multiple files from storage
   * @param fileUrls - Array of URLs or paths
   * @returns Number of files deleted
   */
  deleteFiles(fileUrls: string[]): Promise<number>;

  /**
   * Check if a file exists
   * @param fileUrl - URL or path of the file
   * @returns true if file exists
   */
  fileExists(fileUrl: string): Promise<boolean>;

  /**
   * Get the full URL for a file
   * @param relativePath - Relative path of the file
   * @returns Full URL
   */
  getFileUrl(relativePath: string): string;
}

/**
 * Local filesystem storage service
 * Stores files in the local filesystem
 */
@injectable({scope: BindingScope.TRANSIENT})
export class LocalStorageService implements IStorageService {
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    // Base directory for file storage (relative to project root)
    this.baseDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');

    // Base URL for accessing files
    this.baseUrl = process.env.STORAGE_URL || process.env.API_ENDPOINT || 'http://localhost:3035';

    // Ensure base directory exists
    this.ensureBaseDir();
  }

  /**
   * Ensure the base directory exists
   */
  private async ensureBaseDir(): Promise<void> {
    try {
      await access(this.baseDir);
    } catch {
      await mkdir(this.baseDir, {recursive: true});
    }
  }

  /**
   * Generate organized path with year/month structure
   * @param folder - Base folder (e.g., 'images', 'videos')
   * @returns Organized path like /media/images/2024/01/
   */
  private generateOrganizedPath(folder: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return path.join('media', folder, String(year), month);
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    folder: string = 'images',
  ): Promise<string> {
    try {
      // Generate organized path
      const organizedPath = this.generateOrganizedPath(folder);
      const fullDir = path.join(this.baseDir, organizedPath);

      // Ensure directory exists
      await mkdir(fullDir, {recursive: true});

      // Full file path
      const filePath = path.join(fullDir, filename);

      // Write file
      await writeFile(filePath, buffer);

      // Return relative path (used for URL generation)
      const relativePath = path.join(organizedPath, filename).replace(/\\/g, '/');
      return relativePath;
    } catch (error) {
      throw new HttpErrors.InternalServerError(
        `Failed to upload file: ${error}`,
      );
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Array<{buffer: Buffer; filename: string; folder: string}>,
  ): Promise<string[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file.buffer, file.filename, file.folder),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract relative path from URL
      const relativePath = fileUrl.replace(this.baseUrl, '').replace(/^\//, '');
      const filePath = path.join(this.baseDir, relativePath);

      // Check if file exists
      try {
        await access(filePath);
      } catch {
        // File doesn't exist, consider it deleted
        return true;
      }

      // Delete file
      await unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${fileUrl}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(fileUrls: string[]): Promise<number> {
    const deletePromises = fileUrls.map(url => this.deleteFile(url));
    const results = await Promise.all(deletePromises);

    return results.filter(result => result).length;
  }

  /**
   * Check if file exists
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    try {
      const relativePath = fileUrl.replace(this.baseUrl, '').replace(/^\//, '');
      const filePath = path.join(this.baseDir, relativePath);

      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full URL for a file
   */
  getFileUrl(relativePath: string): string {
    // Ensure path starts with /
    const normalizedPath = relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`;

    return `${this.baseUrl}${normalizedPath}`;
  }
}
