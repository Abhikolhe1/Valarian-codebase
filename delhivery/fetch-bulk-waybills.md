# Fetch Bulk Waybills

## Purpose

This API allocates Delhivery Waybill numbers in advance. Store the allocated numbers securely and use them later when creating or manifesting shipments.

- A single request can fetch up to 10,000 Waybills.
- A maximum of 50,000 Waybills can be fetched within five minutes.
- Exceeding the five-minute limit throttles the calling IP for one minute.
- Delhivery generates Waybills internally in batches of 25. Newly fetched numbers may occasionally fail if used immediately, so store them and use them later during manifest creation.

Fetching a Waybill allocates an identifier; it does not by itself document shipment manifestation, label generation, or pickup registration.

## Authentication

The supplied example sends the account token in the URL query string:

```text
token=<DELHIVERY_API_TOKEN>
```

Query-string credentials can appear in access logs, monitoring tools, proxies, and error reports. The integration must redact the `token` query parameter from logs and must never persist or expose a request URL containing its real value.

The supplied parameter table lists only `count`, while the request example also includes `token`. Confirm with Delhivery whether the token is always required as a query parameter or whether an `Authorization` header is supported.

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `count` | Integer | Yes | Number of Waybills to allocate. Must be from 1 through 10,000. |
| `token` | String | Present in example; not listed in supplied table | Delhivery account token. Confirm the supported authentication contract. |

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/waybill/api/bulk/json/?token={token}&count={count}
```

### Production

```text
GET https://track.delhivery.com/waybill/api/bulk/json/?token={token}&count={count}
```

## Example request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/waybill/api/bulk/json/?token=<DELHIVERY_API_TOKEN>&count=5' \
  --header 'Accept: application/json'
```

## Integration requirements

1. Validate `count` as an integer from 1 through 10,000 before calling Delhivery.
2. Enforce an application-side allocation budget below 50,000 Waybills per five minutes per outbound IP.
3. Store each returned Waybill uniquely and record whether it is available, reserved, manifested, used, or invalid.
4. Reserve a stored Waybill atomically so concurrent order creation cannot use the same number.
5. Do not make newly allocated Waybills immediately available if a short settling period is required. The supplied documentation does not specify the duration; confirm it with Delhivery.
6. Treat timeouts and ambiguous responses carefully because the provider may have allocated Waybills even when the client did not receive the response.
7. Never retry a bulk allocation blindly after an ambiguous failure; reconcile first to prevent unused or untracked allocations.

The supplied documentation does not include the response schema, error format, settling duration, Waybill expiry, or reconciliation API. Obtain redacted staging responses before implementing persistence and parsing.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 129.84 ms |
| P99 latency | 154.02 ms |
| Request rate limit | 5 requests per 5 minutes per IP |
| Allocation limit | 50,000 Waybills per 5 minutes |
| Throttle duration after exceeding allocation limit | 1 minute |

## Source

Documented from Delhivery material supplied by the project owner. No credentials or live customer data are included in this file.
