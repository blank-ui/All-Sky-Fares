import React, { useEffect, useState, useMemo, useRef } from "react";
import { API } from "@/lib/api";

// Core Spatial Styles & Design System
import "@/spatial.css";
// App.css and auth.css held the previous design; their rules overrode the current (Tailwind) styles.

// Spatial Components
import { Navbar } from "./components/Navbar";
import { HeroSlideshow, DestinationTag } from "./components/HeroSlideshow";
import { FlightSearchBox } from "./components/FlightSearchBox";
import { DestinationsShowcase } from "./components/DestinationsShowcase";
import { SearchResultsView } from "./components/SearchResultsView";
import { CheckoutView, ConfirmationView } from "./components/CheckoutView";
import { CustomerPortalView, BookingDetailsView } from "./components/CustomerPortalView";
import { AdminWorkspaceView } from "./components/AdminWorkspaceView";
import { ModernWorkspaceView } from "./components/ModernWorkspaceView";
import { SignInView, SignUpView, ForgotPasswordView, ResetPasswordView } from "./components/AuthViews";
import { HelpView, PolicyView, VerticalPreviewView } from "./components/HelpAndLegalViews";
import { Footer } from "./components/Footer";
import { CookieConsent, useCookieConsent } from "./components/CookieConsent";
import { CurrencyProvider } from "./context/CurrencyContext";
import { KeyboardShortcutsModal, CommandPalette } from "./components/KeyboardShortcutsModal";
import { restoreLanguage } from "./components/LanguagePicker";

// Icons & UI helpers
import { Plane, Hotel, Car, ArrowRight, ShieldCheck, Info, Phone, Sparkles, X, Tag } from "lucide-react";

const KNOWN_ROUTES = new Set([
  "home",
  "login",
  "signup",
  "verifyEmail",
  "account",
  "bookings",
  "bookingDetails",
  "accountSettings",
  "setPassword",
  "support",
  "help",
  "workspace",
  "sales",
  "forgot",
  "reset",
  "checkout",
  "results",
  "about",
  "contact",
  "privacy",
  "terms",
  "refund",
  "cookies",
  "hotels",
  "cars",
  "markups",
  "integrations",
  "crm",
  "credentials",
  "adminConsole",
]);

const routeFor = (path) => {
  if (path === "/login") return "login";
  if (path === "/signup") return "signup";
  if (path === "/verify-email") return "verifyEmail";
  if (path === "/forgot-password") return "forgot";
  if (path === "/reset-password") return "reset";
  if (path === "/set-password") return "setPassword";
  if (path === "/my-account") return "account";
  if (path === "/my-account/settings") return "accountSettings";
  if (path === "/my-bookings") return "bookings";
  if (path === "/invoices") return "invoices";
  if (path === "/reports") return "reports";
  if (path === "/admin" || path === "/staff" || path === "/admin-console") return "adminConsole";
  if (path.startsWith("/my-bookings/")) return "bookingDetails";

  const map = {
    "/sign-in": "login",
    "/sign-up": "signup",
    "/admin": "adminConsole",
    "/staff": "adminConsole",
    "/admin-console": "adminConsole",
    "/admin/markups": "markups",
    "/admin/integrations": "integrations",
    "/admin/crm": "crm",
    "/admin/credentials": "credentials",
    "/markups": "markups",
    "/integrations": "integrations",
    "/crm": "crm",
    "/credentials": "credentials",
  };
  if (map[path]) return map[path];
  const s = path.slice(1);
  return KNOWN_ROUTES.has(s) ? s : s ? "home" : "home";
};

const pathFor = (view, id) => {
  const map = {
    home: "/",
    login: "/login",
    signup: "/signup",
    verifyEmail: "/verify-email",
    forgot: "/forgot-password",
    reset: "/reset-password",
    setPassword: "/set-password",
    account: "/my-account",
    accountSettings: "/my-account/settings",
    bookings: "/my-bookings",
    bookingDetails: `/my-bookings/${id}`,
    workspace: "/my-account",
    adminConsole: "/admin",
    markups: "/markups",
    integrations: "/integrations",
    crm: "/crm",
    credentials: "/credentials",
  };
  return map[view] || `/${view}`;
};

function TawkWidget({ user }) {
  // Live chat sets third-party cookies, so it only loads after the visitor accepts them.
  const consent = useCookieConsent();
  useEffect(() => {
    if (consent !== "all") return;
    if (user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user.role)) return;
    fetch(`${API}/settings/tawk`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg || !cfg.enabled || !cfg.property_id || cfg.property_id === "testprop") return;
        if (document.getElementById("tawk-embed")) return;
        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_LoadStart = new Date();
        const s = document.createElement("script");
        s.id = "tawk-embed";
        s.async = true;
        s.src = `https://embed.tawk.to/${cfg.property_id}/${cfg.widget_id || "default"}`;
        s.charset = "UTF-8";
        s.setAttribute("crossorigin", "*");
        document.body.appendChild(s);
      })
      .catch(() => {});
  }, [user, consent]);
  return null;
}

// Signed-in account and staff pages: no sales popup, phone-fares pill or site footer.
const ACCOUNT_VIEWS = ["account", "bookings", "invoices", "reports", "support", "accountSettings", "bookingDetails", "workspace", "sales", "markups", "integrations", "crm", "credentials", "adminConsole"];

function SalesDealPopup({ view }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("asf-deals-popup-closed") === "1";
    } catch (e) {
      return false;
    }
  });

  // The floating pill (and other components) can open it on demand.
  useEffect(() => {
    const onTrigger = () => setOpen(true);
    window.addEventListener("open-sales-popup", onTrigger);
    return () => window.removeEventListener("open-sales-popup", onTrigger);
  }, []);

  useEffect(() => {
    // Opens automatically after 3.5 seconds on customer views unless dismissed during this view
    if (ACCOUNT_VIEWS.includes(view)) {
      setOpen(false);
      return undefined;
    }
    if (dismissed) return undefined;
    // Don't interrupt someone filling in the search form; try again a bit later.
    const tryOpen = () => {
      const el = document.activeElement;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) timer = setTimeout(tryOpen, 5000);
      else setOpen(true);
    };
    let timer = setTimeout(tryOpen, 3500);

    return () => clearTimeout(timer);
  }, [view, dismissed]);

  // The pill would cover the search card's bottom row on first load; show it once the visitor scrolls on.
  const [scrolledPastSearch, setScrolledPastSearch] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolledPastSearch(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("asf-deals-popup-closed", "1");
    } catch (e) {}
  };

  // Close popup when Escape key is pressed
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* 1. Modal Dialog Popup */}
      {open && !ACCOUNT_VIEWS.includes(view) && (
        <div 
          onClick={handleClose}
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
          style={{ zIndex: 99999 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden cursor-default"
            data-testid="sales-deal-popup"
          >
            {/* Glow ambient background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer z-10"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs sm:text-[13px] font-bold uppercase tracking-wider mb-3">
              <Sparkles size={15} />
              <span>Phone-only airline fares</span>
            </div>

            <h3
              className="font-extrabold text-slate-900 dark:text-white leading-tight text-center whitespace-nowrap tracking-tight"
              style={{ fontSize: "clamp(13px, 4vw, 23px)" }}
            >
              Get Undisclosed Fares &amp; Secret Discounts
            </h3>

            <p className="text-slate-600 dark:text-white/70 text-xs sm:text-sm mt-2 leading-relaxed">
              Some airlines give travel agents negotiated fares that can only be quoted by phone. Call our 24/7 travel desk and an agent will check whether one is available for your trip. Availability and savings vary by route and date, and not every trip has a phone-only fare.
            </p>

            {/* Hotline CTA Card */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-orange-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <Phone size={22} className="animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Toll-Free 24/7 Priority Desk
                  </span>
                  <a
                    href="tel:+18778184167"
                    className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 font-mono tracking-tight transition-colors"
                  >
                    +1 (877) 818-4167
                  </a>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="tel:+18778184167"
                className="spatial-btn-primary w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Phone size={15} />
                <span>Call Now for Custom Quote</span>
              </a>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto whitespace-nowrap py-3 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue browsing
              </button>
            </div>

            {/* Fine Print */}
            <p className="text-[10px] text-slate-400 dark:text-white/40 text-center mt-3 leading-tight">
              * Terms & conditions apply. Discounts subject to airline alliance seat availability and route restrictions.
            </p>
          </div>
        </div>
      )}

      {/* 2. Floating Quick-Hotline Action Pill (visible on landing page when modal is closed) */}
      {!open && !ACCOUNT_VIEWS.includes(view) && (
        <aside
          style={{ zIndex: 9990 }}
          className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 shadow-2xl backdrop-blur-md border border-white/20 dark:border-slate-800 transition-all hover:scale-105 cursor-pointer animate-fade-in group z-40"
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
          data-testid="sales-deal-floating-pill"
          aria-label="View undisclosed sales deals"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-pulse shrink-0">
            <Phone size={14} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 dark:text-emerald-700 leading-none">
              Phone-only fares
            </span>
            <span className="text-xs font-mono font-extrabold mt-0.5 group-hover:text-amber-300 dark:group-hover:text-amber-600 transition-colors">
              Call +1 (877) 818-4167
            </span>
          </div>
          <Tag size={12} className="text-amber-400 dark:text-amber-600 ml-1" />
        </aside>
      )}
    </>
  );
}

/* Home View with Slideshow & Spatial Flight Box */
function HomeView({ onSearch, initialForm, onSelectRoute }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  return (
    <main data-testid="customer-home" className="relative min-h-screen">
      {/* 1. Hero Slideshow (High-res background animation with Ken Burns effect) */}
      <section className="relative sm:min-h-[92vh] flex flex-col justify-center items-center px-4 sm:px-6 pt-[5.5rem] sm:pt-24 pb-8 sm:pb-16">
        <HeroSlideshow
          activeIndex={activeSlideIndex}
          onChangeIndex={setActiveSlideIndex}
          onSelectRoute={(origin, destination) => onSelectRoute({ origin, destination })}
        />

        {/* Hero copy sits straight on the slideshow; the slide overlays and text shadow keep it readable. */}
        <div className="relative z-10 w-full text-center max-w-4xl mx-auto mb-5 sm:mb-10">
          <div className="inline-flex max-w-full flex-wrap justify-center items-center gap-x-2 gap-y-0.5 px-3 sm:px-4 py-1.5 rounded-full border border-white/25 bg-slate-950/40 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-cyan-200 shadow-xl mb-3 sm:mb-5">
            <ShieldCheck size={14} className="text-emerald-300" />
            <span className="text-cyan-100">Live airline fares · Taxes & fees included</span>
          </div>
          <h1
            data-testid="hero-heading"
            className="text-[2.4rem] sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.04]"
            style={{ color: "#fff", textShadow: "0 4px 30px rgba(2,6,23,.55), 0 1px 3px rgba(2,6,23,.6)" }}
          >
            Go further. <br />
            <em className="font-serif italic font-normal" style={{ color: "#bae6fd", textShadow: "0 4px 30px rgba(2,6,23,.6), 0 1px 3px rgba(2,6,23,.6)" }}>
              Feel closer.
            </em>
          </h1>
          <p
            className="text-sm sm:text-lg max-w-2xl mx-auto mt-3 sm:mt-4 font-normal leading-relaxed px-2"
            style={{ color: "rgba(255,255,255,.92)", textShadow: "0 2px 12px rgba(2,6,23,.7)" }}
          >
            {/* Phones get the short version so the search form fits on the first screen. */}
            <span className="sm:hidden text-inherit">Live fares from the world's top airlines, with a 24/7 travel desk.</span>
            <span className="hidden sm:inline text-inherit">Compare trusted fares across the world's most prestigious airlines, powered by live inventory discovery and our dedicated 24/7 concierge desk.</span>
          </p>
          <div className="mt-4 sm:mt-6 flex justify-center px-2">
            <DestinationTag index={activeSlideIndex} onSelectRoute={(origin, destination) => onSelectRoute({ origin, destination })} />
          </div>
        </div>

        {/* 2. Floating Spatial Liquid-Glass Flight Search Box */}
        <div className="relative z-20 w-full max-w-6xl mx-auto pointer-events-auto">
          <FlightSearchBox initial={initialForm} onSearch={onSearch} />
        </div>
      </section>

      {/* 3. Luxury Destinations Showcase Strip */}
      <section className="relative z-10">
        <DestinationsShowcase onSelectRoute={onSelectRoute} />
      </section>
    </main>
  );
}

// The search, chosen flight and confirmation survive a page refresh in this tab.
const TAB_KEYS = { search: "asf-search", offer: "asf-selected-offer", confirmation: "asf-confirmation" };
function tabLoad(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch (e) {
    return null;
  }
}
function tabSave(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* App Shell */
export default function App() {
  const defaultForm = useMemo(() => {
    const now = new Date();
    const depart = new Date(now);
    depart.setDate(now.getDate() + 7);
    const ret = new Date(now);
    ret.setDate(now.getDate() + 14);

    return {
      origin: "",
      destination: "",
      departure_date: "",
      return_date: "",
      trip_type: "round_trip",
      cabin: "economy",
      adults: 1,
    };
  }, []);

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("asf-theme");
    if (saved === "light") return false;
    if (saved === "dark") return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  });

  // Persist theme choice
  useEffect(() => {
    localStorage.setItem("asf-theme", dark ? "dark" : "light");
  }, [dark]);
  const [view, setView] = useState(() => routeFor(window.location.pathname));
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [searchForm, setSearchForm] = useState(() => {
    // The saved search only brings back a refreshed results/checkout page; every other page starts with an empty search box.
    if (!["results", "checkout"].includes(routeFor(window.location.pathname))) return { ...defaultForm };
    try {
      const saved = tabLoad(TAB_KEYS.search);
      if (saved && saved.trip_type === "multi_city") {
        sessionStorage.removeItem("asf-search");
      }
      if (saved && (saved.trip_type === "one_way" || saved.trip_type === "round_trip")) {
        return { ...defaultForm, ...saved };
      }
    } catch (e) {}
    return { ...defaultForm, trip_type: "round_trip" };
  });
  const [results, setResults] = useState({ loading: false, offers: [], error: "", count: 0 });
  const [selectedOffer, setSelectedOffer] = useState(() => tabLoad(TAB_KEYS.offer));
  const [confirmedBooking, setConfirmedBooking] = useState(() => tabLoad(TAB_KEYS.confirmation)?.booking || null);
  // Guest checkout: covers this booking only.
  const fellBackHomeRef = useRef(false);
  const [guestToken, setGuestToken] = useState(() => tabLoad(TAB_KEYS.confirmation)?.guestToken || null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused = ["input", "textarea", "select"].includes(activeTag) || document.activeElement?.isContentEditable;

      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape: Close active overlays
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setShortcutsOpen(false);
        window.dispatchEvent(new CustomEvent("close-overlays"));
        return;
      }

      // Navigation shortcuts with Alt (guarded against input focus & AltGr)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !isInputFocused) {
        if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          navigate("home");
          return;
        }
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          user ? navigate("bookings") : navigate("login");
          return;
        }
        if (e.key === "w" || e.key === "W" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          user ? navigate("workspace") : navigate("login");
          return;
        }
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          navigate("help");
          return;
        }
        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          setDark((d) => !d);
          return;
        }
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("toggle-currency-picker"));
          return;
        }
      }

      // '/' key to focus search (when not in an input)
      if (!isInputFocused && !e.ctrlKey && !e.altKey && !e.metaKey && e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector('input[data-testid="search-origin-input"], input[placeholder*="Where from"], input[placeholder*="Where to"], input[type="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        } else {
          setCommandPaletteOpen(true);
        }
        return;
      }

      // '?' key to open cheat sheet if not inside input
      if (!isInputFocused && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setDark]);

  const navigate = (next, id) => {
    setView(next);
    const path = pathFor(next, id);
    if (window.location.pathname !== path || window.location.search) {
      window.history.pushState({}, "", path);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  useEffect(() => {
    const pop = () => {
      setView(routeFor(window.location.pathname));
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", pop);

    const initAuth = async () => {
      let u = null;
      try {
        // One retry on a network or server error, so a blip doesn't sign the user out.
        let r = await fetch(`${API}/auth/me`, { credentials: "include" }).catch(() => null);
        if (!r || r.status >= 500) {
          await new Promise((res) => setTimeout(res, 800));
          r = await fetch(`${API}/auth/me`, { credentials: "include" });
        }
        if (r.ok) {
          const d = await r.json();
          u = d.user || null;
        }
      } catch (e) {
      } finally {
        setUser(u);
        setHydrated(true);
      }
    };
    initAuth();
    restoreLanguage(); // language picked on an earlier visit

    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const customerRoutes = ["account", "bookings", "invoices", "reports", "support", "accountSettings", "bookingDetails", "workspace", "sales", "markups", "integrations", "crm", "credentials", "adminConsole"];
    if (customerRoutes.includes(view) && !user) {
      navigate("login");
    }
  }, [view, user, hydrated]);

  const doSearch = async (form) => {
    setSearchForm(form);
    tabSave(TAB_KEYS.search, form);
    setResults({ loading: true, offers: [], error: "", count: 0 });
    navigate("results");
    try {
      const r = await fetch(`${API}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Search unavailable");
      setResults({ loading: false, offers: d.offers || [], error: "", count: d.count || 0, testMode: !!d.test_mode });
    } catch (err) {
      setResults({ loading: false, offers: [], error: err.message, count: 0 });
    }
  };

  const handleSelectRoute = (route, maybeDest) => {
    let origin, destination;
    if (typeof route === "string") {
      origin = route;
      destination = maybeDest;
    } else if (route) {
      origin = route.origin;
      destination = route.destination;
    }
    setSearchForm((prev) => ({
      ...prev,
      origin: origin || prev.origin,
      destination: destination || prev.destination,
    }));
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Refreshing the results page runs the same search again.
  useEffect(() => {
    if (view === "results" && tabLoad(TAB_KEYS.search)) doSearch(searchForm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectOffer = (offer) => {
    setSelectedOffer(offer);
    tabSave(TAB_KEYS.offer, offer);
    navigate("checkout");
  };

  const completeBooking = (booking, guestToken = null) => {
    setConfirmedBooking(booking);
    setGuestToken(guestToken);
    tabSave(TAB_KEYS.offer, null);
    tabSave(TAB_KEYS.confirmation, { booking, guestToken });
    navigate("confirmation");
  };

  const successAuth = (u) => {
    setUser(u);
    try {
      sessionStorage.removeItem("asf-admin-tab");
      sessionStorage.removeItem("asf-workspace-tab");
    } catch (e) {}
    const next = new URLSearchParams(window.location.search).get("next");
    if (next === "bookings") {
      navigate("bookings"); // link from the booking email
    } else {
      navigate("account"); // default to modern dashboard for everyone
    }
  };

  const isStaff = user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user.role);

  useEffect(() => {
    if (fellBackHomeRef.current) {
      fellBackHomeRef.current = false;
      window.history.replaceState({}, "", "/");
      setView("home");
    }
  }, [view]);
  let page;
  if (view === "login") page = <SignInView onSuccess={successAuth} navigate={navigate} mode="customer" />;
  else if (view === "signin") page = <SignInView onSuccess={successAuth} navigate={navigate} mode="staff" />;
  else if (view === "signup") page = <SignUpView onSuccess={successAuth} navigate={navigate} />;
  else if (view === "forgot") page = <ForgotPasswordView navigate={navigate} />;
  else if (view === "reset") page = <ResetPasswordView navigate={navigate} />;
  else if (view === "adminConsole" && isStaff) {
    let savedTab = null;
    try {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q) savedTab = q;
      else savedTab = sessionStorage.getItem("asf-admin-tab");
    } catch (e) {}
    const adminInitialTab = savedTab || "overview";
    page = (
      <div className="notranslate" translate="no">
        <AdminWorkspaceView user={user} navigate={navigate} initialTab={adminInitialTab} />
      </div>
    );
  }
  else if ((view === "workspace" || view === "sales" || view === "account" || view === "bookings" || view === "invoices" || view === "reports" || view === "support" || view === "accountSettings" || view === "markups" || view === "integrations" || view === "crm" || view === "credentials" || view === "adminConsole") && user) {
    page = (
      <div className="notranslate" translate="no">
        <ModernWorkspaceView
          user={user}
          setUser={setUser}
          dark={dark}
          setDark={setDark}
          navigate={navigate}
          initialTab={
            view === "bookings" ? "bookings"
            : view === "invoices" ? "invoices"
            : view === "reports" ? "reports"
            : view === "accountSettings" ? "settings"
            : view === "support" ? "help"
            : view === "markups" ? "markups"
            : view === "integrations" ? "integrations"
            : view === "crm" ? "crm"
            : view === "credentials" ? "credentials"
            : "dashboard"
          }
        />
      </div>
    );
  }
  else if (view === "results") page = <SearchResultsView state={results} onSelect={selectOffer} onBackToSearch={() => navigate("home")} onSearch={doSearch} searchForm={searchForm} />;
  else if (view === "checkout" && selectedOffer) page = <CheckoutView offer={selectedOffer} user={user} onComplete={completeBooking} onCancel={() => navigate("results")} onSignIn={() => navigate("login")} />;
  else if (view === "confirmation" && confirmedBooking) page = <ConfirmationView booking={confirmedBooking} navigate={navigate} guestToken={guestToken} signedIn={!!user} />;
  else if (view === "account" && user) page = <CustomerPortalView user={user} navigate={navigate} setUser={setUser} initialTab="overview" />;
  else if (view === "bookings" && user) page = <CustomerPortalView user={user} navigate={navigate} setUser={setUser} initialTab="bookings" />;
  else if (view === "support" && user) page = <CustomerPortalView user={user} navigate={navigate} setUser={setUser} initialTab="support" />;
  else if (view === "accountSettings" && user) page = <CustomerPortalView user={user} navigate={navigate} setUser={setUser} initialTab="settings" />;
  else if (view === "bookingDetails" && user) page = <BookingDetailsView navigate={navigate} />;
  else if (view === "help") page = <HelpView navigate={navigate} />;
  else if (["about", "contact", "privacy", "terms", "refund", "cookies"].includes(view)) page = <PolicyView view={view} />;
  else if (["hotels", "cars"].includes(view)) page = <VerticalPreviewView view={view} navigate={navigate} />;
  else page = <HomeView onSearch={doSearch} initialForm={searchForm} onSelectRoute={handleSelectRoute} />;
  // A page with nothing to show (e.g. /checkout without a chosen flight) falls back to home: say so in the URL.
  // Signed-out account pages are left to the sign-in redirect above.
  const fellBackHome = hydrated && ["checkout", "confirmation"].includes(view) && page.type === HomeView;
  fellBackHomeRef.current = fellBackHome;

  return (
    <CurrencyProvider>
    <div className={`app spatial-theme min-h-screen transition-colors duration-300 ${dark ? "dark bg-[#040814] text-slate-100" : "light bg-slate-50 text-slate-900"}`}>
      {/* Dynamic ambient background glow */}
      {dark ? (
        <>
          <div className="fixed inset-0 pointer-events-none -z-20 bg-[#040814]" />
          <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-600/10 blur-[140px] pointer-events-none -z-10" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[160px] pointer-events-none -z-10" />
        </>
      ) : (
        <>
          <div className="fixed inset-0 pointer-events-none -z-20 bg-[#f8fafc]" />
          <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-sky-200/50 blur-[140px] pointer-events-none -z-10" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-200/40 blur-[160px] pointer-events-none -z-10" />
        </>
      )}

      {/* Floating Spatial Liquid Glass Navbar */}
      <Navbar dark={dark} setDark={setDark} user={user} setUser={setUser} navigate={navigate} currentView={view} onOpenCommandPalette={() => setCommandPaletteOpen(true)} onOpenShortcuts={() => setShortcutsOpen(true)} />

      {/* View Page */}
      {hydrated ? page : <main data-testid="app-loading" className="min-h-[600px] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></main>}

      {/* Spatial Footer */}
      {!ACCOUNT_VIEWS.includes(view) && (
        <Footer navigate={navigate} dark={dark} />
      )}

      {/* Live Chat Integration */}
      <TawkWidget user={user} />
      <CookieConsent navigate={navigate} />

      {/* 15-Second Unpublished Sales Deals Hotline Popup */}
      <SalesDealPopup view={view} />

      {/* Global Command Palette (Ctrl+K) & Shortcuts Cheat Sheet (?) */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        navigate={navigate} 
        dark={dark} 
        setDark={setDark} 
        user={user} 
      />
      <KeyboardShortcutsModal 
        isOpen={shortcutsOpen} 
        onClose={() => setShortcutsOpen(false)} 
        user={user} 
      />
    </div>
    </CurrencyProvider>
  );
}
