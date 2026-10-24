const { duffelKey } = require("./secrets");
const { HttpError, round2 } = require("./util");

const DUFFEL_BASE = "https://api.duffel.com";
const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";

const duffelHeaders = () => ({
  Authorization: `Bearer ${duffelKey()}`,
  "Duffel-Version": "v2",
  Accept: "application/json",
  "Accept-Encoding": "gzip",
});

async function duffelCall(method, path, jsonBody, logger = console) {
  if (!duffelKey()) throw new HttpError(503, "Flight service is awaiting configuration");
  const headers = duffelHeaders();
  if (jsonBody !== undefined) headers["Content-Type"] = "application/json";
  let r;
  try {
    r = await fetch(`${DUFFEL_BASE}${path}`, {
      method, headers,
      body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
      signal: AbortSignal.timeout(60000),
    });
  } catch (exc) {
    logger.warn(`Duffel network error ${method} ${path}: ${exc.message}`);
    throw new HttpError(502, "We couldn't reach the flight service. Please try again.");
  }
  if (r.status >= 400) {
    let msg = "Flight service error";
    try {
      const data = await r.json();
      const errors = data.errors || [];
      msg = errors.length ? errors[0].message : data.message || msg;
    } catch { /* keep default */ }
    logger.warn(`Duffel error ${method} ${path}: ${msg}`);
    throw new HttpError(r.status >= 500 ? 502 : 400, msg);
  }
  return r.json();
}

const airlineLogo = (code) => (code ? `${AIRLINE_LOGO_CDN}/${String(code).toUpperCase()}.png` : "");

/** Checked and carry-on allowance for the first passenger on a segment. */
function segmentBaggage(seg) {
  const bags = ((seg.passengers || [])[0] || {}).baggages || [];
  const count = (type) => bags.filter((b) => b.type === type).reduce((n, b) => n + Number(b.quantity || 0), 0);
  return { checked: count("checked"), carry_on: count("carry_on") };
}

function segmentCabin(seg) {
  const pax = seg.passengers || [];
  return pax.length ? (pax[0] || {}).cabin_class || "" : "";
}

/** Seat pitch, wi-fi and power as the airline publishes them; null when it publishes nothing. */
function segmentAmenities(seg) {
  const cabin = ((seg.passengers || [])[0] || {}).cabin || {};
  const a = cabin.amenities;
  if (!a) return null;
  const pitch = a.seat && a.seat.pitch && a.seat.pitch !== "n/a" ? Number(a.seat.pitch) || null : null;
  return {
    wifi: a.wifi ? { available: Boolean(a.wifi.available), cost: a.wifi.cost || null } : null,
    power: a.power ? Boolean(a.power.available) : null,
    seat_pitch_in: pitch,
    legroom: a.seat && a.seat.legroom && a.seat.legroom !== "n/a" ? a.seat.legroom : null,
  };
}

/** Duffel's { allowed, penalty_amount, penalty_currency }; null means the airline didn't say. */
function fareRule(rule) {
  if (!rule) return null;
  return {
    allowed: Boolean(rule.allowed),
    penalty: rule.penalty_amount != null ? Number(rule.penalty_amount) : null,
    currency: rule.penalty_currency || null,
  };
}

/** Change and refund rules for the whole ticket. */
function offerConditions(offer) {
  const c = offer.conditions || {};
  return { change: fareRule(c.change_before_departure), refund: fareRule(c.refund_before_departure) };
}

/** Seat-map summary per segment: how many seats can be picked and what they cost. */
function summarizeSeatMaps(seatMaps) {
  return (seatMaps || []).map((map) => {
    let total = 0;
    let free = 0;
    const prices = [];
    let currency = null;
    for (const cabin of map.cabins || []) {
      for (const row of cabin.rows || []) {
        for (const section of row.sections || []) {
          for (const el of section.elements || []) {
            if (el.type !== "seat") continue;
            const services = el.available_services || [];
            if (!services.length) continue;
            total += 1;
            const amount = Number(services[0].total_amount || 0);
            currency = services[0].total_currency || currency;
            if (amount === 0) free += 1;
            else prices.push(amount);
          }
        }
      }
    }
    return {
      segment_id: map.segment_id || null,
      available: total,
      free,
      min_price: prices.length ? Math.min(...prices) : null,
      max_price: prices.length ? Math.max(...prices) : null,
      currency,
    };
  });
}

/** Real split of the price: airline base fare, airline taxes/fees, and our service fee. */
function fareBreakdown(offer, customerTotal) {
  const airlineTotal = Number(offer.total_amount || 0);
  const taxes = Number(offer.tax_amount || 0);
  const base = offer.base_amount != null ? Number(offer.base_amount) : airlineTotal - taxes;
  return { base_fare: round2(base), taxes: round2(taxes), service_fee: round2(customerTotal - airlineTotal) };
}

function normalizeSlices(slices) {
  return (slices || []).map((s) => {
    const segs = s.segments || [];
    const first = segs[0] || {};
    const last = segs[segs.length - 1] || {};
    return {
      origin: (s.origin || {}).iata_code || "",
      origin_name: (s.origin || {}).name || "",
      destination: (s.destination || {}).iata_code || "",
      destination_name: (s.destination || {}).name || "",
      duration: s.duration || null,
      departing_at: first.departing_at || null,
      arriving_at: last.arriving_at || null,
      stops: Math.max(segs.length - 1, 0),
      fare_brand: s.fare_brand_name || null,
      advance_seat_selection: fareRule((s.conditions || {}).advance_seat_selection),
      priority_boarding: fareRule((s.conditions || {}).priority_boarding),
      segments: segs.map((seg) => {
        const mc = seg.marketing_carrier || {};
        const oc = seg.operating_carrier || {};
        return {
          origin: (seg.origin || {}).iata_code || "",
          destination: (seg.destination || {}).iata_code || "",
          departing_at: seg.departing_at || null,
          arriving_at: seg.arriving_at || null,
          airline: mc.name || "",
          airline_code: mc.iata_code || "",
          airline_logo: mc.logo_symbol_url || mc.logo_lockup_url || airlineLogo(mc.iata_code || ""),
          flight_number: seg.marketing_carrier_flight_number || seg.operating_carrier_flight_number || null,
          operating_airline: oc.name || "",
          operating_airline_code: oc.iata_code || "",
          origin_name: (seg.origin || {}).name || "",
          destination_name: (seg.destination || {}).name || "",
          origin_city: (seg.origin || {}).city_name || "",
          destination_city: (seg.destination || {}).city_name || "",
          origin_country: (seg.origin || {}).iata_country_code || "",
          destination_country: (seg.destination || {}).iata_country_code || "",
          baggage: segmentBaggage(seg),
          origin_terminal: seg.origin_terminal || null,
          destination_terminal: seg.destination_terminal || null,
          aircraft: (seg.aircraft || {}).name || "",
          cabin_class: segmentCabin(seg),
          cabin_name: ((((seg.passengers || [])[0] || {}).cabin || {}).marketing_name) || null,
          amenities: segmentAmenities(seg),
          duration: seg.duration || null,
        };
      }),
    };
  });
}

module.exports = { DUFFEL_BASE, duffelHeaders, duffelCall, airlineLogo, fareBreakdown, normalizeSlices, offerConditions, summarizeSeatMaps };
