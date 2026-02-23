import {Entity, model, property} from '@loopback/repository';

// Product Variant Interface
export interface ProductVariant {
  id: string;                    // Unique variant ID (UUID)
  sku: string;                   // Variant-specific SKU
  color: string;                 // Color hex code (e.g., "#000080")
  colorName: string;             // Color display name (e.g., "Navy Blue")
  size: string;                  // Size (S, M, L, XL, etc.)
  images: string[];              // Color-specific images
  price?: number;                // Optional price override
  stockQuantity: number;         // Stock for this specific variant
  inStock: boolean;              // Availability flag
  isDefault: boolean;            // Default variant to show
}

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

  // Categories
  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  categories?: string[];

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
  })
  publishedAt?: Date;

  constructor(data?: Partial<Product>) {
    super(data);
  }
}

export interface ProductRelations {
  // describe navigational properties here
}

export type ProductWithRelations = Product & ProductRelations;
