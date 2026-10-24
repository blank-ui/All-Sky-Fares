const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const db = require("../db");
const v = require("../validate");
const { SECRET_NAMES, cfg, cipher, storeSecret, crmWebhookReady, duffelKey, duffelMode } = require("../secrets");
const { DUFFEL_BASE, duffelHeaders, duffelCall } = require("../duffel");
const { applyMarkup } = require("../pricing");
const { dispatchOutbox } = require("../crm");
const { requirePermission, requireRoles, audit } = require("../auth");
const { HttpError, ah, utcNow, addMs, HOUR, DAY, uuid } = require("../util");
const bk = require("../bookings");
const { emailBookingInBackground } = require("../notify");
const documents = require("../documents");
const pdf = require("../pdf");

const MARKUP_COLUMNS = "id, origin, destination, markup_amount, markup_percent, current_price, price_currency, price_live, price_checked_at, updated_at";
const PRICE_REFRESH_HOURS = 3;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

/** Adds the customer total for one adult at the current fare. */
function markupView(row) {
  const price = row.current_price;
  const [total, added] = price != null ? applyMarkup(price, 1, row) : [null, null];
  return { ...row, total, markup_total: added };
}

async function listMarkupRows() {
  const rows = await db.fetchAll(`SELECT ${MARKUP_COLUMNS} FROM route_markups ORDER BY origin = '*', origin, destination = '*', destination`);
  return rows.map(markupView);
}

/** Cheapest one-way economy fare for one adult, 30 days out, fetched from Duffel now. */
async function lowestFare(origin, destination, logger) {
  const day = addMs(utcNow(), 30 * DAY).toISOString().slice(0, 10);
  const payload = { data: { slices: [{ origin, destination, departure_date: day }], passengers: [{ type: "adult" }], cabin_class: "economy" } };
  const data = (await duffelCall("POST", "/air/offer_requests?return_offers=true&supplier_timeout=15000", payload, logger)).data || {};
  const offers = data.offers || [];
  if (!offers.length) return null;
  const best = offers.reduce((a, b) => (Number(b.total_amount) < Number(a.total_amount) ? b : a));
  return { amount: Number(best.total_amount), currency: best.total_currency || "USD", live: Boolean(data.live_mode) };
}

/** Fetches the current fare for each route, 4 at a time. Returns a list of failures. */
async function refreshRoutePrices(routes, logger = console) {
  const failed = [];
  const queue = routes.filter((r) => r.origin !== "*" && r.destination !== "*");
  const worker = async () => {
    while (queue.length) {
      const route = queue.shift();
      const label = `${route.origin}→${route.destination}`;
      try {
        const fare = await lowestFare(route.origin, route.destination, logger);
        if (!fare) { failed.push(`${label}: no fares found`); continue; }
        await db.execute("UPDATE route_markups SET current_price = ?, price_currency = ?, price_live = ?, price_checked_at = ? WHERE id = ?", fare.amount, fare.currency, fare.live, utcNow(), route.id);
      } catch (exc) {
        if (exc instanceof HttpError) failed.push(`${label}: ${exc.detail}`);
        else throw exc;
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return failed;
}

const allPricedRoutes = () => db.fetchAll("SELECT id, origin, destination FROM route_markups WHERE origin <> '*' AND destination <> '*'");

/** Re-checks route prices older than PRICE_REFRESH_HOURS (run by the scheduler). */
async function refreshStalePrices(logger) {
  if (!duffelKey()) return 0;
  const stale = await db.fetchAll(
    "SELECT id, origin, destination FROM route_markups WHERE origin <> '*' AND destination <> '*' AND (price_checked_at IS NULL OR price_checked_at < ?)",
    addMs(utcNow(), -PRICE_REFRESH_HOURS * HOUR),
  );
  if (stale.length) {
    const failed = await refreshRoutePrices(stale, logger);
    logger.info(`Refreshed current prices for ${stale.length - failed.length} route(s); ${failed.length} failed`);
  }
  return stale.length;
}

const CSV_ALIASES = {
  origin: ["origin", "departure", "from", "departure_iata", "origin_iata"],
  destination: ["destination", "to", "arrival", "destination_iata"],
  markup_amount: ["markup_amount", "markup", "amount", "fixed"],
  markup_percent: ["markup_percent", "percent", "markup_%", "%_markup", "percentage"],
};

function csvNumber(value, row, field) {
  const n = Number(String(value ?? "0").trim().replace(/[%$]/g, "") || 0);
  if (!Number.isFinite(n)) throw new HttpError(400, `Row ${row}: ${field} must be a number`);
  if (n < 0) throw new HttpError(400, `Row ${row}: ${field} can't be negative`);
  return n;
}

/** Accepts the simple format (origin,destination,markup_amount,markup_percent) and the old rule
 * export (name,priority,airline,origin,destination,markup_type,markup_value). */
function parseMarkupCsv(buffer) {
  let rows;
  try {
    rows = parse(buffer.toString("utf8").replace(/^﻿/, ""), { relax_column_count: true, skip_empty_lines: true });
  } catch (exc) {
    throw new HttpError(400, `Couldn't read the CSV: ${exc.message}`);
  }
  rows = rows.filter((r) => r.some((c) => String(c).trim()));
  if (rows.length < 2) throw new HttpError(400, "The file has no data rows.");
  const header = rows[0].map((h) => String(h).trim().toLowerCase().replace(/ /g, "_"));
  const legacy = header.includes("markup_type") && header.includes("markup_value");
  const col = Object.fromEntries(Object.entries(CSV_ALIASES).map(([k, aliases]) => [k, aliases.map((a) => header.indexOf(a)).find((i) => i >= 0) ?? null]));
  if (col.origin == null || col.destination == null) throw new HttpError(400, "CSV needs origin and destination columns (also accepted: departure/from and to).");
  const parsed = new Map();
  rows.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (i) => (i != null && i < cells.length ? String(cells[i]).trim() : "");
    let origin;
    let destination;
    try {
      origin = v.normalizeAirport(get(col.origin));
      destination = v.normalizeAirport(get(col.destination));
    } catch (exc) {
      throw new HttpError(400, `Row ${line}: ${exc.message}`);
    }
    let amount;
    let percent;
    if (legacy) {
      // Tolerate rows with stray extra commas: type and value are always the last two cells.
      const [type, value] = cells.length > header.length ? cells.slice(-2) : [get(header.indexOf("markup_type")), get(header.indexOf("markup_value"))];
      const mtype = String(type).trim().toLowerCase();
      const n = csvNumber(value, line, "markup_value");
      if (!["fixed", "percentage"].includes(mtype)) throw new HttpError(400, `Row ${line}: markup_type must be fixed or percentage`);
      [amount, percent] = mtype === "fixed" ? [n, 0] : [0, n];
    } else {
      amount = csvNumber(get(col.markup_amount), line, "markup_amount");
      percent = csvNumber(get(col.markup_percent), line, "markup_percent");
    }
    parsed.set(`${origin}|${destination}`, { origin, destination, markup_amount: amount, markup_percent: percent });
  });
  return [...parsed.values()];
}

const UPSERT_MARKUP =
  "INSERT INTO route_markups (id, origin, destination, markup_amount, markup_percent, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
  "ON DUPLICATE KEY UPDATE markup_amount = VALUES(markup_amount), markup_percent = VALUES(markup_percent), updated_at = VALUES(updated_at)";

const mask = (value) => (value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "••••");

function router(logger) {
  const r = express.Router();

  // ---- route markups
  r.get("/admin/markups", requirePermission("pricing.read"), ah(async (req, res) => {
    res.json({ markups: await listMarkupRows(), duffel_mode: duffelMode(), refresh_hours: PRICE_REFRESH_HOURS });
  }));

  r.post("/admin/markups", requirePermission("pricing.manage"), ah(async (req, res) => {
    const b = v.body(req);
    let origin;
    let destination;
    try {
      origin = v.normalizeAirport(b.origin);
      destination = v.normalizeAirport(b.destination);
    } catch (exc) {
      throw new HttpError(422, exc.message);
    }
    const amount = v.num(b, "markup_amount", { min: 0, max: 100000 });
    const percent = v.num(b, "markup_percent", { min: 0, max: 500 });
    const now = utcNow();
    await db.execute(UPSERT_MARKUP, uuid(), origin, destination, amount, percent, req.user.id, now, now);
    await audit(req.user.id, "pricing.markup_saved", { origin, destination, markup_amount: amount, markup_percent: percent });
    const route = await db.fetchOne("SELECT id, origin, destination FROM route_markups WHERE origin = ? AND destination = ?", origin, destination);
    const failed = origin !== "*" && destination !== "*" ? await refreshRoutePrices([route], logger) : [];
    const row = await db.fetchOne(`SELECT ${MARKUP_COLUMNS} FROM route_markups WHERE id = ?`, route.id);
    res.json({ markup: markupView(row), price_error: failed[0] || null });
  }));

  r.delete("/admin/markups/:id", requirePermission("pricing.manage"), ah(async (req, res) => {
    const row = await db.fetchOne("SELECT origin, destination FROM route_markups WHERE id = ?", req.params.id);
    if (!row) throw new HttpError(404, "Markup not found");
    await db.execute("DELETE FROM route_markups WHERE id = ?", req.params.id);
    await audit(req.user.id, "pricing.markup_deleted", row);
    res.json({ deleted: true });
  }));

  r.post("/admin/markups/refresh-prices", requirePermission("pricing.manage"), ah(async (req, res) => {
    const routes = await allPricedRoutes();
    const failed = await refreshRoutePrices(routes, logger);
    res.json({ markups: await listMarkupRows(), refreshed: routes.length - failed.length, failed, duffel_mode: duffelMode() });
  }));

  r.post("/admin/markups/import", requirePermission("pricing.manage"), upload.single("file"), ah(async (req, res) => {
    if (!req.file || !/\.csv$/i.test(req.file.originalname || "")) throw new HttpError(400, "Upload a .csv file.");
    const parsed = parseMarkupCsv(req.file.buffer);
    if (String(req.body.commit).toLowerCase() !== "true") return res.json({ preview: parsed, count: parsed.length });
    const now = utcNow();
    // Adds new routes and updates existing ones; routes not in the file are left alone.
    for (const m of parsed) await db.execute(UPSERT_MARKUP, uuid(), m.origin, m.destination, m.markup_amount, m.markup_percent, req.user.id, now, now);
    await audit(req.user.id, "pricing.markups_imported", { count: parsed.length });
    const keys = new Set(parsed.map((m) => `${m.origin}|${m.destination}`));
    const imported = (await allPricedRoutes()).filter((m) => keys.has(`${m.origin}|${m.destination}`));
    refreshRoutePrices(imported, logger).catch((exc) => logger.warn(`Background price refresh failed: ${exc.message}`));
    res.json({ imported: parsed.length, pricing: imported.length, markups: await listMarkupRows() });
  }));

  r.get("/admin/markups/export", requirePermission("pricing.read"), ah(async (req, res) => {
    const rows = await db.fetchAll("SELECT origin, destination, markup_amount, markup_percent FROM route_markups ORDER BY origin, destination");
    const lines = ["origin,destination,markup_amount,markup_percent", ...rows.map((m) => `${m.origin},${m.destination},${Number(m.markup_amount).toFixed(2)},${Number(m.markup_percent)}`)];
    res.set("Content-Disposition", 'attachment; filename="route-markups.csv"').type("text/csv").send(`${lines.join("\r\n")}\r\n`);
  }));

  // ---- bookings and CRM queue
  r.get("/admin/bookings", requirePermission("bookings.read"), ah(async (req, res) => {
    const docs = await db.fetchAll("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100");
    for (const d of docs) {
      d.passenger_names = (d.passengers || []).map((p) => `${p.given_name} ${p.family_name}`);
      d.can_cancel = bk.canCancel(d);
      delete d.passengers;
    }
    res.json({ bookings: docs });
  }));

  const staffBooking = async (req) => {
    const id = req.params.id;
    const doc = await db.fetchOne(
      "SELECT * FROM bookings WHERE ota_booking_id = ? OR booking_reference = ?",
      id, id
    );
    if (!doc) throw new HttpError(404, "Booking not found");
    return doc;
  };

  r.get("/admin/bookings/:id", requirePermission("bookings.read"), ah(async (req, res) => {
    const doc = await staffBooking(req);
    res.json({ booking: doc });
  }));

  r.get("/admin/bookings/:id/:doc(eticket|invoice)", requirePermission("bookings.read"), ah(async (req, res) => {
    const doc = await staffBooking(req);
    if (req.query.format === "pdf") {
      const buf = req.params.doc === "eticket" ? await pdf.eticketPdf(doc) : await pdf.invoicePdf(doc);
      return res.type("application/pdf")
        .set({
          "Content-Disposition": `attachment; filename="${req.params.doc === "eticket" ? "E-ticket" : "Invoice"}-${doc.booking_reference}.pdf"`,
          "Cache-Control": "no-store",
        })
        .send(buf);
    }
    res.type("html").set("Cache-Control", "no-store").send(req.params.doc === "eticket" ? documents.renderEticket(doc) : documents.renderInvoice(doc));
  }));

  r.post("/admin/bookings/:id/cancel/quote", requirePermission("bookings.manage"), ah(async (req, res) => {
    res.json({ quote: await bk.cancellationQuote(await staffBooking(req), logger) });
  }));

  r.post("/admin/bookings/:id/cancel/confirm", requirePermission("bookings.manage"), ah(async (req, res) => {
    const updated = await bk.confirmCancellation(await staffBooking(req), req.user.id, logger);
    await audit(req.user.id, "staff.booking_cancelled", { booking_reference: updated.booking_reference, refund: updated.refund_amount });
    res.json({ booking: updated });
  }));

  // Hold paid by the customer through the reservations team: pay the airline from the Duffel balance and ticket it.
  r.post("/admin/bookings/:id/pay", requirePermission("bookings.manage"), ah(async (req, res) => {
    const label = v.str(v.body(req), "payment_method", { required: false, max: 80, label: "Payment method" });
    const updated = await bk.payHold(await staffBooking(req), (label || "").trim() || "Paid via reservations team", logger);
    await audit(req.user.id, "staff.hold_paid", { booking_reference: updated.booking_reference });
    if (updated.status === "CONFIRMED") emailBookingInBackground(updated, logger); // tickets issued: send them
    res.json({ booking: updated });
  }));

  r.post("/admin/bookings/:id/sync", requirePermission("bookings.read"), ah(async (req, res) => {
    res.json({ booking: await bk.syncOrder(await staffBooking(req), logger) });
  }));

  const OUTBOX_COLUMNS = "event_id, type, booking_id, status, attempts, next_attempt_at, last_error, delivered_at, created_at";

  r.get("/admin/crm/outbox", requirePermission("crm.read"), ah(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : null;
    const events = status
      ? await db.fetchAll(`SELECT ${OUTBOX_COLUMNS} FROM outbox WHERE status = ? ORDER BY created_at DESC LIMIT 100`, status)
      : await db.fetchAll(`SELECT ${OUTBOX_COLUMNS} FROM outbox ORDER BY created_at DESC LIMIT 100`);
    const counts = { pending: 0, sending: 0, delivered: 0, dead: 0 };
    for (const row of await db.fetchAll("SELECT status, COUNT(*) AS n FROM outbox GROUP BY status")) counts[row.status] = Number(row.n);
    res.json({ configured: crmWebhookReady(), counts, events });
  }));

  r.post("/admin/crm/outbox/:eventId/retry", requirePermission("crm.read"), ah(async (req, res) => {
    if (!crmWebhookReady()) throw new HttpError(503, "CRM webhook is not configured (CRM_WEBHOOK_URL / CRM_WEBHOOK_SECRET).");
    const { eventId } = req.params;
    const matched = await db.execute("UPDATE outbox SET status = 'pending', next_attempt_at = ?, attempts = 0 WHERE event_id = ? AND status IN ('pending', 'dead')", utcNow(), eventId);
    if (!matched) throw new HttpError(404, "No retryable event with that id");
    const delivered = await dispatchOutbox(eventId, 1, logger);
    await audit(req.user.id, "crm.webhook_retry", { event_id: eventId, delivered: Boolean(delivered) });
    res.json({ delivered: Boolean(delivered), event: await db.fetchOne(`SELECT ${OUTBOX_COLUMNS} FROM outbox WHERE event_id = ?`, eventId) });
  }));

  // ---- integration health
  async function duffelHealth() {
    if (!duffelKey()) return { provider: "Duffel", status: "Not Configured", healthy: false, detail: "No Duffel key for the selected environment" };
    try {
      const resp = await fetch(`${DUFFEL_BASE}/air/airlines?limit=1`, { headers: duffelHeaders(), signal: AbortSignal.timeout(8000) });
      return { provider: "Duffel", status: resp.status === 200 ? "Connected" : "Error", healthy: resp.status === 200, detail: `HTTP ${resp.status} · ${duffelMode()} mode` };
    } catch (exc) {
      return { provider: "Duffel", status: "Error", healthy: false, detail: String(exc.message).slice(0, 80) };
    }
  }

  async function databaseHealth() {
    try {
      await db.ping();
      return { provider: "MySQL Database", status: "Connected", healthy: true, detail: `${process.env.DB_NAME || ""} @ ${process.env.DB_HOST || ""}` };
    } catch (exc) {
      return { provider: "MySQL Database", status: "Error", healthy: false, detail: String(exc.message).slice(0, 80) };
    }
  }

  async function crmHealth() {
    const provider = "AllSkyFares CRM (booking webhook)";
    if (!crmWebhookReady()) return { provider, status: "Not Configured", healthy: false, detail: "Set CRM_WEBHOOK_URL and CRM_WEBHOOK_SECRET" };
    try {
      const row = await db.fetchOne("SELECT SUM(status = 'dead') AS dead, SUM(status IN ('pending', 'sending')) AS pending FROM outbox");
      const dead = Number(row.dead || 0);
      return { provider, status: dead ? "Error" : "Connected", healthy: !dead, detail: `${Number(row.pending || 0)} queued, ${dead} failed permanently` };
    } catch (exc) {
      return { provider, status: "Error", healthy: false, detail: String(exc.message).slice(0, 80) };
    }
  }

  r.get("/admin/integrations/status", requireRoles("ADMIN", "SUPER_ADMIN"), ah(async (req, res) => {
    const [duffel, database, crm] = await Promise.all([duffelHealth(), databaseHealth(), crmHealth()]);
    const resend = cfg("RESEND_API_KEY")
      ? { provider: "Resend Email", status: "Connected", healthy: true, detail: `Sender: ${cfg("SENDER_EMAIL", "onboarding@resend.dev")}` }
      : { provider: "Resend Email", status: "Not Configured", healthy: false, detail: "RESEND_API_KEY missing" };
    const tawk = await getSetting("tawk");
    const hotels = cfg("HOTELS_PROVIDER_KEY");
    const cars = cfg("CARS_PROVIDER_KEY");
    res.json({ integrations: [
      duffel, resend, database, crm,
      { provider: "Hotels (Duffel Stays / Amadeus)", status: hotels ? "Connected" : "Not Configured", healthy: Boolean(hotels), detail: hotels ? "Key present" : "Not wired to a live provider yet" },
      { provider: "Cars (Amadeus / CarTrawler)", status: cars ? "Connected" : "Not Configured", healthy: Boolean(cars), detail: cars ? "Key present" : "Not wired to a live provider yet" },
      { provider: "Payment Provider (Stripe/Duffel Payments)", status: "Not Configured", healthy: false, detail: "Live card capture deferred" },
      { provider: "Tawk.to Live Chat", status: tawk.enabled && tawk.property_id ? "Connected" : "Not Configured", healthy: Boolean(tawk.enabled && tawk.property_id), detail: tawk.property_id ? "Configured" : "Waiting for property ID" },
    ] });
  }));

  // ---- live chat settings
  async function getSetting(key) {
    const row = await db.fetchOne("SELECT value FROM settings WHERE `key` = ?", key);
    return (row && row.value) || {};
  }

  r.get("/settings/tawk", ah(async (req, res) => {
    try {
      const doc = await getSetting("tawk");
      res.json({ enabled: Boolean(doc.enabled) && Boolean(doc.property_id), property_id: doc.property_id || "", widget_id: doc.widget_id || "default" });
    } catch {
      res.json({ enabled: false, property_id: "", widget_id: "default" });
    }
  }));

  r.put("/admin/settings/tawk", requireRoles("ADMIN", "SUPER_ADMIN"), ah(async (req, res) => {
    const b = v.body(req);
    const doc = {
      property_id: (v.str(b, "property_id", { required: false, max: 60 }) || "").trim(),
      widget_id: (v.str(b, "widget_id", { required: false, max: 60 }) || "").trim() || "default",
      enabled: b.enabled === undefined ? true : Boolean(b.enabled),
    };
    await db.upsert("settings", { key: "tawk", value: doc, updated_at: utcNow(), updated_by: req.user.id }, ["key"]);
    await audit(req.user.id, "settings.tawk_updated", { enabled: doc.enabled });
    res.json(doc);
  }));

  // ---- provider credentials (super admin; values are never returned)
  r.get("/admin/secrets", requireRoles("SUPER_ADMIN"), ah(async (req, res) => {
    const rows = new Map((await db.fetchAll("SELECT name, updated_at FROM app_secrets")).map((x) => [x.name, x]));
    res.json({
      encryption_configured: Boolean(cipher()),
      secrets: SECRET_NAMES.map((name) => ({
        name,
        source: rows.has(name) ? "database" : process.env[name] ? "environment" : "missing",
        preview: cfg(name) ? mask(cfg(name)) : "",
        updated_at: rows.has(name) ? rows.get(name).updated_at : null,
      })),
      duffel: { active: duffelMode(), test_ready: Boolean(duffelKey("test")), live_ready: Boolean(duffelKey("live")) },
    });
  }));

  r.put("/admin/secrets/:name", requireRoles("SUPER_ADMIN"), ah(async (req, res) => {
    const { name } = req.params;
    if (!SECRET_NAMES.includes(name)) throw new HttpError(404, "Unknown credential");
    if (!cipher()) throw new HttpError(503, "APP_SECRETS_KEY is not configured on the server");
    const value = v.str(v.body(req), "value", { min: 1, max: 4000, label: "Value" }).trim();
    const env = { DUFFEL_TEST_API_KEY: "test", DUFFEL_LIVE_API_KEY: "live" }[name];
    if (env && !value.startsWith(`duffel_${env}_`)) throw new HttpError(422, `${name} must start with duffel_${env}_`);
    await storeSecret(name, value, req.user.id);
    await audit(req.user.id, "settings.secret_updated", { name });
    res.json({ name, source: "database", preview: mask(value) });
  }));


  // ---- live integration & webhook gateway controls (admin / super admin)
  r.get("/admin/integrations/controls", requireRoles("ADMIN", "SUPER_ADMIN"), ah(async (req, res) => {
    const { getAllControls } = require("../settings");
    const controls = await getAllControls();
    res.json({ controls });
  }));

  r.put("/admin/integrations/controls/:key", requireRoles("ADMIN", "SUPER_ADMIN"), ah(async (req, res) => {
    const { getAllControls, setControl } = require("../settings");
    const { key } = req.params;
    const body = v.body(req);
    const value = v.str(body, "value", { min: 1, max: 64, label: "Control Value" }).trim();

    const controls = await getAllControls();
    const ctrl = controls[key];
    if (!ctrl) {
      throw new HttpError(404, `Unknown integration control: ${key}`);
    }
    if (ctrl.requiresSuperAdmin && req.user.role !== "SUPER_ADMIN") {
      throw new HttpError(403, `Modifying ${ctrl.label || key} requires SUPER_ADMIN privilege`);
    }
    // Switching to an environment with no key would take search and checkout offline.
    if (key === "duffel_environment" && ctrl.allowedModes.includes(value) && !duffelKey(value)) {
      throw new HttpError(409, `Add a Duffel ${value} key (DUFFEL_${value.toUpperCase()}_API_KEY) under Credentials first.`);
    }

    const updated = await setControl(key, value, req.user.id);
    await audit(req.user.id, "settings.control_updated", { key, value });
    res.json({
      success: true,
      key,
      mode: value,
      message: `Control '${ctrl.label || key}' updated to '${ctrl.labels?.[value] || value}'.`,
      controls: updated,
    });
  }));

  return r;
}

module.exports = { router, refreshStalePrices, parseMarkupCsv, markupView };
