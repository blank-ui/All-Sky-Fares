import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/api";

export const STATUS_LABELS = {
  CONFIRMED: ["Confirmed", "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/30"],
  ON_HOLD: ["On hold · payment due", "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/30"],
  REQUESTED: ["Request · not confirmed", "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/30"],
  AWAITING_PAYMENT: ["Awaiting payment", "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30"],
  PAYING: ["Processing payment", "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30"],
  CANCELLED: ["Cancelled", "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/30"],
  EXPIRED: ["Hold expired", "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/30"],
  FAILED: ["Not confirmed · refunded", "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/30"],
};

export function StatusBadge({ status }) {
  const [label, cls] = STATUS_LABELS[status] || [status || "—", "bg-slate-100 text-slate-700 border-slate-300"];
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cls}`} data-testid="booking-status">{label}</span>;
}

const money = (n, c = "USD") => `${c} ${Number(n || 0).toFixed(2)}`;

/**
 * Cancel button with a refund quote step. `base` is the API path of the booking:
 * `/my/bookings/<ref>` for customers or `/admin/bookings/<id>` for staff.
 */
export function CancelBooking({ base, onCancelled, label = "Cancel booking", className = "" }) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setOpen(true);
    setQuote(null);
    setError("");
    setBusy(true);
    try {
      setQuote((await apiRequest(`${base}/cancel/quote`, { method: "POST" })).quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const d = await apiRequest(`${base}/cancel/confirm`, { method: "POST" });
      setOpen(false);
      onCancelled && onCancelled(d.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={start} className={className || "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 text-xs font-bold"} data-testid="cancel-booking">
        {label}
      </button>
      {/* Portal: parents with backdrop-filter would otherwise trap a fixed overlay inside them. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Cancel booking">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div className="text-lg font-bold text-slate-900 dark:text-white">Cancel this booking?</div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Close"><X size={18} /></button>
            </div>
            {busy && !quote && <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Checking with the airline…</div>}
            {quote && (
              <div className="space-y-3 text-sm text-slate-700 dark:text-white/80">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                  <div className="flex justify-between"><span>You'll get back</span><b className="text-slate-900 dark:text-white">{money(quote.customer_refund, quote.currency)}</b></div>
                </div>
                <p>{quote.note}</p>
                <p className="text-xs text-slate-500 dark:text-white/50">Cancelling can't be undone. Refunds to cards usually take 7–14 business days to appear.</p>
              </div>
            )}
            {error && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-white/80">Keep booking</button>
              <button onClick={confirm} disabled={!quote || busy} className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" data-testid="cancel-booking-confirm">
                {busy && quote ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
