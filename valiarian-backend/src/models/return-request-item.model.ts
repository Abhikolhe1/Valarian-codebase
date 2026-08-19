import {Entity, model, property} from '@loopback/repository';

export type ReturnItemCondition = 'good' | 'damaged' | 'missing';

/**
 * ReturnRequestItem Model
 *
 * Item-level breakdown for a return request.
 * Supports partial returns — customer may return only some items, or only
 * some units of an item, or items may arrive damaged at the warehouse.
 *
 * Invariants (enforced by InventoryLifecycleService):
 *   returnedQuantity = restockedQuantity + damagedQuantity
 *   requestedQuantity >= returnedQuantity (cannot receive more than requested)
 *
 * Only restockedQuantity is added back to stockQuantity.
 * damagedQuantity and rejectedQuantity do NOT restore stock.
 */
@model({
  settings: {
    postgresql: {schema: 'public', table: 'return_request_items'},
    indexes: {
      rriReturnRequestIdx: {keys: {returnRequestId: 1}},
      rriOrderItemIdx: {keys: {orderItemId: 1}},
    },
  },
})
export class ReturnRequestItem extends Entity {
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
    postgresql: {columnName: 'returnrequestid', dataType: 'uuid'},
  })
  returnRequestId: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'orderitemid', dataType: 'uuid'},
  })
  orderItemId: string;

  // ── Quantities ──────────────────────────────────────────────────────────────
  @property({
    type: 'number',
    required: true,
    jsonSchema: {minimum: 1},
    postgresql: {columnName: 'requestedquantity', dataType: 'integer'},
  })
  requestedQuantity: number; // Units customer wants to return

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {minimum: 0},
    postgresql: {columnName: 'returnedquantity', dataType: 'integer'},
  })
  returnedQuantity: number; // Units physically received at warehouse

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {minimum: 0},
    postgresql: {columnName: 'restockedquantity', dataType: 'integer'},
  })
  restockedQuantity: number; // Units confirmed good → added back to stockQuantity

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {minimum: 0},
    postgresql: {columnName: 'damagedquantity', dataType: 'integer'},
  })
  damagedQuantity: number; // Units received but damaged/unsellable → NOT restocked

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {minimum: 0},
    postgresql: {columnName: 'rejectedquantity', dataType: 'integer'},
  })
  rejectedQuantity: number; // Units rejected by admin → NOT restocked

  // ── Condition ───────────────────────────────────────────────────────────────
  @property({
    type: 'string',
    jsonSchema: {enum: ['good', 'damaged', 'missing']},
    postgresql: {columnName: 'condition'},
  })
  condition?: ReturnItemCondition;

  @property({type: 'string', postgresql: {columnName: 'adminnotes'}})
  adminNotes?: string; // Warehouse inspection notes

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'createdat'}})
  createdAt: Date;

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'updatedat'}})
  updatedAt: Date;

  constructor(data?: Partial<ReturnRequestItem>) {
    super(data);
  }
}

export interface ReturnRequestItemRelations {}
export type ReturnRequestItemWithRelations = ReturnRequestItem &
  ReturnRequestItemRelations;
