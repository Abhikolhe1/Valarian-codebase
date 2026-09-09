# Heavy Product Pincode Serviceability

## Purpose

This API validates PIN-code serviceability for Delhivery accounts whose product type is `Heavy`.

- An `NSZ` response means the PIN code is not serviceable.
- The response's `payment_type` indicates serviceability for the corresponding payment mode.

Use this endpoint only when the Delhivery account or shipment uses the Heavy product type. Standard B2C shipments should use the B2C PIN-code serviceability endpoint documented in [b2c-pincode-serviceability.md](./b2c-pincode-serviceability.md).

## Authentication

Send the Delhivery API token in the request header:

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
```

Never commit a real API token to source control or documentation.

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `pincode` | Integer | Yes | PIN code to check. Pass one PIN code at a time. |
| `product_type` | Varchar | Yes | Product type for the account; pass `Heavy`. |

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode={pin_code}
```

### Production

```text
GET https://track.delhivery.com/api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode={pin_code}
```

## Example request

```bash
curl --request GET \
  --url 'https://track.delhivery.com/api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode=400086' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>'
```

## Serviceability decision

1. Send exactly one PIN code and `product_type=Heavy`.
2. Treat an explicit `NSZ` result as non-serviceable.
3. Evaluate `payment_type` before allowing the requested prepaid or COD payment mode.
4. Do not interpret network failures, timeouts, authentication failures, rate limits, or malformed responses as `NSZ`.

The supplied documentation does not include the complete response schema or the exact `payment_type` values. Capture and document redacted staging responses before implementing the parser.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 75.89 ms |
| P99 latency | 77.77 ms |
| Rate limit | 3,000 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. No credentials or live customer data are included in this file.
