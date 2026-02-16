import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  Request,
  requestBody,
  Response,
  response,
  RestBindings
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {Media} from '../models';
import {MediaRepository} from '../repositories';
import {MediaUploadService, UploadedFile} from '../services/media-upload.service';

export class CMSMediaController {
  constructor(
    @repository(MediaRepository)
    public mediaRepository: MediaRepository,
    @inject('services.MediaUploadService')
    public mediaUploadService: MediaUploadService,
  ) { }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/media')
  @response(200, {
    description: 'Array of Media model instances with pagination',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: getModelSchemaRef(Media),
            },
            total: {type: 'number'},
            page: {type: 'number'},
            pageSize: {type: 'number'},
          },
        },
      },
    },
  })
  async find(
    @param.filter(Media) filter?: Filter<Media>,
    @param.query.string('folder') folder?: string,
    @param.query.string('mimeType') mimeType?: string,
    @param.query.string('search') search?: string,
    @param.query.number('page') page: number = 1,
    @param.query.number('pageSize') pageSize: number = 20,
  ): Promise<{
    data: Media[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = filter?.where || {};

    // Filter by folder
    if (folder) {
      where.folder = folder;
    }

    // Filter by mimeType
    if (mimeType) {
      where.mimeType = {like: `${mimeType}%`};
    }

    // Search by filename or originalName
    if (search) {
      where.or = [
        {filename: {like: `%${search}%`, options: 'i'}},
        {originalName: {like: `%${search}%`, options: 'i'}},
        {altText: {like: `%${search}%`, options: 'i'}},
        {caption: {like: `%${search}%`, options: 'i'}},
      ];
    }

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const finalFilter: Filter<Media> = {
      ...filter,
      where,
      skip,
      limit,
      order: filter?.order || ['createdAt DESC'],
    };

    const total = await this.mediaRepository.count(where);
    const media = await this.mediaRepository.find(finalFilter);

    return {
      data: media,
      total: total.count,
      page,
      pageSize,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/media/{id}')
  @response(200, {
    description: 'Media model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Media),
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Media> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new HttpErrors.NotFound(`Media with id "${id}" not found`);
    }
    return media;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/media/upload')
  @response(201, {
    description: 'Media file uploaded successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {type: 'boolean'},
            message: {type: 'string'},
            media: getModelSchemaRef(Media),
          },
        },
      },
    },
  })
  async upload(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody.file()
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<{success: boolean; message: string; media: Media}> {
    return new Promise((resolve, reject) => {
      const multer = require('multer');
      const storage = multer.memoryStorage();
      const upload = multer({storage}).single('file');

      upload(request, response, async (err: any) => {
        if (err) {
          return reject(
            new HttpErrors.InternalServerError(`Upload failed: ${err.message}`),
          );
        }

        try {
          const file = (request as any).file as Express.Multer.File;

          if (!file) {
            return reject(new HttpErrors.BadRequest('No file provided'));
          }

          // Convert Express.Multer.File to UploadedFile
          const uploadedFile: UploadedFile = {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          };

          // Get optional metadata from request body
          const body = (request as any).body || {};
          const options = {
            folder: body.folder || '/',
            altText: body.altText,
            caption: body.caption,
            tags: body.tags ? JSON.parse(body.tags) : undefined,
            uploadedBy: currentUser.id,
          };

          // Upload media with processing
          const media = await this.mediaUploadService.uploadMedia(
            uploadedFile,
            options,
          );

          resolve({
            success: true,
            message: 'File uploaded successfully',
            media,
          });
        } catch (error) {
          reject(
            new HttpErrors.BadRequest(
              error instanceof Error
                ? error.message
                : 'Failed to upload file',
            ),
          );
        }
      });
    });
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/cms/media/{id}')
  @response(200, {
    description: 'Media metadata updated',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Media),
      },
    },
  })
  async updateById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              altText: {type: 'string'},
              caption: {type: 'string'},
              folder: {type: 'string'},
              tags: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    })
    mediaData: Partial<Media>,
  ): Promise<Media> {
    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new HttpErrors.NotFound(`Media with id "${id}" not found`);
    }

    const now = new Date();
    await this.mediaRepository.updateById(id, {
      ...mediaData,
      updatedAt: now,
    });

    return this.mediaRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @del('/api/cms/media/{id}')
  @response(204, {
    description: 'Media DELETE success',
  })
  async deleteById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new HttpErrors.NotFound(`Media with id "${id}" not found`);
    }

    // Delete media and associated files
    const deleted = await this.mediaUploadService.deleteMedia(id);

    if (!deleted) {
      throw new HttpErrors.InternalServerError(
        'Failed to delete media files',
      );
    }
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/media/bulk-delete')
  @response(200, {
    description: 'Bulk delete media',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {type: 'boolean'},
            message: {type: 'string'},
            deleted: {type: 'number'},
          },
        },
      },
    },
  })
  async bulkDelete(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['mediaIds'],
            properties: {
              mediaIds: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    })
    body: {mediaIds: string[]},
  ): Promise<{success: boolean; message: string; deleted: number}> {
    if (!body.mediaIds || body.mediaIds.length === 0) {
      throw new HttpErrors.BadRequest('No media IDs provided');
    }

    const deleted = await this.mediaUploadService.deleteMultipleMedia(
      body.mediaIds,
    );

    return {
      success: true,
      message: `Successfully deleted ${deleted} media files`,
      deleted,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/media/folders/list')
  @response(200, {
    description: 'List of unique folders',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {type: 'string'},
        },
      },
    },
  })
  async listFolders(): Promise<string[]> {
    // Get distinct folders from media
    const media = await this.mediaRepository.find({
      fields: {folder: true},
    });

    // Extract unique folders
    const folders = new Set<string>();
    media.forEach(m => {
      if (m.folder) {
        folders.add(m.folder);
      }
    });

    return Array.from(folders).sort();
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/media/stats')
  @response(200, {
    description: 'Media library statistics',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            totalFiles: {type: 'number'},
            totalSize: {type: 'number'},
            totalSizeFormatted: {type: 'string'},
            byType: {
              type: 'object',
              properties: {
                images: {type: 'number'},
                videos: {type: 'number'},
                others: {type: 'number'},
              },
            },
            byFolder: {
              type: 'object',
              additionalProperties: {type: 'number'},
            },
          },
        },
      },
    },
  })
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    byType: {images: number; videos: number; others: number};
    byFolder: {[key: string]: number};
  }> {
    const allMedia = await this.mediaRepository.find();

    const totalFiles = allMedia.length;
    const totalSize = allMedia.reduce((sum, m) => sum + (m.size || 0), 0);

    // Count by type
    const byType = {
      images: 0,
      videos: 0,
      others: 0,
    };

    allMedia.forEach(m => {
      if (m.mimeType.startsWith('image/')) {
        byType.images++;
      } else if (m.mimeType.startsWith('video/')) {
        byType.videos++;
      } else {
        byType.others++;
      }
    });

    // Count by folder
    const byFolder: {[key: string]: number} = {};
    allMedia.forEach(m => {
      const folder = m.folder || '/';
      byFolder[folder] = (byFolder[folder] || 0) + 1;
    });

    return {
      totalFiles,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
      byType,
      byFolder,
    };
  }

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
