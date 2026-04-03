import {Entity, model, property} from '@loopback/repository';

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponPaymentMethod = 'razorpay' | 'cod' | 'wallet';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'coupons',
    },
    indexes: {
      couponsCodeIdx: {
        keys: {code: 1},
        options: {unique: true},
      },
      couponsIsActiveIdx: {
        keys: {isActive: 1},
      },
      couponsCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class Coupon extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 2,
      maxLength: 50,
    },
  })
  code: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 2,
      maxLength: 120,
    },
  })
  title: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['percentage', 'fixed'],
    },
  })
  discountType: CouponDiscountType;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0.01,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  discountValue: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  maxDiscountAmount?: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  minOrderAmount?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 1,
    },
  })
  totalUsageLimit?: number;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 1,
    },
  })
  perUserUsageLimit?: number;

  @property({
    type: 'boolean',
    default: false,
  })
  isFirstOrderOnly?: boolean;

  @property({
    type: 'array',
    itemType: 'string',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  applicablePaymentMethods?: CouponPaymentMethod[];

  @property({
    type: 'date',
  })
  startsAt?: Date;

  @property({
    type: 'date',
  })
  endsAt?: Date;

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

  constructor(data?: Partial<Coupon>) {
    super(data);
  }
}

export interface CouponRelations {}

export type CouponWithRelations = Coupon & CouponRelations;
