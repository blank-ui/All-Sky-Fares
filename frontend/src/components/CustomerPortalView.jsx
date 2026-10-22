import { useCurrency } from "@/context/CurrencyContext";
import React, { useState, useEffect } from "react";
import {
  UserCircle, Ticket, User, Settings, HeadphonesIcon, Mail, ArrowRight,
  Plane, Clock, ShieldCheck, Download, FileText, ChevronRight, AlertCircle,
  Check, LockKeyhole, Phone, Sparkles, MapPin, Calendar, ExternalLink,
  Shield, Copy, Eye, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { StatusBadge, CancelBooking } from "./BookingActions";
import { DocumentButtons } from "./CheckoutView";
import { AirlineLogo } from "./AirlineLogo";

const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";
export const getBookingLogo = (b) => {
  const firstSeg = b?.slices?.[0]?.segments?.[0];
  if (firstSeg?.airline_logo) return firstSeg.airline_logo;
  const code = firstSeg?.airline_code || b?.airline_code;
  if (code && code !== "*") return `${AIRLINE_LOGO_CDN}/${String(code).toUpperCase()}.png`;
  return null;
};

export function CustomerPortalView({ user, navigate, setUser, initialTab = "overview" }) {
  const { formatMoney } = useCurrency();
  const [tab, setTab] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Pre-load user's bookings so Overview and Bookings tabs have instant data
  useEffect(() => {
    let active = true;
    apiRequest("/my/bookings")
      .then((d) => {
        if (active) {
          setBookings(d.bookings || []);
          setLoadingBookings(false);
        }
      })
      .catch(() => {
        if (active) setLoadingBookings(false);
      });
    return () => { active = false; };
  }, []);

  const nextBooking = bookings.find(b => b.status === "CONFIRMED" || b.status === "ON_HOLD") || bookings[0];

  return (
    <main className="account-page max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16" data-testid="account-page">
      {/* 1. Bento Header Banner */}
      <section className="bento-card p-6 sm:p-8 mb-6 border border-slate-200/90 dark:border-white/10 relative">
        <div className="bento-hero-glow bg-cyan-500/15" />
        <div className="bento-hero-glow bg-indigo-500/15 left-[-40px] top-auto bottom-[-40px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-xl shadow-cyan-500/20 shrink-0">
              {(user?.first_name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              
              <h1 data-testid="account-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-cyan-400 dark:to-sky-300">{user?.first_name || "Traveller"}</span>
              </h1>
              <p data-testid="account-subtitle" className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-0.5">
                Manage your upcoming flights, travel documents, e-tickets, and 24/7 concierge support.
              </p>
            </div>
          </div>

          {/* Quick Hotline Pill */}
          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-white/10 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">
              Dedicated Concierge Desk
            </div>
            <a
              href="tel:+18778184167"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold font-mono transition-all"
            >
              <Phone size={14} className="animate-pulse" />
              <span>+1 (877) 818-4167</span>
            </a>
          </div>
        </div>

        {/* 2. Bento Segmented Navigation Dock */}
        <nav className="relative z-10 mt-6 pt-5 flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-slate-200/60 dark:border-white/10" data-testid="account-tabs">
          {[
            { id: "overview", label: "Overview", icon: UserCircle },
            { id: "bookings", label: `My Bookings (${bookings.length})`, icon: Ticket },
            { id: "profile", label: "Passenger Profile", icon: User },
            { id: "settings", label: "Security & Privacy", icon: Settings },
            { id: "support", label: "Concierge Desk", icon: HeadphonesIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                navigate(id === "overview" ? "account" : id === "bookings" ? "bookings" : id === "settings" ? "accountSettings" : "account");
              }}
              data-testid={`account-tab-${id}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                tab === id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md shadow-slate-900/15"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>

      {/* 3. Bento Grid Body */}
      <div className="tab-content">
        {tab === "overview" && (
          <PortalOverviewBento
            user={user}
            navigate={navigate}
            setTab={setTab}
            nextBooking={nextBooking}
            bookings={bookings}
            loading={loadingBookings}
          />
        )}
        {tab === "bookings" && <PortalMyBookings navigate={navigate} />}
        {tab === "profile" && <PortalProfile user={user} setUser={setUser} />}
        {tab === "settings" && (
          <div className="space-y-6">
            <PortalSettings user={user} setUser={setUser} />
            <PortalPrivacy user={user} navigate={navigate} setUser={setUser} />
          </div>
        )}
        {tab === "support" && <PortalSupport />}
      </div>
    </main>
  );
}

/* ==========================================================================
   Bento Grid Overview
   ========================================================================== */

function PortalOverviewBento({ user, navigate, setTab, nextBooking, bookings, loading }) {
  const { formatMoney } = useCurrency();
  const confirmedCount = bookings.filter(b => b.status === "CONFIRMED").length;
  const heldCount = bookings.filter(b => b.status === "ON_HOLD").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6" data-testid="account-overview">
      {/* Bento Cell 1 (8 Cols): Hero Next Flight / Flight Radar */}
      <div className="md:col-span-12 lg:col-span-8 bento-card p-6 sm:p-8 flex flex-col justify-between relative">
        <div className="bento-hero-glow bg-sky-500/10" />

        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Plane size={16} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Upcoming Flight
              </span>
            </div>
            {nextBooking && <StatusBadge status={nextBooking.status} />}
          </div>

          {nextBooking ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Upcoming Journey
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                    {nextBooking.slices?.[0]?.origin || "DEP"} → {nextBooking.slices?.[0]?.destination || "ARR"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="inline-flex items-center gap-2">
                      <AirlineLogo booking={nextBooking} size={22} />
                      <span>Airline: <b className="text-slate-800 dark:text-slate-200">{nextBooking.airline || "Scheduled Carrier"}</b> · Confirmation: <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{nextBooking.airline_pnr || "Pending"}</span></span>
                    </span>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Booking Reference
                  </span>
                  <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-300">
                    {nextBooking.booking_reference}
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {nextBooking.created_at ? new Date(nextBooking.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                  </div>
                </div>
              </div>

              {/* Slices summary strip */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Departing: <b className="text-slate-900 dark:text-white">{nextBooking.slices?.[0]?.departing_at ? new Date(nextBooking.slices[0].departing_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Scheduled"}</b>
                  </div>
                  <span className="text-slate-300 dark:text-white/20">·</span>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Travellers: <b className="text-slate-900 dark:text-white">{(nextBooking.passengers || []).length || 1} Adult</b>
                  </div>
                </div>

                {nextBooking.has_documents && <DocumentButtons booking={nextBooking} />}
              </div>
            </div>
          ) : (
            <div className="py-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                No flights booked yet
              </h3>
              <p className="text-sm text-slate-600 dark:text-white/60 mt-1 max-w-lg leading-relaxed">
                Discover live airline fares with taxes included and verified seat availability across leading alliances.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("home")}
                  className="spatial-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plane size={14} />
                  <span>Search Flights Now</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Confirmed: <b className="text-emerald-600 dark:text-emerald-400 font-bold">{confirmedCount}</b></span>
            <span>On Hold: <b className="text-amber-600 dark:text-amber-400 font-bold">{heldCount}</b></span>
            <span>Total: <b className="text-slate-900 dark:text-white font-bold">{bookings.length}</b></span>
          </div>

          <button
            type="button"
            onClick={() => setTab("bookings")}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Bookings</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Bento Cell 2 (4 Cols): Priority 24/7 Travel Desk */}
      <div className="md:col-span-12 lg:col-span-4 bento-card p-6 sm:p-7 flex flex-col justify-between relative bg-gradient-to-br from-emerald-500/[0.04] to-transparent">
        <div className="bento-hero-glow bg-emerald-500/10" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <HeadphonesIcon size={20} />
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Desk Online</span>
            </span>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Priority Concierge
          </span>
          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-snug">
            24/7 Human Flight Desk
          </h4>
          <p className="text-xs text-slate-600 dark:text-white/60 mt-1.5 leading-relaxed">
            Need urgent schedule changes, unpublished phone discounts, or special assistance?
          </p>

          <div className="mt-4 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Toll-Free Priority Line
            </span>
            <a
              href="tel:+18778184167"
              className="text-lg font-black font-mono text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 block transition-colors"
            >
              +1 (877) 818-4167
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTab("support")}
          className="mt-5 w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer bg-white/60 dark:bg-white/5"
        >
          <Mail size={14} />
          <span>Open Support Ticket</span>
        </button>
      </div>

      {/* Bento Cell 3 (4 Cols): Verified Passenger Identity */}
      <div className="md:col-span-6 lg:col-span-4 bento-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <User size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Profile
            </span>
          </div>

          <h5 className="text-base font-bold text-slate-900 dark:text-white">
            Traveler Details
          </h5>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-400">Legal Name</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Not Set"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-400">Email</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Phone</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {user?.phone || "None added"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTab("profile")}
          className="mt-4 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Update Passenger Info</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Bento Cell 4 (4 Cols): Security & GDPR Privacy */}
      <div className="md:col-span-6 lg:col-span-4 bento-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <LockKeyhole size={18} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={11} /> Protected
            </span>
          </div>

          <h5 className="text-base font-bold text-slate-900 dark:text-white">
            Security & Data Protection
          </h5>
          <p className="text-xs text-slate-600 dark:text-white/60 mt-1 leading-relaxed">
            Your personal account details and booking history are securely protected.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("settings")}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 text-xs font-semibold text-slate-700 dark:text-slate-200 text-center cursor-pointer"
          >
            Password & MFA
          </button>
          <a
            href="/my-account/settings"
            onClick={(e) => { e.preventDefault(); setTab("settings"); }}
            className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            title="Manage security settings"
          >
            <Shield size={13} />
            <span>Settings</span>
          </a>
        </div>
      </div>

      {/* Bento Cell 5 (4 Cols): Quick Actions Suite */}
      <div className="md:col-span-12 lg:col-span-4 bento-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
              <Sparkles size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Shortcuts
            </span>
          </div>

          <h5 className="text-base font-bold text-slate-900 dark:text-white">
            Helpful Resources
          </h5>

          <div className="mt-3 space-y-1.5 text-xs">
            <button
              onClick={() => navigate("help")}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span>Passenger Rights & FAQ</span>
              <ChevronRight size={13} className="text-slate-400" />
            </button>
            <button
              onClick={() => navigate("refund")}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span>Refund & 24hr Cancellation Rules</span>
              <ChevronRight size={13} className="text-slate-400" />
            </button>
            <button
              onClick={() => navigate("terms")}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span>Terms & Conditions of Carriage</span>
              <ChevronRight size={13} className="text-slate-400" />
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate("home")}
          className="mt-4 spatial-btn-primary w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <span>Search New Flights</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Bento Cell 6 (12 Cols): Recent Bookings Portfolio Bento */}
      {bookings.length > 0 && (
        <div className="md:col-span-12 bento-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Portfolio
              </span>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Recent Flight Reservations
              </h4>
            </div>
            <button
              onClick={() => setTab("bookings")}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all ({bookings.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {bookings.slice(0, 3).map((b) => (
              <div
                key={b.booking_reference || b.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-sky-400/30"
              >
                <div className="flex items-center gap-4">
                  <AirlineLogo booking={b} size={40} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {b.slices?.[0]?.origin} → {b.slices?.[0]?.destination}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ref: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{b.booking_reference}</span> · Carrier: {b.airline || "Airline"} · {b.created_at ? new Date(b.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(b.customer_total, b.currency || "USD")}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("bookingDetails", b.booking_reference)}
                    className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer bg-white dark:bg-white/5"
                  >
                    <span>Details</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Bookings Tab
   ========================================================================== */

export function PortalMyBookings({ navigate }) {
  const { formatMoney } = useCurrency();
  const [state, setState] = useState({ loading: true, bookings: [], error: "" });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    apiRequest("/my/bookings")
      .then(d => setState({ loading: false, bookings: d.bookings || [], error: "" }))
      .catch(() => setState({ loading: false, bookings: [], error: "We couldn't load your bookings." }));
  }, []);

  const filtered = state.bookings.filter(b => {
    if (filter === "confirmed") return b.status === "CONFIRMED";
    if (filter === "holds") return b.status === "ON_HOLD" || b.status === "AWAITING_PAYMENT";
    if (filter === "cancelled") return b.status === "CANCELLED" || b.status === "FAILED";
    return true;
  });

  return (
    <section className="space-y-6" data-testid="my-bookings-panel">
      {/* Bento Filter Strip */}
      <div className="bento-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-sky-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Flight Reservations</h3>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
          {[
            { id: "all", label: "All Flights" },
            { id: "confirmed", label: "Confirmed" },
            { id: "holds", label: "Held / Due" },
            { id: "cancelled", label: "Cancelled" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filter === f.id
                  ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {state.loading && (
        <div className="bento-card p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-600 dark:text-white/60 text-sm">Retrieving airline reservations…</p>
        </div>
      )}

      {state.error && (
        <div className="bento-card p-5 border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{state.error}</span>
        </div>
      )}

      {!state.loading && !state.error && filtered.length === 0 && (
        <div className="bento-card p-12 text-center" data-testid="my-bookings-empty">
          <Ticket size={48} className="mx-auto text-slate-300 dark:text-white/20 mb-4" />
          <b className="text-xl text-slate-900 dark:text-white block mb-1">No Bookings Found</b>
          <p className="text-slate-500 dark:text-white/50 text-sm max-w-md mx-auto mb-6">
            {filter === "all" ? "You haven't made any flight reservations yet." : `No bookings matching "${filter}".`}
          </p>
          <button
            className="spatial-btn-primary py-3 px-6 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg"
            onClick={() => navigate("home")}
          >
            <span>Search Flights Now</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {filtered.map(b => (
        <article
          key={b.booking_reference || b.id}
          className="bento-card p-6 sm:p-7 transition-all hover:border-cyan-400/40"
          data-testid={`booking-${b.booking_reference || b.id}`}
        >
          <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-3">
              <AirlineLogo booking={b} size={40} />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">BOOKING REFERENCE</span>
                <b className="text-xl text-cyan-600 dark:text-cyan-300 font-mono tracking-wider">{b.booking_reference}</b>
              {b.airline_pnr && (
                <span className="ml-3 text-xs text-slate-500 dark:text-white/60">
                  Airline code <b className="font-mono text-slate-900 dark:text-white">{b.airline_pnr}</b>
                </span>
              )}
              </div>
            </div>
            <StatusBadge status={b.status} />
          </header>

          {/* Slices */}
          <div className="py-4 space-y-3">
            {b.slices?.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Plane size={18} className="text-cyan-600 dark:text-cyan-400 rotate-45" />
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {s.origin} → {s.destination}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-white/60">
                  {s.departing_at ? new Date(s.departing_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Scheduled"}
                </div>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div>
              <dt className="text-slate-400 uppercase font-semibold">Travellers</dt>
              <dd className="text-slate-900 dark:text-white font-medium mt-0.5">
                {(b.passengers || []).map(p => `${p.given_name} ${p.family_name}`).join(", ") || "1 Adult"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-semibold">Date Booked</dt>
              <dd className="text-slate-900 dark:text-white font-medium mt-0.5">
                {b.created_at ? new Date(b.created_at).toLocaleDateString() : "Recent"}
              </dd>
            </div>
            {b.customer_total != null && (
              <div>
                <dt className="text-slate-400 uppercase font-semibold">{b.payment_status === "paid" ? "Total paid" : "Total"}</dt>
                <dd className="text-cyan-600 dark:text-cyan-300 font-bold text-sm mt-0.5">
                  {formatMoney(b.customer_total, b.currency || "USD")}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            {b.has_documents && b.status !== "REQUESTED" && <DocumentButtons booking={b} />}
            <button
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-cyan-400 text-cyan-600 dark:text-cyan-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-white dark:bg-white/5"
              onClick={() => navigate("bookingDetails", b.booking_reference)}
            >
              <span>View Itinerary Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ==========================================================================
   Passengers & Identity Tab
   ========================================================================== */

export function PortalProfile({ user, setUser }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const d = await apiRequest("/my/profile", { method: "PATCH", body: form });
      setUser(d.user);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6" data-testid="profile-panel">
      {/* Form Bento Card */}
      <div className="md:col-span-12 lg:col-span-8 bento-card p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Traveler Profile
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
          Legal first and last names must match your international government passport or photo ID for boarding.
        </p>

        {saved && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check size={16} /> Profile updated successfully.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Legal First / Given Name
              <input
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Legal Last / Family Name
              <input
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                required
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Contact Phone Number
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 019 283"
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Registered Email (Primary Login)
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm opacity-60 cursor-not-allowed"
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="spatial-btn-primary py-3 px-6 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>{busy ? "Saving Changes…" : "Save Passenger Information"}</span>
              <Check size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Info Checklist Bento Card */}
      <div className="md:col-span-12 lg:col-span-4 bento-card p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <ShieldCheck size={20} />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Travel Readiness Checklist
          </h4>
          <p className="text-xs text-slate-600 dark:text-white/60 mt-1 leading-relaxed">
            Airlines require strict adherence to international passport standards before ticketing.
          </p>

          <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-white/80">
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Passport valid for 6+ months from departure date</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Exact matching first & last legal names</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Valid transit visas (ESTA, eTA, Schengen)</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] text-slate-500 dark:text-white/50">
          Need name corrections on an existing booking? Call concierge desk at +1 (877) 818-4167.
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Security & Privacy Tabs
   ========================================================================== */

export function PortalSettings({ user, setUser }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await apiRequest("/my/change-password", {
        method: "POST",
        body: { current_password: form.current_password, new_password: form.new_password },
      });
      setSaved(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bento-card p-6 sm:p-8" data-testid="security-panel">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
        Change Account Password
      </h3>
      <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
        Passwords must be at least 8 characters with uppercase, lowercase, numbers, and special symbols.
      </p>

      {saved && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check size={16} /> Password updated. All other active sessions have been revoked.
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={submit} className="max-w-xl space-y-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          Current Password
          <input
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={e => setForm({ ...form, current_password: e.target.value })}
            required
            className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            New Password
            <input
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={e => setForm({ ...form, new_password: e.target.value })}
              required
              minLength={8}
              maxLength={128}
              className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Confirm New Password
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={e => setForm({ ...form, confirm_password: e.target.value })}
              required
              minLength={8}
              maxLength={128}
              className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="spatial-btn-primary py-3 px-6 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span>{busy ? "Updating…" : "Update Password"}</span>
          <LockKeyhole size={14} />
        </button>
      </form>
    </div>
  );
}

export function PortalPrivacy({ user, navigate, setUser }) {
  const [downloading, setDownloading] = useState(false);

  const exportData = async () => {
    setDownloading(true);
    try {
      const data = await apiRequest("/my/data");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `allskyfares-data-${user?.id || "export"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export data: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bento-card p-6 sm:p-8" data-testid="privacy-panel">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
        Privacy & Data Management
      </h3>
      <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
        You have full control over your personal flight records and account information.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex flex-col justify-between">
          <div>
            <b className="text-sm font-bold text-slate-900 dark:text-white block mb-1">
              Download Personal Archive
            </b>
            <p className="text-xs text-slate-500 dark:text-white/60 mb-4 leading-relaxed">
              Download a secure copy of your bookings, passenger profile, and account details.
            </p>
          </div>
          <button
            type="button"
            onClick={exportData}
            disabled={downloading}
            className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center gap-2 cursor-pointer bg-white dark:bg-white/5"
          >
            <Download size={14} />
            <span>{downloading ? "Generating Archive…" : "Download Personal Data"}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-500/20 flex flex-col justify-between">
          <div>
            <b className="text-sm font-bold text-rose-700 dark:text-rose-400 block mb-1">
              Right to Erasure
            </b>
            <p className="text-xs text-slate-600 dark:text-white/60 mb-4 leading-relaxed">
              Need your personal records erased? Our compliance desk executes data deletion requests within 30 days.
            </p>
          </div>
          <button
            type="button"
            onClick={() => alert("To request account deletion under GDPR/CCPA, please contact privacy@allskyfares.com or submit a ticket from Concierge Support.")}
            className="py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            Request Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Support Desk Tab
   ========================================================================== */

export function PortalSupport() {
  const [form, setForm] = useState({ subject: "", booking_reference: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await apiRequest("/support", { method: "POST", body: form });
      setSent(true);
      setForm({ subject: "", booking_reference: "", message: "" });
    } catch (err) {
      setError(err.message || "Failed to submit support request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6" data-testid="support-panel">
      {/* Support Form Bento */}
      <div className="md:col-span-12 lg:col-span-8 bento-card p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Concierge Support Inquiry
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
          Submit an inquiry directly to our reservations team. Standard response time is under 15 minutes.
        </p>

        {sent && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check size={16} /> Inquiry dispatched. An agent will contact you shortly.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Inquiry Subject
              <input
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                required
                placeholder="e.g. Flight schedule change"
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Booking Reference (Optional)
              <input
                value={form.booking_reference}
                onChange={e => setForm({ ...form, booking_reference: e.target.value.toUpperCase() })}
                placeholder="e.g. ASF1234"
                maxLength={20}
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono uppercase"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Message
            <textarea
              rows={4}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              required
              placeholder="Describe your request in detail..."
              className="spatial-input w-full p-3.5 rounded-xl text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="spatial-btn-primary py-3 px-6 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>{busy ? "Dispatching…" : "Send Message to Concierge"}</span>
            <ArrowRight size={14} />
          </button>
        </form>
      </div>

      {/* Emergency Hotline Bento */}
      <div className="md:col-span-12 lg:col-span-4 bento-card p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Phone size={20} className="animate-pulse" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Urgent Departure Assistance
          </h4>
          <p className="text-xs text-slate-600 dark:text-white/60 mt-1 leading-relaxed">
            If your flight departs within 24 hours, do not wait for an email response. Call our priority travel desk directly.
          </p>

          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Direct Agent Dispatch
            </span>
            <a
              href="tel:+18778184167"
              className="text-xl font-black font-mono text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block mt-0.5"
            >
              +1 (877) 818-4167
            </a>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-400 dark:text-white/40 leading-relaxed">
          Available 24 hours a day, 7 days a week, 365 days a year worldwide.
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Booking Details View (Bento Redesign)
   ========================================================================== */

export function BookingDetailsView({ navigate }) {
  const { formatMoney } = useCurrency();
  const id = window.location.pathname.split("/").pop();
  const [state, setState] = useState({ loading: true, booking: null, error: "" });

  useEffect(() => {
    if (!id) return;
    apiRequest(`/my/bookings/${encodeURIComponent(id)}`)
      .then(d => setState({ loading: false, booking: d.booking, error: "" }))
      .catch(e => setState({ loading: false, booking: null, error: e.message || "Failed to load booking" }));
  }, [id]);

  if (state.loading) {
    return (
      <main className="account-page max-w-4xl mx-auto px-4 pt-24 sm:pt-28 pb-12">
        <div className="bento-card p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-600 dark:text-white/60 text-sm">Retrieving reservation itinerary...</p>
        </div>
      </main>
    );
  }

  if (state.error || !state.booking) {
    return (
      <main className="account-page max-w-4xl mx-auto px-4 pt-24 sm:pt-28 pb-12">
        <div className="bento-card p-6 border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm mb-4">
          {state.error || "Booking not found"}
        </div>
        <button
          className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold cursor-pointer"
          onClick={() => navigate("bookings")}
        >
          ← Back to bookings
        </button>
      </main>
    );
  }

  const b = state.booking;
  const update = (booking) => setState((st) => ({ ...st, booking }));

  return (
    <main className="account-page max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16" data-testid="booking-details-page">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors mb-2 cursor-pointer"
            onClick={() => navigate("bookings")}
          >
            <ArrowRight size={13} className="rotate-180" />
            <span>Back to Reservations</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{b.booking_reference}</h1>
            <StatusBadge status={b.status} />
          </div>
        </div>

        {b.has_documents && b.status !== "REQUESTED" && <DocumentButtons booking={b} />}
      </div>

      {b.status === "ON_HOLD" && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <b>Your seats are held with the airline.</b> Payment is needed{b.payment_required_by ? ` by ${new Date(b.payment_required_by).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""} for tickets to be issued. Our reservations team will contact you, or call us to pay now.
        </div>
      )}

      {/* Bento Grid for Booking Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Flight Segments Bento Cell (8 Cols) */}
        <div className="md:col-span-12 lg:col-span-8 bento-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plane size={18} className="text-sky-500" />
              <span>Flight Segments</span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <AirlineLogo booking={b} size={24} />
              <span>Carrier: <b>{b.airline || "Scheduled Airline"}</b></span>
            </div>
          </div>

          <div className="space-y-3">
            {b.slices?.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-lg">
                    {s.origin} → {s.destination}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.duration?.replace("PT", "").toLowerCase() || "Non-stop"} · {s.stops === 0 ? "Nonstop Flight" : `${s.stops} stop(s)`}
                  </div>
                </div>
                <div className="text-xs text-cyan-600 dark:text-cyan-300 font-mono font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/40 self-start sm:self-auto">
                  {s.departing_at ? new Date(s.departing_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/60 dark:border-white/10 pt-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Passengers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(b.passengers || []).map((p, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Passenger {i + 1}</span>
                  <b className="text-slate-900 dark:text-white text-sm">{p.given_name} {p.family_name}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial & Actions Bento Cell (4 Cols) */}
        <div className="md:col-span-12 lg:col-span-4 space-y-6">
          <div className="bento-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Fare Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Airline PNR</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{b.airline_pnr || "Pending"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-bold uppercase text-slate-900 dark:text-white">{b.payment_status || "Standard"}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Amount</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {formatMoney(b.customer_total, b.currency || "USD")}
                </span>
              </div>
            </div>

            {b.can_cancel && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-white/10">
                <CancelBooking
                  base={`/my/bookings/${encodeURIComponent(b.booking_reference)}`}
                  onCancelled={update}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-center cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default CustomerPortalView;
