import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Barcode} from './barcode.model';
import {Order} from './order.model';
import {OrderItemEntity} from './order-item.model';

export type BarcodeScanEventType =
  | 'GENERATED'
  | 'PRINTED'
  | 'SCANNED'
  | 'STATUS_UPDATED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'VALIDATION_FAILED';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'barcode_scan_logs',
    },
    indexes: {
      barcodeScanLogBarcodeIdx: {
        keys: {barcodeId: 1},
      },
      barcodeScanLogOrderItemIdx: {
        keys: {orderItemId: 1},
      },
      barcodeScanLogOrderIdx: {
        keys: {orderId: 1},
      },
      barcodeScanLogCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class BarcodeScanLog extends Entity {
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

  @belongsTo(() => Barcode, {name: 'barcode'}, {
    postgresql: {
      columnName: 'barcodeid',
      dataType: 'uuid',
    },
  })
  barcodeId: string;

  @belongsTo(() => OrderItemEntity, {name: 'orderItem'}, {
    postgresql: {
      columnName: 'orderitemid',
      dataType: 'uuid',
    },
  })
  orderItemId: string;

  @belongsTo(() => Order, {name: 'order'}, {
    postgresql: {
      columnName: 'orderid',
      dataType: 'uuid',
    },
  })
  orderId?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: [
        'GENERATED',
        'PRINTED',
        'SCANNED',
        'STATUS_UPDATED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'RETURNED',
        'REFUNDED',
        'VALIDATION_FAILED',
      ],
    },
  })
  eventType: BarcodeScanEventType;

  @property({
    type: 'string',
  })
  message?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  metadata?: object;

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
  })
  deletedAt?: Date;

  constructor(data?: Partial<BarcodeScanLog>) {
    super(data);
  }
}

export interface BarcodeScanLogRelations {
  barcode?: Barcode;
  orderItem?: OrderItemEntity;
  order?: Order;
}

export type BarcodeScanLogWithRelations = BarcodeScanLog &
  BarcodeScanLogRelations;
