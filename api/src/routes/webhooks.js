// Duffel webhooks: signed with DUFFEL_WEBHOOK_SECRET (X-Duffel-Signature: t=<ts>,v1=<hmac>).
// Each event that concerns an order makes us re-read that order, so PNRs, tickets, schedule
// changes and cancellations land on the booking. An event that names a Duffel Payments intent
// finishes a card checkout the browser never confirmed (the scheduled sweep covers the rest).
const crypto = require("crypto");
const express = require("express");
const db = require("../db");
const bk = require("../bookings");
const { cfg } = require("../secrets");
const { utcNow, timingSafeEqualStr } = require("../util");
const { getControlSync } = require("../settings");

const TOLERANCE_SECONDS = 5 * 60;

function verifySignature(raw, header, secret) {
  const parts = Object.fromEntries(String(header || "").split(",").map((kv) => kv.trim().split("=")));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.`).update(raw).digest("hex");
  return timingSafeEqualStr(expected, parts.v1);
}

/** Pulls the order id out of the different event payload shapes. */
function orderIdOf(object) {
  if (!object || typeof object !== "object") return null;
  if (typeof object.id === "string" && object.id.startsWith("ord_")) return object.id;
  return object.order_id || (object.order && object.order.id) || null;
}

/** Pulls a Duffel Payments intent id (pit_...) out of the event, if there is one. */
function paymentIntentIdOf(object, evt = {}) {
  const pit = (v) => (typeof v === "string" && v.startsWith("pit_") ? v : null);
  if (!object || typeof object !== "object") return pit(evt.idempotency_key);
  return pit(object.id) || pit(object.payment_intent_id) || pit((object.payment_intent || {}).id) || pit(evt.idempotency_key);
}

module.exports = (logger) => {
  const r = express.Router();

    const rawParser = express.raw({ type: "*/*", limit: "2mb" });

  const processWebhook = async (req, res) => {
    const secret = cfg("DUFFEL_WEBHOOK_SECRET");
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!secret || !verifySignature(raw, req.get("x-duffel-signature"), secret)) {
      logger.warn("Rejected Duffel webhook with a missing or invalid signature");
      return res.status(401).json({ detail: "Invalid signature" });
    }
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      return res.status(400).json({ detail: "Invalid JSON" });
    }
    const evt = event.data && event.data.type ? event.data : event;
    const type = evt.type || "unknown";
    const eventId = evt.id || event.id || crypto.createHash("sha256").update(raw).digest("hex").slice(0, 40);
    const object = (evt.data && evt.data.object) || evt.object || evt.data || {};
    const orderId = orderIdOf(object);
    const intentId = orderId ? null : paymentIntentIdOf(object, evt);

    try {
      if (await db.fetchOne("SELECT id FROM webhook_events WHERE id = ?", eventId)) return res.json({ received: true, duplicate: true });
      if (orderId) {
        const booking = await db.fetchOne("SELECT * FROM bookings WHERE duffel_order_id = ?", orderId);
        if (booking) {
          if (type === "order.airline_initiated_change_detected") await bk.updateBooking(booking.ota_booking_id, { airline_change: true, updated_at: utcNow() });
          await bk.syncOrder(booking, logger);
          logger.info(`Duffel ${type} synced booking ${booking.booking_reference}`);
        }
      }
      if (intentId) {
        const booking = await db.fetchOne("SELECT * FROM bookings WHERE payment_intent_id = ?", intentId);
        if (booking && booking.status === bk.S.AWAITING_PAYMENT) {
          const result = await bk.finalizeCardBooking(booking, logger);
          logger.info(`Duffel ${type}: card checkout ${booking.booking_reference} ${result.outcome}`);
        }
      }
      await db.insert("webhook_events", { id: String(eventId).slice(0, 64), type, object_id: orderId || intentId, received_at: utcNow() });
      res.json({ received: true, ping: type === "ping.triggered" ? "pong" : undefined });
    } catch (exc) {
      logger.error(`Duffel webhook ${type} failed: ${exc.message}`);
      res.status(500).json({ detail: "Processing failed; Duffel will retry" });
    }
  };

  r.post("/webhooks/duffel", rawParser, processWebhook);
  r.post("/duffel", rawParser, processWebhook);
  r.post("/", rawParser, (req, res, next) => {
    if (req.get("x-duffel-signature")) return processWebhook(req, res);
    next();
  });

  return r;
};

module.exports.verifySignature = verifySignature;
module.exports.paymentIntentIdOf = paymentIntentIdOf;
