# Shipment Cancellation API

## Purpose

This API requests cancellation of an eligible Delhivery B2C shipment through the shared shipment-edit endpoint.

Cancellation is allowed only in a limited set of package statuses. The resulting provider status differs by shipment flow and current state; a forward shipment may not receive the literal `Canceled` status.

## Cancellation eligibility

| Shipment flow | Payment mode | Eligible statuses |
|---|---|---|
| Forward | `COD` or `Prepaid` | `Manifested`, `In Transit`, `Pending` |
| Reverse pickup (RVP) | `Pickup` | `Scheduled` |
| Replacement | `REPL` | `Manifested`, `In Transit`, `Pending` |

Fetch the current Delhivery status immediately before requesting cancellation.

## Resulting provider state

| State at cancellation | Resulting status | Resulting status type | Meaning from supplied documentation |
|---|---|---|---|
| Manifested before pickup | Remains `Manifested` | `UD` | Undelivered. |
| `In Transit` or `Pending` | Remains `In Transit` | `RT` | Return to Origin. |
| Scheduled reverse pickup | `Canceled` | `CN` | Cancellation. |

Therefore, do not decide cancellation success by checking only whether `status === "Canceled"`. Use the exact status and status-type combination and preserve the forward/RVP/REPL flow.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`. Cancellation shares the Shipment Edit endpoint.

### Test

```text
POST https://staging-express.delhivery.com/api/p/edit
```

### Production

```text
POST https://track.delhivery.com/api/p/edit
```

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `waybill` | String | Yes | Waybill of the shipment to cancel. |
| `cancellation` | String | Yes | Pass the string `"true"` according to the supplied example. Confirm whether JSON boolean `true` is also accepted. |

Treat the Waybill as a string to preserve all digits and leading zeros.

## Example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/api/p/edit' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "waybill": "<WAYBILL>",
    "cancellation": "true"
  }'
```

## Recommended application flow

1. Authenticate and authorize the administrator or approved customer cancellation operation.
2. Confirm that the Waybill belongs to the intended order.
3. Fetch fresh Delhivery shipment status and determine forward, reverse-pickup, or replacement flow.
4. Validate that the exact current status is eligible.
5. Acquire a shipment-level lock to prevent cancellation racing shipment edits, pickup, NDR, or fulfillment updates.
6. Show the operator the expected outcome: `UD`, `RT`/RTO, or `CN` based on current state.
7. Submit the cancellation once and validate provider-level acceptance.
8. Reconcile tracking until the expected status/status-type appears.
9. Update the internal order/shipment state based on the confirmed provider result—not merely the POST response.

## Safety and idempotency requirements

1. Treat cancellation as a high-impact external action and require explicit confirmation.
2. Do not retry an ambiguous timeout blindly; Delhivery may have accepted the cancellation.
3. Prevent duplicate pending cancellation requests for the same Waybill.
4. Do not release reserved inventory, refund payment, or notify the customer until business rules and confirmed courier state justify it.
5. A forward shipment changing to `RT` is a return-to-origin workflow, not an immediate completed cancellation/refund.
6. Keep provider status, status type, and internal status separately for auditability.
7. Audit actor, reason, Waybill, request time, provider response, and final reconciled state without logging the API token.

## Documentation gaps to resolve

The supplied material does not include:

- Submission success and error response schemas.
- Whether `cancellation` must be string `"true"` or boolean `true`.
- Exact status/status-type values returned immediately after submission.
- Cancellation behavior for REPL shipments after acceptance.
- Whether charges apply after pickup or while in transit.
- Whether cancellation can be reversed.
- Expected propagation time before tracking shows `UD`, `RT`, or `CN`.
- Idempotency behavior for repeated cancellation requests.
- Cancellation reason fields or required operational reason codes.

Obtain redacted staging responses for Manifested forward, In Transit forward, Scheduled RVP, REPL, terminal/ineligible status, duplicate request, and timeout reconciliation before production implementation.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 153.43 ms |
| P99 latency | 318 ms |
| Rate limit | 12,200 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. All tokens and Waybills shown here are placeholders; no live credentials are included.
