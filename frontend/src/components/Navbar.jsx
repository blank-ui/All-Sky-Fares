import React, { useState, useEffect, useRef } from "react";
import { 
  Moon, Sun, Menu, X, UserCircle, LogOut, Ticket, 
  HeadphonesIcon, User as UserIcon, ArrowRight, Sparkles, 
  SlidersHorizontal, Activity, MessageCircle, Shield, ShieldCheck, ChevronDown, Phone,
  Search, Keyboard, HelpCircle, LayoutDashboard
} from "lucide-react";
import Logo from "./Logo";
import LanguagePicker from "./LanguagePicker";
import CurrencyPicker from "./CurrencyPicker";
import { API } from "@/lib/api";

export function Navbar({ dark, setDark, user, setUser, navigate, currentView, onOpenCommandPalette, onOpenShortcuts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [accountOpen]);

  const isStaff = user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user.role);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    try {
      sessionStorage.removeItem("asf-admin-tab");
      sessionStorage.removeItem("asf-workspace-tab");
    } catch (e) {}
    try {
      await fetch(`${API}/auth/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
    } catch (e) {}
    setUser(null);
    setAccountOpen(false);
    navigate("home");
  };

  const go = (view) => {
    if (view === "workspace" || view === "account") {
      try {
        sessionStorage.removeItem("asf-admin-tab");
        sessionStorage.removeItem("asf-workspace-tab");
      } catch (e) {}
    }
    navigate(view);
    setMenuOpen(false);
    setAccountOpen(false);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 ${
        scrolled 
          ? "bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl shadow-lg shadow-slate-900/5 border-b border-slate-200/60 dark:border-white/10" 
          : "bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200/30 dark:border-white/10"
      }`}
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-6">
        {/* Brand Logo */}
        <button 
          className="flex shrink-0 items-center gap-2 cursor-pointer bg-transparent border-0 text-inherit p-0 focus:outline-none"
          data-testid="brand-mark" 
          onClick={() => go("home")}
        >
          <Logo size={36} showText={true} />
        </button>

        {/* Primary Desktop Navigation Links */}
        <nav 
          className="hidden lg:flex items-center gap-1.5 bg-slate-900/5 dark:bg-white/5 backdrop-blur-md p-1 rounded-full border border-slate-900/10 dark:border-white/10 shadow-inner shrink-0 h-10"
          data-testid="primary-navigation"
        >
          <button 
            data-testid="nav-flights-button" 
            onClick={() => go("home")}
            className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
              ["home", "results", "checkout", "confirmation"].includes(currentView)
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-700 dark:text-slate-300 hover:text-sky-500"
            }`}
          >
            Flights
          </button>
          <button 
            data-testid="nav-bookings-button" 
            onClick={() => (user ? go("bookings") : go("login"))}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
              currentView === "bookings" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-700 dark:text-slate-300 hover:text-sky-500"
            }`}
          >
            My Bookings
          </button>
          <button 
            data-testid="nav-help-button" 
            onClick={() => go("help")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
              currentView === "help" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-700 dark:text-slate-300 hover:text-sky-500"
            }`}
          >
            Help & FAQ
          </button>
        </nav>

        {/* Actions Cluster: Search + Preference Capsule + User/Auth + Phone */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">


          {/* Unified Preference Capsule: Currency, Language & Theme Toggle */}
          <div className="hidden sm:flex items-center p-1 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 backdrop-blur-md shadow-2xs h-10 gap-0.5">
            <CurrencyPicker />
            {currentView !== "workspace" && (
              <>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                <LanguagePicker />
              </>
            )}
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
            <button 
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-sky-500 hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Toggle theme" 
              data-testid="theme-toggle-button" 
              onClick={() => setDark(!dark)}
              title="Toggle Dark/Light Mode (Alt+T)"
            >
              {dark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-sky-600" />}
            </button>
          </div>

          {/* User Account / Auth CTA */}
          {user ? (
            <div className="relative" ref={accountRef}>
              <button 
                className="flex items-center gap-2.5 h-10 pl-2 pr-3.5 rounded-full bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 border border-slate-900/10 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-sky-400 transition-all cursor-pointer shadow-2xs"
                data-testid="account-menu-button" 
                onClick={() => setAccountOpen(!accountOpen)}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                  {(user.first_name || user.email || "U")[0].toUpperCase()}
                </div>
                <span className="hidden md:inline font-semibold max-w-[90px] truncate">
                  {user.first_name || user.email.split("@")[0]}
                </span>
                {isStaff && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-extrabold">
                    {user.role}
                  </span>
                )}
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Floating Spatial Account Dropdown */}
              {accountOpen && (
                <div 
                  className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 p-2 rounded-2xl liquid-glass shadow-2xl border border-white/40 dark:border-white/15 animate-fade-in z-50 text-slate-800 dark:text-slate-100"
                  data-testid="account-menu"
                >
                  <div className="px-3 py-2 border-b border-slate-200/50 dark:border-white/10 mb-1">
                    <p className="text-xs font-bold">{user.first_name ? `${user.first_name} ${user.last_name || ""}` : "Traveller"}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  {isStaff ? (
                    <>
                      <button 
                        data-testid="account-workspace-button" 
                        onClick={() => go("account")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LayoutDashboard size={15} className="text-emerald-500" /> Modern Dashboard
                      </button>
                      <button 
                        data-testid="account-admin-console-button" 
                        onClick={() => go("adminConsole")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-orange-500/10 hover:text-orange-600 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <ShieldCheck size={15} className="text-orange-500" /> Admin Console
                      </button>
                      <button 
                        onClick={() => { setAccountOpen(false); onOpenCommandPalette(); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2"><Search size={15} /> Quick Search</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">Ctrl K</kbd>
                      </button>
                      <button 
                        onClick={() => { setAccountOpen(false); onOpenShortcuts(); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2"><Keyboard size={15} /> Shortcuts Guide</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">?</kbd>
                      </button>
                      <button 
                        data-testid="account-signout-button" 
                        onClick={signOut}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        data-testid="account-workspace-button-customer" 
                        onClick={() => go("workspace")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LayoutDashboard size={15} className="text-emerald-500" /> My Workspace
                      </button>
                      <button 
                        data-testid="account-profile-button" 
                        onClick={() => go("account")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <UserIcon size={15} /> My Profile
                      </button>
                      <button 
                        data-testid="account-bookings-button" 
                        onClick={() => go("bookings")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Ticket size={15} /> My Bookings
                      </button>
                      <button 
                        data-testid="account-support-button" 
                        onClick={() => go("support")}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <HeadphonesIcon size={15} /> Support
                      </button>
                      <button 
                        onClick={() => { setAccountOpen(false); onOpenCommandPalette(); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2"><Search size={15} /> Quick Search</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">Ctrl K</kbd>
                      </button>
                      <button 
                        onClick={() => { setAccountOpen(false); onOpenShortcuts(); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-sky-500/10 hover:text-sky-500 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2"><Keyboard size={15} /> Shortcuts Guide</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">?</kbd>
                      </button>
                      <div className="h-px bg-slate-200/50 dark:border-white/10 my-1" />
                      <button 
                        data-testid="account-signout-button" 
                        onClick={signOut}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button 
                className="hidden sm:inline-flex whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 transition-colors cursor-pointer"
                data-testid="sign-in-button" 
                onClick={() => go("login")}
              >
                Sign in
              </button>
              <button 
                className="spatial-btn-primary whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                data-testid="sign-up-button" 
                onClick={() => go("signup")}
              >
                <span>Sign up</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* 24/7 Concierge Hotline: Ultra-visible & Bold */}
          <a 
            href="tel:+18778184167"
            onClick={() => { window.dispatchEvent(new CustomEvent("open-sales-popup")); }}
            className="flex items-center gap-2 h-10 px-4 rounded-full text-xs font-extrabold tracking-tight bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Call 24/7 Concierge: +1 (877) 818-4167"
            data-testid="nav-phone-button"
          >
            <Phone size={13} className="text-white fill-white shrink-0" />
            <span className="font-mono font-black text-white leading-none hidden sm:inline">+1 (877) 818-4167</span><span className="font-mono font-black text-white leading-none sm:hidden text-[11px]">Call</span>
          </a>

          {/* Keyboard Shortcuts Help Button: Round icon with ? mark at right side of phone number */}
          <button 
            type="button"
            onClick={onOpenShortcuts}
            // Keyboard shortcuts only help with a keyboard; on phones the space goes to the menu button.
            className="hidden lg:flex w-10 h-10 rounded-full bg-slate-900/5 dark:bg-white/10 hover:bg-slate-900/10 dark:hover:bg-white/20 border border-slate-900/10 dark:border-white/20 items-center justify-center text-slate-700 dark:text-slate-100 hover:text-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Keyboard Shortcuts Guide (?)"
            aria-label="Keyboard Shortcuts Guide"
            data-testid="nav-shortcuts-help-button"
          >
            <span className="font-black text-xs font-mono leading-none">?</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button 
            className="lg:hidden w-8.5 h-8.5 rounded-full liquid-glass flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            data-testid="mobile-menu-button" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Glass Drawer */}
      {menuOpen && (
        <div className="lg:hidden mt-3 p-4 rounded-2xl liquid-glass shadow-2xl border border-white/20 animate-fade-in flex flex-col gap-2">
          <button onClick={() => go("home")} className="text-left px-3 py-2 rounded-xl font-bold text-sm hover:bg-sky-500/10 text-slate-800 dark:text-slate-100">Flights</button>
          <button onClick={() => (user ? go("bookings") : go("login"))} className="text-left px-3 py-2 rounded-xl font-bold text-sm hover:bg-sky-500/10 text-slate-800 dark:text-slate-100">My Bookings</button>
          <button onClick={() => go("help")} className="text-left px-3 py-2 rounded-xl font-bold text-sm hover:bg-sky-500/10 text-slate-800 dark:text-slate-100">Help Center</button>
          <button onClick={() => { setMenuOpen(false); onOpenShortcuts(); }} className="text-left px-3 py-2 rounded-xl font-bold text-sm hover:bg-sky-500/10 text-slate-800 dark:text-slate-100 flex items-center justify-between"><span>Keyboard Shortcuts</span><span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-mono">?</span></button>
          <button onClick={() => go("workspace")} className="text-left px-3 py-2 rounded-xl font-bold text-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">My Workspace</button>
          <a 
            href="tel:+18778184167" 
            onClick={() => { setMenuOpen(false); window.dispatchEvent(new CustomEvent("open-sales-popup")); }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <Phone size={15} />
            <span>Call Concierge: +1 (877) 818-4167</span>
          </a>
          {currentView !== "workspace" && (
            <>
              <div className="pt-3 mt-1 border-t border-slate-200/50 dark:border-white/10">
                <CurrencyPicker variant="menu" onPicked={() => setMenuOpen(false)} />
              </div>
              <div className="pt-3 mt-1 border-t border-slate-200/50 dark:border-white/10">
                <LanguagePicker variant="menu" onPicked={() => setMenuOpen(false)} />
              </div>
            </>
          )}
          <div className="pt-3 mt-1 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Dark mode</span>
            <button 
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900/5 dark:bg-white/10"
            >
              {dark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-sky-600" />}
            </button>
          </div>
          {!user && (
            <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 flex flex-col gap-2">
              <button onClick={() => go("login")} className="w-full py-2.5 rounded-xl font-bold text-xs spatial-btn-secondary text-center">Sign in</button>
              <button onClick={() => go("signup")} className="w-full py-2.5 rounded-xl font-bold text-xs spatial-btn-primary text-center">Create account</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
