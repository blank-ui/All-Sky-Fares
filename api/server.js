// All Sky Fares OTA API (Express + MySQL). Entry point for Hostinger Node.js hosting.
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./src/db");
const { loadSecrets, crmWebhookReady, cfg } = require("./src/secrets");
const { dispatchOutbox } = require("./src/crm");
const { hashPassword } = require("./src/auth");
const { HttpError, utcNow, addMs, DAY, uuid, timingSafeEqualStr } = require("./src/util");
const { loadAllSettings } = require("./src/settings");
const admin = require("./src/routes/admin");

const logger = {
  info: (m) => console.log(`INFO ${new Date().toISOString()} ${m}`),
  warn: (m) => console.warn(`WARN ${new Date().toISOString()} ${m}`),
  error: (m) => console.error(`ERROR ${new Date().toISOString()} ${m}`),
};

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // one reverse proxy (Hostinger) in front: req.ip is the real client

const configuredOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter((o) => o && o !== "*");
const allowedOrigins = new Set([...configuredOrigins, "https://allskyfares.com", "https://www.allskyfares.com", "https://new.allskyfares.com", "http://localhost:3000"]);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)), credentials: true }));

app.get("/api/airline-logos/:code.png", async (req, res) => {
  const code = (req.params.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!code) return res.status(404).end();
  const { getAirlineLogoBuffer } = require("./src/pdf");
  const buf = await getAirlineLogoBuffer(code);
  if (!buf) return res.status(404).end();
  res.set({
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=604800, immutable",
    "Access-Control-Allow-Origin": "*",
  }).send(buf);
});

// One site serves both the website and /api, so plain-HTTP visits are sent to HTTPS here.
app.use((req, res, next) => {
  if (process.env.COOKIE_SECURE === "true" && req.get("x-forwarded-proto") === "http") {
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  }
  next();
});

app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin" });
  if (process.env.COOKIE_SECURE === "true") res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path.startsWith("/api/") && !["/api/settings/tawk", "/api/booking-mode"].includes(req.path)) res.set("Cache-Control", "no-store");
  // Documents are opened as pages and use Google Fonts / html2pdf; everything else is JSON.
  next();
});
// Duffel webhooks need the raw body for signature checks, so they're mounted before the JSON parser.
app.use("/api", require("./src/routes/webhooks")(logger));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ---- health
let dbReady = false;
const health = (req, res) => {
  if (!dbReady) return res.status(503).json({ status: "starting", database: false, service: "AllSkyFares OTA API" });
  res.json({ status: "ok", database: true, service: "AllSkyFares OTA API" });
};
app.get("/health", health);
app.get("/api/health", health);
app.get("/api/", (req, res) => res.json({ service: "AllSkyFares OTA", status: "ready", duffel: Boolean(cfg("DUFFEL_API_KEY")) }));

// ---- routes
const api = express.Router();
api.use(require("./src/routes/auth")(logger));
api.use(require("./src/routes/customer").router(logger));
api.use(require("./src/routes/flights")(logger));
api.use(admin.router(logger));

// Scheduled work, also callable by a Hostinger cron job in case the app process was idle.
// One run at a time, whether the in-app timer or the cron call started it.
let tickRunning = false;
async function tick() {
  if (!dbReady) return { skipped: "database not ready" };
  if (tickRunning) return { skipped: "already running" };
  tickRunning = true;
  try {
    const delivered = await dispatchOutbox(null, 25, logger);
    const bookings = require("./src/bookings");
    const holds = await bookings.expireHolds(logger);
    const cardCheckouts = await bookings.sweepCardPayments(logger);
    await db.execute("DELETE FROM sessions WHERE expires_at < ?", utcNow());
    await db.execute("DELETE FROM password_resets WHERE expires_at < ?", addMs(utcNow(), -DAY));
    // Last: one Duffel search per stale route can take minutes, and paid checkouts mustn't wait on it.
    const priced = await admin.refreshStalePrices(logger);
    return { delivered, priced, holds, cardCheckouts };
  } finally {
    tickRunning = false;
  }
}
api.post("/internal/tick", async (req, res, next) => {
  const secret = process.env.CRON_SECRET || "";
  if (!secret || !timingSafeEqualStr(req.get("x-cron-secret") || "", secret)) return next(new HttpError(404, "Not Found"));
  try {
    res.json(await tick());
  } catch (exc) {
    next(exc);
  }
});
app.use("/api", api);

// ---- website: the React build (npm run build:web copies it to api/public) on the same domain as /api.
const WEB_ROOT = process.env.WEB_ROOT || path.join(__dirname, "public");
if (process.env.EMBEDDED_API !== "true" && fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
  app.use(express.static(WEB_ROOT, {
    index: false,
    setHeaders(res, file) {
      // Hashed bundles never change; everything else is checked on each visit.
      res.set("Cache-Control", /[\\/]static[\\/]/.test(file) ? "public, max-age=31536000, immutable" : "no-cache");
    },
  }));
  // Every other GET that isn't the API is a page of the single-page app.
  app.get(/^\/(?!api(\/|$)|health$).*/, (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(WEB_ROOT, "index.html")));
  logger.info(`Serving the website from ${WEB_ROOT}`);
}

// ---- errors
if (process.env.EMBEDDED_API === "true") {
  app.use("/api", (req, res) => res.status(404).json({ detail: "Not Found" }));
} else {
  app.use((req, res) => res.status(404).json({ detail: "Not Found" }));
}
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) return res.status(err.status).json({ detail: err.detail });
  if (err.type === "entity.parse.failed") return res.status(400).json({ detail: "Invalid JSON body" });
  if (err.name === "MulterError") return res.status(400).json({ detail: err.message });
  logger.error(`${req.method} ${req.originalUrl}: ${err.stack || err}`);
  res.status(500).json({ detail: "Something went wrong. Please try again." });
});

// ---- startup
async function seedSuperAdmin() {
  // Credentials come from the environment only; never hard-code them.
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  if (!email || !password) return;
  const doc = await db.fetchOne("SELECT id, role FROM users WHERE email = ?", email);
  if (!doc) {
    await db.insert("users", { id: uuid(), email, password_hash: await hashPassword(password), first_name: "Bipul", last_name: "Admin", phone: "", role: "SUPER_ADMIN", status: "active", created_at: utcNow() });
    logger.info(`Seeded SUPER_ADMIN account: ${email}`);
  } else if (doc.role !== "SUPER_ADMIN") {
    await db.execute("UPDATE users SET role = 'SUPER_ADMIN', status = 'active' WHERE id = ?", doc.id);
  }
}

// The database holds the provider credentials, so keep retrying until it's reachable.
async function initDatabase(attempt = 1) {
  try {
    const applied = await db.runMigrations();
    if (applied.length) logger.info(`Applied database migrations: ${applied.join(", ")}`);
    const count = await loadSecrets(logger);
    logger.info(`Database ready (${process.env.DB_NAME || ""}); ${count} provider credential(s) loaded from app_secrets.`);
    await seedSuperAdmin();
    await loadAllSettings(); // warms the cache that getControlSync reads
    dbReady = true;
    if (!crmWebhookReady()) logger.warn("CRM_WEBHOOK_URL/CRM_WEBHOOK_SECRET not set; bookings will queue in the outbox until configured.");
  } catch (exc) {
    logger.error(`Database unavailable (attempt ${attempt}): ${exc.message}. Retrying in 15s.`);
    await db.close();
    setTimeout(() => initDatabase(attempt + 1), 15000).unref();
  }
}

// Always start standalone unless running embedded inside the frontend dev server on the same port.
if (process.env.EMBEDDED_API !== "true") {
  const port = Number(process.env.PORT || 8001);
  app.listen(port, () => logger.info(`AllSkyFares API listening on ${port}`));
  initDatabase();
  setInterval(() => tick().catch((exc) => logger.warn(`Scheduled work failed: ${exc.message}`)), 60 * 1000).unref();
} else {
  initDatabase();
}

module.exports = { app, tick, initDatabase, logger };
