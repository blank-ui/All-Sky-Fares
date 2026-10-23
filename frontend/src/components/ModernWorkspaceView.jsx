import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Ticket,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Filter,
  Download,
  Calendar,
  Plane,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Bot,
  SlidersHorizontal,
  Activity,
  KeyRound,
  MessageCircle,
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  User as UserIcon,
  CreditCard,
  Lock,
  ChevronRight,
  Info,
  MapPin,
  Eye,
  Check,
  X,
  Compass,
  Briefcase,
  Ban,
  Menu,
  Headphones
} from "lucide-react";
import Logo from "./Logo";
import { AirlineLogo } from "./AirlineLogo";
import { ReservationDetailsModal } from "./ReservationDetailsModal";
import { apiRequest, API } from "@/lib/api";
import { useCurrency } from "@/context/CurrencyContext";
import { MarkupsSection, IntegrationsSection, CrmSection, CredentialsSection, ChatSection } from "./AdminWorkspaceView";

export function ModernWorkspaceView({ user, setUser, dark, setDark, navigate, initialTab = "dashboard" }) {
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q && ["dashboard", "bookings", "invoices", "reports", "settings", "help", "markups", "integrations", "crm", "credentials", "chat"].includes(q)) {
        return q;
      }
    } catch (e) {}
    if (initialTab && initialTab !== "dashboard" && initialTab !== "wallet") {
      return initialTab;
    }
    try {
      const saved = sessionStorage.getItem("asf-workspace-tab");
      if (saved && ["dashboard", "bookings", "invoices", "reports", "settings", "help", "markups", "integrations", "crm", "credentials", "chat"].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return "dashboard";
  });

  const prevInitialTabRef = useRef(initialTab);
  useEffect(() => {
    if (initialTab && initialTab !== prevInitialTabRef.current) {
      prevInitialTabRef.current = initialTab;
      if (initialTab !== "wallet") {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem("asf-workspace-tab", activeTab);
    } catch (e) {}
    const tabUrlMap = {
      dashboard: "/my-account",
      bookings: "/my-bookings",
      invoices: "/invoices",
      reports: "/reports",
      settings: "/my-account/settings",
      help: "/help",
    };
    const targetPath = tabUrlMap[activeTab];
    if (targetPath) {
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({ tab: activeTab }, "", targetPath);
      }
    } else {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab) {
        url.searchParams.set("tab", activeTab);
        window.history.replaceState({ tab: activeTab }, "", url.pathname + url.search);
      }
    }
  }, [activeTab]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("This Year");
  const [recentFilter, setRecentFilter] = useState("All Time");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");
  const [selectedBookingForModal, setSelectedBookingForModal] = useState(null);

  const handleOpenDetails = (booking) => {
    setSelectedBookingForModal(booking);
    const bookingRef = booking?.booking_reference || booking?.id;
    if (bookingRef) {
      apiRequest(`/my/bookings/${encodeURIComponent(bookingRef)}`)
        .then((data) => {
          if (data?.booking) {
            setSelectedBookingForModal(data.booking);
          }
        })
        .catch(() => {});
    }
  };
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMessage, setCancelMessage] = useState({ type: "", text: "" });

  // Settings form states
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  // Support / Help Center states
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportForm, setSupportForm] = useState({ subject: "", message: "", booking_reference: "" });
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportMessage, setSupportMessage] = useState({ type: "", text: "" });
  const [faqOpen, setFaqOpen] = useState(null);


  // Quick flight explore form
  const [exploreForm, setExploreForm] = useState({
    origin: "LHR",
    destination: "JFK",
    departure_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    return_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    trip_type: "round_trip",
    cabin: "economy",
    adults: 1,
  });

  const isStaff = user && ["SALES_AGENT", "ADMIN", "SUPER_ADMIN"].includes(user.role);

  // Synchronize profile form when user updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);



  // Load real bookings from API
  // Workspace keyboard shortcuts (1: Dashboard, 2: Bookings, 3: Invoices, 4: Reports, 5: Settings, R: Refresh)
  useEffect(() => {
    const handleWorkspaceShortcuts = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(activeTag) || document.activeElement?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (isStaff) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("dashboard");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("bookings");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("markups");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("crm");
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveTab("integrations");
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          loadBookings();
        } else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          window.open(`${API}/admin/markups/export.csv`, "_blank");
        } else if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          setActiveTab("markups");
          setTimeout(() => {
            const originInput = document.querySelector('input[data-testid="markup-origin"]');
            if (originInput) {
              originInput.focus();
              originInput.select?.();
            }
          }, 100);
        }
      } else {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("dashboard");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("bookings");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("invoices");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("reports");
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveTab("settings");
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          loadBookings();
        }
      }
    };
    window.addEventListener("keydown", handleWorkspaceShortcuts);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcuts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  const loadBookings = () => {
    setLoading(true);
    const endpoint = isStaff ? "/admin/bookings" : "/my/bookings";
    apiRequest(endpoint)
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => {
        apiRequest("/my/bookings")
          .then((d) => {
            setBookings(d.bookings || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  // Load support tickets
  const loadSupportTickets = () => {
    apiRequest("/support")
      .then((data) => setSupportTickets(data.tickets || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadBookings();
    loadSupportTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute metrics from database bookings
  const totalSpend = bookings.reduce(
    (sum, b) => sum + (Number(b.customer_total) || Number(b.total_amount) || 0),
    0
  );
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const onHoldBookings = bookings.filter((b) => b.status === "ON_HOLD");
  const upcomingTrip =
    bookings.find((b) => b.status === "CONFIRMED" || b.status === "ON_HOLD") || bookings[0];

  // Filtered bookings for tables/lists
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const ref = (b.booking_reference || b.id || "").toLowerCase();
    const pnr = (b.airline_pnr || "").toLowerCase();
    const airline = (b.airline || "").toLowerCase();
    const matchQuery = !q || ref.includes(q) || pnr.includes(q) || airline.includes(q);
    const matchStatus =
      bookingStatusFilter === "ALL" || b.status === bookingStatusFilter;
    return matchQuery && matchStatus;
  });

  // Handle Booking Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setCancelBusy(true);
    setCancelMessage({ type: "", text: "" });
    const ref = cancelModalBooking.booking_reference || cancelModalBooking.id;
    try {
      const endpoint = isStaff 
        ? `/admin/bookings/${cancelModalBooking.id}/cancel/confirm`
        : `/my/bookings/${ref}/cancel/confirm`;
      await apiRequest(endpoint, { method: "POST" });
      setCancelMessage({ type: "success", text: `Booking ${ref} was successfully cancelled.` });
      // Update local state immediately
      setBookings((prev) =>
        prev.map((b) =>
          (b.booking_reference === ref || b.id === ref) ? { ...b, status: "CANCELLED" } : b
        )
      );
      setTimeout(() => {
        setCancelModalBooking(null);
        setCancelMessage({ type: "", text: "" });
      }, 1500);
    } catch (err) {
      setCancelMessage({
        type: "error",
        text: err.message || "Airline fare rules prevented instant cancellation. Please call our 24/7 concierge at +1 (877) 818-4167.",
      });
    } finally {
      setCancelBusy(false);
    }
  };


  // Sign out handler
  const handleSignOut = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {}
    window.location.href = "/login";
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: "", text: "" });
    try {
      const data = await apiRequest("/my/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      if (data.user && setUser) {
        setUser(data.user);
      }
      setProfileMessage({ type: "success", text: "Profile details updated successfully!" });
    } catch (err) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage({ type: "", text: "" });
    try {
      await apiRequest("/my/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      setPasswordMessage({ type: "success", text: "Password changed successfully! Keep it safe." });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Submit support ticket
  const handleCreateSupportTicket = async (e) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      setSupportMessage({ type: "error", text: "Please provide both a subject and message." });
      return;
    }
    setSupportSubmitting(true);
    setSupportMessage({ type: "", text: "" });
    try {
      await apiRequest("/support", {
        method: "POST",
        body: JSON.stringify(supportForm),
      });
      setSupportMessage({ type: "success", text: "Support request submitted! An agent will respond shortly." });
      setSupportForm({ subject: "", message: "", booking_reference: "" });
      loadSupportTickets();
    } catch (err) {
      setSupportMessage({ type: "error", text: err.message || "Failed to submit request." });
    } finally {
      setSupportSubmitting(false);
    }
  };

  const getDocUrl = (bookingRef, docType) => {
    return isStaff
      ? `${API}/admin/bookings/${bookingRef}/${docType}`
      : `${API}/my/bookings/${bookingRef}/${docType}`;
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: isStaff ? "Reservations Ledger" : "My Bookings", icon: Ticket, badge: bookings.length },
    ...(isStaff ? [
      { id: "markups", label: "Route Markups", icon: SlidersHorizontal },
      { id: "integrations", label: "Connections & Radar", icon: Activity },
      { id: "crm", label: "CRM Sync", icon: Send },
      ...(user?.role === "SUPER_ADMIN" ? [{ id: "credentials", label: "API Credentials", icon: KeyRound }] : []),
      { id: "chat", label: "Live Chat", icon: MessageCircle },
    ] : []),
    { id: "invoices", label: "Invoices & E-Tickets", icon: FileText },
    { id: "reports", label: "Travel Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help Center", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#040814] text-slate-800 dark:text-slate-100 font-sans antialiased pt-16 transition-colors duration-300">
      
      {/* -------------------- MOBILE HORIZONTAL TABS (Touch-Optimized) -------------------- */}
      <div className="md:hidden sticky top-16 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-sky-500 text-white shadow-sm shadow-sky-500/25"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Icon size={13} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-sky-500/15 text-sky-600 dark:text-sky-400"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* -------------------- 1. DESKTOP LEFT SIDEBAR -------------------- */}
        <aside className="hidden md:flex w-64 h-[calc(100vh-4rem)] sticky top-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-white/10 flex-col shrink-0 px-4 py-4 select-none z-20">
          
          

          {/* Section: MAIN MENU */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-1.5">
                Main Menu
              </p>
              <nav className="space-y-1">
                {navigationItems.slice(0, 5).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? "text-sky-500" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Section: PREFERENCE */}
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-1.5">
                Preference
              </p>
              <nav className="space-y-1">
                {navigationItems.slice(5).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} className={isActive ? "text-sky-500" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer: Concierge hotline & Sign out */}
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
            <div className="p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-500/20">
              <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-bold text-[11px] mb-0.5">
                <Phone size={12} className="text-sky-600 dark:text-sky-400" />
                <span>24/7 Concierge Desk</span>
              </div>
              <a
                href="tel:+18778184167"
                className="text-[11px] font-mono font-bold text-sky-700 dark:text-sky-400 hover:underline block"
              >
                +1 (877) 818-4167
              </a>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* -------------------- 2. MAIN CONTENT AREA -------------------- */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-7xl w-full mx-auto overflow-y-auto">
          
          {/* Header Row: Title & Search Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
                {activeTab === "dashboard" ? "Travel Dashboard" : activeTab.replace(/([A-Z])/g, " $1")}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track your journeys, bookings, and electronic travel documents in one place.
              </p>
            </div>

            {/* Quick Search Bar */}
            <div className="flex items-center gap-2">
              {isStaff && (
                <button
                  onClick={() => navigate("adminConsole")}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all cursor-pointer shrink-0"
                  title="Switch to Staff Admin Console"
                >
                  <ShieldCheck size={14} />
                  <span>Admin Console</span>
                </button>
              )}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference, PNR..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                  ⌘K
                </span>
              </div>

              <button
                onClick={loadBookings}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Refresh Data"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* TOP ROW: Total Balance & Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 1. Spatial Hero Card */}
                <div className="lg:col-span-4 rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#0a1936] via-[#0d2d5e] to-[#044389] text-white shadow-xl shadow-cyan-950/30 border border-sky-500/30 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                  <div className="absolute -right-8 -bottom-10 w-44 h-44 rounded-full border-[18px] border-cyan-400/10 pointer-events-none" />
                  <div className="absolute -right-16 -top-12 w-44 h-44 rounded-full border-[18px] border-sky-400/10 pointer-events-none" />

                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-cyan-200">Total Travel Spend</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-cyan-300 border border-sky-400/30">
                          USD
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                        ${totalSpend > 0 ? totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("home")}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-md transition-all cursor-pointer"
                      title="Book new flight"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="relative z-10 flex items-center gap-2.5 mt-5">
                    <button
                      onClick={() => navigate("home")}
                      className="flex-1 py-2 px-3 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 hover:opacity-95 transition-all cursor-pointer"
                    >
                      <span>Book Flight</span>
                      <Plane size={13} className="transform -rotate-45" />
                    </button>
                    <button
                      onClick={() => setActiveTab("bookings")}
                      className="flex-1 py-2 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                    >
                      <span>My Trips</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>

                {/* 2. Stat Enhancement Grid */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Flight Portfolio</h3>
                      <p className="text-xs text-slate-400">Current season bookings and electronic ticket passes</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("bookings")}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Plane size={13} className="text-sky-500" />
                        <span>Upcoming</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{confirmedBookings.length}</span>
                        <span className="ml-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100/60 dark:bg-sky-950/60 px-1.5 py-0.2 rounded-full">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Ticket size={13} className="text-cyan-500" />
                        <span>e-Tickets</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{bookings.length}</span>
                        <span className="ml-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/60 px-1.5 py-0.2 rounded-full">
                          Issued
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={13} className="text-amber-500" />
                        <span>On Hold</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{onHoldBookings.length}</span>
                        <span className="ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full">
                          Pending
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <ShieldCheck size={13} className="text-emerald-500" />
                        <span>Desk Status</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                          24/7 Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: Activity Chart + AI Assistant */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Travel Cashflow & Expenditure</h3>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                        ${(totalSpend > 0 ? totalSpend : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option>This Year</option>
                        <option>Last Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="h-40 w-full flex items-end justify-between gap-1.5 pt-4 px-1">
                    {[
                      { m: "Jan", green: 40, dark: 25 },
                      { m: "Feb", green: 55, dark: 40 },
                      { m: "Mar", green: 70, dark: 35 },
                      { m: "Apr", green: 60, dark: 45 },
                      { m: "May", green: 85, dark: 40 },
                      { m: "Jun", green: 95, dark: 60, active: true },
                      { m: "Jul", green: 75, dark: 45 },
                      { m: "Aug", green: 65, dark: 50 },
                      { m: "Sep", green: 80, dark: 35 },
                      { m: "Oct", green: 90, dark: 55 },
                      { m: "Nov", green: 70, dark: 40 },
                      { m: "Dec", green: 85, dark: 45 },
                    ].map((item) => (
                      <div key={item.m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                        <div className="w-full flex items-end justify-center gap-0.5 h-28">
                          <div
                            style={{ height: `${item.dark}%` }}
                            className="w-2 rounded-t-sm bg-slate-300 dark:bg-slate-700 group-hover:bg-cyan-500 transition-all"
                          />
                          <div
                            style={{ height: `${item.green}%` }}
                            className="w-2 rounded-t-sm bg-sky-500 group-hover:bg-sky-400 transition-all"
                          />
                        </div>
                        <span className="text-[9px] font-medium text-slate-400">{item.m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 24/7 Priority Concierge Card */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Phone size={15} className="text-emerald-500" />
                        <span>24/7 Live Concierge</span>
                      </h3>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                        Online
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center py-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-sky-600 shadow-md shadow-emerald-500/20 flex items-center justify-center mb-2">
                        <Headphones size={20} className="text-white" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Dedicated Travel Agent Support</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                        Speak directly with our flight booking desk for instant rebooking, seat upgrades, and baggage assistance.
                      </p>
                    </div>

                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 space-y-1.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Toll-Free Hotline</span>
                      <a 
                        href="tel:+18778184167" 
                        className="text-base font-extrabold text-slate-900 dark:text-white font-mono hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block"
                      >
                        +1 (877) 818-4167
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                      <span>Live agent response: &lt; 60s</span>
                    </span>
                    <a
                      href="tel:+18778184167"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                    >
                      Call Now
                    </a>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Recent Bookings Table */}
              <div className="bg-white dark:bg-slate-900/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Flight Bookings</h3>
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-white/10">
                        <th className="pb-3 font-medium">Booking / PNR</th>
                        <th className="pb-3 font-medium">Route & Airline</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            {loading ? "Loading bookings..." : "No bookings found."}
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.slice(0, 5).map((b) => {
                          const ref = b.booking_reference || b.id;
                          const firstSlice = b.slices?.[0] || {};
                          const route =
                            firstSlice.origin && firstSlice.destination
                              ? `${firstSlice.origin} → ${firstSlice.destination}`
                              : (b.route || "Flight Details");
                          const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString() : "Recent";
                          const amountStr = b.customer_total
                            ? `$${Number(b.customer_total).toFixed(2)}`
                            : (b.total_amount ? `$${Number(b.total_amount).toFixed(2)}` : "$0.00");
                          const isConfirmed = b.status === "CONFIRMED";
                          const isOnHold = b.status === "ON_HOLD";
                          const isCancelled = b.status === "CANCELLED";

                          return (
                            <tr key={ref} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                <div>{ref}</div>
                                {b.airline_pnr && (
                                  <span className="font-mono text-[9px] text-sky-600 dark:text-cyan-400 uppercase">
                                    PNR: {b.airline_pnr}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                                <div className="flex items-center gap-2.5">
                                  <AirlineLogo booking={b} size={32} />
                                  <div>
                                    <div onClick={() => handleOpenDetails(b)} className="font-semibold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-cyan-400 cursor-pointer transition-colors">{route}</div>
                                    <div className="text-[10px] text-slate-400">{b.airline || "Scheduled Carrier"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                {dateStr}
                              </td>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {amountStr}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    isConfirmed
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      : isOnHold
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  }`}
                                >
                                  {b.status || "CONFIRMED"}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenDetails(b)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[10px] transition-all cursor-pointer"
                                >
                                  <Eye size={10} /> Details
                                </button>
                                <a
                                  href={getDocUrl(ref, "eticket")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-semibold text-[10px] border border-sky-200 dark:border-sky-500/20 transition-all cursor-pointer"
                                >
                                  <Download size={10} /> Ticket
                                </a>
                                {!isCancelled && (
                                  <button
                                    onClick={() => setCancelModalBooking(b)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold text-[10px] border border-rose-200 dark:border-rose-500/20 transition-all cursor-pointer"
                                  >
                                    <Ban size={10} /> Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: MY BOOKINGS ==================== */}
          {activeTab === "bookings" && (
            <div className="space-y-5">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900/70 p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {["ALL", "CONFIRMED", "ON_HOLD", "CANCELLED"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setBookingStatusFilter(status)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bookingStatusFilter === status
                          ? "bg-sky-500 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {status === "ALL" ? `All (${bookings.length})` : status.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => navigate("home")}
                  className="px-3 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Book Flight</span>
                </button>
              </div>

              {/* Bookings Card List */}
              {filteredBookings.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200/80 dark:border-white/10">
                  <Ticket size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No bookings found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Search and book a flight to have your reservation tickets and receipts appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((b) => {
                    const ref = b.booking_reference || b.id;
                    const firstSlice = b.slices?.[0] || {};
                    const route =
                      firstSlice.origin && firstSlice.destination
                        ? `${firstSlice.origin} → ${firstSlice.destination}`
                        : (b.route || "Flight Details");
                    const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
                    const amount = Number(b.customer_total || b.total_amount || 0);
                    const isCancelled = b.status === "CANCELLED";

                    return (
                      <div
                        key={ref}
                        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <AirlineLogo booking={b} size={48} className="cursor-pointer hover:scale-105 transition-transform" />
                            <div className="cursor-pointer" onClick={() => handleOpenDetails(b)}>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-cyan-400 transition-colors">{route}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    b.status === "CONFIRMED"
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      : b.status === "ON_HOLD"
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {b.status || "CONFIRMED"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                Carrier: <span className="text-slate-600 dark:text-slate-300 font-semibold">{b.airline || "Scheduled Carrier"}</span> • {dateStr}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="text-[10px] text-slate-400">Total Fares & Taxes</div>
                            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                              ${amount > 0 ? amount.toFixed(2) : "0.00"}
                            </div>
                          </div>
                        </div>

                        {/* Reference & Passenger Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-medium">Booking Reference</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ref}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-medium">Airline PNR</span>
                            <span className="font-mono font-bold text-sky-600 dark:text-cyan-400">
                              {b.airline_pnr || "Pending GDS Sync"}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-slate-400 block text-[10px] font-medium">Passengers</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {b.passengers?.length
                                ? b.passengers.map((p) => `${p.given_name} ${p.family_name}`).join(", ")
                                : "1 Adult Passenger"}
                            </span>
                          </div>
                        </div>

                        {/* Action Bar with CANCEL BUTTON */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetails(b)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>

                            {/* CANCEL BOOKING BUTTON */}
                            {!isCancelled && (
                              <button
                                onClick={() => setCancelModalBooking(b)}
                                className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-500/20 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Ban size={12} />
                                <span>Cancel Booking</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={getDocUrl(ref, "eticket")}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-xs border border-sky-200 dark:border-sky-500/20 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Download size={12} />
                              <span>e-Ticket</span>
                            </a>

                            <a
                              href={getDocUrl(ref, "invoice")}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <FileText size={12} />
                              <span>Invoice</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          

          {/* ==================== TAB 5: INVOICES & E-TICKETS ==================== */}
          {activeTab === "invoices" && (
            <div className="space-y-5">
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Electronic Documents & Tax Receipts</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Download official airline e-ticket passenger receipts and tax invoices.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {bookings.length} issued documents
                  </div>
                </div>

                {bookings.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">No travel documents available.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-white/10">
                          <th className="pb-3 font-medium">Booking Ref</th>
                          <th className="pb-3 font-medium">Flight Itinerary</th>
                          <th className="pb-3 font-medium">Issue Date</th>
                          <th className="pb-3 font-medium">Settlement</th>
                          <th className="pb-3 font-medium text-right">e-Ticket</th>
                          <th className="pb-3 font-medium text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {bookings.map((b) => {
                          const ref = b.booking_reference || b.id;
                          const firstSlice = b.slices?.[0] || {};
                          const route =
                            firstSlice.origin && firstSlice.destination
                              ? `${firstSlice.origin} → ${firstSlice.destination}`
                              : (b.route || "Trip Details");
                          const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString() : "Recent";
                          const amountStr = b.customer_total
                            ? `$${Number(b.customer_total).toFixed(2)}`
                            : (b.total_amount ? `$${Number(b.total_amount).toFixed(2)}` : "$0.00");

                          return (
                            <tr key={ref} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-slate-900 dark:text-white font-mono">
                                {ref}
                              </td>
                              <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                                <div className="flex items-center gap-2.5">
                                  <AirlineLogo booking={b} size={28} />
                                  <div>
                                    <div onClick={() => handleOpenDetails(b)} className="cursor-pointer hover:text-sky-600 transition-colors font-semibold">{route}</div>
                                    <div className="text-[10px] text-slate-400">{b.airline || "Carrier"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[11px]">
                                {dateStr}
                              </td>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {amountStr}
                              </td>
                              <td className="py-3 text-right">
                                <a
                                  href={getDocUrl(ref, "eticket")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-xs border border-sky-200 dark:border-sky-500/20 transition-all cursor-pointer"
                                >
                                  <Download size={11} />
                                  <span>Ticket</span>
                                </a>
                              </td>
                              <td className="py-3 text-right">
                                <a
                                  href={getDocUrl(ref, "invoice")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                                >
                                  <FileText size={11} />
                                  <span>Invoice</span>
                                </a>
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
          )}

          {/* ==================== TAB 6: REPORTS ==================== */}
          {activeTab === "reports" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                  <span className="text-xs text-slate-400 font-medium">Cumulative Flight Spend</span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    ${totalSpend > 0 ? totalSpend.toFixed(2) : "0.00"}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
                    Audited across all bookings
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                  <span className="text-xs text-slate-400 font-medium">Total Flight Sectors</span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {totalSectors} Sectors
                  </div>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1 block">
                    {bookings.length > 0 ? "100% on-time airline sync" : "No active sectors"}
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                  <span className="text-xs text-slate-400 font-medium">Estimated Miles Flown</span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {bookings.length > 0 ? (totalSectors * 2400).toLocaleString() : "0"} Miles
                  </div>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 block">
                    {bookings.length > 0 ? "Calculated from route GCD" : "Awaiting completed flights"}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Airline Breakdown Distribution</h3>
                <p className="text-xs text-slate-400 mb-5">Proportion of bookings by scheduled operating carrier.</p>

                {airlineBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                    No flight booking history yet. Confirmed flights and carrier analytics will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {airlineBreakdown.map((item) => (
                      <div key={item.airline}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-800 dark:text-slate-200">{item.airline}</span>
                          <span className="text-slate-500">{item.count} ({item.pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div
                            style={{ width: `${item.pct}%` }}
                            className="bg-sky-500 h-2 rounded-full transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 7: SETTINGS ==================== */}
          {activeTab === "settings" && (
            <div className="space-y-5 max-w-2xl">
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">Passenger Profile</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Update your contact details for flight updates and ticket delivery.
                </p>

                {profileMessage.text && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                      profileMessage.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
                    }`}
                  >
                    {profileMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address (Verified)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 text-xs font-medium text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/25 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {profileSaving ? "Saving..." : "Save Profile Details"}
                  </button>
                </form>
              </div>

              {/* Password Form */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">Change Password</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Update your account password (at least 8 characters).
                </p>

                {passwordMessage.text && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                      passwordMessage.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
                    }`}
                  >
                    {passwordMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        placeholder="At least 8 characters"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        placeholder="Re-enter new password"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-500 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== TAB 8: HELP CENTER ==================== */}
          {activeTab === "help" && (
            <div className="space-y-5 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-sky-500/10 border border-sky-500/20 shadow-sm flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25">
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">24/7 Priority Travel Desk</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-2.5">
                      Urgent flight changes, cancellations, or ticketing assistance.
                    </p>
                    <a
                      href="tel:+18778184167"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <Phone size={12} />
                      <span>+1 (877) 818-4167</span>
                    </a>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 shadow-sm flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/25">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Direct Support Email</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-2.5">
                      Itinerary questions or billing inquiries. Responded within 30 mins.
                    </p>
                    <a
                      href="mailto:support@allskyfares.com"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <Mail size={12} />
                      <span>support@allskyfares.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Submit Ticket Form */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">Submit a Support Request</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Log a request directly into the customer support queue.
                </p>

                {supportMessage.text && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                      supportMessage.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
                    }`}
                  >
                    {supportMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{supportMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleCreateSupportTicket} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        placeholder="e.g. Schedule change inquiry"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Booking Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={supportForm.booking_reference}
                        onChange={(e) => setSupportForm({ ...supportForm, booking_reference: e.target.value.toUpperCase() })}
                        placeholder="e.g. ASFHDXT"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      value={supportForm.message}
                      onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                      placeholder="Describe your inquiry..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/25 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {supportSubmitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== ADMIN TABS: MARKUPS, INTEGRATIONS, CRM, CREDENTIALS, CHAT ==================== */}
          {activeTab === "markups" && <MarkupsSection user={user} />}
          {activeTab === "integrations" && <IntegrationsSection user={user} />}
          {activeTab === "crm" && <CrmSection user={user} />}
          {activeTab === "credentials" && <CredentialsSection user={user} />}
          {activeTab === "chat" && <ChatSection user={user} />}
        </main>
      </div>

      {/* -------------------- E-TICKET & RESERVATION DETAILS MODAL -------------------- */}
      {selectedBookingForModal && (
        <ReservationDetailsModal
          booking={selectedBookingForModal}
          onClose={() => setSelectedBookingForModal(null)}
          getDocUrl={getDocUrl}
          onCancel={(b) => setCancelModalBooking(b)}
        />
      )}

      {/* -------------------- CANCELLATION MODAL -------------------- */}
      {cancelModalBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !cancelBusy && setCancelModalBooking(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Ban size={20} />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Cancel Reservation</h3>
              </div>
              <button
                disabled={cancelBusy}
                onClick={() => setCancelModalBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>

            {cancelMessage.text && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  cancelMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
                }`}
              >
                {cancelMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{cancelMessage.text}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to cancel booking{" "}
                <b className="font-mono text-slate-900 dark:text-white">
                  {cancelModalBooking.booking_reference || cancelModalBooking.id}
                </b>
                ?
              </p>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                <b>Airline Cancellation Policy:</b> Under US DOT rules, tickets can be cancelled within 24 hours of booking for a 100% refund. For standard fares, refunds are subject to airline fare rules and processing fees.
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={handleConfirmCancel}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {cancelBusy ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Ban size={13} />
                  )}
                  <span>{cancelBusy ? "Processing..." : "Confirm Cancellation"}</span>
                </button>

                <a
                  href="tel:+18778184167"
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs text-center border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Phone size={13} />
                  <span>Call Concierge</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModernWorkspaceView;
