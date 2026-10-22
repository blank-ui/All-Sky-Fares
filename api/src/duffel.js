const { cfg } = require("./secrets");
const { HttpError, round2 } = require("./util");

const DUFFEL_BASE = "https://api.duffel.com";
const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";

const duffelHeaders = () => ({
  Authorization: `Bearer ${cfg("DUFFEL_API_KEY")}`,
  "Duffel-Version": "v2",
  Accept: "application/json",
  "Accept-Encoding": "gzip",
});

async function duffelCall(method, path, jsonBody, logger = console) {
  if (!cfg("DUFFEL_API_KEY")) throw new HttpError(503, "Flight service is awaiting configuration");
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
          duration: seg.duration || null,
        };
      }),
    };
  });
}

module.exports = { DUFFEL_BASE, duffelHeaders, duffelCall, airlineLogo, fareBreakdown, normalizeSlices };
