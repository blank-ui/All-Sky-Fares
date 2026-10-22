import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Coins, DollarSign } from "lucide-react";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";

/**
 * CurrencyPicker component for seamless dynamic currency selection.
 * Supports both desktop navbar dropdown and mobile menu grid.
 */
export function CurrencyPicker({ variant = "dropdown", onPicked }) {
  const { currency, setCurrency, activeCurrencyInfo } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Currency picker shortcuts & toggle listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onCustomToggle = () => setOpen((prev) => !prev);
    const onCloseOverlays = () => setOpen(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("toggle-currency-picker", onCustomToggle);
    window.addEventListener("close-overlays", onCloseOverlays);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("toggle-currency-picker", onCustomToggle);
      window.removeEventListener("close-overlays", onCloseOverlays);
    };
  }, []);

  const pick = (code) => {
    setCurrency(code);
    setOpen(false);
    onPicked && onPicked(code);
  };

  const currencyList = Object.values(CURRENCIES);

  if (variant === "menu") {
    return (
      <div className="notranslate flex items-center justify-between gap-3 px-3 py-1" translate="no" data-testid="currency-menu">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
          <Coins size={15} className="text-sky-500 shrink-0" />
          <span>Currency</span>
        </div>
        <div className="relative min-w-0 max-w-[150px] xs:max-w-[170px]">
          <select
            value={currency}
            onChange={(e) => pick(e.target.value)}
            className="w-full appearance-none bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 rounded-xl pl-2.5 pr-7 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate"
          >
            {currencyList.map((c) => (
              <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative notranslate" translate="no" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${activeCurrencyInfo.name} (${activeCurrencyInfo.code})`}
        data-testid="currency-picker"
        title="Change currency (Alt+C)"
        className="h-8.5 px-3 rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 cursor-pointer transition-colors"
      >
        <span className="text-xs">{activeCurrencyInfo.flag}</span>
        <span className="font-extrabold">{activeCurrencyInfo.code}</span>
        <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose currency"
          className="absolute right-0 mt-2 w-56 max-h-[75vh] overflow-auto rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-2xl p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95 z-[60] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between border-b border-slate-100 dark:border-white/5 mb-1">
            <span>Select Currency</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[9px] font-mono">Alt+C</kbd>
          </div>
          {currencyList.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                role="option"
                aria-selected={currency === c.code}
                onClick={() => pick(c.code)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  currency === c.code
                    ? "bg-sky-500 text-white shadow-sm font-bold"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <div className="text-left">
                    <div className="leading-tight flex items-center gap-1.5">
                      <span>{c.code}</span>
                      <span className={`text-[11px] ${currency === c.code ? "text-white/80" : "text-slate-400 dark:text-white/40"}`}>
                        {c.symbol}
                      </span>
                    </div>
                    <div className={`text-[10px] ${currency === c.code ? "text-white/80" : "text-slate-400 dark:text-white/40"}`}>
                      {c.name}
                    </div>
                  </div>
                </div>
                {currency === c.code && <Check size={15} className="shrink-0" />}
              </button>
            </li>
          ))}
          <li className="px-3 pt-2 pb-1 text-[10px] leading-tight text-slate-400 dark:text-white/40 border-t border-slate-100 dark:border-white/5 mt-1">
            Fares convert dynamically from USD using real-time interbank reference rates.
          </li>
        </ul>
      )}
    </div>
  );
}

export default CurrencyPicker;
