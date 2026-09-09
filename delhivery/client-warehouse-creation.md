# Client Warehouse Creation

## Purpose

This API registers a warehouse/pickup location in Delhivery. A warehouse must be registered before it can be referenced during shipment creation or pickup-request creation.

Each registered warehouse also needs a return address. The return address may be the warehouse itself or a different location.

## Exact-name requirement

The warehouse `name` is case-sensitive. Shipment creation and pickup requests must use exactly the same spelling, capitalization, spacing, and punctuation that were used during registration.

Store Delhivery's registered warehouse name separately from any editable display name. Renaming an internal warehouse must not silently change the external identifier used in Delhivery requests.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`. This operation changes the external Delhivery account by registering a pickup location.

### Test

```text
POST https://staging-express.delhivery.com/api/backend/clientwarehouse/create/
```

### Production

```text
POST https://track.delhivery.com/api/backend/clientwarehouse/create/
```

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `name` | String | Yes | Case-sensitive Delhivery warehouse/pickup-location name. |
| `registered_name` | String | No | Registered account/business name. |
| `phone` | String | Yes | Warehouse point-of-contact phone number. |
| `email` | String | No | Warehouse point-of-contact email address. |
| `address` | String | No | Complete warehouse pickup address. |
| `city` | String | No | Warehouse city. |
| `pin` | String | Yes | Warehouse PIN code. |
| `country` | String | No | Warehouse country. |
| `return_address` | String | Yes | Complete return address; may equal the pickup address. |
| `return_city` | String | No | Return city. |
| `return_pin` | String | No | Return-address PIN code. |
| `return_state` | String | No | Return state. |
| `return_country` | String | No | Return country. |

Although several pickup/return location fields are marked optional, a production integration should require a complete, validated physical pickup address and a complete return address unless Delhivery confirms otherwise.

Treat PIN codes and phone numbers as strings. They are identifiers, not values for arithmetic.

## Example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/api/backend/clientwarehouse/create/' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "phone": "9999999999",
    "city": "Kota",
    "name": "test_name",
    "pin": "110042",
    "address": "address",
    "country": "India",
    "email": "abc@example.com",
    "registered_name": "registered_account_name",
    "return_address": "return_address",
    "return_pin": "110042",
    "return_city": "Kota",
    "return_state": "Delhi",
    "return_country": "India"
  }'
```

The example values are placeholders and must not be used for a real registration.

## Recommended application flow

1. Restrict warehouse registration to an authorized administrator.
2. Validate the pickup and return PIN codes using an appropriate postal/serviceability check.
3. Normalize phone/email formats while preserving the warehouse name exactly as chosen.
4. Show the administrator the exact case-sensitive Delhivery name and both addresses for confirmation.
5. Check the local mapping and, if supported, Delhivery's warehouse list before attempting creation.
6. Submit the registration once.
7. Verify provider-level success and store the external warehouse name/reference with the internal warehouse record.
8. Use the stored external name for shipment creation and pickup requests.

## Integration requirements

1. Do not automatically register a production warehouse during application startup or deployment.
2. Require deliberate administrator confirmation because this call mutates the external account.
3. Prevent duplicate requests with a local uniqueness rule for environment/account plus exact external name.
4. Treat timeouts as ambiguous; reconcile before retrying because the warehouse may have been created.
5. Never change whitespace or capitalization when sending the stored Delhivery name.
6. Encrypt or appropriately restrict warehouse POC details and avoid logging phone/email/address data unnecessarily.
7. Keep sandbox and production warehouse mappings separate.
8. Audit who initiated the registration and record the provider result without storing the API token.

## Documentation gaps to resolve

The supplied material does not include:

- Success and error response schemas.
- External warehouse identifier fields.
- Duplicate-name behavior and uniqueness scope.
- Warehouse list/get, update, deactivate, or delete APIs.
- Whether pickup `address`, `city`, and country/state fields are effectively mandatory.
- Complete phone, email, PIN-code, and address validation constraints.
- Whether return fields become mandatory as a complete set when `return_address` is supplied.
- Idempotency or reconciliation behavior after timeouts.

Obtain redacted staging responses for successful creation, duplicate name, invalid PIN, invalid return address, and repeated submission before implementing production registration.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 172.45 ms |
| P99 latency | 396.51 ms |
| Rate limit | 10 requests per minute per IP |

## Source

Documented from Delhivery material supplied by the project owner. All credentials, contact details, names, and addresses shown here are placeholders; no live credentials are included.
