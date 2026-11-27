"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Target,
  IndianRupee,
  Bell,
  Calendar,
  Layers,
  Clock,
  Phone,
  CreditCard,
  History,
  FileText,
  Sparkles,
  UserCheck,
  ArrowRight,
  Maximize2,
  Minimize2,
  Megaphone,
  Award,
  Menu,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { LeaderboardCard } from "@/src/features/dashboard/leaderboard-card";
import type { EmployeeOverviewStep1Data } from "./overview-types";

interface EmployeeOverviewClientProps {
  initialData: EmployeeOverviewStep1Data;
}

function formatShortDate(label: string): string {
  const cleaned = label.replace(/\s+\d{2,4}$/, "");
  return cleaned || label;
}

function getShortSource(source: string): string {
  if (source.length <= 6) return source;
  if (source === "Fresh Lead") return "Fresh";
  if (source === "Premium Lead") return "Premium";
  if (source === "HNI Lead") return "HNI";
  if (source === "Web Lead") return "Web";
  if (source === "Digital Marketing") return "Digital";
  if (source.toLowerCase() === "campegin") return "Campaign";
  return source.split(" ")[0];
}

const HORIZONTAL_BAR_CATEGORIES = [
  "Unread",
  "Call Back",
  "NPC",
  "Do Not Trade",
  "Not Reachable",
  "Switch Off",
  "Not Intrested",
  "Call Disconnected",
  "Language Issue",
  "Busy",
  "FT",
  "Intrested",
  "Paid",
  "Followup",
  "Trial",
  "Client",
  "Disposed",
  "Unalloted",
] as const;

export function EmployeeOverviewClient({ initialData }: EmployeeOverviewClientProps) {
  const router = useRouter();
  const [data] = useState<EmployeeOverviewStep1Data>(initialData);
  const [activeTab, setActiveTab] = useState<"notice" | "reminders" | "payments" | "events">("reminders");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hover states for tooltips across the 4 analytical charts
  const [hoveredFollowupKey, setHoveredFollowupKey] = useState<string | null>(null);
  const [hoveredFetchSource, setHoveredFetchSource] = useState<string | null>(null);
  const [hoveredPaymentKey, setHoveredPaymentKey] = useState<string | null>(null);
  const [hoveredCallingKey, setHoveredCallingKey] = useState<string | null>(null);

  // Step 3: Tabbed Reports Filter & Tab States
  const [activeReportTab, setActiveReportTab] = useState<
    "leadReport" | "leadRecord" | "performance" | "monthlySales"
  >("leadReport");
  const [reportSourceFilter, setReportSourceFilter] = useState<string>("ALL");
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [hoveredLeadBarLabel, setHoveredLeadBarLabel] = useState<string | null>(null);

  const isReportFilterActive =
    reportSourceFilter !== "ALL" || reportStartDate !== "" || reportEndDate !== "";

  const handleResetReportFilters = () => {
    setReportSourceFilter("ALL");
    setReportStartDate("");
    setReportEndDate("");
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const {
    employeeName,
    teamName,
    departmentName,
    target,
    payment,
    clients,
    callbacks,
    followups,
    todayActivity,
    leadStatusStrip,
    remindersTab,
    charts,
    tabbedReports,
  } = data;

  // Format currency in Indian format (₹)
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Safe percentage helper for SVG Donut visual
  const calculateCircleDash = (value: number, total: number, circumference: number) => {
    if (total <= 0 || value <= 0) return `0 ${circumference}`;
    const pct = Math.min(1, value / total);
    const strokeDash = pct * circumference;
    return `${strokeDash} ${circumference - strokeDash}`;
  };

  const totalTabReminders = remindersTab.leadReminders.length;
  const totalTabPayments = remindersTab.recentPayments.length;
  const totalTabEvents = remindersTab.recentEvents.length;
  const hasNotice = Boolean(remindersTab.announcementBanner);

  // Dynamic Chart Axis Scaling
  const maxFollowupVal = useMemo(() => {
    if (!charts.followupPoints || charts.followupPoints.length === 0) return 4;
    const max = Math.max(...charts.followupPoints.map((p) => p.count));
    return max <= 3 ? 4 : max % 2 === 0 ? max + 2 : max + 1;
  }, [charts.followupPoints]);

  const maxFetchVal = useMemo(() => {
    if (!charts.fetchPoints || charts.fetchPoints.length === 0) return 1200;
    const max = Math.max(
      ...charts.fetchPoints.map((p) => Math.max(p.fetchLimit, p.todayFetched, p.totalFetched))
    );
    if (max <= 300) return 300;
    if (max <= 600) return 600;
    if (max <= 900) return 900;
    if (max <= 1200) return 1200;
    return Math.ceil((max * 1.25) / 100) * 100;
  }, [charts.fetchPoints]);

  const maxPaymentVal = useMemo(() => {
    if (!charts.paymentPoints || charts.paymentPoints.length === 0) return 6000;
    const max = Math.max(...charts.paymentPoints.map((p) => p.amount));
    if (max <= 6000) return 6000;
    return Math.ceil((max * 1.2) / 1000) * 1000;
  }, [charts.paymentPoints]);

  const maxCallingHours = useMemo(() => {
    if (!charts.callingPoints || charts.callingPoints.length === 0) return 5;
    const max = Math.max(...charts.callingPoints.map((p) => p.hours));
    return max <= 4 ? 5 : Math.ceil(max + 1);
  }, [charts.callingPoints]);

  const maxConnectedCalls = useMemo(() => {
    if (!charts.callingPoints || charts.callingPoints.length === 0) return 5;
    const max = Math.max(...charts.callingPoints.map((p) => p.connectedCalls));
    return max <= 4 ? 5 : Math.ceil(max + 1);
  }, [charts.callingPoints]);

  // Step 3: Filtered Leads for Lead Report & Lead Record
  const filteredReportLeads = useMemo(() => {
    return tabbedReports.leads.filter((lead) => {
      if (reportSourceFilter !== "ALL") {
        if (!lead.leadSource || lead.leadSource.toLowerCase() !== reportSourceFilter.toLowerCase()) {
          return false;
        }
      }
      if (reportStartDate) {
        const leadDate = new Date(lead.updatedAt).toISOString().split("T")[0];
        if (leadDate < reportStartDate) return false;
      }
      if (reportEndDate) {
        const leadDate = new Date(lead.updatedAt).toISOString().split("T")[0];
        if (leadDate > reportEndDate) return false;
      }
      return true;
    });
  }, [tabbedReports.leads, reportSourceFilter, reportStartDate, reportEndDate]);

  // Step 3: Horizontal Bar Distribution (18 Categories Matching empDashOverView4.png)
  const horizontalBarData = useMemo(() => {
    const countsMap: Record<string, number> = {};
    for (const cat of HORIZONTAL_BAR_CATEGORIES) {
      countsMap[cat] = 0;
    }

    for (const lead of filteredReportLeads) {
      const rawResp = (lead.leadResponse || "").trim().toLowerCase();
      const rawStatus = (lead.status || "").trim().toUpperCase();

      if (rawResp === "call back" || rawResp === "callback" || rawResp === "call_back" || rawResp === "cb") {
        countsMap["Call Back"] += 1;
      } else if (rawResp === "npc") {
        countsMap["NPC"] += 1;
      } else if (rawResp === "do not trade" || rawResp === "dnt") {
        countsMap["Do Not Trade"] += 1;
      } else if (rawResp === "not reachable" || rawResp === "not rechable" || rawResp === "unreachable") {
        countsMap["Not Reachable"] += 1;
      } else if (rawResp === "switch off" || rawResp === "switched off") {
        countsMap["Switch Off"] += 1;
      } else if (rawResp === "not interested" || rawResp === "not intrested" || rawResp === "ni") {
        countsMap["Not Intrested"] += 1;
      } else if (rawResp === "call disconnect" || rawResp === "call disconnected" || rawResp === "disconnected") {
        countsMap["Call Disconnected"] += 1;
      } else if (rawResp === "language issue") {
        countsMap["Language Issue"] += 1;
      } else if (rawResp === "busy") {
        countsMap["Busy"] += 1;
      } else if (rawResp === "ft" || rawResp === "free trial") {
        countsMap["FT"] += 1;
      } else if (rawResp === "interested" || rawResp === "intrested") {
        countsMap["Intrested"] += 1;
      } else if (rawResp === "paid" || rawResp === "payment") {
        countsMap["Paid"] += 1;
      } else if (rawStatus === "UNREAD" || rawStatus === "UNFOLLOWED") {
        countsMap["Unread"] += 1;
      } else if (rawStatus === "FOLLOW_UP" || rawStatus === "FOLLOWUPS") {
        countsMap["Followup"] += 1;
      } else if (rawStatus === "TRIAL" || rawStatus === "TRIALS") {
        countsMap["Trial"] += 1;
      } else if (rawStatus === "CLIENT" || rawStatus === "CLIENTS") {
        countsMap["Client"] += 1;
      } else if (rawStatus === "DISPOSED") {
        countsMap["Disposed"] += 1;
      } else if (rawStatus === "UNALLOTED") {
        countsMap["Unalloted"] += 1;
      } else {
        countsMap["Unread"] += 1;
      }
    }

    return HORIZONTAL_BAR_CATEGORIES.map((cat) => ({
      label: cat,
      count: countsMap[cat],
    }));
  }, [filteredReportLeads]);

  const maxHorizontalCount = useMemo(() => {
    if (horizontalBarData.length === 0) return 120;
    const max = Math.max(...horizontalBarData.map((d) => d.count));
    if (max <= 30) return 30;
    if (max <= 60) return 60;
    if (max <= 90) return 90;
    if (max <= 120) return 120;
    return Math.ceil((max * 1.2) / 30) * 30;
  }, [horizontalBarData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full min-w-0">
      {/* 1. Operational Welcome Header */}
      <Card className="p-6 sm:p-7 relative overflow-hidden text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] shadow-sm min-w-0">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 rounded-full bg-[#4F6DF5]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 size-48 rounded-full bg-[#60A5FA]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="info">
                <Sparkles className="size-3.5 mr-1 inline" />
                Staff Workspace
              </Badge>
              {teamName && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08]">
                  Team: {teamName}
                </span>
              )}
              {departmentName && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {departmentName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              Welcome back, {employeeName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Personal sales performance, assigned client collections, and real-time operational lead metrics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              loading={isPending}
              icon="RefreshCw"
            >
              {isPending ? "Syncing..." : "Sync DB"}
            </Button>
            <Link
              href="/employee/leads"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shrink-0"
            >
              <Layers className="size-3.5 text-blue-500" />
              <span>My Leads</span>
            </Link>
            <Link
              href="/employee/payments"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shrink-0"
            >
              <CreditCard className="size-3.5 text-emerald-500" />
              <span>Payments</span>
            </Link>
            <Link
              href="/employee/leads?status=FOLLOW_UP"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] hover:opacity-90 shadow-md shadow-[#4F6DF5]/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <span>Follow-ups</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. Top Overview: Target vs Achieved Milestone Card (7 cols) + Reminders Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-w-0">
        {/* Monthly Target Milestone Card (Matches empDashOverView1.jpg) */}
        <Card className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between hover:border-[#4F6DF5]/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-[#4F6DF5]/12 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/25 shrink-0 shadow-xs">
                <Target className="size-5 text-[#4F6DF5] dark:text-[#60A5FA]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Monthly Target Milestone
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Personal target vs verified approved payment collections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone="info">
                {target.achievementPercent}%
              </Badge>
              <span className="text-amber-500 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
                <Clock className="size-3.5" />
                <span>
                  {target.daysLeftInMonth} Day{target.daysLeftInMonth === 1 ? "" : "s"} Left
                </span>
              </span>
            </div>
          </div>

          {/* Progress Bar & Amounts */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#4F6DF5] shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Achieved
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1 mt-0.5 truncate">
                  <span className="text-slate-400 text-lg font-bold">₹</span>
                  <span>{formatINR(target.achievedAmount)}</span>
                </div>
              </div>
              <div className="text-right min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Target
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 tracking-tight flex items-baseline justify-end gap-1 mt-0.5 truncate">
                  <span className="text-slate-400 text-sm font-semibold">₹</span>
                  <span>{formatINR(target.targetAmount)}</span>
                </div>
              </div>
            </div>

            <div
              role="progressbar"
              aria-label="Personal Target Progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={target.achievementPercent}
              className="h-3 w-full rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden p-0.5"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] transition-all duration-700 shadow-sm"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(target.achievedAmount > 0 ? 3 : 0, target.achievementPercent)
                  )}%`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Reminders & Notifications Strip Panel (5 cols - Matches empDashOverView1.jpg) */}
        <Card className="lg:col-span-5 p-0 overflow-hidden flex flex-col h-[280px] sm:h-auto justify-between min-w-0">
          {/* Top Strip Navigation Header */}
          <div className="p-2 sm:p-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-0">
              {/* Notice / Announcement Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("notice")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "notice"
                    ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                <Megaphone className="size-3.5" />
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "notice"
                      ? "bg-white/20 text-white"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {hasNotice ? 1 : 0}
                </span>
              </button>

              {/* Lead Reminder Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("reminders")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "reminders"
                    ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                <Bell className="size-3.5" />
                <span>Lead Reminder</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "reminders"
                      ? "bg-white/20 text-white"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {totalTabReminders}
                </span>
              </button>

              {/* Payments Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "payments"
                    ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                <CreditCard className="size-3.5" />
                <span>Payments</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "payments"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {totalTabPayments}
                </span>
              </button>

              {/* Event Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("events")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "events"
                    ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                <History className="size-3.5" />
                <span>Event</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "events"
                      ? "bg-white/20 text-white"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {totalTabEvents}
                </span>
              </button>
            </div>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>

          {/* Strip Content Feed */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-150 dark:divide-white/[0.05] max-h-[190px]">
            {/* TAB 0: Notice / Announcement */}
            {activeTab === "notice" && (
              <div className="py-2 space-y-2">
                {remindersTab.announcementBanner ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong className="block font-bold mb-1">Company Announcement:</strong>
                    {remindersTab.announcementBanner}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <Megaphone className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No active organization notice</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: Lead Reminders (Strictly own callbacks) */}
            {activeTab === "reminders" && (
              <>
                {remindersTab.leadReminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <Bell className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No pending personal reminders</p>
                    <span className="text-[11px] text-slate-500">
                      Your scheduled lead callbacks will appear here.
                    </span>
                  </div>
                ) : (
                  remindersTab.leadReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="py-2 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#4F6DF5] dark:group-hover:text-[#60A5FA]">
                            {reminder.name}
                          </span>
                          {reminder.leadResponse && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20">
                              {reminder.leadResponse}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="size-2.5" />
                            {reminder.mobile}
                          </span>
                          {reminder.leadSource && (
                            <span>• {reminder.leadSource}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block">
                          {new Date(reminder.callbackDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(reminder.callbackDate).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* TAB 2: Payments (Strictly own approved payments) */}
            {activeTab === "payments" && (
              <>
                {remindersTab.recentPayments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <CreditCard className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No approved collections recorded yet</p>
                    <span className="text-[11px] text-slate-500">
                      Approved client payments for your leads will appear here.
                    </span>
                  </div>
                ) : (
                  remindersTab.recentPayments.map((p) => (
                    <div
                      key={p.id}
                      className="py-2 flex items-center justify-between gap-3 group px-2 rounded-xl"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {p.leadName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {p.modeName || "Standard Mode"} {p.paymentType ? `• ${p.paymentType}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          +₹{formatINR(p.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* TAB 3: Events (Strictly own activity logs) */}
            {activeTab === "events" && (
              <>
                {remindersTab.recentEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <History className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No personal activity events recorded</p>
                  </div>
                ) : (
                  remindersTab.recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="py-2 flex items-start justify-between gap-3 px-2 rounded-xl text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-[11px]">
                          {evt.action.replace(/_/g, " ")}
                        </span>
                        {evt.details && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {evt.details}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(evt.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 3. 2x2 Metric Cards Grid (Matches empDashOverView1.jpg exactly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
        {/* Card 1: Payment (Days ago vs Today) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group h-full min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Payment
              </span>
              <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <IndianRupee className="size-4.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  ₹{formatINR(payment.lastPaymentAmount)}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
                  {payment.lastPaymentDaysAgo !== null
                    ? `${payment.lastPaymentDaysAgo} Days ago`
                    : "No past payment"}
                </span>
              </div>
              <div className="text-right min-w-0">
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                  ₹{formatINR(payment.todayApprovedAmount)}
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                  Today
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1.5 text-xs flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
              My Collections
            </span>
            <Badge tone="ok" className="shrink-0">
              {payment.totalApprovedCount} approved
            </Badge>
          </div>
        </Card>

        {/* Card 2: Clients (New, Active, Expired + Donut) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all group h-full min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Clients
              </span>
              <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                <UserCheck className="size-4.5" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-3 min-w-0">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {clients.newThisMonth}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    New
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight truncate">
                    {clients.activeClients}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Active
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 tracking-tight truncate">
                    {clients.expiredClients}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Expired
                  </span>
                </div>
              </div>

              {/* SVG Donut Ring */}
              <div className="relative size-12 shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-amber-500 transition-all duration-500"
                    strokeWidth="3.5"
                    strokeDasharray={calculateCircleDash(
                      clients.activeClients,
                      clients.totalClients || 1,
                      97.4
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  {Math.round(((clients.activeClients || 0) / (clients.totalClients || 1)) * 100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="text-[11px] truncate">Active Ratio</span>
            <Badge tone="info" className="shrink-0">
              {clients.totalClients} Total
            </Badge>
          </div>
        </Card>

        {/* Card 3: Callback (Pending, Today, Upcoming) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-amber-500/40 transition-all group h-full min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Callback
              </span>
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <Bell className="size-4.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-xl sm:text-2xl font-black text-rose-500 dark:text-rose-400 tracking-tight truncate">
                  {callbacks.pendingCallbacks}
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                  Pending
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 tracking-tight truncate">
                  {callbacks.todayCallbacks}
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                  Today
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-blue-500 dark:text-blue-400 tracking-tight truncate">
                  {callbacks.upcomingCallbacks}
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                  Upcoming
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="text-[11px] truncate">My Callbacks</span>
            <Badge tone="warn" className="shrink-0">
              {callbacks.totalCallbacks} Total
            </Badge>
          </div>
        </Card>

        {/* Card 4: Followups (New, Pending, Updated + Donut) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between hover:border-[#4F6DF5]/40 transition-all group h-full min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Followups
              </span>
              <div className="p-2.5 rounded-full bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20 shrink-0">
                <Calendar className="size-4.5" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-3 min-w-0">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {followups.newFollowups}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    New
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight truncate">
                    {followups.pendingFollowups}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Pending
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                    {followups.updatedFollowups}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Updated
                  </span>
                </div>
              </div>

              {/* SVG Donut Ring */}
              <div className="relative size-12 shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-amber-500 transition-all duration-500"
                    strokeWidth="3.5"
                    strokeDasharray={calculateCircleDash(
                      followups.pendingFollowups,
                      followups.totalFollowups || 1,
                      97.4
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  {Math.round(((followups.pendingFollowups || 0) / (followups.totalFollowups || 1)) * 100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="text-[11px] truncate">My Followups</span>
            <Badge tone="info" className="shrink-0">
              {followups.totalFollowups} Total
            </Badge>
          </div>
        </Card>
      </div>

      {/* 4. Operational & Lead Strip: Today Activity & Total Leads (Matches empDashOverView1.jpg) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        {/* Today Activity Card */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
              <FileText className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                Today Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Daily operational workflow logs recorded today
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center min-w-0">
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] min-w-0">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {todayActivity.allotedToday}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Alloted
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] min-w-0">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {todayActivity.transferredToday}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Transferred
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] min-w-0">
              <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 truncate">
                {todayActivity.fetchedToday}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Fetched
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] min-w-0">
              <div className="text-xl sm:text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] truncate">
                {todayActivity.updatedToday}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Updated
              </span>
            </div>
          </div>
        </Card>

        {/* Total Leads Card */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-full bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20 shrink-0">
                <Layers className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Total Leads
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Status distribution of your assigned prospective leads
                </p>
              </div>
            </div>
            <Link
              href="/employee/leads"
              className="text-xs font-semibold text-[#4F6DF5] dark:text-[#60A5FA] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center min-w-0">
            <Link
              href="/employee/leads?status=UNREAD"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-amber-500/50 transition-colors block min-w-0"
            >
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
                {leadStatusStrip.unreadCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Unread
              </span>
            </Link>

            <Link
              href="/employee/leads?status=READ"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-blue-500/50 transition-colors block min-w-0"
            >
              <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200 truncate">
                {leadStatusStrip.readCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Read
              </span>
            </Link>

            <Link
              href="/employee/leads?status=FOLLOW_UP"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-[#4F6DF5]/50 transition-colors block min-w-0"
            >
              <div className="text-xl sm:text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] truncate">
                {leadStatusStrip.followupCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Followup
              </span>
            </Link>

            <Link
              href="/employee/leads?status=CLIENT"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-emerald-500/50 transition-colors block min-w-0"
            >
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {leadStatusStrip.clientCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Client
              </span>
            </Link>

            <Link
              href="/employee/leads"
              className="p-3 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20 hover:border-[#4F6DF5]/50 transition-colors block col-span-2 sm:col-span-1 min-w-0"
            >
              <div className="text-xl sm:text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] truncate">
                {leadStatusStrip.totalLeadsCount}
              </div>
              <span className="text-xs font-bold text-[#4F6DF5] dark:text-[#60A5FA] mt-1 block truncate">
                Total
              </span>
            </Link>
          </div>
        </Card>
      </div>

      {/* 5. STEP 2: 4 Analytical Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* CARD 1: New Followup Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  New Followup
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                title="Options"
              >
                <Menu className="size-4" />
              </button>
            </div>

            {/* Followup Chart Body */}
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxFollowupVal}.0</span>
                  <span>{(maxFollowupVal * 0.75).toFixed(1)}</span>
                  <span>{(maxFollowupVal * 0.5).toFixed(1)}</span>
                  <span>{(maxFollowupVal * 0.25).toFixed(1)}</span>
                  <span>0.0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Bars Row */}
                  {charts.followupPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No follow-up activity logged yet.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Scheduled callbacks and lead updates will automatically appear here.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                      {charts.followupPoints.map((pt) => {
                        const heightPercent = Math.min(100, Math.max(8, (pt.count / maxFollowupVal) * 100));
                        const isHovered = hoveredFollowupKey === pt.key;

                        return (
                          <div
                            key={pt.key}
                            onMouseEnter={() => setHoveredFollowupKey(pt.key)}
                            onMouseLeave={() => setHoveredFollowupKey(null)}
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[48px] h-full justify-end cursor-pointer"
                          >
                            {isHovered && (
                              <div className="absolute -top-10 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                                {pt.label}: {pt.count} Followup{pt.count === 1 ? "" : "s"}
                              </div>
                            )}

                            <div
                              className="w-full rounded-t-md bg-[#4F6DF5] hover:bg-[#3d5bd9] dark:hover:bg-[#60A5FA] transition-all duration-300 shadow-sm"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated X-Axis Labels Row */}
              {charts.followupPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-8 sm:w-10 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {charts.followupPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
                        title={pt.label}
                      >
                        {formatShortDate(pt.label)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>My personal follow-up chronology</span>
            <span className="font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
              {charts.followupPoints.reduce((acc, curr) => acc + curr.count, 0)} total logged
            </span>
          </div>
        </Card>

        {/* CARD 2: Lead Fetch Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Lead Fetch
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                title="Options"
              >
                <Menu className="size-4" />
              </button>
            </div>

            {/* Fetch Chart Body */}
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-10 sm:w-12 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxFetchVal}</span>
                  <span>{Math.round(maxFetchVal * 0.75)}</span>
                  <span>{Math.round(maxFetchVal * 0.5)}</span>
                  <span>{Math.round(maxFetchVal * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Clustered Bars Row */}
                  <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                    {charts.fetchPoints.map((pt) => {
                      const limitHeight =
                        pt.fetchLimit > 0
                          ? Math.min(100, Math.max(6, (pt.fetchLimit / maxFetchVal) * 100))
                          : 4;
                      const fetchedHeight =
                        pt.todayFetched > 0
                          ? Math.min(100, Math.max(6, (pt.todayFetched / maxFetchVal) * 100))
                          : pt.totalFetched > 0
                          ? Math.min(100, Math.max(6, (pt.totalFetched / maxFetchVal) * 100))
                          : 0;

                      const isHovered = hoveredFetchSource === pt.source;

                      return (
                        <div
                          key={pt.source}
                          onMouseEnter={() => setHoveredFetchSource(pt.source)}
                          onMouseLeave={() => setHoveredFetchSource(null)}
                          className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[44px] h-full justify-end cursor-pointer"
                        >
                          {isHovered && (
                            <div className="absolute -top-12 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                              <p className="underline font-bold">{pt.source}</p>
                              <p className="text-[#4F6DF5] dark:text-[#60A5FA]">Fetch Limit: {pt.fetchLimit}</p>
                              <p className="text-cyan-400 dark:text-cyan-600">
                                Today: {pt.todayFetched} | Total: {pt.totalFetched}
                              </p>
                            </div>
                          )}

                          {/* Clustered Pair */}
                          <div className="w-full flex items-end justify-center gap-0.5 h-full">
                            <div
                              className="w-1/2 rounded-t-xs bg-[#4F6DF5] hover:brightness-110 transition-all duration-300"
                              style={{ height: `${limitHeight}%` }}
                              title={`Limit: ${pt.fetchLimit}`}
                            />
                            <div
                              className="w-1/2 rounded-t-xs bg-cyan-500 dark:bg-cyan-400 hover:brightness-110 transition-all duration-300"
                              style={{ height: `${fetchedHeight}%` }}
                              title={`Today Fetched: ${pt.todayFetched}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dedicated X-Axis Labels Row */}
              <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                <div className="w-10 sm:w-12 shrink-0" />
                <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                  {charts.fetchPoints.map((pt) => (
                    <span
                      key={pt.source}
                      className="flex-1 min-w-0 text-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
                      title={pt.source}
                    >
                      {getShortSource(pt.source)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Legend matching empDashOverview2.png */}
            <div className="pt-2 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-[#4F6DF5]" />
                <span className="text-xs font-medium">Fetch Limit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-cyan-500 dark:bg-cyan-400" />
                <span className="text-xs font-medium">Today Fetched</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row B: Payment Daily Report & Calling Report (Matching empDashOVerview3.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* CARD 3: Payment Daily Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Payment
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Report</span>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                title="Options"
              >
                <Menu className="size-4" />
              </button>
            </div>

            {/* Payment Chart Body */}
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-12 sm:w-14 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxPaymentVal}</span>
                  <span>{Math.round(maxPaymentVal * 0.8)}</span>
                  <span>{Math.round(maxPaymentVal * 0.6)}</span>
                  <span>{Math.round(maxPaymentVal * 0.4)}</span>
                  <span>{Math.round(maxPaymentVal * 0.2)}</span>
                  <span>0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Bars Row */}
                  {charts.paymentPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No approved payments recorded this month.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Daily approved collections will automatically appear here.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                      {charts.paymentPoints.map((pt) => {
                        const heightPercent = Math.min(100, Math.max(8, (pt.amount / maxPaymentVal) * 100));
                        const isHovered = hoveredPaymentKey === pt.key;

                        return (
                          <div
                            key={pt.key}
                            onMouseEnter={() => setHoveredPaymentKey(pt.key)}
                            onMouseLeave={() => setHoveredPaymentKey(null)}
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[48px] h-full justify-end cursor-pointer"
                          >
                            {isHovered && (
                              <div className="absolute -top-10 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                                {pt.label}: ₹{formatINR(pt.amount)}
                              </div>
                            )}

                            <div
                              className="w-full rounded-t-md bg-[#4F6DF5] hover:bg-[#3d5bd9] dark:hover:bg-[#60A5FA] transition-all duration-300 shadow-sm"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated X-Axis Labels Row */}
              {charts.paymentPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-12 sm:w-14 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {charts.paymentPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
                        title={pt.label}
                      >
                        {formatShortDate(pt.label)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Summary Bar matching empDashOVerview3.png */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2.5 min-w-0">
            <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20 text-[#4F6DF5] dark:text-[#60A5FA] text-xs font-semibold text-center truncate">
              Target : Rs.{formatINR(target.targetAmount)}/-
            </div>
            <div className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold text-center shrink-0">
              {target.achievementPercent}%
            </div>
            <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center truncate">
              Achieved : Rs.{formatINR(target.achievedAmount)}/-
            </div>
          </div>
        </Card>

        {/* CARD 4: Calling Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Calling
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>

              {/* Employee Lock Indicator matching empDashOverview2.png / empDashOVerview3.png */}
              <div className="flex items-center gap-2">
                <select
                  disabled
                  aria-label="Current Employee"
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 cursor-default opacity-90 min-w-[140px]"
                >
                  <option value={employeeName}>{employeeName} ()</option>
                </select>

                <button
                  type="button"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Options"
                >
                  <Menu className="size-4" />
                </button>
              </div>
            </div>

            {/* Calling Chart Body */}
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              <div className="relative flex-1 min-w-0 flex">
                {/* Left Y-Axis: Calling Hours */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxCallingHours}</span>
                  <span>{Math.round(maxCallingHours * 0.75)}</span>
                  <span>{Math.round(maxCallingHours * 0.5)}</span>
                  <span>{Math.round(maxCallingHours * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Calling Data Bars */}
                  {charts.callingPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No call logs recorded yet.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Outbound/inbound call durations and connected records will plot here.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                      {charts.callingPoints.map((pt) => {
                        const hoursHeight = Math.min(100, Math.max(6, (pt.hours / maxCallingHours) * 100));
                        const callsHeight = Math.min(
                          100,
                          Math.max(6, (pt.connectedCalls / maxConnectedCalls) * 100)
                        );
                        const isHovered = hoveredCallingKey === pt.key;

                        return (
                          <div
                            key={pt.key}
                            onMouseEnter={() => setHoveredCallingKey(pt.key)}
                            onMouseLeave={() => setHoveredCallingKey(null)}
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[44px] h-full justify-end cursor-pointer"
                          >
                            {isHovered && (
                              <div className="absolute -top-12 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                                <p className="underline font-bold">{pt.label}</p>
                                <p className="text-slate-300 dark:text-slate-700">
                                  Calling Hours: {pt.hours.toFixed(1)}h
                                </p>
                                <p className="text-cyan-400 dark:text-cyan-600">
                                  Connected Calls: {pt.connectedCalls}
                                </p>
                              </div>
                            )}

                            <div className="w-full flex items-end justify-center gap-0.5 h-full">
                              <div
                                className="w-1/2 rounded-t-xs bg-slate-400 dark:bg-slate-500 hover:brightness-110 transition-all duration-300"
                                style={{ height: `${hoursHeight}%` }}
                                title={`Hours: ${pt.hours.toFixed(1)}h`}
                              />
                              <div
                                className="w-1/2 rounded-t-xs bg-cyan-500 dark:bg-cyan-400 hover:brightness-110 transition-all duration-300"
                                style={{ height: `${callsHeight}%` }}
                                title={`Connected: ${pt.connectedCalls}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Y-Axis: Connected Calls */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-left pl-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono font-semibold select-none shrink-0">
                  <span>{maxConnectedCalls}</span>
                  <span>{Math.round(maxConnectedCalls * 0.75)}</span>
                  <span>{Math.round(maxConnectedCalls * 0.5)}</span>
                  <span>{Math.round(maxConnectedCalls * 0.25)}</span>
                  <span>0</span>
                </div>
              </div>

              {/* Dedicated X-Axis Labels Row */}
              {charts.callingPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-8 sm:w-10 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {charts.callingPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
                        title={pt.label}
                      >
                        {formatShortDate(pt.label)}
                      </span>
                    ))}
                  </div>
                  <div className="w-8 sm:w-10 shrink-0" />
                </div>
              )}
            </div>

            {/* Bottom Legend */}
            <div className="pt-2 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-slate-400 dark:bg-slate-500" />
                <span className="text-xs font-medium">Calling Hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-cyan-500 dark:bg-cyan-400" />
                <span className="text-xs font-medium">Connected Calls</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* 6. STEP 3: Tabbed Reports Section (Matching empDashOVerview3.png & empDashOverView4.png) */}
      {/* ======================================================== */}
      <div className="space-y-4 min-w-0">
        {/* Tab Switcher Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveReportTab("leadReport")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "leadReport"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <Megaphone className="size-3.5" />
            <span>Lead Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab("leadRecord")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "leadRecord"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Lead Record</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab("performance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "performance"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <Award className="size-3.5" />
            <span>Performance Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab("monthlySales")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "monthlySales"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <IndianRupee className="size-3.5" />
            <span>Monthly Sales Report</span>
          </button>
        </div>

        {/* TAB 1: Lead Report (Horizontal Bar Distribution with Left Filter Panel matching empDashOverView4.png) */}
        {activeReportTab === "leadReport" && (
          <Card className="p-5 sm:p-6 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Filter Panel (3 cols) */}
              <div className="lg:col-span-3 space-y-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Filters
                  </span>
                  {isReportFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetReportFilters}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <RotateCcw className="size-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Source Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Source
                  </label>
                  <select
                    value={reportSourceFilter}
                    onChange={(e) => setReportSourceFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                  >
                    <option value="ALL">All Source</option>
                    {tabbedReports.sources.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range: Last Updated Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Last Updated Date
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      placeholder="From"
                      aria-label="Last Updated Date From"
                      className="w-full text-xs px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                    />
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      placeholder="To"
                      aria-label="Last Updated Date To"
                      className="w-full text-xs px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-400">
                  Showing {filteredReportLeads.length} of {tabbedReports.leads.length} assigned leads
                </div>
              </div>

              {/* Right Breakdown Chart Panel (9 cols) */}
              <div className="lg:col-span-9 space-y-4 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Total Leads : <span className="text-[#4F6DF5] dark:text-[#60A5FA] font-black">{filteredReportLeads.length}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    My Lead Disposition Breakdown
                  </span>
                </div>

                {/* Horizontal Bars Stack (18 Categories) */}
                <div className="space-y-1 pt-1">
                  {horizontalBarData.map((item) => {
                    const widthPercent = (item.count / maxHorizontalCount) * 100;
                    const isHovered = hoveredLeadBarLabel === item.label;

                    return (
                      <div
                        key={item.label}
                        onMouseEnter={() => setHoveredLeadBarLabel(item.label)}
                        onMouseLeave={() => setHoveredLeadBarLabel(null)}
                        className="group flex items-center text-xs relative cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/[0.02] py-0.5 px-1 rounded-md transition-colors"
                      >
                        {/* Left Category Label */}
                        <div className="w-28 sm:w-36 text-right pr-3 text-xs font-medium text-slate-600 dark:text-slate-300 truncate shrink-0">
                          {item.label}
                        </div>

                        {/* Bar Track & Fill */}
                        <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-r-md overflow-hidden relative min-w-0">
                          <div
                            className="h-full bg-[#4F6DF5] group-hover:bg-[#60A5FA] rounded-r-md transition-all duration-500 shadow-sm"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>

                        {/* Right Count Label */}
                        <div className="w-10 text-left pl-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          {item.count}
                        </div>

                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute left-36 sm:left-44 z-30 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in">
                            {item.label}: {item.count} leads (
                            {filteredReportLeads.length > 0
                              ? Math.round((item.count / filteredReportLeads.length) * 100)
                              : 0}
                            %)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Scale Axis Line across bottom matching empDashOverView4.png */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-150 dark:border-white/[0.05] pl-28 sm:pl-36 pr-10">
                  <span>0</span>
                  <span>{Math.round(maxHorizontalCount * 0.25)}</span>
                  <span>{Math.round(maxHorizontalCount * 0.5)}</span>
                  <span>{Math.round(maxHorizontalCount * 0.75)}</span>
                  <span>{maxHorizontalCount}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 2: Lead Record Registry */}
        {activeReportTab === "leadRecord" && (
          <Card className="p-5 sm:p-6 space-y-4 min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06] flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Lead Registry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Assigned prospective leads under your ownership</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
                  {filteredReportLeads.length} leads
                </span>
                <Link
                  href="/employee/leads"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F6DF5] hover:underline"
                >
                  <span>Open Full Leads Table</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                    <th className="pb-2 font-semibold">Lead Name</th>
                    <th className="pb-2 font-semibold">Mobile</th>
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Response</th>
                    <th className="pb-2 font-semibold text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                  {filteredReportLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No lead records found for current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReportLeads.slice(0, 20).map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{l.name}</td>
                        <td className="py-2.5 font-mono text-slate-500">{l.mobile}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{l.leadSource || "DIRECT"}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20">
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {l.leadResponse || "-"}
                        </td>
                        <td className="py-2.5 font-mono text-xs text-slate-400 text-right">
                          {new Date(l.updatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: Performance Report */}
        {activeReportTab === "performance" && (
          <Card className="p-5 sm:p-6 space-y-5 min-w-0">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Personal Performance Scorecard</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Activity volume, conversion efficacy, and sales achievement</p>
              </div>
              <Badge tone="info">
                {tabbedReports.performance.achievementPercent}% Quota Achieved
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Leads</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {tabbedReports.performance.assignedLeadsCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Followups Logged</span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {tabbedReports.performance.followupsCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Total Leads Fetched</span>
                <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                  {tabbedReports.performance.fetchesCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Approved Sales</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{formatINR(tabbedReports.performance.approvedSalesAmount)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: Monthly Sales Report */}
        {activeReportTab === "monthlySales" && (
          <Card className="p-5 sm:p-6 space-y-5 min-w-0">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Monthly Sales & Revenue Collections</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Verified approved payments and invoice receipts for your assigned clients</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {target.achievementPercent}% of Target
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4F6DF5] dark:text-[#60A5FA]">Target</span>
                <div className="text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] mt-1">
                  ₹{formatINR(target.targetAmount)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Approved Collection
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{formatINR(target.achievedAmount)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verified Transactions</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {tabbedReports.sales.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                    <th className="pb-2 font-semibold">Client Name</th>
                    <th className="pb-2 font-semibold">Mobile</th>
                    <th className="pb-2 font-semibold">Payment Mode</th>
                    <th className="pb-2 font-semibold">Invoice No</th>
                    <th className="pb-2 font-semibold text-right">Amount</th>
                    <th className="pb-2 font-semibold text-right">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                  {tabbedReports.sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No approved payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    tabbedReports.sales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{s.leadName}</td>
                        <td className="py-2.5 font-mono text-slate-500">{s.leadMobile}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{s.modeName || "Standard"}</td>
                        <td className="py-2.5 font-mono text-slate-500">{s.invoiceNumber || s.serialNo || "-"}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{formatINR(s.amount)}
                        </td>
                        <td className="py-2.5 font-mono text-xs text-slate-400 text-right">
                          {new Date(s.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* 7. Shared Profile Best Performer Leaderboards (Dynamic from EMPLOYEE_GRAPH_CONFIGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {data.leaderboards && data.leaderboards.length > 0 ? (
          data.leaderboards.map((card) => (
            <LeaderboardCard
              key={card.id}
              title={card.title}
              items={card.items}
              formatINR={formatINR}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
            No active profile graphs configured.
          </div>
        )}
      </div>
    </div>
  );
}
