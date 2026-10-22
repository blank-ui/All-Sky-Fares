import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Keyboard, Search, Moon, Sun, Ticket, HelpCircle, 
  SlidersHorizontal, Home, Coins, ArrowRight, X, Command,
  Compass, ShieldCheck, Check, Sparkles, FileText, Phone
} from "lucide-react";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";

function getShortcutGroups(isStaff) {
  const globalNavShortcuts = [
    { keys: ["Alt", "H"], label: "Go to Home / Flight Search" },
    { keys: ["Alt", "B"], label: "Go to My Bookings" },
    ...(isStaff ? [{ keys: ["Alt", "W"], label: "Go to Workspace" }] : []),
    { keys: ["Alt", "S"], label: "Go to Help & Support" },
    { keys: ["Alt", "T"], label: "Toggle Light / Dark Mode" },
    { keys: ["Alt", "C"], label: "Toggle Currency Selector" },
  ];

  const toolsShortcuts = [
    { keys: ["Ctrl / ⌘", "K"], label: "Open Command Palette / Fast Search" },
    { keys: ["?"], label: "Show Keyboard Shortcuts Guide" },
    { keys: ["Esc"], label: "Close active modal, drawer, or dialog" },
    { keys: ["/"], label: "Focus flight search / filter input" },
  ];

  const groups = [
    { title: "Navigation", shortcuts: globalNavShortcuts },
    { title: "Flight Search & Tools", shortcuts: toolsShortcuts },
  ];

  if (isStaff) {
    groups.push({
      title: "Workspace Actions",
      shortcuts: [
        { keys: ["1"], label: "Switch to Overview / Dashboard" },
        { keys: ["2"], label: "Switch to Reservations Ledger" },
        { keys: ["3"], label: "Switch to Route Markups" },
        { keys: ["4"], label: "Switch to CRM Outbox" },
        { keys: ["5"], label: "Switch to System Integrations" },
        { keys: ["R"], label: "Refresh active workspace data" },
        { keys: ["E"], label: "Export route markups to CSV" },
        { keys: ["N"], label: "Create new route markup rule" },
      ],
    });
  } else {
    groups.push({
      title: "Portal Actions",
      shortcuts: [
        { keys: ["1"], label: "Switch to Dashboard" },
        { keys: ["2"], label: "Switch to My Bookings" },
        { keys: ["3"], label: "Switch to Invoices & E-Tickets" },
        { keys: ["4"], label: "Switch to Travel Reports" },
        { keys: ["5"], label: "Switch to Account Settings" },
        { keys: ["R"], label: "Refresh active bookings data" },
      ],
    });
  }

  return groups;
}

export function KeyboardShortcutsModal({ isOpen, onClose, user }) {
  const isStaff = user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user?.role);
  const groups = useMemo(() => getShortcutGroups(isStaff), [isStaff]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="keyboard-shortcuts-modal"
    >
      <div 
        className="w-full max-w-2xl rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-500 dark:text-white/50">Navigate AllSkyFares with lightning speed</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-white/40">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.shortcuts.map((sc, sIdx) => (
                  <div 
                    key={sIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium pr-2">
                      {sc.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k, kIdx) => (
                        <kbd 
                          key={kIdx}
                          className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 shadow-xs text-[11px] font-mono font-bold text-slate-900 dark:text-white"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-white/40">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-700 dark:text-white">Esc</kbd> to close</span>
          <span className="flex items-center gap-1">Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-700 dark:text-white">Ctrl + K</kbd> anytime for Command Palette</span>
        </footer>
      </div>
    </div>
  );
}

/**
 * Universal Command Palette (Ctrl+K / Cmd+K)
 */
export function CommandPalette({ isOpen, onClose, navigate, dark, setDark, user }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { currency, setCurrency, currencies } = useCurrency();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Ensure active command stays in view on arrow navigation
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-command-index="${selectedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const isStaff = user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user?.role);

  const items = useMemo(() => {
    const list = [
      { id: "nav-home", title: "Search Flights & Home", category: "Navigation", icon: Home, action: () => navigate("home"), shortcut: "Alt+H" },
      { id: "nav-bookings", title: "My Bookings & Tickets", category: "Navigation", icon: Ticket, action: () => (user ? navigate("bookings") : navigate("login")), shortcut: "Alt+B" },
      ...(isStaff ? [{ id: "nav-workspace", title: "Staff & Admin Workspace", category: "Staff", icon: SlidersHorizontal, action: () => navigate("workspace"), shortcut: "Alt+W" }] : []),
      { id: "nav-help", title: "Help Center & Passenger FAQ", category: "Support", icon: HelpCircle, action: () => navigate("help"), shortcut: "Alt+S" },
      { id: "toggle-theme", title: `Switch to ${dark ? "Light" : "Dark"} Mode`, category: "Preferences", icon: dark ? Sun : Moon, action: () => setDark(!dark), shortcut: "Alt+T" },
      { id: "policy-terms", title: "Terms of Service", category: "Legal", icon: FileText, action: () => navigate("terms") },
      { id: "policy-privacy", title: "Privacy Policy", category: "Legal", icon: FileText, action: () => navigate("privacy") },
      { id: "policy-refund", title: "Refund & 24-Hr Cancellation Policy", category: "Legal", icon: FileText, action: () => navigate("refund") },
    ];

    // Currency quick switcher entries
    Object.values(currencies).forEach((c) => {
      list.push({
        id: `currency-${c.code}`,
        title: `Change Currency to ${c.code} (${c.symbol} - ${c.name})`,
        category: "Currencies",
        icon: Coins,
        action: () => setCurrency(c.code),
        badge: currency === c.code ? "Active" : undefined,
      });
    });

    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((item) => 
      item.title.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    );
  }, [query, dark, setDark, navigate, user, currency, setCurrency, currencies, isStaff]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
      data-testid="command-palette-backdrop"
    >
      <div 
        className="w-full max-w-xl rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (e.g. 'EUR', 'Bookings', 'Theme')..."
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400 font-bold">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-white/40">
              No matching actions found for "{query}"
            </div>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-command-index={idx}
                  onClick={() => { item.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer text-xs sm:text-sm font-semibold transition-colors ${
                    isSelected 
                      ? "bg-sky-500 text-white shadow-sm" 
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                  data-testid={`command-item-${item.id}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isSelected ? "text-white" : "text-slate-400 dark:text-white/50"} />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40"}`}>
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight size={14} className="text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400 dark:text-white/40">
          <span className="flex items-center gap-2">
            <span>Use <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[9px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[9px]">↓</kbd> to navigate</span>
            <span>·</span>
            <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[9px]">↵</kbd> to select</span>
          </span>
          <span className="font-mono text-[10px]">AllSkyFares Command System</span>
        </div>
      </div>
    </div>
  );
}
