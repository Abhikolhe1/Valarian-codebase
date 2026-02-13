import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Page} from './page.model';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'content_versions',
    },
    indexes: {
      pageIdIdx: {
        keys: {pageId: 1},
      },
      versionIdx: {
        keys: {version: -1},
      },
      createdAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class ContentVersion extends Entity {
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
    type: 'number',
    required: true,
  })
  version: number;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  content: object;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'string',
  })
  comment?: string;

  constructor(data?: Partial<ContentVersion>) {
    super(data);
  }
}

export interface ContentVersionRelations {
  page?: Page;
}

export type ContentVersionWithRelations = ContentVersion & ContentVersionRelations;
