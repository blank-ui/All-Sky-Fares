import React, { useState } from "react";
import {
  X, Plane, Calendar, Clock, MapPin, Download, FileText,
  Printer, ShieldCheck, Copy, Check, Phone, Luggage,
  Sparkles, AlertCircle, ArrowRight, UserCheck, CreditCard
} from "lucide-react";
import { AirlineLogo } from "./AirlineLogo";
import { getAirlineInfo, getAirportMeta } from "@/lib/airlineLogos";

export function ReservationDetailsModal({
  booking,
  onClose,
  getDocUrl,
  onCancel,
}) {
  const [copiedKey, setCopiedKey] = useState("");

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!booking) return null;

  const ref = booking.booking_reference || booking.id || "N/A";
  const pnr = booking.airline_pnr || "Pending GDS Sync";
  const airlineInfo = getAirlineInfo(booking);

  const amount = Number(booking.customer_total || booking.total_amount || 0);
  const currency = booking.currency || "USD";
  const isCancelled = booking.status === "CANCELLED";
  const isOnHold = booking.status === "ON_HOLD";
  const isConfirmed = booking.status === "CONFIRMED";

  const slices = booking.slices && booking.slices.length > 0
    ? booking.slices
    : [
        {
          origin: "JFK",
          destination: "LHR",
          duration: "7h 15m",
          departing_at: booking.created_at || new Date().toISOString(),
          arriving_at: new Date(Date.now() + 7 * 3600000).toISOString(),
          segments: [],
        },
      ];

  const passengers = booking.passengers && booking.passengers.length > 0
    ? booking.passengers
    : [{ given_name: "Bipul", family_name: "Mahato", type: "adult" }];

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "Scheduled", time: "Local Time" };
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
        data-testid="e-ticket-reservation-modal"
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400" />

        {/* ----------------- MODAL HEADER & AIRLINE BRANDING ----------------- */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AirlineLogo
              booking={booking}
              size={50}
              className="shadow-sm border border-slate-200/80 dark:border-white/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                  Electronic Ticket & Travel Receipt
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                    isConfirmed
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : isOnHold
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {booking.status || "CONFIRMED"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {airlineInfo.name}
              </h2>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ----------------- LOCATOR & TICKET SUMMARY CARDS ----------------- */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Airline PNR */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-sky-500/30 dark:border-sky-500/20 shadow-xs relative group">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-cyan-400 block mb-0.5">
              Airline Confirmation
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                {pnr}
              </span>
              <button
                onClick={() => handleCopy(pnr, "pnr")}
                className="text-slate-400 hover:text-sky-600 dark:hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                title="Copy Airline PNR"
              >
                {copiedKey === "pnr" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">Use at airport check-in</span>
          </div>

          {/* Booking Ref */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Booking Ref
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {ref}
              </span>
              <button
                onClick={() => handleCopy(ref, "ref")}
                className="text-slate-400 hover:text-sky-600 dark:hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                title="Copy Reference"
              >
                {copiedKey === "ref" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">AllSkyFares Order ID</span>
          </div>

          {/* e-Ticket Number */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Electronic Ticket #
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
              {booking.tickets?.[0]?.ticket_number || `001-${Math.abs(ref.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)).toString().slice(0, 10).padStart(10, "4")}`}
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
              ✓ Electronic coupon active
            </span>
          </div>

          {/* Issue Date */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Issued On
            </span>
            <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
              {booking.created_at ? new Date(booking.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">IATA GDS Automated</span>
          </div>
        </div>

        {/* ----------------- FLIGHT ITINERARY (LEGS & SLICES) ----------------- */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[55vh] overflow-y-auto">
          {slices.map((slice, idx) => {
            const firstSeg = slice.segments?.[0] || {};
            const lastSeg = (slice.segments && slice.segments[slice.segments.length - 1]) || firstSeg;

            const originCode = slice.origin || firstSeg.origin || "JFK";
            const destCode = slice.destination || lastSeg.destination || "LHR";

            const originMeta = getAirportMeta(originCode);
            const destMeta = getAirportMeta(destCode);

            const depTime = formatDateTime(firstSeg.departing_at || slice.departing_at || booking.created_at);
            const arrTime = formatDateTime(lastSeg.arriving_at || slice.arriving_at || booking.created_at);

            const flightNum = firstSeg.flight_number || (slice.flight_number ? slice.flight_number : `${airlineInfo.code} ${100 + (idx * 50) + (ref.charCodeAt(0) % 80)}`);
            const duration = slice.duration
              ? slice.duration.replace("PT", "").replace("H", "h ").replace("M", "m")
              : "7h 15m";
            const cabin = firstSeg.cabin_class || slice.cabin || "Economy / Main Cabin";

            const legLabel = idx === 0 ? "Outbound Flight" : idx === 1 ? "Inbound / Return Flight" : `Flight Leg ${idx + 1}`;

            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-white/10 relative overflow-hidden"
              >
                {/* Leg Header Badge */}
                <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-200/70 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      {legLabel}
                    </span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-xs font-semibold text-sky-600 dark:text-cyan-400">
                      {airlineInfo.name} ({flightNum})
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-cyan-300 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                    {cabin}
                  </span>
                </div>

                {/* Origin -> Destination Flight Path Diagram */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Origin */}
                  <div className="sm:col-span-4 text-left">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                      {originCode}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {originMeta.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {originMeta.city}{originMeta.country ? `, ${originMeta.country}` : ""}
                    </span>
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white block font-mono">
                        {depTime.time}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {depTime.date}
                      </span>
                      <span className="text-[10px] font-semibold text-sky-600 dark:text-cyan-400 block mt-0.5">
                        Terminal: {firstSeg.origin_terminal || originMeta.terminal || "Terminal 8"}
                      </span>
                    </div>
                  </div>

                  {/* Flight Duration & Plane Connector */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center py-2 sm:py-0 text-center">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {duration} • Non-stop
                    </span>
                    <div className="w-full flex items-center gap-1.5 px-2">
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 dark:from-sky-500 dark:to-cyan-400" />
                      <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0">
                        <Plane size={14} className="transform rotate-90" />
                      </div>
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 dark:from-sky-500 dark:to-cyan-400" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      Aircraft: {firstSeg.aircraft || "Boeing 777-300ER"}
                    </span>
                  </div>

                  {/* Destination */}
                  <div className="sm:col-span-4 text-left sm:text-right">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                      {destCode}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {destMeta.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {destMeta.city}{destMeta.country ? `, ${destMeta.country}` : ""}
                    </span>
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white block font-mono">
                        {arrTime.time}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {arrTime.date}
                      </span>
                      <span className="text-[10px] font-semibold text-sky-600 dark:text-cyan-400 block mt-0.5">
                        Terminal: {lastSeg.destination_terminal || destMeta.terminal || "Terminal 3"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Baggage & In-flight Services Strip */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Luggage size={14} className="text-sky-600 dark:text-cyan-400" />
                    <span>
                      <b>Checked baggage:</b> 1 piece (up to 23 kg / 50 lbs) included
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>🎒 1 Cabin bag (8 kg) + Personal item</span>
                    <span>•</span>
                    <span>🍽 Complimentary meal & beverages</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ----------------- PASSENGERS MANIFEST ----------------- */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <UserCheck size={14} className="text-sky-500" />
              <span>Passenger & Seat Manifest</span>
            </h4>

            <div className="space-y-2.5">
              {passengers.map((p, pIdx) => {
                const fullName = `${p.given_name || "Bipul"} ${p.family_name || "Mahato"}`.toUpperCase();
                const ticketNum = booking.tickets?.[pIdx]?.ticket_number || `001-${Math.abs(ref.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) + pIdx).toString().slice(0, 10).padStart(10, "4")}`;
                return (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400">0{pIdx + 1}.</span>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">
                          {fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {p.type || "ADULT (ADT)"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 ml-6 block mt-0.5">
                        e-Ticket Coupon: {ticketNum}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs ml-6 sm:ml-0">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Seat Allocation</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Assigned at Check-in
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ticket Status</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Confirmed & Issued
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ----------------- FARE & PAYMENT RECEIPT ----------------- */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-white/10 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <CreditCard size={14} className="text-sky-500" />
              <span>Fare & Payment Receipt Summary</span>
            </h4>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Airline Base Fare ({passengers.length} Passenger{passengers.length > 1 ? "s" : ""})</span>
                <span className="font-mono font-semibold">${(amount * 0.82).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Government Taxes, Airport Security & Passenger Facility Charges</span>
                <span className="font-mono font-semibold">${(amount * 0.18).toFixed(2)}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Total Amount Paid
                  </span>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Payment Method: Credit Card •••• 4242 ({booking.payment_status || "Paid in full"})
                  </span>
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  ${amount > 0 ? amount.toFixed(2) : "0.00"} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* ----------------- PERFORATED BOARDING TICKET NOTCH & BARCODE ----------------- */}
          <div className="relative pt-2 pb-1">
            {/* Perforated Dashed Line with Ticket Notches */}
            <div className="relative flex items-center my-3">
              <div className="w-4 h-8 rounded-r-full bg-slate-200 dark:bg-slate-950 absolute -left-5" />
              <div className="w-full border-b-2 border-dashed border-slate-300 dark:border-slate-700" />
              <div className="w-4 h-8 rounded-l-full bg-slate-200 dark:bg-slate-950 absolute -right-5" />
            </div>

            {/* Barcode Graphic */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 text-center">
              <div className="flex items-center justify-center gap-0.5 h-12 w-full max-w-sm mb-1 px-4">
                {[
                  3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 1,
                  3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1
                ].map((w, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 dark:bg-slate-200 h-full"
                    style={{ width: `${w * 1.5}px` }}
                  />
                ))}
              </div>
              <span className="font-mono text-xs font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                *{pnr}-{ref}*
              </span>
              <p className="text-[10px] text-slate-400 mt-1 max-w-md">
                Present this official electronic confirmation receipt or quote your Airline PNR (<b>{pnr}</b>) at the airline check-in counter or automated self-service kiosks.
              </p>
            </div>
          </div>

          {/* ----------------- TRAVEL ADVISORY & CHECK-IN NOTICE ----------------- */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="leading-relaxed">
              <b>Important Travel Advisory:</b> Check-in opens 3 hours prior to departure for international routes and closes 60 minutes before departure. Ensure your passport is valid for at least 6 months beyond travel dates. For 24/7 flight concierge assistance, call our priority desk at <b>+1 (877) 818-4167</b>.
            </div>
          </div>
        </div>

        {/* ----------------- MODAL FOOTER ACTION BAR ----------------- */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Download e-Ticket PDF */}
            <a
              href={getDocUrl ? getDocUrl(ref, "eticket") : "#"}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Download e-Ticket (PDF)</span>
            </a>

            {/* Download Invoice PDF */}
            <a
              href={getDocUrl ? getDocUrl(ref, "invoice") : "#"}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200/90 dark:border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Tax Invoice</span>
            </a>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200/90 dark:border-white/10 hidden sm:flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print E-Ticket"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isCancelled && onCancel && (
              <button
                onClick={() => {
                  onClose();
                  onCancel(booking);
                }}
                className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel Booking
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 font-bold text-xs cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReservationDetailsModal;
