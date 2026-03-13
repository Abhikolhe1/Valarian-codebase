import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Product} from './product.model';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'cart_items'},
  },
})
export class CartItems extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      columnName: 'id',
      dataType: 'uuid',
    },
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'cart_id',
      dataType: 'uuid',
    },
  })
  cartId: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'product_id',
      dataType: 'uuid',
    },
  })
  productId: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'variant_id',
      dataType: 'uuid',
    },
  })
  variantId?: string;

  @property({
    type: 'number',
    required: true,
    default: 1,
    postgresql: {
      columnName: 'quantity',
      dataType: 'integer',
    },
  })
  quantity: number;

  @property({
    type: 'date',
    default: () => new Date(),
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    },
  })
  createdAt?: Date;

  @property({
    type: 'date',
    default: () => new Date(),
    postgresql: {
      columnName: 'updated_at',
      dataType: 'timestamp with time zone',
    },
  })
  updatedAt?: Date;

  @belongsTo(() => Product, {name: 'product'})
  product: Product;

  constructor(data?: Partial<CartItems>) {
    super(data);
  }
}

export interface CartItemsRelations {
  product?: Product;
}

export type CartItemsWithRelations = CartItems & CartItemsRelations;
