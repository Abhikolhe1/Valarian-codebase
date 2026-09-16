# B2C Pincode Serviceability

## Purpose

This API checks whether a consignee PIN code is serviceable by Delhivery.

Check serviceability before creating an order or calling any later shipment API. If the response contains an empty list, treat the PIN code as non-serviceable (`NSZ`).

If `filter_codes` is omitted, the API returns both serviceable and embargoed PIN codes. In the response:

- `remark: "Embargo"` means the PIN code is temporarily non-serviceable.
- A blank `remark` means the PIN code is serviceable.

## Authentication

Send the Delhivery API token in the request header:

```http
Authorization: Token <DELHIVERY_API_TOKEN>
```

Never commit a real API token to source control or documentation.

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `filter_codes` | Integer | No | PIN code to check. Pass one PIN code at a time. |

Although the supplied parameter table marks `filter_codes` as optional, the integration should always send it when checking a checkout or order destination.

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes={pin_code}
```

### Production

```text
GET https://track.delhivery.com/c/api/pin-codes/json/?filter_codes={pin_code}
```

## Example request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes=194103' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>'
```

## Serviceability decision

1. Send exactly one six-digit Indian PIN code using `filter_codes`.
2. If the returned list is empty, classify it as non-serviceable (`NSZ`).
3. If the matching record has `remark` equal to `Embargo`, classify it as temporarily non-serviceable.
4. If the matching record has a blank `remark`, classify it as serviceable.
5. Do not interpret network failures, timeouts, authentication failures, rate limits, or malformed responses as proof that a PIN code is non-serviceable.

The supplied documentation does not include the complete success/error response schema. Capture and document redacted staging responses before implementing the parser.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 86.02 ms |
| P99 latency | 98.22 ms |
| Rate limit | 4,500 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. No credentials or live customer data are included in this file.
