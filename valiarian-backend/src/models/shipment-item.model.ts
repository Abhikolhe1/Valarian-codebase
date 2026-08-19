import {Entity, model, property} from '@loopback/repository';

/**
 * ShipmentItem Model
 *
 * Maps specific OrderItems to a Shipment. This join table is what makes
 * multi-AWB / split-shipment architecturally possible without restructuring
 * the Order or Shipment models.
 *
 * Relationship diagram:
 *   Order → OrderItems (1:N)
 *     └── ShipmentItems (N:N via this table)
 *           └── Shipment (1:N per order, 1 active per sprint)
 */
@model({
  settings: {
    postgresql: {schema: 'public', table: 'shipment_items'},
    indexes: {
      shipmentItemsShipmentIdx: {keys: {shipmentId: 1}},
      shipmentItemsOrderItemIdx: {keys: {orderItemId: 1}},
      // Unique: an order item can only appear once per shipment
      shipmentItemsUniqueIdx: {
        keys: {shipmentId: 1, orderItemId: 1},
        options: {unique: true},
      },
    },
  },
})
export class ShipmentItem extends Entity {
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

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'orderitemid', dataType: 'uuid'},
  })
  orderItemId: string;

  /**
   * Quantity dispatched in this shipment for this item.
   * Supports partial quantity per item (future split-shipment).
   * Defaults to full OrderItem.quantity for single-shipment orders.
   */
  @property({
    type: 'number',
    required: true,
    jsonSchema: {minimum: 1},
    postgresql: {columnName: 'quantity', dataType: 'integer'},
  })
  quantity: number;

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'createdat'},
  })
  createdAt: Date;

  constructor(data?: Partial<ShipmentItem>) {
    super(data);
  }
}

export interface ShipmentItemRelations {}
export type ShipmentItemWithRelations = ShipmentItem & ShipmentItemRelations;
