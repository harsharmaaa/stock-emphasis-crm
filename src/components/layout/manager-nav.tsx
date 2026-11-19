"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  History,
  ScrollText,
  CreditCard,
  FileText,
  PhoneCall,
  Activity,
  PhoneForwarded,
  SlidersHorizontal,
  TrendingUp,
  Receipt,
  BarChart3,
  Boxes,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
} from "lucide-react";

interface ManagerNavProps {
  isOpen: boolean;
  onClose: () => void;
  managerName: string;
  managerEmail: string;
  managerRole?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  exact?: boolean;
  status: "active" | "upcoming";
  tooltip?: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  collapsible: boolean;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: "home",
    title: "Home",
    collapsible: false,
    items: [
      {
        title: "Dashboard",
        href: "/manager",
        icon: LayoutDashboard,
        exact: true,
        status: "active",
      },
      {
        title: "Teams Led",
        href: "/manager/teams",
        icon: Layers,
        exact: false,
        status: "active",
      },
      {
        title: "Direct Reports",
        href: "/manager/employees",
        icon: Users,
        exact: false,
        status: "active",
      },
      {
        title: "Operations Activity",
        href: "/manager/activity",
        icon: History,
        exact: false,
        status: "active",
      },
    ],
  },
  {
    id: "history",
    title: "History",
    icon: History,
    collapsible: true,
    items: [
      {
        title: "Trial History",
        href: "/manager/history/trials",
        icon: ScrollText,
        status: "active",
      },
      {
        title: "Payment History",
        href: "/manager/history/payments",
        icon: CreditCard,
        status: "active",
      },
      {
        title: "Invoice History",
        href: "/manager/history/invoices",
        icon: FileText,
        status: "active",
      },
    ],
  },
  {
    id: "calling",
    title: "Calling",
    icon: PhoneCall,
    collapsible: true,
    items: [
      {
        title: "Call Report",
        href: "/manager/calling/reports",
        icon: PhoneCall,
        status: "active",
      },
      {
        title: "Call Monitor",
        href: "/manager/calling/monitor",
        icon: Activity,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Live team calling status, active extensions, and agent monitor scheduled for Phase 2.",
      },
      {
        title: "Call Logs",
        href: "/manager/calling/logs",
        icon: PhoneForwarded,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Historical call CDR recordings and agent call logs scheduled for Phase 2.",
      },
      {
        title: "Settings",
        href: "/manager/calling/settings",
        icon: SlidersHorizontal,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Calling extensions and telephony integration settings scheduled for Phase 2.",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    collapsible: true,
    items: [
      {
        title: "Tips",
        href: "/manager/reports/tips",
        icon: TrendingUp,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Advisory stock tips & recommendation logs scheduled for Phase 2.",
      },
      {
        title: "Invoice",
        href: "/manager/reports/invoices",
        icon: Receipt,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Billing and tax invoice reconciliation reporting scheduled for Phase 2.",
      },
      {
        title: "GST",
        href: "/manager/reports/gst",
        icon: BarChart3,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Team GST filing, HSN summary, and state-wise reports scheduled for Phase 2.",
      },
    ],
  },
];

export function ManagerNav({
  isOpen,
  onClose,
  managerName,
  managerEmail,
  managerRole = "MANAGER",
  isCollapsed = false,
  onToggleCollapse,
}: ManagerNavProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // Auto-expand group if any of its active children match current pathname
  useEffect(() => {
    NAVIGATION_GROUPS.forEach((group) => {
      if (group.collapsible && group.items.some((i) => i.href && pathname.startsWith(i.href))) {
        setCollapsedGroups((prev) => ({
          ...prev,
          [group.id]: false,
        }));
      }
    });
  }, [pathname]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isLinkActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white/80 dark:bg-[#080d19]/85 backdrop-blur-2xl border-r border-slate-200/70 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/[0.08]">
          <Link
            href="/manager"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={onClose}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform shrink-0">
              <Boxes className="size-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Stock Emphasis
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Manager Portal
                </h2>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Roadmap / Notice Banner */}
        {activeNotice && !isCollapsed && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Sparkles className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[11px]">Roadmap Module</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300/90 mt-0.5">
                {activeNotice}
              </p>
            </div>
            <button
              onClick={() => setActiveNotice(null)}
              className="text-blue-400 hover:text-blue-600 p-0.5 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {NAVIGATION_GROUPS.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id] && !isCollapsed;

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Title */}
                {!isCollapsed && (
                  <div className="px-1 pb-1">
                    {group.collapsible ? (
                      (() => {
                        const isGroupActive = group.items.some(
                          (item) => item.href && pathname.startsWith(item.href)
                        );
                        const GroupIcon = group.icon;

                        return (
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapse(group.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none cursor-pointer ${
                              isGroupActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
                            }`}
                            aria-expanded={!isGroupCollapsed}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {GroupIcon && (
                                <GroupIcon
                                  className={`size-4 shrink-0 ${
                                    isGroupActive ? "text-white" : "text-slate-400"
                                  }`}
                                />
                              )}
                              <span className="truncate">{group.title}</span>
                            </div>
                            {isGroupCollapsed ? (
                              <ChevronRight
                                className={`size-3.5 shrink-0 ${
                                  isGroupActive ? "text-white" : "text-slate-400"
                                }`}
                              />
                            ) : (
                              <ChevronDown
                                className={`size-3.5 shrink-0 ${
                                  isGroupActive ? "text-white" : "text-slate-400"
                                }`}
                              />
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        {group.title}
                      </div>
                    )}
                  </div>
                )}

                {/* Section Items */}
                {!isGroupCollapsed && (
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;

                      if (item.status === "active" && item.href) {
                        const active = isLinkActive(item);

                        return (
                          <Link
                            key={item.title}
                            href={item.href}
                            prefetch={true}
                            onClick={onClose}
                            title={isCollapsed ? item.title : undefined}
                            className={`group relative flex items-center ${
                              isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2.5"
                            } rounded-xl text-xs font-medium transition-all ${
                              active
                                ? "bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border border-blue-500/30 dark:border-blue-400/40 shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`size-4.5 shrink-0 transition-colors ${
                                  active
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                                }`}
                              />
                              {!isCollapsed && <span className="truncate">{item.title}</span>}
                            </div>

                            {active && !isCollapsed && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            )}
                          </Link>
                        );
                      }

                      // Upcoming / Roadmap items (Non-functional placeholders without 404s)
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() =>
                            setActiveNotice(item.tooltip || `${item.title} is scheduled for Phase 2 development.`)
                          }
                          title={isCollapsed ? `${item.title} (Upcoming)` : item.tooltip}
                          className={`w-full group relative flex items-center ${
                            isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2"
                          } rounded-xl text-xs font-medium text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all border border-transparent cursor-pointer`}
                          aria-disabled="true"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="size-4 shrink-0 text-slate-400 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                            {!isCollapsed && (
                              <span className="truncate text-slate-500 dark:text-slate-400">
                                {item.title}
                              </span>
                            )}
                          </div>

                          {!isCollapsed && item.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manager Profile & Sidebar Collapse Footer */}
      <div className="p-3 border-t border-slate-200/70 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] space-y-2">
        {/* Identity preview */}
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center p-2" : "gap-3 p-2.5"
          } rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs`}
        >
          <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-500/30 shrink-0">
            {managerName.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {managerName}
                </span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-semibold rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                  {managerRole}
                </span>
                <Briefcase className="size-3 text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {managerEmail}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent transition-colors focus:outline-none cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar (w-64)" : "Collapse sidebar (w-20)"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span className="text-[11px]">Collapse sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
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
