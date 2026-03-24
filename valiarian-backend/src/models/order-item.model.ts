import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Order} from './order.model';
import {Product} from './product.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'order_items',
    },
    indexes: {
      orderItemsOrderIdx: {
        keys: {orderId: 1},
      },
      orderItemsProductIdx: {
        keys: {productId: 1},
      },
    },
  },
})
export class OrderItemEntity extends Entity {
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

  @belongsTo(() => Order, {name: 'order'})
  orderId: string;

  @belongsTo(() => Product, {name: 'product'})
  productId: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 1,
    },
  })
  quantity: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
  })
  price: number;

  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  sku?: string;

  @property({
    type: 'string',
  })
  image?: string;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
  })
  subtotal?: number;

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

  constructor(data?: Partial<OrderItemEntity>) {
    super(data);
  }
}

export interface OrderItemEntityRelations {
  order?: Order;
  product?: Product;
}

export type OrderItemWithRelations = OrderItemEntity & OrderItemEntityRelations;
