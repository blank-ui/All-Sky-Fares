const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");

const crm = require("../src/crm");
const secrets = require("../src/secrets");
const pricing = require("../src/pricing");
const { parseMarkupCsv } = require("../src/routes/admin");

const BOOKING = {
  ota_booking_id: "ota-1", booking_reference: "ABC123", duffel_order_id: "ord_1", offer_id: "off_1", user_id: "user-1",
  email: "jane@example.com", customer_name: "Jane Doe", customer_phone: "+15550001111", airline: "British Airways", cabin: "economy",
  status: "CONFIRMED", payment_status: "paid", supplier_amount: 400, customer_total: 435, applied_rule: "Standard", currency: "USD",
  live_mode: false, created_at: "2026-10-15T10:00:00+00:00",
  passengers: [
    { type: "adult", title: "ms", given_name: "Jane", family_name: "Doe", born_on: "1990-01-01", email: "jane@example.com", phone_number: "+15550001111" },
    { type: "adult", title: "mr", given_name: "John", family_name: "Doe", born_on: "1989-02-02", email: "john@example.com", phone_number: "+15550002222" },
  ],
  slices: [
    { origin: "LHR", destination: "JFK", departing_at: "2026-11-01T09:00:00", segments: [{ origin: "LHR", destination: "JFK", airline: "British Airways", airline_code: "BA", flight_number: "117", operating_airline_code: "BA", departing_at: "2026-11-01T09:00:00", arriving_at: "2026-11-01T12:00:00", duration: "PT8H", cabin_class: "economy" }] },
    { origin: "JFK", destination: "LHR", departing_at: "2026-11-08T18:00:00", segments: [{ origin: "JFK", destination: "LHR", airline: "British Airways", airline_code: "BA", flight_number: "178", operating_airline_code: "AA", departing_at: "2026-11-08T18:00:00", arriving_at: "2026-11-09T06:10:00", duration: "PT7H10M", cabin_class: "economy" }] },
  ],
};
const EVENT = { event_id: "evt-1", type: "booking.created" };

test("CRM payload is prefilled", () => {
  const p = crm.buildCrmBookingPayload(BOOKING, EVENT);
  const b = p.booking;
  assert.equal(p.event, "booking.created");
  assert.equal(b.status, "CONFIRMED");
  assert.equal(b.journeyType, "ROUND_TRIP");
  assert.equal(b.returnDate, "2026-11-08T18:00:00");
  assert.equal(b.flightNumber, "BA117");
  assert.equal(b.cabinClass, "ECONOMY");
  assert.equal(b.serviceFee, 35);
  assert.deepEqual(b.passengers.map((x) => x.firstName), ["Jane", "John"]);
  assert.equal(b.journeys[1].journeyType, "RETURN");
  assert.equal(b.journeys[1].segments[0].durationMinutes, 430);
  assert.equal(b.journeys[1].segments[0].isCodeshare, true);
  assert.equal(b.payment.status, "CAPTURED");
});

test("request bookings reach the CRM as unpaid drafts", () => {
  const p = crm.buildCrmBookingPayload({ ...BOOKING, status: "REQUESTED", payment_status: "unpaid", booking_mode: "request", duffel_order_id: null }, EVENT);
  assert.equal(p.booking.status, "DRAFT");
  assert.equal(p.booking.payment.status, "PENDING");
  assert.ok(p.booking.internalNotes.startsWith("BOOKING REQUEST"));
});

test("signature matches the receiver's verification", () => {
  const body = JSON.stringify({ a: 1 });
  const expected = crypto.createHmac("sha256", "secret").update(`1700000000.${body}`).digest("hex");
  assert.equal(crm.signWebhook(body, "1700000000", "secret"), `sha256=${expected}`);
});

test("durations and backoff", () => {
  assert.equal(crm.isoDurationMinutes("P1DT2H5M"), 1565);
  assert.equal(crm.isoDurationMinutes(null), null);
  assert.equal(crm.nextRetryDelayMs(1), 30000);
  assert.equal(crm.nextRetryDelayMs(50), 6 * 3600 * 1000);
});

test("Fernet round-trips and reads Python-made tokens", () => {
  // Token produced by Python's cryptography.fernet with this key.
  const key = "3b-8tMcK2Wq6PpxZ1Vt-Kv3mN0yR6sTq9uXw2zA4bC0=";
  const f = new secrets.Fernet(key);
  assert.equal(f.decrypt(f.encrypt("duffel_test_abc")), "duffel_test_abc");
  assert.throws(() => f.decrypt(f.encrypt("x").slice(0, -4) + "AAAA"));
});

test("checkout mode: card only when Duffel Payments is switched on", () => {
  secrets.secrets.set("DUFFEL_API_KEY", "duffel_live_x");
  assert.equal(secrets.bookingMode(), "hold");
  secrets.secrets.set("DUFFEL_PAYMENTS", "enabled");
  assert.equal(secrets.bookingMode(), "card");
  secrets.secrets.clear();
});

test("Duffel key follows the picked environment, with the old single key as fallback", () => {
  secrets.secrets.set("DUFFEL_API_KEY", "duffel_live_old");
  assert.equal(secrets.duffelKey(null), "duffel_live_old");
  assert.equal(secrets.duffelKey("live"), "duffel_live_old");
  assert.equal(secrets.duffelKey("test"), ""); // never silently stays on the live key
  secrets.secrets.set("DUFFEL_TEST_API_KEY", "duffel_test_new");
  secrets.secrets.set("DUFFEL_LIVE_API_KEY", "duffel_live_new");
  assert.equal(secrets.duffelKey("test"), "duffel_test_new");
  assert.equal(secrets.duffelKey("live"), "duffel_live_new");
  secrets.secrets.clear();
});

test("markups: most specific route wins, amount per traveller", () => {
  const m = [{ origin: "LHR", destination: "*", markup_amount: 10, markup_percent: 5 }, { origin: "*", destination: "*", markup_amount: 20, markup_percent: 0 }];
  assert.deepEqual(pricing.applyMarkup(400, 2, pricing.matchMarkup(m, "LHR", "JFK")), [440, 40]);
  assert.deepEqual(pricing.applyMarkup(400, 1, pricing.matchMarkup(m, "DEL", "JFK")), [420, 20]);
});

test("CSV import reads both formats, including stray commas", () => {
  const legacy = "name,priority,airline,origin,destination,markup_type,markup_value\nLondon,10,BA,LHR,JFK,fixed,35.00\nT,20,,LHR,LAX,percentage,7.5\nUniversal Global Default,100,,,,,fixed,20.00\n";
  assert.deepEqual(parseMarkupCsv(Buffer.from(legacy)), [
    { origin: "LHR", destination: "JFK", markup_amount: 35, markup_percent: 0 },
    { origin: "LHR", destination: "LAX", markup_amount: 0, markup_percent: 7.5 },
    { origin: "*", destination: "*", markup_amount: 20, markup_percent: 0 },
  ]);
  assert.deepEqual(parseMarkupCsv(Buffer.from("origin,destination,markup_amount,markup_percent\nlhr,jfk,25,5\n")), [{ origin: "LHR", destination: "JFK", markup_amount: 25, markup_percent: 5 }]);
});

const documents = require("../src/documents");
const bk = require("../src/bookings");
const { verifySignature } = require("../src/routes/webhooks");

const HELD = {
  ...BOOKING, booking_reference: "ASFUBUB", airline_pnr: "XYZ123", status: "ON_HOLD", payment_status: "unpaid", tickets: [],
  payment_required_by: "2026-10-18T15:00:00.000Z",
  passengers: [{ ...BOOKING.passengers[0], gender: "f" }],
  slices: [{ ...BOOKING.slices[0], segments: [{ ...BOOKING.slices[0].segments[0], arriving_at: "2026-11-02T01:10:00", baggage: { checked: 0, carry_on: 1 } }] }],
};

test("e-ticket shows our booking number, airline PNR and hold status", () => {
  const html = documents.renderEticket(HELD);
  assert.ok(html.includes("ASFUBUB") && html.includes("XYZ123"));
  assert.ok(html.includes("TICKET NOT ISSUED"));
  assert.ok(html.includes("Departure Flight: 0 checked, 1 carry-on"));
  assert.ok(html.includes("+1</sup>"), "next-day arrival is marked");
  assert.ok(html.includes("Page 2 of 2") && html.includes("All Sky Fares LLC"));
});

test("invoice shows one charge line and the right status", () => {
  const due = documents.renderInvoice(HELD);
  assert.ok(due.includes("INV-ASFUBUB") && due.includes("BALANCE DUE") && due.includes("$435.00"));
  assert.ok(!/service fee/i.test(due.split("Charges")[1].split("Important information")[0]), "no fee breakdown");
  const paid = documents.renderInvoice({ ...HELD, status: "CONFIRMED", payment_status: "paid", payment_method: "Visa ending in 4242", paid_at: "2026-10-15T10:00:00Z" });
  assert.ok(paid.includes("PAID") && paid.includes("Visa ending in 4242"));
});

test("documents escape customer-provided text", () => {
  const html = documents.renderEticket({ ...HELD, passengers: [{ ...HELD.passengers[0], given_name: "<script>x</script>" }] });
  assert.ok(!html.includes("<script>x</script>") && html.includes("&lt;script&gt;"));
});

test("Duffel order fields: PNR, tickets, hold vs paid", () => {
  const order = { id: "ord_1", booking_reference: "PNR123", live_mode: true, passengers: [{ id: "pas_1", given_name: "Jane", family_name: "Doe" }],
    documents: [{ type: "electronic_ticket", unique_identifier: "1252345678901", passenger_ids: ["pas_1"] }],
    payment_status: { awaiting_payment: false } };
  const f = bk.orderFields(order, { status: "ON_HOLD" });
  assert.equal(f.airline_pnr, "PNR123");
  assert.deepEqual(f.tickets, [{ number: "1252345678901", passenger: "Jane Doe" }]);
  assert.equal(f.status, "CONFIRMED");
  assert.equal(bk.orderFields({ ...order, payment_status: { awaiting_payment: true } }, { status: "ON_HOLD" }).status, "ON_HOLD");
  assert.equal(bk.orderFields({ ...order, cancelled_at: "2026-10-16T00:00:00Z" }, { status: "CONFIRMED" }).status, "CANCELLED");
});

test("booking numbers look like ASFXXXX", () => {
  for (let i = 0; i < 20; i += 1) assert.match(bk.newBookingReference(), /^ASF[A-HJ-NP-Z]{4}$/);
});

test("past flights and cancelled bookings can't be cancelled", () => {
  assert.equal(bk.canCancel({ status: "CANCELLED", slices: [] }), false);
  assert.equal(bk.canCancel({ status: "CONFIRMED", slices: [{ segments: [{ departing_at: "2020-01-01T10:00:00" }] }] }), false);
  assert.equal(bk.canCancel({ status: "ON_HOLD", slices: [{ segments: [{ departing_at: "2099-01-01T10:00:00" }] }] }), true);
});

test("Duffel webhook signatures", () => {
  const raw = Buffer.from('{"data":{"type":"ping.triggered"}}');
  const t = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac("sha256", "secret").update(`${t}.`).update(raw).digest("hex");
  assert.equal(verifySignature(raw, `t=${t},v1=${sig}`, "secret"), true);
  assert.equal(verifySignature(raw, `t=${t},v2=${sig}`, "secret"), true);
  assert.equal(verifySignature(raw, `t=${t},v1=${"0".repeat(64)}`, "secret"), false);
  assert.equal(verifySignature(raw, `t=${Number(t) - 3600},v1=${sig}`, "secret"), false, "old timestamps are rejected");
});

const email = require("../src/email");

test("booking email offers a password link to guest accounts and escapes names", () => {
  const guest = email.renderBookingEmail({ ...HELD, customer_name: "<b>Jane</b>" }, { setupLink: "https://allskyfares.com/reset-password?token=abc&welcome=1" });
  assert.ok(guest.includes("ASFUBUB") && guest.includes("XYZ123") && guest.includes("USD 435.00"));
  assert.ok(guest.includes("SET MY PASSWORD") && guest.includes("token=abc&amp;welcome=1"));
  assert.ok(guest.includes("Payment needed by") && !guest.includes("<b>Jane</b>"));
  const member = email.renderBookingEmail({ ...HELD, status: "CONFIRMED" }, { signInLink: "https://allskyfares.com/login" });
  assert.ok(member.includes("VIEW MY BOOKING") && !member.includes("SET MY PASSWORD"));
});

test("sign-in code email shows the code", () => {
  assert.ok(email.renderLoginCodeEmail("Jane", "042917").includes("042917"));
});

const pdf = require("../src/pdf");

test("e-ticket and invoice PDFs are generated for email attachments", async () => {
  for (const make of [pdf.eticketPdf, pdf.invoicePdf]) {
    const buf = await make({ ...HELD, status: "CONFIRMED", payment_status: "paid", tickets: [{ number: "1252345678901", passenger: "Jane Doe" }] });
    assert.ok(Buffer.isBuffer(buf) && buf.length > 2000);
    assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  }
});

test("card checkouts: when to confirm, finish or wait", () => {
  assert.equal(bk.cardPaymentAction("succeeded"), "finalize");
  assert.equal(bk.cardPaymentAction("requires_confirmation"), "confirm", "card taken, waiting for our confirm");
  for (const s of ["requires_payment_method", "requires_action", "processing", "cancelled", undefined]) {
    assert.equal(bk.cardPaymentAction(s), "wait", `${s}: the webhook and sweep leave it alone`);
  }
  assert.equal(bk.cardPaymentAction("requires_payment_method", true), "confirm", "the browser confirms right after the card form");
  assert.equal(bk.cardPaymentAction("succeeded", true), "finalize", "a retried browser confirm never confirms twice");
});

test("Duffel webhooks: payment intent ids are found, order events are not mistaken for them", () => {
  const { paymentIntentIdOf } = require("../src/routes/webhooks");
  assert.equal(paymentIntentIdOf({ id: "pit_123" }), "pit_123");
  assert.equal(paymentIntentIdOf({ id: "pay_1", payment_intent_id: "pit_456" }), "pit_456");
  assert.equal(paymentIntentIdOf({}, { idempotency_key: "pit_789" }), "pit_789");
  assert.equal(paymentIntentIdOf({ id: "ord_1" }, { idempotency_key: "ord_1" }), null);
  assert.equal(paymentIntentIdOf(null), null);
});

test("re-pricing finds the same flights again for a new traveller count", () => {
  const { itineraryKey, searchFromOffer } = require("../src/routes/flights");
  const seg = (no, at, cabin = "business") => ({ marketing_carrier: { iata_code: "IB" }, marketing_carrier_flight_number: no, departing_at: at, passengers: [{ cabin_class: cabin }] });
  const offer = {
    passengers: [{ id: "pas_1" }],
    slices: [
      { origin: { iata_code: "LHR" }, destination: { iata_code: "JFK" }, segments: [seg("6251", "2026-10-29T10:05:00")] },
      { origin: { iata_code: "JFK" }, destination: { iata_code: "LHR" }, segments: [seg("6250", "2026-11-05T18:30:00")] },
    ],
  };
  assert.deepEqual(searchFromOffer(offer), {
    cabin: "business",
    slices: [
      { origin: "LHR", destination: "JFK", departure_date: "2026-10-29" },
      { origin: "JFK", destination: "LHR", departure_date: "2026-11-05" },
    ],
  });
  const twoTravellers = { ...offer, passengers: [{ id: "a" }, { id: "b" }] };
  assert.equal(itineraryKey(twoTravellers), itineraryKey(offer));
  const laterFlight = { ...offer, slices: [offer.slices[0], { ...offer.slices[1], segments: [seg("6250", "2026-11-06T18:30:00")] }] };
  assert.notEqual(itineraryKey(laterFlight), itineraryKey(offer));
});

test("secondary email and phone are optional, validated, and reach the CRM notes", () => {
  const { validatePassengers } = require("../src/routes/flights");
  const base = { given_name: "Jane", family_name: "Doe", born_on: "1990-01-01", email: "jane@example.com", phone_number: "+15550001111" };
  const [plain] = validatePassengers([base]);
  assert.equal(plain.secondary_email, null);
  assert.equal(plain.secondary_phone, null);
  const [extra] = validatePassengers([{ ...base, secondary_email: " office@example.com ", secondary_phone: "+15550009999" }]);
  assert.equal(extra.secondary_email, "office@example.com");
  assert.throws(() => validatePassengers([{ ...base, secondary_email: "not-an-email" }]), /valid email/);

  const booking = { ...BOOKING, passengers: [{ ...BOOKING.passengers[0], secondary_email: "office@example.com", secondary_phone: "+15550009999" }, BOOKING.passengers[1]] };
  const p = crm.buildCrmBookingPayload(booking, EVENT);
  assert.equal(p.booking.customerEmail, "jane@example.com");
  assert.ok(p.booking.internalNotes.includes("Secondary contacts: Jane Doe: office@example.com, +15550009999."));
  assert.ok(!crm.buildCrmBookingPayload(BOOKING, EVENT).booking.internalNotes.includes("Secondary"));
});

const duffel = require("../src/duffel");

test("fare rules, amenities and seat maps are read from Duffel's shapes", () => {
  assert.deepEqual(duffel.offerConditions({ conditions: { change_before_departure: { allowed: true, penalty_amount: "40.00", penalty_currency: "USD" }, refund_before_departure: null } }),
    { change: { allowed: true, penalty: 40, currency: "USD" }, refund: null });
  const [slice] = duffel.normalizeSlices([{ fare_brand_name: "Basic", conditions: { advance_seat_selection: { allowed: false } }, segments: [
    { passengers: [{ cabin_class: "economy", baggages: [{ type: "checked", quantity: 1 }], cabin: { marketing_name: "Economy", amenities: { wifi: { available: true, cost: "paid" }, seat: { pitch: "30", legroom: "n/a" }, power: { available: false } } } }] },
  ] }]);
  assert.equal(slice.fare_brand, "Basic");
  assert.deepEqual(slice.advance_seat_selection, { allowed: false, penalty: null, currency: null });
  assert.deepEqual(slice.segments[0].amenities, { wifi: { available: true, cost: "paid" }, power: false, seat_pitch_in: 30, legroom: null });
  const seat = (amount) => ({ type: "seat", available_services: [{ total_amount: amount, total_currency: "USD" }] });
  assert.deepEqual(duffel.summarizeSeatMaps([{ segment_id: "seg_1", cabins: [{ rows: [{ sections: [{ elements: [seat("0.00"), seat("25.00"), seat("12.50"), { type: "seat", available_services: [] }, { type: "lavatory" }] }] }] }] }]),
    [{ segment_id: "seg_1", available: 3, free: 1, min_price: 12.5, max_price: 25, currency: "USD" }]);
});
