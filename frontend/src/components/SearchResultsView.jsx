import { FlightSearchBox } from "./FlightSearchBox";
import { useCurrency } from "@/context/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { LEGAL } from "@/constants/legal";
import { AIRPORTS } from "@/lib/airports";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Plane, SlidersHorizontal, ShieldCheck, AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
  Sparkles, Check, X, Luggage, RefreshCcw, Armchair, Utensils, Wifi, Plug, Leaf, Users, Calendar, ArrowUpDown,
} from "lucide-react";

const CABINS = [
  ["economy", "Economy"],
  ["premium_economy", "Premium economy"],
  ["business", "Business"],
  ["first", "First"],
];
const cabinLabel = (value) => (CABINS.find(([v]) => v === value) || [null, value || ""])[1];

// Outbound departure windows, as Google Flights groups them.
const TIME_WINDOWS = [
  ["early", "Early morning", "12–6 AM", 0, 6],
  ["morning", "Morning", "6 AM–12 PM", 6, 12],
  ["afternoon", "Afternoon", "12–6 PM", 12, 18],
  ["evening", "Evening", "6 PM–12 AM", 18, 24],
];

function formatTime(iso) {
  try { return iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""; }
  catch { return ""; }
}

function formatDate(iso) {
  try { return iso ? new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : ""; }
  catch { return ""; }
}

function durationMinutes(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(iso || "");
  return m ? (Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0) : 0;
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h ? `${h} hr` : ""}${h && m ? " " : ""}${m ? `${m} min` : ""}` || "0 min";
}

const formatDuration = (iso) => (iso ? formatMinutes(durationMinutes(iso)) : "");
const offerMinutes = (o) => (o.slices || []).reduce((n, s) => n + durationMinutes(s.duration), 0);
const allSegments = (o) => (o.slices || []).flatMap((s) => s.segments || []);
/** The same flights in one direction, whichever fare they were sold with. */
const sliceKey = (s) => JSON.stringify(((s && s.segments) || []).map((g) => [g.airline_code, g.flight_number, g.departing_at]));
const dayDiff = (a, b) => Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / 86400000);

/** yyyy-mm-dd shifted by n days, in local time like the date inputs. */
function shiftDate(ymd, n) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayYmd = () => shiftDate(new Date().toISOString().slice(0, 10), 0);

/** The smallest allowance on any flight of the trip, so a row never promises more than every leg gives. */
function bagSummary(offer) {
  const segs = allSegments(offer).filter((s) => s.baggage);
  if (!segs.length) return null;
  return {
    checked: Math.min(...segs.map((s) => s.baggage.checked)),
    carry_on: Math.min(...segs.map((s) => s.baggage.carry_on)),
  };
}

/** "Free", "$40 fee", "Not allowed"… for a Duffel change/refund rule. */
function ruleText(rule, formatMoney) {
  if (!rule) return "Ask the airline";
  if (!rule.allowed) return "Not allowed";
  if (rule.penalty === 0) return "Free";
  if (rule.penalty > 0) return `${formatMoney(rule.penalty, rule.currency || "USD")} airline fee`;
  return "Allowed, fee varies";
}

const ruleTone = (rule) =>
  !rule ? "text-slate-500 dark:text-slate-400"
    : !rule.allowed ? "text-rose-600 dark:text-rose-400"
      : rule.penalty === 0 ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400";

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
};

export function AirlineLogo({ src: given, code, size = 32 }) {
  const [failed, setFailed] = useState(false);
  // Same logo CDN the API uses, so an offer without a logo URL still shows one.
  const src = given || (/^[A-Z0-9]{2}$/i.test(code || "") ? `https://images.kiwi.com/airlines/64x64/${code.toUpperCase()}.png` : "");
  if (!src || failed) {
    return (
      <div
        className="rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono flex items-center justify-center text-xs shadow-inner shrink-0"
        style={{ width: size, height: size }}
      >
        {(code || "??").slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={code}
      width={size}
      height={size}
      className="rounded-xl object-contain bg-white p-1 border border-slate-200/50 shadow-sm shrink-0"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

/** Seat, Wi-Fi, power and bags for one flight, listed like Google Flights' right-hand column. */
function AmenityList({ seg }) {
  const a = seg.amenities || {};
  const items = [];
  if (a.seat_pitch_in) items.push([Armchair, `${a.seat_pitch_in} in seat pitch${a.legroom ? ` · ${a.legroom} legroom` : ""}`]);
  if (a.wifi) items.push([Wifi, a.wifi.available ? `Wi-Fi on board${a.wifi.cost === "free" ? " (free)" : a.wifi.cost === "paid" ? " (paid)" : ""}` : "No Wi-Fi"]);
  if (a.power != null) items.push([Plug, a.power ? "In-seat power outlet" : "No in-seat power"]);
  if (seg.baggage) items.push([Luggage, `${seg.baggage.carry_on} carry-on, ${seg.baggage.checked ? `${seg.baggage.checked} checked bag` : "no checked bag"}`]);
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
      {items.map(([Icon, text]) => (
        <li key={text} className="flex items-center gap-2"><Icon size={14} className="shrink-0 text-slate-400" />{text}</li>
      ))}
    </ul>
  );
}

/** Departs in the small hours or lands the next day. */
const isOvernight = (seg) => new Date(seg.departing_at).getHours() < 5 || dayDiff(seg.departing_at, seg.arriving_at) > 0;

/** Google Flights-style detail of one direction: each flight's timeline and amenities, with layover strips between. */
function SliceTimeline({ slice, title }) {
  const segments = slice.segments || [];
  return (
    <div>
      {title && (
        <div className="px-4 sm:px-6 sm:pl-[4.75rem] pt-4 text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
          {title} · {formatDate(slice.departing_at)}
        </div>
      )}
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <div className="px-4 sm:px-6 py-4 sm:pl-[4.75rem] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_16rem] gap-4">
            <div className="flex gap-3 min-w-0">
              <div className="flex flex-col items-center py-1.5" aria-hidden="true">
                <span className="w-3 h-3 rounded-full border-2 border-slate-400 dark:border-slate-500" />
                <span className="flex-1 border-l-2 border-dotted border-slate-300 dark:border-white/25 my-1" />
                <span className="w-3 h-3 rounded-full border-2 border-slate-400 dark:border-slate-500" />
              </div>
              <div className="min-w-0 space-y-3">
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {formatTime(seg.departing_at)} · {seg.origin_name || seg.origin} ({seg.origin})
                  {seg.origin_terminal && <span className="text-xs font-normal text-slate-500"> · Terminal {seg.origin_terminal}</span>}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                  Travel time: {formatDuration(seg.duration)}
                  {isOvernight(seg) && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">· Overnight <AlertCircle size={13} /></span>
                  )}
                </div>
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {formatTime(seg.arriving_at)} · {seg.destination_name || seg.destination} ({seg.destination})
                  {dayDiff(seg.departing_at, seg.arriving_at) > 0 && <sup className="ml-0.5 text-orange-500">+{dayDiff(seg.departing_at, seg.arriving_at)}</sup>}
                  {seg.destination_terminal && <span className="text-xs font-normal text-slate-500"> · Terminal {seg.destination_terminal}</span>}
                </div>
                <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                  {[seg.airline, seg.cabin_name || cabinLabel(seg.cabin_class), seg.aircraft, `${seg.airline_code} ${seg.flight_number || ""}`.trim()].filter(Boolean).join(" · ")}
                  {seg.operating_airline && seg.operating_airline_code !== seg.airline_code && ` · Operated by ${seg.operating_airline}`}
                </div>
              </div>
            </div>
            <AmenityList seg={seg} />
          </div>
          {i < segments.length - 1 && (
            <div className="mx-4 sm:mx-0 sm:pl-[4.75rem] sm:pr-6 py-3 border-y border-slate-200/80 dark:border-white/10 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {segments[i + 1].departing_at && seg.arriving_at
                ? `${formatMinutes(Math.round((new Date(segments[i + 1].departing_at) - new Date(seg.arriving_at)) / 60000))} layover · `
                : "Layover · "}
              {seg.destination_city || seg.destination_name || seg.destination} ({seg.destination})
              {dayDiff(seg.arriving_at, segments[i + 1].departing_at) > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><AlertCircle size={13} /> Overnight layover</span>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** One labelled block inside the fare details panel. */
function DetailBlock({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/10 p-3.5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-2">
        <Icon size={14} className="text-sky-500 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">{children}</div>
    </div>
  );
}

function FareDetails({ offer, formatMoney }) {
  const [seats, setSeats] = useState({ loading: true, data: null, error: "" });
  const slices = offer.slices || [];
  const sliceName = (i) => (slices.length === 2 ? (i === 0 ? "Outbound" : "Return") : slices.length > 2 ? `Flight ${i + 1}` : "");

  useEffect(() => {
    let live = true;
    apiRequest(`/offers/${encodeURIComponent(offer.id)}/seats`)
      .then((data) => live && setSeats({ loading: false, data, error: "" }))
      .catch((err) => live && setSeats({ loading: false, data: null, error: err.message }));
    return () => { live = false; };
  }, [offer.id]);

  const seatSummary = () => {
    if (seats.loading) return <p className="text-slate-400">Checking the seat map…</p>;
    const included = slices.some((s) => s.advance_seat_selection && s.advance_seat_selection.allowed && s.advance_seat_selection.penalty === 0);
    if (!seats.data || !seats.data.supported) {
      return <p>{included ? "Seat selection is included with this fare." : "Seats can't be chosen online for this fare. Pick them with the airline after booking, or call our desk."}</p>;
    }
    const segs = seats.data.segments.filter((s) => s.available > 0);
    const free = segs.reduce((n, s) => n + s.free, 0);
    const prices = segs.flatMap((s) => (s.min_price != null ? [[s.min_price, s.currency], [s.max_price, s.currency]] : []));
    const [min] = prices.length ? prices.reduce((a, b) => (b[0] < a[0] ? b : a)) : [null];
    const [max] = prices.length ? prices.reduce((a, b) => (b[0] > a[0] ? b : a)) : [null];
    const currency = (prices[0] || [])[1] || offer.currency;
    return (
      <>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Seat selection available on {segs.length} of {seats.data.segments.length} flight{seats.data.segments.length > 1 ? "s" : ""}.</p>
        {free > 0 && <p>{free} seats free to choose.</p>}
        {min != null && <p>Paid seats from {formatMoney(min, currency)}{max > min ? ` to ${formatMoney(max, currency)}` : ""} per traveller.</p>}
        <p className="text-slate-400">Our travel desk assigns seats after booking.</p>
      </>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid={`fare-details-${offer.id}`}>
      <DetailBlock icon={Luggage} title="Baggage">
        {slices.map((s, i) => (
          <div key={i}>
            {sliceName(i) && <span className="font-semibold text-slate-800 dark:text-slate-200">{sliceName(i)}: </span>}
            {(s.segments || []).every((seg) => seg.baggage)
              ? (() => {
                const carry = Math.min(...s.segments.map((seg) => seg.baggage.carry_on));
                const checked = Math.min(...s.segments.map((seg) => seg.baggage.checked));
                return `${carry} carry-on bag${carry === 1 ? "" : "s"}, ${checked ? `${checked} checked bag${checked === 1 ? "" : "s"}` : "no checked bag"} per traveller`;
              })()
              : "Allowance not published, check with the airline"}
          </div>
        ))}
        <p className="text-slate-400">Extra bags are sold by the airline.</p>
      </DetailBlock>

      <DetailBlock icon={RefreshCcw} title="Changes & cancellation">
        <p>Date or flight change: <b className={ruleTone(offer.conditions?.change)}>{ruleText(offer.conditions?.change, formatMoney)}</b></p>
        <p>Cancellation refund: <b className={ruleTone(offer.conditions?.refund)}>{ruleText(offer.conditions?.refund, formatMoney)}</b></p>
        <p className="text-slate-400">Plus any fare difference on changes. For flights to or from the US booked 7+ days ahead, you can cancel free within 24 hours of booking.</p>
      </DetailBlock>

      <DetailBlock icon={Armchair} title="Seat selection">{seatSummary()}</DetailBlock>

      <DetailBlock icon={Utensils} title="Meals & onboard">
        <p>Meal service isn't published for this fare; long-haul flights normally include meals. Our desk can confirm: <a href={LEGAL.phoneHref} className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">{LEGAL.phone}</a>.</p>
      </DetailBlock>
    </div>
  );
}

/** Compact line for one direction: times, duration + route, stops. */
function SliceSummary({ slice }) {
  const extra = dayDiff(slice.departing_at, slice.arriving_at);
  const via = (slice.segments || []).slice(0, -1).map((s) => s.destination).join(", ");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-0.5 items-start">
      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
        {formatTime(slice.departing_at)} – {formatTime(slice.arriving_at)}
        {extra > 0 && <sup className="ml-0.5 text-[10px] text-orange-500 font-bold">+{extra}</sup>}
      </div>
      <div className="hidden sm:block">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatDuration(slice.duration)}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">{slice.origin}–{slice.destination}</div>
      </div>
      <div className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 sm:text-slate-800 sm:dark:text-slate-200 sm:font-semibold">
        <span className="sm:hidden">{slice.origin}–{slice.destination} · {formatDuration(slice.duration)} · </span>
        <span className={slice.stops === 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
          {slice.stops === 0 ? "Nonstop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`}
        </span>
        {via && <span className="sm:block sm:text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate"><span className="sm:hidden"> · </span>{via}</span>}
      </div>
    </div>
  );
}

function OfferRow({ offer, onSelect, formatMoney, currency, badges, emissionsAvg, open, onToggle, searchedCabin, only = null, onPick = null, showFare = true }) {
  const slices = offer.slices || [];
  // Round trips are chosen one direction at a time; `only` is the direction this row shows.
  const shown = only == null ? slices : [slices[only]];
  const segs = shown.flatMap((s) => s.segments || []);
  const airlines = [...new Set(segs.map((s) => s.airline).filter(Boolean))];
  const brand = [...new Set(slices.map((s) => s.fare_brand).filter(Boolean))].join(" / ");
  const bags = bagSummary(offer);
  const diff = offer.emissions_kg != null && emissionsAvg ? Math.round(((offer.emissions_kg - emissionsAvg) / emissionsAvg) * 100) : null;
  const tripLabel = slices.length === 2 ? "round trip" : slices.length > 2 ? "multi-city" : "one way";
  // Like Google's "⚠ Business Class": a flight sold in a different cabin from the one searched.
  const otherCabins = [...new Set(segs.filter((s) => s.cabin_class && s.cabin_class !== searchedCabin).map((s) => s.cabin_name || cabinLabel(s.cabin_class)))];
  const heading = only != null
    ? `${only === 0 ? "Departure" : "Return"} · ${formatDate(shown[0].departing_at)}`
    : slices.length === 1
    ? `Departure · ${formatDate(slices[0].departing_at)}`
    : slices.length === 2
      ? `Round trip · ${formatDate(slices[0].departing_at)} – ${formatDate(slices[1].departing_at)}`
      : `${slices.length} flights · from ${formatDate(slices[0] && slices[0].departing_at)}`;

  return (
    <article className={`transition-colors ${open ? "bg-sky-500/[0.03] dark:bg-white/[0.02]" : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"}`} data-testid={`offer-${offer.id}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onToggle(); } }}
        aria-expanded={open}
        className={`w-full text-left px-4 sm:px-6 py-4 flex items-start sm:items-center gap-3 sm:gap-5 cursor-pointer ${open ? "border-b border-slate-200/80 dark:border-white/10" : ""}`}
        data-testid={`offer-row-${offer.id}`}
      >
        <AirlineLogo src={offer.airline_logo} code={offer.airline_code} size={36} />

        <div className="flex-1 min-w-0">
          {open ? (
            <div className="space-y-1.5">
              <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">{heading}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{airlines.join(", ") || offer.airline}</span>
                {brand && <span>· {brand}</span>}
                {badges.map((b) => <RowBadge key={b} label={b} />)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_9rem] gap-x-4 gap-y-2 items-center">
              <div className="min-w-0 space-y-2.5">
                {shown.map((s, i) => (
                  <div key={i} data-testid="flight-slice">
                    {shown.length > 1 && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                        {slices.length === 2 ? (i === 0 ? "Outbound" : "Return") : `Flight ${i + 1}`}
                      </span>
                    )}
                    <SliceSummary slice={s} />
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{airlines.join(", ") || offer.airline}</span>
                  {brand && <span className="hidden sm:inline">· {brand}</span>}
                  {bags && <span className="hidden sm:inline">· {bags.carry_on} carry-on, {bags.checked ? `${bags.checked} checked bag` : "no checked bag"}</span>}
                  {otherCabins.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold"><AlertCircle size={12} /> {otherCabins.join(", ")}</span>
                  )}
                  {badges.map((b) => <RowBadge key={b} label={b} />)}
                </div>
              </div>
              {offer.emissions_kg != null && <Emissions kg={offer.emissions_kg} diff={diff} className="hidden lg:block" />}
            </div>
          )}
        </div>

        {open && offer.emissions_kg != null && <Emissions kg={offer.emissions_kg} diff={diff} className="hidden md:block text-right" />}

        {/* Price, with Select flight beside it (under it on phones), so a fare can be booked without expanding */}
        <div className="shrink-0 flex flex-col items-end gap-2 sm:flex-row-reverse sm:items-center sm:gap-4">
          <div className="text-right">
            <b className={`block text-base sm:text-lg font-black tabular-nums ${badges.includes("Cheapest") ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`} data-testid={`offer-price-${offer.id}`}>
              {formatMoney(offer.total, offer.currency)}
            </b>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{tripLabel}</span>
            {currency !== offer.currency && <span className="block text-[10px] text-slate-400 font-mono">≈ {offer.currency} {offer.total.toFixed(2)}</span>}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); (onPick || onSelect)(offer); }}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-9 sm:h-10 px-4 sm:px-5 rounded-full border border-sky-500/60 text-sky-600 dark:text-sky-300 text-xs sm:text-sm font-bold whitespace-nowrap hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors cursor-pointer"
            data-testid={`select-offer-${offer.id}`}
          >
            Select flight
          </button>
        </div>
        <ChevronDown size={20} className={`shrink-0 mt-1 sm:mt-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="animate-fade-in">
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {shown.map((s, i) => (
              <SliceTimeline key={i} slice={s} title={shown.length === 2 ? (i === 0 ? "Outbound" : "Return") : shown.length > 2 ? `Flight ${i + 1}` : ""} />
            ))}
          </div>
          <div className="px-4 sm:px-6 sm:pl-[4.75rem] pb-5 pt-4 space-y-3 border-t border-slate-200/80 dark:border-white/10">
            {showFare ? <FareDetails offer={offer} formatMoney={formatMoney} /> : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Baggage, change fees and seats for the whole trip are shown once you pick a return flight.</p>
            )}
            {offer.emissions_kg != null && (
              <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <Leaf size={13} className="text-emerald-500 shrink-0" />
                Emissions estimate: {offer.emissions_kg} kg CO₂e for this trip{diff != null ? ` (${diff > 0 ? "+" : ""}${diff}% vs. typical for this search)` : ""}.
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** The strictest of several slices' rules: not allowed anywhere wins, then the highest fee. */
function worstRule(rules) {
  const known = rules.filter(Boolean);
  if (!known.length) return null;
  if (known.some((r) => !r.allowed)) return { allowed: false };
  return known.reduce((a, b) => ((b.penalty ?? Infinity) > (a.penalty ?? Infinity) ? b : a));
}

/** One fare's perks as Google-style ✓ / ✗ / fee lines. */
function fareFeatures(o, formatMoney) {
  const fee = (r) => (r.penalty > 0 ? formatMoney(r.penalty, r.currency || o.currency) : null);
  const out = [];
  const seat = worstRule((o.slices || []).map((s) => s.advance_seat_selection));
  out.push(!seat ? ["info", "Seat choice with the airline after booking"]
    : !seat.allowed ? ["no", "No seat selection"] : seat.penalty === 0 ? ["yes", "Free seat selection"] : ["fee", "Seat selection for a fee"]);
  const board = worstRule((o.slices || []).map((s) => s.priority_boarding));
  out.push(!board ? ["info", "Boarding group set by the airline"]
    : board.allowed && board.penalty === 0 ? ["yes", "Priority boarding"] : ["no", "Standard boarding"]);
  const change = o.conditions?.change;
  out.push(!change ? ["info", "Change rules set by the airline"]
    : !change.allowed ? ["no", "No ticket changes"]
      : change.penalty === 0 ? ["yes", "Free change, possible fare difference"]
        : ["fee", fee(change) ? `Ticket changes for ${fee(change)}` : "Ticket changes for a fee"]);
  const refund = o.conditions?.refund;
  out.push(!refund ? ["info", "Refund rules set by the airline"]
    : !refund.allowed ? ["no", "No refunds"]
      : refund.penalty === 0 ? ["yes", "Full refunds"]
        : ["fee", fee(refund) ? `Refund minus ${fee(refund)} fee` : "Refunds for a fee"]);
  return out;
}

function FeatureLine({ kind, text }) {
  const icon = kind === "yes" ? <Check size={15} className="text-emerald-500" />
    : kind === "no" ? <X size={15} className="text-rose-500" />
      : <AlertCircle size={15} className={kind === "fee" ? "text-amber-500" : "text-slate-400"} />;
  return <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0">{icon}</span><span>{text}</span></li>;
}

/** Google Flights-style review of a chosen trip: its flights, baggage, every fare sold for them, and one Continue. */
function TripReview({ offer, options, route, tripLabel, cabin, travellers, formatMoney, currency, onBack, backLabel, onChangeDeparture, onSelect }) {
  const [openSlice, setOpenSlice] = useState(null);
  const [fareId, setFareId] = useState(offer.id);
  const fare = options.find((o) => o.id === fareId) || offer;
  const lowest = options.reduce((a, b) => (b.total < a.total ? b : a), offer);
  const slices = fare.slices || [];
  const bags = bagSummary(fare);
  const airlines = [...new Set(allSegments(offer).map((s) => s.airline).filter(Boolean))];
  const brandOf = (o) => [...new Set((o.slices || []).map((s) => s.fare_brand).filter(Boolean))].join(" / ") || "Standard fare";
  const sliceName = (i) => (slices.length === 1 ? "Departure" : slices.length === 2 ? (i === 0 ? "Departure" : "Return") : `Flight ${i + 1}`);
  const card = "liquid-glass-card !p-0 rounded-2xl border border-white/60 dark:border-white/10 overflow-hidden";
  const h3 = "text-lg font-bold text-slate-900 dark:text-white";

  return (
    <section className="animate-fade-in" data-testid="trip-review">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline min-h-[36px]" data-testid="review-back">
        <ChevronLeft size={16} /> {backLabel}
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white break-words">{route}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tripLabel} · {cabinLabel(cabin)} · {travellers} passenger{travellers > 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(lowest.total, lowest.currency)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Lowest total price</div>
        </div>
      </div>

      {/* Phones stack flights → fares → summary → details; desktop keeps the summary in a sticky right column. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-x-6 gap-y-8">
        <div className="min-w-0 space-y-8">
          <div>
            <h3 className={`${h3} mb-3`}>Selected flights</h3>
            <div className={`${card} divide-y divide-slate-200/70 dark:divide-white/10`} data-testid="selected-flights">
              {slices.map((s, i) => {
                const open = openSlice === i;
                const segAirlines = [...new Set((s.segments || []).map((g) => g.airline).filter(Boolean))].join(", ");
                return (
                  <div key={i}>
                    <div className="px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4">
                      {(() => {
                        // Same logo source as the result rows; another airline's return falls back to its code.
                        const code = s.segments?.[0]?.airline_code || offer.airline_code;
                        return <AirlineLogo src={code === offer.airline_code ? offer.airline_logo : ""} code={code} size={36} />;
                      })()}
                      <button type="button" onClick={() => setOpenSlice(open ? null : i)} aria-expanded={open} className="flex-1 min-w-0 text-left cursor-pointer">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-1">
                          {sliceName(i)} · {formatDate(s.departing_at)}
                        </div>
                        <SliceSummary slice={s} />
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{segAirlines}</div>
                      </button>
                      <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
                        <button type="button" onClick={() => setOpenSlice(open ? null : i)} aria-label={open ? "Hide flight details" : "Show flight details"} className="p-1 order-first sm:order-last">
                          <ChevronDown size={20} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                        <button type="button" onClick={i === 0 && onChangeDeparture ? onChangeDeparture : onBack} className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline" data-testid={`review-change-${i}`}>
                          Change
                        </button>
                      </div>
                    </div>
                    {open && <div className="border-t border-slate-200/80 dark:border-white/10 animate-fade-in"><SliceTimeline slice={s} title="" /></div>}
                  </div>
                );
              })}
            <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-white/[0.02]" data-testid="review-baggage">
              <span className="inline-flex items-center gap-2"><Luggage size={18} className="text-sky-500" />{!bags ? "Baggage not published" : bags.carry_on ? `${bags.carry_on} free carry-on` : "No free carry-on"}</span>
              {bags && <span className="inline-flex items-center gap-2"><Luggage size={18} className="text-orange-500" />{bags.checked ? `${bags.checked} checked bag${bags.checked > 1 ? "s" : ""} free` : "Checked bags for a fee"}</span>}
            </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Baggage for the {brandOf(fare)} fare, per traveller, for the whole trip. Bag fees may be higher at the airport.
              {fare.emissions_kg != null && <> Emissions estimate: {fare.emissions_kg} kg CO₂e.</>}
            </p>
          </div>

          <div>
            <h3 className={h3}>Booking options</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {options.length > 1
                ? `${options.length} fares ${airlines.join(", ")} sells for these flights, cheapest first. Pick one, then continue.`
                : `The fare ${airlines.join(", ")} sells for these flights.`}
            </p>
            {/* One full-width row per fare, so any number of fares lines up the same way. */}
            <div className={`${card} divide-y divide-slate-200/70 dark:divide-white/10`} role="radiogroup" aria-label="Fare" data-testid="booking-options">
              {options.map((o) => {
                const b = bagSummary(o);
                const active = fare.id === o.id;
                const lines = [
                  ...fareFeatures(o, formatMoney),
                  ...(b
                    ? [[b.carry_on ? "yes" : "fee", b.carry_on ? `${b.carry_on} free carry-on` : "Carry-on for a fee"],
                       [b.checked ? "yes" : "fee", b.checked ? `${b.checked > 1 ? `${b.checked} checked bags` : "1st checked bag"} free` : "Checked bag for a fee"]]
                    : [["info", "Baggage set by the airline"]]),
                ];
                return (
                  <button type="button" key={o.id} role="radio" aria-checked={active} onClick={() => setFareId(o.id)}
                    className={`w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 cursor-pointer transition-colors border-l-4 ${active ? "border-l-sky-500 bg-sky-500/[0.06]" : "border-l-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"}`}
                    data-testid={`booking-option-${o.id}`}>
                    <span className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-sky-500 bg-sky-500" : "border-slate-300 dark:border-white/30"}`}>
                      {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <b className="text-base text-slate-900 dark:text-white">{brandOf(o)}</b>
                          {o.id === lowest.id && options.length > 1 && <span className="ml-2 align-middle px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Lowest price</span>}
                        </div>
                        <div className="text-right shrink-0">
                          <b className="block text-base font-black tabular-nums text-slate-900 dark:text-white">{formatMoney(o.total, o.currency)}</b>
                          {o.id !== lowest.id && <span className="block text-[11px] text-slate-500">+{formatMoney(o.total - lowest.total, o.currency)}</span>}
                          {currency !== o.currency && <span className="block text-[10px] text-slate-400 font-mono">{o.currency} {o.total.toFixed(2)}</span>}
                        </div>
                      </div>
                      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
                        {lines.map(([k, t]) => <FeatureLine key={t} kind={k} text={t} />)}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* lg:mt-10 = the "Selected flights" heading plus its margin, so the card's top lines up with the flights card. */}
        <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-28 lg:mt-10" data-testid="trip-summary">
          <div className="liquid-glass-card !p-5 rounded-2xl border border-sky-400/40 shadow-xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Your trip</div>
            <ul className="mt-3 space-y-2.5">
              {slices.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Plane size={15} className={`mt-0.5 shrink-0 ${i === 1 && slices.length === 2 ? "text-orange-500 rotate-180" : "text-sky-500"}`} />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white">{s.origin} → {s.destination}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(s.departing_at)} · {formatTime(s.departing_at)} · {s.stops === 0 ? "Nonstop" : `${s.stops} stop${s.stops > 1 ? "s" : ""}`}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Fare</span>
              <b className="text-slate-900 dark:text-white text-right">{brandOf(fare)} · {cabinLabel(cabin)}</b>
            </div>
            {travellers > 1 && (
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Per traveller</span>
                <span className="tabular-nums text-slate-700 dark:text-slate-300">{formatMoney(fare.total / travellers, fare.currency)}</span>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Total{travellers > 1 ? ` · ${travellers} travellers` : ""}</span>
              <b className="text-2xl font-black tabular-nums text-slate-900 dark:text-white" data-testid="summary-total">{formatMoney(fare.total, fare.currency)}</b>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Includes airline taxes and our service fee.</p>
            <button type="button" onClick={() => onSelect(fare)}
              className="mt-4 w-full h-12 spatial-btn-primary rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              data-testid={`select-offer-${fare.id}`}>
              Continue to traveller details <ArrowRight size={16} />
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck size={13} className="text-sky-500 shrink-0" /> You'll review everything before paying.
            </p>
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <h3 className={`${h3} mb-3`}>Fare details · {brandOf(fare)}</h3>
          <FareDetails key={fare.id} offer={fare} formatMoney={formatMoney} />
        </div>
      </div>
    </section>
  );
}

function RowBadge({ label }) {
  const tone = label === "Cheapest" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : label === "Best" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tone}`}>{label}</span>;
}

function Emissions({ kg, diff, className = "" }) {
  return (
    <div className={`text-sm ${className}`}>
      <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{kg} kg CO₂e</div>
      {diff != null && (
        <span className={`inline-block mt-0.5 text-[11px] font-semibold rounded px-1.5 ${diff <= -5 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
          {diff <= -5 || diff >= 5 ? `${diff > 0 ? "+" : ""}${diff}% emissions` : "Avg emissions"}
        </span>
      )}
    </div>
  );
}

/** A Google Flights-style filter chip: a pill that opens its own panel (a bottom sheet on phones). */
function FilterChip({ label, active, onClear, children, testid }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sheetRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !(sheetRef.current && sheetRef.current.contains(e.target))) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid={testid}
        className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
          active
            ? "bg-sky-500/15 border-sky-400/60 text-sky-700 dark:text-sky-300"
            : "border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
        }`}
      >
        {label}
        {active && onClear ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClear(); } }}
            className="-mr-1 rounded-full p-0.5 hover:bg-sky-500/20"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (() => {
        const panel = (
          <div ref={sheetRef} className="fixed inset-x-0 bottom-0 z-[10001] max-h-[75vh] overflow-y-auto rounded-t-3xl p-5 pb-8 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80 sm:z-[61] sm:rounded-2xl sm:p-4 sm:pb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl animate-fade-in" role="dialog" aria-label={label}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{label}</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {children}
          </div>
        );
        // Desktop: a dropdown under the chip. Phones: a bottom sheet in <body>, above the floating call pill (z 9990).
        if (window.matchMedia("(min-width: 640px)").matches) return panel;
        return createPortal(
          <div className={document.querySelector(".app.dark") ? "dark" : ""}>
            <div className="fixed inset-0 z-[10000] bg-slate-950/50" onClick={() => setOpen(false)} aria-hidden="true" />
            {panel}
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}

const optionBtn = (active) =>
  `w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between cursor-pointer transition-colors ${
    active ? "bg-sky-500 text-white" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
  }`;
const checkRow = "flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-semibold text-slate-700 dark:text-slate-300";

const NO_FILTERS = { stops: "all", airlines: [], bags: { carry: false, checked: false }, maxPrice: null, times: [], maxMinutes: null, lowEmissions: false, change: false, refund: false };

export function SearchResultsView({ state, onSelect, onBackToSearch, onSearch, searchForm }) {
  const { formatMoney, currency } = useCurrency();
  const { loading, offers, error, testMode } = state;

  const [f, setF] = useState(NO_FILTERS);
  const [tab, setTab] = useState("best");
  const [sortBy, setSortBy] = useState("default");
  const [openId, setOpenId] = useState(null);
  const [outKey, setOutKey] = useState(null); // round trips: the departing flight picked in step 1
  const [reviewId, setReviewId] = useState(null); // round trips: the pairing picked in step 2, under review
  const [showCount, setShowCount] = useState(15);
  const [isModifying, setIsModifying] = useState(false);
  const form = searchForm || {};
  const cabin = form.cabin || "economy";
  const travellers = Number(form.adults || 1);
  const set = (patch) => { setF((prev) => ({ ...prev, ...patch })); setShowCount(15); };

  // New results start unfiltered and collapsed.
  useEffect(() => { setF(NO_FILTERS); setOpenId(null); setShowCount(15); setOutKey(null); setReviewId(null); }, [offers]);

  // Synthetic Duffel Airways offers never reach travellers.
  const realOffers = useMemo(() => (offers || []).filter((o) => {
    const name = (o.airline || "").toLowerCase();
    const code = (o.airline_code || "").toUpperCase();
    const synthetic = allSegments(o).some((seg) =>
      (seg.airline || "").toLowerCase().includes("duffel") || (seg.airline_code || "").toUpperCase() === "ZZ" ||
      (seg.operating_airline || "").toLowerCase().includes("duffel") || (seg.operating_airline_code || "").toUpperCase() === "ZZ");
    return code !== "ZZ" && !name.includes("duffel") && !synthetic;
  }), [offers]);

  const stats = useMemo(() => {
    const prices = realOffers.map((o) => o.total);
    const minutes = realOffers.map(offerMinutes);
    const emissions = realOffers.map((o) => o.emissions_kg).filter((x) => x != null);
    const airlines = new Map();
    for (const o of realOffers) {
      const prev = airlines.get(o.airline_code);
      if (!prev || o.total < prev.min) airlines.set(o.airline_code, { code: o.airline_code, name: o.airline, logo: o.airline_logo, min: o.total, currency: o.currency });
    }
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      minMinutes: minutes.length ? Math.min(...minutes) : 0,
      maxMinutes: minutes.length ? Math.max(...minutes) : 0,
      emissionsAvg: median(emissions),
      airlines: [...airlines.values()].sort((a, b) => a.min - b.min),
      currency: (realOffers[0] || {}).currency || "USD",
    };
  }, [realOffers]);

  // "Best" balances price against total travel time and stops, like Google's ranking by price and convenience.
  const bestScore = (o) => o.total / (stats.minPrice || 1) + (offerMinutes(o) / (stats.minMinutes || 1)) * 0.7 + o.slices.reduce((n, s) => n + s.stops, 0) * 0.25;

  const roundTrip = form.trip_type === "round_trip" && realOffers.length > 0 && realOffers.every((o) => (o.slices || []).length === 2);
  const ti = roundTrip && outKey ? 1 : 0; // the direction whose times the Times filter and time sorts use

  const filteredOffers = useMemo(() => {
    let list = realOffers;
    if (f.stops === "direct") list = list.filter((o) => o.slices.every((s) => s.stops === 0));
    else if (f.stops === "one_stop") list = list.filter((o) => o.slices.every((s) => s.stops <= 1));
    if (f.airlines.length) list = list.filter((o) => f.airlines.includes(o.airline_code));
    if (f.bags.carry) list = list.filter((o) => (bagSummary(o) || {}).carry_on > 0);
    if (f.bags.checked) list = list.filter((o) => (bagSummary(o) || {}).checked > 0);
    if (f.maxPrice != null) list = list.filter((o) => o.total <= f.maxPrice);
    if (f.times.length) {
      list = list.filter((o) => {
        const h = new Date(o.slices[ti]?.departing_at).getHours();
        return TIME_WINDOWS.some(([key, , , from, to]) => f.times.includes(key) && h >= from && h < to);
      });
    }
    if (f.maxMinutes != null) list = list.filter((o) => offerMinutes(o) <= f.maxMinutes);
    if (f.lowEmissions && stats.emissionsAvg) list = list.filter((o) => o.emissions_kg != null && o.emissions_kg < stats.emissionsAvg);
    if (f.change) list = list.filter((o) => o.conditions?.change?.allowed);
    if (f.refund) list = list.filter((o) => o.conditions?.refund?.allowed);
    const sorters = {
      best: (a, b) => bestScore(a) - bestScore(b),
      price: (a, b) => a.total - b.total,
      duration: (a, b) => offerMinutes(a) - offerMinutes(b),
      departure: (a, b) => new Date(a.slices[ti]?.departing_at) - new Date(b.slices[ti]?.departing_at),
      arrival: (a, b) => new Date(a.slices[ti]?.arriving_at) - new Date(b.slices[ti]?.arriving_at),
      emissions: (a, b) => (a.emissions_kg ?? Infinity) - (b.emissions_kg ?? Infinity),
    };
    const key = sortBy === "default" ? (tab === "cheapest" ? "price" : "best") : sortBy;
    return [...list].sort(sorters[key]);
  }, [realOffers, f, sortBy, tab, stats, ti]); // eslint-disable-line react-hooks/exhaustive-deps

  // Round trips, like Google Flights: step 1 lists each departing flight once (at its best-ranked pairing),
  // step 2 lists the returns Duffel sells with the chosen departure, each at its real round-trip total.
  const step = roundTrip ? (outKey ? "return" : "departure") : "single";
  const listed = useMemo(() => {
    if (step === "departure") {
      const seen = new Set();
      return filteredOffers.filter((o) => { const k = sliceKey(o.slices[0]); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    if (step === "return") return filteredOffers.filter((o) => sliceKey(o.slices[0]) === outKey);
    return filteredOffers;
  }, [filteredOffers, step, outKey]);
  const pickedOutbound = outKey ? realOffers.find((o) => sliceKey(o.slices[0]) === outKey) : null;
  const pickDeparture = (o) => { setOutKey(sliceKey(o.slices[0])); setOpenId(null); setShowCount(15); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const pickReturn = (o) => { setReviewId(o.id); setOpenId(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reviewOffer = reviewId ? realOffers.find((o) => o.id === reviewId) : null;
  // Every fare (Basic, Classic, Flex…) Duffel sold for exactly these flights.
  const fareOptions = useMemo(() => {
    if (!reviewOffer) return [];
    const keys = reviewOffer.slices.map(sliceKey).join("|");
    return realOffers.filter((o) => o.slices.map(sliceKey).join("|") === keys).sort((x, y) => x.total - y.total);
  }, [reviewOffer, realOffers]);

  // Row badges are computed over everything shown, so "Cheapest" is the cheapest you can see.
  const badgeFor = useMemo(() => {
    if (!listed.length) return {};
    const cheapest = listed.reduce((a, b) => (b.total < a.total ? b : a));
    const fastest = listed.reduce((a, b) => (offerMinutes(b) < offerMinutes(a) ? b : a));
    const best = listed.reduce((a, b) => (bestScore(b) < bestScore(a) ? b : a));
    const out = {};
    const add = (o, label) => { out[o.id] = [...(out[o.id] || []), label]; };
    add(best, "Best");
    add(cheapest, "Cheapest");
    if (fastest.id !== cheapest.id) add(fastest, "Fastest");
    return out;
  }, [listed]); // eslint-disable-line react-hooks/exhaustive-deps

  const cheapestShown = listed.length ? Math.min(...listed.map((o) => o.total)) : null;
  const filtersActive = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

  const rerun = (patch) => { if (!loading && onSearch) onSearch({ ...form, ...patch }); };
  const isMulti = form.trip_type === "multi_city";
  const today = todayYmd();

  const place = (code) => {
    const a = AIRPORTS.find((x) => x.code === code);
    return a ? `${a.city} (${code})` : code || "";
  };
  const route = isMulti
    ? (form.slices || []).map((s) => s.origin).concat((form.slices || []).slice(-1).map((s) => s.destination)).join(" → ")
    : `${place(form.origin)} ${form.trip_type === "round_trip" ? "⇄" : "→"} ${place(form.destination)}`;

  const DateNudge = ({ field, label, minDate, maxDate }) => {
    const value = form[field];
    if (!value) return null;
    const prev = shiftDate(value, -1);
    const next = shiftDate(value, 1);
    return (
      <div className="flex items-center gap-1 min-w-0" data-testid={`date-nudge-${field}`}>
        <Calendar size={15} className={`shrink-0 ${field === "return_date" ? "text-orange-500" : "text-sky-500"}`} />
        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap px-1" title={label}>{formatDate(`${value}T12:00:00`)}</span>
        <button type="button" aria-label={`Previous day for ${label}`} disabled={loading || prev < (minDate || today)} onClick={() => rerun({ [field]: prev })}
          className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={16} />
        </button>
        <button type="button" aria-label={`Next day for ${label}`} disabled={loading || (maxDate && next > maxDate)} onClick={() => rerun({ [field]: next })}
          className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  const selectCls = "bg-transparent font-bold text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none cursor-pointer py-1 pr-1 disabled:cursor-wait";
  const timesLabel = f.times.length ? TIME_WINDOWS.filter(([k]) => f.times.includes(k)).map(([, l]) => l).join(", ") : "Times";

  return (
    <main className="min-h-screen pt-24 sm:pt-28 pb-20 px-4 sm:px-8 max-w-6xl mx-auto" data-testid="search-results-page">
      {/* Search bar: trip, travellers, cabin and date nudges, like the top of Google Flights */}
      <section className="liquid-glass rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-3 sm:p-4 mb-4 relative z-30" data-testid="results-search-bar">
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 px-1">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            <ArrowUpDown size={14} className="text-sky-500 rotate-90" />
            {isMulti ? "Multi-city" : form.trip_type === "round_trip" ? "Round trip" : "One way"}
          </span>
          <label className="inline-flex items-center gap-1.5 text-slate-500" data-testid="results-travellers">
            <Users size={14} className="text-sky-500" />
            <span className="sr-only">Travellers</span>
            <select value={travellers} disabled={loading} onChange={(e) => rerun({ adults: Number(e.target.value) })} className={selectCls}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? "s" : ""}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-slate-500" data-testid="cabin-switcher">
            <Sparkles size={14} className="text-orange-500" />
            <span className="sr-only">Cabin class</span>
            <select value={cabin} disabled={loading} onChange={(e) => rerun({ cabin: e.target.value })} className={selectCls} data-testid="cabin-select">
              {CABINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <button
            className="ml-auto spatial-btn-secondary px-4 h-9 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            data-testid="results-back-button"
            onClick={() => setIsModifying((prev) => !prev)}
            aria-expanded={isModifying}
          >
            <span className="hidden sm:inline">{isModifying ? "Hide search" : "Change search"}</span>
            <span className="sr-only sm:hidden">{isModifying ? "Hide search" : "Change search"}</span>
            {isModifying ? <X size={14} /> : <SlidersHorizontal size={14} />}
          </button>
        </div>

        {!isModifying && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button type="button" onClick={() => setIsModifying(true)} className="flex items-center gap-2 h-12 px-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-left text-sm font-bold text-slate-900 dark:text-white hover:border-sky-400 transition-colors min-w-0">
              <Plane size={15} className="text-sky-500 shrink-0 -rotate-45" />
              <span className="truncate">{route}</span>
            </button>
            {!isMulti && (
              <div className="flex items-center justify-between md:justify-start gap-3 h-12 px-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10">
                <DateNudge field="departure_date" label="departure date" maxDate={form.trip_type === "round_trip" ? form.return_date : null} />
                {form.trip_type === "round_trip" && (
                  <>
                    <span className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                    <DateNudge field="return_date" label="return date" minDate={form.departure_date} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {isModifying && (
          <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10 animate-fade-in" data-testid="modify-search-panel">
            <FlightSearchBox
              initial={searchForm}
              embedded
              onSearch={(newForm) => {
                if (onSearch) onSearch(newForm);
                else if (onBackToSearch) onBackToSearch();
                setIsModifying(false);
              }}
            />
          </div>
        )}
      </section>

      {reviewOffer ? (
        <TripReview
          offer={reviewOffer}
          options={fareOptions}
          route={route}
          tripLabel={isMulti ? "Multi-city" : roundTrip ? "Round trip" : "One way"}
          cabin={cabin}
          travellers={travellers}
          formatMoney={formatMoney}
          currency={currency}
          onBack={() => setReviewId(null)}
          backLabel={roundTrip ? "Back to returning flights" : "Back to all flights"}
          onChangeDeparture={roundTrip ? () => { setReviewId(null); setOutKey(null); } : null}
          onSelect={onSelect}
        />
      ) : (<>
      {/* Filter chips; on phones they scroll sideways and open as bottom sheets */}
      {realOffers.length > 0 && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4 flex items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap sm:overflow-visible" data-testid="results-filters">
          {filtersActive && (
            <button type="button" onClick={() => set(NO_FILTERS)} className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10" data-testid="clear-filters">
              <X size={14} /> Clear all
            </button>
          )}
          <FilterChip label={f.stops === "direct" ? "Nonstop only" : f.stops === "one_stop" ? "1 stop or fewer" : "Stops"} active={f.stops !== "all"} onClear={() => set({ stops: "all" })} testid="filter-stops">
            <div className="space-y-1">
              {[["all", "Any number of stops"], ["direct", "Nonstop only"], ["one_stop", "1 stop or fewer"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set({ stops: v })} className={optionBtn(f.stops === v)}>
                  <span>{l}</span>{f.stops === v && <Check size={15} />}
                </button>
              ))}
            </div>
          </FilterChip>

          {stats.airlines.length > 1 && (
            <FilterChip label={f.airlines.length ? `Airlines · ${f.airlines.length}` : "Airlines"} active={f.airlines.length > 0} onClear={() => set({ airlines: [] })} testid="filter-airlines">
              <div className="space-y-0.5" data-testid="airline-filter">
                {stats.airlines.map((a) => (
                  <label key={a.code} className={checkRow}>
                    <input type="checkbox" className="w-4 h-4 accent-sky-500 shrink-0" checked={f.airlines.includes(a.code)} data-testid={`airline-filter-${a.code}`}
                      onChange={() => set({ airlines: f.airlines.includes(a.code) ? f.airlines.filter((c) => c !== a.code) : [...f.airlines, a.code] })} />
                    <AirlineLogo src={a.logo} code={a.code} size={22} />
                    <span className="flex-1 min-w-0 truncate">{a.name}</span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 font-medium">{formatMoney(a.min, a.currency)}</span>
                  </label>
                ))}
              </div>
            </FilterChip>
          )}

          <FilterChip label="Bags" active={f.bags.carry || f.bags.checked} onClear={() => set({ bags: { carry: false, checked: false } })} testid="filter-bags">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Show fares that include, per traveller:</p>
            {[["carry", "A carry-on bag"], ["checked", "A checked bag"]].map(([k, l]) => (
              <label key={k} className={checkRow}>
                <input type="checkbox" className="w-4 h-4 accent-sky-500" checked={f.bags[k]} onChange={() => set({ bags: { ...f.bags, [k]: !f.bags[k] } })} data-testid={`bags-filter-${k}`} />
                {l}
              </label>
            ))}
          </FilterChip>

          {stats.maxPrice > stats.minPrice && (
            <FilterChip label={f.maxPrice != null ? `Up to ${formatMoney(f.maxPrice, stats.currency)}` : "Price"} active={f.maxPrice != null} onClear={() => set({ maxPrice: null })} testid="filter-price">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {f.maxPrice != null ? `Up to ${formatMoney(f.maxPrice, stats.currency)}` : "All prices"}
              </div>
              <input type="range" className="w-full accent-sky-500" min={Math.floor(stats.minPrice)} max={Math.ceil(stats.maxPrice)} step="1"
                value={f.maxPrice ?? Math.ceil(stats.maxPrice)} aria-label="Maximum price"
                onChange={(e) => { const v = Number(e.target.value); set({ maxPrice: v >= Math.ceil(stats.maxPrice) ? null : v }); }} />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>{formatMoney(stats.minPrice, stats.currency)}</span><span>{formatMoney(stats.maxPrice, stats.currency)}</span>
              </div>
            </FilterChip>
          )}

          <FilterChip label={timesLabel} active={f.times.length > 0} onClear={() => set({ times: [] })} testid="filter-times">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Departure time{form.trip_type === "round_trip" ? " of the outbound flight" : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_WINDOWS.map(([k, l, range]) => (
                <button key={k} type="button" onClick={() => set({ times: f.times.includes(k) ? f.times.filter((t) => t !== k) : [...f.times, k] })}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${f.times.includes(k) ? "border-sky-400 bg-sky-500/10" : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{l}</span>
                  <span className="block text-[11px] text-slate-500">{range}</span>
                </button>
              ))}
            </div>
          </FilterChip>

          {stats.emissionsAvg != null && (
            <FilterChip label="Emissions" active={f.lowEmissions} onClear={() => set({ lowEmissions: false })} testid="filter-emissions">
              <label className={checkRow}>
                <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={f.lowEmissions} onChange={() => set({ lowEmissions: !f.lowEmissions })} />
                Less emissions only
              </label>
              <p className="text-[11px] text-slate-500 mt-1 px-2">Below the typical {Math.round(stats.emissionsAvg)} kg CO₂e for this search.</p>
            </FilterChip>
          )}

          {stats.maxMinutes > stats.minMinutes && (
            <FilterChip label={f.maxMinutes != null ? `Under ${formatMinutes(f.maxMinutes)}` : "Duration"} active={f.maxMinutes != null} onClear={() => set({ maxMinutes: null })} testid="filter-duration">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {f.maxMinutes != null ? `Under ${formatMinutes(f.maxMinutes)} total travel` : "Any duration"}
              </div>
              <input type="range" className="w-full accent-sky-500" min={stats.minMinutes} max={stats.maxMinutes} step="15"
                value={f.maxMinutes ?? stats.maxMinutes} aria-label="Maximum travel time"
                onChange={(e) => { const v = Number(e.target.value); set({ maxMinutes: v >= stats.maxMinutes ? null : v }); }} />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>{formatMinutes(stats.minMinutes)}</span><span>{formatMinutes(stats.maxMinutes)}</span>
              </div>
            </FilterChip>
          )}

          <FilterChip label="Flexibility" active={f.change || f.refund} onClear={() => set({ change: false, refund: false })} testid="filter-flexibility">
            {[["change", "Changeable tickets"], ["refund", "Refundable tickets"]].map(([k, l]) => (
              <label key={k} className={checkRow}>
                <input type="checkbox" className="w-4 h-4 accent-sky-500" checked={f[k]} onChange={() => set({ [k]: !f[k] })} data-testid={`flex-filter-${k}`} />
                {l}
              </label>
            ))}
          </FilterChip>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm font-semibold" data-testid="results-error">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Best / Cheapest tabs */}
      {!loading && realOffers.length > 0 && (
        <div className="grid grid-cols-2 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden mb-5 liquid-glass" role="tablist" aria-label="Rank flights by">
          {[["best", "Best", null], ["cheapest", "Cheapest", cheapestShown]].map(([key, label, price]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setTab(key); setSortBy("default"); }}
              data-testid={`tab-${key}`}
              className={`py-3 sm:py-3.5 text-sm sm:text-base font-bold transition-colors border-b-[3px] ${
                tab === key ? "bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white" : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/5"
              }`}
            >
              {label}
              {price != null && <span className="block sm:inline sm:ml-2 text-xs sm:text-base text-emerald-600 dark:text-emerald-400 font-black">from {formatMoney(price, stats.currency)}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Heading row */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white" data-testid="results-heading">
            {loading ? "Finding the best available fares…"
              : step === "departure" ? "Top departing flights"
                : step === "return" ? "Returning flights"
                  : `${listed.length} flight${listed.length === 1 ? "" : "s"} available`}
          </h2>
          {!loading && listed.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-3xl" data-testid="fare-disclosure">
              {tab === "best" && sortBy === "default" ? "Ranked on price and convenience. " : ""}
              {step === "departure" ? "Prices are round trip: pick your departure, then your return. " : ""}
              Prices are the total for {travellers === 1 ? "1 adult" : `all ${travellers} travellers`} and include airline taxes and our service fee. Airlines may charge extra for checked bags, seats and other services; open a flight for its baggage allowance and fees.
            </p>
          )}
        </div>
        {!loading && listed.length > 1 && (
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <ArrowUpDown size={14} />
            <span className="sr-only">Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent font-bold focus:outline-none cursor-pointer" data-testid="results-sort">
              <option value="default">Sorted by {tab === "cheapest" ? "price" : "top flights"}</option>
              <option value="price">Price</option>
              <option value="departure">Departure time</option>
              <option value="arrival">Arrival time</option>
              <option value="duration">Duration</option>
              <option value="emissions">Emissions</option>
            </select>
          </label>
        )}
      </div>

      {testMode && !loading && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" data-testid="test-mode-banner">
          <AlertCircle size={18} className="mt-px shrink-0" />
          <span><b>Test fares.</b> The flight service is connected with a Duffel test key, so these flights, times and prices are sample data, not real availability.</span>
        </div>
      )}

      <div data-testid="offer-list">
        {loading && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-200 dark:divide-white/10">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 flex items-center gap-4 animate-pulse bg-white dark:bg-slate-900/60">
                {/* Placeholder rows so the loading state reads as "flights coming", not an empty box. */}
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="h-6 w-16 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && listed.length === 0 && (
          <div className="liquid-glass rounded-3xl p-8 sm:p-12 text-center text-slate-600 dark:text-slate-300" data-testid="results-empty">
            <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-4">
              <Plane size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No flights available</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              {filtersActive && realOffers.length ? "No flights match these filters. Clear them to see every fare." : "Try selecting different airports or flexible travel dates to see available airline routes."}
            </p>
            <button
              type="button"
              onClick={() => (filtersActive && realOffers.length ? set(NO_FILTERS) : setIsModifying(true))}
              className="mt-6 spatial-btn-primary px-6 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>{filtersActive && realOffers.length ? "Clear filters" : "Change search"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {!loading && step === "return" && pickedOutbound && (
          <div className="mb-4" data-testid="picked-departure">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Departing flight</span>
              <button type="button" onClick={() => { setOutKey(null); setReviewId(null); setOpenId(null); }} className="text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline min-h-[36px]" data-testid="change-departure">
                Change
              </button>
            </div>
            <div className="liquid-glass-card !p-0 rounded-2xl border border-sky-400/40 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-5">
                <AirlineLogo src={pickedOutbound.airline_logo} code={pickedOutbound.airline_code} size={36} />
                <div className="flex-1 min-w-0">
                  <SliceSummary slice={pickedOutbound.slices[0]} />
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {[...new Set((pickedOutbound.slices[0].segments || []).map((s) => s.airline).filter(Boolean))].join(", ")} · {formatDate(pickedOutbound.slices[0].departing_at)}
                  </div>
                </div>
                <Check size={20} className="text-sky-500 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {!loading && listed.length > 0 && (
          <div className="liquid-glass-card !p-0 rounded-2xl border border-white/60 dark:border-white/10 overflow-hidden divide-y divide-slate-200/70 dark:divide-white/10">
            {listed.slice(0, showCount).map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                onSelect={onSelect}
                formatMoney={formatMoney}
                currency={currency}
                badges={badgeFor[offer.id] || []}
                emissionsAvg={stats.emissionsAvg}
                open={openId === offer.id}
                searchedCabin={cabin}
                only={step === "departure" ? 0 : step === "return" ? 1 : null}
                onPick={step === "departure" ? pickDeparture : pickReturn}
                showFare={step !== "departure"}
                onToggle={() => setOpenId((id) => (id === offer.id ? null : offer.id))}
              />
            ))}
          </div>
        )}

        {!loading && listed.length > showCount && (
          <button
            type="button"
            onClick={() => setShowCount((n) => n + 15)}
            className="mt-4 w-full h-12 rounded-2xl border border-slate-200/80 dark:border-white/10 text-sm font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/5 inline-flex items-center justify-center gap-2"
            data-testid="show-more-flights"
          >
            <ChevronDown size={16} /> Show {Math.min(15, listed.length - showCount)} more flights
          </button>
        )}

        {!loading && listed.length > 0 && (
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck size={13} className="text-sky-500" /> Live airline fares. Prices are per booking for all travellers and include taxes and our service fee.
          </p>
        )}
      </div>
      </>)}
    </main>
  );
}

export default SearchResultsView;
