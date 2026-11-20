"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EmployeeNav } from "./employee-nav";
import { SignOutButton } from "@/src/components/shared/sign-out-button";
import {
  Menu,
  Boxes,
  Search,
  ChevronDown,
  UserPlus,
  EyeOff,
  Eye,
  CalendarClock,
  ScrollText,
  Contact,
} from "lucide-react";
import {
  EmployeeCallbackProvider,
  EmployeeCallbackBell,
} from "@/src/features/employee/employee-callback-reminder";

interface EmployeeShellProps {
  employeeName: string;
  employeeEmail: string;
  children: React.ReactNode;
}

function EmployeeSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [headerSearch, setHeaderSearch] = useState("");
  const headerSearchInputRef = useRef<HTMLInputElement>(null);

  const urlQuery = searchParams?.get("q") ?? "";
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setHeaderSearch(urlQuery);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        headerSearchInputRef.current?.focus();
        headerSearchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = headerSearch.trim();
    if (trimmed) {
      router.push(`/employee/leads?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/employee/leads");
    }
  };

  return (
    <form onSubmit={handleHeaderSearchSubmit} className="relative shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 w-36 sm:w-52 text-xs transition-all shadow-xs">
        <button type="submit" className="focus:outline-none cursor-pointer" aria-label="Submit search">
          <Search className="size-3.5 text-slate-400 hover:text-cyan-500 transition-colors shrink-0" />
        </button>
        <input
          ref={headerSearchInputRef}
          type="text"
          value={headerSearch}
          onChange={(e) => setHeaderSearch(e.target.value)}
          placeholder="Search leads..."
          className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white/70 dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.1] rounded">
          ⌘K
        </kbd>
      </div>
    </form>
  );
}

export function EmployeeShell({
  employeeName,
  employeeEmail,
  children,
}: EmployeeShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <EmployeeCallbackProvider>
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex relative">
        {/* Sidebar Navigation */}
        <EmployeeNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          employeeName={employeeName}
          employeeEmail={employeeEmail}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-20 h-14 border-b border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-[#090e1c]/75 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 transition-colors duration-200 shadow-xs">
            {/* Left section: Hamburger, Search capsule, Leads dropdown */}
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
              <Suspense fallback={null}>
                <EmployeeSearchInput />
              </Suspense>

              {/* Leads Dropdown Button + Hover Mega Menu */}
              <div
                className="relative"
                onMouseEnter={handleLeadsMouseEnter}
                onMouseLeave={handleLeadsMouseLeave}
              >
                <Link
                  href="/employee/leads"
                  prefetch={true}
                  onClick={() => {
                    if (leadsMenuTimeoutRef.current) clearTimeout(leadsMenuTimeoutRef.current);
                    setIsLeadsMenuOpen(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                    pathname.startsWith("/employee/leads") || isLeadsMenuOpen
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
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
                            href="/employee/leads/add"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <UserPlus className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Add Lead
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Register new prospective lead
                              </span>
                            </div>
                          </Link>

                          {/* Unread Leads */}
                          <Link
                            href="/employee/leads?status=UNREAD"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <EyeOff className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Unread Leads
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Fresh unworked prospects
                              </span>
                            </div>
                          </Link>

                          {/* Read Leads */}
                          <Link
                            href="/employee/leads?status=READ"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Eye className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Read Leads
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Contacted and reviewed prospects
                              </span>
                            </div>
                          </Link>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-1">
                          {/* Followups */}
                          <Link
                            href="/employee/leads?status=FOLLOW_UP"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <CalendarClock className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Followups
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Scheduled client callbacks
                              </span>
                            </div>
                          </Link>

                          {/* Trial */}
                          <Link
                            href="/employee/leads?status=TRIAL"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <ScrollText className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Trial
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Active trial services
                              </span>
                            </div>
                          </Link>

                          {/* Clients */}
                          <Link
                            href="/employee/leads?status=CLIENT"
                            onClick={() => setIsLeadsMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                          >
                            <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Contact className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
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

            {/* Right Header: Reminder Bell, Employee Pill & SignOut */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Callback Reminders Bell */}
              <EmployeeCallbackBell />

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-medium">
                <Boxes className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Staff: {employeeName}</span>
              </div>

              <SignOutButton className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" />
            </div>
          </header>

          {/* Page Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </EmployeeCallbackProvider>
  );
}
