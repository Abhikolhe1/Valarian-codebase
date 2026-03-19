import {belongsTo, Entity, model, property} from '@loopback/repository';
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
  price: number;
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
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
        'refunded',
      ],
    },
  })
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'refunded';

  // Payment Information
  @property({
    type: 'string',
    required: true,
    default: 'pending',
    jsonSchema: {
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    },
  })
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

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
  })
  subtotal: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      minimum: 0,
    },
  })
  discount: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      minimum: 0,
    },
  })
  shipping: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      minimum: 0,
    },
  })
  tax: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
  })
  total: number;

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
    type: 'string',
  })
  returnReason?: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['requested', 'approved', 'rejected', 'picked', 'completed'],
    },
  })
  returnStatus?: 'requested' | 'approved' | 'rejected' | 'picked' | 'completed';

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
