# OTA → CRM booking webhook

The OTA has its own MySQL database (`DB_NAME`, on Hostinger `u633779242_AllSky_new`) for customers, sessions, bookings and the outbox. It never reads or writes the CRM's database. The CRM learns about bookings, and later changes to them, only through this webhook.

## Events
| Event | Queued when |
|---|---|
| `booking.created` | The CRM first hears of a booking: an airline hold or a request (`POST /api/my/checkout`), or a paid card checkout (`POST /api/my/checkout/confirm`). Card checkouts that are never paid are not sent. |
| `booking.updated` | A booking the CRM already has changes status, airline PNR, ticket numbers or payment status: staff "Pay & issue tickets" (`payHold`), an order re-sync (`syncOrder`: admin re-sync, Duffel webhooks, the hold-expiry job). |
| `booking.cancelled` | The booking is cancelled, by the customer or staff (`confirmCancellation`) or by the airline (found by `syncOrder`). |

Updates and cancellations are only queued for bookings that already have a `booking.created` event, and are held back (normal retry backoff) until that event has been delivered.

## Flow
1. The booking change is saved in the OTA database.
2. In the same request an event is written to the `outbox` table and delivery is tried right away.
3. A background worker retries anything that is not delivered every 30 s, with exponential backoff (30 s, 60 s, 120 s … capped at 6 h). After 10 failed attempts the event is marked `dead`.
4. On a 2xx response the booking gets `crm_sync_status = SYNCED` and `crm_booking_id` (read from `data.id`, `id` or `booking_id` in the response body; kept if the response has none).

The body is built when the event is delivered, so every event carries the booking's **latest** state, not the state at the time it was queued.

Admins can see the queue at `GET /api/admin/crm/outbox` and re-send an event with `POST /api/admin/crm/outbox/{event_id}/retry`.

## Configuration (encrypted in the `app_secrets` table; set via `PUT /api/admin/secrets/{name}` or `node scripts/manage.js import-secrets` (run in `api/`))
| Variable | Meaning |
|---|---|
| `CRM_WEBHOOK_URL` | CRM endpoint that receives bookings, e.g. `https://crm.allskyfares.com/api/v1/integrations/ota/bookings`. If it's blank, events wait in the outbox. |
| `CRM_WEBHOOK_SECRET` | Shared HMAC secret. Give the CRM the same value. |

## Request
All three events go to `POST {CRM_WEBHOOK_URL}` with `Content-Type: application/json`

| Header | Value |
|---|---|
| `X-ASF-Event` | `booking.created`, `booking.updated` or `booking.cancelled` (same as `event` in the body) |
| `X-ASF-Event-Id` | Unique event id (UUID) |
| `Idempotency-Key` | Same as the event id. The CRM must store it and skip duplicates. |
| `X-ASF-Timestamp` | Unix seconds when the request was sent |
| `X-ASF-Signature` | `sha256=` + hex HMAC-SHA256(secret, `"{timestamp}." + raw_body`) |

### How the receiver checks a request
1. Recompute the signature over the **raw** body bytes and compare it in constant time.
2. Reject timestamps that are more than 5 minutes old.
3. If the `Idempotency-Key` was already processed, return 200 with the existing booking id.
4. `booking.created`: create the booking with its passengers, segments and payment in one transaction, and remember `external.otaBookingId` → CRM booking id. A second `booking.created` for the same `otaBookingId` returns the existing booking. Respond `201 {"data": {"id": "<crm booking id>"}}`.
5. `booking.updated` / `booking.cancelled`: find the CRM booking by `external.otaBookingId`. If there isn't one yet, answer `409` so the OTA retries. Apply the change, record the idempotency key and write a timeline event and an audit log entry (`BOOKING_UPDATED` / `BOOKING_CANCELLED`). Respond `200`.

Any non-2xx response is retried.

The CRM (CRM II, `apps/api/src/ota-webhook.ts`) maps the payload onto its own models: `Customer` (found or created by email), `Booking`, `Passenger`, `FlightSegment`, `Payment` and `Refund`. On `booking.updated` it sets the PNR, status (`CONFIRMED`, or `DRAFT` → `ON_HOLD`, never reopening a cancelled booking), puts each ticket number on the passenger with that name and in `Booking.ticketNumber`, and updates the payment status and amount paid. On `booking.cancelled` it sets `CANCELLED`, adds a `Refund` against the paid OTA payment when money is returned, and always appends a cancellation/refund note to the booking's remarks.

### Body
```json
{
  "event": "booking.created | booking.updated | booking.cancelled",
  "event_id": "uuid",
  "occurred_at": "created: when the booking was made; others: when the event was queued (ISO)",
  "source": "allskyfares-ota",
  "booking": {
    "status": "CONFIRMED | DRAFT",
    "journeyType": "ONE_WAY | ROUND_TRIP | MULTI_CITY",
    "customerName": "Jane Doe", "customerEmail": "…", "customerPhone": "…",
    "departure": "LHR", "destination": "JFK",
    "departureDate": "ISO", "returnDate": "ISO | null",
    "airline": "British Airways", "flightNumber": "BA117",
    "cabinClass": "ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST",
    "pnr": "airline booking reference",
    "airlineCharge": 400.0, "serviceFee": 35.0, "currency": "USD",
    "tickets": [{ "number": "1251234567890", "passenger": "Jane Doe" }],
    "fareInfo": "…", "internalNotes": "…",
    "passengers": [{ "isPrimary": true, "firstName": "", "lastName": "", "title": "MS",
                     "email": "", "phone": "", "dateOfBirth": "YYYY-MM-DD",
                     "passengerType": "adult", "sortOrder": 0 }],
    "journeys": [{ "journeyOrder": 0, "journeyType": "OUTBOUND | RETURN | LEG_n", "label": "LHR → JFK",
                   "segments": [{ "segmentOrder": 0, "marketingAirlineCode": "BA", "marketingAirlineName": "…",
                                  "operatingAirlineCode": "AA", "operatingAirlineName": "…", "isCodeshare": true,
                                  "flightNumber": "117", "departureAirportCode": "LHR", "departureAirportName": "…",
                                  "departureTerminal": "5", "arrivalAirportCode": "JFK", "arrivalAirportName": "…",
                                  "arrivalTerminal": "7", "departureDateTime": "ISO", "arrivalDateTime": "ISO",
                                  "durationMinutes": 480, "cabinClass": "economy", "aircraft": "…",
                                  "segmentStatus": "HK", "pnr": "…" }] }],
    "payment": { "amount": 435.0, "currency": "USD", "airlineCharge": 400.0, "serviceFee": 35.0,
                 "status": "CAPTURED | PENDING", "method": "OTHER",
                 "transactionRef": "duffel order id", "notes": "…" },
    "cancellation": null
  },
  "external": { "otaBookingId": "…", "otaCustomerId": "…", "duffelOrderId": "…", "offerId": "…", "liveMode": false,
                "otaStatus": "OTA status: ON_HOLD | CONFIRMED | REQUESTED | CANCELLED | …" }
}
```

`cancellation` is filled in once the booking is cancelled:

```json
"cancellation": { "cancelledAt": "ISO", "refundAmount": 300.0, "airlineRefund": 300.0,
                  "refundStatus": "pending | succeeded | manual | null", "currency": "USD" }
```

`refundAmount` is what the customer gets back. `refundStatus = manual` means the reservations team has to refund it by hand.

Raw card data is never included in the payload.
