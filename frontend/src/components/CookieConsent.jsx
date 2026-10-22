import React, { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const KEY = "asf-cookie-consent"; // "all" | "essential"
const EVENT = "asf-cookie-consent-change";

export function getConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
}

/** Re-renders with the current choice whenever it changes. */
export function useCookieConsent() {
  const [consent, setConsent] = useState(getConsent);
  useEffect(() => {
    const onChange = () => setConsent(getConsent());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return consent;
}

export function CookieConsent({ navigate }) {
  const [open, setOpen] = useState(() => !getConsent());

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener("open-cookie-preferences", reopen);
    return () => window.removeEventListener("open-cookie-preferences", reopen);
  }, []);

  const choose = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT));
    setOpen(false);
    // Turning optional cookies off after the chat loaded needs a reload to remove it.
    if (value === "essential" && document.getElementById("tawk-embed")) window.location.reload();
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-[100000] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:inset-x-6 sm:bottom-6" data-testid="cookie-consent">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Cookie size={28} className="hidden shrink-0 text-orange-500 sm:block" />
        <div className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-white/70">
          <span className="font-semibold text-slate-900 dark:text-white">We use cookies.</span> Essential cookies keep you signed in and are always on. With your OK we also load our live chat (Tawk.to), which sets its own cookies.{" "}
          <button type="button" onClick={() => { setOpen(false); navigate("cookies"); }} className="font-semibold text-sky-600 underline dark:text-sky-400">Cookie policy</button>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose("essential")} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5" data-testid="cookie-essential">
            Essential only
          </button>
          <button type="button" onClick={() => choose("all")} className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600" data-testid="cookie-accept">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
