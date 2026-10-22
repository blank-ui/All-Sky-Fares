// booking.updated / booking.cancelled: when bookings.js queues them and how the outbox delivers them.
// Runs against an in-memory stand-in for the db module and a stubbed fetch (Duffel + CRM).
const test = require("node:test");
const assert = require("node:assert");

process.env.DUFFEL_API_KEY = "duffel_test_unit";
process.env.CRM_WEBHOOK_URL = "https://crm.example.test/api/v1/integrations/ota/bookings";
process.env.CRM_WEBHOOK_SECRET = "test-secret-0123456789";

const db = require("../src/db");
const crm = require("../src/crm");
const bk = require("../src/bookings");

const quiet = { info() {}, warn() {}, error() {} };
let bookings;
let outbox;

function fakeQuery(sql, args) {
  const clean = sql.replace(/\s+/g, " ");
  if (clean.startsWith("SELECT * FROM bookings WHERE ota_booking_id = ?")) {
    const b = bookings.get(args[0]);
    return b ? [structuredClone(b)] : [];
  }
  if (clean.startsWith("SELECT * FROM outbox WHERE event_id = ?")) return outbox.filter((e) => e.event_id === args[0]);
  if (/FROM outbox WHERE booking_id = \? AND type = \?/.test(clean)) return outbox.filter((e) => e.booking_id === args[0] && e.type === args[1]);
  if (clean.startsWith("UPDATE bookings SET `")) {
    const keys = [...clean.matchAll(/`(\w+)` = \?/g)].map((m) => m[1]);
    const b = bookings.get(args[keys.length]);
    keys.forEach((k, i) => { b[k] = args[i]; });
    return 1;
  }
  if (clean.startsWith("UPDATE bookings SET crm_sync_status = 'SYNCED'")) {
    const b = bookings.get(args[2]);
    Object.assign(b, { crm_sync_status: "SYNCED", crm_booking_id: args[0] ?? b.crm_booking_id });
    return 1;
  }
  if (clean.startsWith("UPDATE bookings SET crm_sync_status = ?")) {
    Object.assign(bookings.get(args[2]), { crm_sync_status: args[0], crm_last_error: args[1] });
    return 1;
  }
  if (clean.startsWith("UPDATE outbox SET status = 'delivered'")) {
    Object.assign(outbox.find((e) => e.event_id === args[2]), { status: "delivered", attempts: args[0] });
    return 1;
  }
  if (clean.startsWith("UPDATE outbox SET status = ?, attempts = ?, last_error = ?")) {
    Object.assign(outbox.find((e) => e.event_id === args[4]), { status: args[0], attempts: args[1], last_error: args[2] });
    return 1;
  }
  if (clean.startsWith("UPDATE outbox SET status = 'sending'")) return 0; // background dispatch: leave events pending
  if (/^SELECT event_id FROM outbox WHERE \(\(status/.test(clean)) return [];
  throw new Error(`fake db: unhandled SQL ${clean}`);
}

db.fetchAll = async (sql, ...args) => fakeQuery(sql, args);
db.fetchOne = async (sql, ...args) => fakeQuery(sql, args)[0] || null;
db.execute = async (sql, ...args) => fakeQuery(sql, args);
db.insert = async (table, row) => {
  assert.equal(table, "outbox");
  outbox.push({ ...row });
};

/** Routes fetch: Duffel paths answer from `duffel`, CRM posts are recorded in `crmCalls`. */
let duffel;
let crmCalls;
global.fetch = async (url, init = {}) => {
  const respond = (status, body) => ({ status, json: async () => body, text: async () => JSON.stringify(body) });
  if (url.startsWith("https://api.duffel.com")) {
    const path = url.slice("https://api.duffel.com".length);
    const handler = duffel[`${init.method} ${path}`];
    if (!handler) throw new Error(`unexpected Duffel call ${init.method} ${path}`);
    return respond(200, { data: handler(init.body ? JSON.parse(init.body) : undefined) });
  }
  crmCalls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
  return respond(200, { success: true, data: { id: "crm-booking-1" } });
};

const ORDER = {
  id: "ord_1", booking_reference: "PNR123", live_mode: false, total_amount: "400.00", total_currency: "USD",
  passengers: [{ id: "pas_1", given_name: "Jane", family_name: "Doe" }], documents: [],
  payment_status: { awaiting_payment: true, payment_required_by: "2099-01-01T00:00:00Z" },
};

function heldBooking(overrides = {}) {
  return {
    ota_booking_id: "ota-1", booking_reference: "ASFABCD", duffel_order_id: "ord_1", offer_id: "off_1", user_id: "user-1",
    email: "jane@example.com", customer_name: "Jane Doe", status: "ON_HOLD", booking_mode: "hold", payment_status: "unpaid",
    airline_pnr: "PNR123", tickets: [], supplier_amount: 400, customer_total: 435, service_fee: 35, currency: "USD",
    passengers: [{ type: "adult", given_name: "Jane", family_name: "Doe", email: "jane@example.com" }],
    slices: [{ origin: "LHR", destination: "JFK", departing_at: "2099-11-01T09:00:00", segments: [{ origin: "LHR", destination: "JFK", airline_code: "BA", flight_number: "117", departing_at: "2099-11-01T09:00:00" }] }],
    live_mode: false, created_at: "2026-10-15T10:00:00.000Z", crm_booking_id: "crm-booking-1",
    ...overrides,
  };
}

function reset(booking, { announced = true } = {}) {
  bookings = new Map([[booking.ota_booking_id, booking]]);
  outbox = announced
    ? [{ event_id: "evt-created", type: "booking.created", booking_id: booking.ota_booking_id, status: "delivered", attempts: 1, created_at: "2026-10-15T10:00:00.000Z" }]
    : [];
  crmCalls = [];
  duffel = {};
}

const queued = () => outbox.filter((e) => e.event_id !== "evt-created").map((e) => e.type);

test("change detection: cancel beats update, no-ops send nothing", () => {
  const before = heldBooking();
  assert.equal(crm.bookingChangeEvent(before, { ...before }), null);
  assert.equal(crm.bookingChangeEvent(before, { ...before, status: "CONFIRMED", payment_status: "paid" }), "booking.updated");
  assert.equal(crm.bookingChangeEvent(before, { ...before, tickets: [{ number: "1251234567890" }] }), "booking.updated");
  assert.equal(crm.bookingChangeEvent(before, { ...before, airline_pnr: "NEWPNR" }), "booking.updated");
  assert.equal(crm.bookingChangeEvent(before, { ...before, status: "CANCELLED" }), "booking.cancelled");
  assert.equal(crm.bookingChangeEvent({ ...before, status: "CANCELLED" }, { ...before, status: "CANCELLED" }), null);
});

test("paying a hold queues one booking.updated", async () => {
  reset(heldBooking());
  const paidOrder = {
    ...ORDER, payment_status: { awaiting_payment: false },
    documents: [{ type: "electronic_ticket", unique_identifier: "1251234567890", passenger_ids: ["pas_1"] }],
  };
  let paid = false;
  duffel = {
    "GET /air/orders/ord_1": () => (paid ? paidOrder : ORDER),
    "POST /air/payments": () => { paid = true; return {}; },
  };
  const updated = await bk.payHold(heldBooking(), "Card taken by phone", quiet);
  assert.equal(updated.status, "CONFIRMED");
  assert.deepEqual(queued(), ["booking.updated"]);
});

test("syncOrder queues booking.updated only when something changed", async () => {
  reset(heldBooking());
  duffel = { "GET /air/orders/ord_1": () => ORDER };
  await bk.syncOrder(heldBooking(), quiet);
  assert.deepEqual(queued(), [], "nothing changed");

  duffel = { "GET /air/orders/ord_1": () => ({ ...ORDER, booking_reference: "NEWPNR" }) };
  await bk.syncOrder(heldBooking(), quiet);
  assert.deepEqual(queued(), ["booking.updated"]);
});

test("airline-side cancellation found by syncOrder queues booking.cancelled", async () => {
  reset(heldBooking());
  duffel = { "GET /air/orders/ord_1": () => ({ ...ORDER, cancelled_at: "2026-10-16T00:00:00Z" }) };
  await bk.syncOrder(heldBooking(), quiet);
  assert.deepEqual(queued(), ["booking.cancelled"]);
});

test("bookings the CRM never got are not announced", async () => {
  reset(heldBooking(), { announced: false });
  duffel = { "GET /air/orders/ord_1": () => ({ ...ORDER, booking_reference: "NEWPNR" }) };
  await bk.syncOrder(heldBooking(), quiet);
  assert.deepEqual(outbox, []);
});

test("cancelling a paid booking queues booking.cancelled with the refund", async () => {
  const paidBooking = heldBooking({
    status: "CONFIRMED", payment_status: "paid", paid_at: "2020-01-01T00:00:00.000Z", duffel_cancellation_id: "ore_old",
  });
  reset(paidBooking);
  duffel = {
    "POST /air/order_cancellations": () => ({ id: "ore_1", refund_amount: "300.00", refund_to: "balance", expires_at: "2099-01-01T00:00:00Z" }),
    "POST /air/order_cancellations/ore_1/actions/confirm": () => ({}),
  };
  const cancelled = await bk.confirmCancellation({ ...paidBooking }, "staff-1", quiet);
  assert.equal(cancelled.status, "CANCELLED");
  assert.deepEqual(queued(), ["booking.cancelled"]);

  const event = outbox.find((e) => e.type === "booking.cancelled");
  const payload = crm.buildCrmBookingPayload(cancelled, event);
  assert.equal(payload.event, "booking.cancelled");
  assert.equal(payload.external.otaStatus, "CANCELLED");
  assert.equal(payload.booking.cancellation.refundAmount, 300);
  assert.equal(payload.booking.cancellation.airlineRefund, 300);
  assert.equal(payload.booking.cancellation.refundStatus, "manual");
});

test("updates wait for booking.created, then post signed with their own event type", async () => {
  const booking = heldBooking({ status: "CONFIRMED", payment_status: "paid", tickets: [{ number: "1251234567890", passenger: "Jane Doe" }] });
  reset(booking);
  outbox[0].status = "pending"; // booking.created not delivered yet
  outbox.push({ event_id: "evt-upd", type: "booking.updated", booking_id: "ota-1", status: "sending", attempts: 0, created_at: "2026-10-16T08:00:00.000Z" });

  assert.equal(await crm.deliverOutboxEvent(outbox[1], quiet), false);
  assert.equal(crmCalls.length, 0, "nothing sent before booking.created");
  assert.equal(outbox[1].status, "pending");
  assert.match(outbox[1].last_error, /Waiting for booking.created/);

  outbox[0].status = "delivered";
  assert.equal(await crm.deliverOutboxEvent(outbox[1], quiet), true);
  const call = crmCalls[0];
  assert.equal(call.headers["X-ASF-Event"], "booking.updated");
  assert.equal(call.headers["Idempotency-Key"], "evt-upd");
  assert.equal(call.body.event, "booking.updated");
  assert.equal(call.body.occurred_at, "2026-10-16T08:00:00.000Z");
  assert.deepEqual(call.body.booking.tickets, [{ number: "1251234567890", passenger: "Jane Doe" }]);
  assert.equal(call.body.booking.payment.status, "CAPTURED");
  assert.equal(call.body.booking.cancellation, null);
  assert.equal(bookings.get("ota-1").crm_booking_id, "crm-booking-1");
});
