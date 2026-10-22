# Authentication Testing Playbook

Use the configured external API URL from `/app/frontend/.env`; do not place credentials in source or browser storage.

1. Register a development customer with `POST /api/auth/register`; verify the response role is `CUSTOMER` and no password/hash/token is returned.
2. Confirm the response sets an HttpOnly `access_token` cookie. Call `GET /api/auth/me` with that cookie and verify the same customer identity.
3. Confirm invalid credentials return a generic 401 and repeated failures eventually return 429.
4. Confirm `POST /api/auth/logout` clears the session and subsequent `/api/auth/me` returns 401.
5. Confirm a customer cannot access `/api/admin/pricing/rules`, `/api/admin/pricing/simulate`, `/api/admin/bookings`, or `/api/admin/integrations/status`.
6. Confirm employee-role tests use CRM-provisioned identities only after the CRM supplies user/identity and role endpoints. No development employee credentials are seeded by default.

The current CRM contract does not define employee identity, role, permission, or webhook schemas. Do not fabricate those calls in tests.