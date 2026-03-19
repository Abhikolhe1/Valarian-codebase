import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {ParentCategory} from './parent-category.model';
import {Product} from './product.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'categories',
    },
    indexes: {
      categoriesSlugIdx: {
        keys: {slug: 1},
        options: {unique: true},
      },
    },
  },
})
export class Category extends Entity {
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

  @belongsTo(() => ParentCategory, {
    name: 'parentCategory',
  })
  parentCategoryId?: string | null;

  @property({
    type: 'string',
    jsonSchema: {
      nullable: true,
    },
  })
  parentId?: string | null;

  @hasMany(() => Product, {keyTo: 'categoryId'})
  products: Product[];

  @property({
    type: 'string',
  })
  description?: string;

  

  

  

  

  

  
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

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {
  parentCategory?: ParentCategory;
  products?: Product[];
}

export type CategoryWithRelations = Category & CategoryRelations;

Object.assign(Category.definition.properties.parentCategoryId ?? {}, {
  type: 'string',
  postgresql: {
    columnName: 'parent_category_id',
    dataType: 'uuid',
  },
  jsonSchema: {
    nullable: true,
  },
});
