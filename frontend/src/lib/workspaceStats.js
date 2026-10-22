// Numbers for the staff workspace overview, computed from the bookings list the API returns.
// Every figure comes from real booking rows; nothing is estimated or filled in.

const DAY = 86400000;
const CLOSED = new Set(["CANCELLED", "FAILED", "EXPIRED"]);

const firstDeparture = (b) => (b.slices && b.slices[0] && b.slices[0].departing_at) || null;
const routeOf = (b) => {
  const s = b.slices || [];
  return s.length ? `${s[0].origin} → ${s[0].destination}` : null;
};

/** Counts and sums by key, top `limit` by count. */
function rank(rows, keyOf, limit = 5) {
  const map = new Map();
  for (const b of rows) {
    const key = keyOf(b);
    if (!key) continue;
    const r = map.get(key) || { key, count: 0, sales: 0 };
    r.count += 1;
    r.sales += Number(b.customer_total || 0);
    map.set(key, r);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.sales - a.sales).slice(0, limit);
}

export function summarize(bookings = [], now = new Date()) {
  // Sales only count paid, still-valid bookings, in the most common currency (mixing currencies would be wrong).
  const currencyCounts = {};
  for (const b of bookings) currencyCounts[b.currency || "USD"] = (currencyCounts[b.currency || "USD"] || 0) + 1;
  const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
  const paid = bookings.filter((b) => b.payment_status === "paid" && !CLOSED.has(b.status) && (b.currency || "USD") === currency);
  const otherCurrencyPaid = bookings.filter((b) => b.payment_status === "paid" && !CLOSED.has(b.status) && (b.currency || "USD") !== currency).length;

  const sales = paid.reduce((s, b) => s + Number(b.customer_total || 0), 0);
  const margin = paid.reduce((s, b) => s + (Number(b.customer_total || 0) - Number(b.supplier_amount || 0)), 0);

  const byStatus = {};
  for (const b of bookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;

  const t = now.getTime();
  const holdsDue = bookings
    .filter((b) => b.status === "ON_HOLD" && b.payment_required_by && new Date(b.payment_required_by).getTime() - t < 2 * DAY)
    .sort((a, b) => new Date(a.payment_required_by) - new Date(b.payment_required_by));
  const requests = bookings.filter((b) => b.status === "REQUESTED");
  const scheduleChanges = bookings.filter((b) => b.airline_change && !CLOSED.has(b.status));
  // A card checkout still unpaid after 30 minutes was most likely abandoned or needs a look.
  const stuckPayments = bookings.filter((b) => b.status === "AWAITING_PAYMENT" && t - new Date(b.created_at).getTime() > 30 * 60000);

  // Last 14 days, oldest first, by the day the booking was made (viewer's time zone).
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(t - i * DAY);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString([], { month: "short", day: "numeric" }), sales: 0, bookings: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  for (const b of bookings) {
    const i = dayIndex.get(new Date(b.created_at).toDateString());
    if (i === undefined) continue;
    days[i].bookings += 1;
    if (paid.includes(b)) days[i].sales += Number(b.customer_total || 0);
  }

  // Real trips only: abandoned or in-progress checkouts aren't travel yet.
  const live = bookings.filter((b) => ["CONFIRMED", "ON_HOLD", "REQUESTED"].includes(b.status));
  const upcoming = live
    .filter((b) => {
      const dep = firstDeparture(b);
      const ms = dep ? new Date(dep).getTime() - t : NaN;
      return ms >= -DAY && ms <= 7 * DAY;
    })
    .sort((a, b) => new Date(firstDeparture(a)) - new Date(firstDeparture(b)));

  return {
    currency,
    sales,
    margin,
    marginPct: sales > 0 ? (margin / sales) * 100 : 0,
    paidCount: paid.length,
    otherCurrencyPaid,
    average: paid.length ? sales / paid.length : 0,
    total: bookings.length,
    byStatus,
    action: { holdsDue, requests, scheduleChanges, stuckPayments },
    days,
    topRoutes: rank(live, routeOf),
    topAirlines: rank(live, (b) => b.airline || null),
    upcoming,
    firstDeparture,
    routeOf,
  };
}
