# Client Warehouse Update

## Purpose

This API updates permitted details of an existing Delhivery warehouse/pickup location.

- The registered warehouse name cannot be changed.
- The existing exact warehouse name must be supplied to identify the warehouse.
- Only `address`, `pin`, and `phone` are documented as updateable.

For registration requirements, see [client-warehouse-creation.md](./client-warehouse-creation.md).

## Exact-name requirement

The `name` identifies the registered warehouse and is immutable through this API. Use the exact spelling, capitalization, spacing, and punctuation stored after registration.

Do not derive this value from an editable internal display name.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`. This operation changes an existing location in the external Delhivery account.

### Test

```text
POST https://staging-express.delhivery.com/api/backend/clientwarehouse/edit/
```

### Production

```text
POST https://track.delhivery.com/api/backend/clientwarehouse/edit/
```

## Parameters

| Parameter | Type | Mandatory in supplied table | Description |
|---|---|---:|---|
| `name` | String | Yes | Exact registered warehouse name whose details must be updated. It cannot itself be changed. |
| `address` | String | No | New warehouse address. |
| `pin` | String | Yes | Warehouse PIN code. |
| `phone` | String | No | New warehouse contact phone number. |

The supplied table marks `pin` as mandatory, but its example omits `pin`. Until confirmed through staging, include the current or updated valid PIN code in every request.

Treat PIN codes and phone numbers as strings.

## Example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/api/backend/clientwarehouse/edit/' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "registered_wh_name",
    "phone": "9999999999",
    "address": "HUDA Market, Gurugram, Haryana - 122001",
    "pin": "122001"
  }'
```

Example values are placeholders. The original supplied example contained a masked phone number and no `pin`; a real request must use valid values accepted by Delhivery.

## Recommended application flow

1. Restrict external warehouse updates to an authorized administrator.
2. Load the stored exact Delhivery warehouse name; do not accept an arbitrary unverified name from the browser.
3. Display the current and proposed values for confirmation.
4. Validate the full address, PIN code, and phone number.
5. Check whether pending/manifested shipments or open pickups are affected by a location change.
6. Submit only supported fields, including `name` and—until clarified—`pin`.
7. Verify provider-level success.
8. Update the local warehouse record only after confirmed external success, while retaining an audit record of previous values.

## Integration requirements

1. Never attempt to rename a Delhivery warehouse with this API.
2. Do not trigger production warehouse updates automatically during application startup or deployment.
3. Require deliberate administrator confirmation because the operation affects future pickups and returns.
4. Use optimistic locking or another concurrency guard so two admins cannot overwrite each other's changes.
5. Treat timeouts as ambiguous and retrieve/reconcile warehouse details before retrying.
6. Preserve sandbox and production warehouse mappings separately.
7. Avoid logging complete addresses and phone numbers unnecessarily.
8. Audit the administrator, timestamp, previous values, requested values, and provider result without logging the API token.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- Whether `pin` is actually required for every update.
- Whether omitted optional fields remain unchanged or are cleared.
- Warehouse retrieval/listing API needed for reconciliation.
- Address, PIN-code, and phone validation constraints.
- Whether return-address fields can be updated through another endpoint.
- Restrictions when shipments or pickup requests already reference the warehouse.
- Idempotency behavior after an ambiguous timeout.

Obtain redacted staging responses for address-only, phone-only, PIN-change, missing-PIN, unknown-name, and repeated requests before implementing production updates.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 345.65 ms |
| P99 latency | 61.16 seconds |
| Rate limit | 10 requests per minute per IP |

The documented P99 is much higher than the average. Preserve it as supplied, but confirm with Delhivery whether `61.16s` is accurate before selecting production timeouts.

## Source

Documented from Delhivery material supplied by the project owner. All credentials, warehouse data, addresses, and contact details shown here are placeholders; no live credentials are included.
