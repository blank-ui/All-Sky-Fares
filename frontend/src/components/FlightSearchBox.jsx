import React, { useState, useEffect } from "react";
import { AirportAutocomplete } from "./AirportAutocomplete";
import { resolveIataCode } from "@/lib/airports";
import { 
  Search, ArrowRight, ArrowLeftRight, Calendar, Users, 
  Plane, Sparkles, Plus, Trash2, ShieldCheck, MapPin
} from "lucide-react";

const POPULAR_AIRPORTS = [
  { code: "LHR", city: "London", name: "Heathrow" },
  { code: "JFK", city: "New York", name: "John F. Kennedy" },
  { code: "DXB", city: "Dubai", name: "Dubai International" },
  { code: "HND", city: "Tokyo", name: "Haneda" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle" },
  { code: "SIN", city: "Singapore", name: "Changi" },
  { code: "DEL", city: "Delhi", name: "Indira Gandhi" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles Intl" }
];

export function FlightSearchBox({ initial = {}, onSearch, embedded = false }) {
  const [tripType, setTripType] = useState("round_trip");
  const [common, setCommon] = useState({ 
    cabin: initial.cabin || "economy", 
    adults: initial.adults || 1 
  });

  const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  };

  const today = getFutureDate(0);
  const [rtForm, setRtForm] = useState({ 
    origin: initial.origin || "", 
    destination: initial.destination || "", 
    departure_date: initial.departure_date || "", 
    return_date: initial.return_date || "" 
  });
  const [mcLegs, setMcLegs] = useState([
    { origin: "", destination: "", departure_date: "" },
    { origin: "", destination: "", departure_date: "" },
  ]);
  const [error, setError] = useState("");

  // Sync state if parent passes new route selections (e.g., from destinations showcase)
  useEffect(() => {
    if (initial) {
      if (initial.origin) setRtForm(prev => ({ ...prev, origin: initial.origin }));
      if (initial.destination) setRtForm(prev => ({ ...prev, destination: initial.destination }));
      if (initial.departure_date) setRtForm(prev => ({ ...prev, departure_date: initial.departure_date }));
      if (initial.return_date) setRtForm(prev => ({ ...prev, return_date: initial.return_date }));
      if (initial.trip_type === "multi_city" && Array.isArray(initial.slices) && initial.slices.length > 1) {
        setTripType("multi_city");
        setMcLegs(initial.slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.departure_date })));
      } else if (initial.trip_type === "one_way") {
        setTripType("one_way");
      } else {
        setTripType("round_trip");
      }
    }
  }, [initial]);

  const swapAirports = () => {
    setRtForm({
      ...rtForm,
      origin: rtForm.destination,
      destination: rtForm.origin
    });
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanOrigin = resolveIataCode(rtForm.origin, "");
    const cleanDestination = resolveIataCode(rtForm.destination, "");
    if (tripType === "multi_city") {
      const cleanLegs = mcLegs.map((l) => ({
        ...l,
        origin: resolveIataCode(l.origin, ""),
        destination: resolveIataCode(l.destination, ""),
      }));
      const bad = cleanLegs.findIndex((l) => !l.origin || !l.destination || !l.departure_date);
      if (bad !== -1) return setError(`Add the airports and date for flight ${bad + 1}.`);
      if (cleanLegs.some((l) => l.origin === l.destination)) return setError("Each flight needs different departure and arrival airports.");
      setError("");
      onSearch({ 
        trip_type: "multi_city", 
        slices: cleanLegs, 
        cabin: common.cabin, 
        adults: Number(common.adults) 
      });
    } else {
      if (!cleanOrigin) return setError("Choose where you're flying from.");
      if (!cleanDestination) return setError("Choose where you're flying to.");
      if (cleanOrigin === cleanDestination) return setError("Departure and arrival airports must be different.");
      if (!rtForm.departure_date) return setError("Pick a departure date.");
      if (tripType === "round_trip" && !rtForm.return_date) return setError("Pick a return date.");
      if (tripType === "round_trip" && rtForm.return_date < rtForm.departure_date) return setError("Return date can't be before the departure date.");
      setError("");
      const body = { 
        trip_type: tripType, 
        origin: cleanOrigin, 
        destination: cleanDestination, 
        departure_date: rtForm.departure_date, 
        cabin: common.cabin, 
        adults: Number(common.adults) 
      };
      if (tripType === "round_trip") body.return_date = rtForm.return_date;
      onSearch(body);
    }
  };

  const updateLeg = (idx, key, val) => {
    setMcLegs(mcLegs.map((l, i) => (i === idx ? { ...l, [key]: val } : l)));
  };

  const addLeg = () => {
    if (mcLegs.length < 6) {
      setMcLegs([
        ...mcLegs,
        { 
          origin: mcLegs[mcLegs.length - 1]?.destination || "", 
          destination: "", 
          departure_date: "" 
        }
      ]);
    }
  };

  const removeLeg = (idx) => {
    if (mcLegs.length > 2) {
      setMcLegs(mcLegs.filter((_, i) => i !== idx));
    }
  };

  return (
    <div 
      className={embedded ? "relative z-20" : "liquid-glass rounded-3xl p-4 sm:p-8 shadow-2xl relative z-20 border border-white/50 dark:border-white/10"}
      data-testid="flight-search-widget"
    >
      {/* Search Header: Trip Type Tabs + Cabin Quick Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto sm:items-center sm:gap-1.5 p-1 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <button
            className={`spatial-tab-btn cursor-pointer whitespace-nowrap justify-center !px-2 sm:!px-5 !text-xs sm:!text-sm ${tripType === "round_trip" ? "active" : ""}`}
            data-testid="round-trip-tab"
            onClick={() => setTripType("round_trip")}
          >
            <span>Round Trip</span>
          </button>
          <button
            className={`spatial-tab-btn cursor-pointer whitespace-nowrap justify-center !px-2 sm:!px-5 !text-xs sm:!text-sm ${tripType === "one_way" ? "active" : ""}`}
            data-testid="one-way-tab"
            onClick={() => setTripType("one_way")}
          >
            <span>One Way</span>
          </button>
          <button
            className={`spatial-tab-btn cursor-pointer whitespace-nowrap justify-center !px-2 sm:!px-5 !text-xs sm:!text-sm ${tripType === "multi_city" ? "active" : ""}`}
            data-testid="multi-city-tab"
            onClick={() => setTripType("multi_city")}
          >
            <span>Multi-City</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            <ShieldCheck size={14} />
            <span>Taxes & fees included</span>
          </div>
        </div>
      </div>

      {/* Main Search Grid (Round Trip & One Way) */}
      {tripType !== "multi_city" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Origin Airport */}
            <div className="col-span-1 lg:col-span-3">
              <AirportAutocomplete
                value={rtForm.origin}
                onChange={(code) => setRtForm((prev) => ({ ...prev, origin: code }))}
                label="From"
                placeholder="Where from?"
                testId="origin-field"
                iconColor="sky"
                isOrigin={true}
              />
            </div>

            {/* Swap Button (Inline) */}
            <div className="hidden xl:flex xl:col-span-1 justify-center items-center h-12 mb-0.5">
              <button
                type="button"
                onClick={swapAirports}
                className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-orange-500 hover:rotate-180 transition-all duration-300 cursor-pointer shadow-md active:scale-95 border border-slate-300 dark:border-white/10"
                aria-label="Swap origin and destination"
                title="Swap airports"
              >
                <ArrowLeftRight size={15} />
              </button>
            </div>

            {/* Destination Airport */}
            <div className="col-span-1 lg:col-span-3">
              <AirportAutocomplete
                value={rtForm.destination}
                onChange={(code) => setRtForm((prev) => ({ ...prev, destination: code }))}
                label="To"
                placeholder="Where to?"
                testId="destination-field"
                iconColor="orange"
                isOrigin={false}
              />
            </div>

            {/* Departure Date */}
            <div className={tripType === "round_trip" ? "col-span-1 lg:col-span-2" : "col-span-1 lg:col-span-4 xl:col-span-3"}>
              <label 
                className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400"
                data-testid="departure-date-field"
              >
                Depart
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-sky-500">
                    <Calendar size={15} />
                  </div>
                  <input
                    type="date"
                    value={rtForm.departure_date}
                    min={today}
                    onChange={(e) => setRtForm({ ...rtForm, departure_date: e.target.value })}
                    className="spatial-input date-with-icon w-full pl-9 pr-2 text-xs font-semibold h-12"
                    required
                  />
                </div>
              </label>
            </div>

            {/* Return Date (Round Trip only) */}
            {tripType === "round_trip" && (
              <div className="col-span-1 lg:col-span-2">
                <label 
                  className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400"
                  data-testid="return-date-field"
                >
                  Return
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-orange-500">
                      <Calendar size={15} />
                    </div>
                    <input
                      type="date"
                      value={rtForm.return_date}
                      min={rtForm.departure_date || today}
                      onChange={(e) => setRtForm({ ...rtForm, return_date: e.target.value })}
                      className="spatial-input date-with-icon w-full pl-9 pr-2 text-xs font-semibold h-12"
                      required
                    />
                  </div>
                </label>
              </div>
            )}

            {/* Search Submit Button - perfectly inline with 48px input height */}
            <div className={tripType === "round_trip" ? "col-span-2 lg:col-span-2 xl:col-span-1" : "col-span-1 lg:col-span-2"}>
              <label className={`${tripType === "round_trip" ? "hidden lg:block" : "block"} text-[11px] invisible mb-1 select-none`}>
                Submit
              </label>
              <button
                type="button"
                className="spatial-btn-primary w-full h-12 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:shadow-orange-500/25 transition-all"
                data-testid="flight-search-submit-button"
                onClick={submit}
              >
                <Search size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">Search</span>
              </button>
            </div>
          </div>

          {/* Quick Filters / Travellers & Cabin Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pt-3 text-xs border-t border-slate-200/40 dark:border-white/5">
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <label className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold" data-testid="travellers-field">
                <Users size={14} className="text-sky-500" />
                <span>Travellers:</span>
                <select
                  value={common.adults}
                  onChange={(e) => setCommon({ ...common, adults: e.target.value })}
                  className="min-w-0 flex-1 sm:flex-none bg-transparent font-bold text-slate-900 dark:text-white border-b border-sky-500 focus:outline-none cursor-pointer py-0.5"
                >
                  <option value="1">1 adult</option>
                  <option value="2">2 adults</option>
                  <option value="3">3 adults</option>
                  <option value="4">4 adults</option>
                </select>
              </label>

              <label className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold" data-testid="cabin-field">
                <Sparkles size={14} className="text-orange-500" />
                <span>Cabin:</span>
                <select
                  value={common.cabin}
                  onChange={(e) => setCommon({ ...common, cabin: e.target.value })}
                  className="min-w-0 flex-1 sm:flex-none bg-transparent font-bold text-slate-900 dark:text-white border-b border-orange-500 focus:outline-none cursor-pointer py-0.5"
                >
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business Class</option>
                  <option value="first">First Class</option>
                </select>
              </label>
            </div>

            {/* Popular Route Fast-Fill Chips */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-400">Trending:</span>
              <button
                type="button"
                onClick={() => setRtForm({ ...rtForm, origin: "LHR", destination: "JFK" })}
                className="px-2 py-0.5 rounded-md hover:bg-sky-500/10 hover:text-sky-500 transition-colors cursor-pointer"
              >
                LHR → JFK
              </button>
              <button
                type="button"
                onClick={() => setRtForm({ ...rtForm, origin: "DXB", destination: "MLE" })}
                className="px-2 py-0.5 rounded-md hover:bg-sky-500/10 hover:text-sky-500 transition-colors cursor-pointer"
              >
                DXB → MLE
              </button>
              <button
                type="button"
                onClick={() => setRtForm({ ...rtForm, origin: "SIN", destination: "DPS" })}
                className="px-2 py-0.5 rounded-md hover:bg-sky-500/10 hover:text-sky-500 transition-colors cursor-pointer"
              >
                SIN → DPS
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Multi-City Flight Search */
        <div className="space-y-4" data-testid="multi-city-body">
          <div className="space-y-3">
            {mcLegs.map((leg, i) => (
              <div 
                key={i} 
                className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/10 flex flex-wrap items-center gap-3 relative"
                data-testid={`mc-leg-${i}`}
              >
                <div className="w-full sm:w-16 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  Leg {i + 1}
                </div>

                <div className="flex-1 min-w-[150px]">
                  <AirportAutocomplete
                    value={leg.origin}
                    onChange={(code) => updateLeg(i, "origin", code)}
                    label="From"
                    placeholder="Origin"
                    testId={`mc-leg-${i}-origin-field`}
                    iconColor="sky"
                    isOrigin={true}
                  />
                </div>

                <div className="text-slate-400 mt-6 hidden sm:block">
                  <ArrowRight size={14} />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <AirportAutocomplete
                    value={leg.destination}
                    onChange={(code) => updateLeg(i, "destination", code)}
                    label="To"
                    placeholder="Destination"
                    testId={`mc-leg-${i}-destination-field`}
                    iconColor="orange"
                    isOrigin={false}
                  />
                </div>

                <label className="w-full sm:w-40" data-testid={`mc-leg-${i}-date-field`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Date</span>
                  <input
                    type="date"
                    value={leg.departure_date}
                    min={(i > 0 && mcLegs[i - 1].departure_date) || today}
                    onChange={(e) => updateLeg(i, "departure_date", e.target.value)}
                    className="spatial-input w-full text-xs"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeLeg(i)}
                  disabled={mcLegs.length <= 2}
                  className="w-9 h-9 rounded-xl liquid-glass flex items-center justify-center text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer transition-colors"
                  data-testid={`mc-leg-${i}-remove`}
                  aria-label="Remove leg"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200/40 dark:border-white/10">
            <button
              type="button"
              className="spatial-btn-secondary px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
              data-testid="mc-add-leg"
              onClick={addLeg}
              disabled={mcLegs.length >= 6}
            >
              <Plus size={14} />
              <span>Add another flight leg</span>
            </button>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300" data-testid="travellers-field">
                <Users size={14} />
                <select
                  value={common.adults}
                  onChange={(e) => setCommon({ ...common, adults: e.target.value })}
                  className="bg-transparent font-bold border-b border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="1">1 adult</option>
                  <option value="2">2 adults</option>
                  <option value="3">3 adults</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300" data-testid="cabin-field">
                <Sparkles size={14} />
                <select
                  value={common.cabin}
                  onChange={(e) => setCommon({ ...common, cabin: e.target.value })}
                  className="bg-transparent font-bold border-b border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </label>

              <button
                type="button"
                className="spatial-btn-primary px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                data-testid="flight-search-submit-button"
                onClick={submit}
              >
                <Search size={15} />
                <span>Search Multi-City</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-600 dark:text-rose-400" data-testid="search-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default FlightSearchBox;
