# AllSkyFares OTA Integration Notes

## Verified external contract
The supplied CRM OpenAPI server is `https://crm.allskyfares.com/api/v1/integrations`. It defines bearer authentication with opaque HMAC tokens and scopes `customers.read`, `bookings.read`, `payments.read`, and `support.write`. It does not define request/response schemas for booking writes or webhook verification, so the OTA does not invent those calls.

## Runtime configuration
The OTA uses its own MySQL database (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `api/.env`; schema in `api/migrations/`, applied on startup or with `node scripts/manage.js migrate`). It does not share the CRM's database, and the browser never calls the CRM. Provider credentials (Duffel, Resend, CRM webhook, hotel and car keys) are stored Fernet-encrypted in the `app_secrets` table and decrypted with `APP_SECRETS_KEY`; a super admin manages them through `/api/admin/secrets`. Confirmed bookings go to the CRM as signed webhooks; see [CRM_WEBHOOK.md](CRM_WEBHOOK.md).

## Booking safety
Duffel calls are server-side only. Customer responses use a safe projection. The OTA booking and an outbox event are saved before any CRM work. If the CRM is down, the confirmed supplier order is kept: the outbox worker retries using the event id as the idempotency key.

## Payment boundary
“Payment through Duffel” requires selecting an approved Duffel payment product and configuring its client-safe token/card flow. Raw card numbers and CVV must never enter React or the database. Until that product and credentials are provided, the API intentionally does not claim to complete payment.

## Customer vs admin data
Customer DTOs contain booking reference, state, currency, customer total, and itinerary-safe data only. Supplier cost, markup, pricing rule details, margin, CRM IDs, and provider credentials belong only in authorized admin/internal projections.

## Unified authentication and role source
All users enter through `/sign-in`. Public registration always creates `CUSTOMER`; employee accounts are not created by public registration. The supplied CRM contract has no user/identity/role endpoints, so CRM-managed employee authentication and role synchronization are a **REQUIRED CRM API EXTENSION**. Until that contract exists, the OTA accepts no invented employee identity flow and does not seed employee accounts.

## Role matrix
| Capability | Customer | Sales Agent | Admin | Super Admin |
|---|---:|---:|---:|---:|
| Flight search | YES | YES | YES | YES |
| Own bookings | YES | YES | YES | YES |
| Customer/booking operations | NO | YES | YES | YES |
| Pricing management | NO | NO | YES | YES |
| CRM monitoring | NO | NO | YES | YES |
| Integration status | NO | NO | YES | YES |
| Secret management | NO | NO | NO | YES |
| User/role management | NO | NO | NO | REQUIRED CRM EXTENSION |

Secrets remain server-side and masked status endpoints never return their values. Provider secrets are encrypted at rest in MySQL with `APP_SECRETS_KEY`; only the database connection and that key live in the environment.