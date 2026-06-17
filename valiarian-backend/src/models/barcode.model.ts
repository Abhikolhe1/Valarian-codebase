import {belongsTo, Entity, model, property} from '@loopback/repository';
import {OrderItemEntity} from './order-item.model';

export type BarcodeStatus =
  | 'GENERATED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'barcodes',
    },
    indexes: {
      barcodeCodeIdx: {
        keys: {code: 1},
        options: {unique: true},
      },
      barcodeOrderItemIdx: {
        keys: {orderItemId: 1},
        options: {unique: true},
      },
      barcodeStatusIdx: {
        keys: {status: 1},
      },
      barcodeCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class Barcode extends Entity {
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
  code: string;

  @belongsTo(() => OrderItemEntity, {
    name: 'orderItem',
    keyFrom: 'orderItemId',
    keyTo: 'id',
  }, {
    postgresql: {
      columnName: 'orderitemid',
      dataType: 'uuid',
    },
  })
  orderItemId: string;

  @property({
    type: 'string',
    required: true,
    default: 'GENERATED',
    jsonSchema: {
      enum: [
        'GENERATED',
        'PACKED',
        'SHIPPED',
        'DELIVERED',
        'RETURN_REQUESTED',
        'RETURNED',
        'REFUNDED',
      ],
    },
  })
  status: BarcodeStatus;

  @property({
    type: 'string',
  })
  barcodeImageUrl?: string;

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

  constructor(data?: Partial<Barcode>) {
    super(data);
  }
}

export interface BarcodeRelations {
  orderItem?: OrderItemEntity;
}

export type BarcodeWithRelations = Barcode & BarcodeRelations;
