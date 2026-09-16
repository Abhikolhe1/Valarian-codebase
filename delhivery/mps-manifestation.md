# MPS Manifestation

## Purpose

MPS (Multi-Package Shipment) represents one order shipped in multiple boxes. Every box receives a unique Waybill. One is the master Waybill and the others are child Waybills.

MPS uses the standard shipment-creation endpoint but adds MPS fields to every entry in the `shipments` array.

## Requirements

- For an order with `N` boxes, include all `N` box records in one `shipments` array.
- Prefetched Waybills are mandatory for every box. See [fetch-bulk-waybills.md](./fetch-bulk-waybills.md) or [fetch-single-waybill.md](./fetch-single-waybill.md).
- Every box has a unique `waybill`.
- The same master Waybill is passed in `master_id` for every box, including the master record.
- Pass `shipment_type: "MPS"` for every box.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
Accept: application/json
```

Keep the token server-side and never commit or log it.

## Endpoints

### Test

```text
POST https://staging-express.delhivery.com/api/cmu/create.json
```

### Production

```text
POST https://track.delhivery.com/api/cmu/create.json
```

## MPS-specific parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `mps_amount` | Integer | Yes | Sum of all package amounts for COD; use zero for prepaid. |
| `mps_children` | Integer | Yes | Total number of packages, including the master and all child packages. |
| `master_id` | Integer in supplied table | Yes | Master Waybill passed for every box. Treat as a string in application code to preserve all digits and leading zeros. |
| `shipment_type` | String | Yes | Must be `MPS`. |
| `waybill` | String | Yes | Unique prefetched Waybill for this box. |

The supplied table calls `master_id` an integer, but Waybills are identifiers and the sample represents them as strings. The integration should not perform arithmetic on them or coerce them to JavaScript numbers.

## Supplied two-box example

```json
{
  "pickup_location": {"name": "warehouse_name"},
  "shipments": [
    {
      "order": "123456",
      "weight": "100",
      "mps_amount": "0",
      "mps_children": "2",
      "pin": "122002",
      "products_desc": "Toys, ToyCar",
      "add": "Test Address",
      "shipment_type": "MPS",
      "state": "TAMIL NADU",
      "master_id": "<MASTER_WAYBILL>",
      "city": "CHENNAI",
      "waybill": "<MASTER_WAYBILL>",
      "phone": "9999888800",
      "payment_mode": "Prepaid",
      "name": "Test Name",
      "total_amount": "4250",
      "country": "India"
    },
    {
      "order": "123456",
      "weight": "100",
      "mps_amount": "0",
      "mps_children": "2",
      "pin": "122002",
      "products_desc": "Product description",
      "add": "Consignee Address",
      "shipment_type": "MPS",
      "state": "HARYANA",
      "master_id": "<MASTER_WAYBILL>",
      "city": "GURUGRAM",
      "waybill": "<CHILD_WAYBILL>",
      "phone": "9999888800",
      "payment_mode": "Prepaid",
      "name": "Consignee Name",
      "total_amount": "4250",
      "country": "India"
    }
  ]
}
```

The supplied source sample used different Order IDs and consignee locations across its two boxes. The normalized example above assumes all boxes belong to one logical order and destination. Confirm Delhivery's exact Order-ID convention for MPS before implementation.

## Integration requirements

1. Atomically reserve `N` unused prefetched Waybills before constructing the request.
2. Select one reserved Waybill as the master and reference it from every box.
3. Ensure all Waybills are unique and `mps_children` equals the array length.
4. For COD, confirm whether `mps_amount` is repeated unchanged on every box and how `total_amount` should be distributed.
5. On failure, do not release or reuse Waybills until their provider state is reconciled.
6. Store the master/child relationship in the database.
7. Treat Waybills as strings.

The supplied documentation does not include a response schema, partial-success behavior, retry/idempotency behavior, or the precise COD amount rules. Obtain redacted staging examples for successful, fully failed, and partially accepted MPS requests before implementing this flow.

## Source

Documented from Delhivery material supplied by the project owner. Example identities and Waybills are placeholders; no live credentials are included.
