# B2C Shipment Creation

## Purpose

This API creates a B2C shipment in Delhivery. The same endpoint supports forward, reverse-pickup, and replacement flows; `payment_mode` determines the flow.

| Flow | `payment_mode` |
|---|---|
| Forward prepaid | `Prepaid` |
| Forward cash on delivery | `COD` |
| Reverse pickup | `Pickup` |
| Replacement/exchange | `REPL` |

Check PIN-code serviceability before creating a shipment. See [b2c-pincode-serviceability.md](./b2c-pincode-serviceability.md).

## Shipment structure

- **Single-piece shipment (SPS):** one Waybill represents one package, which may contain multiple items.
- **Multi-piece shipment (MPS):** one order uses multiple boxes and every box requires its own prefetched Waybill. See [mps-manifestation.md](./mps-manifestation.md).
- The Order ID must be unique for every new order.
- For SPS, `waybill` may be supplied from a prefetched pool or omitted for Delhivery to allocate it.

## Reverse-pickup behavior

- Set `payment_mode` to `Pickup`.
- Customer/consignee information becomes the pickup location.
- `return_add` and the other return fields define the delivery destination.
- If a return address and a registered pickup location are both supplied, Delhivery prioritizes the return address as the shipment destination.

## Replacement behavior

- Set `payment_mode` to `REPL`.
- One Waybill is used for the full exchange journey.
- The registered pickup location is the origin.
- The customer address is the exchange location.
- The return address is the final delivery location after the exchange.
- If no return address is supplied, the registered pickup location becomes the final delivery location.

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

## Parameters

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `name` | String | Yes | Consignee name. |
| `order` | String | Yes | Unique Order ID. |
| `phone` | String | Yes | Consignee phone number. |
| `add` | String | Yes | Consignee address. |
| `pin` | Integer | Yes | Consignee PIN code. |
| `pickup_location.name` | String | Yes | Exact registered warehouse name; case- and whitespace-sensitive. |
| `payment_mode` | String | Yes | `Pickup`, `COD`, `Prepaid`, or `REPL`, according to shipment flow. |
| `address_type` | String | No | Address type, such as `home` or `office`. |
| `ewbn` | String | No | E-Waybill number for packages valued at INR 50,000 or more. |
| `hsn_code` | String | No | HSN code; multiple HSN codes may be supplied when quantity is greater than one. |
| `shipping_mode` | String | No | `Surface` or `Express`. |
| `seller_inv` | String | No | Seller invoice reference. |
| `city` | String | No | Consignee city. |
| `state` | String | No | Consignee state. |
| `country` | String | No | Country. Required as `BD` for Bangladesh. |
| `weight` | Float | No | Shipment weight in grams. |
| `return_name` | String | No | Return recipient/name. |
| `return_address` | String | No | Return address according to the parameter table. The sample uses `return_add`; confirm the actual field name. |
| `return_city` | String | No | Return city. |
| `return_phone` | String | No | Return phone number. |
| `return_state` | String | No | Return state. |
| `return_country` | String | No | Return country. |
| `return_pin` | Integer | No | Return PIN code. |
| `seller_name` | String | No | Seller name. |
| `seller_add` | String | No | Seller address. |
| `seller_inv` | String | No | Seller invoice. |
| `fragile_shipment` | Boolean | No | Whether the shipment contains fragile items. |
| `dangerous_good` | Boolean | No | Dangerous-goods indicator. |
| `plastic_packaging` | Boolean | No | Plastic-packaging indicator. |
| `shipment_height` | Float | No | Height in centimetres. |
| `shipment_width` | Float | No | Width in centimetres. |
| `shipment_length` | Float | No | Length in centimetres. |
| `cod_amount` | Float | No | Amount to collect for COD. Required by business logic when `payment_mode=COD`. |
| `products_desc` | String | No | Product description. |
| `waybill` | String | Conditional | Optional for SPS; required separately for every MPS box. |
| `total_amount` | Float | No | Total shipment/order amount. |
| `quantity` | String | No | Quantity. |
| `transport_speed` | String | No | `F` for next-day delivery or `D` for standard delivery. |

Delhivery recommends including all fields shown in its sample, even when optional, for optimal processing.

## Supplied SPS example

The source displays a `format=json&data=...` body:

```text
format=json&data={
  "shipments": [
    {
      "name": "Consignee name",
      "add": "Huda Market, Haryana",
      "pin": "110042",
      "city": "Gurugram",
      "state": "Haryana",
      "country": "India",
      "phone": "9999999999",
      "order": "Test Order 01",
      "payment_mode": "Prepaid",
      "return_pin": "",
      "return_city": "",
      "return_phone": "",
      "return_add": "",
      "return_state": "",
      "return_country": "",
      "products_desc": "",
      "hsn_code": "",
      "cod_amount": "",
      "order_date": null,
      "total_amount": "",
      "seller_add": "",
      "seller_name": "",
      "seller_inv": "",
      "quantity": "",
      "waybill": "",
      "shipment_width": "100",
      "shipment_height": "100",
      "weight": "",
      "shipping_mode": "Surface",
      "address_type": ""
    }
  ],
  "pickup_location": {"name": "warehouse_name"}
}
```

## Payload-format warning

The supplied documentation is internally inconsistent:

- It says raw JSON does not accept `&`, `#`, `%`, `;`, or `\` and recommends a URL-encoded payload.
- Its example declares `Content-Type: application/json` but sends `format=json&data={...}`, which has form-encoded structure rather than a raw JSON body.
- The parameter table calls the return-address field `return_address`, while the sample uses `return_add`.

Before implementation, obtain a successful redacted staging request and response and confirm:

1. Whether the content type must be `application/x-www-form-urlencoded`.
2. Whether `data` must contain a JSON string.
3. Whether the accepted return-address key is `return_add` or `return_address`.
4. How special characters must be encoded.

Do not strip legitimate address characters merely to make an undocumented payload format work.

## Integration requirements

1. Verify B2C PIN-code serviceability before shipment creation.
2. Make the internal Order ID stable and unique; do not generate a new ID during retries.
3. Validate the payment-mode-specific fields, especially `cod_amount` for COD.
4. Validate positive dimensions/weight and keep documented units: centimetres and grams.
5. Match `pickup_location.name` exactly to the Delhivery-registered warehouse.
6. Treat an ambiguous timeout as potentially created; reconcile before retrying to avoid duplicate shipments.
7. Store Delhivery's returned Waybill and raw provider reference securely after validating the response.
8. Do not advance the order to shipped merely because the HTTP status is successful; verify provider-level success fields.

The supplied material does not include success/error response schemas or idempotency/reconciliation behavior. Those are required before safely implementing shipment creation.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 283.57 ms |
| P99 latency | 1.59 seconds |
| Rate limit | 20,000 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. Example identities and tokens are placeholders; no live credentials are included.
