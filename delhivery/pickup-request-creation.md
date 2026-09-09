# Pickup Request Creation

## Purpose

This API requests collection from a registered Delhivery warehouse after shipments have been manifested, packed, labelled, and are ready to be handed to the Delhivery field executive (FE).

Integration is optional. Pickups can also be created in the Delhivery One panel, and Delhivery can enable account-level auto-pickup with assistance from the account point of contact.

## Pickup grouping rules

- A pickup request belongs to a warehouse location, not to an individual Waybill.
- Create one pickup request for all ready packages at the same warehouse.
- Do not create one pickup request per Waybill.
- Create separate pickup requests when packages are held at different warehouse locations.
- On a given day, another pickup request for the same warehouse can be raised only after the existing request is closed.
- Raise the request only when the physical packages are packed and ready for handover.

Every package must carry the required shipping label, including the delivery address, a scannable tracking-number barcode, and other courier-required routing/shipment details. For Delhivery shipments, use the official label flow described in [generate-shipping-label.md](./generate-shipping-label.md).

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`.

### Test

```text
POST https://staging-express.delhivery.com/fm/request/new/
```

### Production

```text
POST https://track.delhivery.com/fm/request/new/
```

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `pickup_time` | String | Yes | Requested pickup time in `HH:mm:ss` format. |
| `pickup_date` | String | Yes | Requested pickup date in `YYYY-MM-DD` format. |
| `pickup_location` | String | Yes | Registered Delhivery warehouse/pickup-location name. |
| `expected_package_count` | Integer | Yes | Number of physical packages ready for collection. |

Use the exact warehouse name registered with Delhivery. The shipment-creation documentation states that warehouse names are case- and whitespace-sensitive.

For MPS shipments, `expected_package_count` should represent physical boxes rather than logical orders. Confirm this interpretation with a redacted staging response before implementation.

## Example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/fm/request/new/' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "pickup_time": "11:00:00",
    "pickup_date": "2023-12-29",
    "pickup_location": "warehouse_name",
    "expected_package_count": 1
  }'
```

## Recommended application flow

1. Manifest all applicable shipments successfully.
2. Pack every physical parcel and attach its verified official Delhivery label.
3. Group ready parcels by registered warehouse.
4. Count physical packages, including each box in an MPS shipment.
5. Check whether the warehouse already has an open pickup request for the requested day.
6. Create one pickup request for that warehouse and package count.
7. Store the provider pickup/request identifier and status.
8. Prevent duplicate submissions while the first request is pending or open.
9. Allow another same-day request only after the existing warehouse request is confirmed closed.

## Integration requirements

1. Validate the date and time formats before calling Delhivery.
2. Confirm the timezone used by `pickup_date` and `pickup_time`; the supplied documentation does not specify it.
3. Reject dates/times that are in the past according to the confirmed warehouse/provider timezone.
4. Require a positive integer `expected_package_count` and derive it from ready physical packages.
5. Use a warehouse-level lock or uniqueness rule to avoid concurrent duplicate pickup requests.
6. Verify provider-level success before recording a pickup as requested.
7. Treat timeouts as ambiguous: reconcile pickup status before retrying because the provider may have accepted the request.
8. Do not automatically create a second request just because a previous API call timed out.
9. Record changes to expected package count separately if Delhivery supports modifications; this document does not define an update API.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- Pickup request identifier and status fields.
- Warehouse/provider timezone.
- Daily cutoff and allowed pickup windows.
- Definition of closed and an API for checking closure.
- Cancellation, update, or status-query endpoints.
- Partial pickup and package-count mismatch handling.
- Idempotency/reconciliation behavior after a timeout.
- Confirmation that MPS boxes, rather than logical orders, determine `expected_package_count`.

Obtain redacted staging responses for success, invalid warehouse, duplicate/open pickup, missed cutoff, and repeated submission before implementing automatic pickup creation.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 242.37 ms |
| P99 latency | 885.95 ms |
| Rate limit | 4,000 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. All tokens, warehouse names, and dates shown here are placeholders; no live credentials are included.
