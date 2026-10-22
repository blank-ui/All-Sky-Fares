// Booking lifecycle with Duffel: card payment (Duffel Payments) -> ticketed order, airline holds
// (real PNR, pay later), ticket/PNR sync, cancellations and refunds.
const crypto = require("crypto");
const db = require("./db");
const { duffelCall } = require("./duffel");
const { announceBookingChange, CRM_EVENTS, enqueueOutboxEvent, dispatchInBackground } = require("./crm");
const { audit } = require("./auth");
const { emailBookingInBackground } = require("./notify");
const { HttpError, utcNow, addMs, MINUTE, HOUR, DAY, round2, parseIso } = require("./util");

// Booking statuses
const S = {
  PROCESSING: "PROCESSING", // reserving the key, talking to Duffel
  AWAITING_PAYMENT: "AWAITING_PAYMENT", // card checkout started, not paid yet
  PAYING: "PAYING", // payment being confirmed / order being created
  ON_HOLD: "ON_HOLD", // held with the airline (real PNR), not paid or ticketed
  CONFIRMED: "CONFIRMED", // paid; tickets issued or being issued
  REQUESTED: "REQUESTED", // no airline record yet; an agent follows up
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED", // hold expired before payment
  FAILED: "FAILED", // payment taken but the airline order failed (refunded)
};

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
/** Our booking number, e.g. ASFUBUB. */
function newBookingReference() {
  let out = "ASF";
  for (let i = 0; i < 4; i += 1) out += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return out;
}

const money = (n) => Number(n).toFixed(2);

// ---- Duffel Payments (card) ----

/** Creates a payment intent for the customer total. Returns null if Duffel Payments isn't enabled. */
async function createPaymentIntent(amount, currency, logger) {
  try {
    const pi = (await duffelCall("POST", "/payments/payment_intents", { data: { amount: money(amount), currency } }, logger)).data;
    return { id: pi.id, clientToken: pi.client_token };
  } catch (exc) {
    if (exc instanceof HttpError && /not available for your account|unavailable/i.test(String(exc.detail))) {
      logger.warn("Duffel Payments is not enabled for this account; falling back to a hold or request.");
      return null;
    }
    throw exc;
  }
}

async function getPaymentIntent(id, logger) {
  return (await duffelCall("GET", `/payments/payment_intents/${id}`, undefined, logger)).data;
}

async function confirmPaymentIntent(id, logger) {
  return (await duffelCall("POST", `/payments/payment_intents/${id}/actions/confirm`, {}, logger)).data;
}

async function refundPaymentIntent(paymentIntentId, amount, currency, logger) {
  const refund = (await duffelCall("POST", "/payments/refunds", { data: { payment_intent_id: paymentIntentId, amount: money(amount), currency } }, logger)).data;
  return refund.status || "pending";
}

function cardLabel(pi) {
  const brand = String(pi.card_network || pi.card_brand || "Card").replace(/^\w/, (c) => c.toUpperCase());
  const last4 = pi.card_last_four_digits || pi.card_last_four || "";
  return last4 ? `${brand} ending in ${last4}` : `${brand} (Duffel Payments)`;
}

// ---- Orders ----

function duffelPassengers(booking) {
  return booking.passengers.map((p) => ({
    id: p.duffel_id, type: p.type, title: p.title, gender: p.gender, given_name: p.given_name,
    family_name: p.family_name, born_on: p.born_on, email: p.email, phone_number: p.phone_number,
  }));
}

async function createOrder(booking, type, logger) {
  // No `metadata`: Duffel rejects hold orders that carry it ("invalid_order_create_type").
  const data = { type, selected_offers: [booking.offer_id], passengers: duffelPassengers(booking) };
  if (type === "instant") data.payments = [{ type: "balance", amount: money(booking.supplier_amount), currency: booking.currency }];
  return (await duffelCall("POST", "/air/orders", { data }, logger)).data;
}

/** Fields we keep from a Duffel order: airline PNR, tickets, payment deadline and status. */
function orderFields(order, booking) {
  const byId = new Map((order.passengers || []).map((p) => [p.id, `${p.given_name || ""} ${p.family_name || ""}`.trim()]));
  const tickets = (order.documents || [])
    .filter((d) => d.type === "electronic_ticket")
    .map((d) => ({ number: d.unique_identifier, passenger: (d.passenger_ids || []).map((id) => byId.get(id)).filter(Boolean).join(", ") }));
  const ps = order.payment_status || {};
  const fields = {
    airline_pnr: order.booking_reference || booking.airline_pnr || null,
    duffel_order_id: order.id,
    tickets,
    payment_required_by: ps.payment_required_by ? parseIso(ps.payment_required_by) : null,
    live_mode: Boolean(order.live_mode),
    updated_at: utcNow(),
  };
  if (order.cancelled_at) {
    fields.status = S.CANCELLED;
    fields.cancelled_at = booking.cancelled_at ? parseIso(booking.cancelled_at) : parseIso(order.cancelled_at);
  } else if (ps.awaiting_payment) {
    fields.status = S.ON_HOLD;
  } else if ([S.ON_HOLD, S.PAYING, S.CONFIRMED].includes(booking.status)) {
    fields.status = S.CONFIRMED;
    if (booking.payment_status !== "paid") fields.payment_status = "paid";
  }
  return fields;
}

async function updateBooking(otaBookingId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  await db.execute(`UPDATE bookings SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")} WHERE ota_booking_id = ?`, ...keys.map((k) => fields[k]), otaBookingId);
}

/** Tells the CRM about a change. The airline-side change already happened, so a queueing error is only logged. */
async function notifyCrm(before, after, logger) {
  try {
    await announceBookingChange(before, after, logger);
  } catch (exc) {
    logger.error(`Couldn't queue the CRM update for ${after.booking_reference}: ${exc.message}`);
  }
}

async function refreshOrder(booking, logger) {
  const order = (await duffelCall("GET", `/air/orders/${booking.duffel_order_id}`, undefined, logger)).data;
  await updateBooking(booking.ota_booking_id, orderFields(order, booking));
  return db.fetchOne("SELECT * FROM bookings WHERE ota_booking_id = ?", booking.ota_booking_id);
}

/** Re-reads the Duffel order, stores PNR, tickets and status, and tells the CRM if anything changed. */
async function syncOrder(booking, logger) {
  if (!booking.duffel_order_id) return booking;
  const updated = await refreshOrder(booking, logger);
  await notifyCrm(booking, updated, logger);
  return updated;
}

/** Pays an airline hold from the Duffel balance (after the agent has taken payment) so tickets are issued. */
async function payHold(booking, paymentLabel, logger) {
  if (booking.status !== S.ON_HOLD || !booking.duffel_order_id) throw new HttpError(409, "Only bookings on hold can be paid.");
  const order = (await duffelCall("GET", `/air/orders/${booking.duffel_order_id}`, undefined, logger)).data;
  if (!(order.payment_status || {}).awaiting_payment) return syncOrder(booking, logger);
  await duffelCall("POST", "/air/payments", { data: { order_id: order.id, payment: { type: "balance", amount: order.total_amount, currency: order.total_currency } } }, logger);
  await updateBooking(booking.ota_booking_id, {
    status: S.CONFIRMED, payment_status: "paid", paid_at: utcNow(), payment_method: paymentLabel || "Paid via reservations team",
    supplier_amount: Number(order.total_amount),
  });
  const updated = await refreshOrder({ ...booking, status: S.CONFIRMED }, logger);
  await notifyCrm(booking, updated, logger);
  return updated;
}

/** Queues booking.created (or booking.updated if the CRM already has it), audits and starts delivery. */
async function announceBooking(booking, action, actorId, logger) {
  const known = await db.fetchOne("SELECT event_id FROM outbox WHERE booking_id = ? AND type = ? LIMIT 1", booking.ota_booking_id, CRM_EVENTS.CREATED);
  const eventId = await enqueueOutboxEvent(known ? CRM_EVENTS.UPDATED : CRM_EVENTS.CREATED, booking.ota_booking_id);
  await audit(actorId, action, { booking_reference: booking.booking_reference, airline_pnr: booking.airline_pnr || null, duffel_order_id: booking.duffel_order_id || null });
  dispatchInBackground(eventId, logger);
}

// ---- Finishing card checkouts ----

/**
 * What to do with a card checkout given its payment intent status. The browser confirms right after
 * the card form succeeds (`fromBrowser`); the webhook and sweep only confirm once the card was taken.
 */
function cardPaymentAction(piStatus, fromBrowser = false) {
  if (piStatus === "succeeded") return "finalize";
  if (piStatus === "requires_confirmation" || fromBrowser) return "confirm";
  return "wait";
}

/**
 * Takes the money and tickets a card booking: AWAITING_PAYMENT -> PAYING (lock) -> CONFIRMED, or
 * FAILED with a refund when the airline won't accept the order. Used by the browser confirm, the
 * Duffel webhook and the scheduled sweep; the lock makes sure only one of them creates the order.
 * Returns { outcome: "busy" | "unpaid" | "payment_error" | "failed" | "confirmed", booking, reason }.
 */
async function finalizeCardBooking(booking, logger, { fromBrowser = false } = {}) {
  const actorId = booking.user_id;
  if (!(await db.execute("UPDATE bookings SET status = ? WHERE ota_booking_id = ? AND status = ?", S.PAYING, booking.ota_booking_id, S.AWAITING_PAYMENT))) {
    return { outcome: "busy", booking };
  }
  let pi;
  try {
    // A retry after a confirm that already went through must not confirm twice.
    pi = await getPaymentIntent(booking.payment_intent_id, logger);
    if (pi && cardPaymentAction(pi.status, fromBrowser) === "confirm") pi = await confirmPaymentIntent(booking.payment_intent_id, logger);
  } catch (exc) {
    await updateBooking(booking.ota_booking_id, { status: S.AWAITING_PAYMENT });
    return { outcome: "payment_error", booking, reason: exc.detail || exc.message };
  }
  if (!pi || pi.status !== "succeeded") {
    await updateBooking(booking.ota_booking_id, { status: S.AWAITING_PAYMENT });
    return { outcome: "unpaid", booking, reason: pi ? pi.status : "missing" };
  }
  const paid = { payment_status: "paid", paid_at: utcNow(), payment_method: cardLabel(pi), updated_at: utcNow() };
  let order;
  try {
    order = await createOrder({ ...booking }, "instant", logger);
  } catch (exc) {
    // The airline didn't accept the order (often a price or seat change): give the money back.
    const reason = String(exc.detail || exc.message);
    let refund = "manual";
    try {
      refund = await refundPaymentIntent(booking.payment_intent_id, booking.customer_total, booking.currency, logger);
    } catch (refundExc) {
      logger.error(`Refund after failed order ${booking.booking_reference} failed: ${refundExc.message}`);
    }
    await updateBooking(booking.ota_booking_id, { ...paid, status: S.FAILED, refund_amount: booking.customer_total, refund_status: refund, failure_reason: reason.slice(0, 500) });
    await audit(actorId, "customer.booking_failed", { booking_reference: booking.booking_reference, reason });
    const failed = await db.fetchOne("SELECT * FROM bookings WHERE ota_booking_id = ?", booking.ota_booking_id);
    return { outcome: "failed", booking: failed, reason };
  }
  await updateBooking(booking.ota_booking_id, { ...paid, ...orderFields(order, { ...booking, status: S.PAYING }), status: S.CONFIRMED });
  const updated = await db.fetchOne("SELECT * FROM bookings WHERE ota_booking_id = ?", booking.ota_booking_id);
  await announceBooking(updated, "customer.booking_paid", actorId, logger);
  emailBookingInBackground(updated, logger);
  return { outcome: "confirmed", booking: updated };
}

const CARD_SWEEP_EVERY = 5 * MINUTE;
const CARD_SWEEP_AFTER = 10 * MINUTE; // give the browser time to confirm first
const CARD_SWEEP_WINDOW = 2 * DAY; // abandoned checkouts stop being polled after this
let lastCardSweep = 0;

/** Card checkouts the browser never confirmed: finish the ones whose card was charged. */
async function sweepCardPayments(logger, { force = false } = {}) {
  if (!force && Date.now() - lastCardSweep < CARD_SWEEP_EVERY) return 0;
  lastCardSweep = Date.now();
  // Past the window nobody checks them again, so close them instead of leaving "awaiting payment" forever.
  await db.execute("UPDATE bookings SET status = ?, updated_at = ? WHERE status = ? AND created_at <= ?", S.EXPIRED, utcNow(), S.AWAITING_PAYMENT, addMs(utcNow(), -CARD_SWEEP_WINDOW));
  const due = await db.fetchAll(
    "SELECT * FROM bookings WHERE status = ? AND payment_intent_id IS NOT NULL AND created_at < ? AND created_at > ? ORDER BY created_at LIMIT 20",
    S.AWAITING_PAYMENT, addMs(utcNow(), -CARD_SWEEP_AFTER), addMs(utcNow(), -CARD_SWEEP_WINDOW),
  );
  let finished = 0;
  for (const b of due) {
    try {
      // Check first so an abandoned checkout doesn't take the lock while the customer is still paying.
      const pi = await getPaymentIntent(b.payment_intent_id, logger);
      if (cardPaymentAction(pi && pi.status) === "wait") continue;
      const result = await finalizeCardBooking(b, logger);
      if (["confirmed", "failed"].includes(result.outcome)) finished += 1;
      logger.info(`Card sweep: ${b.booking_reference} ${result.outcome}${result.reason ? ` (${result.reason})` : ""}`);
    } catch (exc) {
      logger.warn(`Couldn't finish card checkout ${b.booking_reference}: ${exc.message}`);
    }
  }
  return finished;
}

// ---- Cancellation ----

const CANCELLABLE = [S.CONFIRMED, S.ON_HOLD, S.REQUESTED, S.AWAITING_PAYMENT];

function firstDeparture(booking) {
  const seg = (((booking.slices || [])[0] || {}).segments || [])[0] || {};
  return seg.departing_at ? parseIso(seg.departing_at) : null;
}

function canCancel(booking) {
  if (!CANCELLABLE.includes(booking.status)) return false;
  const dep = firstDeparture(booking);
  return !dep || dep > utcNow();
}

/** 24-hour rule from our Refund Policy: cancelled within 24 h of payment, booked 7+ days before departure. */
function within24HourRule(booking) {
  const paid = parseIso(booking.paid_at);
  const dep = firstDeparture(booking);
  return Boolean(paid && utcNow() - paid <= 24 * HOUR && (!dep || dep - paid >= 7 * DAY));
}

/** Asks Duffel what the airline would refund, and works out what the customer gets back. */
async function cancellationQuote(booking, logger) {
  if (!canCancel(booking)) throw new HttpError(409, "This booking can no longer be cancelled online. Please contact us.");
  const currency = booking.currency || "USD";
  const paidOnline = booking.payment_status === "paid";
  if (!booking.duffel_order_id) {
    return { cancellation_id: null, airline_refund: 0, customer_refund: 0, currency, refund_to: null, expires_at: null, paid: false, note: "Nothing has been charged, so there's nothing to refund." };
  }
  const quote = (await duffelCall("POST", "/air/order_cancellations", { data: { order_id: booking.duffel_order_id } }, logger)).data;
  await updateBooking(booking.ota_booking_id, { duffel_cancellation_id: quote.id });
  if (!paidOnline) {
    return { cancellation_id: quote.id, airline_refund: 0, customer_refund: 0, currency, refund_to: null, expires_at: quote.expires_at, paid: false, note: "Your seats are on hold and haven't been paid for, so cancelling is free." };
  }
  const airlineRefund = Number(quote.refund_amount || 0);
  const cashRefund = ["original_form_of_payment", "balance"].includes(quote.refund_to);
  const serviceFee = within24HourRule(booking) ? Number(booking.service_fee || 0) : 0;
  const customerRefund = round2(Math.min(Number(booking.customer_total || 0), (cashRefund ? airlineRefund : 0) + serviceFee));
  let note = customerRefund > 0 ? `You'll get ${currency} ${money(customerRefund)} back to your original payment method.` : "This fare is non-refundable, so no money will be returned.";
  if (!cashRefund && airlineRefund > 0) note = `The airline will give ${currency} ${money(airlineRefund)} as ${String(quote.refund_to).replace(/_/g, " ")} instead of cash.${serviceFee ? ` Our service fee of ${currency} ${money(serviceFee)} is refunded to your payment method.` : ""}`;
  return { cancellation_id: quote.id, airline_refund: airlineRefund, customer_refund: customerRefund, currency, refund_to: quote.refund_to, expires_at: quote.expires_at, paid: true, note };
}

/** Confirms the cancellation with the airline and refunds the customer's card where it applies. */
async function confirmCancellation(booking, actorId, logger) {
  if (!canCancel(booking)) throw new HttpError(409, "This booking can no longer be cancelled online. Please contact us.");
  const fields = { status: S.CANCELLED, cancelled_at: utcNow(), cancelled_by: actorId, updated_at: utcNow() };
  if (booking.duffel_order_id) {
    if (!booking.duffel_cancellation_id) throw new HttpError(409, "Please review the refund quote first.");
    const quote = await cancellationQuote({ ...booking }, logger); // fresh quote: the previous one may have expired
    await duffelCall("POST", `/air/order_cancellations/${quote.cancellation_id}/actions/confirm`, {}, logger);
    fields.airline_refund = quote.airline_refund;
    fields.refund_amount = quote.customer_refund;
    if (quote.customer_refund > 0) {
      if (booking.payment_intent_id) {
        try {
          fields.refund_status = await refundPaymentIntent(booking.payment_intent_id, quote.customer_refund, quote.currency, logger);
        } catch (exc) {
          logger.error(`Card refund failed for ${booking.booking_reference}: ${exc.message}`);
          fields.refund_status = "manual"; // the team refunds it by hand
        }
      } else {
        fields.refund_status = "manual"; // paid through the reservations team
      }
    }
  }
  await updateBooking(booking.ota_booking_id, fields);
  const updated = await db.fetchOne("SELECT * FROM bookings WHERE ota_booking_id = ?", booking.ota_booking_id);
  await notifyCrm(booking, updated, logger);
  return updated;
}

/** Holds past their payment deadline: re-check with Duffel and mark them expired if unpaid. */
async function expireHolds(logger) {
  const due = await db.fetchAll("SELECT * FROM bookings WHERE status = ? AND payment_required_by IS NOT NULL AND payment_required_by < ? LIMIT 20", S.ON_HOLD, utcNow());
  for (const b of due) {
    try {
      const synced = await syncOrder(b, logger);
      if (synced.status === S.ON_HOLD) await updateBooking(b.ota_booking_id, { status: S.EXPIRED, updated_at: utcNow() });
    } catch (exc) {
      logger.warn(`Couldn't check hold ${b.booking_reference}: ${exc.message}`);
    }
  }
  return due.length;
}

module.exports = {
  S, newBookingReference, createPaymentIntent, getPaymentIntent, confirmPaymentIntent, refundPaymentIntent, cardLabel,
  createOrder, orderFields, updateBooking, syncOrder, payHold, canCancel, cancellationQuote, confirmCancellation, expireHolds, firstDeparture,
  announceBooking, cardPaymentAction, finalizeCardBooking, sweepCardPayments,
};
