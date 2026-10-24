import React, { useState, useEffect, useRef } from "react";
import { Plane, MapPin, X, Building2, Search } from "lucide-react";
import { searchAirports, resolveIataCode, formatAirportDisplay, AIRPORTS } from "@/lib/airports";

/**
 * Google Flights-style Airport Autocomplete Component
 * 
 * Props:
 * - value: The current 3-letter IATA code (e.g. "LHR")
 * - onChange: Callback when an airport is selected, passes (iataCode, airportMeta)
 * - placeholder: Input placeholder text
 * - label: Optional field label (e.g. "From", "To")
 * - testId: data-testid for automated testing
 * - iconColor: "sky" | "orange" for origin vs destination branding
 * - isOrigin: boolean indicating origin vs destination
 */
export function AirportAutocomplete({
  value = "",
  onChange,
  placeholder = "City or airport",
  label = "",
  testId = "airport-autocomplete",
  iconColor = "sky",
  isOrigin = true,
  required = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  // True once the user types; until then the box shows "City (CODE)", which isn't a search term.
  const [typed, setTyped] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Synchronize internal text display with external value
  useEffect(() => {
    if (!isEditing) {
      if (value) {
        const cleanCode = resolveIataCode(value, value);
        const match = AIRPORTS.find((a) => a.code === cleanCode);
        if (match) {
          setQuery(`${match.city} (${match.code})`);
        } else {
          setQuery(cleanCode);
        }
      } else {
        setQuery("");
      }
    }
  }, [value, isEditing]);

  // Compute search suggestions
  const suggestions = React.useMemo(() => {
    if (!isEditing || !typed || !query.trim()) {
      return searchAirports("", 12);
    }
    return searchAirports(query, 30);
  }, [query, isEditing, typed]);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (open) {
          handleCommit();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, value]);

  // Commit selection on blur or click outside
  const handleCommit = (forcedItem) => {
    setOpen(false);
    setIsEditing(false);

    if (forcedItem) {
      onChange(forcedItem.code, forcedItem);
      setQuery(`${forcedItem.city} (${forcedItem.code})`);
      return;
    }

    // If query has text, resolve it
    if (query.trim()) {
      const resolvedCode = resolveIataCode(query, value || "");
      const match = AIRPORTS.find((a) => a.code === resolvedCode);
      onChange(resolvedCode, match);
      if (match) {
        setQuery(`${match.city} (${match.code})`);
      } else {
        setQuery(resolvedCode);
      }
    } else if (value) {
      const match = AIRPORTS.find((a) => a.code === value);
      setQuery(match ? `${match.city} (${match.code})` : value);
    }
  };

  const handleSelect = (item) => {
    handleCommit(item);
  };

  const handleFocus = () => {
    setTyped(false);
    setIsEditing(true);
    setOpen(true);
    // If the input already has "City (CODE)", pre-select it so typing immediately replaces it
    if (inputRef.current) {
      inputRef.current.select();
    }
    // Nudge the page so the suggestion list isn't cut off below the fold.
    const rect = containerRef.current && containerRef.current.getBoundingClientRect();
    const room = window.innerHeight - (rect ? rect.bottom : 0);
    if (rect && room < 320) window.scrollBy({ top: Math.min(320 - room, rect.top - 80), behavior: "smooth" });
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setTyped(true);
    setIsEditing(true);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const next = activeIndex + 1 < suggestions.length ? activeIndex + 1 : 0;
        setActiveIndex(next);
        scrollActiveIntoView(next);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        const prev = activeIndex - 1 >= 0 ? activeIndex - 1 : suggestions.length - 1;
        setActiveIndex(prev);
        scrollActiveIntoView(prev);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0 && activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else {
        handleCommit();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setIsEditing(false);
      if (inputRef.current) inputRef.current.blur();
    } else if (e.key === "Tab") {
      if (open && suggestions.length > 0) {
        handleSelect(suggestions[activeIndex >= 0 ? activeIndex : 0]);
      }
    }
  };

  const scrollActiveIntoView = (index) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll("[data-airport-item]");
      if (items[index]) {
        items[index].scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    setTyped(true);
    setIsEditing(true);
    onChange("", null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Helper to highlight matching characters
  const highlightMatch = (text, q) => {
    if (!text || !q || !isEditing || !typed) return text;
    const cleanQ = q.trim().toLowerCase();
    if (!cleanQ || cleanQ.length > text.length) return text;
    
    // If exact IATA in parentheses, don't split awkwardly
    const idx = text.toLowerCase().indexOf(cleanQ);
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + cleanQ.length);
    const after = text.slice(idx + cleanQ.length);

    return (
      <>
        {before}
        <span className="text-sky-600 dark:text-cyan-400 font-black underline decoration-sky-400/40">{match}</span>
        {after}
      </>
    );
  };

  const iconClasses = isOrigin
    ? "text-sky-500 dark:text-cyan-400"
    : "text-orange-500 dark:text-amber-400";

  return (
    <div className="relative w-full" ref={containerRef} data-testid={testId}>
      {label && (
        <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}

      {/* Input wrapper matching spatial theme */}
      <div className="relative mt-1 group">
        <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 ${iconClasses}`}>
          <Plane size={16} className={isOrigin ? "-rotate-45" : "rotate-45"} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          spellCheck="false"
          className="spatial-input w-full pl-10 pr-9 font-bold text-sm tracking-wide h-12 truncate text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20"
        />

        {/* Clear Button or IATA Indicator */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear input"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="pointer-events-none text-slate-400 opacity-60">
              <Search size={14} />
            </div>
          )}
        </div>
      </div>

      {/* ----------------- GOOGLE FLIGHTS-STYLE AUTOCOMPLETE DROPDOWN ----------------- */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 sm:min-w-[360px] z-[60] mt-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl shadow-sky-950/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: "min(420px, 70vh)" }}
        >
          {/* Header Strip */}
          <div className="px-3.5 py-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span>
              {query && isEditing && typed ? `Suggestions for "${query}"` : "Popular Global Destinations"}
            </span>
            <span className="hidden sm:inline whitespace-nowrap font-mono text-[9px] opacity-70">
              [↑↓ Navigate • ↵ Select]
            </span>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[min(360px,60vh)] overflow-y-auto overscroll-contain py-1 scrollbar-thin">
            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = item.code === value;

                return (
                  <div
                    key={item.code}
                    data-airport-item
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-l-2 ${
                      isActive
                        ? "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500"
                        : isSelected
                        ? "bg-slate-50 dark:bg-white/5 border-transparent"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.03] border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Airport icon badge */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-sky-500 text-white shadow-xs shadow-sky-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Plane size={15} className="rotate-45" />
                      </div>

                      {/* City, Airport Name & Country */}
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {highlightMatch(item.city, query)}
                          {item.state && (
                            <span className="text-slate-400 font-normal ml-1 text-xs">
                              , {item.state}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[210px] sm:max-w-[240px]">
                          {highlightMatch(item.name, query)}
                          {item.country && (
                            <span className="text-slate-400 dark:text-slate-500">
                              {" "}• {item.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* IATA Code Pill */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span
                        className={`font-mono text-xs font-black tracking-wider px-2 py-0.5 rounded-lg border transition-all ${
                          isActive
                            ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-cyan-400 border-slate-200/80 dark:border-white/10"
                        }`}
                      >
                        {item.code}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <Building2 size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  No airports found matching "{query}"
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try typing the city name (e.g. London, Dubai, Paris) or 3-letter IATA code.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AirportAutocomplete;
