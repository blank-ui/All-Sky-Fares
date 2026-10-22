import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  SlidersHorizontal, Activity, MessageCircle, LogOut, Upload, Download, RefreshCw, Plus, Trash2, Pencil,
  KeyRound, Ticket, Send, Check, X, AlertCircle, Loader2, ArrowRight, Info, ShieldCheck,
  Search, Plane, Clock, Sparkles, LayoutGrid, Eye
} from "lucide-react";
import { API, apiRequest } from "@/lib/api";
import { CancelBooking, StatusBadge } from "./BookingActions";
import { WorkspaceOverview } from "./WorkspaceOverview";
import { AirlineLogo } from "./AirlineLogo";
import { ReservationDetailsModal } from "./ReservationDetailsModal";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "markups", label: "Route markups", icon: SlidersHorizontal },
  { id: "crm", label: "CRM sync", icon: Send },
  { id: "integrations", label: "Integrations", icon: Activity },
  { id: "credentials", label: "Credentials", icon: KeyRound, superAdminOnly: true },
  { id: "chat", label: "Live chat", icon: MessageCircle },
];

const money = (value, currency = "USD") =>
  value == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(value);
const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");
const airport = (code) => (!code || code === "*" ? "Any" : code);

/* ---------- UI building blocks ---------- */

const btn = {
  primary: "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  secondary: "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm",
  icon: "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer",
};
const input = "h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white";
const th = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 whitespace-nowrap";
const td = "px-4 py-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap";

function BentoPanel({ title, description, actions, children, testid, className = "" }) {
  return (
    <section className={`bento-card p-5 sm:p-7 border border-slate-200/90 dark:border-white/10 relative ${className}`} data-testid={testid}>
      <header className="flex flex-col gap-4 border-b border-slate-100/90 dark:border-white/5 pb-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            {title}
          </div>
          {description && <div className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500 dark:text-white/50">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

function Notice({ tone = "info", children, onClose }) {
  const tones = {
    info: "border-sky-200 bg-sky-500/10 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
    success: "border-emerald-200 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    error: "border-rose-200 bg-rose-500/10 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  };
  const Icon = tone === "success" ? Check : tone === "error" ? AlertCircle : Info;
  return (
    <div className={`mb-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs sm:text-sm backdrop-blur-sm ${tones[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer" aria-label="Dismiss"><X size={15} /></button>}
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70 border-slate-200 dark:border-white/10",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${tones[tone]}`}>{children}</span>;
}

function Loading({ label = "Loading live data…" }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-xs sm:text-sm font-semibold text-slate-400 dark:text-white/40">
      <Loader2 size={18} className="animate-spin text-orange-500" /> {label}
    </div>
  );
}

function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 py-14 text-center dark:border-white/10">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 text-slate-400 dark:text-white/30">
        <Icon size={24} />
      </div>
      <div className="font-bold text-sm text-slate-800 dark:text-white/90">{title}</div>
      {children && <div className="mt-1 max-w-sm text-xs text-slate-500 dark:text-white/50">{children}</div>}
    </div>
  );
}

function useLoad(path) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    apiRequest(path)
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, [path]);
  useEffect(load, [load]);
  return [state, load, setState];
}

/* ---------- Workspace shell ---------- */

export function AdminWorkspaceView({ user, navigate, initialTab = "overview" }) {
  const sections = SECTIONS.filter((s) => !s.superAdminOnly || user?.role === "SUPER_ADMIN");
  
  const [tab, setTab] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q && sections.some((s) => s.id === q)) return q;
      if (initialTab && initialTab !== "overview") return initialTab;
      const saved = sessionStorage.getItem("asf-admin-tab");
      if (saved && sections.some((s) => s.id === saved)) return saved;
    } catch (e) {}
    return initialTab || "overview";
  });
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [modalBooking, setModalBooking] = useState(null);

  const prevInitialTabRef = useRef(initialTab);
  useEffect(() => {
    if (initialTab && initialTab !== prevInitialTabRef.current) {
      prevInitialTabRef.current = initialTab;
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem("asf-admin-tab", tab);
    } catch (e) {}
    try {
      const currentQ = new URLSearchParams(window.location.search).get("tab");
      if (tab === "overview") {
        if (currentQ) {
          const url = new URL(window.location.href);
          url.searchParams.delete("tab");
          window.history.replaceState({ tab }, "", url.pathname + (url.search || ""));
        }
      } else {
        if (currentQ !== tab) {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", tab);
          window.history.replaceState({ tab }, "", url.pathname + url.search);
        }
      }
    } catch (e) {}
  }, [tab]);

  // Shared by the overview widgets and the tab counters.
  const [bookings, reloadBookings] = useLoad("/admin/bookings");
  const [markups, reloadMarkups] = useLoad("/admin/markups");
  const [crm, reloadCrm] = useLoad("/admin/crm/outbox");
  const [integrations, reloadIntegrations] = useLoad("/admin/integrations/status");
  const reloadAll = () => { reloadBookings(); reloadMarkups(); reloadCrm(); reloadIntegrations(); };

  // Workspace keyboard shortcuts (1: Markups, 2: Bookings, 3: Overview, 4: CRM, 5: Integrations, R: Refresh)
  useEffect(() => {
    const handleWorkspaceShortcuts = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(activeTag) || document.activeElement?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "1") {
        e.preventDefault();
        setTab("overview");
      } else if (e.key === "2") {
        e.preventDefault();
        setBookingFilter("ALL");
        setTab("bookings");
      } else if (e.key === "3") {
        e.preventDefault();
        setTab("markups");
      } else if (e.key === "4") {
        e.preventDefault();
        setTab("crm");
      } else if (e.key === "5") {
        e.preventDefault();
        setTab("integrations");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reloadAll();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        window.open(`${API}/admin/markups/export.csv`, "_blank");
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setTab("markups");
        setTimeout(() => {
          const originInput = document.querySelector('input[data-testid="markup-origin"]');
          if (originInput) {
            originInput.focus();
            originInput.select?.();
          }
        }, 100);
      }
    };
    window.addEventListener("keydown", handleWorkspaceShortcuts);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcuts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDetails = (booking) => {
    setModalBooking(booking);
    const bookingRef = booking?.booking_reference || booking?.id;
    if (bookingRef) {
      apiRequest(`/my/bookings/${encodeURIComponent(bookingRef)}`)
        .then((data) => {
          if (data?.booking) {
            setModalBooking(data.booking);
          }
        })
        .catch(() => {});
    }
  };

  const openBookings = (status) => {
    setBookingFilter(status);
    setTab("bookings");
  };

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("asf-admin-tab");
      sessionStorage.removeItem("asf-workspace-tab");
    } catch (e) {}
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    navigate("home");
    window.location.reload();
  };

  const counts = {
    bookings: bookings.data?.bookings?.length || 0,
    markups: markups.data?.markups?.length || 0,
    crm: crm.data?.counts?.dead || 0,
  };
  const live = markups.data?.duffel_mode === "live";

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 sm:pt-28 pb-16" data-testid="staff-workspace">
      {/* Header tile: who is signed in, real system mode, navigation */}
      <section className="bento-card mb-3 border border-slate-200/90 p-5 sm:p-7 dark:border-white/10 relative">
        <div className="bento-hero-glow bg-orange-500/15" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-sky-600 text-2xl font-extrabold text-white shadow-xl shadow-orange-500/20 sm:h-16 sm:w-16">
              {(user?.first_name || user?.email || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="blue"><ShieldCheck size={11} className="mr-1" />{(user?.role || "STAFF").replace("_", " ")}</Badge>
                {!markups.loading && (live ? <Badge tone="green">Live airline prices</Badge> : <Badge tone="amber">Duffel test mode</Badge>)}
              </div>
              <h1 data-testid="workspace-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Staff workspace</h1>
              <div className="truncate text-xs sm:text-sm text-slate-500 dark:text-white/60">Signed in as {user?.first_name || user?.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/25 transition-all cursor-pointer"
              onClick={() => navigate("account")}
              title="Switch to Modern Dashboard"
            >
              <LayoutGrid size={15} />
              <span>Modern Dashboard</span>
            </button>
            <button className={btn.secondary} onClick={reloadAll} aria-label="Refresh all data">
              <RefreshCw size={15} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button className={btn.secondary} data-testid="workspace-signout-inline" onClick={handleSignOut}>
              <LogOut size={15} /> <span>Sign out</span>
            </button>
          </div>
        </div>

        <nav className="relative z-10 mt-5 flex gap-1.5 overflow-x-auto border-t border-slate-200/60 pt-4 scrollbar-none dark:border-white/10" data-testid="workspace-tabs">
          {sections.map(({ id, label, icon: Icon }) => {
            const n = counts[id];
            return (
              <button
                key={id}
                data-testid={`workspace-tab-${id}`}
                onClick={() => { if (id === "bookings") setBookingFilter("ALL"); setTab(id); }}
                aria-current={tab === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  tab === id
                    ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {n > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${id === "crm" ? "bg-rose-500 text-white" : tab === id ? "bg-white/20 text-inherit" : "bg-slate-200 text-slate-700 dark:bg-white/15 dark:text-white"}`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {tab === "overview" && (
        <WorkspaceOverview bookings={bookings} integrations={integrations} crm={crm} markups={markups} setTab={setTab} openBookings={openBookings} reload={reloadAll} />
      )}
      {tab === "markups" && <MarkupsSection />}
      {tab === "bookings" && <BookingsSection initialFilter={bookingFilter} key={bookingFilter} onOpenDetails={handleOpenDetails} />}
      {tab === "crm" && <CrmSection user={user} />}
      {tab === "integrations" && <IntegrationsSection user={user} />}
      {tab === "credentials" && <CredentialsSection />}
      {tab === "chat" && <ChatSection />}

      {modalBooking && (
        <ReservationDetailsModal
          booking={modalBooking}
          onClose={() => setModalBooking(null)}
          getDocUrl={(ref, docType) => `${API}/admin/bookings/${ref}/${docType}`}
        />
      )}
    </main>
  );
}

/* ==========================================================================
   ROUTE MARKUPS BENTO SECTION
   ========================================================================== */

const EMPTY_FORM = { origin: "", destination: "", markup_amount: "", markup_percent: "" };

function MarkupsSection() {
  const [state, load, setState] = useLoad("/admin/markups");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileRef = useRef(null);
  const markups = useMemo(() => state.data?.markups || [], [state.data?.markups]);

  const mode = state.data?.duffel_mode;
  const setMarkups = (list) => setState((s) => ({ ...s, data: { ...s.data, markups: list } }));

  const save = async (e) => {
    e.preventDefault();
    setBusy("save");
    setNotice(null);
    try {
      const saved = await apiRequest("/admin/markups", {
        method: "POST",
        body: {
          origin: form.origin.toUpperCase() || "*",
          destination: form.destination.toUpperCase() || "*",
          markup_amount: Number(form.markup_amount || 0),
          markup_percent: Number(form.markup_percent || 0),
        },
      });
      const label = `${airport(saved.markup.origin)} → ${airport(saved.markup.destination)}`;
      setNotice(saved.price_error
        ? { tone: "error", text: `Saved ${label}, but couldn't fetch its price: ${saved.price_error}` }
        : { tone: "success", text: saved.markup.current_price != null ? `Saved ${label}. Current fare: ${money(saved.markup.current_price, saved.markup.price_currency)}.` : `Saved ${label}.` });
      setForm(EMPTY_FORM);
      setEditing(false);
      load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };

  const edit = (m) => {
    setEditing(true);
    setForm({
      origin: m.origin === "*" ? "" : m.origin,
      destination: m.destination === "*" ? "" : m.destination,
      markup_amount: String(m.markup_amount),
      markup_percent: String(m.markup_percent)
    });
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete the markup rule for ${airport(m.origin)} → ${airport(m.destination)}?`)) return;
    try {
      await apiRequest(`/admin/markups/${m.id}`, { method: "DELETE" });
      setMarkups(markups.filter((x) => x.id !== m.id));
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  };

  const refreshPrices = async () => {
    setBusy("refresh");
    setNotice(null);
    try {
      const d = await apiRequest("/admin/markups/refresh-prices", { method: "POST" });
      setMarkups(d.markups);
      setNotice(d.failed.length
        ? { tone: "error", text: `Updated ${d.refreshed} route(s). Couldn't price: ${d.failed.join("; ")}` }
        : { tone: "success", text: `Current prices updated for ${d.refreshed} route(s).` });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };

  const upload = async (file, commit) => {
    const body = new FormData();
    body.append("file", file);
    body.append("commit", commit ? "true" : "false");
    const r = await fetch(`${API}/admin/markups/import`, { method: "POST", credentials: "include", body });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Import failed");
    return d;
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNotice(null);
    try {
      const d = await upload(file, false);
      setPreview({ file, rows: d.preview });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  };

  const confirmImport = async () => {
    setBusy("import");
    try {
      const d = await upload(preview.file, true);
      setMarkups(d.markups);
      setPreview(null);
      setNotice({ tone: "success", text: `Imported ${d.imported} route markup(s). Live airline pricing is updating in background.` });
      setTimeout(load, 8000);
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };

  const exportCsv = async () => {
    const r = await fetch(`${API}/admin/markups/export`, { credentials: "include" });
    const url = URL.createObjectURL(await r.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: "route-markups.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMarkups = useMemo(() => {
    if (!searchQuery.trim()) return markups;
    const q = searchQuery.toLowerCase().trim();
    return markups.filter(m =>
      (m.origin || "").toLowerCase().includes(q) ||
      (m.destination || "").toLowerCase().includes(q)
    );
  }, [markups, searchQuery]);

  return (
    <div className="space-y-6" data-testid="pricing-panel">
      {/* Top Bento Split: Form & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card (7 cols) */}
        <div className="lg:col-span-7 bento-card p-6 border border-slate-200/90 dark:border-white/10 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" />
                <span>{editing ? "Edit Route Markup" : "Add Route Markup"}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                Markup is per traveller; % markup applies to whole fare. Blank origins or destinations match Any.
              </p>
            </div>
            {editing && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={save} data-testid="markup-form" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
                <span>Origin <span className="font-normal text-slate-400">(Any)</span></span>
                <input
                  className={`${input} font-mono uppercase font-bold text-center`}
                  maxLength={3}
                  placeholder="LHR"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                  data-testid="markup-origin"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
                <span>Dest <span className="font-normal text-slate-400">(Any)</span></span>
                <input
                  className={`${input} font-mono uppercase font-bold text-center`}
                  maxLength={3}
                  placeholder="JFK"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                  data-testid="markup-destination"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
                <span>Fixed Markup</span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                  <input
                    className={`${input} pl-6 font-semibold`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.markup_amount}
                    onChange={(e) => setForm({ ...form, markup_amount: e.target.value })}
                    data-testid="markup-amount"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
                <span>Percent (%)</span>
                <div className="relative">
                  <input
                    className={`${input} pr-6 font-semibold`}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={form.markup_percent}
                    onChange={(e) => setForm({ ...form, markup_percent: e.target.value })}
                    data-testid="markup-percent"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editing && (
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() => { setEditing(false); setForm(EMPTY_FORM); }}
                >
                  Cancel
                </button>
              )}
              <button
                className={btn.primary}
                disabled={busy === "save"}
                data-testid="markup-save"
                type="submit"
              >
                {busy === "save" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editing ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}
                <span>{editing ? "Update Rule" : "Add Markup Rule"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Hub Card (5 cols) */}
        <div className="lg:col-span-5 bento-card p-6 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-sky-500" />
                <span>Pricing Inventory Sync</span>
              </h2>
              <Badge tone={mode === "live" ? "green" : mode === "test" ? "amber" : "red"}>
                {mode === "live" ? "Live Duffel Key" : mode === "test" ? "Duffel Test Mode" : "No Key Set"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed mb-4">
              Cheapest one-way economy fare 30 days out is re-queried automatically every 3 hours. Most specific rule takes priority.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              className={btn.secondary}
              onClick={refreshPrices}
              disabled={busy === "refresh"}
              data-testid="markups-refresh-prices"
            >
              <RefreshCw size={14} className={busy === "refresh" ? "animate-spin" : ""} />
              <span>{busy === "refresh" ? "Checking fares…" : "Refresh prices"}</span>
            </button>
            <button
              className={btn.secondary}
              onClick={() => fileRef.current?.click()}
              data-testid="markups-import"
            >
              <Upload size={14} />
              <span>Import CSV</span>
            </button>
            <button
              className={btn.secondary}
              onClick={exportCsv}
              disabled={!markups.length}
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={pickFile} />
          </div>
        </div>
      </div>

      {mode === "test" && (
        <Notice tone="error">
          <b>Prices below are Duffel test data, not real airline fares.</b> The flight engine is using a Duffel test key. Configure your live key (starts with <code>duffel_live_</code>) under <b>Credentials → DUFFEL_API_KEY</b> to sync real-time seat inventory.
        </Notice>
      )}
      {mode === "missing" && (
        <Notice tone="error">No Duffel key configured. Add one under Credentials to enable live pricing lookup.</Notice>
      )}
      {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      {/* CSV Import Preview Modal / Drawer */}
      {preview && (
        <div className="bento-card p-5 border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 relative" data-testid="markups-import-preview">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={15} className="text-sky-500" />
                <span>{preview.file.name}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-white/50">· {preview.rows.length} route(s) ready</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                New routes will be appended and existing matching routes will be updated.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className={btn.secondary} onClick={() => setPreview(null)}>Cancel</button>
              <button className={btn.primary} onClick={confirmImport} disabled={busy === "import"} data-testid="markups-import-confirm">
                {busy === "import" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Import {preview.rows.length} route(s)</span>
              </button>
            </div>
          </div>
          <div className="relative overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Departure</th>
                  <th className={th}>Destination</th>
                  <th className={`${th} text-right`}>Markup</th>
                  <th className={`${th} text-right`}>% Markup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {preview.rows.map((r) => (
                  <tr key={`${r.origin}-${r.destination}`}>
                    <td className={`${td} font-mono font-bold`}>{airport(r.origin)}</td>
                    <td className={`${td} font-mono font-bold`}>{airport(r.destination)}</td>
                    <td className={`${td} text-right font-semibold`}>{money(r.markup_amount)}</td>
                    <td className={`${td} text-right font-semibold`}>{r.markup_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Markup Rules Table Bento Card */}
      <div className="bento-card p-6 border border-slate-200/90 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-white/5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Route Rules ({markups.length})</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">Pricing ledger applied automatically across public search offers</p>
          </div>
          <div className="w-full sm:w-64 relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by airport (e.g. LHR)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${input} pl-8 !h-9 text-xs`}
            />
          </div>
        </div>

        {state.loading && <Loading />}
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {!state.loading && !state.error && markups.length === 0 && (
          <Empty icon={SlidersHorizontal} title="No route markups defined">
            Add a route above or upload a CSV file with origin, destination, markup_amount, and markup_percent.
          </Empty>
        )}

        {filteredMarkups.length > 0 && (
          <div className="relative overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/10">
            <table className="w-full" data-testid="markups-table">
              <thead className="bg-slate-50/75 dark:bg-white/[0.03]">
                <tr>
                  <th className={th}>Route Pair</th>
                  <th className={`${th} text-right`}>Current Airline Fare</th>
                  <th className={`${th} text-right`}>Fixed Markup</th>
                  <th className={`${th} text-right`}>Percent Markup</th>
                  <th className={`${th} text-right`}>Total Customer Fare</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredMarkups.map((m) => {
                  const wildcard = m.origin === "*" || m.destination === "*";
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                      <td className={td}>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white text-xs">
                            {airport(m.origin)}
                          </span>
                          <Plane size={13} className="text-slate-400 rotate-90" />
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white text-xs">
                            {airport(m.destination)}
                          </span>
                        </div>
                      </td>
                      <td className={`${td} text-right`}>
                        {m.current_price != null ? (
                          <>
                            <div className="flex items-center justify-end gap-1.5 font-semibold">
                              <Badge tone={m.price_live ? "green" : "amber"}>{m.price_live ? "Live" : "Test"}</Badge>
                              <span>{money(m.current_price, m.price_currency)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-white/40">{when(m.price_checked_at)}</div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-white/30">
                            {wildcard ? "Global Rule" : "Pending check"}
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right font-medium`}>{money(m.markup_amount, m.price_currency)}</td>
                      <td className={`${td} text-right font-medium`}>{Number(m.markup_percent)}%</td>
                      <td className={`${td} text-right`}>
                        {m.total != null ? (
                          <>
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white">{money(m.total, m.price_currency)}</div>
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+{money(m.markup_total, m.price_currency)} margin</div>
                          </>
                        ) : "—"}
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button className={btn.icon} onClick={() => edit(m)} aria-label="Edit" title="Edit rule">
                            <Pencil size={15} />
                          </button>
                          <button className={`${btn.icon} hover:!text-rose-600`} onClick={() => remove(m)} aria-label="Delete" title="Delete rule">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   BOOKINGS BENTO SECTION
   ========================================================================== */

const statusTone = {
  CONFIRMED: "green",
  ON_HOLD: "amber",
  REQUESTED: "amber",
  AWAITING_PAYMENT: "blue",
  PAYING: "blue",
  PROCESSING: "blue",
  CANCELLED: "red",
  EXPIRED: "red",
  FAILED: "red"
};
const syncTone = {
  SYNCED: "green",
  PENDING: "slate",
  RETRYING: "amber",
  FAILED: "red"
};

function BookingActionsRow({ b, onChange, setNotice, onOpenDetails }) {
  const [busy, setBusy] = useState("");
  const run = async (key, path, body, success) => {
    setBusy(key);
    try {
      const d = await apiRequest(`/admin/bookings/${b.ota_booking_id}/${path}`, { method: "POST", body });
      onChange();
      setNotice({ tone: "success", text: success(d.booking) });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };
  const payHold = () => {
    const method = window.prompt(`Payment confirmed for ${b.booking_reference} (${money(b.customer_total, b.currency)}).\nEnter payment reference (e.g. "Visa ending 1234 by phone"):`, "Card by phone");
    if (method === null) return;
    run("pay", "pay", { payment_method: method }, (x) => `${x.booking_reference} paid and confirmed with the airline${(x.tickets || []).length ? `; tickets issued (${x.tickets.map((t) => t.number).join(", ")})` : "; tickets are being issued"}.`);
  };
  const docBase = `${API}/admin/bookings/${b.ota_booking_id}`;
  const hasDocs = !["PROCESSING", "AWAITING_PAYMENT", "PAYING", "REQUESTED"].includes(b.status);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onOpenDetails && onOpenDetails(b)}
        className={`${btn.secondary} !h-7 !px-2.5 !text-[11px] flex items-center gap-1 cursor-pointer hover:border-sky-500`}
        title="View Electronic Ticket & Reservation Details"
      >
        <Eye size={12} className="text-sky-500" />
        <span>Details</span>
      </button>
      {hasDocs && (
        <a className={`${btn.secondary} !h-7 !px-2.5 !text-[11px]`} href={`${docBase}/eticket`} target="_blank" rel="noreferrer">
          E-ticket
        </a>
      )}
      {hasDocs && (
        <a className={`${btn.secondary} !h-7 !px-2.5 !text-[11px]`} href={`${docBase}/invoice`} target="_blank" rel="noreferrer">
          Invoice
        </a>
      )}
      {b.status === "ON_HOLD" && (
        <button className={`${btn.primary} !h-7 !px-2.5 !text-[11px]`} disabled={busy === "pay"} onClick={payHold}>
          {busy === "pay" ? "Paying…" : "Pay & issue"}
        </button>
      )}
      {b.duffel_order_id && (
        <button className={btn.icon} title="Refresh live status from Duffel" aria-label="Refresh from Duffel" disabled={busy === "sync"} onClick={() => run("sync", "sync", undefined, (x) => `${x.booking_reference} updated from Duffel.`)}>
          <RefreshCw size={13} className={busy === "sync" ? "animate-spin" : ""} />
        </button>
      )}
      {b.can_cancel && (
        <CancelBooking
          base={`/admin/bookings/${b.ota_booking_id}`}
          label="Cancel"
          onCancelled={(x) => {
            onChange();
            setNotice({ tone: "success", text: `${x.booking_reference} cancelled${Number(x.refund_amount) > 0 ? `; refund ${money(x.refund_amount, x.currency)}` : ""}.` });
          }}
          className={`${btn.secondary} !h-7 !px-2.5 !text-[11px] !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10`}
        />
      )}
    </div>
  );
}

function BookingsSection({ initialFilter = "ALL", onOpenDetails }) {
  const [state, load] = useLoad("/admin/bookings");
  const [notice, setNotice] = useState(null);
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const bookings = useMemo(() => state.data?.bookings || [], [state.data?.bookings]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filterStatus !== "ALL" && b.status !== filterStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (b.booking_reference || "").toLowerCase().includes(q) ||
        (b.airline_pnr || "").toLowerCase().includes(q) ||
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.email || "").toLowerCase().includes(q)
      );
    });
  }, [bookings, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      <BentoPanel
        title="Reservations Ledger"
        description="Latest 100 passenger bookings. Held seats have an airline PNR: take payment and issue tickets prior to airline deadline."
        actions={
          <button className={btn.secondary} onClick={load}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        }
      >
        {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}

        {/* Filters and search bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "CONFIRMED", "ON_HOLD", "REQUESTED", "AWAITING_PAYMENT", "CANCELLED", "EXPIRED", "FAILED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st === "ALL" ? `All (${bookings.length})` : st.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="w-full md:w-72 relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search PNR, name, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${input} pl-8 !h-9 text-xs`}
            />
          </div>
        </div>

        {state.loading && <Loading />}
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {!state.loading && !state.error && bookings.length === 0 && (
          <Empty icon={Ticket} title="No bookings recorded">Customer reservations will appear here automatically.</Empty>
        )}

        {filtered.length > 0 && (
          <div className="relative overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/10">
            <table className="w-full">
              <thead className="bg-slate-50/75 dark:bg-white/[0.03]">
                <tr>
                  <th className={th}>Reference & PNR</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Flight Itinerary</th>
                  <th className={th}>Booked On</th>
                  <th className={`${th} text-right`}>Total Fare</th>
                  <th className={`${th} text-right`}>Net Margin</th>
                  <th className={th}>Status</th>
                  <th className={th}>CRM Sync</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((b) => {
                  const first = (b.slices || [])[0] || {};
                  return (
                    <tr key={b.ota_booking_id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <AirlineLogo booking={b} size={32} />
                          <div>
                            <div
                              onClick={() => onOpenDetails && onOpenDetails(b)}
                              className="font-mono font-extrabold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-cyan-400 cursor-pointer transition-colors"
                            >
                              {b.booking_reference || "—"}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>PNR:</span>
                              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{b.airline_pnr || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        <div className="font-semibold text-slate-900 dark:text-white">{b.customer_name || "—"}</div>
                        <div className="text-[11px] text-slate-400">{b.email}</div>
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                          <span>{first.origin || "—"}</span>
                          <Plane size={11} className="text-slate-400 rotate-90" />
                          <span>{first.destination || "—"}</span>
                          {(b.slices || []).length > 1 && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-[10px] text-slate-500">
                              +{b.slices.length - 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={td}>
                        <div className="text-xs">{when(b.created_at)}</div>
                        {b.status === "ON_HOLD" && b.payment_required_by && (
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <Clock size={11} /> Pay by {when(b.payment_required_by)}
                          </div>
                        )}
                      </td>
                      <td className={`${td} text-right font-extrabold text-slate-900 dark:text-white`}>
                        {money(b.customer_total, b.currency)}
                      </td>
                      <td className={`${td} text-right font-bold text-emerald-600 dark:text-emerald-400`}>
                        {b.customer_total != null ? money(b.customer_total - (b.supplier_amount || 0), b.currency) : "—"}
                      </td>
                      <td className={td}>
                        <Badge tone={statusTone[b.status]}>{(b.status || "").replace("_", " ")}</Badge>
                        {b.payment_status === "paid" && (
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold">{b.payment_method || "Paid"}</div>
                        )}
                      </td>
                      <td className={td}>
                        <Badge tone={syncTone[b.crm_sync_status]}>{b.crm_sync_status || "—"}</Badge>
                      </td>
                      <td className={td}>
                        <BookingActionsRow b={b} onChange={load} setNotice={setNotice} onOpenDetails={onOpenDetails} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BentoPanel>
    </div>
  );
}

/* ==========================================================================
   CRM WEBHOOK OUTBOX BENTO SECTION
   ========================================================================== */

function CrmSection({ user }) {
  const [state, load] = useLoad("/admin/crm/outbox");
  const [controlsState, loadControls] = useLoad("/admin/integrations/controls");
  const [notice, setNotice] = useState(null);
  const [savingMode, setSavingMode] = useState(false);
  const d = state.data;
  const crmControl = controlsState.data?.controls?.crm_sync;
  const currentMode = crmControl?.mode || crmControl?.value || "test_bypass";

  const setCrmMode = async (newMode) => {
    setSavingMode(true);
    try {
      const r = await apiRequest("/admin/integrations/controls/crm_sync", {
        method: "PUT",
        body: { value: newMode }
      });
      setNotice({ tone: "success", text: r.message || `CRM Sync updated to ${newMode}.` });
      loadControls();
      load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message || "Failed to update CRM mode." });
    } finally {
      setSavingMode(false);
    }
  };

  const retry = async (id) => {
    try {
      const r = await apiRequest(`/admin/crm/outbox/${id}/retry`, { method: "POST" });
      setNotice(r.delivered ? { tone: "success", text: "Successfully delivered event to CRM." } : { tone: "error", text: `Still failing: ${r.event?.last_error || "Unknown response"}` });
      load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <BentoPanel
        title="CRM Webhook Outbox Telemetry"
        description="Every passenger confirmation is dispatched to the CRM as an HMAC-signed webhook with automated exponential backoff."
        actions={
          <div className="flex items-center gap-2">
            <button className={btn.secondary} onClick={() => { load(); loadControls(); }}>
              <RefreshCw size={14} className={state.loading || controlsState.loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        }
      >
        {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}
        {state.loading && <Loading />}
        {state.error && <Notice tone="error">{state.error}</Notice>}

        {/* CRM Dispatch Mode Switcher Card */}
        <div className="mb-6 rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 bg-gradient-to-r from-slate-50/70 to-white dark:from-white/[0.02] dark:to-white/[0.04] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">CRM Dispatch Mode</span>
                <Badge tone={currentMode === "test_bypass" ? "purple" : currentMode === "enabled" ? "green" : "red"}>
                  {currentMode === "test_bypass" ? "Test Mock / Bypass" : currentMode === "enabled" ? "Live Dispatch" : "Disabled / Paused"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-1 max-w-xl">
                {currentMode === "test_bypass" && "Safe Mock Active — Confirmed bookings are logged in local database & outbox telemetry, but NO external HTTP calls are dispatched. Perfect for sandbox testing."}
                {currentMode === "enabled" && "Live Dispatch Active — Confirmed passenger bookings are signed with HMAC and posted immediately to the external CRM webhook."}
                {currentMode === "disabled" && "Dispatch Paused — Outbound CRM webhook dispatch is completely suspended."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
              {[
                { value: "test_bypass", label: "Test Bypass (Mock)", activeTone: "bg-purple-600 text-white" },
                { value: "enabled", label: "Live Dispatch", activeTone: "bg-emerald-600 text-white" },
                { value: "disabled", label: "Disabled", activeTone: "bg-rose-600 text-white" },
              ].map((btnOption) => (
                <button
                  key={btnOption.value}
                  type="button"
                  disabled={savingMode}
                  onClick={() => setCrmMode(btnOption.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentMode === btnOption.value
                      ? `${btnOption.activeTone} shadow-sm`
                      : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {savingMode && currentMode === btnOption.value ? (
                    <Loader2 size={12} className="animate-spin inline mr-1" />
                  ) : null}
                  {btnOption.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {d && (
          <>
            {!d.configured && currentMode === "enabled" && (
              <Notice tone="info">
                The CRM webhook URL is currently not configured, so outbound booking events are safely spooled. A super administrator can add <code>CRM_WEBHOOK_URL</code> under <b>Credentials</b>.
              </Notice>
            )}

            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Queued Events", d.counts.pending + d.counts.sending, "text-sky-600 dark:text-sky-400", "bg-sky-500/10 border-sky-500/20"],
                ["Delivered Events", d.counts.delivered, "text-emerald-600 dark:text-emerald-400", "bg-emerald-500/10 border-emerald-500/20"],
                ["Dead Letter / Failed", d.counts.dead, "text-rose-600 dark:text-rose-400", "bg-rose-500/10 border-rose-500/20"],
                ["Total Events", Object.values(d.counts).reduce((a, b) => a + b, 0), "text-slate-900 dark:text-white", "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"],
              ].map(([label, n, color, bg]) => (
                <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">{label}</div>
                  <div className={`mt-1 text-2xl font-black ${color}`}>{n}</div>
                </div>
              ))}
            </div>

            {d.events.length === 0 ? (
              <Empty icon={Send} title="Outbox is clear">No webhook transmissions logged yet.</Empty>
            ) : (
              <div className="relative overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/10">
                <table className="w-full">
                  <thead className="bg-slate-50/75 dark:bg-white/[0.03]">
                    <tr>
                      <th className={th}>Timestamp</th>
                      <th className={th}>Dispatch Status</th>
                      <th className={`${th} text-right`}>Attempts</th>
                      <th className={th}>Telemetry Error Log</th>
                      <th className={th}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {d.events.map((e) => (
                      <tr key={e.event_id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                        <td className={`${td} font-mono text-xs`}>{when(e.created_at)}</td>
                        <td className={td}>
                          <Badge tone={{ delivered: "green", dead: "red", pending: "amber", sending: "blue" }[e.status]}>
                            {e.status}
                          </Badge>
                        </td>
                        <td className={`${td} text-right font-mono font-semibold`}>{e.attempts}</td>
                        <td className={`${td} max-w-sm truncate text-xs text-slate-500`} title={e.last_error || ""}>
                          {e.last_error || "—"}
                        </td>
                        <td className={`${td} text-right`}>
                          {["pending", "dead"].includes(e.status) && (d.configured || currentMode === "test_bypass") && (
                            <button className={`${btn.secondary} !h-7 !px-2.5 !text-[11px]`} onClick={() => retry(e.event_id)}>
                              Retry now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </BentoPanel>
    </div>
  );
}

/* ==========================================================================
   INTEGRATIONS RADAR BENTO SECTION
   ========================================================================== */

function IntegrationsSection({ user: propUser }) {
  const [statusState, loadStatus] = useLoad("/admin/integrations/status");
  const [controlsState, loadControls] = useLoad("/admin/integrations/controls");
  const [savingKey, setSavingKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [fetchedUser, setFetchedUser] = useState(null);

  useEffect(() => {
    if (!propUser) {
      apiRequest("/auth/me")
        .then((d) => {
          if (d?.user) setFetchedUser(d.user);
        })
        .catch(() => {});
    }
  }, [propUser]);

  const controls = controlsState.data?.controls;
  const activeRole = String(propUser?.role || fetchedUser?.role || "").toUpperCase();
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const handleUpdateControl = async (key, newValue) => {
    setSavingKey(key);
    try {
      const res = await apiRequest(`/admin/integrations/controls/${key}`, {
        method: "PUT",
        body: { value: newValue },
      });
      setNotice({ tone: "success", text: res.message || `Updated ${key} to ${newValue}.` });
      loadControls();
      loadStatus();
    } catch (err) {
      setNotice({ tone: "error", text: err.message || `Failed to update ${key}` });
    } finally {
      setSavingKey(null);
    }
  };

  const getBadgeTone = (val) => {
    if (val === "enabled") return "green";
    if (val === "test_bypass") return "purple";
    return "slate";
  };

  const getStatusLabel = (val) => {
    if (val === "enabled") return "Live / Active";
    if (val === "test_bypass") return "Test Mock / Bypass";
    if (val === "disabled") return "Disabled / Muted";
    return val;
  };

  return (
    <div className="space-y-6" data-testid="integrations-panel">
      {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      {/* Gateway Controls Bento */}
      <BentoPanel
        title="Live Gateway & API Controls"
        description="Enable or disable external integrations, webhooks, and mock bypass modes live in the running system."
        actions={
          <button className={btn.secondary} onClick={loadControls} disabled={controlsState.loading}>
            <RefreshCw size={14} className={controlsState.loading ? "animate-spin" : ""} />
            <span>Refresh controls</span>
          </button>
        }
      >
        {controlsState.loading && !controls && <Loading label="Loading integration controls…" />}
        {controlsState.error && <Notice tone="error">{controlsState.error}</Notice>}

        {controls && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(controls).map((c) => {
              const currentMode = c.mode || c.value;
              const disabled = Boolean(c.requiresSuperAdmin || c.requires_super_admin) && !isSuperAdmin;
              const isSaving = savingKey === c.key;
              const options = c.options || (c.allowedModes || []).map((m) => ({
                value: m,
                label: c.labels?.[m] || m,
                description: c.labels?.[m] || m,
              }));

              return (
                <div
                  key={c.key}
                  className="bento-card p-5 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.label || c.name}</span>
                        {(c.requiresSuperAdmin || c.requires_super_admin) && (
                          <span title="Requires Super Admin" className="text-amber-500">
                            <ShieldCheck size={14} />
                          </span>
                        )}
                      </div>
                      <Badge tone={getBadgeTone(currentMode)}>
                        {c.labels?.[currentMode] || getStatusLabel(currentMode)}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-white/60 mb-4 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                    {disabled ? (
                      <div className="text-[11px] text-slate-400 italic">
                        Super Admin permissions required to modify
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt) => {
                          const active = currentMode === opt.value;
                          let activeClass = "bg-slate-900 text-white dark:bg-white dark:text-slate-900";
                          if (opt.value === "enabled") {
                            activeClass = "bg-emerald-600 text-white";
                          } else if (opt.value === "test_bypass") {
                            activeClass = "bg-purple-600 text-white";
                          } else if (opt.value === "disabled") {
                            activeClass = "bg-rose-600 text-white";
                          }

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleUpdateControl(c.key, opt.value)}
                              title={opt.description}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                active
                                  ? `${activeClass} shadow-sm`
                                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isSaving && active ? (
                                <Loader2 size={11} className="animate-spin inline mr-1" />
                              ) : null}
                              {opt.label.split("(")[0].trim()}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BentoPanel>

      {/* Infrastructure & Services Radar Bento */}
      <BentoPanel
        title="Infrastructure & Services Radar"
        description="Real-time provider heartbeats, database pools, and external integration health checks."
        actions={
          <button className={btn.secondary} onClick={loadStatus} data-testid="integrations-refresh">
            <RefreshCw size={14} className={statusState.loading ? "animate-spin" : ""} />
            <span>Re-check connections</span>
          </button>
        }
      >
        {statusState.loading && !statusState.data && <Loading label="Checking service connections…" />}
        {statusState.error && <Notice tone="error">{statusState.error}</Notice>}

        {statusState.data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="integration-status-list">
            {statusState.data.integrations.map((item) => (
              <div
                key={item.provider}
                className="bento-card p-5 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {item.provider}
                    </div>
                    <Badge tone={item.healthy ? "green" : item.status === "Error" ? "red" : "slate"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50 break-words leading-relaxed">
                    {item.detail}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Heartbeat:</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className={`w-2 h-2 rounded-full ${item.healthy ? "bg-emerald-500 animate-pulse" : item.status === "Error" ? "bg-rose-500" : "bg-slate-300 dark:bg-white/30"}`} />
                    <span className={item.healthy ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}>
                      {item.healthy ? "Connected" : item.status}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </BentoPanel>
    </div>
  );
}

/* ==========================================================================
   CREDENTIALS BENTO SECTION (SUPER ADMIN ONLY)
   ========================================================================== */

const SECRET_HELP = {
  DUFFEL_API_KEY: "Live airline search and reservation checkout. Set a duffel_live_… key for real inventory.",
  RESEND_API_KEY: "Transactional email provider for e-tickets, invoices, and password resets.",
  SENDER_EMAIL: "Authenticated outbound sender address (e.g. concierge@allskyfares.com).",
  CRM_WEBHOOK_URL: "Secure endpoint receiving HMAC-signed booking events.",
  CRM_WEBHOOK_SECRET: "Signing secret shared with the CRM for payload verification.",
  DUFFEL_WEBHOOK_SECRET: "Inbound Duffel webhook signature secret.",
  DUFFEL_PAYMENTS: "Set to \"enabled\" once Duffel Payments is active on your merchant account.",
  HOTELS_PROVIDER_KEY: "Direct hotel inventory provider key.",
  CARS_PROVIDER_KEY: "Rental car fleet provider API key.",
};

function CredentialsSection() {
  const [state, load] = useLoad("/admin/secrets");
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/admin/secrets/${editing}`, { method: "PUT", body: { value } });
      setNotice({ tone: "success", text: `${editing} successfully saved (AES-256 encrypted). Updated in active runtime.` });
      setEditing(null);
      setValue("");
      load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <BentoPanel
        title="Credentials Vault"
        description="Provider keys encrypted at rest in the database. Secrets are masked and never exposed in plain text."
      >
        {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}
        {state.loading && <Loading />}
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.data && !state.data.encryption_configured && (
          <Notice tone="error">APP_SECRETS_KEY is missing on server environment, preventing encrypted secret updates.</Notice>
        )}

        {state.data && (
          <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden">
            {state.data.secrets.map((s) => (
              <div key={s.name} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound size={14} className="text-orange-500" />
                      <span>{s.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{SECRET_HELP[s.name]}</div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {s.preview && (
                      <code className="rounded-lg bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {s.preview}
                      </code>
                    )}
                    <Badge tone={s.source === "database" ? "green" : s.source === "environment" ? "amber" : "slate"}>
                      {s.source === "missing" ? "not configured" : s.source}
                    </Badge>
                    <button
                      className={btn.secondary}
                      onClick={() => { setEditing(s.name); setValue(""); }}
                    >
                      {s.source === "missing" ? "Configure" : "Replace"}
                    </button>
                  </div>
                </div>

                {editing === s.name && (
                  <form onSubmit={save} className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-2">
                    <input
                      className={input}
                      type={s.name.endsWith("_URL") || s.name === "SENDER_EMAIL" || s.name === "DUFFEL_PAYMENTS" ? "text" : "password"}
                      autoComplete="off"
                      autoFocus
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={`Enter new ${s.name}`}
                      required
                    />
                    <button className={btn.primary}>Save Secret</button>
                    <button type="button" className={btn.secondary} onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </BentoPanel>
    </div>
  );
}

/* ==========================================================================
   LIVE CHAT CONFIGURATION BENTO SECTION
   ========================================================================== */

function ChatSection() {
  const [tawk, setTawk] = useState({ property_id: "", widget_id: "default", enabled: false });
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    apiRequest("/settings/tawk")
      .then((d) => setTawk({ property_id: d.property_id || "", widget_id: d.widget_id || "default", enabled: !!d.enabled }))
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/settings/tawk", { method: "PUT", body: tawk });
      setNotice({ tone: "success", text: "Tawk.to live chat configuration saved." });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6" data-testid="chat-config-panel">
      <BentoPanel
        title="Live Customer Chat Widget"
        description="Configure your Tawk.to messaging widget. The floating chat is displayed to customers and travellers across public pages."
      >
        {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}
        <form onSubmit={save} data-testid="tawk-form" className="max-w-xl space-y-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
            Property ID
            <input
              className={input}
              data-testid="tawk-property-input"
              value={tawk.property_id}
              onChange={(e) => setTawk({ ...tawk, property_id: e.target.value })}
              placeholder="e.g. 65a1b2c3d4e5f6789"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-white/70">
            Widget ID
            <input
              className={input}
              data-testid="tawk-widget-input"
              value={tawk.widget_id}
              onChange={(e) => setTawk({ ...tawk, widget_id: e.target.value })}
              placeholder="default"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-white/80 pt-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-orange-500 cursor-pointer"
              data-testid="tawk-enabled-input"
              checked={tawk.enabled}
              onChange={(e) => setTawk({ ...tawk, enabled: e.target.checked })}
            />
            <span>Enable customer live chat widget across the storefront</span>
          </label>
          <div className="pt-2">
            <button className={btn.primary} data-testid="tawk-save-button" type="submit">
              <span>Save Configuration</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </BentoPanel>
    </div>
  );
}

export {
  MarkupsSection,
  IntegrationsSection,
  CrmSection,
  CredentialsSection,
  ChatSection,
  BookingsSection,
};

export default AdminWorkspaceView;
