import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Page} from './page.model';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'sections',
    },
    indexes: {
      sectionsPageIdIdx: {
        keys: {pageId: 1},
      },
      sectionsOrderIdx: {
        keys: {order: 1},
      },
      sectionsTypeIdx: {
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
        'premium-hero',
        'premium-product-showcase',
        'premium-fabric-details',
        'premium-statement',
        'premium-feature-grid',
        'premium-confidence',
        'premium-reserve-cta',
        'premium-countdown',
        'hero',
        'scroll-animated',
        'new-arrivals',
        'collection-hero',
        'best-sellers',
        'fabric-info',
        'social-media',
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
    | 'premium-hero'
    | 'premium-product-showcase'
    | 'premium-fabric-details'
    | 'premium-statement'
    | 'premium-feature-grid'
    | 'premium-confidence'
    | 'premium-reserve-cta'
    | 'premium-countdown'
    | 'hero'
    | 'scroll-animated'
    | 'new-arrivals'
    | 'collection-hero'
    | 'best-sellers'
    | 'fabric-info'
    | 'social-media'
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

  constructor(data?: Partial<Section>) {
    super(data);
  }
}

export interface SectionRelations {
  page?: Page;
}

export type SectionWithRelations = Section & SectionRelations;
