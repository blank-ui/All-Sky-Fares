import { useCurrency } from "@/context/CurrencyContext";
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { API, apiRequest } from "@/lib/api";

// Duffel's card form (it loads Stripe), only fetched when a customer reaches the payment step.
const DuffelPayments = lazy(() => import("@duffel/components").then((m) => ({ default: m.DuffelPayments })));
import { Check, ArrowRight, ShieldCheck, UserCheck, Plane, Lock, AlertCircle, Info, Ticket, CreditCard, Sparkles, ChevronRight } from "lucide-react";

const newPassenger = (user, isLead) => ({
  type: "adult",
  title: "mr",
  gender: "m",
  given_name: isLead ? user?.first_name || "" : "",
  family_name: isLead ? user?.last_name || "" : "",
  born_on: "",
  email: user?.email || "",
  phone_number: user?.phone || "",
});

const newIdempotencyKey = () =>
  window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function CheckoutView({ offer, user, onComplete, onCancel, onSignIn }) {
  const { formatMoney, currency } = useCurrency();
  // No sign-in needed: guests book with the lead passenger's details and get an account by email.
  const isGuest = !user;
  const guestToken = useRef(null);
  // The fare is priced for a fixed number of travellers; Duffel rejects any other count.
  const requiredPassengers = Math.max(1, Number(offer?.passenger_count) || 1);
  const [passengers, setPassengers] = useState(() =>
    Array.from({ length: requiredPassengers }, (_, i) => newPassenger(user, i === 0))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per checkout attempt so retries and double-clicks never create two orders.
  const idempotencyKey = useRef(newIdempotencyKey());
  const [accepted, setAccepted] = useState(false);
  // "card" = pay now by card through Duffel, then tickets are issued; "hold" = seats are held with the
  // airline (real booking code) and our team takes payment before the airline's deadline.
  const [mode, setMode] = useState({ mode: "hold", test: false });
  useEffect(() => {
    apiRequest("/booking-mode").then(setMode).catch(() => {});
  }, []);
  const isCard = mode.mode === "card";
  const [payment, setPayment] = useState(null); // { clientToken, booking } once the card step starts
  const [cardCharged, setCardCharged] = useState(false); // card accepted; only our confirm is left

  const updatePassenger = (idx, key, val) => {
    setPassengers(passengers.map((p, i) => (i === idx ? { ...p, [key]: val } : p)));
  };

  const addPassenger = () => {
    if (passengers.length >= requiredPassengers) return;
    setPassengers([...passengers, newPassenger(user, false)]);
  };

  const removePassenger = (idx) => {
    if (passengers.length <= requiredPassengers) return;
    setPassengers(passengers.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    // Once the card step has started, only the card form's own Pay button acts.
    if (payment) return;
    setError("");
    setBusy(true);
    try {
      const lead = passengers[0];
      const contact = isGuest
        ? { email: lead.email, first_name: lead.given_name, last_name: lead.family_name, phone: lead.phone_number }
        : undefined;
      const d = await apiRequest("/my/checkout", {
        method: "POST",
        body: { offer_id: offer.id, passengers, contact, idempotency_key: idempotencyKey.current, accept_terms: accepted },
      });
      if (d.checkout_token) guestToken.current = d.checkout_token;
      if (d.step === "payment") setPayment({ clientToken: d.client_token, booking: d.booking });
      else onComplete(d.booking, guestToken.current);
    } catch (err) {
      setError(err.message || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async () => {
    setCardCharged(true);
    setError("");
    setBusy(true);
    try {
      const d = await apiRequest("/my/checkout/confirm", {
        method: "POST",
        body: { booking_reference: payment.booking.booking_reference, checkout_token: guestToken.current || undefined },
      });
      onComplete(d.booking, guestToken.current);
    } catch (err) {
      setError(err.message || "We couldn't confirm your payment.");
      if (err.status === 409) {
        setPayment(null);
        setCardCharged(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="checkout-page max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12" data-testid="checkout-page">
      {/* Top Header Badge */}
      <div className="checkout-head mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="spatial-tag px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-sky-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/60">
            Secure Booking Checkout
          </span>
          <span className="text-xs text-slate-400 dark:text-white/50 flex items-center gap-1">
            <Lock size={12} className="text-emerald-600 dark:text-emerald-400" /> 256-bit Encrypted
          </span>
        </div>

        {/* Phones and tablets quick trip banner */}
        <div className="lg:hidden mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900/60" data-testid="checkout-trip-bar">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{offer.airline}</div>
            <div className="truncate text-xs text-slate-500 dark:text-white/60">
              {(offer.slices || []).map((s) => `${s.origin} → ${s.destination}`).join(" · ")}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Total</div>
            <div className="whitespace-nowrap tabular-nums text-base font-extrabold text-slate-900 dark:text-white">{formatMoney(offer.total, offer.currency)}</div>
          </div>
        </div>
      </div>

      {/* Passenger & Travel Details Heading */}
      <div className="mb-6 space-y-1">
        <h1 data-testid="checkout-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Passenger &amp; Travel Details
        </h1>
        <p className="text-slate-600 dark:text-white/60 text-xs sm:text-sm">
          Review your journey and enter legal passenger names as displayed on passport/ID.
        </p>
      </div>
      {isGuest && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-400/20 dark:bg-sky-500/10" data-testid="guest-checkout-note">
              <UserCheck size={20} className="shrink-0 text-sky-600 dark:text-sky-300" />
              <div className="flex-1 text-slate-700 dark:text-white/80">
                <b className="text-slate-900 dark:text-white">No account needed.</b> We'll email your booking to the lead passenger's address, with a link to set a password, or sign in any time with a one-time code.
              </div>
              {onSignIn && (
                <button type="button" onClick={onSignIn} className="shrink-0 self-start sm:self-auto rounded-xl border border-sky-300 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-white dark:border-sky-400/30 dark:text-sky-200 dark:hover:bg-white/5" data-testid="guest-sign-in">
                  Have an account? Sign in
                </button>
              )}
            </div>
          )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column */}
        {/* The card form (Duffel) is a <form> of its own, so it must not sit inside this one:
            nested, its submit never reaches Duffel's handler and the browser reloads the page. */}
        <div className="lg:col-span-8 space-y-6">
          <form
          id="checkout-form"
          className="checkout-form space-y-6"
          onSubmit={submit}
          data-testid="checkout-form"
        >
          

          {passengers.map((p, i) => (
            <fieldset
              key={i}
              disabled={Boolean(payment) || busy}
              data-testid={`passenger-${i + 1}`}
              className="liquid-glass-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <legend className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                      Passenger {i + 1} ({p.type.toUpperCase()})
                    </legend>
                    <span className="text-xs text-slate-400 dark:text-white/50">Primary traveller details</span>
                  </div>
                </div>
                {passengers.length > requiredPassengers && (
                  <button
                    type="button"
                    onClick={() => removePassenger(i)}
                    className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Title
                  <select
                    data-testid={`passenger-${i + 1}-title`}
                    value={p.title}
                    onChange={(e) => updatePassenger(i, "title", e.target.value)}
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  >
                    <option value="mr">Mr</option>
                    <option value="mrs">Mrs</option>
                    <option value="ms">Ms</option>
                    <option value="miss">Miss</option>
                    <option value="dr">Dr</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Gender
                  <select
                    data-testid={`passenger-${i + 1}-gender`}
                    value={p.gender}
                    onChange={(e) => updatePassenger(i, "gender", e.target.value)}
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  >
                    <option value="m">Male</option>
                    <option value="f">Female</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Given / First Name
                  <input
                    data-testid={`passenger-${i + 1}-first-name`}
                    value={p.given_name}
                    onChange={(e) => updatePassenger(i, "given_name", e.target.value)}
                    required
                    placeholder="e.g. Alexander"
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Family / Last Name
                  <input
                    data-testid={`passenger-${i + 1}-last-name`}
                    value={p.family_name}
                    onChange={(e) => updatePassenger(i, "family_name", e.target.value)}
                    required
                    placeholder="e.g. Vance"
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Date of Birth
                  <input
                    data-testid={`passenger-${i + 1}-dob`}
                    type="date"
                    value={p.born_on}
                    onChange={(e) => updatePassenger(i, "born_on", e.target.value)}
                    required
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                  Phone Number
                  <input
                    data-testid={`passenger-${i + 1}-phone`}
                    type="tel"
                    value={p.phone_number}
                    onChange={(e) => updatePassenger(i, "phone_number", e.target.value)}
                    required
                    placeholder="+1 555 019 283"
                    className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/70">
                Email Address for E-Ticket
                <input
                  data-testid={`passenger-${i + 1}-email`}
                  type="email"
                  value={p.email}
                  onChange={(e) => updatePassenger(i, "email", e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </label>
            </fieldset>
          ))}

          {/* Add passenger button */}
          {passengers.length < requiredPassengers && (
            <button
              type="button"
              onClick={addPassenger}
              className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-cyan-400 dark:hover:border-cyan-400/50 text-slate-500 dark:text-white/70 hover:text-cyan-600 dark:hover:text-cyan-300 text-sm font-medium transition-all flex items-center justify-center gap-2 hover:bg-cyan-50 dark:hover:bg-cyan-500/5"
            >
              + Add another passenger
            </button>
          )}

          {/* What happens next */}
          <div className="p-5 rounded-2xl border border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/20 flex items-start gap-3" data-testid="checkout-mode-notice">
            {isCard ? <CreditCard className="text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" size={20} /> : <Info className="text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" size={20} />}
            <div className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">
              {isCard ? (
                <>
                  <b className="block mb-0.5 text-slate-900 dark:text-white">Pay securely by card</b>
                  Your card is processed by Duffel, our airline booking partner; we never see or store your card number. Your tickets are issued as soon as the payment goes through.
                </>
              ) : (
                <>
                  <b className="block mb-0.5 text-slate-900 dark:text-white">Reserve now, pay with our team</b>
                  We'll hold your seats with the airline and give you the airline booking code straight away. Nothing is charged online: our reservations team will contact you to take payment before the airline's deadline, then your tickets are issued.
                </>
              )}
              {mode.test && <span className="block mt-1 text-amber-700 dark:text-amber-300">Test mode: no real booking is made.</span>}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-white/70 leading-relaxed space-y-3">
            <p>
              <b className="text-slate-900 dark:text-white">Airline fees & carriage rules.</b> The total fare shown includes airline government taxes and our booking service fee. Airlines may charge extra for checked bags, seat selection and other ancillary services. See {offer.airline ? `${offer.airline}'s` : "the airline's"} website for its baggage allowances. Fare rules, changes, and cancellations are set by the carrier.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>US DOT & Passenger Rights Disclosures</span>
              </div>
              <p className="text-slate-500 dark:text-white/60 leading-normal">
                <b>24-Hour Cancellation:</b> Qualifying US flights booked at least 7 days before departure can be cancelled within 24 hours of booking for a 100% full cash refund.
              </p>
              <p className="text-slate-500 dark:text-white/60 leading-normal">
                <b>Hazardous Materials Notice (FAA/DOT):</b> Federal law forbids the carriage of hazardous materials (e.g. aerosols, fireworks, lithium batteries, flammable liquids) aboard aircraft in baggage or on your person (49 CFR § 175.25).
              </p>
              <p className="text-slate-500 dark:text-white/60 leading-normal">
                <b>Carrier Liability:</b> International carriage is subject to the rules and limitations relating to liability established by the Montreal Convention or Warsaw Convention. AllSkyFares acts solely as an independent travel agency/booking agent.
              </p>
            </div>
            

            <div className="w-full block">
              <label className="flex items-start gap-3.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-white/80 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 select-none" data-testid="checkout-terms">
                <input 
                  type="checkbox" 
                  checked={accepted} 
                  onChange={(e) => setAccepted(e.target.checked)} 
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-orange-600 cursor-pointer mr-1" 
                  data-testid="checkout-terms-checkbox" 
                  required 
                />
                <span className="leading-relaxed">
                  I've checked the passenger names match their passports, and I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-sky-600 underline dark:text-sky-400">Terms of Service</a>,{" "}
                  <a href="/refund" target="_blank" rel="noreferrer" className="font-semibold text-sky-600 underline dark:text-sky-400">Refund Policy</a> and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-sky-600 underline dark:text-sky-400">Privacy Policy</a>, and to the airline's fare rules and conditions of carriage.
                </span>
              </label>
            </div>
          </div>

        </form>

          {payment && (
            <div
              className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-3"
              data-testid="card-payment"
            >
              <div className="flex items-center justify-between">
                <b className="text-slate-900 dark:text-white flex items-center gap-2"><Lock size={16} /> Card payment</b>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{offer.currency} {offer.total.toFixed(2)}</span>
              </div>
              {busy ? (
                <div className="py-6 flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-white/60" data-testid="card-payment-confirming">
                  <div className="w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                  Confirming your payment and issuing tickets…
                </div>
              ) : cardCharged ? (
                <div className="py-4 space-y-3 text-sm text-slate-600 dark:text-white/70">
                  <p>Your card was accepted, but we couldn't finish confirming the booking. Trying again won't charge you twice.</p>
                  <button type="button" onClick={confirmPayment} className="spatial-btn-primary px-6 py-3 rounded-xl text-sm font-bold" data-testid="card-payment-retry">
                    Try confirming again
                  </button>
                </div>
              ) : (
                <Suspense fallback={<div className="py-6 text-center text-sm text-slate-500">Loading secure card form…</div>}>
                  {/* Stripe's card field is white, so keep its panel light in dark mode too. */}
                  <div className="rounded-xl bg-white p-4 text-slate-900 shadow-inner ring-1 ring-slate-200">
                    <DuffelPayments
                      paymentIntentClientToken={payment.clientToken}
                      styles={{ accentColor: "234, 88, 12", buttonCornerRadius: "12px", fontFamily: "inherit" }}
                      onSuccessfulPayment={confirmPayment}
                      onFailedPayment={(err) => setError(err?.message || "Your card was declined. Please try another card.")}
                    />
                  </div>
                </Suspense>
              )}
              <p className="text-[11px] text-slate-400 dark:text-white/40">Booking number {payment.booking.booking_reference}. You won't be charged twice if you retry.</p>
            </div>
          )}

          {error && (
            <div
              className="notice error liquid-glass p-4 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2"
              data-testid="checkout-error"
            >
              <AlertCircle size={18} className="shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              type="submit"
              form="checkout-form"
              className={`primary-button spatial-btn-primary w-full sm:w-auto flex-1 py-4 px-8 rounded-xl font-bold text-base flex items-center justify-center gap-3 shadow-xl ${payment ? "!hidden" : ""}`}
              data-testid="checkout-submit-button"
              disabled={busy || !accepted || Boolean(payment)}
            >
              {busy ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>{isCard ? "Starting secure payment…" : "Reserving your seats…"}</span>
                </>
              ) : (
                <>
                  <span>
                    {isCard ? "Continue to payment" : "Reserve seats"} · {offer.currency} {offer.total.toFixed(2)}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              className="auth-switch px-6 py-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white text-sm transition-all"
              data-testid="checkout-cancel-button"
              onClick={onCancel}
              disabled={busy}
            >
              Back to results
            </button>
          </div>
        </div>

        {/* Right Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-20">
            <aside
            className="checkout-summary liquid-glass-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl space-y-6"
            style={{ top: 0 }}
            data-testid="checkout-summary"
          >
            {/* Restored Trip Itinerary Summary Title inside the Box */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Trip Itinerary Summary
                </h2>
                <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5">
                  Complete flight route, schedule, and fare breakdown.
                </p>
              </div>
              <Ticket size={20} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            </div>

            {/* Airline Row */}
          <div className="summary-airline flex items-center gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            {offer.airline_logo ? (
              <img
                src={offer.airline_logo}
                alt={offer.airline_code}
                className="w-10 h-10 object-contain rounded-lg bg-slate-100 dark:bg-white/10 p-1"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 text-cyan-600 dark:text-cyan-300 font-bold flex items-center justify-center text-sm border border-cyan-300 dark:border-cyan-400/20">
                {offer.airline_code || "FL"}
              </div>
            )}
            <div>
              <b className="text-slate-900 dark:text-white text-base block">{offer.airline}</b>
              <small className="text-slate-400 dark:text-white/50 text-xs">Airline Code: {offer.airline_code} · Verified Supplier</small>
            </div>
          </div>

          {/* Flight legs summary */}
          <div className="space-y-4">
            {offer.slices?.map((slice, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-white/60">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-300 uppercase">
                    {idx === 0 ? "Outbound Flight" : "Return Flight"}
                  </span>
                  <span>{slice.duration?.replace("PT", "").toLowerCase() || "Non-stop"}</span>
                </div>
                <div className="flex items-center justify-between font-bold tabular-nums text-slate-900 dark:text-white text-lg">
                  <div>
                    <span>{slice.origin}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-300 dark:border-cyan-400/20">
                    <Plane size={11} className="rotate-90" />
                    <span>{slice.stops === 0 ? "Direct" : `${slice.stops} stop`}</span>
                  </div>
                  <div>
                    <span>{slice.destination}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total price */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-100 dark:from-cyan-950/40 to-blue-100 dark:to-blue-950/40 border border-cyan-300 dark:border-cyan-500/20 space-y-2">
            <div className="summary-total flex justify-between items-baseline gap-4">
              <div>
                <small className="text-slate-400 dark:text-white/50 text-xs uppercase tracking-wider block">Total Amount</small>
                <span className="text-xs text-slate-500 dark:text-white/50">Total for all travellers, including taxes and fees</span>
              </div>
              <div className="text-right">
                <b
                  data-testid="checkout-total"
                  className="shrink-0 whitespace-nowrap tabular-nums text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white block"
                >
                  {formatMoney(offer.total, offer.currency)}
                </b>
                {currency !== offer.currency && (
                  <span className="text-[11px] text-slate-500 dark:text-white/50 font-mono">
                    Billed as {offer.currency} {offer.total.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-white/50 flex items-center gap-2">
            <Info size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>{isCard ? "Card payments are processed securely by Duffel." : "No payment is taken online. Our team takes payment before the airline's deadline."}</span>
          </div>
        </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

const STATUS_COPY = {
  CONFIRMED: { eyebrow: "Booking confirmed", title: "You're all set for takeoff!", text: "Your booking is paid and confirmed with the airline. Your e-ticket and invoice are ready below." },
  ON_HOLD: { eyebrow: "Seats reserved with the airline", title: "Your seats are on hold", text: "Your airline booking code is live. Our reservations team will contact you to take payment; tickets are issued once it's paid." },
  REQUESTED: { eyebrow: "Booking request received", title: "We've got your request", text: "This airline needs payment straight away, so our team will call or email you shortly to confirm the fare and take payment. Prices and seats aren't held until then." },
};

export function DocumentButtons({ booking, staffId, guestToken }) {
  const ref = encodeURIComponent(booking.booking_reference);
  const base = staffId ? `${API}/admin/bookings/${staffId}` : guestToken ? `${API}/guest/bookings/${ref}` : `${API}/my/bookings/${ref}`;
  const query = guestToken ? `?token=${encodeURIComponent(guestToken)}` : "";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}/eticket${query}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold" data-testid="download-eticket">
        <Ticket size={15} /> E-ticket
      </a>
      <a href={`${base}/invoice${query}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white text-xs font-bold" data-testid="download-invoice">
        <CreditCard size={15} /> Invoice
      </a>
    </div>
  );
}

export function ConfirmationView({ booking, navigate, guestToken, signedIn }) {
  const copy = STATUS_COPY[booking.status] || STATUS_COPY.CONFIRMED;
  const isRequest = booking.status === "REQUESTED";
  return (
    <main className="confirmation-page max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12" data-testid="confirmation-page">
      <div className="confirm-card liquid-glass-card p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/20 text-center relative overflow-hidden shadow-2xl">
        {/* Glowing badge */}
        <div className="confirm-badge w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
          <Check size={40} className="stroke-[3]" />
        </div>

        <span className="eyebrow text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
          {copy.eyebrow}
        </span>
        <h1
          data-testid="confirmation-heading"
          className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3 tracking-tight"
        >
          {copy.title}
        </h1>
        <p className="text-slate-500 dark:text-white/70 max-w-lg mx-auto text-sm sm:text-base mb-8">
          {copy.text}
          {booking.status === "ON_HOLD" && booking.payment_required_by && (
            <b className="block mt-2 text-slate-700 dark:text-white/80">Payment needed by {new Date(booking.payment_required_by).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.</b>
          )}
        </p>

        {/* Boarding pass summary box */}
        <div className="confirm-details grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-left mb-8">
          <div>
            <small className="text-slate-400 dark:text-white/40 text-xs font-semibold uppercase block">Booking Reference</small>
            <b data-testid="confirmation-reference" className="text-xl sm:text-2xl text-cyan-600 dark:text-cyan-300 font-mono tracking-wider">
              {booking.booking_reference || booking.id}
            </b>
          </div>
          <div>
            <small className="text-slate-400 dark:text-white/40 text-xs font-semibold uppercase block">Airline booking code</small>
            <b data-testid="confirmation-pnr" className="block text-xl sm:text-2xl text-slate-900 dark:text-white font-mono tracking-wider">{booking.airline_pnr || "Pending"}</b>
            <small className="text-slate-400 dark:text-white/40 text-xs font-semibold uppercase block mt-2">Status</small>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              {booking.status || "CONFIRMED"}
            </span>
          </div>
          <div>
            <small className="text-slate-400 dark:text-white/40 text-xs font-semibold uppercase block">{isRequest ? "Quoted total" : "Total"}</small>
            <b data-testid="confirmation-total" className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
              {booking.currency} {booking.customer_total != null ? Number(booking.customer_total).toFixed(2) : "0.00"}
            </b>
          </div>
        </div>

        {/* Flight slices */}
        <div className="text-left space-y-4 mb-8">
          {booking.slices?.map((slice, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Plane className="text-cyan-600 dark:text-cyan-400 rotate-45" size={20} />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-base">
                    {slice.origin} → {slice.destination}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-white/50">
                    {slice.departing_at ? new Date(slice.departing_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Scheduled departure"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-cyan-600 dark:text-cyan-300 font-semibold px-3 py-1 rounded-full bg-sky-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/40">
                {isRequest ? `Flight ${i + 1} requested` : booking.status === "ON_HOLD" ? `Flight ${i + 1} on hold` : `Flight ${i + 1} confirmed`}
              </div>
            </div>
          ))}
        </div>

        {!isRequest && (
          <div className="mb-8 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">Your documents</span>
            <DocumentButtons booking={booking} guestToken={signedIn ? null : guestToken} />
          </div>
        )}

        {!signedIn && (
          <div className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-left text-sm text-slate-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-white/80" data-testid="guest-account-note">
            <b className="block text-slate-900 dark:text-white mb-1">Check your email</b>
            We've sent your booking details and a link to your All Sky Fares account. Set a password from that email, or sign in any time with a one-time code sent to your inbox, to view, download or cancel this booking.
          </div>
        )}

        {/* Confirm Actions */}
        <div className="confirm-actions flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            className="primary-button spatial-btn-primary py-3.5 px-8 rounded-xl font-bold text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
            data-testid="confirmation-my-bookings-button"
            onClick={() => navigate(signedIn ? "bookings" : "login")}
          >
            <span>{signedIn ? "Go to My Bookings" : "Sign in to manage booking"}</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="ghost-button py-3.5 px-8 rounded-xl border border-slate-200 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/30 text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white text-sm transition-all w-full sm:w-auto"
            data-testid="confirmation-home-button"
            onClick={() => navigate("home")}
          >
            Search another flight
          </button>
        </div>
      </div>
    </main>
  );
}
