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
      columnName: 'id',
      dataType: 'uuid',
    },
  })
  id: string;

  @belongsTo(() => Order, {
    name: 'order',
    keyFrom: 'orderId',
    keyTo: 'id',
  }, {
    postgresql: {
      columnName: 'orderid',
      dataType: 'text',
    },
  })
  orderId: string;

  @belongsTo(() => Product, {
    name: 'product',
    keyFrom: 'productId',
    keyTo: 'id',
  }, {
    postgresql: {
      columnName: 'productid',
      dataType: 'text',
    },
  })
  productId: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 1,
    },
    postgresql: {
      columnName: 'quantity',
      dataType: 'integer',
    },
  })
  quantity: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'price',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  price: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'baseprice',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  basePrice?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'gstrate',
      dataType: 'decimal',
      precision: 5,
      scale: 2,
    },
  })
  gstRate?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'cgstrate',
      dataType: 'decimal',
      precision: 5,
      scale: 2,
    },
  })
  cgstRate?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'sgstrate',
      dataType: 'decimal',
      precision: 5,
      scale: 2,
    },
  })
  sgstRate?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'igstrate',
      dataType: 'decimal',
      precision: 5,
      scale: 2,
    },
  })
  igstRate?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'cgstamount',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  cgstAmount?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'sgstamount',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  sgstAmount?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'igstamount',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  igstAmount?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'totalamount',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  totalAmount?: number;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'name',
    },
  })
  name?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'sku',
    },
  })
  sku?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'image',
    },
  })
  image?: string;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      columnName: 'subtotal',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  subtotal?: number;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {
      columnName: 'createdat',
    },
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {
      columnName: 'updatedat',
    },
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
