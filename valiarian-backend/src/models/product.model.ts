import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Category} from './category.model';
import {ProductVariant} from './product-variant.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'products',
    },
    indexes: {
      productsSlugIdx: {
        keys: {slug: 1},
        options: {unique: true},
      },
      productsStatusIdx: {
        keys: {status: 1},
      },
      productsIsNewArrivalIdx: {
        keys: {isNewArrival: 1},
      },
      productsIsBestSellerIdx: {
        keys: {isBestSeller: 1},
      },
      productsIsFeaturedIdx: {
        keys: {isFeatured: 1},
      },
      productsCreatedAtIdx: {
        keys: {createdAt: -1},
      },
      productsPriceIdx: {
        keys: {price: 1},
      },
    },
  },
})
export class Product extends Entity {
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

  // Basic Information
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 255,
    },
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      pattern: '^[a-z0-9-]+$',
    },
  })
  slug: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
  })
  shortDescription?: string;

  // Pricing
  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
  })
  price: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
  })
  salePrice?: number;

  @property({
    type: 'date',
  })
  saleStartDate?: Date;

  @property({
    type: 'date',
  })
  saleEndDate?: Date;

  @property({
    type: 'string',
    default: 'INR',
  })
  currency: string;

  // Images
  @property({
    type: 'string',
  })
  coverImage?: string;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  images?: string[];

  // Variants (New System)
  @property({
    type: 'array',
    itemType: 'object',
    default: [],
    postgresql: {
      dataType: 'jsonb',
    },
  })
  variants?: ProductVariant[];

  // Legacy Variants (Kept for backward compatibility)
  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  colors?: string[];

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  sizes?: string[];

  // Inventory
  @property({
    type: 'number',
    default: 0,
  })
  stockQuantity: number;

  @property({
    type: 'boolean',
    default: true,
  })
  trackInventory: boolean;

  @property({
    type: 'number',
    default: 10,
  })
  lowStockThreshold: number;

  @property({
    type: 'boolean',
    default: true,
  })
  inStock: boolean;

  // Labels/Flags
  @property({
    type: 'boolean',
    default: false,
  })
  isNewArrival: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isBestSeller: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isFeatured: boolean;

  @property({
    type: 'date',
  })
  newArrivalStartDate?: Date;

  @property({
    type: 'date',
  })
  newArrivalEndDate?: Date;

  @belongsTo(() => Category, {
    name: 'category',
  })
  categoryId: string;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  tags?: string[];

  // Status
  @property({
    type: 'string',
    required: true,
    default: 'draft',
    jsonSchema: {
      enum: ['draft', 'published', 'archived'],
    },
  })
  status: 'draft' | 'published' | 'archived';

  // SEO
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
    default: [],
  })
  seoKeywords?: string[];

  // Metadata
  @property({
    type: 'string',
  })
  sku?: string;

  @property({
    type: 'number',
    default: 0,
  })
  soldCount: number;

  @property({
    type: 'number',
    default: 0,
  })
  viewCount: number;

  // Timestamps
  

  

  @property({
    type: 'date',
  })
  publishedAt?: Date;

  
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

  constructor(data?: Partial<Product>) {
    super(data);
  }
}

export interface ProductRelations {
  category?: Category;
}

export type ProductWithRelations = Product & ProductRelations;

Object.assign(Product.definition.properties.categoryId ?? {}, {
  type: 'string',
  postgresql: {
    columnName: 'category_id',
    dataType: 'uuid',
  },
});
