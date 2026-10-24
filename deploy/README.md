# Deploying All Sky Fares

One Node.js app on the existing Hostinger Business plan (account `u633779242`) serves both the website and the API at **https://allskyfares.com**. No VPS needed.

| Part | Where | Source |
|---|---|---|
| Website + API (Node.js 22, Express) | `https://allskyfares.com` (website at `/`, API at `/api`) | `api/`, with the React build copied into `api/public` |
| Database | MySQL `u633779242_AllSky_new`, reached from the app at `127.0.0.1` | `api/migrations/` (run automatically on start) |
| Scheduled work | Hostinger cron every 5 minutes: `POST https://allskyfares.com/api/internal/tick` with header `X-Cron-Secret` | |

The cron job retries CRM webhook deliveries, refreshes route prices, finishes or refunds card payments the browser didn't confirm, expires holds and old sessions. The app also does this every minute while it's running.

## 1. How deploys work

Hostinger deploys from GitHub: every push to `main` on `blank-ui/All-Sky-Fares` starts a new build of allskyfares.com. Hostinger clones the repo, installs `api/`, runs `npm run build:web` (which installs the frontend and copies the React build into `api/public`), then starts `api/server.js`.

Stored build settings (hPanel → Websites → allskyfares.com → Node.js, or `hosting_nodejs_update-build-settings`): Node 22, app type `express`, root directory `api`, build script `build:web`, entry file `server.js`, package manager `npm`.

Run `npm test` in `api/` before pushing: a push goes straight to the live site. Builds and rollbacks are in hPanel's Node.js build history.

Fallback without Git: `powershell -ExecutionPolicy Bypass -File deploy\package.ps1` writes `deploy/out/allskyfares-app.zip`; upload it as `app.zip` to `public_html` and start a Node.js build from the archive.

## 2. Environment variables (hPanel → Websites → allskyfares.com → Node.js)

Set the full list (Hostinger replaces all variables at once, so send every one):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | the `u633779242_AllSky_new` database login |
| `APP_SECRETS_KEY` | same key as now; it decrypts the Duffel/Resend/CRM keys stored in the database. Keep a backup. |
| `APP_URL` | `https://allskyfares.com` (links in emails: set password, sign in, reset) |
| `COOKIE_SECURE` | `true` (secure cookies, HTTPS redirect, HSTS) |
| `CRON_SECRET` | a long random value; the cron job sends it as `X-Cron-Secret` |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | optional, only to seed the first admin |

`CORS_ORIGINS` is no longer needed: the website calls `/api` on the same domain. The current values for the API site are in `api/.env.production.local` (not committed); copy them and change `APP_URL`.

## 3. Deploy

1. Push to `main`. Watch the build in hPanel → Node.js → Builds.
2. Check:
   - `https://allskyfares.com/health` returns `{"status":"ok","database":true}`
   - `https://allskyfares.com/` loads the site, and a deep link like `/help` loads too
   - sign in, search, and the staff workspace work.

Don't guard `app.listen()` with `require.main === module`; Hostinger loads the entry file through its own wrapper.

## 4. After it's live

- **Duffel webhook**: point it at `https://allskyfares.com/api/webhooks/duffel` (Duffel dashboard → Webhooks). Keep the same signing secret, or put the new one in Admin workspace → Credentials → `DUFFEL_WEBHOOK_SECRET`.
- **Email sender**: verify `allskyfares.com` in Resend and set `SENDER_EMAIL` (e.g. `bookings@allskyfares.com`) in Credentials. With Resend's test sender, customers receive no email.
- **Cron job**: point it at the new URL.
- **Retire** `api.allskyfares.com` and `new.allskyfares.com` once the new site is confirmed working.

## Local development

```
cd api && npm install && npm test         # API unit tests
node api/server.js                         # API on http://localhost:8001 using api/.env
cd frontend && npm start                   # website on http://localhost:3000, calling the local API
```
To try the production setup locally, run `npm run build:web` in `api/` and open http://localhost:8001: the API serves the built site.

The local `api/.env` connects to the same database remotely through `srv674.hstgr.io`; Hostinger's Remote MySQL rule must allow your IP.
