# Generate Shipping Label

## Purpose

This API generates a Delhivery shipping label for an existing shipment Waybill. Labels can also be downloaded manually from the Delhivery One panel.

For courier shipments, prefer Delhivery's official PDF (`pdf=true`) and print it unchanged. A custom application label should not replace the official courier label unless Delhivery has explicitly approved that format.

## Output modes

### Official PDF

Pass `pdf=true`. Delhivery returns an S3 link to the generated PDF. The official PDF cannot be customized.

### Custom label data

Pass `pdf=false`. Delhivery returns JSON that can be used to construct a custom label layout.

The supplied documentation says the JSON should be rendered into HTML “using encoding 128.” This most likely refers to a **Code 128 barcode**, not HTML text encoding. Confirm the exact barcode field/value and symbology with Delhivery before implementing custom rendering.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
```

Keep the token server-side and never commit, expose, or log it.

## Parameters

| Query parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `wbns` | String | Yes | Shipment Waybill. The supplied table calls this parameter `waybill`, but the documented endpoint and example use `wbns`. |
| `pdf` | Boolean | No | `true` returns an S3 link to the official PDF; `false` returns customizable JSON data. |
| `pdf_size` | String | No | `A4` for an 8x11/A4 label or `4R` for a 4x6 label. Defaults to A4 when omitted. |

Treat the Waybill as a string to preserve all digits and leading zeros.

The supplied document does not state what happens when `pdf` is omitted. Pass it explicitly.

## Endpoints

### Test

```text
GET https://staging-express.delhivery.com/api/p/packing_slip?wbns={waybill}&pdf=true&pdf_size={A4|4R}
```

### Production

```text
GET https://track.delhivery.com/api/p/packing_slip?wbns={waybill}&pdf=true&pdf_size={A4|4R}
```

## Example: official 4x6 PDF

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/api/p/packing_slip?wbns=<WAYBILL>&pdf=true&pdf_size=4R' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json'
```

## Recommended application flow

1. Create or manifest the Delhivery shipment and validate its Waybill.
2. Request `pdf=true` with the configured size, preferably `4R` for a 4x6 label printer.
3. Validate provider-level success and extract the returned label URL.
4. Download the PDF server-side using strict URL validation:
   - Require HTTPS.
   - Allow only the exact Delhivery-approved download host(s), confirmed from staging responses.
   - Reject redirects to unapproved hosts.
   - Enforce connection/read timeouts and a maximum response size.
   - Require a PDF content type and verify that the bytes begin with the PDF signature.
5. Store the verified PDF in private application storage and associate it with the shipment and Waybill.
6. Serve it through an authenticated admin endpoint with an attachment filename based on a sanitized Waybill.
7. Reprints should use the saved official PDF and must never create another shipment or allocate another Waybill.
8. If generation/download fails, show a retry action. Do not silently fall back to an application-created courier label.

## Custom-label requirements, if explicitly approved

If Delhivery approves `pdf=false` for this account and workflow:

1. Obtain the complete JSON response schema.
2. Identify the exact value to encode as the Code 128 barcode.
3. Preserve all routing/sort codes, payment indicators, addresses, return details, and courier-required text.
4. Escape all customer/provider text before rendering HTML.
5. Test barcode readability with the actual warehouse scanner and printer.
6. Obtain Delhivery approval for a sample label before production use.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- The exact S3-link response field.
- Approved download hostnames and URL expiry.
- Whether the link can be regenerated for an older manifested Waybill.
- Whether multiple comma-separated Waybills are supported by `wbns`.
- Whether label generation requires a particular shipment status.
- The complete `pdf=false` JSON schema and Code 128 source value.
- Maximum PDF size and retry/idempotency behavior.

Obtain redacted staging responses for `pdf=true`, `pdf=false`, invalid Waybill, and repeated generation before implementing the parser.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 210.64 ms |
| P99 latency | 61.78 seconds |
| Rate limit | 3,000 requests per 5 minutes per IP |

The documented P99 is much higher than the average. Preserve it as supplied, but confirm with Delhivery whether `61.78s` is accurate before choosing production timeouts.

## Source

Documented from Delhivery material supplied by the project owner. All tokens and Waybills shown here are placeholders; no live credentials are included.
