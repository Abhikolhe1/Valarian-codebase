# Shipment Tracking

## Purpose

This API returns a shipment's current status and the detailed history of scans applied by Delhivery.

The supplied documentation states that tracking can use either:

- A Delhivery Waybill number through `waybill`.
- The client's Order ID through `ref_ids`.

Up to 50 Waybill numbers may be tracked in one request by passing a comma-separated list.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
```

Keep the token server-side and never commit, expose, or log it.

## Parameters

| Parameter | Type | Mandatory in supplied table | Description |
|---|---|---:|---|
| `waybill` | String | Yes | One Waybill or up to 50 comma-separated Waybill numbers. |
| `ref_ids` | String | No | Client Order ID/reference used to find a shipment. |

The prose says that either Waybill or Order ID may be used, while the parameter table marks `waybill` as mandatory. Confirm with a staging request whether `ref_ids` works when `waybill` is omitted or blank. Until confirmed, the integration should prefer Waybill-based tracking after shipment creation.

Treat Waybills and Order IDs as strings to preserve leading zeros and avoid numeric precision problems.

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/api/v1/packages/json/?waybill={waybill_numbers}&ref_ids={order_id}
```

### Production

```text
GET https://track.delhivery.com/api/v1/packages/json/?waybill={waybill_numbers}&ref_ids={order_id}
```

Normally send either `waybill` or `ref_ids`, not conflicting values for both, unless Delhivery confirms their combined semantics.

## Example request by Waybill

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/api/v1/packages/json/?waybill=1122345678722&ref_ids=' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json'
```

## Example batched request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/api/v1/packages/json/?waybill=<WAYBILL_1>,<WAYBILL_2>,<WAYBILL_3>' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>'
```

Do not exceed 50 Waybills in one request. URL-encode query values when constructing requests.

## Integration requirements

1. Prefer Waybill tracking after the shipment has been created and its Waybill stored.
2. Validate that a batch contains from 1 through 50 unique Waybill strings.
3. Deduplicate tracking requests and cache recent results to remain below the provider rate limit.
4. Map Delhivery scan codes/descriptions to internal statuses only through an explicit, tested mapping table.
5. Store the raw courier status and description alongside the mapped internal status for diagnosis.
6. Make scan ingestion idempotent so repeated polling does not duplicate tracking events.
7. Do not regress a shipment from a terminal or later status because an older scan appears in a later response.
8. Parse timestamps with their documented timezone. The supplied material does not specify one, so do not assume local time.
9. Treat network/authentication failures as tracking temporarily unavailable, not as shipment loss or cancellation.
10. Do not expose other customers' tracking data through Order-ID lookups; authenticated application endpoints must enforce order ownership or admin authorization.

The supplied documentation does not include the response schema, status/scan-code catalogue, timezone rules, proof-of-delivery fields, error format, or behavior for mixed valid and invalid Waybills. Obtain redacted staging examples before implementing response parsing and status automation.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 130.31 ms |
| P99 latency | 529.15 ms |
| Rate limit | 750 requests per 5 minutes per IP |
| Maximum batch size | 50 Waybills per request |

## Source

Documented from Delhivery material supplied by the project owner. All tokens and identifiers shown here are placeholders; no live credentials are included.
