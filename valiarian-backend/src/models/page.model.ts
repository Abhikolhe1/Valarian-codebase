import {Entity, hasMany, model, property} from '@loopback/repository';
import {ContentVersion} from './content-version.model';
import {Section} from './section.model';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'pages',
    },
    indexes: {
      pagesSlugIdx: {
        keys: {slug: 1},
        options: {unique: true},
      },
      pagesStatusIdx: {
        keys: {status: 1},
      },
      pagesPublishedAtIdx: {
        keys: {publishedAt: -1},
      },
      pagesCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class Page extends Entity {
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
  slug: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
    required: true,
    default: 'draft',
    jsonSchema: {
      enum: ['draft', 'published', 'scheduled', 'archived'],
    },
  })
  status: 'draft' | 'published' | 'scheduled' | 'archived';

  @property({
    type: 'date',
  })
  publishedAt?: Date;

  @property({
    type: 'date',
  })
  scheduledAt?: Date;

  @property({
    type: 'string',
  })
  seoTitle?: string;

  @property({
    type: 'string',
  })
  seoDescription?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  seoKeywords?: string[];

  @property({
    type: 'string',
  })
  ogImage?: string;

  @property({
    type: 'string',
  })
  ogImageAlt?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  structuredData?: object;

  @property({
    type: 'number',
    default: 1,
  })
  version: number;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt?: Date;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'string',
  })
  updatedBy?: string;

  @hasMany(() => Section, {keyTo: 'pageId'})
  sections: Section[];

  @hasMany(() => ContentVersion, {keyTo: 'pageId'})
  versions: ContentVersion[];

  constructor(data?: Partial<Page>) {
    super(data);
  }
}

export interface PageRelations {
  sections?: Section[];
  versions?: ContentVersion[];
}

export type PageWithRelations = Page & PageRelations;
