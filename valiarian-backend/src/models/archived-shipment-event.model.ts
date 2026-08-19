import {Entity, model, property} from '@loopback/repository';
import {InternalShipmentStatus} from '../interfaces/shipping-provider.interface';

/**
 * ArchivedShipmentEvent Model
 *
 * Identical schema to ShipmentEvent plus an archivedAt timestamp.
 * Events are moved here from shipment_events by EventRetentionCronJob when they
 * exceed the TRACKING_EVENT_RETENTION_MONTHS threshold (default 24 months).
 *
 * This keeps shipment_events lean and fast while preserving historical data
 * for auditing and potential courier reconciliation.
 *
 * Hard-delete from this table occurs at TRACKING_EVENT_HARD_DELETE_MONTHS (default 60).
 */
@model({
  settings: {
    postgresql: {schema: 'public', table: 'archived_shipment_events'},
    indexes: {
      archivedEventsShipmentIdx: {keys: {shipmentId: 1}},
      archivedEventsArchivedAtIdx: {keys: {archivedAt: -1}},
    },
  },
})
export class ArchivedShipmentEvent extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {dataType: 'uuid'},
  })
  id: string; // Same ID as original ShipmentEvent

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'shipmentid', dataType: 'uuid'},
  })
  shipmentId: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'internalstatus'},
  })
  internalStatus: InternalShipmentStatus;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'courierrawcode'},
  })
  courierRawCode: string;

  @property({type: 'string', postgresql: {columnName: 'courierdescription'}})
  courierDescription?: string;

  @property({type: 'string', postgresql: {columnName: 'description'}})
  description?: string;

  @property({type: 'string', postgresql: {columnName: 'location'}})
  location?: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {columnName: 'timestamp'},
  })
  timestamp: Date;

  @property({type: 'string', postgresql: {columnName: 'activitytype'}})
  activityType?: string;

  @property({
    type: 'object',
    postgresql: {columnName: 'rawdata', dataType: 'jsonb'},
  })
  rawData?: object;

  @property({type: 'date', postgresql: {columnName: 'createdat'}})
  createdAt: Date; // Original creation timestamp from shipment_events

  // ── Archive-specific ────────────────────────────────────────────────────────
  @property({
    type: 'date',
    required: true,
    defaultFn: 'now',
    postgresql: {columnName: 'archivedat'},
  })
  archivedAt: Date; // When EventRetentionCronJob moved this event here

  constructor(data?: Partial<ArchivedShipmentEvent>) {
    super(data);
  }
}

export interface ArchivedShipmentEventRelations {}
export type ArchivedShipmentEventWithRelations = ArchivedShipmentEvent &
  ArchivedShipmentEventRelations;
