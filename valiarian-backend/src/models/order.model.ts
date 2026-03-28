import {
  belongsTo,
  Entity,
  hasMany,
  hasOne,
  model,
  property,
} from '@loopback/repository';
import {Invoice} from './invoice.model';
import {OrderItemEntity} from './order-item.model';
import {Payment} from './payment.model';
import {Users} from './users.model';

// Order Item Interface
export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  sku: string;
  variantId?: string;
  color?: string;
  colorName?: string;
  size?: string;
  quantity: number;
  originalPrice?: number;
  price: number;
  basePrice?: number;
  gstRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount?: number;
  subtotal: number;
}

// Order Address Interface
export interface OrderAddress {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ReturnRequestImages {
  frontImage: string;
  backImage: string;
  sealImage: string;
  additionalImages?: string[];
}

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'orders',
    },
    indexes: {
      ordersOrderNumberIdx: {
        keys: {orderNumber: 1},
        options: {unique: true},
      },
      ordersUserIdIdx: {
        keys: {userId: 1},
      },
      ordersStatusIdx: {
        keys: {status: 1},
      },
      ordersPaymentStatusIdx: {
        keys: {paymentStatus: 1},
      },
      ordersCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class Order extends Entity {
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
      minLength: 1,
      maxLength: 100,
    },
  })
  orderNumber: string;

  @belongsTo(() => Users, {name: 'user'})
  userId: string;

  // Order Status
  @property({
    type: 'string',
    required: true,
    default: 'pending',
    jsonSchema: {
      enum: [
        'pending',
        'paid',
        'failed',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
        'refunded',
        'parcel_received',
      ],
    },
  })
  status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'confirmed'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'return_requested'
    | 'cancelled'
    | 'returned'
    | 'refunded'
    | 'parcel_received';

  // Payment Information
  @property({
    type: 'string',
    required: true,
    default: 'pending',
    jsonSchema: {
      enum: [
        'created',
        'success',
        'failed',
        'pending',
        'paid',
        'refunded',
        'partially_refunded',
      ],
    },
  })
  paymentStatus:
    | 'created'
    | 'success'
    | 'failed'
    | 'pending'
    | 'paid'
    | 'refunded'
    | 'partially_refunded';

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['razorpay', 'cod', 'wallet'],
    },
  })
  paymentMethod: 'razorpay' | 'cod' | 'wallet';

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

  // Pricing
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
  subtotal: number;

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
  discount: number;

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
  shipping: number;

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
  tax: number;

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
  total: number;

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
  totalAmount?: number;

  @property({
    type: 'string',
    default: 'INR',
  })
  currency: string;

  // Addresses and Items
  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  billingAddress: OrderAddress;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  shippingAddress: OrderAddress;

  @property({
    type: 'array',
    itemType: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  items: OrderItem[];

  @hasMany(() => OrderItemEntity, {keyTo: 'orderId'})
  orderItems?: OrderItemEntity[];

  @hasOne(() => Payment, {keyTo: 'orderId'})
  payment?: Payment;

  @hasOne(() => Invoice, {keyTo: 'orderId'})
  invoice?: Invoice;

  // Shipping/Tracking Information
  @property({
    type: 'string',
  })
  trackingNumber?: string;

  @property({
    type: 'string',
  })
  carrier?: string;

  @property({
    type: 'date',
  })
  estimatedDelivery?: Date;

  @property({
    type: 'date',
  })
  deliveredAt?: Date;

  // Cancellation Information
  @property({
    type: 'date',
  })
  cancelledAt?: Date;

  @property({
    type: 'string',
  })
  cancellationReason?: string;

  // Return Information
  @property({
    type: 'date',
  })
  returnInitiatedAt?: Date;

  @property({
    type: 'date',
  })
  returnApprovedAt?: Date;

  @property({
    type: 'date',
  })
  returnPickedAt?: Date;

  @property({
    type: 'string',
  })
  returnReason?: string;

  @property({
    type: 'string',
  })
  returnComment?: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['requested', 'approved', 'rejected', 'picked', 'completed'],
    },
  })
  returnStatus?: 'requested' | 'approved' | 'rejected' | 'picked' | 'completed';

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  returnImages?: ReturnRequestImages;

  // Refund Information
  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
  })
  refundAmount?: number;

  @property({
    type: 'date',
  })
  refundInitiatedAt?: Date;

  @property({
    type: 'date',
  })
  refundCompletedAt?: Date;

  @property({
    type: 'boolean',
    default: false,
  })
  deliveryChargeDeducted?: boolean;

  @property({
    type: 'number',
    jsonSchema: {
      minimum: 0,
    },
  })
  deliveryChargeDeductionAmount?: number;

  @property({
    type: 'date',
  })
  parcelReceivedAt?: Date;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['original_payment', 'cash'],
    },
  })
  refundMethod?: 'original_payment' | 'cash';

  @property({
    type: 'string',
  })
  refundTransactionId?: string;

  // Notes
  @property({
    type: 'string',
  })
  notes?: string;

  // Timestamps

  // Soft Delete

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

  constructor(data?: Partial<Order>) {
    super(data);
  }
}

export interface OrderRelations {
  user?: Users;
}

export type OrderWithRelations = Order & OrderRelations;
