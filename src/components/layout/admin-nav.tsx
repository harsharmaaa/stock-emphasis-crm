"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  ChevronDown,
  ChevronRight,
  Inbox,
  UserPlus,
  UserX,
  Clock,
  UserCheck,
  Archive,
  CheckSquare,
  ShieldAlert,
  BarChart3,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  MailCheck,
  Building2,
  UserCheck2,
  SlidersHorizontal,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/src/components/ui/Badge";
import { getPendingTrialsCountAction } from "@/src/features/trials/actions";

interface AdminNavProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  adminEmail: string;
  adminRole?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  asideRef?: React.RefObject<HTMLElement | null>;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  exact?: boolean;
  status: "active" | "upcoming";
  tooltip?: string;
  children?: NavItem[];
}

interface NavGroup {
  id: string;
  title: string;
  collapsible: boolean;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: "governance",
    title: "Governance",
    collapsible: false,
    items: [
      {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
        status: "active",
      },
      {
        title: "User Management",
        href: "/admin/users",
        icon: Users,
        exact: false,
        status: "active",
      },
      {
        title: "Employee Profiles",
        href: "/admin/profiles",
        icon: UserCheck2,
        exact: false,
        status: "active",
      },
      {
        title: "Departments",
        href: "/admin/departments",
        icon: Building2,
        exact: false,
        status: "active",
      },
      {
        title: "Teams",
        href: "/admin/teams",
        icon: Layers,
        exact: false,
        status: "active",
      },
      {
        title: "Activity Log",
        href: "/admin/activity",
        icon: History,
        exact: false,
        status: "active",
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        exact: false,
        status: "active",
      },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    collapsible: true,
    items: [
      {
        title: "Add Lead",
        href: "/admin/leads/add",
        icon: UserPlus,
        exact: true,
        status: "active",
      },
      {
        title: "All Leads",
        href: "/admin/leads",
        icon: Inbox,
        exact: true,
        status: "active",
      },
      {
        title: "Fetch Limit",
        href: "/admin/fetch-limits",
        icon: SlidersHorizontal,
        exact: false,
        status: "active",
      },
      {
        title: "Unfollowed",
        href: "/admin/leads?status=UNFOLLOWED",
        icon: UserX,
        status: "active",
      },
      {
        title: "Unread",
        href: "/admin/leads?status=UNREAD",
        icon: Mail,
        status: "active",
      },
      {
        title: "Read",
        href: "/admin/leads?status=READ",
        icon: MailCheck,
        status: "active",
      },
      {
        title: "Follow-ups",
        href: "/admin/leads?status=FOLLOW_UP",
        icon: Clock,
        status: "active",
      },
      {
        title: "Trials",
        href: "/admin/leads?status=TRIAL",
        icon: Sparkles,
        status: "active",
      },
      {
        title: "Clients",
        href: "/admin/leads?status=CLIENT",
        icon: UserCheck,
        status: "active",
      },
      {
        title: "Disposed",
        href: "/admin/leads?status=DISPOSED",
        icon: Archive,
        status: "active",
      },
    ],
  },
  {
    id: "history",
    title: "History",
    collapsible: true,
    items: [
      {
        title: "Trial History",
        href: "/admin/history/trials",
        icon: ScrollText,
        status: "active",
      },
    ],
  },
  {
    id: "operations",
    title: "Operations & Reports",
    collapsible: true,
    items: [
      {
        title: "Approvals",
        icon: CheckSquare,
        status: "active",
        children: [
          {
            title: "Trial",
            href: "/admin/approvals/trials",
            icon: ScrollText,
            status: "active",
          },
          {
            title: "Payment",
            icon: CheckSquare,
            badge: "Phase 2",
            status: "upcoming",
            tooltip: "Payment approvals scheduled for Phase 2.",
          },
          {
            title: "Invoice",
            icon: CheckSquare,
            badge: "Phase 2",
            status: "upcoming",
            tooltip: "Invoice approvals scheduled for Phase 2.",
          },
        ],
      },
      {
        title: "Compliance",
        icon: ShieldAlert,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "KYC, risk profile and regulatory compliance scheduled for Phase 2.",
      },
      {
        title: "Reports",
        icon: BarChart3,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "GST, invoice, and financial telemetry reporting scheduled for Phase 2.",
      },
      {
        title: "Notice Board",
        icon: Megaphone,
        badge: "Upcoming",
        status: "upcoming",
        tooltip: "Company broadcast notices and announcements scheduled for Phase 2.",
      },
    ],
  },
];

export function AdminNav({
  isOpen,
  onClose,
  adminName,
  adminEmail,
  adminRole = "ADMIN",
  isCollapsed = false,
  onToggleCollapse,
  onMouseEnter,
  onMouseLeave,
  asideRef,
}: AdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Collapsible section state for Leads, History and Operations groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    leads: false,
    history: false,
    operations: false,
  });

  const [pendingTrialCount, setPendingTrialCount] = useState<number>(0);
  const [expandedNavItems, setExpandedNavItems] = useState<Record<string, boolean>>({
    Approvals: true,
  });

  useEffect(() => {
    getPendingTrialsCountAction().then((res) => {
      if (res.success && res.count !== undefined) {
        setPendingTrialCount(res.count);
      }
    });
  }, [pathname]);

  // Active toast/info message when an upcoming item is clicked
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Clear notice after 3.5 seconds
  useEffect(() => {
    if (!activeNotice) return;
    const timer = setTimeout(() => setActiveNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [activeNotice]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isLinkActive = (item: NavItem) => {
    if (!item.href) return false;
    const [itemPath, itemQuery] = item.href.split("?");
    if (pathname !== itemPath) return false;

    if (itemQuery) {
      const itemParams = new URLSearchParams(itemQuery);
      let matches = true;
      itemParams.forEach((val, key) => {
        if (searchParams?.get(key) !== val) {
          matches = false;
        }
      });
      return matches;
    }

    if (item.exact) {
      if (itemPath === "/admin/leads") {
        const currentStatus = searchParams?.get("status");
        return !currentStatus || currentStatus === "ALL";
      }
      return pathname === itemPath;
    }
    return pathname.startsWith(itemPath);
  };

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex h-full flex-col justify-between bg-white/80 dark:bg-[#080d19]/85 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <Link
            href="/admin"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6DF5] rounded-xl"
            onClick={onClose}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-[#4F6DF5] to-[#60A5FA] text-white shadow-md shadow-[#4F6DF5]/25 group-hover:scale-105 transition-transform shrink-0">
              <Boxes className="size-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[#4F6DF5] dark:text-[#60A5FA]">
                  Stock Emphasis
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Admin Console
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

        {/* Notice Banner for upcoming items */}
        {activeNotice && !collapsed && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-[#4F6DF5]/10 dark:bg-[#4F6DF5]/15 border border-[#4F6DF5]/25 dark:border-[#4F6DF5]/30 text-slate-900 dark:text-slate-100 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Sparkles className="size-4 text-[#4F6DF5] dark:text-[#60A5FA] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[11px] text-[#4F6DF5] dark:text-[#60A5FA]">Roadmap Module</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {activeNotice}
              </p>
            </div>
            <button
              onClick={() => setActiveNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
              aria-label="Dismiss notice"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Primary Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {NAVIGATION_GROUPS.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id] && !collapsed;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                {!collapsed && (
                  <div className="px-3 pb-1">
                    {group.collapsible ? (
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors focus:outline-none"
                        aria-expanded={!isGroupCollapsed}
                      >
                        <span>{group.title}</span>
                        {isGroupCollapsed ? (
                          <ChevronRight className="size-3 text-slate-400" />
                        ) : (
                          <ChevronDown className="size-3 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        {group.title}
                      </div>
                    )}
                  </div>
                )}

                {/* Group Items */}
                {!isGroupCollapsed && (
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const IconComponent = item.icon;

                      if (item.children && item.children.length > 0) {
                        const isChildActive = item.children.some((c) => c.href && pathname.startsWith(c.href));
                        const isExpanded = expandedNavItems[item.title] ?? isChildActive;

                        return (
                          <div key={item.title} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedNavItems((prev) => ({
                                  ...prev,
                                  [item.title]: !isExpanded,
                                }));
                              }}
                              className={`w-full group relative flex items-center ${
                                collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2.5"
                              } rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                isChildActive
                                  ? "bg-[#4F6DF5]/12 dark:bg-[#4F6DF5]/20 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/30 font-semibold"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <IconComponent
                                  className={`size-4.5 shrink-0 transition-colors ${
                                    isChildActive
                                      ? "text-[#4F6DF5] dark:text-[#60A5FA]"
                                      : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                                  }`}
                                />
                                {!collapsed && <span className="truncate">{item.title}</span>}
                              </div>

                              {!collapsed && (
                                <div className="flex items-center gap-2">
                                  {pendingTrialCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                      {pendingTrialCount}
                                    </span>
                                  )}
                                  <ChevronDown
                                    className={`size-3 text-slate-400 transition-transform duration-150 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              )}
                            </button>

                            {/* Submenu Items */}
                            {isExpanded && !collapsed && (
                              <div className="pl-6 space-y-1 pt-0.5">
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;

                                  if (child.status === "active" && child.href) {
                                    const childActive = pathname === child.href || pathname.startsWith(child.href);
                                    return (
                                      <Link
                                        key={child.href}
                                        href={child.href}
                                        onClick={onClose}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                          childActive
                                            ? "bg-[#4F6DF5]/15 text-[#4F6DF5] dark:text-[#60A5FA] font-bold border border-[#4F6DF5]/30"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 truncate">
                                          <ChildIcon className="size-3.5 text-slate-400" />
                                          <span className="truncate">{child.title}</span>
                                        </div>
                                        {child.title === "Trial" && pendingTrialCount > 0 && (
                                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                            {pendingTrialCount}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  }

                                  return (
                                    <button
                                      key={child.title}
                                      type="button"
                                      onClick={() =>
                                        setActiveNotice(
                                          child.tooltip || `${child.title} approvals scheduled for Phase 2.`
                                        )
                                      }
                                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <ChildIcon className="size-3.5 text-slate-400 opacity-60" />
                                        <span className="truncate">{child.title}</span>
                                      </div>
                                      {child.badge && <Badge tone="info">{child.badge}</Badge>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (item.status === "active" && item.href) {
                        const active = isLinkActive(item);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            onClick={onClose}
                            title={collapsed ? item.title : undefined}
                            className={`group relative flex items-center ${
                              collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2.5"
                            } rounded-xl text-xs font-medium transition-all ${
                              active
                                ? "bg-[#4F6DF5]/12 dark:bg-[#4F6DF5]/20 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/30 dark:border-[#4F6DF5]/40 font-semibold shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <IconComponent
                                className={`size-4.5 shrink-0 transition-colors ${
                                  active
                                    ? "text-[#4F6DF5] dark:text-[#60A5FA]"
                                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                                }`}
                              />
                              {!collapsed && <span className="truncate">{item.title}</span>}
                            </div>

                            {active && !collapsed && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-[#4F6DF5] dark:bg-[#60A5FA] shadow-[0_0_8px_rgba(79,109,245,0.6)]" />
                            )}
                          </Link>
                        );
                      }

                      // Upcoming / Roadmap items (Non-functional placeholders without 404s)
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => setActiveNotice(item.tooltip || `${item.title} is scheduled for Phase 2 development.`)}
                          title={collapsed ? `${item.title} (Upcoming)` : item.tooltip}
                          className={`w-full group relative flex items-center ${
                            collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3.5 py-2"
                          } rounded-xl text-xs font-medium text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all border border-transparent cursor-pointer`}
                          aria-disabled="true"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <IconComponent className="size-4 shrink-0 text-slate-400 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                            {!collapsed && <span className="truncate text-slate-500 dark:text-slate-400">{item.title}</span>}
                          </div>

                          {!collapsed && item.badge && (
                            <Badge tone="info">
                              {item.badge}
                            </Badge>
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

      {/* Admin Identity & Collapse Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] space-y-2">
        {/* Identity preview */}
        <div
          className={`flex items-center ${
            collapsed ? "justify-center p-2" : "gap-3 p-2.5"
          } rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs`}
        >
          <div className="flex items-center justify-center size-8 rounded-lg bg-[#4F6DF5]/15 text-[#4F6DF5] dark:text-[#60A5FA] font-bold text-xs border border-[#4F6DF5]/25 shrink-0">
            {adminName.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {adminName}
                </span>
                <Badge tone="info">
                  {adminRole}
                </Badge>
                <ShieldCheck className="size-3 text-[#4F6DF5] dark:text-[#60A5FA] shrink-0" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {adminEmail}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6DF5]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar (w-64)" : "Collapse sidebar (w-20)"}
          >
            {collapsed ? (
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
        ref={asideRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderNavContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
