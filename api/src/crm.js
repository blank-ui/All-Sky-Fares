// CRM webhook: transactional outbox -> HMAC-signed POST to the CRM, with retries and backoff.
const crypto = require("crypto");
const db = require("./db");
const { cfg, crmWebhookReady } = require("./secrets");
const { getControl } = require("./settings");
const { utcNow, addMs, MINUTE, uuid, round2 } = require("./util");

const CRM_WEBHOOK_MAX_ATTEMPTS = 10;
const CRM_CABIN = { economy: "ECONOMY", premium_economy: "PREMIUM_ECONOMY", business: "BUSINESS", first: "FIRST" };
const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+(?:\.\d+)?S)?)?$/;

function isoDurationMinutes(value) {
  const m = ISO_DURATION.exec(value || "");
  if (!value || !m) return null;
  const [days, hours, minutes] = m.slice(1, 4).map((g) => Number(g || 0));
  return days * 1440 + hours * 60 + minutes;
}

function journeyType(slices) {
  if (slices.length <= 1) return "ONE_WAY";
  if (slices.length === 2 && slices[0].origin === slices[1].destination && slices[0].destination === slices[1].origin) return "ROUND_TRIP";
  return "MULTI_CITY";
}

const CRM_EVENTS = { CREATED: "booking.created", UPDATED: "booking.updated", CANCELLED: "booking.cancelled" };

/**
 * Maps an OTA booking onto the CRM Booking/BookingPassenger/ItineraryJourney/ItinerarySegment shape.
 * Built when the event is delivered, so every event carries the booking's latest state.
 */
function buildCrmBookingPayload(booking, event) {
  const slices = booking.slices || [];
  const jtype = journeyType(slices);
  const firstSlice = slices[0] || {};
  const firstSeg = (firstSlice.segments || [{}])[0] || {};
  const passengers = booking.passengers || [];
  const lead = passengers[0] || {};
  const supplier = Number(booking.supplier_amount || 0);
  const total = Number(booking.customer_total || 0);
  const paid = booking.payment_status === "paid";
  const serviceFee = round2(Math.max(total - supplier, 0));
  const flightNumbers = slices.flatMap((s) => (s.segments || []).map((seg) => `${seg.airline_code || ""}${seg.flight_number || ""}`)).filter(Boolean);
  const confirmed = booking.status === "CONFIRMED";
  return {
    event: event.type,
    event_id: event.event_id,
    occurred_at: event.type === CRM_EVENTS.CREATED ? booking.created_at : event.created_at || booking.updated_at || booking.created_at,
    source: "allskyfares-ota",
    booking: {
      status: confirmed ? "CONFIRMED" : "DRAFT",
      journeyType: jtype,
      customerName: booking.customer_name || `${lead.given_name || ""} ${lead.family_name || ""}`.trim(),
      customerEmail: booking.email || lead.email,
      customerPhone: booking.customer_phone || lead.phone_number,
      departure: firstSlice.origin,
      destination: firstSlice.destination,
      departureDate: firstSlice.departing_at,
      returnDate: jtype === "ROUND_TRIP" ? slices[1].departing_at : null,
      airline: booking.airline || firstSeg.airline,
      flightNumber: `${firstSeg.airline_code || ""}${firstSeg.flight_number || ""}` || null,
      cabinClass: CRM_CABIN[booking.cabin || firstSeg.cabin_class || ""] || null,
      pnr: booking.airline_pnr || null,
      airlineCharge: round2(supplier),
      serviceFee,
      currency: booking.currency || "USD",
      agentName: "Online",
      agent: "Online",
      createdBy: "Online",
      tickets: (booking.tickets || []).filter((t) => t && t.number).map((t) => ({ number: String(t.number), passenger: t.passenger || null })),
      fareInfo: `Online booking via AllSkyFares OTA. Flights: ${flightNumbers.join(", ")}. Pricing rule: ${booking.applied_rule || "n/a"}.`,
      internalNotes:
        (booking.booking_mode === "request"
          ? `BOOKING REQUEST: payment not taken and not ticketed. Call the customer, take payment and ticket Duffel offer ${booking.offer_id} (offers expire; re-price if needed). `
          : booking.status === "ON_HOLD"
            ? `ON HOLD with the airline (PNR ${booking.airline_pnr}), not paid or ticketed. Payment required by ${booking.payment_required_by}. Take payment, then use "Pay & issue tickets" in the OTA admin workspace. `
            : "") +
        `OTA booking number ${booking.booking_reference}. ` +
        `Auto-created from OTA booking ${booking.ota_booking_id} (Duffel order ${booking.duffel_order_id || "none"}, ${booking.live_mode ? "live" : "test"} mode).`,
      passengers: passengers.map((p, i) => ({
        isPrimary: i === 0,
        firstName: p.given_name || "",
        lastName: p.family_name || "",
        title: (p.title || "").toUpperCase() || null,
        email: p.email,
        phone: p.phone_number,
        dateOfBirth: p.born_on,
        passengerType: p.type || "adult",
        sortOrder: i,
      })),
      journeys: slices.map((s, j) => ({
        journeyOrder: j,
        journeyType: j === 0 ? "OUTBOUND" : jtype === "ROUND_TRIP" ? "RETURN" : `LEG_${j + 1}`,
        label: `${s.origin} → ${s.destination}`,
        segments: (s.segments || []).map((seg, k) => ({
          segmentOrder: k,
          marketingAirlineCode: seg.airline_code || null,
          marketingAirlineName: seg.airline || null,
          operatingAirlineCode: seg.operating_airline_code || null,
          operatingAirlineName: seg.operating_airline || null,
          isCodeshare: Boolean(seg.operating_airline_code) && seg.operating_airline_code !== seg.airline_code,
          flightNumber: seg.flight_number,
          departureAirportCode: seg.origin,
          departureAirportName: seg.origin_name || null,
          departureTerminal: seg.origin_terminal ?? null,
          arrivalAirportCode: seg.destination,
          arrivalAirportName: seg.destination_name || null,
          arrivalTerminal: seg.destination_terminal ?? null,
          departureDateTime: seg.departing_at,
          arrivalDateTime: seg.arriving_at,
          durationMinutes: isoDurationMinutes(seg.duration),
          cabinClass: seg.cabin_class || booking.cabin,
          aircraft: seg.aircraft || null,
          segmentStatus: confirmed ? "HK" : null,
          pnr: booking.airline_pnr || null,
        })),
      })),
      payment: {
        amount: round2(total),
        currency: booking.currency || "USD",
        airlineCharge: round2(supplier),
        serviceFee,
        status: paid ? "CAPTURED" : "PENDING",
        method: "OTHER",
        transactionRef: booking.duffel_order_id ?? null,
        notes: paid ? "Settled via Duffel balance" : "Awaiting payment",
      },
      cancellation: booking.status === "CANCELLED"
        ? {
          cancelledAt: booking.cancelled_at || null,
          refundAmount: round2(booking.refund_amount || 0),
          airlineRefund: round2(booking.airline_refund || 0),
          refundStatus: booking.refund_status || null,
          currency: booking.currency || "USD",
        }
        : null,
    },
    external: {
      otaBookingId: booking.ota_booking_id,
      otaCustomerId: booking.user_id,
      duffelOrderId: booking.duffel_order_id ?? null,
      offerId: booking.offer_id,
      liveMode: Boolean(booking.live_mode),
      otaStatus: booking.status || null,
    },
  };
}

function signWebhook(body, timestamp, secret) {
  return `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex")}`;
}

/** 30 s, 60 s, 120 s … capped at 6 hours. */
const nextRetryDelayMs = (attempts) => Math.min(30 * 2 ** Math.max(attempts - 1, 0), 6 * 3600) * 1000;

async function enqueueOutboxEvent(type, bookingId) {
  const eventId = uuid();
  await db.insert("outbox", { event_id: eventId, type, booking_id: bookingId, status: "pending", attempts: 0, next_attempt_at: utcNow(), created_at: utcNow() });
  return eventId;
}

const ticketNumbers = (b) => (b.tickets || []).map((t) => t && t.number).filter(Boolean).sort().join(",");

/** Which event (if any) a change from `before` to `after` should send to the CRM. */
function bookingChangeEvent(before, after) {
  if (!before || !after) return null;
  if (after.status === "CANCELLED") return before.status === "CANCELLED" ? null : CRM_EVENTS.CANCELLED;
  const changed = before.status !== after.status || (before.airline_pnr || null) !== (after.airline_pnr || null)
    || before.payment_status !== after.payment_status || ticketNumbers(before) !== ticketNumbers(after);
  return changed ? CRM_EVENTS.UPDATED : null;
}

/**
 * Queues booking.updated / booking.cancelled when a booking the CRM already knows about changes.
 * Bookings never announced (e.g. an unpaid card checkout) are skipped: the CRM has no record of them.
 */
async function announceBookingChange(before, after, logger = console) {
  const type = bookingChangeEvent(before, after);
  if (!type) return null;
  const announced = await db.fetchOne("SELECT event_id FROM outbox WHERE booking_id = ? AND type = ? LIMIT 1", after.ota_booking_id, CRM_EVENTS.CREATED);
  if (!announced) return null;
  const eventId = await enqueueOutboxEvent(type, after.ota_booking_id);
  dispatchInBackground(eventId, logger);
  return eventId;
}

const OUTBOX_DUE = "((status = 'pending' AND next_attempt_at <= ?) OR (status = 'sending' AND lease_until <= ?))";

/** Leases one due event; the conditional UPDATE succeeds for only one worker. */
async function claimOutboxEvent(eventId = null) {
  const now = utcNow();
  const candidates = eventId
    ? [{ event_id: eventId }]
    : await db.fetchAll(`SELECT event_id FROM outbox WHERE ${OUTBOX_DUE} ORDER BY next_attempt_at LIMIT 10`, now, now);
  for (const c of candidates) {
    const claimed = await db.execute(
      `UPDATE outbox SET status = 'sending', lease_until = ? WHERE event_id = ? AND ${OUTBOX_DUE}`,
      addMs(now, 2 * MINUTE), c.event_id, now, now,
    );
    if (claimed) return db.fetchOne("SELECT * FROM outbox WHERE event_id = ?", c.event_id);
  }
  return null;
}

async function postToCrm(event, body) {
  const mode = await getControl("crm_sync");
  if (mode === "test_bypass") {
    return { error: "", crmBookingId: "mock_test_bypass" };
  }
  if (mode === "disabled") {
    return { error: "CRM webhook dispatch is currently paused by administrator", crmBookingId: null };
  }
  let targetUrl = cfg("CRM_WEBHOOK_URL");
  if (targetUrl) {
    if (targetUrl.endsWith("/api/v1/integrations")) targetUrl += "/ota/bookings";
    else if (targetUrl.endsWith("/api/v1/integrations/ota")) targetUrl += "/bookings";
    else if (!targetUrl.includes("/ota/bookings") && !targetUrl.includes("/bookings")) targetUrl = targetUrl.replace(/\/+$/, "") + "/api/v1/integrations/ota/bookings";
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const r = await fetch(targetUrl, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AllSkyFares-OTA-Webhook/1.0",
        "X-ASF-Event": event.type,
        "X-ASF-Event-Id": event.event_id,
        "X-ASF-Timestamp": timestamp,
        "X-ASF-Signature": signWebhook(body, timestamp, cfg("CRM_WEBHOOK_SECRET")),
        "Idempotency-Key": event.event_id,
      },
    });
    const text = await r.text();
    if (r.status < 200 || r.status >= 300) return { error: `HTTP ${r.status}: ${text.slice(0, 200)}`, crmBookingId: null };
    try {
      const data = JSON.parse(text);
      return { error: "", crmBookingId: (data.data || {}).id || data.id || data.booking_id || null };
    } catch {
      return { error: "", crmBookingId: null }; // no id in body
    }
  } catch (exc) {
    return { error: `${exc.name}: ${exc.message}`.slice(0, 200), crmBookingId: null };
  }
}

/** POSTs one claimed event to the CRM. Returns true on 2xx; otherwise schedules a retry. */
async function deliverOutboxEvent(event, logger = console) {
  const booking = await db.fetchOne("SELECT * FROM bookings WHERE ota_booking_id = ?", event.booking_id);
  if (!booking) {
    await db.execute("UPDATE outbox SET status = 'dead', last_error = 'Booking not found', lease_until = NULL WHERE event_id = ?", event.event_id);
    return false;
  }
  const attempts = (event.attempts || 0) + 1;
  // Updates only make sense once the CRM has the booking: wait (with the normal backoff) for booking.created.
  const created = event.type === CRM_EVENTS.CREATED
    ? null
    : await db.fetchOne("SELECT status FROM outbox WHERE booking_id = ? AND type = ? ORDER BY created_at LIMIT 1", event.booking_id, CRM_EVENTS.CREATED);
  const { error, crmBookingId } = created && created.status !== "delivered"
    ? { error: "Waiting for booking.created to be delivered", crmBookingId: null }
    : await postToCrm(event, JSON.stringify(buildCrmBookingPayload(booking, event)));

  const now = utcNow();
  if (!error) {
    await db.execute("UPDATE outbox SET status = 'delivered', attempts = ?, delivered_at = ?, last_error = NULL, lease_until = NULL WHERE event_id = ?", attempts, now, event.event_id);
    await db.execute("UPDATE bookings SET crm_sync_status = 'SYNCED', crm_booking_id = COALESCE(?, crm_booking_id), crm_synced_at = ?, crm_last_error = NULL WHERE ota_booking_id = ?", crmBookingId ? String(crmBookingId) : null, now, booking.ota_booking_id);
    logger.info(`CRM webhook delivered ${event.type} event=${event.event_id} booking=${booking.booking_reference}`);
    return true;
  }
  const dead = attempts >= CRM_WEBHOOK_MAX_ATTEMPTS;
  await db.execute(
    "UPDATE outbox SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ?, lease_until = NULL WHERE event_id = ?",
    dead ? "dead" : "pending", attempts, error, addMs(now, nextRetryDelayMs(attempts)), event.event_id,
  );
  await db.execute("UPDATE bookings SET crm_sync_status = ?, crm_last_error = ? WHERE ota_booking_id = ?", dead ? "FAILED" : "RETRYING", error, booking.ota_booking_id);
  logger.warn(`CRM webhook failed event=${event.event_id} attempt=${attempts}: ${error}`);
  return false;
}

async function dispatchOutbox(eventId = null, limit = 25, logger = console) {
  if (!crmWebhookReady()) return 0;
  let delivered = 0;
  for (let i = 0; i < (eventId ? 1 : limit); i += 1) {
    const event = await claimOutboxEvent(eventId);
    if (!event) break;
    if (await deliverOutboxEvent(event, logger)) delivered += 1;
  }
  return delivered;
}

function dispatchInBackground(eventId, logger = console) {
  dispatchOutbox(eventId, 1, logger).catch((exc) => logger.warn(`Immediate CRM dispatch failed for ${eventId}: ${exc.message}`));
}

module.exports = {
  CRM_EVENTS, isoDurationMinutes, journeyType, buildCrmBookingPayload, signWebhook, nextRetryDelayMs,
  bookingChangeEvent, announceBookingChange, enqueueOutboxEvent, claimOutboxEvent, deliverOutboxEvent, dispatchOutbox, dispatchInBackground,
};
