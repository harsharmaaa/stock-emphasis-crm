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
  RefreshCw,
  Clock,
  Phone,
  ShieldCheck,
  CreditCard,
  History,
  Activity,
  ArrowRight,
  UserCheck,
  Menu,
  BarChart3,
  FileText,
  Award,
  Scale,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import type { AdminOverviewStep1Data } from "./actions";

interface AdminOverviewClientProps {
  initialData: AdminOverviewStep1Data;
}

export function AdminOverviewClient({ initialData }: AdminOverviewClientProps) {
  const router = useRouter();
  const [data] = useState<AdminOverviewStep1Data>(initialData);
  const [activeTab, setActiveTab] = useState<"all" | "reminders" | "payments" | "events">("reminders");
  const [isPending, startTransition] = useTransition();

  // Step 2 Filter States
  const [followupEmployeeFilter, setFollowupEmployeeFilter] = useState<string>("ALL");
  const [followupTeamFilter, setFollowupTeamFilter] = useState<string>("ALL");

  const [fetchEmployeeFilter, setFetchEmployeeFilter] = useState<string>("ALL");
  const [fetchTeamFilter, setFetchTeamFilter] = useState<string>("ALL");

  // Step 3 Filter States
  const [paymentEmployeeFilter, setPaymentEmployeeFilter] = useState<string>("ALL");
  const [paymentTeamFilter, setPaymentTeamFilter] = useState<string>("ALL");
  const [callingEmployeeFilter, setCallingEmployeeFilter] = useState<string>("ALL");

  // Step 4 Report Tab & Filter States
  const [activeReportTab, setActiveReportTab] = useState<
    "leadReport" | "leadRecord" | "performance" | "leadBalance" | "monthlySales"
  >("leadReport");

  const [reportSourceFilter, setReportSourceFilter] = useState<string>("ALL");
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>("ALL");
  const [reportTeamFilter, setReportTeamFilter] = useState<string>("ALL");
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");

  // Hover states for tooltips
  const [hoveredFollowupKey, setHoveredFollowupKey] = useState<string | null>(null);
  const [hoveredFetchSource, setHoveredFetchSource] = useState<string | null>(null);
  const [hoveredPaymentKey, setHoveredPaymentKey] = useState<string | null>(null);
  const [hoveredCallingKey, setHoveredCallingKey] = useState<string | null>(null);
  const [hoveredLeadBarLabel, setHoveredLeadBarLabel] = useState<string | null>(null);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleResetReportFilters = () => {
    setReportSourceFilter("ALL");
    setReportEmployeeFilter("ALL");
    setReportTeamFilter("ALL");
    setReportStartDate("");
    setReportEndDate("");
  };

  const isReportFilterActive =
    reportSourceFilter !== "ALL" ||
    reportEmployeeFilter !== "ALL" ||
    reportTeamFilter !== "ALL" ||
    reportStartDate !== "" ||
    reportEndDate !== "";

  const {
    adminName,
    target,
    payment,
    clients,
    callbacks,
    followups,
    todayActivity,
    leadStatusStrip,
    remindersTab,
    charts,
    leadReport,
    leaderboards,
  } = data;

  // Format currency in Indian notation
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Safe percentage helper for SVG Donut
  const calculateCircleDash = (value: number, total: number, circumference: number) => {
    if (total <= 0 || value <= 0) return `0 ${circumference}`;
    const pct = Math.min(1, value / total);
    const strokeDash = pct * circumference;
    return `${strokeDash} ${circumference - strokeDash}`;
  };

  const totalTabReminders = remindersTab.leadReminders.length;
  const totalTabPayments = remindersTab.recentPayments.length;
  const totalTabEvents = remindersTab.recentEvents.length;
  const allTabsCount = totalTabReminders + totalTabPayments + totalTabEvents;

  // Step 2: Compute Filtered Follow-up Points
  const filteredFollowupPoints = useMemo(() => {
    const records = charts.followupRecords.filter((r) => {
      if (followupEmployeeFilter !== "ALL" && r.allotToId !== followupEmployeeFilter) return false;
      if (followupTeamFilter !== "ALL" && r.teamId !== followupTeamFilter) return false;
      return true;
    });

    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const r of records) {
      const existing = map.get(r.dateKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(r.dateKey, { key: r.dateKey, label: r.formattedDate, count: 1 });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [charts.followupRecords, followupEmployeeFilter, followupTeamFilter]);

  // Max follow-up scale for Y-axis
  const maxFollowupVal = useMemo(() => {
    if (filteredFollowupPoints.length === 0) return 6;
    const max = Math.max(...filteredFollowupPoints.map((p) => p.count));
    return max <= 4 ? 6 : max % 2 === 0 ? max + 2 : max + 3;
  }, [filteredFollowupPoints]);

  // Step 2: Compute Filtered Fetch Report Points
  const filteredFetchPoints = useMemo(() => {
    const records = charts.fetchRecords.filter((r) => {
      if (fetchEmployeeFilter !== "ALL" && r.userId !== fetchEmployeeFilter) return false;
      if (fetchTeamFilter !== "ALL" && r.teamId !== fetchTeamFilter) return false;
      return true;
    });

    const fetchedMap = new Map<string, { today: number; total: number }>();
    for (const r of records) {
      const existing = fetchedMap.get(r.source) || { today: 0, total: 0 };
      if (r.isToday) {
        existing.today += r.leadsCount;
      }
      existing.total += r.leadsCount;
      fetchedMap.set(r.source, existing);
    }

    const rulesMap = new Map<string, number>();
    for (const rule of charts.sourceRules) {
      rulesMap.set(rule.source, rule.fetchLimit);
    }

    const sourcesToShow =
      charts.knownSources.length > 0
        ? charts.knownSources.slice(0, 10)
        : [
            "Fresh Lead",
            "SEO",
            "Premium Lead",
            "HNI Lead",
            "Web Lead",
            "PMS",
            "Emphasis",
            "Digital Marketing",
            "campegin",
            "Callback",
          ];

    return sourcesToShow.map((source) => {
      const counts = fetchedMap.get(source) || { today: 0, total: 0 };
      const limit = rulesMap.get(source) || 0;
      return {
        source,
        fetchLimit: limit,
        todayFetched: counts.today,
        totalFetched: counts.total,
      };
    });
  }, [charts.fetchRecords, charts.sourceRules, charts.knownSources, fetchEmployeeFilter, fetchTeamFilter]);

  // Max fetch scale for Y-axis
  const maxFetchVal = useMemo(() => {
    if (filteredFetchPoints.length === 0) return 60;
    const max = Math.max(
      ...filteredFetchPoints.map((p) => Math.max(p.fetchLimit, p.todayFetched, p.totalFetched))
    );
    return max <= 20 ? 40 : Math.ceil(max * 1.25 / 10) * 10;
  }, [filteredFetchPoints]);

  // Step 3: Compute Filtered Daily Payments Points
  const filteredPaymentPoints = useMemo(() => {
    const records = charts.dailyPayments.filter((p) => {
      if (paymentEmployeeFilter !== "ALL" && p.leadOwnerId !== paymentEmployeeFilter) return false;
      if (paymentTeamFilter !== "ALL" && p.teamId !== paymentTeamFilter) return false;
      return true;
    });

    const map = new Map<string, { key: string; label: string; amount: number }>();
    for (const r of records) {
      const existing = map.get(r.dateKey);
      if (existing) {
        existing.amount += r.amount;
      } else {
        map.set(r.dateKey, { key: r.dateKey, label: r.formattedDate, amount: r.amount });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [charts.dailyPayments, paymentEmployeeFilter, paymentTeamFilter]);

  const maxPaymentVal = useMemo(() => {
    if (filteredPaymentPoints.length === 0) return 200000;
    const max = Math.max(...filteredPaymentPoints.map((p) => p.amount));
    return max <= 50000 ? 50000 : Math.ceil(max * 1.25 / 10000) * 10000;
  }, [filteredPaymentPoints]);

  // Step 3: Compute Filtered Calling Points
  const filteredCallingPoints = useMemo(() => {
    const records = charts.callingRecords.filter((c) => {
      if (callingEmployeeFilter !== "ALL" && c.callerId !== callingEmployeeFilter) return false;
      return true;
    });

    const map = new Map<string, { key: string; label: string; hours: number; connectedCalls: number }>();
    for (const r of records) {
      const existing = map.get(r.dateKey) || { key: r.dateKey, label: r.formattedDate, hours: 0, connectedCalls: 0 };
      existing.hours += r.durationSeconds / 3600;
      if (r.isConnected) {
        existing.connectedCalls += 1;
      }
      map.set(r.dateKey, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [charts.callingRecords, callingEmployeeFilter]);

  const maxCallingHours = useMemo(() => {
    if (filteredCallingPoints.length === 0) return 5;
    const max = Math.max(...filteredCallingPoints.map((p) => p.hours));
    return max <= 4 ? 5 : Math.ceil(max + 1);
  }, [filteredCallingPoints]);

  const maxConnectedCalls = useMemo(() => {
    if (filteredCallingPoints.length === 0) return 5;
    const max = Math.max(...filteredCallingPoints.map((p) => p.connectedCalls));
    return max <= 4 ? 5 : Math.ceil(max + 1);
  }, [filteredCallingPoints]);

  // Step 4: Compute Filtered Leads for Lead Report Section
  const filteredReportLeads = useMemo(() => {
    return leadReport.allLeads.filter((lead) => {
      // Source filter
      if (reportSourceFilter !== "ALL") {
        if (!lead.leadSource || lead.leadSource.toLowerCase() !== reportSourceFilter.toLowerCase()) {
          return false;
        }
      }
      // Employee / Owner filter
      if (reportEmployeeFilter !== "ALL" && lead.allotToId !== reportEmployeeFilter) {
        return false;
      }
      // Team filter
      if (reportTeamFilter !== "ALL" && lead.teamId !== reportTeamFilter) {
        return false;
      }
      // Date Range filters on updatedAt
      if (reportStartDate) {
        const start = new Date(reportStartDate).getTime();
        const updated = new Date(lead.updatedAt).getTime();
        if (updated < start) return false;
      }
      if (reportEndDate) {
        const end = new Date(reportEndDate);
        end.setHours(23, 59, 59, 999);
        const updated = new Date(lead.updatedAt).getTime();
        if (updated > end.getTime()) return false;
      }

      return true;
    });
  }, [
    leadReport.allLeads,
    reportSourceFilter,
    reportEmployeeFilter,
    reportTeamFilter,
    reportStartDate,
    reportEndDate,
  ]);

  // Step 4: Compute Horizontal Bar Chart Breakdown Data matching Admin Dash2/Dash3
  const horizontalBarData = useMemo(() => {
    // Categories matching CRM dispositions in reference images
    const targetCategories = [
      "Unread",
      "Callback",
      "NPC",
      "Do Not Trade",
      "Not Reachable",
      "Switch Off",
      "Not Interested",
      "Call Disconnected",
      "Language Issue",
      "Busy",
      "FT",
      "Interested",
      "Paid",
      "Followup",
      "Trial",
      "Client",
      "Disposed",
      "Unfollowed",
    ];

    const countMap = new Map<string, number>();
    for (const cat of targetCategories) {
      countMap.set(cat, 0);
    }

    for (const lead of filteredReportLeads) {
      const resp = (lead.leadResponse || "").trim().toLowerCase();
      const st = (lead.status || "").trim().toLowerCase();

      if (resp === "callback") countMap.set("Callback", (countMap.get("Callback") || 0) + 1);
      else if (resp === "npc") countMap.set("NPC", (countMap.get("NPC") || 0) + 1);
      else if (resp.includes("not trade") || resp.includes("do not trade"))
        countMap.set("Do Not Trade", (countMap.get("Do Not Trade") || 0) + 1);
      else if (resp.includes("not reachable") || resp.includes("not rechable"))
        countMap.set("Not Reachable", (countMap.get("Not Reachable") || 0) + 1);
      else if (resp.includes("switch off"))
        countMap.set("Switch Off", (countMap.get("Switch Off") || 0) + 1);
      else if (resp.includes("not interested"))
        countMap.set("Not Interested", (countMap.get("Not Interested") || 0) + 1);
      else if (resp.includes("disconnect"))
        countMap.set("Call Disconnected", (countMap.get("Call Disconnected") || 0) + 1);
      else if (resp.includes("language"))
        countMap.set("Language Issue", (countMap.get("Language Issue") || 0) + 1);
      else if (resp === "busy") countMap.set("Busy", (countMap.get("Busy") || 0) + 1);
      else if (resp === "ft") countMap.set("FT", (countMap.get("FT") || 0) + 1);
      else if (resp === "interested")
        countMap.set("Interested", (countMap.get("Interested") || 0) + 1);
      else if (resp === "paid") countMap.set("Paid", (countMap.get("Paid") || 0) + 1);
      else if (st === "unread") countMap.set("Unread", (countMap.get("Unread") || 0) + 1);
      else if (st === "follow_up" || st === "followup")
        countMap.set("Followup", (countMap.get("Followup") || 0) + 1);
      else if (st === "trial") countMap.set("Trial", (countMap.get("Trial") || 0) + 1);
      else if (st === "client" || st === "clients")
        countMap.set("Client", (countMap.get("Client") || 0) + 1);
      else if (st === "disposed") countMap.set("Disposed", (countMap.get("Disposed") || 0) + 1);
      else if (st === "unfollowed")
        countMap.set("Unfollowed", (countMap.get("Unfollowed") || 0) + 1);
      else {
        // Fallback to unread or unfollowed
        if (st === "read") countMap.set("Unread", (countMap.get("Unread") || 0) + 1);
        else countMap.set("Unfollowed", (countMap.get("Unfollowed") || 0) + 1);
      }
    }

    return targetCategories.map((cat) => ({
      label: cat,
      count: countMap.get(cat) || 0,
    }));
  }, [filteredReportLeads]);

  // Max count for horizontal bar scaling
  const maxHorizontalCount = useMemo(() => {
    const max = Math.max(...horizontalBarData.map((d) => d.count), 1);
    return max <= 20 ? 30 : Math.ceil(max * 1.15 / 10) * 10;
  }, [horizontalBarData]);

  // Step 5: Leaderboards Chart Series
  const tlItems = useMemo(
    () =>
      leaderboards.topBestTL.map((tl) => ({
        id: tl.id,
        displayName: tl.name,
        subTitle: tl.profileName || "Team Leader",
        targetAmount: tl.targetAmount,
        achievedAmount: tl.achievedAmount,
        achievementPercent: tl.achievementPercent,
        leadsCount: tl.leadsHandled,
        metricValue: tl.metricValue,
      })),
    [leaderboards.topBestTL]
  );

  const sbaItems = useMemo(
    () =>
      leaderboards.topBestSBA.map((sba) => ({
        id: sba.id,
        displayName: sba.name,
        subTitle: sba.profileName || "Senior Business Analyst",
        targetAmount: sba.targetAmount,
        achievedAmount: sba.achievedAmount,
        achievementPercent: sba.achievementPercent,
        leadsCount: sba.leadsHandled,
        metricValue: sba.metricValue,
      })),
    [leaderboards.topBestSBA]
  );

  const batItems = useMemo(
    () =>
      leaderboards.topBestBAT.map((bat) => ({
        id: bat.id,
        displayName: bat.name,
        subTitle: bat.profileName || "Business Analyst Trainee",
        targetAmount: bat.targetAmount,
        achievedAmount: bat.achievedAmount,
        achievementPercent: bat.achievementPercent,
        leadsCount: bat.leadsHandled,
        metricValue: bat.metricValue,
      })),
    [leaderboards.topBestBAT]
  );

  const baItems = useMemo(
    () =>
      leaderboards.topBestBA.map((ba) => ({
        id: ba.id,
        displayName: ba.name,
        subTitle: ba.profileName || "Business Analyst",
        targetAmount: ba.targetAmount,
        achievedAmount: ba.achievedAmount,
        achievementPercent: ba.achievementPercent,
        leadsCount: ba.leadsHandled,
        metricValue: ba.metricValue,
      })),
    [leaderboards.topBestBA]
  );

  const afmItems = useMemo(
    () =>
      leaderboards.topTeamBestAFM.map((t) => ({
        id: t.id,
        displayName: t.leaderName !== "Unassigned" ? t.leaderName : t.teamName,
        subTitle: `Team: ${t.teamName} (${t.membersCount} members)`,
        targetAmount: t.targetAmount,
        achievedAmount: t.achievedAmount,
        achievementPercent: t.achievementPercent,
        leadsCount: t.leadsCount,
        metricValue: t.metricValue,
      })),
    [leaderboards.topTeamBestAFM]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Welcome & Telemetry Header */}
      <Card className="p-6 sm:p-7 relative overflow-hidden text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 rounded-full bg-[#4F6DF5]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 size-48 rounded-full bg-[#60A5FA]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <Badge tone="info">
              <ShieldCheck className="size-3.5 mr-1 inline" />
              Admin Control Center
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {adminName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Live operational dashboard with real-time Prisma metrics. Monitor financial milestones, lead activity, and pending client callbacks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
              href="/admin/leads"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] hover:opacity-90 shadow-md shadow-[#4F6DF5]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>All Leads</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Main Split Layout: Left 2 Columns (Target, 2x2 KPIs, Today Activity) + Right 1 Column (Reminders / Payments / Events Tab Box & Status Strip) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Section (7 of 12 cols on XL) */}
        <div className="xl:col-span-7 space-y-6">
          {/* 1. Target & Achieved Card */}
          <Card className="p-5 sm:p-6 hover:border-[#4F6DF5]/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Achieved Left */}
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-[#4F6DF5]/12 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/25 shrink-0 shadow-xs">
                  <Target className="size-6 text-[#4F6DF5] dark:text-[#60A5FA]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1">
                    <span className="text-slate-400 text-lg font-bold">₹</span>
                    <span>{formatINR(target.achievedAmount)}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Achieved
                  </span>
                </div>
              </div>

              {/* Center Progress Information */}
              <div className="flex-1 max-w-xs mx-auto w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <Badge tone="info">
                    {target.achievementPercent}%
                  </Badge>
                  <span className="text-amber-500 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>
                      {target.daysLeftInMonth} Day{target.daysLeftInMonth === 1 ? "" : "s"} Left
                    </span>
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-150 dark:bg-slate-800/80 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] transition-all duration-700 shadow-sm"
                    style={{ width: `${Math.max(3, target.achievementPercent)}%` }}
                  />
                </div>
              </div>

              {/* Target Right */}
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center sm:justify-end gap-1">
                  <span className="text-slate-400 text-lg font-bold">₹</span>
                  <span>{formatINR(target.targetAmount)}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target
                </span>
              </div>
            </div>
          </Card>

          {/* 2. 2x2 Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Payment KPI Card */}
            <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <IndianRupee className="size-5" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1">
                    <span>₹{formatINR(payment.lastPaymentAmount)}</span>
                    <span className="text-[10px] text-slate-400">
                      {payment.lastPaymentDaysAgo !== null ? `${payment.lastPaymentDaysAgo}d ago` : "prior"}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    ₹{formatINR(payment.todayApprovedAmount)}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Today&apos;s Collection
                  </span>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {payment.totalApprovedCount} approved
                </span>
              </div>
            </Card>

            {/* Clients KPI Card (with donut visual) */}
            <Card className="p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <UserCheck className="size-5" />
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats Triad */}
                  <div className="flex items-center gap-3 text-center">
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {clients.newThisMonth}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        New
                      </span>
                    </div>
                    <div>
                      <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                        {clients.activeClients}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Active
                      </span>
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-500 dark:text-slate-400">
                        {clients.expiredClients}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Expired
                      </span>
                    </div>
                  </div>

                  {/* SVG Mini Donut Ring */}
                  <div className="relative size-10 shrink-0">
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
                        className="stroke-cyan-500 transition-all duration-500"
                        strokeWidth="3.5"
                        strokeDasharray={calculateCircleDash(
                          clients.activeClients,
                          clients.totalClients || 1,
                          97.4
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Clients
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {clients.totalClients} Total
                </span>
              </div>
            </Card>

            {/* Callback KPI Card */}
            <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Bell className="size-5" />
                </div>

                <div className="flex items-center gap-3 text-center">
                  <div>
                    <div className="text-lg font-black text-rose-500 dark:text-rose-400">
                      {callbacks.pendingCallbacks}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Pending
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {callbacks.todayCallbacks}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Today
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {callbacks.upcomingCallbacks}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Upcoming
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Callback
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {callbacks.totalCallbacks} Scheduled
                </span>
              </div>
            </Card>

            {/* Followups KPI Card (with donut visual) */}
            <Card className="p-5 flex flex-col justify-between hover:border-[#4F6DF5]/40 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20">
                  <Calendar className="size-5" />
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats Triad */}
                  <div className="flex items-center gap-3 text-center">
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {followups.newFollowups}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        New
                      </span>
                    </div>
                    <div>
                      <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {followups.pendingFollowups}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Pending
                      </span>
                    </div>
                    <div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {followups.updatedFollowups}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Updated
                      </span>
                    </div>
                  </div>

                  {/* SVG Mini Donut Ring */}
                  <div className="relative size-10 shrink-0">
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
                        className="stroke-[#4F6DF5] transition-all duration-500"
                        strokeWidth="3.5"
                        strokeDasharray={calculateCircleDash(
                          followups.pendingFollowups,
                          followups.totalFollowups || 1,
                          97.4
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Followups
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {followups.totalFollowups} Total
                </span>
              </div>
            </Card>
          </div>

          {/* 3. Today Activity Strip */}
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Activity className="size-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Today Activity
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daily database operational volume
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full sm:w-auto text-center divide-x-0 sm:divide-x divide-slate-200 dark:divide-white/[0.06]">
              <div className="sm:pl-4">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {todayActivity.allotedToday}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Alloted
                </span>
              </div>
              <div className="sm:pl-4">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {todayActivity.transferredToday}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Transferred
                </span>
              </div>
              <div className="sm:pl-4">
                <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                  {todayActivity.fetchedToday}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Fetched
                </span>
              </div>
              <div className="sm:pl-4">
                <div className="text-xl font-black text-[#4F6DF5] dark:text-[#60A5FA]">
                  {todayActivity.updatedToday}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Updated
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Section (5 of 12 cols on XL): Tabs & Lead Status Strip */}
        {/* Right Section (5 of 12 cols on XL): Tabs & Lead Status Strip */}
        <div className="xl:col-span-5 space-y-6">
          {/* Interactive Reminders / Payments / Events Tab Panel */}
          <Card className="overflow-hidden flex flex-col h-[340px]">
            {/* Tab Navigation Bar */}
            <div className="p-2 sm:p-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1 overflow-x-auto">
              <div className="flex items-center gap-1 min-w-0">
                <button
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
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === "reminders"
                        ? "bg-white/20 text-white"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {totalTabReminders}
                  </span>
                </button>

                <button
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
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === "payments"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {totalTabPayments}
                  </span>
                </button>

                <button
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
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === "events"
                        ? "bg-white/20 text-white"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {totalTabEvents}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setActiveTab("all")}
                className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                  activeTab === "all"
                    ? "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title={`View All (${allTabsCount})`}
              >
                <Layers className="size-3.5" />
              </button>
            </div>

            {/* Tab Feed Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-150 dark:divide-white/[0.05]">
              {/* TAB 1: Lead Reminders */}
              {(activeTab === "reminders" || activeTab === "all") && (
                <>
                  {remindersTab.leadReminders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <Bell className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-medium">No pending lead reminders.</p>
                      <span className="text-[11px] text-slate-500">
                        Callbacks scheduled by telecallers will appear here.
                      </span>
                    </div>
                  ) : (
                    remindersTab.leadReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#4F6DF5] dark:group-hover:text-[#60A5FA]">
                              {reminder.name}
                            </span>
                            {reminder.leadResponse && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20">
                                {reminder.leadResponse}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {reminder.mobile}
                            </span>
                            {reminder.assignedToName && (
                              <span>• {reminder.assignedToName}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">
                            {new Date(reminder.callbackDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(reminder.callbackDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 2: Payments */}
              {activeTab === "payments" && (
                <>
                  {remindersTab.recentPayments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <CreditCard className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-medium">No recent payments recorded.</p>
                      <span className="text-[11px] text-slate-500">
                        Approved transactions will appear here in real-time.
                      </span>
                    </div>
                  ) : (
                    remindersTab.recentPayments.map((p) => (
                      <div
                        key={p.id}
                        className="py-2.5 flex items-center justify-between gap-3 group px-2 rounded-xl"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {p.leadName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {p.modeName || "Standard Mode"} {p.ownerName ? `• ${p.ownerName}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            +₹{formatINR(p.amount)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(p.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: Events */}
              {activeTab === "events" && (
                <>
                  {remindersTab.recentEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <History className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-medium">No activity logged today.</p>
                    </div>
                  ) : (
                    remindersTab.recentEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="py-2.5 flex items-start justify-between gap-3 px-2 rounded-xl text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {evt.action.replace(/_/g, " ")}
                          </span>
                          {evt.details && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {evt.details}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(evt.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Lead Status Strip (5 Segments with direct quick filters) */}
          <Card className="p-4 sm:p-5">
            <div className="grid grid-cols-5 gap-2 text-center divide-x divide-slate-200 dark:divide-white/[0.06]">
              {/* Unread */}
              <Link
                href="/admin/leads?status=UNREAD"
                className="group flex flex-col items-center hover:opacity-80 transition-opacity"
              >
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#4F6DF5] transition-colors">
                  {leadStatusStrip.unreadCount}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Unread
                </span>
              </Link>

              {/* Read */}
              <Link
                href="/admin/leads?status=READ"
                className="group flex flex-col items-center pl-1 hover:opacity-80 transition-opacity"
              >
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#4F6DF5] transition-colors">
                  {leadStatusStrip.readCount}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Read
                </span>
              </Link>

              {/* Followup */}
              <Link
                href="/admin/leads?status=FOLLOW_UP"
                className="group flex flex-col items-center pl-1 hover:opacity-80 transition-opacity"
              >
                <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 group-hover:text-amber-500 transition-colors">
                  {leadStatusStrip.followupCount}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Followup
                </span>
              </Link>

              {/* Client */}
              <Link
                href="/admin/leads?status=CLIENT"
                className="group flex flex-col items-center pl-1 hover:opacity-80 transition-opacity"
              >
                <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">
                  {leadStatusStrip.clientCount}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Client
                </span>
              </Link>

              {/* Total Leads */}
              <Link
                href="/admin/leads"
                className="group flex flex-col items-center pl-1 hover:opacity-80 transition-opacity"
              >
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#4F6DF5] transition-colors">
                  {leadStatusStrip.totalLeadsCount}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total
                </span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* STEP 2: 2-Column Reports Row (New Followup Report & Lead Fetch Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: New Followup Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Card Header matching Admin Dash1.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  New Followup
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={followupEmployeeFilter}
                  onChange={(e) => setFollowupEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Employee (All)</option>
                  {charts.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <select
                  value={followupTeamFilter}
                  onChange={(e) => setFollowupTeamFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Team Wise</option>
                  {charts.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </div>
            </div>

            {/* Followup Chart Body */}
            <div className="relative pt-6 pb-2 h-64 flex flex-col justify-end">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                <div className="w-full flex items-center">
                  <span className="w-6 text-right pr-2">{maxFollowupVal}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-6 text-right pr-2">{Math.round(maxFollowupVal * 0.75)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-6 text-right pr-2">{Math.round(maxFollowupVal * 0.5)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-6 text-right pr-2">{Math.round(maxFollowupVal * 0.25)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-6 text-right pr-2">0</span>
                  <div className="flex-1 border-b border-slate-200 dark:border-white/[0.1]" />
                </div>
              </div>

              {/* Bars Row */}
              {filteredFollowupPoints.length === 0 ? (
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-xs font-semibold">No follow-up activity for selected filter.</p>
                  <span className="text-[11px] text-slate-500">
                    Switch Employee or Team to view registered follow-ups.
                  </span>
                </div>
              ) : (
                <div className="relative z-10 pl-8 pr-2 h-full flex items-end justify-around gap-2 pb-8">
                  {filteredFollowupPoints.map((pt) => {
                    const heightPercent = Math.min(100, Math.max(8, (pt.count / maxFollowupVal) * 100));
                    const isHovered = hoveredFollowupKey === pt.key;

                    return (
                      <div
                        key={pt.key}
                        onMouseEnter={() => setHoveredFollowupKey(pt.key)}
                        onMouseLeave={() => setHoveredFollowupKey(null)}
                        className="group relative flex flex-col items-center flex-1 max-w-[48px] h-full justify-end cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-10 z-30 px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                            {pt.label}: {pt.count} Followup{pt.count === 1 ? "" : "s"}
                          </div>
                        )}

                        {/* Bar */}
                        <div
                          className="w-full rounded-t-md bg-[#4F6DF5] hover:bg-[#3d5bd9] dark:hover:bg-[#60A5FA] transition-all duration-300 shadow-sm"
                          style={{ height: `${heightPercent}%` }}
                        />

                        {/* X-Axis Date Label */}
                        <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[50px] text-center">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Real-time follow-up chronology</span>
            <span className="font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
              {filteredFollowupPoints.reduce((acc, curr) => acc + curr.count, 0)} total logged
            </span>
          </div>
        </Card>

        {/* CARD 2: Lead Fetch Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Card Header matching Admin Dash1.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Lead Fetch
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={fetchEmployeeFilter}
                  onChange={(e) => setFetchEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Employee (All)</option>
                  {charts.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <select
                  value={fetchTeamFilter}
                  onChange={(e) => setFetchTeamFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Team Wise</option>
                  {charts.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </div>
            </div>

            {/* Fetch Chart Body */}
            <div className="relative pt-6 pb-2 h-64 flex flex-col justify-end">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                <div className="w-full flex items-center">
                  <span className="w-7 text-right pr-2">{maxFetchVal}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-7 text-right pr-2">{Math.round(maxFetchVal * 0.75)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-7 text-right pr-2">{Math.round(maxFetchVal * 0.5)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-7 text-right pr-2">{Math.round(maxFetchVal * 0.25)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-7 text-right pr-2">0</span>
                  <div className="flex-1 border-b border-slate-200 dark:border-white/[0.1]" />
                </div>
              </div>

              {/* Grouped Bars Row */}
              <div className="relative z-10 pl-9 pr-2 h-full flex items-end justify-around gap-1 pb-8 overflow-x-auto">
                {filteredFetchPoints.map((pt) => {
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
                      className="group relative flex flex-col items-center flex-1 min-w-[28px] max-w-[42px] h-full justify-end cursor-pointer"
                    >
                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-12 z-30 px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                          <p className="underline">{pt.source}</p>
                          <p className="text-[#4F6DF5] dark:text-[#60A5FA]">Limit: {pt.fetchLimit}</p>
                          <p className="text-cyan-400 dark:text-cyan-600">
                            Today: {pt.todayFetched} | Total: {pt.totalFetched}
                          </p>
                        </div>
                      )}

                      {/* Clustered Pair */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        {/* Bar 1: Fetch Limit */}
                        <div
                          className="w-1/2 rounded-t-xs bg-[#4F6DF5] hover:brightness-110 transition-all duration-300"
                          style={{ height: `${limitHeight}%` }}
                        />
                        {/* Bar 2: Fetched Count */}
                        <div
                          className="w-1/2 rounded-t-xs bg-cyan-500 dark:bg-cyan-400 hover:brightness-110 transition-all duration-300"
                          style={{ height: `${fetchedHeight}%` }}
                        />
                      </div>

                      {/* X-Axis Source Label */}
                      <span className="absolute -bottom-6 text-[9px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[40px] text-center">
                        {pt.source}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend matching Admin Dash1.jpg */}
            <div className="pt-2 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-[#4F6DF5]" />
                <span className="text-[11px] font-medium">Fetch Limit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-cyan-500 dark:bg-cyan-400" />
                <span className="text-[11px] font-medium">Today Fetched</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Prisma fetch limits & quotas</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">
              {charts.fetchRecords.length} fetch requests logged
            </span>
          </div>
        </Card>
      </div>

      {/* STEP 3: 2-Column Reports Row (Payment Daily Report & Calling Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Payment Daily Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Card Header matching Admin Dash2.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Payment
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Daily Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={paymentEmployeeFilter}
                  onChange={(e) => setPaymentEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Employee (All)</option>
                  {charts.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentTeamFilter}
                  onChange={(e) => setPaymentTeamFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Team Wise</option>
                  {charts.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </div>
            </div>

            {/* Payment Chart Body */}
            <div className="relative pt-6 pb-2 h-64 flex flex-col justify-end">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                <div className="w-full flex items-center">
                  <span className="w-12 text-right pr-2">₹{formatINR(maxPaymentVal)}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-12 text-right pr-2">₹{formatINR(Math.round(maxPaymentVal * 0.75))}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-12 text-right pr-2">₹{formatINR(Math.round(maxPaymentVal * 0.5))}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-12 text-right pr-2">₹{formatINR(Math.round(maxPaymentVal * 0.25))}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                </div>
                <div className="w-full flex items-center">
                  <span className="w-12 text-right pr-2">₹0</span>
                  <div className="flex-1 border-b border-slate-200 dark:border-white/[0.1]" />
                </div>
              </div>

              {/* Bars Row */}
              {filteredPaymentPoints.length === 0 ? (
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-xs font-semibold">No payment collections for selected filter.</p>
                  <span className="text-[11px] text-slate-500">
                    Approved payment transactions will plot automatically.
                  </span>
                </div>
              ) : (
                <div className="relative z-10 pl-14 pr-2 h-full flex items-end justify-around gap-2 pb-8">
                  {filteredPaymentPoints.map((pt) => {
                    const heightPercent = Math.min(100, Math.max(8, (pt.amount / maxPaymentVal) * 100));
                    const isHovered = hoveredPaymentKey === pt.key;

                    return (
                      <div
                        key={pt.key}
                        onMouseEnter={() => setHoveredPaymentKey(pt.key)}
                        onMouseLeave={() => setHoveredPaymentKey(null)}
                        className="group relative flex flex-col items-center flex-1 max-w-[44px] h-full justify-end cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-10 z-30 px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                            {pt.label}: ₹{formatINR(pt.amount)}
                          </div>
                        )}

                        {/* Bar */}
                        <div
                          className="w-full rounded-t-md bg-[#4F6DF5] hover:bg-[#3d5bd9] dark:hover:bg-[#60A5FA] transition-all duration-300 shadow-sm"
                          style={{ height: `${heightPercent}%` }}
                        />

                        {/* X-Axis Date Label */}
                        <span className="absolute -bottom-6 text-[9px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[45px] text-center">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Summary Bar matching Admin Dash2.jpg */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20 text-[#4F6DF5] dark:text-[#60A5FA] text-xs font-semibold text-center">
              Target : Rs.{formatINR(target.targetAmount)}/-
            </div>
            <div className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold text-center">
              {target.achievementPercent}%
            </div>
            <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
              Achieved : Rs.{formatINR(target.achievedAmount)}/-
            </div>
          </div>
        </Card>

        {/* CARD 2: Calling Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Card Header matching Admin Dash2.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Calling
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Report</span>
              </div>

              {/* Caller Filter */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={callingEmployeeFilter}
                  onChange={(e) => setCallingEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5] min-w-[130px]"
                >
                  <option value="ALL">All Callers / Admins</option>
                  {charts.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </div>
            </div>

            {/* Calling Chart Body */}
            <div className="relative pt-6 pb-2 h-64 flex flex-col justify-end">
              {/* Dual Y-Axes & Horizontal Grid Lines */}
              <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] font-mono">
                {/* 100% */}
                <div className="w-full flex items-center justify-between">
                  <span className="w-5 text-right pr-1 text-slate-400">{maxCallingHours}</span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                  <span className="w-5 text-left pl-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {maxConnectedCalls}
                  </span>
                </div>
                {/* 75% */}
                <div className="w-full flex items-center justify-between">
                  <span className="w-5 text-right pr-1 text-slate-400">
                    {Math.round(maxCallingHours * 0.75)}
                  </span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                  <span className="w-5 text-left pl-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {Math.round(maxConnectedCalls * 0.75)}
                  </span>
                </div>
                {/* 50% */}
                <div className="w-full flex items-center justify-between">
                  <span className="w-5 text-right pr-1 text-slate-400">
                    {Math.round(maxCallingHours * 0.5)}
                  </span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                  <span className="w-5 text-left pl-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {Math.round(maxConnectedCalls * 0.5)}
                  </span>
                </div>
                {/* 25% */}
                <div className="w-full flex items-center justify-between">
                  <span className="w-5 text-right pr-1 text-slate-400">
                    {Math.round(maxCallingHours * 0.25)}
                  </span>
                  <div className="flex-1 border-b border-slate-150 dark:border-white/[0.05]" />
                  <span className="w-5 text-left pl-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {Math.round(maxConnectedCalls * 0.25)}
                  </span>
                </div>
                {/* 0% Baseline */}
                <div className="w-full flex items-center justify-between">
                  <span className="w-5 text-right pr-1 text-slate-400">0</span>
                  <div className="flex-1 border-b border-slate-200 dark:border-white/[0.1]" />
                  <span className="w-5 text-left pl-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                    0
                  </span>
                </div>
              </div>

              {/* Calling Data Bars / Points */}
              {filteredCallingPoints.length === 0 ? (
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-xs font-semibold">No call logs recorded yet.</p>
                  <span className="text-[11px] text-slate-500">
                    Telecaller activities will plot here automatically.
                  </span>
                </div>
              ) : (
                <div className="relative z-10 pl-7 pr-7 h-full flex items-end justify-around gap-2 pb-8">
                  {filteredCallingPoints.map((pt) => {
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
                        className="group relative flex flex-col items-center flex-1 max-w-[48px] h-full justify-end cursor-pointer"
                      >
                        {isHovered && (
                          <div className="absolute -top-12 z-30 px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                            <p className="underline">{pt.label}</p>
                            <p className="text-slate-300 dark:text-slate-700">
                              Hours: {pt.hours.toFixed(1)}h
                            </p>
                            <p className="text-cyan-400 dark:text-cyan-600">
                              Connected: {pt.connectedCalls}
                            </p>
                          </div>
                        )}

                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {/* Calling Hours Bar */}
                          <div
                            className="w-1/2 rounded-t-xs bg-slate-400 dark:bg-slate-500 hover:brightness-110 transition-all duration-300"
                            style={{ height: `${hoursHeight}%` }}
                          />
                          {/* Connected Calls Bar */}
                          <div
                            className="w-1/2 rounded-t-xs bg-cyan-500 dark:bg-cyan-400 hover:brightness-110 transition-all duration-300"
                            style={{ height: `${callsHeight}%` }}
                          />
                        </div>

                        <span className="absolute -bottom-6 text-[9px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[45px] text-center">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Legend */}
            <div className="pt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Calling Hours</span>
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-slate-400 dark:bg-slate-500" />
                  <span>Duration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-cyan-500 dark:bg-cyan-400" />
                  <span>Connected</span>
                </div>
              </div>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">Connected Calls</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Telecalling system registry</span>
            <span className="font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
              {charts.callingRecords.length} total call logs
            </span>
          </div>
        </Card>
      </div>

      {/* STEP 4: Interactive Lead Report Section with Tab Switching (Admin Dash2/Dash3) */}
      <div className="space-y-4">
        {/* Reports Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveReportTab("leadReport")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "leadReport"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Lead Report</span>
          </button>

          <button
            onClick={() => setActiveReportTab("leadRecord")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "leadRecord"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Lead Record</span>
          </button>

          <button
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
            onClick={() => setActiveReportTab("leadBalance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "leadBalance"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <Scale className="size-3.5" />
            <span>Lead Balance Report</span>
          </button>

          <button
            onClick={() => setActiveReportTab("monthlySales")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeReportTab === "monthlySales"
                ? "bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/30"
                : "bg-white/70 dark:bg-[#0c1322]/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]"
            }`}
          >
            <DollarSign className="size-3.5" />
            <span>Monthly Sales Report</span>
          </button>
        </div>

        {/* TAB 1: Lead Report (Horizontal Bar Chart + Left Filter Panel) */}
        {activeReportTab === "leadReport" && (
          <Card className="p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Filter Panel (3 of 12 cols) */}
              <div className="lg:col-span-3 space-y-4 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Filters
                  </span>
                  {isReportFilterActive && (
                    <button
                      onClick={handleResetReportFilters}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <RotateCcw className="size-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Source Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Source
                  </label>
                  <select
                    value={reportSourceFilter}
                    onChange={(e) => setReportSourceFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                  >
                    <option value="ALL">All Source</option>
                    {charts.knownSources.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range: Last Updated Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Last Updated Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      placeholder="From"
                      className="w-full text-xs px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                    />
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      placeholder="To"
                      className="w-full text-xs px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                    />
                  </div>
                </div>

                {/* Lead Owner / Employee */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Lead Owner
                  </label>
                  <select
                    value={reportEmployeeFilter}
                    onChange={(e) => setReportEmployeeFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                  >
                    <option value="ALL">All Employee</option>
                    {charts.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Team
                  </label>
                  <select
                    value={reportTeamFilter}
                    onChange={(e) => setReportTeamFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                  >
                    <option value="ALL">All Teams</option>
                    {charts.teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Horizontal Bar Chart Panel (9 of 12 cols) */}
              <div className="lg:col-span-9 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Total Leads: <span className="text-[#4F6DF5] dark:text-[#60A5FA]">{filteredReportLeads.length}</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Live Disposition Breakdown
                  </span>
                </div>

                {/* Horizontal Bars Stack */}
                <div className="space-y-1.5 pt-1">
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
                        {/* Left Label */}
                        <div className="w-28 sm:w-36 text-right pr-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate shrink-0">
                          {item.label}
                        </div>

                        {/* Bar Track & Fill */}
                        <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-r-md overflow-hidden relative">
                          <div
                            className="h-full bg-[#4F6DF5] group-hover:bg-[#60A5FA] rounded-r-md transition-all duration-500 shadow-sm"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>

                        {/* Right Count Label */}
                        <div className="w-10 text-left pl-2 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          {item.count}
                        </div>

                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute left-40 z-30 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in">
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

                {/* Scale Axis Line across bottom matching screenshot */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-150 dark:border-white/[0.05] pl-28 sm:pl-36 pr-10">
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

        {/* TAB 2: Lead Record */}
        {activeReportTab === "leadRecord" && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Record Registry</h3>
                <p className="text-[11px] text-slate-500">Real database records matching filter parameters</p>
              </div>
              <span className="text-xs font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
                {filteredReportLeads.length} leads
              </span>
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
                    <th className="pb-2 font-semibold">Assigned To</th>
                    <th className="pb-2 font-semibold text-right">Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                  {filteredReportLeads.slice(0, 10).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{l.name}</td>
                      <td className="py-2.5 font-mono text-slate-500">{l.mobile}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">{l.leadSource || "DIRECT"}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4F6DF5]/10 text-[#4F6DF5] dark:text-[#60A5FA] border border-[#4F6DF5]/20">
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {l.leadResponse || "-"}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">{l.allotToName || "Unassigned"}</td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400 text-right">
                        {new Date(l.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: Performance Report */}
        {activeReportTab === "performance" && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Performance Matrix</h3>
                <p className="text-[11px] text-slate-500">Activity and conversion metrics per operator</p>
              </div>
              <span className="text-xs font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
                {leadReport.performance.length} active staff
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                    <th className="pb-2 font-semibold">Employee</th>
                    <th className="pb-2 font-semibold">Team</th>
                    <th className="pb-2 font-semibold text-center">Assigned Leads</th>
                    <th className="pb-2 font-semibold text-center">Followups</th>
                    <th className="pb-2 font-semibold text-center">Fetches</th>
                    <th className="pb-2 font-semibold text-right">Approved Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                  {leadReport.performance.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="py-2.5 text-slate-500">{p.teamName || "General Unit"}</td>
                      <td className="py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {p.assignedLeads}
                      </td>
                      <td className="py-2.5 text-center text-amber-600 dark:text-amber-400 font-semibold">
                        {p.followups}
                      </td>
                      <td className="py-2.5 text-center text-cyan-600 dark:text-cyan-400 font-semibold">
                        {p.fetches}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{formatINR(p.salesAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: Lead Balance Report */}
        {activeReportTab === "leadBalance" && (
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Balance & Quota Report</h3>
              <p className="text-[11px] text-slate-500">Allotment reserves, unassigned pools, and fetch quotas</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Leads</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {leadReport.balance.totalLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                  Unallotted Pool
                </span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {leadReport.balance.unallottedLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20">
                <span className="text-[10px] font-bold uppercase text-[#4F6DF5] dark:text-[#60A5FA]">
                  Allotted Staff Leads
                </span>
                <div className="text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] mt-1">
                  {leadReport.balance.allottedLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-300">
                  Available Fetch Quota
                </span>
                <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                  {leadReport.balance.totalAvailableFetchQuota}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 5: Monthly Sales Report */}
        {activeReportTab === "monthlySales" && (
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Sales & Revenue Report</h3>
                <p className="text-[11px] text-slate-500">Live approved payments against assigned targets</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {target.achievementPercent}% of Target
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20">
                <span className="text-[10px] font-bold uppercase text-[#4F6DF5] dark:text-[#60A5FA]">Target</span>
                <div className="text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] mt-1">
                  ₹{formatINR(target.targetAmount)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                  Approved Collection
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{formatINR(target.achievedAmount)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Transactions</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {payment.totalApprovedCount}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* STEP 5: Top Performers Leaderboards Grid (Dynamic from EMPLOYEE_GRAPH_CONFIGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {leaderboards.configuredCards && leaderboards.configuredCards.length > 0 ? (
          leaderboards.configuredCards.map((card) => {
            const chartItems: LeaderboardCardItem[] = card.items.map((it) => ({
              id: it.id,
              displayName: it.name,
              subTitle: it.profileName || `${card.profile} Performer`,
              targetAmount: it.targetAmount,
              achievedAmount: it.achievedAmount,
              achievementPercent: it.achievementPercent,
              leadsCount: it.leadsHandled,
              metricValue: it.metricValue,
            }));

            return (
              <LeaderboardCard
                key={card.id}
                title={card.title}
                items={chartItems}
                formatINR={formatINR}
              />
            );
          })
        ) : (
          <>
            <LeaderboardCard title="Top Best TL" items={tlItems} formatINR={formatINR} />
            <LeaderboardCard title="Top Best SBA" items={sbaItems} formatINR={formatINR} />
            <LeaderboardCard title="Top Best BAT" items={batItems} formatINR={formatINR} />
            <LeaderboardCard title="Top Best BA" items={baItems} formatINR={formatINR} />
            <LeaderboardCard title="Top Team Best AFM" items={afmItems} formatINR={formatINR} />
          </>
        )}
      </div>
    </div>
  );
}

interface LeaderboardCardItem {
  id: string;
  displayName: string;
  subTitle?: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsCount: number;
  metricValue: number;
}

function LeaderboardCard({
  title,
  items,
  formatINR,
}: {
  title: string;
  items: LeaderboardCardItem[];
  formatINR: (val: number) => string;
}) {
  const rawMax = Math.max(...items.map((i) => i.metricValue), 100000);
  const niceMax = Math.max(100000, Math.ceil(rawMax / 50000) * 50000);
  const yTicks = [
    niceMax,
    Math.round(niceMax * 0.8),
    Math.round(niceMax * 0.6),
    Math.round(niceMax * 0.4),
    Math.round(niceMax * 0.2),
    0,
  ];

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      {/* Card Header matching Admin4.jpg & Admin5.jpg */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <Link
          href="/admin/settings/configuration/employee-graphs"
          title="Configure Leaderboard Graphs"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <Menu className="size-4" />
        </Link>
      </div>

      {/* Chart Body */}
      {items.length === 0 ? (
        <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <p className="text-xs font-semibold">No performance records in this cohort yet.</p>
          <span className="text-[11px] text-slate-500 mt-1">
            Metrics will appear automatically as operators handle leads and record collections.
          </span>
        </div>
      ) : (
        <div className="relative pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-end">
          {/* Background Grid Lines & Y-Axis Labels */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
            {yTicks.map((val, idx) => (
              <div key={idx} className="w-full flex items-center">
                <span className="w-12 text-right pr-2 shrink-0">{val}</span>
                <div
                  className={`flex-1 border-b ${
                    val === 0
                      ? "border-slate-200 dark:border-white/[0.1]"
                      : "border-slate-150 dark:border-white/[0.05]"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Vertical Bars Layer */}
          <div className="relative z-10 pl-14 pr-4 h-full flex items-end justify-around gap-4 pb-8">
            {items.map((item) => {
              const heightPercent = Math.min(
                95,
                Math.max(item.metricValue > 0 ? (item.metricValue / niceMax) * 95 : 4, 4)
              );
              const barWidthClass =
                items.length === 1
                  ? "w-28 sm:w-36 max-w-[160px]"
                  : items.length === 2
                  ? "w-20 sm:w-28 max-w-[120px]"
                  : "w-14 sm:w-20 max-w-[90px]";

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col items-center flex-1 h-full justify-end cursor-pointer"
                >
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 min-w-[160px] p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#080d19]/95 text-white border border-white/10 shadow-2xl backdrop-blur-md text-[11px] space-y-1">
                    <div className="font-bold text-xs text-[#60A5FA]">{item.displayName}</div>
                    {item.subTitle && (
                      <div className="text-[10px] text-slate-400">{item.subTitle}</div>
                    )}
                    <div className="pt-1 border-t border-white/10 flex justify-between">
                      <span className="text-slate-400">Achieved:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{formatINR(item.achievedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-mono text-slate-200">
                        ₹{formatINR(item.targetAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Achievement:</span>
                      <span className="font-bold text-[#60A5FA]">
                        {item.achievementPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Leads:</span>
                      <span className="font-mono text-slate-200">{item.leadsCount}</span>
                    </div>
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className={`${barWidthClass} rounded-t-md bg-gradient-to-t from-[#4F6DF5] to-[#60A5FA] hover:opacity-90 transition-all duration-300 shadow-sm`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute inset-x-0 bottom-0 pl-14 pr-4 flex items-center justify-around gap-2 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
            {items.map((item) => (
              <span
                key={item.id}
                className="text-center truncate flex-1 px-1"
                title={`${item.displayName} - ${item.achievementPercent}%`}
              >
                {item.displayName} - {item.achievementPercent}%
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
