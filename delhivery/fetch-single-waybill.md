# Fetch Single Waybill

## Purpose

This API allocates one Delhivery Waybill number each time it is called. The allocated number can subsequently be used during shipment creation or manifestation.

Fetching a Waybill allocates an identifier; it does not by itself document shipment manifestation, label generation, or pickup registration.

## Authentication

The supplied documentation requires the account token in the URL query string:

```text
token=<DELHIVERY_API_TOKEN>
```

Query-string credentials can appear in access logs, monitoring tools, proxies, and error reports. The integration must redact the `token` query parameter from logs and must never persist or expose a request URL containing its real value.

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `token` | String | Yes | Delhivery account token. |

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/waybill/api/fetch/json/?token={token}
```

### Production

```text
GET https://track.delhivery.com/waybill/api/fetch/json/?token={token}
```

## Example request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/waybill/api/fetch/json/?token=<DELHIVERY_API_TOKEN>' \
  --header 'Accept: application/json'
```

## Integration requirements

1. Keep the token server-side and redact it from all request/error logs.
2. Store the returned Waybill uniquely before associating it with a shipment.
3. Use an idempotency or reconciliation strategy for timeouts because the call may allocate a Waybill even when the response is lost.
4. Do not retry an ambiguous allocation blindly.
5. Track whether an allocated Waybill is available, reserved, manifested, used, or invalid.

The supplied documentation does not include the response schema, error format, Waybill expiry, or reconciliation API. Obtain redacted staging responses before implementing the parser and retry behavior.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 69.84 ms |
| P99 latency | 94.02 ms |
| Rate limit | 750 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. No credentials or live customer data are included in this file.
