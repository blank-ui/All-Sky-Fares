import { summarize } from "./workspaceStats";

const now = new Date("2026-10-20T12:00:00Z");
const base = { currency: "USD", payment_status: "paid", status: "CONFIRMED", created_at: "2026-10-19T10:00:00Z", airline: "BA" };
const trip = (o, d, dep) => [{ origin: o, destination: d, departing_at: dep }];

test("sales and margin count only paid, still-valid bookings in the main currency", () => {
  const s = summarize([
    { ...base, customer_total: 500, supplier_amount: 450, slices: trip("LHR", "JFK", "2026-10-22T09:00:00") },
    { ...base, customer_total: 300, supplier_amount: 270, slices: trip("LHR", "JFK", "2026-12-01T09:00:00") },
    { ...base, customer_total: 999, supplier_amount: 900, status: "CANCELLED" },
    { ...base, customer_total: 200, supplier_amount: 180, payment_status: "unpaid", status: "ON_HOLD", payment_required_by: "2026-10-21T08:00:00Z" },
    { ...base, customer_total: 100, supplier_amount: 90, currency: "EUR" },
    { ...base, payment_status: "unpaid", status: "AWAITING_PAYMENT", created_at: "2026-10-18T10:00:00Z", slices: trip("CDG", "NRT", "2026-10-21T09:00:00") },
  ], now);
  expect(s.currency).toBe("USD");
  expect(s.sales).toBe(800);
  expect(s.margin).toBe(80);
  expect(s.average).toBe(400);
  expect(s.otherCurrencyPaid).toBe(1);
  expect(s.action.holdsDue).toHaveLength(1);
  expect(s.topRoutes[0]).toMatchObject({ key: "LHR → JFK", count: 2 });
  expect(s.upcoming).toHaveLength(1); // only the paid flight within 7 days; the abandoned checkout is left out
  expect(s.action.stuckPayments).toHaveLength(1);
  expect(s.days[12]).toMatchObject({ bookings: 5, sales: 800 }); // yesterday
});

test("empty list gives zeros, not made-up numbers", () => {
  const s = summarize([], now);
  expect(s.sales).toBe(0);
  expect(s.average).toBe(0);
  expect(s.days).toHaveLength(14);
  expect(s.topRoutes).toEqual([]);
});
