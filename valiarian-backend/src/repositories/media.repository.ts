import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository, Filter, Where} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Media, MediaRelations} from '../models';

export interface MediaSearchOptions {
  search?: string;
  mimeType?: string;
  folder?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
  order?: string[];
}

export interface PaginatedMediaResult {
  data: Media[];
  total: number;
  limit: number;
  skip: number;
}

export class MediaRepository extends TimeStampRepositoryMixin<
  Media,
  typeof Media.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Media,
      typeof Media.prototype.id,
      MediaRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Media, dataSource);
  }

  /**
   * Search media with pagination and filtering
   * @param options - Search and filter options
   * @returns Paginated media results
   */
  async searchMedia(options: MediaSearchOptions): Promise<PaginatedMediaResult> {
    const {
      search,
      mimeType,
      folder,
      tags,
      limit = 20,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<Media>[] = [];

    // Search by filename, originalName, altText, or caption
    if (search) {
      andConditions.push({
        or: [
          {filename: {ilike: `%${search}%`}},
          {originalName: {ilike: `%${search}%`}},
          {altText: {ilike: `%${search}%`}},
          {caption: {ilike: `%${search}%`}},
        ],
      });
    }

    // Filter by mimeType
    if (mimeType) {
      andConditions.push({mimeType: {ilike: `${mimeType}%`}});
    }

    // Filter by folder
    if (folder !== undefined) {
      andConditions.push({folder});
    }

    // Filter by tags (media must have all specified tags)
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        // Use a custom query to check if the tag exists in the array
        andConditions.push({
          tags: {like: `%${tag}%`} as any,
        });
      }
    }

    // Build the where clause
    const where: Where<Media> = andConditions.length > 0
      ? {and: andConditions} as any
      : {};

    const filter: Filter<Media> = {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      skip,
      order,
    };

    // Get total count for pagination
    const total = await this.count(filter.where);

    // Get paginated results
    const data = await this.find(filter);

    return {
      data,
      total: total.count,
      limit,
      skip,
    };
  }

  /**
   * Find media by folder with pagination
   * @param folder - The folder path
   * @param limit - Maximum number of results
   * @param skip - Number of results to skip
   * @returns Paginated media results
   */
  async findByFolder(
    folder: string,
    limit = 20,
    skip = 0,
  ): Promise<PaginatedMediaResult> {
    return this.searchMedia({folder, limit, skip});
  }

  /**
   * Find media by mimeType with pagination
   * @param mimeType - The mime type or mime type prefix (e.g., 'image/', 'video/')
   * @param limit - Maximum number of results
   * @param skip - Number of results to skip
   * @returns Paginated media results
   */
  async findByMimeType(
    mimeType: string,
    limit = 20,
    skip = 0,
  ): Promise<PaginatedMediaResult> {
    return this.searchMedia({mimeType, limit, skip});
  }

  /**
   * Find media by tags with pagination
   * @param tags - Array of tags (media must have all specified tags)
   * @param limit - Maximum number of results
   * @param skip - Number of results to skip
   * @returns Paginated media results
   */
  async findByTags(
    tags: string[],
    limit = 20,
    skip = 0,
  ): Promise<PaginatedMediaResult> {
    return this.searchMedia({tags, limit, skip});
  }

  /**
   * Get all unique folders
   * @returns Array of unique folder paths
   */
  async getFolders(): Promise<string[]> {
    const media = await this.find({
      fields: {folder: true},
    });

    const folders = new Set<string>();
    media.forEach(m => {
      if (m.folder) {
        folders.add(m.folder);
      }
    });

    return Array.from(folders).sort();
  }

  /**
   * Get all unique tags
   * @returns Array of unique tags
   */
  async getTags(): Promise<string[]> {
    const media = await this.find({
      fields: {tags: true},
    });

    const tags = new Set<string>();
    media.forEach(m => {
      if (m.tags) {
        m.tags.forEach(tag => tags.add(tag));
      }
    });

    return Array.from(tags).sort();
  }

  /**
   * Get media statistics by mimeType
   * @returns Object with mimeType counts
   */
  async getMediaStats(): Promise<{[mimeType: string]: number}> {
    const media = await this.find({
      fields: {mimeType: true},
    });

    const stats: {[mimeType: string]: number} = {};
    media.forEach(m => {
      const type = m.mimeType.split('/')[0]; // Get base type (image, video, etc.)
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats;
  }
}
