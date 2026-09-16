# Shipment Updation/Edit API

## Purpose

This API edits a limited set of fields on an existing Delhivery shipment. Updates are accepted only while the shipment is in an eligible provider status.

This endpoint mutates an external shipment. Validate its current Delhivery status immediately before submitting an edit.

## Status eligibility

| Shipment flow | Payment mode | Editable statuses |
|---|---|---|
| Forward | `COD` or `Prepaid` | `Manifested`, `In Transit`, `Pending` |
| Reverse pickup (RVP) | `Pickup` | `Scheduled` |
| Replacement | `REPL` | `Manifested`, `In Transit`, `Pending` |

Editing is not allowed for dispatched or terminal states such as:

- `Delivered`
- `DTO`
- `RTO`
- `LOST`
- `Closed`

The supplied documentation permits editing in `In Transit` but also says editing is not allowed for any “Dispatched” status. Obtain Delhivery's precise status/status-type definitions rather than interpreting these English labels.

## Payment-mode conversion rules

| Existing mode | Requested mode | Allowed | Additional requirement |
|---|---|---:|---|
| `COD` | `Prepaid` | Yes | None documented. |
| `Prepaid` | `COD` | Yes | COD amount must be supplied. |
| `Prepaid` | `Prepaid` | No | Same-mode update is not allowed. |
| `COD` | `COD` | No | Same-mode update is not allowed. |
| `Prepaid` | `Pickup` | No | Cross-flow conversion is not allowed. |
| `Pickup` | `Prepaid` | No | Cross-flow conversion is not allowed. |
| `COD` | `Pickup` | No | Cross-flow conversion is not allowed. |
| `Pickup` | `COD` | No | Cross-flow conversion is not allowed. |
| `Prepaid` | `REPL` | No | Cross-flow conversion is not allowed. |
| `REPL` | `Prepaid` | No | Cross-flow conversion is not allowed. |
| `COD` | `REPL` | No | Cross-flow conversion is not allowed. |
| `REPL` | `COD` | No | Cross-flow conversion is not allowed. |

The supplied material does not explicitly state whether conversions involving `Pickup` and `REPL` directly are supported. Treat all undocumented conversions as disallowed.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`.

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
| `waybill` | String | Yes | Existing Waybill whose shipment must be updated. |
| `name` | String | No | Updated consignee name. |
| `phone` | List in supplied table | No | Updated consignee phone number. Confirm whether the API expects a string or list. |
| `pt` | String | No | Requested payment mode. Confirm exact accepted values, including whether prepaid is `Prepaid` or `Pre-paid`. |
| `add` | String | No | Updated consignee address. |
| `products_desc` | String | No | Updated product description. |
| `gm` | Float | No | Updated shipment weight in grams. |
| `shipment_height` | Float | No | Updated shipment height in centimetres. |
| `shipment_width` | Float | No | Updated shipment width in centimetres. |
| `shipment_length` | Float | No | Updated shipment length in centimetres. |
| `cod` | Undocumented; shown in sample | Conditional | COD amount shown in the example and required for Prepaid-to-COD conversion. Confirm its formal type and name. |

Treat the Waybill and phone number as strings. Require positive finite values for weight and dimensions.

## Normalized example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/api/p/edit' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "waybill": "<WAYBILL>",
    "pt": "COD",
    "cod": 100,
    "shipment_height": 40.2,
    "gm": 100.2
  }'
```

The source sample uses `"pt": "COD/Pre-paid"`, which appears to show alternatives rather than a valid literal value. Send one confirmed enum value only.

## Recommended application flow

1. Authenticate and authorize the administrator.
2. Load the shipment and verify that the Waybill belongs to the intended order.
3. Fetch fresh Delhivery tracking status rather than relying on stale local status.
4. Validate flow/status eligibility and acquire a shipment-level update lock.
5. Allow only documented fields and validate every supplied value.
6. Apply the payment conversion matrix; require a positive COD amount for Prepaid-to-COD.
7. Show current and proposed values for confirmation.
8. Submit the edit once and verify provider-level success.
9. Re-fetch/reconcile shipment data before committing the local update if the provider supports retrieval.
10. Keep an immutable audit record of previous/requested/provider-confirmed values.

## Safety and consistency requirements

1. Do not let browser input choose an arbitrary Waybill without verifying order ownership/authorization.
2. Do not permit fields outside the documented allowlist.
3. Treat timeouts as ambiguous; reconcile before retrying because Delhivery may have applied the edit.
4. Prevent concurrent shipment edit, cancellation, NDR, and pickup operations from racing.
5. If an address/PIN changes, recheck PIN serviceability and confirm whether the existing routing/charge/label must be regenerated.
6. If weight/dimensions change, treat the previous shipping-cost estimate as stale.
7. If payment mode changes, regenerate or retrieve the official label if Delhivery requires updated payment markings.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- Exact provider status/status-type combinations that permit editing.
- Resolution of `In Transit` versus “Dispatched” wording.
- Formal `cod` parameter name, type, and amount constraints.
- Exact `pt` enum spelling (`Prepaid` versus `Pre-paid`).
- Whether `phone` is a string or list.
- Behavior of omitted fields and whether null/empty strings clear values.
- Whether changing address/PIN triggers rerouting, repricing, or label regeneration.
- Idempotency/reconciliation behavior after timeouts.

Obtain redacted staging responses for every allowed payment conversion, an address/PIN update, invalid status, same-mode conversion, terminal shipment, and repeated request before production implementation.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 153.43 ms |
| P99 latency | 318 ms |
| Rate limit | 12,200 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. All tokens, Waybills, addresses, and contact details shown here are placeholders; no live credentials are included.
