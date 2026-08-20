import {Entity, model, property} from '@loopback/repository';

/**
 * Warehouse Model
 *
 * Foundation for warehouse-aware shipment creation.
 * Currently supports a single primary warehouse; architecture is ready for multi-warehouse.
 *
 * Every shipment MUST reference a warehouse as the shipping origin.
 * Warehouse origin details (bluedartAreaCode, bluedartOriginArea) are injected into
 * the Blue Dart SOAP payload at AWB generation time.
 *
 * Env var fallback (BLUEDART_AREA_CODE / BLUEDART_ORIGIN_AREA) is used during
 * initial setup before a warehouse record is created.
 */
@model({
  settings: {
    postgresql: {schema: 'public', table: 'warehouses'},
    indexes: {
      warehousesCodeIdx: {keys: {code: 1}, options: {unique: true}},
      warehousesPrimaryIdx: {keys: {isPrimary: 1}},
    },
  },
})
export class Warehouse extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id: string;

  @property({type: 'string', required: true})
  name: string; // e.g. "Mumbai Main Warehouse"

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'code'},
  })
  code: string; // Unique short code, e.g. "MUM-01"

  @property({type: 'string', required: true, postgresql: {columnName: 'addressline1'}})
  addressLine1: string;

  @property({type: 'string', required: true})
  city: string;

  @property({type: 'string', required: true})
  state: string;

  @property({type: 'string', required: true})
  pincode: string;

  @property({type: 'string', default: 'India'})
  country: string;

  @property({type: 'string', postgresql: {columnName: 'contactname'}})
  contactName?: string;

  @property({type: 'string', postgresql: {columnName: 'contactphone'}})
  contactPhone?: string;

  // ── Blue Dart Origin Config ─────────────────────────────────────────────────
  // These are injected into the Blue Dart SOAP WayBillGeneration payload.
  @property({
    type: 'string',
    postgresql: {columnName: 'bluedartareacode'},
  })
  bluedartAreaCode?: string; // e.g. "MUM"

  @property({
    type: 'string',
    postgresql: {columnName: 'bluedartoriginarea'},
  })
  bluedartOriginArea?: string; // e.g. "BOM"

  // ── Flags ───────────────────────────────────────────────────────────────────
  @property({
    type: 'boolean',
    default: false,
    postgresql: {columnName: 'isprimary'},
  })
  isPrimary: boolean; // true = default warehouse (only one should be primary at a time)

  @property({
    type: 'boolean',
    default: true,
    postgresql: {columnName: 'isactive'},
  })
  isActive: boolean;

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'createdat'}})
  createdAt: Date;

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'updatedat'}})
  updatedAt: Date;

  constructor(data?: Partial<Warehouse>) {
    super(data);
  }
}

export interface WarehouseRelations {}
export type WarehouseWithRelations = Warehouse & WarehouseRelations;
