import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Barcode} from './barcode.model';
import {Order} from './order.model';
import {OrderItemEntity} from './order-item.model';
import {Users} from './users.model';

export interface ReturnRequestEvidenceImages {
  barcodeImageUrl: string;
  productImageUrls: string[];
}

export type ReturnRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'return_requests',
    },
    indexes: {
      returnRequestBarcodeIdx: {
        keys: {barcodeId: 1},
      },
      returnRequestOrderItemIdx: {
        keys: {orderItemId: 1},
      },
      returnRequestStatusIdx: {
        keys: {status: 1},
      },
      returnRequestCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class ReturnRequest extends Entity {
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
  orderId: string;

  @belongsTo(() => Users, {name: 'requester'}, {
    postgresql: {
      columnName: 'requesterid',
      dataType: 'uuid',
    },
  })
  requesterId: string;

  @property({
    type: 'string',
    required: true,
    default: 'PENDING',
    jsonSchema: {
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'],
    },
  })
  status: ReturnRequestStatus;

  @property({
    type: 'string',
    required: true,
  })
  decodedBarcodeCode: string;

  @property({
    type: 'string',
  })
  reason?: string;

  @property({
    type: 'string',
  })
  comment?: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      columnName: 'evidenceimages',
      dataType: 'jsonb',
    },
  })
  evidenceImages: ReturnRequestEvidenceImages;

  @property({
    type: 'string',
  })
  adminDecision?: string;

  @property({
    type: 'string',
  })
  reviewedBy?: string;

  @property({
    type: 'date',
  })
  reviewedAt?: Date;

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

  constructor(data?: Partial<ReturnRequest>) {
    super(data);
  }
}

export interface ReturnRequestRelations {
  barcode?: Barcode;
  orderItem?: OrderItemEntity;
  order?: Order;
  requester?: Users;
}

export type ReturnRequestWithRelations = ReturnRequest & ReturnRequestRelations;
