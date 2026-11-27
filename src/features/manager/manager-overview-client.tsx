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
  Activity,
  ArrowRight,
  UserCheck,
  FileText,
  Sparkles,
  Users,
  Menu,
  BarChart3,
  Award,
  Scale,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import type { ManagerOverviewStep1Data } from "./types";

interface ManagerOverviewClientProps {
  initialData: ManagerOverviewStep1Data;
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

export function ManagerOverviewClient({ initialData }: ManagerOverviewClientProps) {
  const router = useRouter();
  const [data] = useState<ManagerOverviewStep1Data>(initialData);
  const [activeTab, setActiveTab] = useState<"all" | "reminders" | "payments" | "events">("reminders");
  const [isPending, startTransition] = useTransition();

  // Step 2 Filter States
  const [followupEmployeeFilter, setFollowupEmployeeFilter] = useState<string>("ALL");
  const [followupTeamFilter, setFollowupTeamFilter] = useState<string>("ALL");

  const [fetchEmployeeFilter, setFetchEmployeeFilter] = useState<string>("ALL");
  const [fetchTeamFilter, setFetchTeamFilter] = useState<string>("ALL");

  // Hover states for tooltips
  const [hoveredFollowupKey, setHoveredFollowupKey] = useState<string | null>(null);
  const [hoveredFetchSource, setHoveredFetchSource] = useState<string | null>(null);

  // Step 3 Filter States
  const [paymentEmployeeFilter, setPaymentEmployeeFilter] = useState<string>("ALL");
  const [paymentTeamFilter, setPaymentTeamFilter] = useState<string>("ALL");
  const [hoveredPaymentKey, setHoveredPaymentKey] = useState<string | null>(null);

  const [callingEmployeeFilter, setCallingEmployeeFilter] = useState<string>("ALL");
  const [hoveredCallingKey, setHoveredCallingKey] = useState<string | null>(null);

  // Step 3 Reports Tab State
  const [activeReportTab, setActiveReportTab] = useState<
    "leadReport" | "leadRecord" | "performance" | "leadBalance" | "monthlySales"
  >("leadReport");

  const [reportSourceFilter, setReportSourceFilter] = useState<string>("ALL");
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>("ALL");
  const [reportTeamFilter, setReportTeamFilter] = useState<string>("ALL");
  const [hoveredLeadBarLabel, setHoveredLeadBarLabel] = useState<string | null>(null);

  const isReportFilterActive =
    reportSourceFilter !== "ALL" ||
    reportStartDate !== "" ||
    reportEndDate !== "" ||
    reportEmployeeFilter !== "ALL" ||
    reportTeamFilter !== "ALL";

  const handleResetReportFilters = () => {
    setReportSourceFilter("ALL");
    setReportStartDate("");
    setReportEndDate("");
    setReportEmployeeFilter("ALL");
    setReportTeamFilter("ALL");
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const {
    managerName,
    teamNames,
    totalTeamsLed,
    totalSubordinates,
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
  const allTabsCount = totalTabReminders + totalTabPayments + totalTabEvents;

  // Step 2: Filtered Followup Points
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

  const maxFollowupVal = useMemo(() => {
    if (filteredFollowupPoints.length === 0) return 6;
    const max = Math.max(...filteredFollowupPoints.map((p) => p.count));
    return max <= 4 ? 6 : max % 2 === 0 ? max + 2 : max + 3;
  }, [filteredFollowupPoints]);

  // Step 2: Filtered Fetch Points
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
        ? charts.knownSources.slice(0, 11)
        : [
            "Fresh Lead",
            "SEO",
            "Premium Lead",
            "HNI Lead",
            "Web Lead",
            "PMS",
            "Emphasis",
            "Live",
            "Intrested",
            "WEB",
            "Call Back",
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

  const maxFetchVal = useMemo(() => {
    if (filteredFetchPoints.length === 0) return 60;
    const max = Math.max(
      ...filteredFetchPoints.map((p) => Math.max(p.fetchLimit, p.todayFetched, p.totalFetched))
    );
    return max <= 20 ? 40 : Math.ceil((max * 1.25) / 10) * 10;
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
    return max <= 50000 ? 50000 : Math.ceil((max * 1.25) / 10000) * 10000;
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

  // Step 3: Compute Filtered Leads for Lead Report Section
  const filteredReportLeads = useMemo(() => {
    return leadReport.allLeads.filter((lead) => {
      if (reportSourceFilter !== "ALL") {
        if (!lead.leadSource || lead.leadSource.toLowerCase() !== reportSourceFilter.toLowerCase()) {
          return false;
        }
      }
      if (reportEmployeeFilter !== "ALL" && lead.allotToId !== reportEmployeeFilter) {
        return false;
      }
      if (reportTeamFilter !== "ALL" && lead.teamId !== reportTeamFilter) {
        return false;
      }
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

  // Step 3: Compute Horizontal Bar Chart Breakdown Data
  const horizontalBarData = useMemo(() => {
    const targetCategories = [
      "Unread",
      "Call Back",
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
      "Unalloted",
    ];

    const countMap = new Map<string, number>();
    for (const cat of targetCategories) {
      countMap.set(cat, 0);
    }

    for (const lead of filteredReportLeads) {
      const resp = (lead.leadResponse || "").trim().toLowerCase();
      const st = (lead.status || "").trim().toLowerCase();

      if (resp === "callback" || resp === "call back") countMap.set("Call Back", (countMap.get("Call Back") || 0) + 1);
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
      else if (resp === "interested" || resp === "intrested")
        countMap.set("Interested", (countMap.get("Interested") || 0) + 1);
      else if (resp === "paid") countMap.set("Paid", (countMap.get("Paid") || 0) + 1);
      else if (st === "unread") countMap.set("Unread", (countMap.get("Unread") || 0) + 1);
      else if (st === "follow_up" || st === "followup")
        countMap.set("Followup", (countMap.get("Followup") || 0) + 1);
      else if (st === "trial") countMap.set("Trial", (countMap.get("Trial") || 0) + 1);
      else if (st === "client" || st === "clients")
        countMap.set("Client", (countMap.get("Client") || 0) + 1);
      else if (st === "disposed") countMap.set("Disposed", (countMap.get("Disposed") || 0) + 1);
      else if (!lead.allotToId) countMap.set("Unalloted", (countMap.get("Unalloted") || 0) + 1);
      else {
        if (st === "read") countMap.set("Unread", (countMap.get("Unread") || 0) + 1);
        else countMap.set("Unalloted", (countMap.get("Unalloted") || 0) + 1);
      }
    }

    return targetCategories.map((cat) => ({
      label: cat,
      count: countMap.get(cat) || 0,
    }));
  }, [filteredReportLeads]);

  const maxHorizontalCount = useMemo(() => {
    if (horizontalBarData.length === 0) return 800;
    const max = Math.max(...horizontalBarData.map((d) => d.count));
    if (max <= 50) return 100;
    if (max <= 200) return 200;
    if (max <= 400) return 400;
    if (max <= 600) return 600;
    if (max <= 800) return 800;
    return Math.ceil((max * 1.2) / 200) * 200;
  }, [horizontalBarData]);

  // Step 4: Leaderboard Items strictly scoped to manager's team
  const sbaItems: ManagerLeaderboardCardItem[] = useMemo(() => {
    return leaderboards.topBestSBA.map((it) => ({
      id: it.id,
      displayName: it.name,
      subTitle: it.profileName || "Senior Business Analyst",
      targetAmount: it.targetAmount,
      achievedAmount: it.achievedAmount,
      achievementPercent: it.achievementPercent,
      leadsCount: it.leadsHandled,
      metricValue: it.metricValue,
    }));
  }, [leaderboards.topBestSBA]);

  const baItems: ManagerLeaderboardCardItem[] = useMemo(() => {
    return leaderboards.topBestBA.map((it) => ({
      id: it.id,
      displayName: it.name,
      subTitle: it.profileName || "Business Analyst",
      targetAmount: it.targetAmount,
      achievedAmount: it.achievedAmount,
      achievementPercent: it.achievementPercent,
      leadsCount: it.leadsHandled,
      metricValue: it.metricValue,
    }));
  }, [leaderboards.topBestBA]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full min-w-0">
      {/* Executive Welcome & Team Supervision Header */}
      <Card className="p-6 sm:p-7 relative overflow-hidden text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] shadow-sm min-w-0">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 rounded-full bg-[#4F6DF5]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 size-48 rounded-full bg-[#60A5FA]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="info">
                <Sparkles className="size-3.5 mr-1 inline" />
                Operations Command
              </Badge>
              {teamNames.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08]">
                  Teams: {teamNames.join(", ")}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              Welcome back, {managerName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Supervising {totalTeamsLed} {totalTeamsLed === 1 ? "team" : "teams"} and{" "}
              {totalSubordinates} direct reporting {totalSubordinates === 1 ? "employee" : "employees"} across active CRM operations.
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
              href="/manager/teams"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shrink-0"
            >
              <Layers className="size-3.5 text-blue-500" />
              <span>Teams</span>
            </Link>
            <Link
              href="/manager/employees"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shrink-0"
            >
              <Users className="size-3.5 text-indigo-500" />
              <span>Staff</span>
            </Link>
            <Link
              href="/manager/leads"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] hover:opacity-90 shadow-md shadow-[#4F6DF5]/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <span>Team Leads</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* STEP 1A: Target vs Achieved Milestone Card & Reminders Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-w-0">
        {/* Monthly Target Milestone Card (7 cols) */}
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
                  Team targets vs real-time approved collections
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
              aria-label="Monthly Target Progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={target.achievementPercent}
              className="h-3 w-full rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden p-0.5"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F6DF5] to-[#60A5FA] transition-all duration-700 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(target.achievedAmount > 0 ? 3 : 0, target.achievementPercent))}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Reminders & Notifications Tab Panel (5 cols) */}
        <Card className="lg:col-span-5 p-0 overflow-hidden flex flex-col h-[280px] sm:h-auto justify-between min-w-0">
          {/* Tab Navigation Header */}
          <div className="p-2 sm:p-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-0">
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
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                  }`}
                >
                  {totalTabEvents}
                </span>
              </button>
            </div>

            <button
              type="button"
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

          {/* Tab Content Feed */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-150 dark:divide-white/[0.05] max-h-[190px]">
            {/* TAB 1: Lead Reminders */}
            {(activeTab === "reminders" || activeTab === "all") && (
              <>
                {remindersTab.leadReminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <Bell className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No pending team reminders</p>
                    <span className="text-[11px] text-slate-500">
                      Callbacks scheduled by your agents will appear here.
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
                          {reminder.assignedToName && (
                            <span>• {reminder.assignedToName}</span>
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

            {/* TAB 2: Payments */}
            {activeTab === "payments" && (
              <>
                {remindersTab.recentPayments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <CreditCard className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No recent approved payments</p>
                    <span className="text-[11px] text-slate-500">
                      Approved collections from your team will appear here.
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
                          {p.modeName || "Standard Mode"} {p.ownerName ? `• ${p.ownerName}` : ""}
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

            {/* TAB 3: Events */}
            {activeTab === "events" && (
              <>
                {remindersTab.recentEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                    <History className="size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">No operational events logged</p>
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

      {/* STEP 1B: 4-Column Operational KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
        {/* Card 1: Payment (1 Days Ago vs Today) */}
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
                  ₹{formatINR(payment.yesterdayApprovedAmount)}
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
                  1 Days ago
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
              Team Collection
            </span>
            <Badge tone="ok" className="shrink-0">
              {payment.totalApprovedCount} approved
            </Badge>
          </div>
        </Card>

        {/* Card 2: Clients (New, Active, Expired) */}
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
            <span className="text-[11px] truncate">Team Callbacks</span>
            <Badge tone="warn" className="shrink-0">
              {callbacks.totalCallbacks} Total
            </Badge>
          </div>
        </Card>

        {/* Card 4: Followups (New, Pending, Updated) */}
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
            <span className="text-[11px] truncate">Team Followups</span>
            <Badge tone="info" className="shrink-0">
              {followups.totalFollowups} Total
            </Badge>
          </div>
        </Card>
      </div>

      {/* STEP 1C: Two Wide Snapshot Cards (Today Activity & Total Leads) */}
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
                Daily database volume across supervised staff
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
                  Status distribution across assigned team leads
                </p>
              </div>
            </div>
            <Link
              href="/manager/leads"
              className="text-xs font-semibold text-[#4F6DF5] dark:text-[#60A5FA] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center min-w-0">
            <Link
              href="/manager/leads?status=UNREAD"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-[#4F6DF5]/40 transition-all min-w-0 group"
            >
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#4F6DF5] truncate">
                {leadStatusStrip.unreadCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Unread
              </span>
            </Link>

            <Link
              href="/manager/leads?status=READ"
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] hover:border-[#4F6DF5]/40 transition-all min-w-0 group"
            >
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#4F6DF5] truncate">
                {leadStatusStrip.readCount}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block truncate">
                Read
              </span>
            </Link>

            <Link
              href="/manager/leads?status=FOLLOW_UP"
              className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all min-w-0 group"
            >
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 truncate">
                {leadStatusStrip.followupCount}
              </div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1 block truncate">
                Followup
              </span>
            </Link>

            <Link
              href="/manager/leads?status=CLIENT"
              className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all min-w-0 group"
            >
              <div className="text-lg sm:text-xl font-black text-cyan-600 dark:text-cyan-400 truncate">
                {leadStatusStrip.clientCount}
              </div>
              <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mt-1 block truncate">
                Client
              </span>
            </Link>

            <Link
              href="/manager/leads?status=ALL"
              className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#4F6DF5]/5 border border-[#4F6DF5]/20 hover:border-[#4F6DF5]/40 transition-all min-w-0 group"
            >
              <div className="text-lg sm:text-xl font-black text-[#4F6DF5] dark:text-[#60A5FA] truncate">
                {leadStatusStrip.totalLeadsCount}
              </div>
              <span className="text-xs font-medium text-[#4F6DF5] dark:text-[#60A5FA] mt-1 block truncate">
                Total
              </span>
            </Link>
          </div>
        </Card>
      </div>

      {/* STEP 2: 2-Column Reports Row (New Followup Report & Lead Fetch Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* CARD 1: New Followup Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            {/* Card Header matching managerOver2.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  New Followup
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={followupEmployeeFilter}
                  onChange={(e) => setFollowupEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Employee</option>
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
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              {/* Plot Area with Y-Axis Column and Bars */}
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxFollowupVal}</span>
                  <span>{Math.round(maxFollowupVal * 0.75)}</span>
                  <span>{Math.round(maxFollowupVal * 0.5)}</span>
                  <span>{Math.round(maxFollowupVal * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Bars Row */}
                  {filteredFollowupPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No follow-up activity for selected filter.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Switch Employee or Team to view registered follow-ups.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                      {filteredFollowupPoints.map((pt) => {
                        const heightPercent = Math.min(100, Math.max(8, (pt.count / maxFollowupVal) * 100));
                        const isHovered = hoveredFollowupKey === pt.key;

                        return (
                          <div
                            key={pt.key}
                            onMouseEnter={() => setHoveredFollowupKey(pt.key)}
                            onMouseLeave={() => setHoveredFollowupKey(null)}
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[48px] h-full justify-end cursor-pointer"
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-10 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                                {pt.label}: {pt.count} Followup{pt.count === 1 ? "" : "s"}
                              </div>
                            )}

                            {/* Bar */}
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
              {filteredFollowupPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-8 sm:w-10 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {filteredFollowupPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
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
            <span>Team follow-up chronology</span>
            <span className="font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
              {filteredFollowupPoints.reduce((acc, curr) => acc + curr.count, 0)} total logged
            </span>
          </div>
        </Card>

        {/* CARD 2: Lead Fetch Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            {/* Card Header matching managerOver2.jpg */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Lead Fetch
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={fetchEmployeeFilter}
                  onChange={(e) => setFetchEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                >
                  <option value="ALL">Employee</option>
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
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              {/* Plot Area with Y-Axis Column and Bars */}
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxFetchVal}</span>
                  <span>{Math.round(maxFetchVal * 0.75)}</span>
                  <span>{Math.round(maxFetchVal * 0.5)}</span>
                  <span>{Math.round(maxFetchVal * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Clustered Bars Row */}
                  <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
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
                          className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[44px] h-full justify-end cursor-pointer"
                        >
                          {/* Hover Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-12 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dedicated X-Axis Labels Row */}
              <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                <div className="w-8 sm:w-10 shrink-0" />
                <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                  {filteredFetchPoints.map((pt) => (
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

            {/* Bottom Legend matching managerOver2.jpg */}
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

      {/* STEP 3: 2-Column Reports Row (Payment Daily Report & Calling Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* CARD 1: Payment Daily Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            {/* Card Header matching managerOver3.png */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Payment
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Report</span>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap">
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
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              {/* Plot Area with Y-Axis Column and Bars */}
              <div className="relative flex-1 min-w-0 flex">
                {/* Y-Axis Column */}
                <div className="w-14 sm:w-16 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>₹{formatINR(maxPaymentVal)}</span>
                  <span>₹{formatINR(Math.round(maxPaymentVal * 0.75))}</span>
                  <span>₹{formatINR(Math.round(maxPaymentVal * 0.5))}</span>
                  <span>₹{formatINR(Math.round(maxPaymentVal * 0.25))}</span>
                  <span>₹0</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Bars Row */}
                  {filteredPaymentPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No payment collections for selected filter.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Approved team payment transactions will plot automatically.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
                      {filteredPaymentPoints.map((pt) => {
                        const heightPercent = Math.min(100, Math.max(8, (pt.amount / maxPaymentVal) * 100));
                        const isHovered = hoveredPaymentKey === pt.key;

                        return (
                          <div
                            key={pt.key}
                            onMouseEnter={() => setHoveredPaymentKey(pt.key)}
                            onMouseLeave={() => setHoveredPaymentKey(null)}
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[48px] h-full justify-end cursor-pointer"
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-10 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                                {pt.label}: ₹{formatINR(pt.amount)}
                              </div>
                            )}

                            {/* Bar */}
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
              {filteredPaymentPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-14 sm:w-16 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {filteredPaymentPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
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

          {/* Bottom Summary Bar matching managerOver3.png */}
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

        {/* CARD 2: Calling Report */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            {/* Card Header matching managerOver3.png */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Calling
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Report</span>
              </div>

              {/* Caller Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={callingEmployeeFilter}
                  onChange={(e) => setCallingEmployeeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5] min-w-[130px]"
                >
                  <option value="ALL">All Callers / Staff</option>
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
            <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
              {/* Plot Area with Dual Y-Axes */}
              <div className="relative flex-1 min-w-0 flex">
                {/* Left Y-Axis: Calling Hours */}
                <div className="w-8 sm:w-10 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
                  <span>{maxCallingHours}h</span>
                  <span>{Math.round(maxCallingHours * 0.75)}h</span>
                  <span>{Math.round(maxCallingHours * 0.5)}h</span>
                  <span>{Math.round(maxCallingHours * 0.25)}h</span>
                  <span>0h</span>
                </div>

                {/* Plot Area with Grid Lines */}
                <div className="relative flex-1 min-w-0">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-150 dark:border-white/[0.05]" />
                    <div className="border-b border-slate-200 dark:border-white/[0.1]" />
                  </div>

                  {/* Calling Data Bars */}
                  {filteredCallingPoints.length === 0 ? (
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <p className="text-xs font-semibold">No call logs recorded yet.</p>
                      <span className="text-xs text-slate-500 mt-1">
                        Team telecaller activities will plot here automatically.
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-2 px-1">
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
                            className="group relative flex flex-col items-center flex-1 min-w-0 max-w-[44px] h-full justify-end cursor-pointer"
                          >
                            {isHovered && (
                              <div className="absolute -top-12 z-30 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
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
              {filteredCallingPoints.length > 0 && (
                <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                  <div className="w-8 sm:w-10 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-around gap-1 sm:gap-2 px-1">
                    {filteredCallingPoints.map((pt) => (
                      <span
                        key={pt.key}
                        className="flex-1 min-w-0 text-center text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate"
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
            <div className="pt-2 flex items-center justify-between text-xs min-w-0">
              <span className="text-slate-400 truncate">Calling Hours</span>
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-slate-400 dark:bg-slate-500" />
                  <span>Duration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-cyan-500 dark:bg-cyan-400" />
                  <span>Connected</span>
                </div>
              </div>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400 truncate text-right">Connected Calls</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Team calling telemetry</span>
            <span className="font-semibold text-[#4F6DF5] dark:text-[#60A5FA]">
              {charts.callingRecords.length} total call logs
            </span>
          </div>
        </Card>
      </div>

      {/* STEP 3: Interactive Tabbed Reports Section matching managerOver3.png */}
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
        </div>

        {/* TAB 1: Lead Report (Horizontal Bar Chart + Left Filter Panel) */}
        {activeReportTab === "leadReport" && (
          <Card className="p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Filter Panel (3 of 12 cols) matching managerOver3.png */}
              <div className="lg:col-span-3 space-y-4 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Filters
                  </span>
                  {isReportFilterActive && (
                    <button
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
                    {charts.knownSources.map((src) => (
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
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Employee
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
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

              {/* Right Horizontal Bar Chart Panel (9 of 12 cols) matching managerOver3.png */}
              <div className="lg:col-span-9 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Total Leads : <span className="text-[#4F6DF5] dark:text-[#60A5FA] font-black">{filteredReportLeads.length}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
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
                        <div className="w-24 sm:w-36 text-right pr-3 text-xs font-medium text-slate-600 dark:text-slate-300 truncate shrink-0">
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
                          <div className="absolute left-32 sm:left-40 z-30 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in">
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
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-150 dark:border-white/[0.05] pl-24 sm:pl-36 pr-10">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Scoped database records matching filter parameters</p>
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
                  {filteredReportLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No lead records found for current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReportLeads.slice(0, 15).map((l) => (
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
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{l.allotToName || "Unassigned"}</td>
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
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Performance Matrix</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Activity and conversion metrics per supervised staff member</p>
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
                  {leadReport.performance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No subordinates found in team perimeter.
                      </td>
                    </tr>
                  ) : (
                    leadReport.performance.map((p) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: Monthly Sales Report */}
        {activeReportTab === "monthlySales" && (
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Sales & Revenue Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live approved payments against assigned targets</p>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Transactions</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {payment.totalApprovedCount}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 5: Lead Balance Report */}
        {activeReportTab === "leadBalance" && (
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Balance & Quota Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Team allotment reserves and available fetch quotas</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Team Leads</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {leadReport.balance.totalLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Unallotted Pool
                </span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {leadReport.balance.unallottedLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#4F6DF5]/10 border border-[#4F6DF5]/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4F6DF5] dark:text-[#60A5FA]">
                  Allotted Staff Leads
                </span>
                <div className="text-2xl font-black text-[#4F6DF5] dark:text-[#60A5FA] mt-1">
                  {leadReport.balance.allottedLeads}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                  Available Fetch Quota
                </span>
                <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                  {leadReport.balance.totalAvailableFetchQuota}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* STEP 4: Top Best SBA & Top Best BA Leaderboards Grid matching managerOver3.png */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {leaderboards.configuredCards && leaderboards.configuredCards.length > 0 ? (
          leaderboards.configuredCards.map((card) => {
            const chartItems: ManagerLeaderboardCardItem[] = card.items.map((it) => ({
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
            <LeaderboardCard title="Top Best SBA" items={sbaItems} formatINR={formatINR} />
            <LeaderboardCard title="Top Best BA" items={baItems} formatINR={formatINR} />
          </>
        )}
      </div>
    </div>
  );
}

interface ManagerLeaderboardCardItem {
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
  items: ManagerLeaderboardCardItem[];
  formatINR: (val: number) => string;
}) {
  const rawMax = Math.max(...items.map((i) => i.metricValue), 15000);
  const niceMax = Math.max(15000, Math.ceil(rawMax / 5000) * 5000);
  const yTicks = [
    niceMax,
    Math.round(niceMax * 0.8),
    Math.round(niceMax * 0.6),
    Math.round(niceMax * 0.4),
    Math.round(niceMax * 0.2),
    0,
  ];

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between min-w-0">
      {/* Card Header matching managerOver3.png */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h3>
        <button
          type="button"
          title="Menu"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors shrink-0"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {/* Chart Body */}
      {items.length === 0 ? (
        <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <p className="text-xs font-semibold">No approved sales recorded yet for this role in your team.</p>
          <span className="text-xs text-slate-500 mt-1">
            Metrics will appear automatically as team members handle leads and record approved payments.
          </span>
        </div>
      ) : (
        <div className="pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-between">
          {/* Plot Area with Y-Axis Column and Bars */}
          <div className="relative flex-1 min-w-0 flex">
            {/* Y-Axis Column */}
            <div className="w-12 sm:w-14 flex flex-col justify-between text-right pr-2 text-xs text-slate-400 font-mono select-none shrink-0">
              {yTicks.map((val, idx) => (
                <span key={idx} className="truncate">
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </span>
              ))}
            </div>

            {/* Plot Area with Grid Lines */}
            <div className="relative flex-1 min-w-0">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((val, idx) => (
                  <div
                    key={idx}
                    className={`w-full border-b ${
                      val === 0
                        ? "border-slate-200 dark:border-white/[0.1]"
                        : "border-slate-150 dark:border-white/[0.05]"
                    }`}
                  />
                ))}
              </div>

              {/* Vertical Bars Layer */}
              <div className="relative z-10 h-full flex items-end justify-around gap-1 sm:gap-3 px-1">
                {items.map((item) => {
                  const heightPercent = Math.min(
                    95,
                    Math.max(item.metricValue > 0 ? (item.metricValue / niceMax) * 95 : 4, 4)
                  );

                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col items-center flex-1 min-w-0 h-full justify-end cursor-pointer"
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 min-w-[160px] p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#080d19]/95 text-white border border-white/10 shadow-2xl backdrop-blur-md text-xs space-y-1">
                        <div className="font-bold text-xs text-[#60A5FA]">{item.displayName}</div>
                        {item.subTitle && (
                          <div className="text-xs text-slate-400">{item.subTitle}</div>
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

                      {/* Vertical Bar matching managerOver3.png */}
                      <div
                        className="w-full max-w-[44px] sm:max-w-[64px] rounded-t-md bg-[#4F6DF5] hover:bg-[#3d5bd9] dark:hover:bg-[#60A5FA] transition-all duration-300 shadow-sm"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dedicated X-Axis Labels Row */}
          <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
            <div className="w-12 sm:w-14 shrink-0" />
            <div className="flex-1 min-w-0 flex items-start justify-around gap-1 sm:gap-3 px-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex-1 min-w-0 text-center px-0.5"
                  title={`${item.displayName} · ${item.achievementPercent}% achieved`}
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">
                    {item.displayName.split(" ")[0]}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-[#4F6DF5] dark:text-[#60A5FA] block">
                    {item.achievementPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
