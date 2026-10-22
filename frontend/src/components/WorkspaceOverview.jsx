import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, CreditCard, DollarSign, Download, Inbox,
  Percent, Plane, RefreshCw, Route, Send, SlidersHorizontal, Ticket, TrendingUp, XCircle,
} from "lucide-react";
import { summarize } from "@/lib/workspaceStats";
import { StatusBadge } from "./BookingActions";

const money = (value, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

/** One bento tile. Clickable tiles open the matching workspace tab. */
function Tile({ className = "", onClick, children, label }) {
  const clickable = onClick
    ? { role: "button", tabIndex: 0, "aria-label": label, onClick, onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) }
    : {};
  return (
    <section
      {...clickable}
      className={`bento-card ${onClick ? "bento-card-interactive cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/30" : ""} border border-slate-200/90 dark:border-white/10 p-5 flex flex-col min-w-0 ${className}`}
    >
      {children}
    </section>
  );
}

function TileHead({ icon: Icon, title, tone = "sky", action }) {
  const tones = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-white/50">{title}</span>
      {action || (
        <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon size={16} />
        </span>
      )}
    </div>
  );
}

function Kpi({ icon, title, tone, value, sub, onClick }) {
  return (
    <Tile onClick={onClick} label={title}>
      <TileHead icon={icon} title={title} tone={tone} />
      <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900 dark:text-white truncate">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-white/50">{sub}</div>
    </Tile>
  );
}

function SalesChart({ days, currency }) {
  const [metric, setMetric] = useState("sales");
  const max = Math.max(1, ...days.map((d) => d[metric]));
  const total = days.reduce((s, d) => s + d[metric], 0);
  return (
    <Tile className="sm:col-span-2 lg:col-span-3">
      <TileHead
        title="Last 14 days"
        action={
          <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-bold dark:bg-white/5" role="group" aria-label="Chart metric">
            {[["sales", "Sales"], ["bookings", "Bookings"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMetric(id)}
                aria-pressed={metric === id}
                className={`rounded-lg px-3 py-1 ${metric === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-white/50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="text-xl font-black tabular-nums text-slate-900 dark:text-white">
        {metric === "sales" ? money(total, currency) : `${total} booking${total === 1 ? "" : "s"}`}
      </div>
      <div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={`${metric} per day for the last 14 days`}>
        {days.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400 transition-all group-hover:from-sky-600 group-hover:to-sky-400"
              style={{ height: `${Math.max(d[metric] ? 6 : 2, (d[metric] / max) * 100)}%`, opacity: d[metric] ? 1 : 0.25 }}
            />
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white group-hover:block">
              {d.label}: {metric === "sales" ? money(d.sales, currency) : d.bookings}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400 dark:text-white/40">
        <span>{days[0].label}</span>
        <span>Today</span>
      </div>
    </Tile>
  );
}

function ActionList({ action, openBookings }) {
  const groups = [
    { key: "holdsDue", icon: Clock, tone: "text-amber-600 dark:text-amber-400", title: "Holds due within 48h", hint: "Take payment, then Pay & issue tickets", filter: "ON_HOLD", time: (b) => `due ${shortDate(b.payment_required_by)}` },
    { key: "requests", icon: Inbox, tone: "text-sky-600 dark:text-sky-400", title: "Booking requests", hint: "Confirm price and availability with the customer", filter: "REQUESTED", time: (b) => shortDate(b.created_at) },
    { key: "scheduleChanges", icon: AlertTriangle, tone: "text-rose-600 dark:text-rose-400", title: "Airline schedule changes", hint: "Contact the traveller", filter: "ALL", time: (b) => shortDate(b.updated_at || b.created_at) },
    { key: "stuckPayments", icon: CreditCard, tone: "text-indigo-600 dark:text-indigo-400", title: "Card checkouts not completed", hint: "Unpaid for 30+ minutes", filter: "AWAITING_PAYMENT", time: (b) => shortDate(b.created_at) },
  ];
  const count = groups.reduce((n, g) => n + action[g.key].length, 0);
  return (
    <Tile className="lg:row-span-2">
      <TileHead icon={AlertTriangle} title="Action needed" tone={count ? "rose" : "emerald"} />
      {count === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <div className="mt-2 text-sm font-bold text-slate-800 dark:text-white">All clear</div>
          <div className="text-xs text-slate-500 dark:text-white/50">No holds due, requests or schedule changes.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.filter((g) => action[g.key].length).map(({ key, icon: Icon, tone, title, hint, filter, time }) => (
            <div key={key}>
              <button type="button" onClick={() => openBookings(filter)} className="flex w-full items-center gap-2 text-left">
                <Icon size={15} className={tone} />
                <span className="flex-1 text-xs font-bold text-slate-800 dark:text-white">{title}</span>
                <span className="rounded-full bg-slate-900 px-2 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{action[key].length}</span>
              </button>
              <div className="ml-6 text-[11px] text-slate-500 dark:text-white/50">{hint}</div>
              <ul className="ml-6 mt-1.5 space-y-1">
                {action[key].slice(0, 3).map((b) => (
                  <li key={b.ota_booking_id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-bold text-slate-700 dark:text-white/80">{b.booking_reference}</span>
                    <span className="truncate text-slate-500 dark:text-white/50">{time(b)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}

function RankList({ icon, title, tone, rows, currency, empty, onClick }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Tile onClick={onClick} label={title}>
      <TileHead icon={icon} title={title} tone={tone} />
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 dark:text-white/50">{empty}</div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-bold text-slate-800 dark:text-white">{r.key}</span>
                <span className="shrink-0 tabular-nums text-slate-500 dark:text-white/50">{r.count} · {money(r.sales, currency)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

function Upcoming({ rows, firstDeparture, routeOf, onClick }) {
  return (
    <Tile onClick={onClick} label="Departing in the next 7 days">
      <TileHead icon={CalendarClock} title="Departing in 7 days" tone="indigo" />
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 dark:text-white/50">No departures in the next 7 days.</div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.slice(0, 5).map((b) => (
            <li key={b.ota_booking_id} className="flex items-center justify-between gap-2 py-2 text-xs">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-800 dark:text-white">{routeOf(b)}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-white/50">{b.customer_name || b.email}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-white/80">{shortDate(firstDeparture(b))}</div>
                <StatusBadge status={b.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

function Health({ integrations, crm, markups, setTab }) {
  const list = integrations.data?.integrations || [];
  const counts = crm.data?.counts || {};
  const queued = (counts.pending || 0) + (counts.sending || 0);
  return (
    <>
      <Tile onClick={() => setTab("integrations")} label="System health" className="sm:col-span-2">
        <TileHead icon={TrendingUp} title="System health" tone="emerald" />
        {integrations.loading ? (
          <div className="text-xs text-slate-500">Checking…</div>
        ) : integrations.error ? (
          <div className="text-xs text-rose-600">{integrations.error}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {list.map((i) => (
              <li key={i.provider} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                {i.healthy ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-rose-500" />}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{i.provider}</div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-white/50">{i.status}{i.detail ? ` · ${i.detail}` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tile>
      <Tile onClick={() => setTab("crm")} label="CRM delivery">
        <TileHead icon={Send} title="CRM delivery" tone={counts.dead ? "rose" : "emerald"} />
        <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{crm.loading ? "…" : counts.delivered || 0}</div>
        <div className="text-[11px] text-slate-500 dark:text-white/50">delivered</div>
        <div className="mt-3 flex gap-3 text-[11px] font-bold">
          <span className="text-sky-600 dark:text-sky-400">{queued} queued</span>
          <span className={counts.dead ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}>{counts.dead || 0} failed</span>
        </div>
      </Tile>
      <Tile onClick={() => setTab("markups")} label="Pricing">
        <TileHead icon={SlidersHorizontal} title="Pricing" tone="orange" />
        <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{markups.loading ? "…" : (markups.data?.markups || []).length}</div>
        <div className="text-[11px] text-slate-500 dark:text-white/50">route markups</div>
        <div className="mt-3 text-[11px] font-bold">
          {markups.data?.duffel_mode === "live"
            ? <span className="text-emerald-600 dark:text-emerald-400">Live airline prices</span>
            : <span className="text-amber-600 dark:text-amber-400">Duffel test key: sample prices</span>}
        </div>
      </Tile>
    </>
  );
}

function exportCsv(s) {
  const rows = [
    ["section", "item", "bookings", `sales_${s.currency}`],
    ...s.days.map((d) => ["day", d.label, d.bookings, d.sales.toFixed(2)]),
    ...s.topRoutes.map((r) => ["route", r.key, r.count, r.sales.toFixed(2)]),
    ...s.topAirlines.map((r) => ["airline", r.key, r.count, r.sales.toFixed(2)]),
    ["total", "paid bookings", s.paidCount, s.sales.toFixed(2)],
    ["total", "margin", "", s.margin.toFixed(2)],
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: `allskyfares-overview-${new Date().toISOString().slice(0, 10)}.csv` }).click();
  URL.revokeObjectURL(url);
}

export function WorkspaceOverview({ bookings, integrations, crm, markups, setTab, openBookings, reload }) {
  const list = useMemo(() => bookings.data?.bookings || [], [bookings.data]);
  const s = useMemo(() => summarize(list), [list]);
  const c = s.currency;

  if (bookings.loading && !bookings.data) {
    return <div className="py-16 text-center text-sm text-slate-500 dark:text-white/50">Loading bookings…</div>;
  }
  if (bookings.error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" role="alert">{bookings.error}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-slate-500 dark:text-white/50">
          Based on the latest {s.total} booking{s.total === 1 ? "" : "s"}. Sales count paid bookings in {c}
          {s.otherCurrencyPaid ? ` (${s.otherCurrencyPaid} paid in other currencies not included)` : ""}.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={reload} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" onClick={() => exportCsv(s)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={DollarSign} tone="emerald" title="Sales" value={money(s.sales, c)} sub={`${s.paidCount} paid booking${s.paidCount === 1 ? "" : "s"}`} onClick={() => openBookings("CONFIRMED")} />
        <Kpi icon={Percent} tone="orange" title="Margin" value={money(s.margin, c)} sub={s.sales ? `${s.marginPct.toFixed(1)}% of sales` : "No paid bookings yet"} onClick={() => setTab("markups")} />
        <Kpi icon={Ticket} tone="sky" title="Bookings" value={s.total} sub={`${s.byStatus.CONFIRMED || 0} confirmed · ${s.byStatus.ON_HOLD || 0} on hold`} onClick={() => openBookings("ALL")} />
        <Kpi icon={TrendingUp} tone="indigo" title="Average booking" value={money(s.average, c)} sub="per paid booking" onClick={() => openBookings("CONFIRMED")} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SalesChart days={s.days} currency={c} />
        <ActionList action={s.action} openBookings={openBookings} />
        <RankList icon={Route} tone="sky" title="Top routes" rows={s.topRoutes} currency={c} empty="No bookings yet." onClick={() => openBookings("ALL")} />
        <RankList icon={Plane} tone="indigo" title="Top airlines" rows={s.topAirlines} currency={c} empty="No bookings yet." onClick={() => openBookings("ALL")} />
        <Upcoming rows={s.upcoming} firstDeparture={s.firstDeparture} routeOf={s.routeOf} onClick={() => openBookings("ALL")} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Health integrations={integrations} crm={crm} markups={markups} setTab={setTab} />
      </div>

      <button type="button" onClick={() => openBookings("ALL")} className="ml-auto flex items-center gap-1.5 px-1 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400">
        Open all bookings <ArrowRight size={13} />
      </button>
    </div>
  );
}
