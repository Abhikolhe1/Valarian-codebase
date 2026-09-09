# NDR Action API

## Purpose

This asynchronous API submits an action for a Delhivery NDR (Non-Delivery Report) shipment. A successful submission returns a request identifier called a **UPL ID**. The UPL ID must be checked using the [GET NDR Status API](./ndr-status.md) to determine whether Delhivery applied the requested action.

Submission success does not mean the NDR action itself succeeded.

## Supported actions

| `act` value | Intended flow |
|---|---|
| `RE-ATTEMPT` | Request another forward-delivery attempt. |
| `PICKUP_RESCHEDULE` | Reschedule an eligible reverse/non-OTP cancelled pickup. |

Use an exact allowlist containing only these values.

## RE-ATTEMPT eligibility

Before submitting `RE-ATTEMPT`, verify all of the following:

- The shipment's current NSL code is one of:
  - `EOD-74`
  - `EOD-15`
  - `EOD-104`
  - `EOD-43`
  - `EOD-86`
  - `EOD-11`
  - `EOD-69`
  - `EOD-6`
- The shipment attempt count is `1` or `2`.
- The current NSL is fetched immediately before applying the action.
- Delhivery recommends submission after 9:00 PM so the NDR Waybill is back at the facility and open dispatches have closed.

## PICKUP_RESCHEDULE eligibility

Before submitting `PICKUP_RESCHEDULE`, verify all of the following:

- The current NSL code is `EOD-777` or `EOD-21`.
- The shipment is marked cancelled.
- The shipment is a **non-OTP cancelled** shipment.
- The attempt count is `1` or `2`.
- Delhivery recommends submission after 9:00 PM so open facility dispatches have closed.

The supplied wording does not completely define how NSL, cancelled status, and non-OTP cancellation are represented in tracking data. Do not infer these conditions from descriptions alone.

## Timezone warning

The recommendation says “after 9 PM” but does not specify a timezone or whether the applicable zone is the origin facility, destination facility, warehouse, or account timezone. Confirm this with Delhivery before automating scheduled submissions.

## Authentication

```http
Accept: application/json
Authorization: Token <DELHIVERY_API_TOKEN>
Content-Type: application/json
```

Keep the token server-side and never commit, expose, or log it.

## HTTP method and endpoints

Use `POST`. This operation changes the shipment's external delivery/pickup instructions.

### Test

```text
POST https://staging-express.delhivery.com/api/p/update
```

### Production

```text
POST https://track.delhivery.com/api/p/update
```

The supplied curl example uses `https://express-dev-test.delhivery.com/api/p/update`, while its Test Environment URL uses `staging-express.delhivery.com`. Confirm the active test host with Delhivery before integration.

## Parameters

The request wraps action records in `data`:

| Parameter | Type | Mandatory | Description |
|---|---|---:|---|
| `waybill` | String | Yes | Delhivery Waybill receiving the NDR action. |
| `act` | String | Yes | Exact action: `RE-ATTEMPT` or `PICKUP_RESCHEDULE`. |

Treat Waybills and returned UPL IDs as strings.

## Example request

```bash
curl --request POST \
  --url 'https://staging-express.delhivery.com/api/p/update' \
  --header 'Accept: application/json' \
  --header 'Authorization: Token <DELHIVERY_API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
    "data": [
      {
        "waybill": "<WAYBILL>",
        "act": "RE-ATTEMPT"
      }
    ]
  }'
```

## Recommended application flow

1. Authenticate and authorize the administrator or approved automated policy.
2. Fetch fresh Delhivery tracking/NDR state for the Waybill.
3. Validate the exact current NSL, attempt count, shipment flow, cancelled status, and OTP condition against the selected action.
4. Apply the confirmed post-9-PM rule using the Delhivery-approved timezone.
5. Acquire an order/Waybill-level lock to prevent duplicate action submissions.
6. Submit the NDR request once.
7. Validate the response and persist the UPL ID, action, Waybill, submission time, and initiating actor.
8. Mark the local operation `pending`; do not change the shipment to reattempted/rescheduled yet.
9. Poll GET NDR Status with bounded backoff until a terminal result or operational timeout.
10. Reconcile tracking after a successful terminal result.

## Safety and idempotency requirements

1. Never apply an action based on stale cached NSL data.
2. Do not retry an ambiguous POST blindly; it may have created a UPL request even if the response was lost.
3. Prevent another pending request for the same Waybill/action unless Delhivery documents that it is safe.
4. Store the raw provider action/status alongside the internal mapped state.
5. Do not count HTTP acceptance as business success.
6. Audit manual and automated actions without logging the API token or unnecessary customer data.
7. Quarantine unsupported NSL codes instead of guessing eligibility.

## Documentation gaps to resolve

The supplied material does not include:

- Submission success and error response schemas.
- Exact response field containing the UPL ID.
- Whether multiple records in `data` are supported and partial-success behavior.
- Test-host resolution between `express-dev-test` and `staging-express`.
- The applicable timezone for the after-9-PM recommendation.
- Source fields for attempt count, OTP cancellation, and current NSL.
- Idempotency or duplicate-action behavior.
- Rate limits; `NA` must not be interpreted as unlimited.
- Recommended request timeout despite the documented 126.38-second P99.

Obtain redacted staging examples for accepted, ineligible NSL, invalid attempt count, duplicate request, and ambiguous/timeout cases before implementing automated NDR actions.

## Production performance limits

| Metric | Value |
|---|---:|
| Average latency | 93.77 ms |
| P99 latency | 126.38 seconds |
| Rate limit | `NA` in supplied documentation; limit is unspecified, not necessarily unlimited. |

The documented P99 is extremely high compared with the average. Confirm it before selecting production timeouts.

## Source

Documented from Delhivery material supplied by the project owner. All tokens, Waybills, and UPL IDs shown here are placeholders; no live credentials are included.
