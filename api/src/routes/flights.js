const express = require("express");
const db = require("../db");
const v = require("../validate");
const { cfg, bookingMode, duffelMode, cardPaymentsEnabled } = require("../secrets");
const bk = require("../bookings");
const { duffelCall, airlineLogo, normalizeSlices, offerConditions, summarizeSeatMaps } = require("../duffel");
const { loadMarkups, priceOffer } = require("../pricing");
const { optionalUser, audit, rateLimit, clientIp, USER_COLUMNS } = require("../auth");
const { emailBookingInBackground } = require("../notify");
const { customerBooking } = require("./customer");
const documents = require("../documents");
const pdf = require("../pdf");
const { HttpError, ah, utcNow, uuid, parseIso, round2, digest, tokenUrlsafe } = require("../util");

const PROCESSING_MSG = "This booking is already being processed. Please wait a moment and check My Bookings.";

/** One-way (1 slice), round-trip (2) and multi-city (2-6), plus the legacy single-leg fields. */
function resolveSearch(b) {
  const tripType = v.oneOf(b, "trip_type", ["round_trip", "one_way", "multi_city"], "round_trip");
  const cabin = v.oneOf(b, "cabin", ["economy", "premium_economy", "business", "first"], "economy");
  const adults = v.int(b, "adults", { min: 1, max: 9, fallback: 1 });
  const code = (s, key) => {
    const value = v.str(s, key, { min: 3, max: 3, label: key });
    return value.toUpperCase();
  };
  let slices;
  if (Array.isArray(b.slices) && b.slices.length) {
    if (b.slices.length > 6) throw new HttpError(400, "Provide between 1 and 6 flight legs");
    slices = b.slices.map((s) => ({ origin: code(s, "origin"), destination: code(s, "destination"), departure_date: v.str(s, "departure_date", { label: "departure_date" }) }));
  } else {
    if (!(b.origin && b.destination && b.departure_date)) throw new HttpError(400, "Provide either slices[] or origin+destination+departure_date");
    slices = [{ origin: code(b, "origin"), destination: code(b, "destination"), departure_date: v.str(b, "departure_date") }];
    if (tripType === "round_trip" && b.return_date) {
      slices.push({ origin: slices[0].destination, destination: slices[0].origin, departure_date: v.str(b, "return_date") });
    }
  }
  return { slices, tripType, cabin, adults };
}

function isTestCardNumber(num) {
  const clean = String(num || "").replace(/\D/g, "");
  if (/^424242/.test(clean)) return true;
  if (/^400000000000/.test(clean)) return true;
  if (/^411111111111/.test(clean)) return true;
  if (/^555555555555/.test(clean)) return true;
  if (/^3782822463/.test(clean)) return true;
  if (/^601111111111/.test(clean)) return true;
  if (/^(\d)\1{12,}$/.test(clean)) return true;
  return false;
}

function detectCardBrand(num) {
  const clean = String(num).replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "American Express";
  if (/^6(?:011|5)/.test(clean)) return "Discover";
  return "Card";
}

function generatePnr() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let pnr = "";
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

/** First leg's airports as Duffel priced them; markups are matched on these everywhere. */
function offerRoute(offer) {
  const first = (offer.slices || [])[0] || {};
  return [(first.origin || {}).iata_code || "", (first.destination || {}).iata_code || ""];
}

/** The same flights whatever the fare variant: carrier, flight number and departure of every segment. */
function itineraryKey(offer) {
  return JSON.stringify((offer.slices || []).flatMap((sl) => (sl.segments || []).map((seg) => [(seg.marketing_carrier || {}).iata_code, seg.marketing_carrier_flight_number, seg.departing_at])));
}

/** Cheapest offer per itinerary, cheapest first. */
function cheapestPerItinerary(offers) {
  const cheapest = new Map();
  for (const offer of offers || []) {
    const key = itineraryKey(offer);
    const prev = cheapest.get(key);
    if (!prev || Number(offer.total_amount || 0) < Number(prev.total_amount || 0)) cheapest.set(key, offer);
  }
  return [...cheapest.values()].sort((a, b) => Number(a.total_amount || 0) - Number(b.total_amount || 0));
}

/** Search that finds an offer's flights again: its legs, dates and cabin. */
function searchFromOffer(offer) {
  const slices = (offer.slices || []).map((sl) => ({
    origin: (sl.origin || {}).iata_code,
    destination: (sl.destination || {}).iata_code,
    departure_date: String(((sl.segments || [])[0] || {}).departing_at || "").slice(0, 10),
  }));
  const firstSegment = (((offer.slices || [])[0] || {}).segments || [])[0] || {};
  const cabin = ((firstSegment.passengers || [])[0] || {}).cabin_class || "economy";
  return { slices, cabin };
}

/** What the website shows for an offer, with our markup applied for its number of travellers. */
async function presentOffer(offer, markups) {
  const owner = offer.owner || {};
  const travellers = (offer.passengers || []).length || 1;
  // Same airports checkout prices with, so a city-code search (LON) shows the price that's charged.
  const [origin, destination] = offerRoute(offer);
  const [total] = await priceOffer(Number(offer.total_amount || 0), origin, destination, travellers, markups);
  return {
    id: offer.id,
    airline: owner.name || "Airline",
    airline_code: owner.iata_code || "",
    airline_logo: airlineLogo(owner.iata_code || ""),
    total,
    currency: offer.total_currency || "USD",
    expires_at: offer.expires_at || null,
    slices: normalizeSlices(offer.slices || []),
    passenger_count: travellers,
    conditions: offerConditions(offer),
    emissions_kg: offer.total_emissions_kg != null ? Number(offer.total_emissions_kg) : null,
  };
}

function validatePassengers(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 9) throw new HttpError(422, "Provide between 1 and 9 passengers");
  return list.map((p, i) => {
    const label = (f) => `Passenger ${i + 1} ${f}`;
    return {
      type: v.oneOf(p, "type", ["adult", "child", "infant_without_seat"], "adult"),
      given_name: v.str(p, "given_name", { min: 1, max: 80, label: label("first name") }),
      family_name: v.str(p, "family_name", { min: 1, max: 80, label: label("last name") }),
      title: v.oneOf(p, "title", ["mr", "mrs", "ms", "miss", "dr"], "mr"),
      gender: v.oneOf(p, "gender", ["m", "f"], "m"),
      born_on: v.str(p, "born_on", { label: label("date of birth") }),
      email: v.email(p, "email"),
      phone_number: v.str(p, "phone_number", { min: 6, max: 40, label: label("phone number") }),
      // Optional backups for our team; Duffel and the booking emails only use the primary ones.
      secondary_email: v.email(p, "secondary_email", { required: false }) || null,
      secondary_phone: v.str(p, "secondary_phone", { required: false, min: 6, max: 40, label: label("secondary phone") }) || null,
    };
  });
}

module.exports = (logger) => {
  const r = express.Router();

  r.get("/booking-mode", (req, res) => res.json({ mode: bookingMode(), test: duffelMode() !== "live" }));

  r.post("/search", ah(async (req, res) => {
    await rateLimit(`search:${clientIp(req)}`, 60, 60, "Too many searches from this network. Please try again later.");
    const { slices, tripType, cabin, adults } = resolveSearch(v.body(req));
    const payload = { data: { slices, passengers: Array.from({ length: adults }, () => ({ type: "adult" })), cabin_class: cabin } };
    const result = await duffelCall("POST", "/air/offer_requests?return_offers=true&supplier_timeout=25000", payload, logger);
    const raw = result.data || {};
    const markups = await loadMarkups(logger);
    // Duffel often returns many fare variants of the same flights; show each itinerary once, at its cheapest.
    const ranked = cheapestPerItinerary(raw.offers).slice(0, 50);
    const offers = [];
    for (const offer of ranked) {
      const owner = offer.owner || {};
      const ownerCode = (owner.iata_code || "").toUpperCase();
      const ownerName = (owner.name || "").toLowerCase();
      const hasDuffelSlice = (offer.slices || []).some((s) =>
        (s.segments || []).some((seg) => {
          const mc = ((seg.marketing_carrier || {}).iata_code || "").toUpperCase();
          const mn = ((seg.marketing_carrier || {}).name || "").toLowerCase();
          const oc = ((seg.operating_carrier || {}).iata_code || "").toUpperCase();
          const on = ((seg.operating_carrier || {}).name || "").toLowerCase();
          return mc === "ZZ" || oc === "ZZ" || mn.includes("duffel") || on.includes("duffel");
        })
      );
      // Exclude synthetic Duffel Airways offers
      if (ownerCode === "ZZ" || ownerName.includes("duffel") || hasDuffelSlice) {
        continue;
      }
      offers.push(await presentOffer(offer, markups));
    }
    offers.sort((a, b) => a.total - b.total);
    res.json({ offers, count: offers.length, offer_request_id: raw.id || null, trip_type: tripType, test_mode: raw.live_mode === false });
  }));

  r.get("/offers/:offerId", ah(async (req, res) => {
    await rateLimit(`offer:${clientIp(req)}`, 120, 60, "Too many requests from this network. Please try again later.");
    const offer = (await duffelCall("GET", `/air/offers/${encodeURIComponent(req.params.offerId)}?return_available_services=false`, undefined, logger)).data || {};
    if (!offer.id) throw new HttpError(404, "Offer not found");
    res.json(await presentOffer(offer));
  }));

  // Loaded when a traveller opens a fare's details: seat maps are a separate, slower Duffel call.
  r.get("/offers/:offerId/seats", ah(async (req, res) => {
    await rateLimit(`offer:${clientIp(req)}`, 120, 60, "Too many requests from this network. Please try again later.");
    let maps;
    try {
      maps = (await duffelCall("GET", `/air/seat_maps?offer_id=${encodeURIComponent(req.params.offerId)}`, undefined, logger)).data || [];
    } catch (exc) {
      if (exc.status === 400) return res.json({ supported: false, segments: [] }); // airline doesn't sell seats through Duffel
      throw exc;
    }
    const segments = summarizeSeatMaps(maps);
    res.json({ supported: segments.some((s) => s.available > 0), segments });
  }));

  // A fare is priced for a fixed number of travellers, so a different count needs a new Duffel offer for the same flights.
  r.post("/offers/:offerId/reprice", ah(async (req, res) => {
    await rateLimit(`search:${clientIp(req)}`, 60, 60, "Too many searches from this network. Please try again later.");
    const adults = v.int(v.body(req), "adults", { min: 1, max: 9 });
    const original = (await duffelCall("GET", `/air/offers/${encodeURIComponent(req.params.offerId)}?return_available_services=false`, undefined, logger)).data || {};
    if (!original.id) throw new HttpError(404, "Offer not found");
    if ((original.passengers || []).length === adults) return res.json(await presentOffer(original));
    const { slices, cabin } = searchFromOffer(original);
    const payload = { data: { slices, passengers: Array.from({ length: adults }, () => ({ type: "adult" })), cabin_class: cabin } };
    const raw = (await duffelCall("POST", "/air/offer_requests?return_offers=true&supplier_timeout=25000", payload, logger)).data || {};
    const key = itineraryKey(original);
    const match = cheapestPerItinerary(raw.offers).find((o) => itineraryKey(o) === key);
    if (!match) throw new HttpError(409, `These flights aren't available for ${adults} travellers. Please search again with ${adults} travellers.`);
    res.json(await presentOffer(match));
  }));

  // Hotels and cars are UI shells until a provider is connected; no third-party API is called.
  r.post("/hotels/search", ah(async (req, res) => {
    if (!cfg("HOTELS_PROVIDER_KEY")) throw new HttpError(503, "Hotel search is awaiting the stays provider (Duffel Stays or Amadeus). No third-party API is invoked in the meantime.");
    res.json({ stays: [] });
  }));

  r.post("/cars/search", ah(async (req, res) => {
    if (!cfg("CARS_PROVIDER_KEY")) throw new HttpError(503, "Car rental search is awaiting the mobility provider (Amadeus Cars or CarTrawler). No third-party API is invoked in the meantime.");
    res.json({ cars: [] });
  }));

  /** Inserts the reservation row with a fresh booking number (retries the rare number clash). */
  async function reserveBooking(row) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = bk.newBookingReference();
      try {
        await db.insert("bookings", { ...row, booking_reference: reference });
        return reference;
      } catch (exc) {
        if (!db.isDuplicate(exc)) throw exc;
        if (!/reference/i.test(exc.message)) throw new HttpError(409, PROCESSING_MSG); // same idempotency key
      }
    }
    throw new HttpError(500, "Couldn't create a booking number. Please try again.");
  }

  /** First announcement sends booking.created; if the CRM already has this booking, booking.updated. */
  const announce = (booking, action, actorId) => bk.announceBooking(booking, action, actorId, logger);

  /**
   * Guest checkout: find the account for this email, or create one without a password.
   * The guest is not signed in; they get a token that only covers this booking.
   */
  async function guestAccount(b, req) {
    await rateLimit(`guest-checkout:${clientIp(req)}`, 20, 60, "Too many bookings from this network. Please try again later or call us.");
    const c = b.contact && typeof b.contact === "object" ? b.contact : {};
    const email = v.email(c, "email").toLowerCase();
    const firstName = v.str(c, "first_name", { min: 1, max: 80, label: "First name" }).trim();
    const lastName = v.str(c, "last_name", { min: 1, max: 80, label: "Last name" }).trim();
    const phone = (v.str(c, "phone", { required: false, max: 40, label: "Phone" }) || "").trim();
    let user = await db.fetchOne(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, email);
    if (user && (user.status || "active") !== "active") throw new HttpError(400, "We can't book with this email address. Please call us for help.");
    if (!user) {
      user = { id: uuid(), email, password_hash: "", password_set: 0, created_via: "guest_checkout", first_name: firstName, last_name: lastName, phone, role: "CUSTOMER", status: "active", created_at: utcNow() };
      try {
        await db.insert("users", user);
        await audit(user.id, "customer.account_created_at_checkout", { email });
      } catch (exc) {
        if (!db.isDuplicate(exc)) throw exc;
        user = await db.fetchOne(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, email); // made by a parallel request
      }
    }
    // The booking carries the name typed at checkout even if the account has another one on file.
    return { ...user, first_name: firstName, last_name: lastName, phone: phone || user.phone };
  }

  const emailInBackground = (booking) => emailBookingInBackground(booking, logger);

  /** The signed-in customer's booking, or a guest's booking matched by its checkout token. */
  async function guestOrOwnBooking(req, reference, token) {
    let booking = null;
    if (req.user) booking = await db.fetchOne("SELECT * FROM bookings WHERE booking_reference = ? AND user_id = ?", reference, req.user.id);
    if (!booking && typeof token === "string" && token.length >= 20) {
      booking = await db.fetchOne("SELECT * FROM bookings WHERE booking_reference = ? AND guest_token_hash = ?", reference, digest(token));
    }
    if (!booking) throw new HttpError(404, "Booking not found");
    return booking;
  }

  const paymentStep = (booking, clientToken) => ({ step: "payment", client_token: clientToken, booking: customerBooking(booking), replayed: false });

  // Step 1: validate, price, and either start a card payment, hold the seats with the airline, or record a request.
  r.post("/my/checkout", optionalUser, ah(async (req, res) => {
    const b = v.body(req);
    const isGuest = !req.user;
    const offerId = v.str(b, "offer_id", { max: 64, label: "offer_id" });
    const passengers = validatePassengers(b.passengers);
    const idemKey = v.str(b, "idempotency_key", { required: false, max: 100 }) || uuid();
    if (b.accept_terms !== true) throw new HttpError(400, "Please accept the Terms of Service, Privacy Policy and fare rules to continue.");
    const user = isGuest ? await guestAccount(b, req) : req.user;
    // Guests get a token for this booking only (card step, documents); it never signs them in.
    const guestToken = isGuest ? tokenUrlsafe(32) : null;
    const reply = (payload) => res.json(guestToken ? { ...payload, guest: true, checkout_token: guestToken } : payload);

    const existing = await db.fetchOne("SELECT * FROM bookings WHERE idempotency_key = ? AND user_id = ?", idemKey, user.id);
    if (existing) {
      if (guestToken) await bk.updateBooking(existing.ota_booking_id, { guest_token_hash: digest(guestToken) });
      if ([bk.S.PROCESSING, bk.S.PAYING].includes(existing.status)) throw new HttpError(409, PROCESSING_MSG);
      if (existing.status === bk.S.AWAITING_PAYMENT && existing.payment_intent_id) {
        const pi = await bk.getPaymentIntent(existing.payment_intent_id, logger);
        return reply({ ...paymentStep(existing, pi.client_token), replayed: true });
      }
      return reply({ step: "done", booking: customerBooking(existing), replayed: true });
    }
    const latest = (await duffelCall("GET", `/air/offers/${encodeURIComponent(offerId)}`, undefined, logger)).data || {};
    if (!latest.id) throw new HttpError(400, "This offer is no longer available. Please search again.");
    const expiresAt = parseIso(latest.expires_at);
    if (expiresAt && expiresAt <= utcNow()) throw new HttpError(409, "This offer has expired. Please search again.");
    const duffelPassengerIds = (latest.passengers || []).map((p) => p.id);
    if (duffelPassengerIds.length !== passengers.length) {
      throw new HttpError(400, `This fare is for ${duffelPassengerIds.length} traveller(s). Please enter exactly that many passengers or search again.`);
    }

    // Reserve the idempotency key before talking to Duffel so a double-submit can't create two
    // airline orders. The unique index (user_id, idempotency_key) makes this race-safe.
    const otaBookingId = uuid();
    const reference = await reserveBooking({ ota_booking_id: otaBookingId, idempotency_key: idemKey, user_id: user.id, email: user.email, offer_id: offerId, status: bk.S.PROCESSING, guest_token_hash: guestToken ? digest(guestToken) : null, created_at: utcNow() });

    try {
      const base = Number(latest.total_amount || 0);
      const owner = latest.owner || {};
      const slices = latest.slices || [];
      const [origin, destination] = offerRoute(latest);
      const [customerTotal, appliedRule] = await priceOffer(base, origin, destination, duffelPassengerIds.length);
      const currency = latest.total_currency || "USD";
      const normalized = normalizeSlices(slices);
      const firstSegment = normalized.length ? (normalized[0].segments[0] || {}) : {};
      const requirements = latest.payment_requirements || {};
      let booking = {
        ota_booking_id: otaBookingId, booking_reference: reference, offer_id: offerId, idempotency_key: idemKey, user_id: user.id, email: user.email,
        guest_token_hash: guestToken ? digest(guestToken) : null,
        customer_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        customer_phone: user.phone || passengers[0].phone_number,
        passengers: passengers.map((p, i) => ({ ...p, duffel_id: duffelPassengerIds[i] })),
        slices: normalized, conditions: latest.conditions || null,
        airline: owner.name || "", airline_code: owner.iata_code || "", cabin: firstSegment.cabin_class || "",
        supplier_amount: base, applied_rule: appliedRule, service_fee: round2(customerTotal - base),
        customer_total: customerTotal, currency, payment_status: "unpaid",
        crm_sync_status: "PENDING", terms_accepted_at: utcNow(), live_mode: duffelMode() === "live", created_at: utcNow(),
      };

      // 0) Card checkout with submitted card details.
      const card = req.body.card;
      if (card && card.number) {
        const cardNum = String(card.number).replace(/\D/g, "");
        if (cardNum.length < 13 || cardNum.length > 19) {
          throw new HttpError(422, "Please enter a valid card number");
        }
        if (duffelMode() === "live" && isTestCardNumber(cardNum)) {
          throw new HttpError(422, "Test credit cards cannot be processed in Live booking mode. Please provide a valid credit or debit card.");
        }
        const expMonth = Number(card.exp_month || (String(card.expiry || "").split("/")[0]));
        const expYearStr = String(card.exp_year || (String(card.expiry || "").split("/")[1]));
        const expYear = expYearStr.length === 2 ? 2000 + Number(expYearStr) : Number(expYearStr);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          throw new HttpError(422, "Please enter a valid card expiration date (MM/YY)");
        }
        if (!card.cvc || String(card.cvc).trim().length < 3) {
          throw new HttpError(422, "Please enter a valid 3 or 4-digit security code (CVC)");
        }

        const brand = detectCardBrand(cardNum);
        const last4 = cardNum.slice(-4);
        const cardMethodLabel = `${brand} ending in ${last4}`;

        let order = null;
        let airlinePnr = null;
        let duffelOrderId = null;
        let bookingStatus = bk.S.REQUESTED;
        let paymentStatus = "authorized";

        // Try to hold seats with the airline if the offer permits:
        if (requirements.requires_instant_payment === false) {
          try {
            order = await bk.createOrder(booking, "hold", logger);
          } catch (e) {
            logger.warn(`Could not hold with airline: ${e.message}`);
          }
        }

        // Try instant order using Duffel balance if hold not available:
        if (!order) {
          try {
            order = await bk.createOrder(booking, "instant", logger);
          } catch (e) {
            logger.warn(`Instant Duffel balance order not placed: ${e.message}`);
          }
        }

        if (order) {
          const of = bk.orderFields(order, booking);
          airlinePnr = of.airline_pnr || order.booking_reference;
          duffelOrderId = order.id;
          bookingStatus = of.status || (order.payment_status?.awaiting_payment ? bk.S.ON_HOLD : bk.S.CONFIRMED);
          paymentStatus = bookingStatus === bk.S.CONFIRMED ? "paid" : "authorized";
        } else {
          // If no airline GDS order was issued by Duffel, do NOT create a fake PNR!
          // Mark as REQUESTED with payment authorized: our 24/7 desk issues it with the carrier.
          bookingStatus = bk.S.REQUESTED;
          paymentStatus = "authorized";
          airlinePnr = null;
        }

        booking = {
          ...booking,
          status: bookingStatus,
          booking_mode: "card",
          payment_status: paymentStatus,
          payment_method: cardMethodLabel,
          paid_at: bookingStatus === bk.S.CONFIRMED ? utcNow() : null,
          airline_pnr: airlinePnr,
          duffel_order_id: duffelOrderId,
        };

        await db.upsert("bookings", booking, ["ota_booking_id"]);
        await announce(booking, bookingStatus === bk.S.CONFIRMED ? "customer.booking_confirmed" : "customer.booking_requested", user.id);
        emailInBackground(booking);
        return reply({ step: "done", booking: customerBooking(booking), replayed: false });
      }

      // 1) Card checkout through Duffel Payments.
      if (cardPaymentsEnabled()) {
        const intent = await bk.createPaymentIntent(customerTotal, currency, logger);
        if (intent) {
          booking = { ...booking, status: bk.S.AWAITING_PAYMENT, booking_mode: "card", payment_intent_id: intent.id };
          await db.upsert("bookings", booking, ["ota_booking_id"]);
          await audit(user.id, "customer.checkout_started", { booking_reference: reference });
          return reply(paymentStep(booking, intent.clientToken));
        }
      }
      // 2) Hold the seats with the airline: a real airline confirmation (PNR), paid later.
      if (requirements.requires_instant_payment === false) {
        let order = null;
        try {
          order = await bk.createOrder(booking, "hold", logger);
        } catch (exc) {
          // Some airlines refuse holds even when the offer allows paying later; send those as requests.
          if (!(exc instanceof HttpError && /type was incorrect|hold/i.test(String(exc.detail)))) throw exc;
          logger.warn(`Hold refused for ${owner.name || "airline"} offer ${offerId}; recording a request instead.`);
        }
        if (order) {
          booking = { ...booking, ...bk.orderFields(order, booking), status: bk.S.ON_HOLD, booking_mode: "hold" };
          await db.upsert("bookings", booking, ["ota_booking_id"]);
          await announce(booking, "customer.booking_held", user.id);
          emailInBackground(booking);
          return reply({ step: "done", booking: customerBooking(booking), replayed: false });
        }
      }
      // 3) The airline needs payment now and card payments aren't on: hand it to an agent.
      booking = { ...booking, status: bk.S.REQUESTED, booking_mode: "request", duffel_order_id: null };
      await db.upsert("bookings", booking, ["ota_booking_id"]);
      await announce(booking, "customer.booking_requested", user.id);
      emailInBackground(booking);
      return reply({ step: "done", booking: customerBooking(booking), replayed: false });
    } catch (exc) {
      // Nothing was created with the airline: release the key so the customer can retry.
      await db.execute("DELETE FROM bookings WHERE ota_booking_id = ? AND status = ?", otaBookingId, bk.S.PROCESSING);
      throw exc;
    }
  }));

  // Guest documents (e-ticket, invoice) for the booking just made; signed-in customers use /my/bookings.
  r.get("/guest/bookings/:reference/:doc(eticket|invoice)", optionalUser, ah(async (req, res) => {
    const booking = await guestOrOwnBooking(req, req.params.reference, req.query.token);
    if (req.query.format === "pdf") {
      const buf = req.params.doc === "eticket" ? await pdf.eticketPdf(booking) : await pdf.invoicePdf(booking);
      return res.type("application/pdf")
        .set({
          "Content-Disposition": `attachment; filename="${req.params.doc === "eticket" ? "E-ticket" : "Invoice"}-${booking.booking_reference}.pdf"`,
          "Cache-Control": "no-store",
        })
        .send(buf);
    }
    res.type("html").set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" })
      .send(req.params.doc === "eticket" ? documents.renderEticket(booking) : documents.renderInvoice(booking));
  }));

  // Step 2 (card only): after the card form succeeds, confirm the payment and ticket the booking.
  r.post("/my/checkout/confirm", optionalUser, ah(async (req, res) => {
    const b = v.body(req);
    const reference = v.str(b, "booking_reference", { max: 20, label: "booking_reference" });
    const booking = await guestOrOwnBooking(req, reference, b.checkout_token);
    if (booking.status === bk.S.CONFIRMED) return res.json({ booking: customerBooking(booking) });
    const result = await bk.finalizeCardBooking(booking, logger, { fromBrowser: true });
    if (result.outcome === "busy") throw new HttpError(409, PROCESSING_MSG);
    if (result.outcome === "payment_error") throw new HttpError(402, `Your payment didn't go through: ${result.reason}`);
    if (result.outcome === "unpaid") throw new HttpError(402, "Your payment hasn't been completed yet. Please try again.");
    if (result.outcome === "failed") {
      throw new HttpError(409, `The airline couldn't confirm this fare (${result.reason}). Your payment of ${booking.currency} ${Number(booking.customer_total).toFixed(2)} is being refunded. Please search again.`);
    }
    const updated = result.booking;
    res.json({ booking: customerBooking(updated) });
  }));

  return r;
};

module.exports.resolveSearch = resolveSearch;
module.exports.offerRoute = offerRoute;
module.exports.itineraryKey = itineraryKey;
module.exports.searchFromOffer = searchFromOffer;
module.exports.validatePassengers = validatePassengers;
