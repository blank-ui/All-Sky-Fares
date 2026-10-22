// Card checkouts finished without the browser: finalizeCardBooking (shared by the confirm route,
// webhook and sweep) and sweepCardPayments, against an in-memory db and a stubbed Duffel.
const test = require("node:test");
const assert = require("node:assert");

process.env.DUFFEL_API_KEY = "duffel_test_unit";

const db = require("../src/db");
const bk = require("../src/bookings");

const quiet = { info() {}, warn() {}, error() {} };
let bookings;
let inserts;
let duffel;
let duffelCalls;

function fakeQuery(sql, args) {
  const clean = sql.replace(/\s+/g, " ");
  if (clean.startsWith("SELECT * FROM bookings WHERE ota_booking_id = ?")) {
    const b = bookings.get(args[0]);
    return b ? [structuredClone(b)] : [];
  }
  if (clean.startsWith("SELECT * FROM bookings WHERE status = ? AND payment_intent_id IS NOT NULL")) {
    const [status, olderThan, newerThan] = args;
    return [...bookings.values()]
      .filter((b) => b.status === status && b.payment_intent_id && new Date(b.created_at) < new Date(olderThan) && new Date(b.created_at) > new Date(newerThan))
      .map((b) => structuredClone(b));
  }
  if (clean.startsWith("UPDATE bookings SET status = ?, updated_at = ? WHERE status = ? AND created_at <= ?")) {
    const stale = [...bookings.values()].filter((b) => b.status === args[2] && new Date(b.created_at) <= new Date(args[3]));
    stale.forEach((b) => { b.status = args[0]; });
    return stale.length;
  }
  if (clean.startsWith("UPDATE bookings SET status = ? WHERE ota_booking_id = ? AND status = ?")) {
    const b = bookings.get(args[1]);
    if (!b || b.status !== args[2]) return 0;
    b.status = args[0];
    return 1;
  }
  if (clean.startsWith("UPDATE bookings SET `")) {
    const keys = [...clean.matchAll(/`(\w+)` = \?/g)].map((m) => m[1]);
    const b = bookings.get(args[keys.length]);
    keys.forEach((k, i) => { b[k] = args[i]; });
    return 1;
  }
  if (/FROM outbox WHERE booking_id = \? AND type = \?/.test(clean)) return [];
  if (clean.startsWith("SELECT id, email, password_set FROM users")) return [];
  if (clean.startsWith("UPDATE outbox SET status = 'sending'")) return 0; // leave CRM events queued
  if (/^SELECT event_id FROM outbox WHERE/.test(clean)) return [];
  throw new Error(`fake db: unhandled SQL ${clean}`);
}

db.fetchAll = async (sql, ...args) => fakeQuery(sql, args);
db.fetchOne = async (sql, ...args) => fakeQuery(sql, args)[0] || null;
db.execute = async (sql, ...args) => fakeQuery(sql, args);
db.insert = async (table, row) => { inserts.push({ table, ...row }); };

global.fetch = async (url, init = {}) => {
  const path = url.slice("https://api.duffel.com".length);
  duffelCalls.push(`${init.method} ${path}`);
  const handler = duffel[`${init.method} ${path}`];
  if (!handler) throw new Error(`unexpected Duffel call ${init.method} ${path}`);
  const [status, data] = handler(init.body ? JSON.parse(init.body) : undefined);
  const body = status >= 400 ? { errors: [{ message: data }] } : { data };
  return { status, json: async () => body, text: async () => JSON.stringify(body) };
};

const ORDER = {
  id: "ord_1", booking_reference: "PNR123", live_mode: false, passengers: [{ id: "pas_1", given_name: "Jane", family_name: "Doe" }],
  documents: [{ type: "electronic_ticket", unique_identifier: "1251234567890", passenger_ids: ["pas_1"] }], payment_status: { awaiting_payment: false },
};
const PAID = { id: "pit_1", status: "succeeded", card_network: "visa", card_last_four_digits: "4242" };

function cardBooking(overrides = {}) {
  return {
    ota_booking_id: "ota-1", booking_reference: "ASFCARD", offer_id: "off_1", user_id: "user-1", email: "jane@example.com",
    status: "AWAITING_PAYMENT", booking_mode: "card", payment_intent_id: "pit_1", payment_status: "unpaid",
    supplier_amount: 400, customer_total: 435, currency: "USD",
    passengers: [{ type: "adult", given_name: "Jane", family_name: "Doe", duffel_id: "pas_1" }],
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function reset(...list) {
  bookings = new Map(list.map((b) => [b.ota_booking_id, b]));
  inserts = [];
  duffel = {};
  duffelCalls = [];
}

const actions = () => inserts.filter((r) => r.table === "audit_log").map((r) => r.action);

test("a charged card is ticketed and confirmed without the browser", async () => {
  reset(cardBooking());
  duffel = { "GET /payments/payment_intents/pit_1": () => [200, PAID], "POST /air/orders": () => [200, ORDER] };
  const result = await bk.finalizeCardBooking(cardBooking(), quiet);
  assert.equal(result.outcome, "confirmed");
  const b = bookings.get("ota-1");
  assert.equal(b.status, "CONFIRMED");
  assert.equal(b.payment_status, "paid");
  assert.equal(b.airline_pnr, "PNR123");
  assert.equal(b.payment_method, "Visa ending in 4242");
  assert.ok(!duffelCalls.includes("POST /payments/payment_intents/pit_1/actions/confirm"), "already succeeded: no second confirm");
  assert.deepEqual(actions(), ["customer.booking_paid"]);
  assert.deepEqual(inserts.filter((r) => r.table === "outbox").map((r) => r.type), ["booking.created"]);
});

test("a card taken but not confirmed is confirmed first", async () => {
  reset(cardBooking());
  duffel = {
    "GET /payments/payment_intents/pit_1": () => [200, { ...PAID, status: "requires_confirmation" }],
    "POST /payments/payment_intents/pit_1/actions/confirm": () => [200, PAID],
    "POST /air/orders": () => [200, ORDER],
  };
  assert.equal((await bk.finalizeCardBooking(cardBooking(), quiet)).outcome, "confirmed");
});

test("the airline refusing the order refunds the card and fails the booking", async () => {
  reset(cardBooking());
  let refund;
  duffel = {
    "GET /payments/payment_intents/pit_1": () => [200, PAID],
    "POST /air/orders": () => [422, "The offer is no longer available"],
    "POST /payments/refunds": (body) => { refund = body.data; return [200, { status: "succeeded" }]; },
  };
  const result = await bk.finalizeCardBooking(cardBooking(), quiet);
  assert.equal(result.outcome, "failed");
  const b = bookings.get("ota-1");
  assert.equal(b.status, "FAILED");
  assert.equal(b.refund_status, "succeeded");
  assert.deepEqual(refund, { payment_intent_id: "pit_1", amount: "435.00", currency: "USD" });
  assert.deepEqual(actions(), ["customer.booking_failed"]);
});

test("an unpaid intent goes back to AWAITING_PAYMENT; a booking already PAYING is left alone", async () => {
  reset(cardBooking());
  duffel = { "GET /payments/payment_intents/pit_1": () => [200, { id: "pit_1", status: "requires_payment_method" }] };
  assert.equal((await bk.finalizeCardBooking(cardBooking(), quiet)).outcome, "unpaid");
  assert.equal(bookings.get("ota-1").status, "AWAITING_PAYMENT");

  reset(cardBooking({ status: "PAYING" }));
  assert.equal((await bk.finalizeCardBooking(cardBooking(), quiet)).outcome, "busy");
  assert.deepEqual(duffelCalls, [], "the lock holder is the only one talking to Duffel");
});

test("browser confirm and webhook racing: only one airline order", async () => {
  reset(cardBooking());
  let orders = 0;
  duffel = { "GET /payments/payment_intents/pit_1": () => [200, PAID], "POST /air/orders": () => { orders += 1; return [200, ORDER]; } };
  const results = await Promise.all([bk.finalizeCardBooking(cardBooking(), quiet, { fromBrowser: true }), bk.finalizeCardBooking(cardBooking(), quiet)]);
  assert.deepEqual(results.map((r) => r.outcome).sort(), ["busy", "confirmed"]);
  assert.equal(orders, 1);
});

test("sweep: finishes charged checkouts older than 10 minutes, skips fresh and abandoned ones", async () => {
  const charged = cardBooking();
  const fresh = cardBooking({ ota_booking_id: "ota-2", booking_reference: "ASFNEWW", payment_intent_id: "pit_2", created_at: new Date().toISOString() });
  const abandoned = cardBooking({ ota_booking_id: "ota-3", booking_reference: "ASFGONE", payment_intent_id: "pit_3" });
  const stale = cardBooking({ ota_booking_id: "ota-4", booking_reference: "ASFOLDD", payment_intent_id: "pit_4", created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() });
  reset(charged, fresh, abandoned, stale);
  duffel = {
    "GET /payments/payment_intents/pit_1": () => [200, PAID],
    "GET /payments/payment_intents/pit_3": () => [200, { id: "pit_3", status: "requires_payment_method" }],
    "POST /air/orders": () => [200, ORDER],
  };
  assert.equal(await bk.sweepCardPayments(quiet, { force: true }), 1);
  assert.equal(bookings.get("ota-1").status, "CONFIRMED");
  assert.equal(bookings.get("ota-2").status, "AWAITING_PAYMENT");
  assert.equal(bookings.get("ota-3").status, "AWAITING_PAYMENT");
  assert.equal(bookings.get("ota-4").status, "EXPIRED", "checkouts past the 2-day window are closed");
  assert.ok(!duffelCalls.includes("GET /payments/payment_intents/pit_2"), "the browser still has time to confirm");
  assert.equal(await bk.sweepCardPayments(quiet), 0, "throttled to every few minutes");
});
