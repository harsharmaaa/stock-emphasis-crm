"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  History,
  MessageSquare,
  PhoneCall,
  Boxes,
  ScrollText,
  CreditCard,
  Receipt,
  ChevronDown,
  X,
} from "lucide-react";

interface EmployeeNavProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeEmail: string;
}

interface SubNavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  status: "active" | "upcoming";
  tooltip?: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  exact?: boolean;
  status: "active" | "upcoming";
  tooltip?: string;
  children?: SubNavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Home",
    href: "/employee",
    icon: LayoutDashboard,
    badge: null,
    exact: true,
    status: "active",
  },
  {
    title: "Leads",
    href: "/employee/leads",
    icon: Layers,
    badge: null,
    exact: false,
    status: "active",
  },
  {
    title: "History",
    icon: History,
    status: "active",
    children: [
      {
        title: "Trial",
        href: "/employee/trials",
        icon: ScrollText,
        status: "active",
      },
      {
        title: "Payment",
        icon: CreditCard,
        badge: "Phase 2",
        status: "upcoming",
        tooltip: "Payment history records scheduled for Phase 2.",
      },
      {
        title: "Invoice",
        icon: Receipt,
        badge: "Phase 2",
        status: "upcoming",
        tooltip: "Invoice history records scheduled for Phase 2.",
      },
    ],
  },
  {
    title: "SMS",
    href: "/employee/sms",
    icon: MessageSquare,
    badge: "Upcoming",
    exact: false,
    status: "upcoming",
    tooltip: "SMS messaging and client communication scheduled for future release.",
  },
  {
    title: "Calling",
    href: "/employee/calling",
    icon: PhoneCall,
    badge: "Upcoming",
    exact: false,
    status: "upcoming",
    tooltip: "Telephony calling dialer scheduled for future release.",
  },
];

export function EmployeeNav({
  isOpen,
  onClose,
  employeeName,
  employeeEmail,
}: EmployeeNavProps) {
  const pathname = usePathname();

  const isHistoryRoute =
    pathname.startsWith("/employee/trials") || pathname.startsWith("/employee/history");
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const isHistoryExpanded = manualExpanded !== null ? manualExpanded : isHistoryRoute;

  const isLinkActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white/75 dark:bg-[#080d19]/80 backdrop-blur-2xl border-r border-slate-200/70 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/70 dark:border-white/[0.08]">
          <Link
            href="/employee"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={onClose}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Boxes className="size-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Stock Emphasis
              </span>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Staff Workspace
              </h2>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-6 pt-6 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations Workspace
          </span>
        </div>

        {/* Main Nav Items */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            // Expandable dropdown items (History)
            if (item.children && item.children.length > 0) {
              const isParentActive = isHistoryRoute;

              return (
                <div key={item.title} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setManualExpanded(!isHistoryExpanded)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isParentActive
                        ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`size-4 transition-colors ${
                          isParentActive
                            ? "text-cyan-600 dark:text-cyan-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                      <span>{item.title}</span>
                    </div>

                    <ChevronDown
                      className={`size-3.5 text-slate-400 transition-transform duration-200 ${
                        isHistoryExpanded ? "rotate-180 text-cyan-600 dark:text-cyan-400" : ""
                      }`}
                    />
                  </button>

                  {/* Submenu links */}
                  {isHistoryExpanded && (
                    <div className="pl-6 pr-1 space-y-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;

                        if (child.status === "active" && child.href) {
                          const isChildActive =
                            pathname === child.href || pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onClose}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                isChildActive
                                  ? "bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 border border-cyan-500/30 dark:border-cyan-400/40 shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChildIcon
                                  className={`size-3.5 transition-colors ${
                                    isChildActive
                                      ? "text-cyan-600 dark:text-cyan-400"
                                      : "text-slate-500 dark:text-slate-400"
                                  }`}
                                />
                                <span className="truncate">{child.title}</span>
                              </div>
                            </Link>
                          );
                        }

                        return (
                          <div
                            key={child.title}
                            title={child.tooltip}
                            className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all border border-transparent select-none cursor-default"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ChildIcon className="size-3.5 text-slate-400 dark:text-slate-500 opacity-70" />
                              <span className="truncate">{child.title}</span>
                            </div>

                            {child.badge && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/60">
                                {child.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (item.status === "upcoming") {
              return (
                <div
                  key={item.title}
                  title={item.tooltip}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all border border-transparent select-none cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 text-slate-400 dark:text-slate-500" />
                    <span>{item.title}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/60">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            const active = isLinkActive(item);

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? "bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 border border-cyan-500/30 dark:border-cyan-400/40 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-4 transition-colors ${
                      active
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.title}</span>
                </div>

                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-200/70 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
          <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
            {employeeName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {employeeName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {employeeEmail}
            </p>
          </div>
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

      {/* Mobile Drawer Backdrop & Slide-over */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-64 max-w-[80vw] z-50 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
