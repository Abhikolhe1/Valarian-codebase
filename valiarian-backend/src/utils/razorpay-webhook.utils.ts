/**
 * Pure helpers for Razorpay webhook handling — kept dependency-free (no
 * repositories, no LoopBack context) so they're unit-testable in isolation.
 */

/** Minimal shape needed from the Express/LoopBack request; avoids importing
 * the full `Request` type just to read one field. */
export interface RawBodyCarrier {
  rawBody?: Buffer;
}

/**
 * Returns the exact raw request body Razorpay signed, as captured by the
 * global `verify` hook in index.ts. Never falls back to re-serializing the
 * parsed body — a re-serialized JSON string is not guaranteed to match the
 * original bytes (key order, number formatting, whitespace), which would
 * make HMAC verification unreliable.
 *
 * Returns null if the raw body was not captured (e.g. body-parser
 * misconfiguration, empty body) — callers must reject the webhook rather
 * than fall back to an approximation.
 */
export function resolveWebhookRawBody(request: RawBodyCarrier): string | null {
  const rawBody = request.rawBody;
  if (!rawBody || !Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    return null;
  }
  return rawBody.toString('utf8');
}

/**
 * Deterministic marker embedded in an order-status-history `comment` to
 * detect duplicate webhook deliveries without a dedicated event-ID table.
 * Razorpay's webhook payload has no stable top-level delivery/event ID
 * (unlike e.g. Stripe's `evt_...`), so identity is derived instead from
 * (event name + the Razorpay entity ID the event is about — a payment or
 * refund ID, both of which are stable and unique per Razorpay).
 */
export function buildRazorpayEventMarker(event: string, entityId: string): string {
  return `[razorpay-event:${event}:${entityId}]`;
}

/** True if any existing history entry's comment already contains the marker
 * for this exact (event, entityId) pair — i.e. this delivery is a duplicate. */
export function historyAlreadyContainsMarker(
  entries: Array<{comment?: string | null}>,
  marker: string,
): boolean {
  return entries.some(entry => !!entry.comment && entry.comment.includes(marker));
}

/**
 * True live-mode signal derived directly from the configured key rather
 * than a separate flag that could drift out of sync with real credentials.
 * Razorpay key IDs are always prefixed `rzp_live_` or `rzp_test_`.
 */
export function isLiveRazorpayMode(keyId: string | undefined): boolean {
  return !!keyId && keyId.startsWith('rzp_live_');
}
