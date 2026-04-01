import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Product} from './product.model';
import {Users} from './users.model';

export interface PremiumPreorderAddress {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'premium_preorders',
    },
    indexes: {
      premiumPreordersNumberIdx: {
        keys: {preorderNumber: 1},
        options: {unique: true},
      },
      premiumPreordersUserIdx: {
        keys: {userId: 1},
      },
      premiumPreordersProductIdx: {
        keys: {productId: 1},
      },
      premiumPreordersStatusIdx: {
        keys: {status: 1},
      },
      premiumPreordersPaymentStatusIdx: {
        keys: {paymentStatus: 1},
      },
      premiumPreordersCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class PremiumPreorder extends Entity {
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
  preorderNumber: string;

  @belongsTo(() => Users, {name: 'user'})
  userId: string;

  @belongsTo(() => Product, {name: 'product'})
  productId: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  productSnapshot: object;

  @property({
    type: 'string',
  })
  selectedVariantId?: string;

  @property({
    type: 'string',
  })
  selectedSize?: string;

  @property({
    type: 'number',
    default: 1,
  })
  quantity: number;

  @property({
    type: 'string',
    required: true,
    default: 'initiated',
    jsonSchema: {
      enum: [
        'initiated',
        'paid',
        'payment_failed',
        'reserved',
        'ready_to_fulfill',
        'fulfilled',
        'cancelled',
        'refunded',
      ],
    },
  })
  status:
    | 'initiated'
    | 'paid'
    | 'payment_failed'
    | 'reserved'
    | 'ready_to_fulfill'
    | 'fulfilled'
    | 'cancelled'
    | 'refunded';

  @property({
    type: 'string',
    required: true,
    default: 'created',
    jsonSchema: {
      enum: ['created', 'paid', 'failed', 'pending', 'refunded'],
    },
  })
  paymentStatus: 'created' | 'paid' | 'failed' | 'pending' | 'refunded';

  @property({
    type: 'string',
    required: true,
    default: 'razorpay',
    jsonSchema: {
      enum: ['razorpay'],
    },
  })
  paymentMethod: 'razorpay';

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
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  subtotal: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  discount: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  shipping: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  tax: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  total: number;

  @property({
    type: 'string',
    default: 'INR',
  })
  currency: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  billingAddress: PremiumPreorderAddress;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  shippingAddress: PremiumPreorderAddress;

  @property({
    type: 'string',
  })
  notes?: string;

  @property({
    type: 'date',
  })
  expectedDispatchDate?: Date;

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
  deletedAt?: Date;

  constructor(data?: Partial<PremiumPreorder>) {
    super(data);
  }
}

export interface PremiumPreorderRelations {
  user?: Users;
  product?: Product;
}

export type PremiumPreorderWithRelations = PremiumPreorder &
  PremiumPreorderRelations;
