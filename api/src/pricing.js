// Route markups: customer price = fare + markup_amount per traveller + fare * markup_percent / 100.
const fs = require("fs");
const path = require("path");
const db = require("./db");
const { utcNow, addMs, MINUTE, round2 } = require("./util");

const PRICING_RULES_FILE = path.join(__dirname, "..", "pricing_rules.json");
let dbDownUntil = null;

/** Fallback markups used only while the database is unreachable. */
function loadLocalPricingRules() {
  try {
    const data = JSON.parse(fs.readFileSync(PRICING_RULES_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadMarkups(logger = console) {
  // After a database failure, use the file for a minute so a search doesn't wait on every offer.
  if (!dbDownUntil || utcNow() >= dbDownUntil) {
    try {
      const rows = await db.fetchAll("SELECT origin, destination, markup_amount, markup_percent FROM route_markups");
      dbDownUntil = null;
      return rows;
    } catch (exc) {
      dbDownUntil = addMs(utcNow(), MINUTE);
      logger.warn(`Route markups unavailable from the database, using local file for 60s: ${exc.message}`);
    }
  }
  return loadLocalPricingRules();
}

/** Most specific wins: exact route, then origin + any, then any + destination, then the default. */
function matchMarkup(markups, origin, destination) {
  const byRoute = new Map(markups.map((m) => [`${m.origin}|${m.destination}`, m]));
  for (const key of [`${origin}|${destination}`, `${origin}|*`, `*|${destination}`, "*|*"]) {
    if (byRoute.has(key)) return byRoute.get(key);
  }
  return null;
}

/** Returns [customerTotal, markupTotal]. The amount is per traveller; the % is on the whole fare. */
function applyMarkup(fare, travellers, markup) {
  if (!markup) return [round2(fare), 0];
  const added = Number(markup.markup_amount || 0) * Math.max(travellers, 1) + (fare * Number(markup.markup_percent || 0)) / 100;
  return [round2(fare + added), round2(added)];
}

function markupLabel(markup) {
  if (!markup) return "No markup";
  const route = `${markup.origin.replace("*", "Any")} → ${markup.destination.replace("*", "Any")}`;
  return `${route}: ${Number(markup.markup_amount || 0).toFixed(2)} + ${Number(markup.markup_percent || 0)}%`;
}

async function priceOffer(fare, origin, destination, travellers = 1, markups = null) {
  const rule = matchMarkup(markups || (await loadMarkups()), origin, destination);
  return [applyMarkup(fare, travellers, rule)[0], markupLabel(rule)];
}

module.exports = { loadLocalPricingRules, loadMarkups, matchMarkup, applyMarkup, markupLabel, priceOffer };
