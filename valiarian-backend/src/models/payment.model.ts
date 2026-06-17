import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Order} from './order.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'payments',
    },
    indexes: {
      paymentsOrderIdx: {
        keys: {orderId: 1},
        options: {unique: true},
      },
      paymentsRazorpayOrderIdx: {
        keys: {razorpayOrderId: 1},
      },
      paymentsRazorpayPaymentIdx: {
        keys: {razorpayPaymentId: 1},
      },
      paymentsStatusIdx: {
        keys: {status: 1},
      },
    },
  },
})
export class Payment extends Entity {
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

  @property({
    type: 'string',
  })
  razorpayOrderId?: string;

  @property({
    type: 'string',
  })
  razorpayPaymentId?: string;

  @property({
    type: 'string',
  })
  razorpaySignature?: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  amount: number;

  @property({
    type: 'string',
    required: true,
    default: 'created',
    jsonSchema: {
      enum: ['created', 'success', 'failed', 'pending'],
    },
  })
  status: 'created' | 'success' | 'failed' | 'pending';

  @property({
    type: 'string',
    required: true,
    default: 'razorpay',
    jsonSchema: {
      enum: ['razorpay'],
    },
  })
  method: 'razorpay';

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

  constructor(data?: Partial<Payment>) {
    super(data);
  }
}

export interface PaymentRelations {
  order?: Order;
}

export type PaymentWithRelations = Payment & PaymentRelations;
