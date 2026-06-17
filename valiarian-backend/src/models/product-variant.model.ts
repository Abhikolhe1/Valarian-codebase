import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Product} from './product.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'product_variants',
    },
    indexes: {
      productVariantsSkuIdx: {
        keys: {sku: 1},
        options: {unique: true},
      },
      productVariantsProductIdIdx: {
        keys: {productId: 1},
      },
    },
  },
})
export class ProductVariant extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @belongsTo(() => Product)
  productId: string;

  @property({
    type: 'string',
    required: true,
  })
  sku: string;

  @property({
    type: 'string',
    required: true,
  })
  color: string;

  @property({
    type: 'string',
    required: true,
  })
  colorName: string;

  @property({
    type: 'string',
    required: true,
  })
  size: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  images?: string[];

  @property({
    type: 'number',
  })
  price?: number;

  @property({
    type: 'number',
    required: true,
    default: 0,
  })
  stockQuantity: number;

  @property({
    type: 'boolean',
    default: true,
  })
  inStock: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDefault: boolean;

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

  constructor(data?: Partial<ProductVariant>) {
    super(data);
  }
}

export interface ProductVariantRelations {
  product?: Product;
}

export type ProductVariantWithRelations = ProductVariant & ProductVariantRelations;

Object.assign(ProductVariant.definition.properties.id ?? {}, {
  type: 'string',
  postgresql: {
    columnName: 'id',
    dataType: 'uuid',
  },
});

Object.assign(ProductVariant.definition.properties.productId ?? {}, {
  type: 'string',
  postgresql: {
    columnName: 'productid',
    dataType: 'text',
  },
});

Object.assign(ProductVariant.definition.properties.colorName ?? {}, {
  type: 'string',
  postgresql: {
    columnName: 'colorname',
  },
});

Object.assign(ProductVariant.definition.properties.stockQuantity ?? {}, {
  type: 'number',
  postgresql: {
    columnName: 'stockquantity',
    dataType: 'integer',
  },
});

Object.assign(ProductVariant.definition.properties.inStock ?? {}, {
  type: 'boolean',
  postgresql: {
    columnName: 'instock',
  },
});

Object.assign(ProductVariant.definition.properties.isDefault ?? {}, {
  type: 'boolean',
  postgresql: {
    columnName: 'isdefault',
  },
});

Object.assign(ProductVariant.definition.properties.isActive ?? {}, {
  type: 'boolean',
  postgresql: {
    columnName: 'isactive',
  },
});

Object.assign(ProductVariant.definition.properties.isDeleted ?? {}, {
  type: 'boolean',
  postgresql: {
    columnName: 'isdeleted',
  },
});

Object.assign(ProductVariant.definition.properties.createdAt ?? {}, {
  type: 'date',
  postgresql: {
    columnName: 'createdat',
  },
});

Object.assign(ProductVariant.definition.properties.updatedAt ?? {}, {
  type: 'date',
  postgresql: {
    columnName: 'updatedat',
  },
});

Object.assign(ProductVariant.definition.properties.deletedAt ?? {}, {
  type: 'date',
  postgresql: {
    columnName: 'deletedat',
  },
});
