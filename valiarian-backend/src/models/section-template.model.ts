import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'section_templates',
    },
    indexes: {
      typeIdx: {
        keys: {type: 1},
      },
      nameIdx: {
        keys: {name: 1},
      },
      sectionTemplatesCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class SectionTemplate extends Entity {
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
  name: string;

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
  })
  description?: string;

  @property({
    type: 'string',
  })
  thumbnail?: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  defaultContent: object;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  schema?: object;

  

  @property({
    type: 'string',
  })
  createdBy?: string;

  
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

  constructor(data?: Partial<SectionTemplate>) {
    super(data);
  }
}

export interface SectionTemplateRelations {
  // describe navigational properties here
}

export type SectionTemplateWithRelations = SectionTemplate &
  SectionTemplateRelations;
