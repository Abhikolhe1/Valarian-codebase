# Webhooks

## Purpose

Delhivery B2C webhooks push real-time shipment updates and documents to client-controlled endpoints. They are an alternative or complement to polling the Shipment Tracking API.

Documented webhook capabilities include:

- Shipment status/scan push at the Waybill level.
- Proof-of-delivery (POD) document push.
- Sorter-image push.
- Reverse-pickup QC-image push.

## Separate webhook endpoints

Scan Push and Document Push are separate webhook integrations and cannot be combined into one endpoint. Use distinct URLs and processing paths, for example:

```text
POST /api/webhooks/delhivery/scans
POST /api/webhooks/delhivery/documents
```

These paths are illustrative application design only; they are not Delhivery endpoint names from the supplied documentation.

## Enablement process

Webhook enablement requires coordination with Delhivery:

1. Complete the relevant Delhivery Webhook Requirement Document.
2. Provide the Delhivery account name, client endpoint URL, and agreed authorization details.
3. Send it to `lastmile-integration@delhivery.com`, keeping the business account point of contact involved.
4. Complete Delhivery's technical testing.
5. Delhivery releases the webhook to production after successful testing.

Separate requirement documents are referenced for:

- Scan Push.
- POD Push.
- Sorter Image Push.
- QC Image Push.

Those documents were not included in the supplied material and are required before implementation.

## Shipment-status behavior

- Status updates are pushed at the individual Waybill level.
- Delhivery can push every status applied to an AWB in real time.
- Additional tracking fields or a custom payload mapping may be arranged with Delhivery.
- Forward, return, and reverse shipments have different status/status-type sets.

The supplied text introduces these status lists but does not contain the actual statuses or status types. Do not implement automated status mapping until those catalogues and sample payloads are available.

## Required webhook security contract

The supplied material says authorization details must be agreed during onboarding, but it does not define authentication or signature verification. Before exposing production endpoints, obtain and document:

- Authentication method, such as a signature, shared bearer token, or another supported mechanism.
- Signature algorithm, signed bytes, header names, timestamp, and verification examples if signatures are supported.
- Delhivery source IP ranges if IP allowlisting is supported.
- Retry schedule, timeout, and expected HTTP response.
- Event identifier or deduplication keys.
- Event ordering guarantees.
- Payload size and supported content types.
- Key/secret rotation procedure.

A static secret in a URL query parameter is not recommended. Use an HTTPS endpoint and the strongest Delhivery-supported request authentication.

## Processing requirements

1. Capture the raw request body before JSON parsing if signature verification uses raw bytes.
2. Authenticate every webhook before processing or persisting its contents.
3. Apply a strict payload-size limit and validate the complete schema.
4. Acknowledge valid events quickly and process business updates asynchronously when possible.
5. Make processing idempotent; duplicate delivery is normal webhook behavior.
6. Store a stable provider event/deduplication key or a deterministic payload fingerprint.
7. Handle out-of-order events without regressing shipment state.
8. Retain raw status codes/descriptions alongside the internal mapped status.
9. Reconcile unexpected gaps using the authenticated Shipment Tracking API.
10. Quarantine unknown statuses instead of guessing their meaning.
11. Rate-limit invalid requests without blocking legitimate Delhivery retries.
12. Log correlation metadata but redact credentials, signatures, customer details, and document URLs.

## Document-push security

POD, sorter, QC, return, and signature documents may contain sensitive personal data.

1. Validate whether the webhook contains bytes, metadata, or a remote URL.
2. For remote URLs, require HTTPS and allow only confirmed Delhivery-controlled hosts.
3. Reject redirects to unapproved hosts and private/internal network addresses.
4. Enforce content-type and maximum-size allowlists.
5. Scan or safely process downloaded files before exposing them.
6. Store documents privately with authorization based on the related order/Waybill.
7. Define retention and deletion periods appropriate to the document type and business/legal requirements.

## Status mapping requirements

Maintain separate, tested mappings for:

- Forward shipment states.
- Undelivered-return/RTO states.
- Reverse-pickup states.

Mapping must use the exact Delhivery status and status-type combination. Do not map solely by human-readable descriptions. Terminal states must not be overwritten by older or less advanced events unless a documented correction event permits it.

## Documentation gaps to resolve

The following referenced information is missing from the supplied material:

- Scan Push requirement document.
- POD Push requirement document.
- Sorter Image Push requirement document.
- QC Image Push requirement document.
- Sample JSON payloads for scans and every document type.
- Forward, return, and reverse status/status-type catalogues.
- Authentication/signature specification.
- Retry, timeout, deduplication, and ordering behavior.
- Required response body and HTTP status.
- Payload limits and document-delivery mechanism.

These details are blockers for a secure production webhook implementation.

## Source

Documented from Delhivery material supplied by the project owner. No endpoint credentials, webhook secrets, live payloads, or customer documents are included.
