"use client";

import { useState, useEffect, useRef, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { ManagerNav } from "./manager-nav";
import {
  Menu,
  Briefcase,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  UserPlus,
  Smile,
  EyeOff,
  Eye,
  CalendarClock,
  ScrollText,
  Contact,
  Sparkles,
  MessageSquare,
  Mail,
  Lightbulb,
} from "lucide-react";

interface ManagerShellProps {
  managerName: string;
  managerEmail: string;
  managerRole?: string;
  children: React.ReactNode;
}

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

export function ManagerShell({
  managerName,
  managerEmail,
  managerRole = "MANAGER",
  children,
}: ManagerShellProps) {
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
    }, 220);
  };

  // Dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Header search input state
  const searchParams = useSearchParams();
  const [headerSearch, setHeaderSearch] = useState("");
  const headerSearchInputRef = useRef<HTMLInputElement>(null);

  const urlQuery = searchParams?.get("q") ?? "";
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setHeaderSearch(urlQuery);
  }

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
    themeListeners.forEach((listener) => listener());
  };

  // Submits search to leads search or manager overview
  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = headerSearch.trim();
    if (trimmed) {
      router.push(`/manager/leads?q=${encodeURIComponent(trimmed)}`);
    }
  };

  // Global Ctrl+K / Cmd+K listener for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        headerSearchInputRef.current?.focus();
        headerSearchInputRef.current?.select();
      } else if (e.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex transition-colors duration-200 relative">
      {/* Sidebar Navigation */}
      <Suspense fallback={null}>
        <ManagerNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          managerName={managerName}
          managerEmail={managerEmail}
          managerRole={managerRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-[#090e1c]/75 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 transition-colors duration-200 shadow-xs">
          {/* Left section: Hamburger, Search capsule, Leads dropdown, Chat, Email, Tips */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              aria-label="Open sidebar menu"
              title="Open sidebar navigation"
            >
              <Menu className="size-4.5" />
            </button>

            {/* Header Global Search Input */}
            <form onSubmit={handleHeaderSearchSubmit} className="relative shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 w-36 sm:w-52 text-xs transition-all shadow-xs">
                <button type="submit" className="focus:outline-none cursor-pointer" aria-label="Submit search">
                  <Search className="size-3.5 text-slate-400 hover:text-blue-500 transition-colors shrink-0" />
                </button>
                <input
                  ref={headerSearchInputRef}
                  type="text"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </form>

            {/* Leads Dropdown Button + Hover Mega Menu */}
            <div
              className="relative"
              onMouseEnter={handleLeadsMouseEnter}
              onMouseLeave={handleLeadsMouseLeave}
            >
              <Link
                href="/manager/leads"
                prefetch={true}
                onClick={() => {
                  if (leadsMenuTimeoutRef.current) clearTimeout(leadsMenuTimeoutRef.current);
                  setIsLeadsMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                  pathname.startsWith("/manager/leads") || isLeadsMenuOpen
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                    : "text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/[0.06] border border-transparent"
                }`}
                aria-expanded={isLeadsMenuOpen}
                aria-haspopup="true"
                title="Click for Leads, Hover for options"
              >
                <span>Leads</span>
                <ChevronDown
                  className={`size-3 transition-transform duration-150 ${
                    isLeadsMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Link>

              {/* Leads Hover Mega Dropdown Menu */}
              {isLeadsMenuOpen && (
                <div
                  className="absolute left-0 top-full pt-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseEnter={handleLeadsMouseEnter}
                  onMouseLeave={handleLeadsMouseLeave}
                >
                  <div className="w-[520px] sm:w-[560px] rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Column 1 */}
                      <div className="space-y-1">
                        {/* Add Lead */}
                        <Link
                          href="/manager/leads/add"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <UserPlus className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Add Lead
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Register new prospective lead
                            </span>
                          </div>
                        </Link>

                        {/* Unread Leads */}
                        <Link
                          href="/manager/leads?status=UNREAD"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <EyeOff className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Unread Leads
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Fresh unallocated inquiries
                            </span>
                          </div>
                        </Link>

                        {/* Read Leads */}
                        <Link
                          href="/manager/leads?status=READ"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Eye className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Read Leads
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Reviewed team prospect records
                            </span>
                          </div>
                        </Link>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-1">
                        {/* Followups */}
                        <Link
                          href="/manager/leads?status=FOLLOW_UP"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <CalendarClock className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Followups
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Scheduled client callbacks
                            </span>
                          </div>
                        </Link>

                        {/* Trial */}
                        <Link
                          href="/manager/leads?status=TRIAL"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <ScrollText className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Trial
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Active 2-day trial services
                            </span>
                          </div>
                        </Link>

                        {/* Clients */}
                        <Link
                          href="/manager/leads?status=CLIENT"
                          onClick={() => setIsLeadsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Contact className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Clients
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Converted paid customers
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat (0) */}
            <button
              type="button"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Advisory tips"
            >
              <span>Tips</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-tight">
                31
              </span>
            </button>
          </div>

          {/* Right section: Theme toggle, Notifications, Manager profile capsule */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle (Sun/Moon) */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setIsNotificationsOpen((prev) => !prev);
                  setIsProfileOpen(false);
                }}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="View notifications"
                title="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#090e1c]" />
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Team Alerts
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                      Operational
                    </span>
                  </div>
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Sparkles className="size-5 text-blue-500 mx-auto mb-1.5" />
                    <span>No unread team notifications</span>
                  </div>
                </div>
              )}
            </div>

            {/* Manager Profile Capsule & Sign Out Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all focus:outline-none cursor-pointer"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs">
                  {managerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[120px] truncate leading-tight">
                    {managerName}
                  </span>
                  <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                    {managerRole}
                  </span>
                </div>
                <ChevronDown className="hidden sm:block size-3 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-200/80 dark:border-white/[0.08] mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {managerName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {managerEmail}
                    </p>
                  </div>

                  <Link
                    href="/manager"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Briefcase className="size-4 text-blue-500" />
                    <span>Manager Dashboard</span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer mt-1"
                  >
                    <LogOut className="size-4" />
                    <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
