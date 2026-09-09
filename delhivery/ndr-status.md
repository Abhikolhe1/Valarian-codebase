# GET NDR Status API

## Purpose

This API checks the asynchronous processing status of an NDR action using the UPL ID returned by the [NDR Action API](./ndr-action.md).

The NDR POST response only acknowledges/submits the work. The result from this API determines whether Delhivery processed the requested `RE-ATTEMPT` or `PICKUP_RESCHEDULE` action.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoint

Use `GET`. Replace `{upl_id}` with the UPL/request ID returned from NDR submission.

### Production

```text
GET https://track.delhivery.com/api/cmu/get_bulk_upl/{upl_id}?verbose=true
```

The supplied documentation does not provide a test-environment endpoint. Do not assume that replacing the host with `staging-express.delhivery.com` is supported; confirm it with Delhivery.

## Path/query parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `upl_id` | String | Yes | UPL/request ID returned by the NDR Action API. |
| `verbose` | Boolean | Shown in example | Requests detailed processing output when `true`. Exact behavior is undocumented in the supplied text. |

Treat the UPL ID as an opaque string and validate its maximum length/allowed characters after Delhivery provides the formal schema.

## Example request

```bash
curl --request GET \
  --url 'https://track.delhivery.com/api/cmu/get_bulk_upl/<UPL_ID>?verbose=true' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json'
```

## Recommended polling flow

1. Read the persisted pending NDR action and its UPL ID.
2. Poll this endpoint using bounded exponential backoff with jitter.
3. Validate the provider response schema and correlate results to the expected UPL ID, Waybill, and action.
4. Continue polling only while the documented provider state is non-terminal.
5. On confirmed success, update the local NDR action and then reconcile shipment tracking.
6. On confirmed failure, store the provider reason and show an actionable admin message.
7. Stop after a configured maximum duration and mark the action `status_unknown`, not failed.

## Processing requirements

1. Do not poll on every customer page load; use a server-side worker/cron and cache the latest status.
2. Deduplicate concurrent polls for the same UPL ID.
3. Do not infer success from HTTP 200 alone.
4. Do not submit a replacement NDR action merely because status polling timed out.
5. Store the raw provider state/reason and the internal mapped state separately.
6. Treat unknown states as pending/manual review until documented.
7. Audit terminal state changes without logging credentials or unnecessary customer data.

## Documentation gaps to resolve

The supplied material does not include:

- Test-environment URL.
- Status response schema and terminal state values.
- Error response schema.
- Meaning and necessity of `verbose=true`.
- Recommended initial delay, polling interval, and maximum processing time.
- Result correlation for bulk/partial NDR submissions.
- Result retention period for UPL IDs.
- Rate limits; `NA` must not be interpreted as unlimited.
- Recommended request timeout despite the documented 88.03-second P99.

Obtain redacted responses for pending, successful, failed, unknown UPL, expired UPL, and mixed/partial results before implementing the status parser.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 75.03 ms |
| P99 latency | 88.03 seconds |
| Rate limit | `NA` in supplied documentation; limit is unspecified, not necessarily unlimited. |

The documented P99 is extremely high compared with the average. Confirm it before selecting production request and polling timeouts.

## Source

Documented from Delhivery material supplied by the project owner. All tokens and UPL IDs shown here are placeholders; no live credentials are included.
