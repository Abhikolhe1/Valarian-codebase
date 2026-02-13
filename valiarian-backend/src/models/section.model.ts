import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Page} from './page.model';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'sections',
    },
    indexes: {
      pageIdIdx: {
        keys: {pageId: 1},
      },
      orderIdx: {
        keys: {order: 1},
      },
      typeIdx: {
        keys: {type: 1},
      },
    },
  },
})
export class Section extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @belongsTo(() => Page, {name: 'page'})
  pageId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: [
        'hero',
        'features',
        'testimonials',
        'gallery',
        'cta',
        'text',
        'video',
        'faq',
        'team',
        'pricing',
        'contact',
        'custom',
      ],
    },
  })
  type:
    | 'hero'
    | 'features'
    | 'testimonials'
    | 'gallery'
    | 'cta'
    | 'text'
    | 'video'
    | 'faq'
    | 'team'
    | 'pricing'
    | 'contact'
    | 'custom';

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'number',
    required: true,
    default: 0,
  })
  order: number;

  @property({
    type: 'boolean',
    required: true,
    default: true,
  })
  enabled: boolean;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  content: object;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  settings?: object;

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

  constructor(data?: Partial<Section>) {
    super(data);
  }
}

export interface SectionRelations {
  page?: Page;
}

export type SectionWithRelations = Section & SectionRelations;
