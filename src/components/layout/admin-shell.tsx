"use client";

import { useState, useEffect, useRef, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AdminNav } from "./admin-nav";
import {
  searchLeadsGlobalAction,
  type GlobalLeadSearchResult,
} from "@/src/features/leads/actions";
import {
  Menu,
  ShieldCheck,
  Search,
  Bell,
  BellOff,
  Sun,
  Moon,
  LogOut,
  Loader2,
  ChevronDown,
  LayoutDashboard,
  Users,
  Layers,
  History,
  Settings,
  Sparkles,
  X,
  Phone,
  Smile,
  EyeOff,
  Eye,
  CalendarClock,
  ScrollText,
  Contact,
  CircleOff,
  Upload,
  Share2,
  SlidersHorizontal,
} from "lucide-react";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  adminRole?: string;
  children: React.ReactNode;
}

interface QuickNavDestination {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SEARCH_MODULES: QuickNavDestination[] = [
  {
    title: "Overview",
    description: "System KPI metrics, active user ratios, and governance overview",
    href: "/admin",
    category: "Governance",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    description: "Provision employee accounts, edit roles, toggle status, reset passwords",
    href: "/admin/users",
    category: "Governance",
    icon: Users,
  },
  {
    title: "Teams",
    description: "Manage sales and operations teams, assign team leads and members",
    href: "/admin/teams",
    category: "Governance",
    icon: Layers,
  },
  {
    title: "Activity Log",
    description: "Audit trail of administrator actions, password resets, and changes",
    href: "/admin/activity",
    category: "Governance",
    icon: History,
  },
  {
    title: "Settings",
    description: "System preferences, company details, and announcement broadcast",
    href: "/admin/settings",
    category: "Governance",
    icon: Settings,
  },
];

// External store for theme management to prevent hydration mismatches and cascading re-renders
const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getThemeSnapshot(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  } catch {
    return "dark";
  }
}

function getServerThemeSnapshot(): "dark" | "light" {
  return "dark";
}

export function AdminShell({
  adminName,
  adminEmail,
  adminRole = "ADMIN",
  children,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop sidebar collapse rail state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Leads mega menu hover state
  const [isLeadsMenuOpen, setIsLeadsMenuOpen] = useState(false);
  const leadsMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLeadsMouseEnter = () => {
    if (leadsMenuTimeoutRef.current) clearTimeout(leadsMenuTimeoutRef.current);
    setIsLeadsMenuOpen(true);
  };

  const handleLeadsMouseLeave = () => {
    leadsMenuTimeoutRef.current = setTimeout(() => {
      setIsLeadsMenuOpen(false);
    }, 180);
  };

  const handleLeadsClick = () => {
    setIsLeadsMenuOpen(false);
    router.push("/admin/leads");
  };

  // Settings dropdown state
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSettingsMouseEnter = () => {
    if (settingsMenuTimeoutRef.current) clearTimeout(settingsMenuTimeoutRef.current);
    setIsSettingsMenuOpen(true);
  };

  const handleSettingsMouseLeave = () => {
    settingsMenuTimeoutRef.current = setTimeout(() => {
      setIsSettingsMenuOpen(false);
    }, 180);
  };

  // Dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leadResults, setLeadResults] = useState<GlobalLeadSearchResult[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sign out loading state
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Safe external theme store
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Synchronize document dark class with external theme store
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Theme toggle handler
  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // Ignore localStorage errors
    }
    // Notify external store subscribers
    themeListeners.forEach((listener) => listener());
  };

  // Close search and clear query
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setLeadResults([]);
    setIsSearchingLeads(false);
  };

  // Debounced search for leads against live database
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingLeads(true);
      try {
        const res = await searchLeadsGlobalAction(trimmed);
        if (!cancelled && res.success && res.leads) {
          setLeadResults(res.leads);
        } else if (!cancelled) {
          setLeadResults([]);
        }
      } catch {
        if (!cancelled) setLeadResults([]);
      } finally {
        if (!cancelled) setIsSearchingLeads(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Global Ctrl+K / Cmd+K listener for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => {
          if (prev) {
            setSearchQuery("");
            setLeadResults([]);
            return false;
          }
          return true;
        });
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setSearchQuery("");
        setLeadResults([]);
        setIsSearchingLeads(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus search input when search modal opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter modules for global search preview
  const filteredSearchModules = SEARCH_MODULES.filter((mod) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      mod.title.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.category.toLowerCase().includes(q)
    );
  });

  const handleNavigateFromSearch = (href: string) => {
    handleCloseSearch();
    router.push(href);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex transition-colors duration-200 relative">
      {/* Sidebar Navigation */}
      <Suspense fallback={null}>
        <AdminNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          adminName={adminName}
          adminEmail={adminEmail}
          adminRole={adminRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-[#090e1c]/75 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 transition-colors duration-200 shadow-xs">
          {/* Left section: Hamburger, Search capsule, Leads dropdown, Settings dropdown, Chat, Email, Tips */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Hamburger menu button */}
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  setIsSidebarCollapsed((prev) => !prev);
                }
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Toggle sidebar menu"
              title="Toggle sidebar navigation"
            >
              <Menu className="size-4.5" />
            </button>

            {/* Search Pill Capsule */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.09] hover:border-violet-500/40 w-28 sm:w-44 text-xs transition-all shadow-xs group focus:outline-none focus:ring-1 focus:ring-violet-500"
                aria-label="Search leads and modules"
              >
                <Search className="size-3.5 text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors shrink-0" />
                <span className="truncate">Search</span>
              </button>
            </div>

            {/* Leads Dropdown Button + Hover Mega Menu (Image 1 & 2) */}
            <div
              className="relative"
              onMouseEnter={handleLeadsMouseEnter}
              onMouseLeave={handleLeadsMouseLeave}
            >
              <button
                type="button"
                onClick={handleLeadsClick}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${pathname.startsWith("/admin/leads") || isLeadsMenuOpen
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30"
                    : "text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/[0.06] border border-transparent"
                  }`}
                aria-expanded={isLeadsMenuOpen}
                aria-haspopup="true"
                title="Click for All Leads, Hover for options"
              >
                <span>Leads</span>
                <ChevronDown className={`size-3 transition-transform duration-150 ${isLeadsMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Leads Hover Mega Dropdown Menu (Image 1) */}
              {isLeadsMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-[560px] sm:w-[620px] rounded-2xl bg-white/90 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseEnter={handleLeadsMouseEnter}
                  onMouseLeave={handleLeadsMouseLeave}
                >
                  <div className="grid grid-cols-12 gap-3">
                    {/* Column 1 */}
                    <div className="col-span-4 space-y-1">
                      <Link
                        href="/admin/leads/add"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <Smile className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Add Lead</span>
                      </Link>
                      <Link
                        href="/admin/leads?status=UNREAD"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <EyeOff className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Unread Leads</span>
                      </Link>
                      <Link
                        href="/admin/leads?status=READ"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <Eye className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Read Leads</span>
                      </Link>
                      <Link
                        href="/admin/leads?status=FOLLOW_UP"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <CalendarClock className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Followups</span>
                      </Link>
                    </div>

                    {/* Column 2 */}
                    <div className="col-span-4 space-y-1">
                      <Link
                        href="/admin/leads?status=TRIALS"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <ScrollText className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Trials</span>
                      </Link>
                      <Link
                        href="/admin/leads?status=CLIENTS"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <Contact className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Clients</span>
                      </Link>
                      <Link
                        href="/admin/leads?status=DISPOSED"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <CircleOff className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Disposed</span>
                      </Link>
                    </div>

                    {/* Column 3 (with divider) */}
                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-800 pl-3 space-y-1">
                      <Link
                        href="/admin/leads?action=upload"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <Upload className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Upload Leads</span>
                      </Link>
                      <Link
                        href="/admin/leads?action=allot"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <Share2 className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Allot Leads</span>
                      </Link>
                      <Link
                        href="/admin/leads?action=fetch-limit"
                        onClick={() => setIsLeadsMenuOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors shrink-0">
                          <SlidersHorizontal className="size-4" />
                        </div>
                        <span className="text-xs font-medium truncate">Fetch Limit</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Dropdown Button */}
            <div
              className="relative"
              onMouseEnter={handleSettingsMouseEnter}
              onMouseLeave={handleSettingsMouseLeave}
            >
              <button
                type="button"
                onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-expanded={isSettingsMenuOpen}
                aria-haspopup="true"
              >
                <span>Settings</span>
                <ChevronDown className={`size-3 text-slate-400 transition-transform ${isSettingsMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isSettingsMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl bg-white/90 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseEnter={handleSettingsMouseEnter}
                  onMouseLeave={handleSettingsMouseLeave}
                >
                  <Link
                    href="/admin/users"
                    onClick={() => setIsSettingsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <Users className="size-3.5 text-slate-400 group-hover:text-violet-500" />
                    <span>Users</span>
                  </Link>
                  <Link
                    href="/admin/teams"
                    onClick={() => setIsSettingsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <Layers className="size-3.5 text-slate-400 group-hover:text-violet-500" />
                    <span>Teams</span>
                  </Link>
                  <Link
                    href="/admin/activity"
                    onClick={() => setIsSettingsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <History className="size-3.5 text-slate-400 group-hover:text-violet-500" />
                    <span>Activity Log</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setIsSettingsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <Settings className="size-3.5 text-slate-400 group-hover:text-violet-500" />
                    <span>System Settings</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Chat (0) */}
            <button
              type="button"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Chat channel"
            >
              <span>Chat</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-tight">
                0
              </span>
            </button>

            {/* Email (0) */}
            <button
              type="button"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Email updates"
            >
              <span>Email</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-tight">
                0
              </span>
            </button>

            {/* Tips (31) */}
            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Advisory tips"
            >
              <span>Tips</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-tight">
                31
              </span>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {theme === "light" ? (
                <Moon className="size-4.5 text-slate-600" />
              ) : (
                <Sun className="size-4.5 text-amber-400" />
              )}
            </button>

            {/* Notifications Popover with blue badge 31 */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen((prev) => !prev);
                  setIsProfileOpen(false);
                }}
                className={`relative p-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${isNotificationsOpen
                  ? "bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/[0.06] border border-transparent"
                  }`}
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                aria-haspopup="true"
              >
                <Bell className="size-4.5" />
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  31
                </span>
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/90 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Notifications
                      </h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                        0 Unread
                      </span>
                    </div>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      aria-label="Close notifications popover"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Proper Empty State */}
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="inline-flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-400">
                      <BellOff className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      All caught up
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      No pending system alerts or security warnings. Real-time administrator activities are logged in the audit trail.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.08] flex items-center justify-between text-xs">
                    <Link
                      href="/admin/activity"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      View Activity Log →
                    </Link>
                    <span className="text-[10px] text-slate-400">
                      Live Telemetry
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                }}
                className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${isProfileOpen
                  ? "bg-violet-500/15 border-violet-500/30 text-violet-800 dark:text-violet-200"
                  : "bg-white/70 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                  }`}
                aria-label="Admin profile menu"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-xs">
                  {adminName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[110px] truncate leading-tight">
                    {adminName}
                  </span>
                  <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 leading-tight">
                    {adminRole}
                  </span>
                </div>
                <ChevronDown className="size-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white/90 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                  {/* Authenticated Identity Details */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {adminName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                        <ShieldCheck className="size-2.5" />
                        {adminRole}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {adminEmail}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>Full Governance Privileges</span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-2 space-y-0.5">
                    <Link
                      href="/admin/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="size-4 text-slate-400" />
                      <span>System Settings</span>
                    </Link>
                    <Link
                      href="/admin/activity"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <History className="size-4 text-slate-400" />
                      <span>Audit Activity Log</span>
                    </Link>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-2 border-t border-slate-150 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors disabled:opacity-50"
                    >
                      {isSigningOut ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Signing out...</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="size-3.5" />
                          <span>Sign Out</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Search Dialog Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
              onClick={handleCloseSearch}
            />

            <div className="relative w-full max-w-2xl rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
              {/* Search input header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03]">
                <Search className="size-4.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim().length < 2) {
                      setLeadResults([]);
                      setIsSearchingLeads(false);
                    }
                  }}
                  placeholder="Search phone number (e.g. 9876543210), lead name, or modules..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setLeadResults([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    aria-label="Clear search input"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  ESC
                </kbd>
              </div>

              {/* Informational search guidance note */}
              <div className="px-4 py-2.5 bg-purple-50/60 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-800 dark:text-purple-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate">
                    <strong>Global Lead Search:</strong> Live phone and name lookup active. Click any lead to open drawer.
                  </span>
                </div>
                {isSearchingLeads && (
                  <span className="flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 shrink-0">
                    <Loader2 className="size-3 animate-spin" />
                    Searching DB...
                  </span>
                )}
              </div>

              {/* Search Results List */}
              <div className="max-h-96 overflow-y-auto p-2 space-y-3">
                {/* 1. Leads by Phone / Name Results */}
                {leadResults.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                      <span>Prospect Leads ({leadResults.length})</span>
                      <span className="text-[10px] font-normal text-slate-400">Database matches</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {leadResults.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => handleNavigateFromSearch(`/admin/leads?leadId=${lead.id}`)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-purple-50/70 dark:hover:bg-purple-950/30 border border-transparent hover:border-purple-200 dark:hover:border-purple-800/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                              <Phone className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {lead.name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {lead.mobile}
                                </span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {lead.status}
                                </span>
                                {lead.leadResponse && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    {lead.leadResponse}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                {lead.assignedToName ? (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    Allotted: {lead.assignedToName} ({lead.assignedToRole})
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Unassigned
                                  </span>
                                )}
                                {lead.segment && <span>• {lead.segment}</span>}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400 group-hover:underline shrink-0 ml-2">
                            View Lead →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Governance Modules */}
                {filteredSearchModules.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Governance Modules
                    </div>
                    <div className="space-y-1 mt-1">
                      {filteredSearchModules.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => handleNavigateFromSearch(item.href)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 group-hover:text-purple-500 shrink-0 ml-2">
                              Jump →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {leadResults.length === 0 && !isSearchingLeads && filteredSearchModules.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching leads or modules found for &quot;{searchQuery}&quot;.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
