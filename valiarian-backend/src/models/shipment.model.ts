import {Entity, hasMany, model, property} from '@loopback/repository';
import {InternalShipmentStatus} from '../interfaces/shipping-provider.interface';
import {ShipmentEvent} from './shipment-event.model';
import {ShipmentItem} from './shipment-item.model';
import {ShipmentLabel} from './shipment-label.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'shipments',
    },
    indexes: {
      shipmentsOrderIdIdx: {keys: {orderId: 1}},
      shipmentsAwbNumberIdx: {keys: {awbNumber: 1}, options: {unique: true}},
      shipmentsStatusIdx: {keys: {status: 1}},
      shipmentsCourierNameIdx: {keys: {courierName: 1}},
      shipmentsIsReverseIdx: {keys: {isReverse: 1}},
    },
  },
})
export class Shipment extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id: string;

  // ── Order Reference ─────────────────────────────────────────────────────────
  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'orderid', dataType: 'uuid'},
  })
  orderId: string;

  // ── Courier Details ─────────────────────────────────────────────────────────
  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'awbnumber'},
  })
  awbNumber: string;

  @property({
    type: 'string',
    required: true,
    default: 'BlueDart',
    postgresql: {columnName: 'couriername'},
  })
  courierName: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'courierreferencenumber'},
  })
  courierReferenceNumber?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'servicetype'},
  })
  serviceType?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'productcode'},
  })
  productCode?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'subproductcode'},
  })
  subProductCode?: string;

  // ── Package Details ─────────────────────────────────────────────────────────
  @property({
    type: 'number',
    postgresql: {columnName: 'weightgrams', dataType: 'integer'},
  })
  weightGrams?: number;

  @property({
    type: 'number',
    postgresql: {
      columnName: 'lengthcm',
      dataType: 'decimal',
      precision: 8,
      scale: 2,
    },
  })
  lengthCm?: number;

  @property({
    type: 'number',
    postgresql: {
      columnName: 'breadthcm',
      dataType: 'decimal',
      precision: 8,
      scale: 2,
    },
  })
  breadthCm?: number;

  @property({
    type: 'number',
    postgresql: {
      columnName: 'heightcm',
      dataType: 'decimal',
      precision: 8,
      scale: 2,
    },
  })
  heightCm?: number;

  // ── COD ─────────────────────────────────────────────────────────────────────
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'iscod'},
  })
  isCod: boolean;

  @property({
    type: 'number',
    postgresql: {
      columnName: 'codamount',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  codAmount?: number;

  // ── Internal Shipment Status ────────────────────────────────────────────────
  // Uses internal standard statuses — raw courier codes in courierRawStatus only.
  @property({
    type: 'string',
    required: true,
    default: 'created',
    jsonSchema: {
      enum: [
        'created',
        'pickup_pending',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'cancel_pending',
        'rto_initiated',
        'rto_in_transit',
        'rto_delivered',
        'exception',
      ],
    },
    postgresql: {columnName: 'status'},
  })
  status: InternalShipmentStatus | 'cancel_pending';

  @property({
    type: 'string',
    postgresql: {columnName: 'courierrawstatus'},
  })
  courierRawStatus?: string; // Raw code from Blue Dart — never sent to frontend

  // ── Live Tracking ───────────────────────────────────────────────────────────
  @property({
    type: 'string',
    postgresql: {columnName: 'currentlocation'},
  })
  currentLocation?: string;

  @property({type: 'date', postgresql: {columnName: 'estimateddelivery'}})
  estimatedDelivery?: Date;

  @property({type: 'date', postgresql: {columnName: 'deliveredat'}})
  deliveredAt?: Date;

  @property({type: 'date', postgresql: {columnName: 'trackinglastsyncedat'}})
  trackingLastSyncedAt?: Date;

  @property({
    type: 'object',
    postgresql: {columnName: 'rawtrackingdata', dataType: 'jsonb'},
  })
  rawTrackingData?: object;

  // ── Label ───────────────────────────────────────────────────────────────────
  @property({type: 'string', postgresql: {columnName: 'labelurl'}})
  labelUrl?: string;

  // ── Reverse Pickup ──────────────────────────────────────────────────────────
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'isreverse'},
  })
  isReverse: boolean;

  @property({
    type: 'string',
    postgresql: {columnName: 'parentshipmentid', dataType: 'uuid'},
  })
  parentShipmentId?: string; // FK → shipments for reverse pickups

  // ── Cancellation ────────────────────────────────────────────────────────────
  @property({type: 'date', postgresql: {columnName: 'cancelledat'}})
  cancelledAt?: Date;

  @property({type: 'string', postgresql: {columnName: 'cancellationreason'}})
  cancellationReason?: string;

  // ── Warehouse Snapshot ──────────────────────────────────────────────────────
  @property({
    type: 'string',
    postgresql: {columnName: 'warehouseid', dataType: 'uuid'},
  })
  warehouseId?: string;

  @property({type: 'string', postgresql: {columnName: 'warehousename'}})
  warehouseName?: string;

  // ── Shipping Cost Snapshot ──────────────────────────────────────────────────
  // Written ONCE at AWB creation. Never mutated afterwards.
  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'shippingcharge',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  shippingCharge?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'fuelsurcharge',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  fuelSurcharge?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'codcharge',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  codCharge?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'othercharges',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  otherCharges?: number;

  @property({
    type: 'number',
    default: 0,
    postgresql: {
      columnName: 'totalcouriercost',
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  totalCourierCost?: number;

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'chargesunavailable'},
  })
  chargesUnavailable?: boolean; // true in sandbox/test env

  @property({type: 'string', postgresql: {columnName: 'providerrequestid'}})
  providerRequestId?: string;

  @property({
    type: 'string',
    jsonSchema: {enum: ['bluedart-legacy-soap', 'bluedart-developer-portal']},
    postgresql: {columnName: 'providermode'},
  })
  providerMode?: 'bluedart-legacy-soap' | 'bluedart-developer-portal';

  @property({
    type: 'string',
    default: 'CREATED',
    jsonSchema: {enum: ['PENDING', 'CREATED', 'CREATION_UNKNOWN', 'FAILED']},
    postgresql: {columnName: 'creationstate'},
  })
  creationState?: 'PENDING' | 'CREATED' | 'CREATION_UNKNOWN' | 'FAILED';

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'reconciliationrequired'},
  })
  reconciliationRequired?: boolean;

  // ── Soft Delete ─────────────────────────────────────────────────────────────
  @property({
    type: 'boolean',
    default: true,
    postgresql: {columnName: 'isactive'},
  })
  isActive: boolean;

  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'isdeleted'},
  })
  isDeleted: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'createdat'},
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'updatedat'},
  })
  updatedAt: Date;

  // ── Relations ───────────────────────────────────────────────────────────────
  @hasMany(() => ShipmentEvent, {keyTo: 'shipmentId'})
  events?: ShipmentEvent[];

  @hasMany(() => ShipmentItem, {keyTo: 'shipmentId'})
  shipmentItems?: ShipmentItem[];

  @hasMany(() => ShipmentLabel, {keyTo: 'shipmentId'})
  labels?: ShipmentLabel[];

  constructor(data?: Partial<Shipment>) {
    super(data);
  }
}

export interface ShipmentRelations {}
export type ShipmentWithRelations = Shipment & ShipmentRelations;
