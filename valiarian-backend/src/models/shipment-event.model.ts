import {Entity, model, property} from '@loopback/repository';
import {InternalShipmentStatus} from '../interfaces/shipping-provider.interface';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'shipment_events'},
    indexes: {
      shipmentEventsShipmentIdx: {keys: {shipmentId: 1}},
      // Unique constraint prevents duplicate event inserts during cron re-runs
      shipmentEventsUniqueIdx: {
        keys: {shipmentId: 1, courierRawCode: 1, timestamp: 1},
        options: {unique: true},
      },
    },
  },
})
export class ShipmentEvent extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'shipmentid', dataType: 'uuid'},
  })
  shipmentId: string;

  // ── Mapped Internal Status ──────────────────────────────────────────────────
  // This is what frontend and business logic use. Never expose courierRawCode to frontend.
  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'internalstatus'},
  })
  internalStatus: InternalShipmentStatus;

  // ── Raw Courier Data (stored for debugging) ─────────────────────────────────
  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'courierrawcode'},
  })
  courierRawCode: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'courierdescription'},
  })
  courierDescription?: string;

  // ── Mapped Description ──────────────────────────────────────────────────────
  @property({
    type: 'string',
    postgresql: {columnName: 'description'},
  })
  description?: string;

  // ── Location & Time ─────────────────────────────────────────────────────────
  @property({
    type: 'string',
    postgresql: {columnName: 'location'},
  })
  location?: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {columnName: 'timestamp'},
  })
  timestamp: Date;

  @property({
    type: 'string',
    postgresql: {columnName: 'activitytype'},
  })
  activityType?: string;

  // ── Raw API Response ────────────────────────────────────────────────────────
  @property({
    type: 'object',
    postgresql: {columnName: 'rawdata', dataType: 'jsonb'},
  })
  rawData?: object;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'createdat'},
  })
  createdAt: Date;

  constructor(data?: Partial<ShipmentEvent>) {
    super(data);
  }
}

export interface ShipmentEventRelations {}
export type ShipmentEventWithRelations = ShipmentEvent & ShipmentEventRelations;
