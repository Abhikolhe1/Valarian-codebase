import {Entity, hasMany, model, property} from '@loopback/repository';
import {Category} from './category.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'parent_categories',
    },
    indexes: {
      parentCategoriesSlugIdx: {
        keys: {slug: 1},
        options: {unique: true},
      },
    },
  },
})
export class ParentCategory extends Entity {
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
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  slug: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
  })
  image?: string;

  @hasMany(() => Category, {keyTo: 'parentCategoryId'})
  categories: Category[];

  @property({
    type: 'boolean',
    default: true,
  })
  isActive?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted?: boolean;

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
    type: 'date',
    jsonSchema: {
      nullable: true,
    },
  })
  deletedAt?: Date;

  constructor(data?: Partial<ParentCategory>) {
    super(data);
  }
}

export interface ParentCategoryRelations {
  categories?: Category[];
}

export type ParentCategoryWithRelations = ParentCategory & ParentCategoryRelations;
