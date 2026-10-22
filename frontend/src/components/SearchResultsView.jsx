import { FlightSearchBox } from "./FlightSearchBox";
import { useCurrency } from "@/context/CurrencyContext";
import React, { useState, useMemo } from "react";
import { 
  ArrowRight, Plane, Clock, Filter, SlidersHorizontal, 
  ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Sparkles, Check, X
} from "lucide-react";

function formatTime(iso) { 
  try { return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; } 
  catch { return ""; } 
}

function formatDate(iso) { 
  try { return iso ? new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : ""; } 
  catch { return ""; } 
}

function formatDuration(iso) {
  if (!iso) return "";
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(iso);
  if (!m) return iso;
  const hours = Number(m[1] || 0) * 24 + Number(m[2] || 0);
  return `${hours ? `${hours}h ` : ""}${m[3] ? `${m[3]}m` : ""}`.trim();
}

export function AirlineLogo({ src, code, size = 32 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div 
        className="rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono flex items-center justify-center text-xs shadow-inner"
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
      className="rounded-xl object-contain bg-white p-1 border border-slate-200/50 shadow-sm"
      onError={() => setFailed(true)} 
      loading="lazy" 
    />
  );
}

export function FlightSlice({ slice }) {
  const [expanded, setExpanded] = useState(false);
  const segments = slice.segments || [];

  return (
    <div className="py-3 border-b border-slate-200/50 dark:border-white/10 last:border-b-0" data-testid="flight-slice">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Origin Departure */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left">
            <span className="text-base sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white block leading-none">
              {formatTime(slice.departing_at)}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {slice.origin}
            </span>
          </div>
        </div>

        {/* Flight Line & Stops Indicator */}
        <div className="flex-1 min-w-0 max-w-xs sm:px-2 flex flex-col items-center">
          <div className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>{formatDuration(slice.duration)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              slice.stops === 0 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              {slice.stops === 0 ? "Nonstop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="w-full relative flex items-center">
            <div className="w-full h-0.5 bg-gradient-to-r from-sky-500 via-sky-400 to-orange-500 rounded-full" />
            <Plane size={14} className="absolute right-0 text-orange-500 rotate-90" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">{formatDate(slice.departing_at)}</span>
        </div>

        {/* Destination Arrival */}
        <div className="text-right shrink-0">
          <span className="text-base sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white block leading-none">
            {formatTime(slice.arriving_at)}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {slice.destination}
          </span>
        </div>
      </div>

      {/* Segments Summary / Carriers */}
      {segments.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            {segments.map((s, idx) => (
              <span key={`${s.airline_code}-${s.flight_number}-${idx}`} className="flex items-center gap-1.5 font-medium">
                <AirlineLogo src={s.airline_logo} code={s.airline_code} size={18} />
                <span>{s.airline_code} {s.flight_number}</span>
              </span>
            ))}
          </div>
          
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{expanded ? "Hide details" : "Flight details"}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      )}

      {/* Expandable Flight Segments Drawer */}
      {expanded && segments.length > 0 && (
        <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 space-y-3 animate-fade-in text-xs">
          {segments.map((seg, sIdx) => (
            <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/40 dark:border-white/5 pb-2 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2">
                <AirlineLogo src={seg.airline_logo} code={seg.airline_code} size={22} />
                <div>
                  <b className="text-slate-800 dark:text-slate-200">{seg.airline_code} {seg.flight_number}</b>
                  <span className="text-slate-500 block text-[11px]">{seg.origin} → {seg.destination}</span>
                </div>
              </div>
              <div className="text-right text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                <span>Depart: {formatTime(seg.departing_at)} · Arrive: {formatTime(seg.arriving_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchResultsView({ state, onSelect, onBackToSearch, onSearch, searchForm }) {
  const { formatMoney, currency } = useCurrency();
  const { loading, offers, error, count, testMode } = state;

  // Filter & Search Modification state
  const [maxStops, setMaxStops] = useState("all");
  const [sortBy, setSortBy] = useState("price_asc");
  const [filtersOpen, setFiltersOpen] = useState(false); // phones only; always open on desktop
  const [isModifying, setIsModifying] = useState(false);

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let list = [...(offers || [])];

    // Exclude synthetic Duffel Airways offers
    list = list.filter((o) => {
      const name = (o.airline || "").toLowerCase();
      const code = (o.airline_code || "").toUpperCase();
      const hasDuffelSlice = (o.slices || []).some((s) =>
        (s.segments || []).some(
          (seg) =>
            (seg.airline || "").toLowerCase().includes("duffel") ||
            (seg.airline_code || "").toUpperCase() === "ZZ" ||
            (seg.operating_airline || "").toLowerCase().includes("duffel") ||
            (seg.operating_airline_code || "").toUpperCase() === "ZZ"
        )
      );
      return code !== "ZZ" && !name.includes("duffel") && !hasDuffelSlice;
    });

    if (maxStops === "direct") {
      list = list.filter(o => o.slices.every(s => s.stops === 0));
    } else if (maxStops === "one_stop") {
      list = list.filter(o => o.slices.every(s => s.stops <= 1));
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => a.total - b.total);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.total - a.total);
    }

    return list;
  }, [offers, maxStops, sortBy]);

  return (
    <main className="min-h-screen pt-24 sm:pt-28 pb-20 px-4 sm:px-8 max-w-7xl mx-auto" data-testid="search-results-page">
      {/* Head Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-500 block mb-1">
            FLIGHT SEARCH RESULTS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white" data-testid="results-heading">
            {loading ? "Finding the best available fares…" : `${filteredOffers.length} flights available`}
          </h2>
        </div>

        <button
          className="spatial-btn-secondary px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-all"
          data-testid="results-back-button"
          onClick={() => setIsModifying((prev) => !prev)}
        >
          <span>{isModifying ? "Hide Search" : "Modify Search"}</span>
          {isModifying ? <ChevronUp size={14} /> : <SlidersHorizontal size={14} />}
        </button>
      </div>

      {/* Collapsible Modify Search Widget */}
      {isModifying && (
        <div className="mb-8 p-5 sm:p-6 rounded-3xl liquid-glass border border-sky-500/20 shadow-2xl animate-fade-in relative" data-testid="modify-search-panel">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modify Flight Search</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsModifying(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <X size={14} />
              <span>Close</span>
            </button>
          </div>
          <FlightSearchBox
            initial={searchForm}
            onSearch={(newForm) => {
              if (onSearch) {
                onSearch(newForm);
              } else if (onBackToSearch) {
                onBackToSearch();
              }
              setIsModifying(false);
            }}
          />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm font-semibold" data-testid="results-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Filters Sidebar + Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 liquid-glass rounded-2xl p-4 sm:p-5 border border-white/50 dark:border-white/10 shadow-lg">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className="w-full flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white lg:pb-3 lg:border-b border-slate-200/50 dark:border-white/10 lg:cursor-default"
            data-testid="results-filters-toggle"
          >
            <SlidersHorizontal size={16} className="text-sky-500" />
            <span>Refine Results</span>
            <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform lg:hidden ${filtersOpen ? "rotate-180" : ""}`} />
          </button>

          <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-6 mt-4 lg:mt-6`}>

          {/* Stops Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Stops
            </label>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => setMaxStops("all")}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  maxStops === "all" ? "bg-sky-500 text-white" : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>Any number of stops</span>
                {maxStops === "all" && <Check size={14} />}
              </button>
              <button
                onClick={() => setMaxStops("direct")}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  maxStops === "direct" ? "bg-sky-500 text-white" : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>Nonstop Only</span>
                {maxStops === "direct" && <Check size={14} />}
              </button>
              <button
                onClick={() => setMaxStops("one_stop")}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  maxStops === "one_stop" ? "bg-sky-500 text-white" : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>1 Stop or Fewer</span>
                {maxStops === "one_stop" && <Check size={14} />}
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="spatial-input w-full text-xs font-semibold"
            >
              <option value="price_asc">Price: Lowest First</option>
              <option value="price_desc">Price: Highest First</option>
            </select>
          </div>

          {/* Guarantee Badge in Sidebar */}
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-800 dark:text-sky-300 text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldCheck size={14} className="text-sky-500" />
              <span>Live airline fares</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Prices are per booking for all travellers and include taxes and our service fee.
            </p>
          </div>
          </div>
        </aside>

        {/* Results List */}
        <div className="lg:col-span-9 space-y-4" data-testid="offer-list">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-6 h-48 animate-pulse border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60 space-y-4">
                  {/* Placeholder lines so the loading state reads as "cards coming", not empty boxes. */}
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="h-8 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredOffers.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-white/50" data-testid="fare-disclosure">
              Prices are the total for all travellers and include airline taxes and our service fee. Airlines may charge extra for checked bags, seat selection and other services; see each airline's website for its baggage fees.
            </p>
          )}

          {testMode && !loading && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" data-testid="test-mode-banner">
              <AlertCircle size={18} className="mt-px shrink-0" />
              <span><b>Test fares.</b> The flight service is connected with a Duffel test key, so these flights, times and prices are sample data, not real availability.</span>
            </div>
          )}

          {!loading && !error && filteredOffers.length === 0 && (
            <div className="liquid-glass rounded-3xl p-12 text-center text-slate-600 dark:text-slate-300" data-testid="results-empty">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-4">
                <Plane size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No flights available</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Try selecting different airports or flexible travel dates to see available airline routes.
              </p>
              <button
                type="button"
                onClick={() => setIsModifying(true)}
                className="mt-6 spatial-btn-primary px-6 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Modify Search</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Flight Offer Cards */}
          {!loading && filteredOffers.map((offer) => (
            <article 
              key={offer.id} 
              className="liquid-glass-card p-4 sm:p-6 border border-white/60 dark:border-white/10 transition-all"
              data-testid={`offer-${offer.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                {/* Left: Airline Branding & Flight Slices */}
                <div className="flex-1 space-y-4">
                  {/* Airline Identifier */}
                  <div className="flex items-center gap-3">
                    <AirlineLogo src={offer.airline_logo} code={offer.airline_code} size={36} />
                    <div>
                      <b className="text-base text-slate-900 dark:text-white font-bold block leading-none">
                        {offer.airline}
                      </b>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {offer.airline_code} · Verified Fare
                      </span>
                    </div>
                  </div>

                  {/* Slices (Outbound / Return) */}
                  <div className="space-y-2">
                    {offer.slices.map((s, idx) => (
                      <FlightSlice key={idx} slice={s} />
                    ))}
                  </div>
                </div>

                {/* Right: Total Price & Select CTA */}
                <div className="md:w-56 md:pl-6 md:border-l md:border-slate-200/50 dark:md:border-white/10 flex md:flex-col items-center md:items-end justify-between gap-4">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      TOTAL FARE
                    </span>
                    <b 
                      className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white block"
                      data-testid={`offer-price-${offer.id}`}
                    >
                      {formatMoney(offer.total, offer.currency)}
                    </b>
                    {currency !== offer.currency && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        approx. ({offer.currency} {offer.total.toFixed(2)})
                      </span>
                    )}
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                      Includes all taxes
                    </span>
                  </div>

                  <button
                    className="spatial-btn-primary px-6 py-3 rounded-xl text-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    data-testid={`select-offer-${offer.id}`}
                    onClick={() => onSelect(offer)}
                  >
                    <span>Select Flight</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default SearchResultsView;
