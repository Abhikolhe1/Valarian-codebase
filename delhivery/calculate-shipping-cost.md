# Calculate Shipping Cost

## Purpose

This API returns an estimated Delhivery shipping charge for a shipment. The returned amount is approximate and may differ from the final billed amount.

Do not use the estimate as an invoice, settlement record, or guaranteed courier charge. Store estimated and final charges separately.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoint

Use `GET` and supply shipment inputs through query parameters.

### Test

```text
GET https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json
```

### Production

```text
GET https://track.delhivery.com/api/kinko/v1/invoice/charges/.json
```

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `md` | String | Yes | Billing mode: `E` for Express or `S` for Surface. |
| `cgm` | Integer | Yes | Chargeable weight in grams. The supplied documentation says the default is zero, despite marking this parameter mandatory. |
| `o_pin` | Integer | Yes | Valid six-digit origin PIN code. |
| `d_pin` | Integer | Yes | Valid six-digit destination PIN code. |
| `ss` | String | Yes | Shipment status: `Delivered`, `RTO`, or `DTO`. |
| `pt` | String | Yes | Payment type: `Pre-paid` or `COD`. |
| `l` | Integer | No | Shipment length. Unit is not specified in the supplied documentation. |
| `b` | Integer | No | Shipment breadth. Unit is not specified in the supplied documentation. |
| `h` | Integer | No | Shipment height. Unit is not specified in the supplied documentation. |
| `ipkg_type` | String | No | Package type: `box` or `flyer`. |

Treat PIN codes as six-character strings inside the application even though the provider table calls them integers. This preserves validation rules and avoids accidental formatting changes.

## Example request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110053&o_pin=110042&cgm=10&pt=Pre-paid' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json'
```

URL-encode every query value rather than assembling the request URL with unescaped text.

## Integration requirements

1. Validate `md`, `ss`, `pt`, and `ipkg_type` against the exact supported values before calling Delhivery.
2. Validate both PIN codes as six-digit Indian PIN-code strings and check serviceability separately.
3. Require a positive chargeable weight for real estimates rather than relying on the documented zero default.
4. Confirm the units for `l`, `b`, and `h` before sending dimensions.
5. Determine chargeable weight using the contractually agreed comparison of actual and volumetric weight; this document does not define that formula or divisor.
6. Cache identical estimates for a short, documented period because the endpoint permits only 50 requests per five minutes per IP.
7. Use a timeout and asynchronous UI behavior appropriate for the documented 61.14-second P99 latency.
8. Never block confirmed order accounting indefinitely while waiting for a non-guaranteed estimate.
9. Store the request inputs, estimate, currency, taxes/surcharges breakdown, and calculation time when the response provides them.
10. Reconcile the estimate with the eventual courier invoice; never overwrite the final charge with a new estimate.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- Currency and tax/surcharge interpretation.
- Dimension units.
- Volumetric-weight formula and divisor.
- Meaning of the `DTO` status.
- Whether `cgm=0` is valid despite `cgm` being mandatory.
- Whether quoted charges depend on account contract, zone, fuel surcharge, COD amount, or minimum weight.
- Recommended timeout/retry behavior.

Obtain redacted staging examples for Express/Surface, prepaid/COD, RTO/DTO, and invalid inputs before implementing the parser or displaying totals to administrators.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 450.94 ms |
| P99 latency | 61.14 seconds |
| Rate limit | 50 requests per 5 minutes per IP |

The documented P99 is much higher than the average. Preserve it as supplied, but confirm with Delhivery whether `61.14s` is accurate or a documentation error before setting production timeouts.

## Source

Documented from Delhivery material supplied by the project owner. All tokens and request identifiers are placeholders; no live credentials are included.
