# E-Waybill Update

## Purpose

This API updates the E-Way Bill associated with an existing Delhivery shipment.

According to the supplied Delhivery documentation, an E-Way Bill contains transportation details such as the goods, declared value, sender, receiver, and route. Use this API for shipments whose value exceeds INR 50,000 when an E-Way Bill is required under applicable Indian law.

- For a shipment in forward flow, the API updates its forward E-Way Bill.
- For a shipment in return flow, the API updates its return E-Way Bill.

Tax and E-Way Bill requirements can change and may depend on the transaction. The application should not treat this API reference as legal or tax advice; operational rules should be confirmed with the responsible tax professional.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit or log it.

## HTTP method and endpoints

Use `PUT`. Replace `{waybill}` with the Delhivery Waybill belonging to the shipment.

### Test

```text
PUT https://staging-express.delhivery.com/api/rest/ewaybill/{waybill}/
```

### Production

```text
PUT https://track.delhivery.com/api/rest/ewaybill/{waybill}/
```

## Parameters

### Path parameter

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `waybill` | String | Yes | Existing Delhivery Waybill whose forward or return E-Way Bill must be updated. |

### Request body

The payload wraps one or more records in `data`:

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `dcn` | Varchar | Yes | Invoice number associated with the shipment. |
| `ewbn` | Varchar | Yes | E-Way Bill number to associate with the shipment. |

Treat `waybill`, `dcn`, and `ewbn` as strings. They are identifiers, not values for arithmetic, and string handling preserves leading zeros.

## Example request

```bash
curl --request PUT \
  --url 'https://staging-express.delhivery.com/api/rest/ewaybill/<WAYBILL>/' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": [
      {
        "dcn": "<INVOICE_NUMBER>",
        "ewbn": "<EWAY_BILL_NUMBER>"
      }
    ]
  }'
```

## Integration requirements

1. Confirm that the Waybill belongs to the intended shipment before sending the update.
2. Validate that the invoice number and E-Way Bill number are present and stored as strings.
3. Confirm whether the shipment is in forward or return flow so the operator understands which E-Way Bill will be changed.
4. Restrict this operation to authorized administrators and create an audit record without exposing the API token.
5. Do not log the full E-Way Bill number unless operational policy explicitly permits it; mask sensitive identifiers in normal logs.
6. Verify provider-level success in the response before marking the update complete locally.
7. Treat timeouts as ambiguous. Check the current shipment state before retrying, because the first update may have succeeded.

The supplied documentation does not include success/error response schemas, whether multiple objects in `data` are supported for one Waybill, allowed identifier formats, shipment-status restrictions, or a read API for reconciliation. Obtain redacted staging responses for successful, rejected, and already-updated cases before implementing the parser and retry policy.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 327.6 ms |
| P99 latency | 501.68 ms |
| Rate limit | 250 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. All identifiers and tokens shown here are placeholders; no live credentials are included.
