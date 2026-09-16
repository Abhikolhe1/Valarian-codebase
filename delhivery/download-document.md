# Download Document API

## Purpose

This API retrieves supported documents associated with Delhivery B2C shipments.

The supplied documentation says it retrieves documents that are “not archived” in Delhivery. Confirm the exact retention/archive meaning and availability window before relying on this endpoint for historical records.

## Supported document types

| `doc_type` | Document |
|---|---|
| `SIGNATURE_URL` | Delivery signature document/image URL. |
| `RVP_QC_IMAGE` | Reverse-pickup quality-check image. |
| `EPOD` | Electronic proof of delivery. |
| `SELLER_RETURN_IMAGE` | Seller-return image. |

Use an explicit allowlist containing only these exact values. Do not forward arbitrary document-type strings to Delhivery.

## Authentication

The supplied example includes both:

```http
Authorization: Token <DELHIVERY_API_TOKEN>
Cookie: sessionid=<SESSION_ID>
```

The parameter documentation does not explain whether the session cookie is required. Prefer token-only server authentication if supported. Do not copy a browser session cookie into application configuration or source code. Confirm the contract in staging before implementing cookie handling.

## Parameters

| Parameter | Type in supplied table | Mandatory | Description |
|---|---|---:|---|
| `doc_type` | Varchar | Yes | One supported document-type value. |
| `waybill` | Integer | Yes | Delhivery shipment Waybill. |

Treat the Waybill as a string in application code to preserve all digits and leading zeros.

## HTTP method and endpoints

Use `GET`.

### Test

```text
GET https://staging-express.delhivery.com/api/rest/fetch/pkg/document/?doc_type={doc_type}&waybill={waybill}
```

### Production

```text
GET https://track.delhivery.com/api/rest/fetch/pkg/document/?doc_type={doc_type}&waybill={waybill}
```

## Example request

```bash
curl --request GET \
  --url 'https://staging-express.delhivery.com/api/rest/fetch/pkg/document/?doc_type=EPOD&waybill=<WAYBILL>' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>'
```

The session cookie is intentionally omitted from this normalized example until Delhivery confirms it is required for API clients.

## Recommended application flow

1. Authenticate the requesting application user.
2. Confirm that the Waybill belongs to an order the user is authorized to access.
3. Validate `doc_type` against the fixed allowlist.
4. Call Delhivery server-side using the account token.
5. Validate provider-level success and parse the documented response field.
6. If the response contains a download URL, validate and fetch it securely or proxy it through an authenticated endpoint.
7. Apply appropriate retention and access controls for proof-of-delivery, signature, and QC evidence.

## Document-download security

These documents may contain signatures, addresses, customer images, or delivery evidence and must be treated as sensitive personal data.

1. Never expose the Delhivery API token or session cookie to the browser.
2. Require order ownership for customers and explicit shipment/document permission for administrators.
3. Prevent insecure direct object reference by checking the Waybill-to-order relationship on every request.
4. If Delhivery returns a URL, require HTTPS and allow only confirmed Delhivery-controlled hosts.
5. Reject redirects to unapproved hosts and private/internal network addresses.
6. Enforce connection/read timeouts, response-size limits, and an allowlist of expected document content types.
7. Send `Content-Disposition` safely with a sanitized filename.
8. Use `Cache-Control: private, no-store` unless a documented encrypted-storage policy permits caching.
9. Audit access without logging full URLs, tokens, session IDs, or document contents.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- Whether the result is document bytes, a URL, or a list.
- Whether the cookie is required in addition to token authentication.
- Download URL hostnames, expiry, and signing behavior.
- Document retention/archive period.
- Behavior when multiple documents exist for one type and Waybill.
- MIME types, file-size limits, and document timestamps.
- Rate limit and latency information.

Obtain redacted staging responses for every supported document type, missing document, invalid Waybill, unauthorized request, and expired link before implementing the parser.

## Source

Documented from Delhivery material supplied by the project owner. All tokens, session IDs, and Waybills shown here are placeholders; no live credentials are included.
