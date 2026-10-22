import React from "react";
import { ShieldCheck, LockKeyhole, Plane, Mail, Phone, ArrowUpRight, MapPin } from "lucide-react";
import { LEGAL, legalEntity } from "@/constants/legal";
import { openCookiePreferences } from "./CookieConsent";
import { Logo } from "./Logo";

export function Footer({ navigate, dark = true }) {
  return (
    <footer
      data-testid="site-footer"
      className={`border-t transition-colors duration-300 relative z-10 ${
        dark ? "bg-slate-950 text-slate-300 border-white/10" : "bg-white text-slate-800 border-slate-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-200/60 dark:border-white/10">
          
          {/* Brand & About */}
          <div className="lg:col-span-4 space-y-4">
            <button 
              onClick={() => navigate("home")}
              className="flex items-center gap-2 text-inherit bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
            >
              <Logo size={36} showText={true} />
            </button>
            <p className={`text-xs leading-relaxed max-w-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
              Live global airline inventory, transparent fares with taxes &amp; fees included, and a dedicated 24/7 priority concierge desk.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={LEGAL.phoneHref}
                className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                title="Call 24/7 Concierge Hotline"
              >
                <Phone size={14} className="shrink-0" />
                <span className="font-mono">{LEGAL.phone}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">24/7 Hotline</span>
              </a>
              <a
                href={`mailto:${LEGAL.supportEmail}`}
                className={`flex items-center gap-2 text-xs transition-colors ${dark ? "text-slate-400 hover:text-cyan-400" : "text-slate-600 hover:text-cyan-600"}`}
              >
                <Mail size={14} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span>{LEGAL.supportEmail}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <b className={`text-xs font-bold uppercase tracking-wider block ${dark ? "text-white" : "text-slate-900"}`}>
              Explore
            </b>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  data-testid="footer-flights-link"
                  onClick={() => navigate("home")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Flights Search
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-destinations-link"
                  onClick={() => {
                    navigate("home");
                    setTimeout(() => {
                      const el = document.getElementById("destinations");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Featured Destinations
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-help-link"
                  onClick={() => navigate("help")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Help Center &amp; FAQ
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-support-link"
                  onClick={() => navigate("support")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Contact Concierge
                </button>
              </li>
            </ul>
          </div>

          {/* Upcoming Verticals */}
          <div className="lg:col-span-2 space-y-3">
            <b className={`text-xs font-bold uppercase tracking-wider block ${dark ? "text-white" : "text-slate-900"}`}>
              Travel Products
            </b>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <span className={dark ? "text-slate-300 font-medium" : "text-slate-800 font-semibold"}>Flights</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">Live</span>
              </li>
              <li>
                <button
                  data-testid="footer-hotels-link"
                  onClick={() => navigate("hotels")}
                  className={`transition-colors flex items-center gap-1.5 ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  <span>Hotels</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold">Preview</span>
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-cars-link"
                  onClick={() => navigate("cars")}
                  className={`transition-colors flex items-center gap-1.5 ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  <span>Car Rental</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold">Preview</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div className="lg:col-span-2 space-y-3">
            <b className={`text-xs font-bold uppercase tracking-wider block ${dark ? "text-white" : "text-slate-900"}`}>
              Legal &amp; Trust
            </b>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  data-testid="footer-privacy-link"
                  onClick={() => navigate("privacy")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-terms-link"
                  onClick={() => navigate("terms")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-refund-link"
                  onClick={() => navigate("refund")}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button
                  data-testid="footer-cookies-link"
                  onClick={openCookiePreferences}
                  className={`transition-colors ${dark ? "hover:text-cyan-300 text-slate-400" : "hover:text-cyan-600 text-slate-600"}`}
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>

          {/* Trust badges */}
          <div className="lg:col-span-2 space-y-3">
            <b className={`text-xs font-bold uppercase tracking-wider block ${dark ? "text-white" : "text-slate-900"}`}>
              Security &amp; Trust
            </b>
            <div className={`space-y-2 text-xs font-medium ${dark ? "text-slate-400" : "text-slate-600"}`}>
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>256-Bit SSL Protection</span>
              </span>
              <span className="flex items-center gap-2">
                <LockKeyhole size={14} className={dark ? "text-cyan-400 shrink-0" : "text-cyan-600 shrink-0"} />
                <span>No card numbers stored</span>
              </span>
              <span className="flex items-center gap-2">
                <Plane size={14} className={dark ? "text-sky-400 shrink-0" : "text-sky-600 shrink-0"} />
                <span>Live airline inventory</span>
              </span>
            </div>
          </div>
        </div>

        {/* Structured Corporate & Regulatory Bar */}
        <div className="pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className={`font-semibold flex flex-wrap items-center gap-x-2 gap-y-1 ${dark ? "text-slate-300" : "text-slate-800"}`}>
              <span>&copy; {new Date().getFullYear()} {legalEntity()}.</span>
              <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">&bull;</span>
              <span className="font-normal text-slate-500 dark:text-slate-400">All rights reserved.</span>
            </div>
            {LEGAL.address && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                <MapPin size={11} className="text-sky-500 shrink-0" />
                <span>{LEGAL.address}</span>
              </div>
            )}
          </div>

          {LEGAL.sellerOfTravel && (
            <div className="md:max-w-md lg:max-w-lg md:text-right">
              <span className={`inline-block px-3 py-1.5 rounded-xl text-[11px] leading-relaxed border ${
                dark 
                  ? "bg-white/[0.03] border-white/10 text-slate-400" 
                  : "bg-slate-50 border-slate-200/80 text-slate-600"
              }`}>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Regulatory Status: </span>
                Registered in Wyoming (All Sky Fares LLC). Seller of travel registrations pending in applicable jurisdictions &bull; Client trust protections maintained.
              </span>
            </div>
          )}
        </div>

        {/* Legal Disclaimers: Trademark Notice & Operating Structure */}
        <div className={`pt-4 pb-20 sm:pb-12 border-t space-y-2.5 text-[11px] leading-relaxed ${dark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-500"}`}>
          <p>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Trademark &amp; Non-Endorsement Notice:</span> All airline names, carrier logos, brand marks, airport identifiers, and registered trademarks displayed on this website are the intellectual property of their respective owners. Their display and mention on AllSkyFares are strictly for truthful, nominative identification, descriptive purposes, and flight itinerary discovery. Reference to any airline or brand mark does not constitute or imply official sponsorship, affiliation, partnership endorsement, or direct corporate association with AllSkyFares.
          </p>
          <p>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Operating Structure:</span> AllSkyFares is an independent flight booking intermediary and retail travel agency operated on behalf of All Sky Fares LLC. All client reservations, ticketing arrangements, and travel agreements are legally administered and executed by All Sky Fares LLC. Quoted fares include all mandatory government taxes, carrier surcharges, and our service fee.
          </p>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
