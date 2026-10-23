"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  History,
  Boxes,
  X,
  Sparkles,
} from "lucide-react";

interface ManagerNavProps {
  isOpen: boolean;
  onClose: () => void;
  managerName: string;
  managerEmail: string;
}

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/manager",
    icon: LayoutDashboard,
    badge: null,
    exact: true,
  },
  {
    title: "Teams Led",
    href: "/manager/teams",
    icon: Layers,
    badge: null,
    exact: false,
  },
  {
    title: "Direct Reports",
    href: "/manager/employees",
    icon: Users,
    badge: null,
    exact: false,
  },
  {
    title: "Operations Activity",
    href: "/manager/activity",
    icon: History,
    badge: null,
    exact: false,
  },
];

export function ManagerNav({
  isOpen,
  onClose,
  managerName,
  managerEmail,
}: ManagerNavProps) {
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
            href="/manager"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={onClose}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Boxes className="size-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Stock Emphasis
              </span>
              <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Manager Portal
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

        {/* Section Label */}
        <div className="px-6 pt-6 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations & Supervision
          </span>
        </div>

        {/* Main Nav Items */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isLinkActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? "bg-blue-600/15 text-blue-300 border border-blue-500/30 shadow-xs shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-4 transition-colors ${
                      active
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.title}</span>
                </div>

                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-xs">
            {managerName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {managerName}
            </p>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {managerEmail}
            </p>
          </div>
          <div
            className="size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20"
            title="Active Operational Lead"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span className="flex items-center gap-1 text-blue-400">
            <Sparkles className="size-3" />
            <span>Supervisor Tier</span>
          </span>
          <span className="font-mono">v1.0</span>
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

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </div>
    </>
  );
}
