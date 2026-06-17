import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'media',
    },
    indexes: {
      mediaFilenameIdx: {
        keys: {filename: 1},
      },
      mediaMimeTypeIdx: {
        keys: {mimeType: 1},
      },
      mediaFolderIdx: {
        keys: {folder: 1},
      },
      mediaCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class Media extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  filename: string;

  @property({
    type: 'string',
    required: true,
  })
  originalName: string;

  @property({
    type: 'string',
    required: true,
  })
  mimeType: string;

  @property({
    type: 'number',
    required: true,
  })
  size: number;

  @property({
    type: 'number',
  })
  width?: number;

  @property({
    type: 'number',
  })
  height?: number;

  @property({
    type: 'string',
    required: true,
  })
  url: string;

  @property({
    type: 'string',
  })
  thumbnailUrl?: string;

  @property({
    type: 'string',
  })
  mediumUrl?: string;

  @property({
    type: 'string',
  })
  largeUrl?: string;

  @property({
    type: 'string',
  })
  altText?: string;

  @property({
    type: 'string',
  })
  caption?: string;

  @property({
    type: 'string',
    default: '/',
  })
  folder: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  tags?: string[];

  

  

  @property({
    type: 'string',
  })
  uploadedBy?: string;

  
  @property({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  @property({
    type: 'date',
  })
  deletedAt: Date;

  constructor(data?: Partial<Media>) {
    super(data);
  }
}

export interface MediaRelations {
  // describe navigational properties here
}

export type MediaWithRelations = Media & MediaRelations;
