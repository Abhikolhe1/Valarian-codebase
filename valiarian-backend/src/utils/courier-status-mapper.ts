import {InternalShipmentStatus} from '../interfaces/shipping-provider.interface';

/**
 * Courier Status Mapper
 *
 * Maps raw courier-proprietary status codes to internal standard statuses.
 * Raw codes are NEVER exposed to frontend or stored as the primary shipment status.
 *
 * Where this is called:
 *   1. TrackingSyncCronJob — maps each event code before persisting ShipmentEvent
 *   2. BlueDartProvider.trackShipment() — maps currentStatus before returning TrackingResult
 *
 * Never called from controllers or frontend.
 * Future couriers: add a new mapping table in this file only — cron/controllers need no changes.
 */

// ── Blue Dart status code mapping ─────────────────────────────────────────────
const BLUEDART_STATUS_MAP: Record<string, InternalShipmentStatus> = {
  // Consignment registered / AWB generated
  CR: 'created',
  // Pickup
  OFP: 'pickup_pending',   // Out for Pickup (reverse pickup)
  PU: 'picked_up',         // Picked Up
  PX: 'picked_up',         // Picked Up (alternate code)
  // Transit
  IT: 'in_transit',        // In Transit
  AR: 'in_transit',        // Arrived at Hub
  DH: 'in_transit',        // Dispatched from Hub
  // Delivery
  OA: 'out_for_delivery',  // Out for Delivery Attempt
  OFD: 'out_for_delivery', // Out for Delivery
  DL: 'delivered',         // Delivered
  // Failed delivery / NDR
  UD: 'exception',         // Undelivered
  RD: 'exception',         // Refused Delivery
  // Cancellation
  CN: 'cancelled',         // Cancelled
  // RTO
  RTO: 'rto_initiated',    // Return to Origin initiated
  RT: 'rto_in_transit',    // Return in Transit
  RP: 'rto_delivered',     // Return delivered to pickup point / warehouse
};

// ── Blue Dart description mapping ────────────────────────────────────────────
const BLUEDART_DESCRIPTION_MAP: Record<string, string> = {
  CR: 'Shipment registered with courier',
  OFP: 'Out for pickup',
  PU: 'Picked up by courier',
  PX: 'Picked up by courier',
  IT: 'In transit',
  AR: 'Arrived at hub',
  DH: 'Dispatched from hub',
  OA: 'Out for delivery',
  OFD: 'Out for delivery',
  DL: 'Delivered',
  UD: 'Delivery attempt failed',
  RD: 'Delivery refused by customer',
  CN: 'Shipment cancelled',
  RTO: 'Return to origin initiated',
  RT: 'Return in transit',
  RP: 'Returned to warehouse',
};

// ── Courier registry ──────────────────────────────────────────────────────────
type CourierName = 'BlueDart' | 'Delhivery'; // extend as couriers are added

const STATUS_MAPS: Record<string, Record<string, InternalShipmentStatus>> = {
  BlueDart: BLUEDART_STATUS_MAP,
  // Delhivery: DELHIVERY_STATUS_MAP,  // add when onboarded
};

const DESCRIPTION_MAPS: Record<string, Record<string, string>> = {
  BlueDart: BLUEDART_DESCRIPTION_MAP,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Map a raw courier status code to an InternalShipmentStatus.
 * Returns 'exception' for any unknown or unmapped code.
 */
export function mapCourierStatus(
  courierName: string,
  rawCode: string,
): InternalShipmentStatus {
  const map = STATUS_MAPS[courierName];
  if (!map) {
    console.warn(
      `[CourierStatusMapper] No mapping found for courier: ${courierName}. Defaulting to 'exception'.`,
    );
    return 'exception';
  }

  const normalized = rawCode?.toUpperCase().trim();
  const mapped = map[normalized];

  if (!mapped) {
    console.warn(
      `[CourierStatusMapper] Unknown ${courierName} code: "${rawCode}". Defaulting to 'exception'.`,
    );
    return 'exception';
  }

  return mapped;
}

/**
 * Get a human-readable description for a courier status code.
 * Falls back to the raw code itself if no description is found.
 */
export function getCourierStatusDescription(
  courierName: string,
  rawCode: string,
): string {
  const map = DESCRIPTION_MAPS[courierName];
  const normalized = rawCode?.toUpperCase().trim();
  return map?.[normalized] ?? rawCode ?? 'Unknown status';
}

/**
 * Check if a status indicates a failed delivery attempt (triggers NDR workflow).
 */
export function isFailedDeliveryStatus(
  courierName: string,
  rawCode: string,
): boolean {
  const internal = mapCourierStatus(courierName, rawCode);
  return internal === 'exception';
}

/**
 * Check if a status indicates RTO has been initiated.
 */
export function isRtoStatus(
  courierName: string,
  rawCode: string,
): boolean {
  const internal = mapCourierStatus(courierName, rawCode);
  return (
    internal === 'rto_initiated' ||
    internal === 'rto_in_transit' ||
    internal === 'rto_delivered'
  );
}

/**
 * Check if a status is a terminal state (no further tracking expected).
 */
export function isTerminalStatus(status: InternalShipmentStatus): boolean {
  return ['delivered', 'cancelled', 'rto_delivered'].includes(status);
}

// Re-export for convenience
export type {CourierName, InternalShipmentStatus};
