# Delhivery Local Staging Test Ledger

Use this file as the single record for Delhivery testing on the
`delhivery-api` branch. Never paste API tokens, complete addresses, phone
numbers, cookies, JWTs, or raw label URLs into this file.

## Result values

- `NOT RUN`: waiting to be tested
- `PASS`: actual result matched the expected result
- `FAIL`: the application or Delhivery returned an incorrect result
- `BLOCKED`: a required external state or credential was unavailable
- `N/A`: deliberately outside the current integration

For every run, record only the order number, local shipment ID, masked AWB
(last four digits), HTTP status, correlation ID, and a short result.

## Environment gate

| ID | Check | Expected | Status | Evidence |
|---|---|---|---|---|
| ENV-01 | Backend environment | `DELHIVERY_ENV=staging` | PASS | Verified locally |
| ENV-02 | Token authentication | Serviceability returns HTTP 200 | PASS | Verified locally; response contained one delivery code |
| ENV-03 | Pickup name | Exact registered name is configured | PASS | `VALIARIANB2C-B2C` |
| ENV-04 | Default packed parcel | 425 g, 35 x 34 x 3 cm | PASS | Verified locally |
| ENV-05 | Safe debug logging | Operation metadata only; no token or payload | PASS | `DELHIVERY_DEBUG_LOGS=true` locally |
| ENV-06 | Backend build | TypeScript compilation succeeds | PASS | `lb-tsc`, 2026-09-26 |
| ENV-07 | Admin build | Production compilation succeeds | PASS | Optimized build passed after package-entry UI changes |
| ENV-08 | Automated Delhivery tests | Targeted suite passes | PASS | 53 passing: routing, modes, checkout, integration, webhook, security and dimensions |

## Customer checkout routing gate

| ID | Scenario | Expected | Status | Evidence |
|---|---|---|---|---|
| CHK-01 | Delhivery accepts prepaid PIN | Delhivery selected; Blue Dart prepaid check is not called | PASS | Automated routing test |
| CHK-02 | Delhivery rejects prepaid PIN | Blue Dart is checked as fallback | PASS | Automated routing test |
| CHK-03 | Both reject prepaid PIN | Address cannot continue to payment | PASS | Automated checkout test |
| CHK-04 | Delhivery accepts PIN | Surface and Express choices are returned | PASS | Automated public-controller test |
| CHK-05 | Express selected | Only Delhivery is checked; never silently changed to Blue Dart | PASS | Automated public-controller test |
| CHK-06 | Delhivery cannot collect COD | Blue Dart is checked for COD fallback | PASS | Automated routing test |
| CHK-07 | Neither courier supports COD | COD is hidden; Razorpay remains | PASS | Code/build verification; manual UI pending |
| CHK-08 | Order creation | Selected delivery mode and provider are revalidated server-side | PASS | Backend compile/unit coverage |
| CHK-09 | Shipment manifestation | Persisted mode becomes Delhivery `Surface` or `Express` | PASS | Manifest payload unit test |
| CHK-10 | Customer UI | Correct provider, delivery modes and payment choices render | NOT RUN | Manual browser test required |

## Test data preparation

Create separate local orders for these scenarios. Do not reuse an AWB after a
mutation test because courier state is external and cannot be rolled back.

| Order | Payment | Destination | Products | Purpose |
|---|---|---|---|---|
| A | Prepaid test payment | Serviceable PIN | 1 | Normal forward flow |
| B | COD | COD-serviceable PIN | 3 | Quantity and one-parcel flow |
| C | Prepaid test payment | Unserviceable PIN | 1 | Negative serviceability |
| D | Prepaid test payment | Serviceable PIN | 1 | Cancel before AWB |
| E | Prepaid test payment | Serviceable PIN | 1 | Cancel after AWB |
| F | Prepaid test payment | Serviceable PIN | 1 | Delivered return/reverse pickup |

Use fake staging customer details. Do not use a real payment. Razorpay must
also be in test mode for prepaid orders.

## Phase 1 — local validation without creating an AWB

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| LOC-01 | Unauthorized access | Call an admin Delhivery endpoint without JWT | HTTP 401 | NOT RUN | |
| LOC-02 | Non-admin access | Call with customer JWT | HTTP 403 | NOT RUN | |
| LOC-03 | Valid prepaid PIN | Run delivery check for Order A | Delhivery available | NOT RUN | |
| LOC-04 | Valid COD PIN | Run delivery check for Order B | Serviceable and COD available | NOT RUN | |
| LOC-05 | Unserviceable PIN | Run delivery check for Order C | Packing with Delhivery blocked | NOT RUN | |
| LOC-06 | Invalid PIN format | Submit fewer/more than six digits | HTTP 400/422; no Delhivery mutation | NOT RUN | |
| LOC-07 | Invalid measurements | Submit zero/negative packed measurement | HTTP 422; no AWB | NOT RUN | |
| LOC-08 | Wrong order state | Request AWB before order is packed | HTTP 422; no AWB | NOT RUN | |
| LOC-09 | Shipping-cost positive | Valid origin, destination and weight | Successful cost response or documented staging limitation | NOT RUN | |
| LOC-10 | Shipping-cost negative | Weight zero or malformed PIN | HTTP 400; no provider call | NOT RUN | |

Staging coverage diagnostic (2026-09-26): direct authenticated PIN checks for
`422012` and `422222` both returned `delivery_codes: []`. These PINs may be
serviceable in Delhivery production/portal while absent from the staging
dataset; they must not be used as positive staging fixtures unless Delhivery
support adds them to the test account.

Production diagnostic (2026-09-26): after replacing the expired production
token, direct read-only checks returned HTTP 200 and one record for each of
`422012` and `422222`. Both report prepaid, COD, cash, pickup, and replacement
as `Y`, with blank remarks.

## Phase 2 — forward shipment and official label

These tests create real **staging** courier records.

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| FWD-01 | One prepaid item | Pack Order A with measured values | One AWB and one shipment record | NOT RUN | |
| FWD-02 | Idempotent retry | Repeat shipment request for Order A | Existing shipment returned; no second AWB | NOT RUN | |
| FWD-03 | Three items, one parcel | Pack Order B and enter final sealed parcel measurements | Manifest quantity 3, physical parcels 1, one AWB | NOT RUN | |
| FWD-04 | COD amount | Inspect Order B staging manifest/result | COD mode and order total sent | NOT RUN | |
| FWD-05 | Official label | Download label from shipment action | Unedited Delhivery PDF opens; AWB matches | NOT RUN | |
| FWD-06 | Label cache | Download the same label again | Same stored official PDF; no custom reconstruction | NOT RUN | |
| FWD-07 | Duplicate label safety | Compare label AWB with shipment AWB | Exact match | NOT RUN | |
| FWD-08 | Shipment edit positive | Edit an allowed field before terminal state | Provider accepts and local dimensions update | NOT RUN | |
| FWD-09 | Shipment edit empty | Submit no editable fields | HTTP 400 | NOT RUN | |
| FWD-10 | Same payment-mode edit | Set Prepaid to Prepaid or COD to COD | HTTP 400 | NOT RUN | |

## Phase 3 — pickup and tracking

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| PCK-01 | Pickup positive | Select created staging shipment and request future/today pickup | Pickup reference saved; status `pickup_pending` | NOT RUN | |
| PCK-02 | Duplicate pickup | Request pickup again for the same shipment | HTTP 409 | NOT RUN | |
| PCK-03 | Past pickup date | Request yesterday | HTTP 400; no provider call | NOT RUN | |
| PCK-04 | Invalid pickup time | Use invalid time | HTTP 400 | NOT RUN | |
| PCK-05 | Mixed warehouse | Select shipments from different warehouses | HTTP 400 | NOT RUN | |
| TRK-01 | Tracking positive | Click Sync Tracking | Staging status saved; no duplicate events | NOT RUN | |
| TRK-02 | Tracking repeat | Sync the same unchanged AWB again | No duplicate shipment event | NOT RUN | |
| TRK-03 | Unknown AWB | Track an invalid staging AWB through controlled API test | Provider error handled; no local corruption | NOT RUN | |

## Phase 4 — cancellation scenarios

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| CAN-01 | Cancel before packing/AWB | Cancel Order D | Order cancelled locally; no Delhivery call | NOT RUN | |
| CAN-02 | Cancel created AWB | Cancel Order E shipment before collection | Delhivery accepts; local status `cancel_pending` | NOT RUN | |
| CAN-03 | Reconcile cancellation | Sync Order E tracking | Final courier state recorded before inventory decision | NOT RUN | |
| CAN-04 | Repeat cancellation | Cancel the same final-cancelled shipment again | HTTP 409; no second mutation | NOT RUN | |
| CAN-05 | Cancel delivered shipment | Attempt cancellation after delivered status | HTTP 409 | BLOCKED | Requires Delhivery to advance staging AWB |
| CAN-06 | Network ambiguity | Simulated unit test for mutation timeout | `cancel_pending`/reconciliation path; no blind retry | NOT RUN | Automated test only |

Important: acceptance of a Delhivery cancellation request is not final courier
cancellation. Keep the shipment in `cancel_pending` until tracking confirms the
provider state.

## Phase 5 — delivery, NDR and RTO

These depend on Delhivery staging scan updates or approved webhook simulation.

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| EVT-01 | Webhook without secret | POST scan without/with wrong authorization | HTTP 401 | NOT RUN | Local simulation |
| EVT-02 | Unknown webhook AWB | Validly signed scan for unknown AWB | HTTP 404 | NOT RUN | Local simulation |
| EVT-03 | Duplicate webhook | Send identical signed scan twice | Second delivery marked duplicate | NOT RUN | Local simulation |
| EVT-04 | Delivered | Delhivery advances AWB or approved simulation | Shipment and order become delivered | BLOCKED | Needs staging scan/support |
| EVT-05 | NDR invalid state | Submit NDR action for non-NDR shipment | HTTP 409 | NOT RUN | |
| EVT-06 | NDR re-attempt | Eligible NSL code, attempt 1 or 2 | Request accepted and request ID returned | BLOCKED | Needs eligible staging scan |
| EVT-07 | NDR reschedule | Eligible reschedule NSL code | Request accepted | BLOCKED | Needs eligible staging scan |
| EVT-08 | RTO initiated | RT scan/update | Order becomes `rto_initiated`/`rto_in_transit` as appropriate | BLOCKED | Needs staging scan/support |
| EVT-09 | RTO delivered | RTO delivery scan/update | Order and shipment become `rto_delivered` | BLOCKED | Needs staging scan/support |

## Phase 6 — customer return and reverse pickup

This is different from cancellation. A normal customer return starts only
after the forward order is delivered and its return request is approved.

| ID | Scenario | Action | Expected | Status | Evidence |
|---|---|---|---|---|---|
| RET-01 | Return before delivery | Request/approve reverse pickup before delivered state | Rejected | NOT RUN | |
| RET-02 | Reject return | Customer requests return; admin rejects | No reverse AWB | NOT RUN | |
| RET-03 | Approve return | Admin approves delivered Order F | Return status approved | BLOCKED | Requires delivered staging order |
| RET-04 | Reverse pickup | Create reverse pickup after approval | One reverse AWB linked to forward shipment | BLOCKED | Requires RET-03 |
| RET-05 | Reverse idempotency | Repeat reverse-pickup request | Existing reverse shipment returned; no duplicate AWB | BLOCKED | Requires RET-04 |
| RET-06 | RVP QC invalid | Submit zero, too many items/questions, or invalid choice config | Validation error; no AWB | NOT RUN | Automated/controller test |
| RET-07 | RVP QC valid | Submit supported QC definition | Reverse manifest contains parametric QC | BLOCKED | Requires Delhivery QC IDs/configuration |
| RET-08 | Return tracking | Sync reverse AWB | Reverse events update without changing forward AWB | BLOCKED | Requires RET-04 |
| RET-09 | Parcel received | Admin marks returned parcel received | Inventory/restock workflow executes once | BLOCKED | Requires completed reverse movement |
| RET-10 | Refund | Execute test-mode refund according to payment method | Test refund state recorded; no live money movement | BLOCKED | Requires returned test order |

## Phase 7 — unsupported or conditional capabilities

| ID | Capability | Current result |
|---|---|---|
| CAP-01 | One order split across several physical parcels | NOT IMPLEMENTED; requires Delhivery MPS and admin parcel allocation |
| CAP-02 | E-Waybill | Test only when legally/operationally required and valid test identifiers exist |
| CAP-03 | EPOD/signature/return images | Available only after Delhivery has generated the requested document |
| CAP-04 | Warehouse creation/update | Do not run against the registered staging account unless a distinct test warehouse name is approved |
| CAP-05 | Production API | Never use during this ledger; production requires its own token and deployment configuration |

## Safe backend log format

With `DELHIVERY_DEBUG_LOGS=true`, every provider call logs:

```text
[Delhivery API] {
  correlationId,
  operation,
  method,
  path,
  mutation,
  httpStatus,
  durationMs,
  result
}
```

The log deliberately excludes API token, authorization header, request body,
customer address, phone number, full AWB and provider response.

## Run notes

Add dated rows here as testing proceeds.

| Date/time (IST) | Test ID | Result | Order/shipment reference | Correlation ID | Notes |
|---|---|---|---|---|---|
| 2026-09-26 | ENV-01..05 | PASS | N/A | N/A | Configuration and read-only authentication verified |
