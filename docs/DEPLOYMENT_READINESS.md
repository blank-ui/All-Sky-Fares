# Deployment readiness and legal compliance

Checked on 15 October 2026, updated after the move to Node.js. **Verdict: not ready to launch yet.** The API and staging site are live and pass every check, but six items still need you before `allskyfares.com` switches over. This is a technical review, not legal advice; have a travel-industry lawyer review the policies before launch.

## Blockers (need you)

| # | Blocker | What to do |
|---|---|---|
| ✅ | ~~Hosting~~ | **Done.** The API was ported to Node.js and runs at `https://api.allskyfares.com` on the existing plan; staging is at `https://new.allskyfares.com`. See `deploy/README.md`. |
| ✅ | ~~Test Duffel key~~ | **Done.** A live key is stored, and prices and searches are real. |
| 3 | **No online payment.** Checkout used to issue tickets on the agency's Duffel balance without charging the customer. | **Now gated:** with a live key, checkout sends a *booking request* to the CRM and an agent takes payment and tickets. Only set `INSTANT_TICKETING=enabled` once card payments (e.g. Duffel Payments or Stripe hosted fields) are built. |
| 4 | **Company details aren't shown anywhere.** | Fill `companyName`, `address` and `sellerOfTravel` in `frontend/src/constants/legal.js`. Several US states (including California, Florida, Hawaii, Iowa and Washington) require seller-of-travel registration to sell to their residents, and California requires the number to be shown. |
| 5 | **Exposed credentials.** The Duffel and Resend keys are in git history; the database password and the admin password were shared in chat. | Rotate the Duffel and Resend keys (then update them under Credentials). Change the MySQL password in hPanel, then update `DB_PASSWORD` in the API's environment variables and in `api/.env`. Change the super admin password. The `APP_SECRETS_KEY` and `CRON_SECRET` also passed through this chat; rotating `APP_SECRETS_KEY` means re-entering the provider keys afterwards. |
| 6 | **Emails won't reach customers.** `SENDER_EMAIL` is `onboarding@resend.dev`, which only delivers to the Resend account owner. | Verify `allskyfares.com` in Resend (SPF/DKIM) and set `SENDER_EMAIL` to e.g. `no-reply@allskyfares.com`. |
| 7 | **CRM sync isn't connected.** | Merge and deploy the CRM's `feature/ota-booking-webhook` branch, then set `CRM_WEBHOOK_URL` under Credentials. |
| 8 | **Policies need a lawyer's review.** | They're now accurate to how the site works, but confirm governing law, service-fee refundability and the refund rules in 14 CFR part 260. |

## Production configuration

See `deploy/README.md`. The API runs on Hostinger Node.js hosting with `DB_HOST=127.0.0.1`. A cron job calls `/api/internal/tick` every 5 minutes, and `GET /health` returns 503 until the database is connected. The database's Remote MySQL rule currently allows any host (`%`), which is only needed for local development; restrict it to your own IP.

The old Python backend has been removed; the Node.js API in `api/` serves the same endpoints, database and encrypted credentials. `npm test` in `api/` runs the unit tests.

## Fixed in this pass

**Legal and consumer protection**
- Removed the invented fares on the homepage and destination cards (US DOT full-fare advertising rule, 14 CFR 399.84). Every price shown is now a live total including taxes and the service fee.
- Checkout's fake "88% fare / 12% tax" split is replaced by the real airline fare, airline taxes and our service fee.
- Added the airline baggage-fee notice on the results page and at checkout (14 CFR 399.85).
- Removed claims the site can't back up: "Verified IATA Partner", "Guaranteed Best Fares", "Guaranteed Price", "Zero hidden fees", "Zero surprise markups", "exclusive unpublished inventory" and the "Legally Reviewed" badge. The phone-deals popup text is now factual.
- Checkout requires accepting the Terms, Refund Policy, Privacy Policy and airline fare rules. Acceptance is stored with the booking (`terms_accepted_at`).
- Rewrote the FAQ, Privacy, Terms, Refund and Cookie pages to match what the site actually does: real data collected, real processors (Duffel, Resend, Tawk.to, hosting), the 24-hour rule, the 7- and 20-day refund timing, the minimum age of 18, and CCPA and GDPR rights.
- Cookie consent: the Tawk.to chat (third-party cookies) loads only after "Accept all". The "Cookie Preferences" link in the footer reopens the choice.
- Customers can download their data and delete their account (Account Settings). Bookings are kept with the login anonymised, for tax and aviation record-keeping.

**Security and reliability**
- Rate limits on sign-up (10 per hour per IP) and password reset (3 per hour per email, 10 per hour per IP).
- Security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS when `COOKIE_SECURE=true`) and `no-store` on account APIs.
- Startup retries the database every 15 seconds. Before, one failed connection left the server running without its Duffel key until a restart.

## Still open (not blocking)

- **Accessibility:** no full WCAG 2.1 AA audit yet. Large US ticket agents are covered by DOT accessibility rules, and the ADA applies.
- **Baggage notice links:** the notice links to the airline's site in general; linking each airline's baggage-fee page directly would be better.
- **Popup heading:** "Get Undisclosed Fares & Secret Discounts" is kept as you designed it. Make sure phone-only fares actually exist on the routes you advertise.

## Verified

- Frontend production build: compiles.
- Unit tests: 7 of 7 pass, including the live-key booking gate.
- End-to-end against the live database: 14 of 14 checks pass. They cover the security headers, the real fare breakdown, checkout refusing to proceed without terms, the stored terms acceptance, data export, account deletion with anonymisation, and the password-reset rate limit.
