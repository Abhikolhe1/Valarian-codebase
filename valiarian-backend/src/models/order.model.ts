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
import {Shipment} from './shipment.model';

// Order Item Interface
export interface OrderItem {
  id: string;
  productId: string;
  orderItemId?: string;
  name: string;
  image: string;
  sku: string;
  slug?: string;
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
  productNameSnapshot?: string;
  variantSnapshot?: {
    variantId?: string;
    sku?: string;
    color?: string;
    colorName?: string;
    size?: string;
    attributes?: {[key: string]: string | number | boolean | null | undefined};
  };
  priceSnapshot?: number;
  barcodeId?: string;
  barcodeCode?: string;
  barcodeImageUrl?: string;
  barcodeStatus?: string;
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

export interface OrderCouponSnapshot {
  id: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
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
        'out_for_delivery',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
        'refunded',
        'parcel_received',
        'rto_initiated',
        'rto_in_transit',
        'rto_delivered',
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
    | 'out_for_delivery'
    | 'delivered'
    | 'return_requested'
    | 'cancelled'
    | 'returned'
    | 'refunded'
    | 'parcel_received'
    | 'rto_initiated'
    | 'rto_in_transit'
    | 'rto_delivered';

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
    type: 'string',
  })
  couponId?: string;

  @property({
    type: 'string',
  })
  couponCode?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  couponSnapshot?: OrderCouponSnapshot;

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

  /**
   * @deprecated Write-once archive of the items at checkout. Nothing reads this
   * column any more - `order_items` (the `orderItems` relation) is the source of
   * truth for what an order contains, and API responses build `items` from it.
   * Kept only so historical rows stay recoverable; never mutate it after create.
   */
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

  @hasMany(() => Shipment, {keyTo: 'orderId'})
  shipments?: Shipment[];

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

  // RTO (Return to Origin) Tracking
  @property({
    type: 'string',
    jsonSchema: {
      enum: ['initiated', 'in_transit', 'delivered'],
    },
    postgresql: {columnName: 'rtostatus'},
  })
  rtoStatus?: 'initiated' | 'in_transit' | 'delivered';

  @property({type: 'date', postgresql: {columnName: 'rtoinitiateat'}})
  rtoInitiatedAt?: Date;

  @property({type: 'date', postgresql: {columnName: 'rtodeliveredat'}})
  rtoDeliveredAt?: Date;

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'rtoinventoryrestored'},
  })
  rtoInventoryRestored?: boolean; // true after stock restored on RTO delivery

  // Reverse Pickup AWB
  @property({type: 'string', postgresql: {columnName: 'reversepickupawb'}})
  reversePickupAwb?: string;

  @property({type: 'date', postgresql: {columnName: 'reversepickuprequestedat'}})
  reversePickupRequestedAt?: Date;

  // Inventory Lifecycle Flags
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'inventoryreserved'},
  })
  inventoryReserved?: boolean; // true after reserveOnOrderConfirmed

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'inventorydeducted'},
  })
  inventoryDeducted?: boolean; // true after deductOnShipment

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'inventoryrestored'},
  })
  inventoryRestored?: boolean; // true after restoreOnReturn or restoreOnRto

  // Manual Shipping Fallback — set when payment was already captured but the
  // destination pincode failed Blue Dart serviceability, so the order was
  // let through instead of stranding a captured payment with no order.
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'needsmanualshipping'},
  })
  needsManualShipping?: boolean;

  @property({
    type: 'string',
    postgresql: {columnName: 'manualshippingreason'},
  })
  manualShippingReason?: string;

  // COD Tracking
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'iscodorder'},
  })
  isCodOrder?: boolean;

  @property({
    type: 'number',
    postgresql: {columnName: 'codamount', dataType: 'decimal', precision: 10, scale: 2},
  })
  codAmount?: number;

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

  // Populated by the refund.failed webhook when Razorpay reports an
  // asynchronous refund failure after initial acceptance. Deliberately
  // does not revert `status`/`paymentStatus` — there's no reliable prior
  // value to roll back to, so failures are surfaced here for manual
  // reconciliation instead of guessed automatically.
  @property({
    type: 'string',
  })
  refundFailureReason?: string;

  @property({
    type: 'date',
  })
  refundFailedAt?: Date;

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
