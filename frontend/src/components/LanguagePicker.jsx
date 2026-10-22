import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

// Whole-site translation through Google's website translator. The script loads only after a
// visitor picks a language other than English, so English visitors make no call to Google.
export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "it", label: "Italiano", short: "IT" },
  { code: "pt", label: "Português", short: "PT" },
  { code: "hi", label: "हिन्दी", short: "HI" },
  { code: "ar", label: "العربية", short: "AR" },
  { code: "zh-CN", label: "中文 (简体)", short: "中文" },
  { code: "ja", label: "日本語", short: "JA" },
];

const STORAGE_KEY = "asf_language";

export function savedLanguage() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === code) ? code : "en";
  } catch {
    return "en";
  }
}

function setGoogTransCookie(code) {
  const value = code === "en" ? "" : `/en/${code}`;
  const expiry = code === "en" ? "Thu, 01 Jan 1970 00:00:00 GMT" : "";
  const host = window.location.hostname;
  // Google reads the cookie on the bare host and on the parent domain; set or clear both.
  const domains = ["", host.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(host) ? `; domain=.${host.split(".").slice(-2).join(".")}` : ""];
  for (const d of domains) {
    document.cookie = `googtrans=${value}; path=/${d}${expiry ? `; expires=${expiry}` : ""}`;
  }
}

// The translator moves text into <font> tags behind React's back; when React later removes or
// inserts next to a node that moved, the DOM throws and the page goes blank. Ignore those cases
// (facebook/react#11538).
function guardDomForTranslation() {
  if (Node.prototype.__asfTranslateGuard) return;
  Node.prototype.__asfTranslateGuard = true;
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function guardedRemoveChild(child) {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function guardedInsertBefore(node, ref) {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref);
  };
}

let scriptRequested = false;
function loadTranslator() {
  if (scriptRequested) return;
  scriptRequested = true;
  guardDomForTranslation();
  const holder = document.createElement("div");
  holder.id = "google_translate_element";
  holder.style.display = "none";
  document.body.appendChild(holder);
  window.googleTranslateElementInit = () => {
    // eslint-disable-next-line no-new
    new window.google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
  };
  const s = document.createElement("script");
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);
}

/** Switches the page language; English restores the original text with a reload. */
export function applyLanguage(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  setGoogTransCookie(code);
  if (code === "en") {
    if (scriptRequested || document.documentElement.classList.contains("translated-ltr") || document.documentElement.classList.contains("translated-rtl")) {
      window.location.reload();
    }
    return;
  }
  loadTranslator();
  // If the widget is already on the page, switch it in place.
  const combo = document.querySelector("select.goog-te-combo");
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event("change"));
  }
}

/** Call once at start-up: re-applies a language chosen on an earlier visit. */
export function restoreLanguage() {
  const code = savedLanguage();
  if (code !== "en") {
    setGoogTransCookie(code);
    loadTranslator();
  }
}

/** `variant="menu"` renders a grid of buttons for the phone menu; default is a navbar dropdown. */
export function LanguagePicker({ variant = "dropdown", onPicked }) {
  const [current, setCurrent] = useState(savedLanguage);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (code) => {
    setCurrent(code);
    setOpen(false);
    applyLanguage(code);
    onPicked && onPicked(code);
  };

  if (variant === "menu") {
    return (
      <div className="notranslate flex items-center justify-between gap-3 px-3 py-1" translate="no" data-testid="language-menu">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
          <Globe size={15} className="text-sky-500 shrink-0" />
          <span>Language</span>
        </div>
        <div className="relative min-w-0 max-w-[150px] xs:max-w-[170px]">
          <select
            value={current}
            onChange={(e) => pick(e.target.value)}
            className="w-full appearance-none bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 rounded-xl pl-2.5 pr-7 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {l.label} ({l.short})
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    );
  }

  const active = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];
  return (
    <div className="relative notranslate" translate="no" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${active.label}`}
        data-testid="language-picker"
        className="h-8.5 px-2.5 rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 cursor-pointer transition-colors"
      >
        <Globe size={13} className="text-sky-600 dark:text-sky-400" />
        <span>{active.short}</span>
        <ChevronDown size={11} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Choose language"
          className="absolute right-0 mt-2 w-52 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-900 z-[60]"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={current === l.code}
                onClick={() => pick(l.code)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${
                  current === l.code ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                }`}
              >
                <span>{l.label}</span>
                {current === l.code && <Check size={15} />}
              </button>
            </li>
          ))}
          <li className="px-3 pt-2 pb-1 text-[11px] leading-snug text-slate-400 dark:text-white/40">
            Translated automatically by Google. The English version of our terms and policies is the binding one.
          </li>
        </ul>
      )}
    </div>
  );
}

export default LanguagePicker;
