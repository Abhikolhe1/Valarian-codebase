# RVP QC 3.0

## Purpose

RVP QC 3.0 performs a question-based quality check at the customer's doorstep for a reverse-pickup (`Pickup`) shipment.

The Delhivery field executive (FE) answers the configured questions for each item. Pickup proceeds only when all mandatory questions are answered correctly.

This workflow uses the standard shipment-creation endpoint described in [b2c-shipment-creation.md](./b2c-shipment-creation.md), with additional `qc_type` and `custom_qc` fields.

## Integration stages

### 1. One-time question mapping

Delhivery must enable and configure RVP QC 3.0 for the client account.

1. The client defines its QC requirements.
2. Delhivery's business-development team supplies the supported questions and Delhivery question IDs.
3. The client maps its own stable question IDs to the corresponding Delhivery question IDs.
4. The mapping is shared with Delhivery in its required format and configured in Delhivery's system.

Example mapping structure:

| Client question ID | Delhivery question ID |
|---|---|
| `client-question-1` | `delhivery-question-1` |
| `client-question-2` | `delhivery-question-2` |

The manifest payload sends the **client question ID** in `questions_id`; Delhivery resolves it through the preconfigured mapping.

### 2. Reverse order creation

When creating the reverse shipment:

- Set `payment_mode` to `Pickup`.
- Set `qc_type` to the exact hardcoded value `param`.
- Include item/question definitions in the `custom_qc` array.

## Hard limits

- Maximum QC items per shipment: **2**.
- Maximum questions per QC item: **6**.
- If either limit is exceeded, Delhivery may still create the shipment but silently classify it as a **non-QC shipment**.

The application must validate these limits before submission and verify that QC was actually enabled in the provider response. A successfully created non-QC shipment is not equivalent to the requested QC shipment.

## Authentication

```http
Authorization: Token <DELHIVERY_API_TOKEN>
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`.

### Test

```text
POST https://staging-express.delhivery.com/api/cmu/create.json
```

### Production

```text
POST https://track.delhivery.com/api/cmu/create.json
```

## Additional manifest fields

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `qc_type` | String | Yes for this workflow | Must be exactly `param`. |
| `custom_qc` | Array | Yes for this workflow | QC items; maximum two entries. |

## `custom_qc` item fields

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `item` | String | No | Item identifier/name. |
| `description` | String | Yes | Item description. |
| `images` | List | Yes | Item image URLs. The supplied prose also says comma-separated strings; confirm whether the API expects a JSON array, as shown in the sample. |
| `return_reason` | String | No | Reason for return. |
| `quantity` | Integer | Yes in table | Item quantity; documentation says it defaults to `1` when absent. |
| `brand` | String | No | Item brand. |
| `product_category` | String | No | Product category. |
| `questions` | Array | Yes | QC questions; maximum six entries per item. |

## Question fields

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `questions_id` | String | Yes | Client question ID configured in the Delhivery mapping. |
| `options` | List | Yes | Available answers, primarily for `multi` questions. |
| `value` | List | Yes | Correct answer list. Currently only the first element is treated as correct. |
| `required` | Boolean | Yes | If `true`, an incorrect answer fails QC. If `false`, the answer does not affect the QC result. |
| `type` | String | Yes | `varchar` for FE-entered text or `multi` for selection from supplied options. |
| `ques_images` | List | No | Reference image URLs displayed to the FE for this question. |

## Normalized example payload

```json
{
  "shipments": [
    {
      "order": "<UNIQUE_ORDER_ID>",
      "name": "<CUSTOMER_NAME>",
      "phone": "<CUSTOMER_PHONE>",
      "add": "<PICKUP_ADDRESS>",
      "pin": "<PICKUP_PIN>",
      "city": "<PICKUP_CITY>",
      "state": "<PICKUP_STATE>",
      "country": "India",
      "payment_mode": "Pickup",
      "waybill": "<WAYBILL>",
      "return_name": "<RETURN_NAME>",
      "return_add": "<RETURN_ADDRESS>",
      "return_pin": "<RETURN_PIN>",
      "return_city": "<RETURN_CITY>",
      "return_state": "<RETURN_STATE>",
      "return_country": "India",
      "return_phone": "<RETURN_PHONE>",
      "qc_type": "param",
      "custom_qc": [
        {
          "item": "mobile",
          "description": "Phone model",
          "images": ["https://approved.example/item.jpg"],
          "return_reason": "Damaged",
          "quantity": 1,
          "brand": "Brand",
          "product_category": "mobile",
          "questions": [
            {
              "questions_id": "client-question-id",
              "options": ["Black", "Other"],
              "value": ["Black"],
              "required": true,
              "type": "multi",
              "ques_images": ["https://approved.example/reference.jpg"]
            }
          ]
        }
      ]
    }
  ],
  "pickup_location": {"name": "<REGISTERED_WAREHOUSE_NAME>"}
}
```

## Payload-format warning

The source declares `Content-Type: application/json` but sends the body in the form `format=json&data={...}`. This resembles form-encoded data rather than raw JSON. Confirm whether the actual content type must be `application/x-www-form-urlencoded` and whether `data` contains a JSON string before implementing the request.

Other inconsistencies requiring confirmation:

- `images` is described both as a list and as comma-separated strings; the sample uses a JSON array.
- `quantity` is marked mandatory but also documented with a default when omitted.
- The sample represents `weight` as text containing `gm`, while general shipment creation documents weight as a numeric value in grams.
- The supplied sample uses an `http://` question image. Production integrations should require HTTPS.

## Image security and availability

Item and question images are fetched or displayed outside the application to Delhivery personnel. Before sending image URLs:

1. Use HTTPS only.
2. Prefer time-limited signed URLs with a lifetime long enough for pickup attempts and reschedules.
3. Do not expose private storage credentials in URLs.
4. Restrict file type and size and serve images with the correct content type.
5. Avoid customer-sensitive metadata not required for QC.
6. Confirm whether Delhivery caches images and how long it retains them.

## Integration requirements

1. Complete and verify the one-time question mapping before enabling RVP QC in production.
2. Store client and Delhivery question IDs as immutable strings with environment/account scope.
3. Validate no more than two items and six questions per item.
4. Ensure every `questions_id` exists in the active mapping.
5. For `multi`, ensure `options` is non-empty and `value[0]` exactly matches an allowed option.
6. For `varchar`, confirm whether comparison is case-sensitive and how whitespace/numeric values are normalized.
7. Require intentional confirmation for `required=false`, because any selected answer will pass that question.
8. Verify provider-level shipment success and QC activation after creation.
9. Treat a timeout as ambiguous and reconcile before retrying to avoid duplicate reverse shipments.
10. Store the submitted QC definition as an immutable snapshot so later product/question edits do not alter an existing return.

## Documentation gaps to resolve

The supplied material does not include:

- Success/error response schema and the field confirming QC activation.
- The complete Delhivery question catalogue and mapping format.
- Case/whitespace comparison rules for `varchar` answers.
- Whether `value` can ever contain more than one accepted answer.
- Exact semantics of `options` for `varchar` questions.
- Image host, format, size, expiry, and retention rules.
- QC result/tracking response fields and evidence captured by the FE.
- Behavior when a mapped question is disabled or changed by Delhivery.
- Partial QC, failed QC, rescheduling, and dispute workflows.

Obtain redacted staging responses for QC pass, QC fail, unknown question ID, limit exceeded, and shipment-created-without-QC before implementing automated business decisions.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 366.03 ms |
| P99 latency | 916.17 ms |
| Rate limit | 20,000 requests per 5 minutes per IP |

## Source

Documented from Delhivery material supplied by the project owner. All tokens, identities, addresses, Waybills, and image URLs shown here are placeholders; no live credentials are included.
