import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'about_pages',
    },
    indexes: {
      aboutPagesSlugIdx: {
        keys: {slug: 1},
        options: {unique: true},
      },
    },
  },
})
export class AboutPage extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    default: 'about-us',
  })
  slug: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: {},
  })
  hero?: Record<string, unknown>;

  @property({
    type: 'array',
    itemType: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: [],
  })
  stories?: Record<string, unknown>[];

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: {},
  })
  thoughts?: Record<string, unknown>;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: {},
  })
  values?: Record<string, unknown>;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: {},
  })
  team?: Record<string, unknown>;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
    default: {},
  })
  seo?: Record<string, unknown>;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive?: boolean;

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

  constructor(data?: Partial<AboutPage>) {
    super(data);
  }
}

export interface AboutPageRelations {}

export type AboutPageWithRelations = AboutPage & AboutPageRelations;
