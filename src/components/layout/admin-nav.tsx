"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  History,
  Settings,
  ShieldCheck,
  Boxes,
  X,
  Sparkles,
} from "lucide-react";

interface AdminNavProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  adminEmail: string;
}

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    badge: null,
    exact: true,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    badge: null,
    exact: false,
  },
  {
    title: "Teams",
    href: "/admin/teams",
    icon: Layers,
    badge: null,
    exact: false,
  },
  {
    title: "Activity Log",
    href: "/admin/activity",
    icon: History,
    badge: null,
    exact: false,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    badge: null,
    exact: false,
  },
];

export function AdminNav({
  isOpen,
  onClose,
  adminName,
  adminEmail,
}: AdminNavProps) {
  const pathname = usePathname();

  const isLinkActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 text-slate-100">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <Link
            href="/admin"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={onClose}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <Boxes className="size-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                Stock Emphasis
              </span>
              <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Admin Console
              </h2>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="px-3 py-6">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Governance
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-purple-600/15 text-purple-200 border border-purple-500/30 shadow-xs"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`size-4.5 transition-colors ${
                        active
                          ? "text-purple-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.title}</span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                      {item.badge}
                    </span>
                  )}

                  {active && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-purple-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Admin Identity & Security Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-center size-9 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
            {adminName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                {adminName}
              </span>
              <ShieldCheck className="size-3 text-purple-400 shrink-0" />
            </div>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              {adminEmail}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            NextAuth + PostgreSQL
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <Sparkles className="size-3" />
            Phase 1
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
