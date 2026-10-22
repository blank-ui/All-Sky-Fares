import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", rate: 1.0, decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", rate: 0.92, decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", rate: 0.79, decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦", rate: 1.36, decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺", rate: 1.52, decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", rate: 83.50, decimals: 2 },
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", flag: "🇦🇪", rate: 3.67, decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", rate: 1.35, decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", rate: 154.50, decimals: 0 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", flag: "🇨🇭", rate: 0.90, decimals: 2 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", flag: "🇳🇿", rate: 1.64, decimals: 2 },
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem("asf_currency");
      return saved && CURRENCIES[saved] ? saved : "USD";
    } catch {
      return "USD";
    }
  });

  const setCurrency = useCallback((code) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      try {
        localStorage.setItem("asf_currency", code);
      } catch {}
    }
  }, []);

  const activeCurrencyInfo = useMemo(() => CURRENCIES[currency] || CURRENCIES.USD, [currency]);

  /**
   * Convert amount from fromCurrency to the active currency.
   */
  const convert = useCallback((amount, fromCurrency = "USD") => {
    if (amount == null || isNaN(amount)) return 0;
    const num = Number(amount);
    const fromRate = CURRENCIES[fromCurrency]?.rate || 1.0;
    const toRate = activeCurrencyInfo.rate || 1.0;
    
    // Convert to base USD first, then to target currency
    const inUSD = num / fromRate;
    return inUSD * toRate;
  }, [activeCurrencyInfo]);

  /**
   * Format money into the active currency string, e.g. "$ 450.00" or "€ 414.00" or "₹ 37,575.00".
   */
  const formatMoney = useCallback((amount, fromCurrency = "USD") => {
    if (amount == null || isNaN(amount)) return "—";
    const converted = convert(amount, fromCurrency);
    const decimals = activeCurrencyInfo.decimals ?? 2;

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: activeCurrencyInfo.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(converted);
    } catch {
      return `${activeCurrencyInfo.symbol} ${converted.toFixed(decimals)}`;
    }
  }, [convert, activeCurrencyInfo]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    currencies: CURRENCIES,
    activeCurrencyInfo,
    convert,
    formatMoney,
  }), [currency, setCurrency, activeCurrencyInfo, convert, formatMoney]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      currency: "USD",
      setCurrency: () => {},
      currencies: CURRENCIES,
      activeCurrencyInfo: CURRENCIES.USD,
      convert: (amt) => Number(amt || 0),
      formatMoney: (amt) => (amt == null ? "—" : `$${Number(amt).toFixed(2)}`),
    };
  }
  return context;
}
