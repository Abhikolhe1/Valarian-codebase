import {HttpErrors} from '@loopback/rest';

/**
 * Order Status Transition Matrix
 *
 * All order status changes — whether triggered by admin, customer, courier cron,
 * or payment webhook — must pass through this validator BEFORE any DB write.
 *
 * No direct status assignment is ever permitted without calling assertTransition().
 *
 * Enforcement points:
 *   - PATCH /api/admin/orders/:id/status
 *   - ShipmentController.createShipment() → assertTransition(order.status, 'shipped')
 *   - TrackingSyncCronJob → assertTransition() before auto-advancing on delivery/RTO
 *   - Customer-facing cancel/return endpoints
 */

export type OrderStatus =
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

/**
 * The full allowed transition matrix.
 * Key = from-status, Value = set of allowed to-statuses.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'paid', 'cancelled', 'failed'],
  paid: ['confirmed', 'cancelled'],
  failed: ['cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'rto_initiated', 'cancelled'],
  out_for_delivery: ['delivered', 'rto_initiated'],
  delivered: ['return_requested'],
  return_requested: ['returned', 'cancelled'],
  returned: ['refunded', 'parcel_received'],
  refunded: [],
  parcel_received: ['refunded'],
  cancelled: [],
  rto_initiated: ['rto_in_transit'],
  rto_in_transit: ['rto_delivered'],
  rto_delivered: [],
};

/**
 * Check if a status transition is allowed.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Assert that a transition is allowed. Throws HTTP 422 if not.
 * Use this in controllers and services before updating order status.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    const allowed = getAllowedTransitions(from);
    const allowedStr =
      allowed.length > 0 ? `[${allowed.join(', ')}]` : 'none (terminal state)';
    throw new HttpErrors.UnprocessableEntity(
      `Order status cannot transition from '${from}' to '${to}'. ` +
        `Allowed transitions from '${from}': ${allowedStr}`,
    );
  }
}

/**
 * Get all valid next statuses from a given status.
 */
export function getAllowedTransitions(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/**
 * Check if a status is a terminal state (no further transitions allowed).
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return getAllowedTransitions(status).length === 0;
}

/**
 * Statuses that cannot have an AWB generated.
 */
export const NON_SHIPPABLE_STATUSES: OrderStatus[] = [
  'pending',
  'failed',
  'cancelled',
  'delivered',
  'return_requested',
  'returned',
  'refunded',
  'parcel_received',
  'rto_initiated',
  'rto_in_transit',
  'rto_delivered',
];

/**
 * Shipment cancellation — only these internal shipment statuses are cancellable.
 * Attempting cancellation in other states returns HTTP 409.
 * See Component 24 in the implementation plan for full details.
 */
export const CANCELLABLE_SHIPMENT_STATUSES = ['created', 'pickup_pending'] as const;
export type CancellableShipmentStatus = typeof CANCELLABLE_SHIPMENT_STATUSES[number];

export function isShipmentCancellable(shipmentStatus: string): boolean {
  return (CANCELLABLE_SHIPMENT_STATUSES as readonly string[]).includes(
    shipmentStatus,
  );
}
