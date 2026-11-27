"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { getSharedLeaderboardsData } from "./leaderboard-service";

export interface DashboardLeadReminder {
  id: string;
  name: string;
  mobile: string;
  callbackDate: string;
  leadResponse: string | null;
  leadSource: string | null;
  assignedToName: string | null;
}

export interface DashboardPaymentItem {
  id: string;
  serialNo: string | null;
  amount: number;
  status: string;
  paymentDate: string;
  modeName: string | null;
  paymentType: string | null;
  leadName: string;
  leadMobile: string;
  ownerName: string | null;
}

export interface DashboardEventItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actorName: string | null;
  targetName: string | null;
}

export interface DashboardFilterOption {
  id: string;
  name: string;
  teamId?: string | null;
}

export interface FollowupRecord {
  id: string;
  dateKey: string; // e.g. "2026-10-26"
  formattedDate: string; // e.g. "26 Oct 26"
  allotToId: string | null;
  teamId: string | null;
}

export interface FetchRecord {
  id: string;
  source: string;
  leadsCount: number;
  createdAt: string;
  isToday: boolean;
  userId: string;
  teamId: string | null;
}

export interface SourceRuleData {
  source: string;
  fetchLimit: number;
  availableLimit: number;
  fetchCount: number;
}

export interface DashboardLeadReportItem {
  id: string;
  name: string;
  mobile: string;
  leadSource: string | null;
  status: string;
  leadResponse: string | null;
  allotToId: string | null;
  allotToName: string | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePerformanceItem {
  id: string;
  name: string;
  teamName: string | null;
  assignedLeads: number;
  followups: number;
  fetches: number;
  salesAmount: number;
}

export interface LeadBalanceSummary {
  totalLeads: number;
  unallottedLeads: number;
  allottedLeads: number;
  activeRulesCount: number;
  totalAvailableFetchQuota: number;
}

export interface LeadReportSectionData {
  allLeads: DashboardLeadReportItem[];
  performance: EmployeePerformanceItem[];
  balance: LeadBalanceSummary;
}

export interface PerformerBarItem {
  id: string;
  name: string;
  profileName: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsHandled: number;
  metricValue: number;
}

export interface TopTeamItem {
  id: string;
  teamName: string;
  leaderName: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  membersCount: number;
  leadsCount: number;
  metricValue: number;
}

export interface ConfiguredLeaderboardSection {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: "Individual" | "Team";
  items: PerformerBarItem[];
}

export interface LeaderboardsData {
  configuredCards: ConfiguredLeaderboardSection[];
  topBestTL: PerformerBarItem[];
  topBestSBA: PerformerBarItem[];
  topBestBAT: PerformerBarItem[];
  topBestBA: PerformerBarItem[];
  topTeamBestAFM: TopTeamItem[];
}

export interface DailyPaymentRecord {
  id: string;
  amount: number;
  dateKey: string;
  formattedDate: string;
  leadOwnerId: string | null;
  teamId: string | null;
}

export interface CallingRecord {
  id: string;
  durationSeconds: number;
  talkTimeSeconds: number;
  isConnected: boolean;
  dateKey: string;
  formattedDate: string;
  callerId: string;
  teamId: string | null;
}

export interface DashboardChartsData {
  employees: DashboardFilterOption[];
  teams: DashboardFilterOption[];
  followupRecords: FollowupRecord[];
  fetchRecords: FetchRecord[];
  sourceRules: SourceRuleData[];
  knownSources: string[];
  dailyPayments: DailyPaymentRecord[];
  callingRecords: CallingRecord[];
}

export interface AdminOverviewStep1Data {
  adminName: string;
  target: {
    targetAmount: number;
    achievedAmount: number;
    achievementPercent: number;
    daysLeftInMonth: number;
  };
  payment: {
    totalApprovedAmount: number;
    totalApprovedCount: number;
    todayApprovedAmount: number;
    todayApprovedCount: number;
    lastPaymentAmount: number;
    lastPaymentDaysAgo: number | null;
  };
  clients: {
    totalClients: number;
    newThisMonth: number;
    activeClients: number;
    expiredClients: number;
  };
  callbacks: {
    totalCallbacks: number;
    todayCallbacks: number;
    pendingCallbacks: number;
    upcomingCallbacks: number;
  };
  followups: {
    totalFollowups: number;
    newFollowups: number;
    pendingFollowups: number;
    updatedFollowups: number;
  };
  todayActivity: {
    allotedToday: number;
    transferredToday: number;
    fetchedToday: number;
    updatedToday: number;
  };
  leadStatusStrip: {
    unreadCount: number;
    readCount: number;
    followupCount: number;
    clientCount: number;
    totalLeadsCount: number;
  };
  remindersTab: {
    leadReminders: DashboardLeadReminder[];
    recentPayments: DashboardPaymentItem[];
    recentEvents: DashboardEventItem[];
  };
  charts: DashboardChartsData;
  leadReport: LeadReportSectionData;
  leaderboards: LeaderboardsData;
}

export async function getAdminOverviewStep1Action(): Promise<{
  success: boolean;
  data?: AdminOverviewStep1Data;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeftInMonth = Math.max(0, daysInMonth - now.getDate());

    // Execute queries in parallel for peak performance
    const [
      targetAggregate,
      approvedPaymentAggregate,
      todayPaymentAggregate,
      lastApprovedPayment,
      totalPaymentsCount,
      clientCount,
      newClientsThisMonth,
      expiredInvoicesCount,
      totalCallbacksCount,
      todayCallbacksCount,
      pendingCallbacksCount,
      upcomingCallbacksCount,
      totalFollowupsCount,
      newFollowupsCount,
      updatedFollowupsCount,
      allotedActivityCount,
      transferredActivityCount,
      fetchedLogsAggregate,
      fetchedActivityCount,
      updatedActivityCount,
      statusGroups,
      upcomingCallbackLeads,
      latestPayments,
      latestActivities,
      // Step 2 Additions: Charts & Reports
      employeesList,
      teamsList,
      followupLeadsRaw,
      fetchLimitRulesRaw,
      leadFetchLogsRaw,
      leadSourcesListRaw,
      distinctLeadSourcesRaw,
      // Step 3 Additions: Daily Payments & Calling Records
      approvedPaymentsDailyRaw,
      callLogsRaw,
      // Step 4 Additions: All Leads with metadata for Lead Report
      allLeadsRaw,
    ] = await Promise.all([
      // 1. Target Sum (sum of employeeTarget for active users)
      prisma.user.aggregate({
        _sum: { employeeTarget: true },
        where: { isActive: true, deletedAt: null },
      }),

      // 2. Approved Payments Total
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "APPROVED" },
      }),

      // 3. Approved Payments Today
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          status: "APPROVED",
          paymentDate: { gte: startOfDay, lte: endOfDay },
        },
      }),

      // 4. Last Approved Payment
      prisma.payment.findFirst({
        where: { status: "APPROVED" },
        orderBy: { paymentDate: "desc" },
        select: { amount: true, paymentDate: true },
      }),

      // 5. Total Approved Payments Count
      prisma.payment.count({
        where: { status: "APPROVED" },
      }),

      // 6. Clients Count (Lead status CLIENT)
      prisma.lead.count({
        where: { status: "CLIENT" },
      }),

      // 7. New Clients This Month
      prisma.lead.count({
        where: {
          status: "CLIENT",
          createdAt: { gte: startOfMonth },
        },
      }),

      // 8. Expired Invoices Count (indicative for expired client cohort)
      prisma.invoice.count({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
        },
      }),

      // 9. Total Callbacks
      prisma.lead.count({
        where: { callbackDate: { not: null } },
      }),

      // 10. Today Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gte: startOfDay, lte: endOfDay },
        },
      }),

      // 11. Pending / Overdue Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { lt: startOfDay },
        },
      }),

      // 12. Upcoming Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gt: endOfDay },
        },
      }),

      // 13. Total Follow-ups
      prisma.lead.count({
        where: { status: "FOLLOW_UP" },
      }),

      // 14. New Follow-ups Today
      prisma.lead.count({
        where: {
          status: "FOLLOW_UP",
          createdAt: { gte: startOfDay },
        },
      }),

      // 15. Updated Follow-ups Today
      prisma.lead.count({
        where: {
          status: "FOLLOW_UP",
          updatedAt: { gte: startOfDay },
          createdAt: { lt: startOfDay },
        },
      }),

      // 16. Alloted Today Activity
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_ALLOTMENT", "LEAD_BULK_ALLOT"] },
          createdAt: { gte: startOfDay },
        },
      }),

      // 17. Transferred Today Activity
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_BULK_TRANSFER", "LEAD_TRANSFER"] },
          createdAt: { gte: startOfDay },
        },
      }),

      // 18. Fetched Today from LeadFetchLog
      prisma.leadFetchLog.aggregate({
        _sum: { leadsCount: true },
        where: { createdAt: { gte: startOfDay } },
      }),

      // 19. Fetched Today ActivityLog fallback
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_FETCH", "LEAD_FETCHED"] },
          createdAt: { gte: startOfDay },
        },
      }),

      // 20. Updated Today Activity
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_UPDATED", "LEAD_CALL_UPDATED", "LEAD_DETAILS_UPDATED"] },
          createdAt: { gte: startOfDay },
        },
      }),

      // 21. Status Groups
      prisma.lead.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // 22. Upcoming / Today Callback Leads for Right Strip
      prisma.lead.findMany({
        where: { callbackDate: { not: null } },
        orderBy: { callbackDate: "asc" },
        take: 10,
        select: {
          id: true,
          name: true,
          mobile: true,
          callbackDate: true,
          leadResponse: true,
          leadSource: true,
          allotTo: {
            select: { id: true, name: true },
          },
        },
      }),

      // 23. Latest Payments
      prisma.payment.findMany({
        take: 10,
        orderBy: { paymentDate: "desc" },
        select: {
          id: true,
          serialNo: true,
          amount: true,
          status: true,
          paymentDate: true,
          modeName: true,
          paymentType: true,
          lead: {
            select: { name: true, mobile: true },
          },
          leadOwner: {
            select: { name: true },
          },
        },
      }),

      // 24. Latest Activity Events
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
          actor: {
            select: { name: true },
          },
          targetUser: {
            select: { name: true },
          },
          targetTeam: {
            select: { name: true },
          },
        },
      }),

      // 25. Step 2 & 5: Active Employees for Dropdown Filter & Leaderboards
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          role: true,
          employeeTarget: true,
          teamId: true,
          employeeProfile: { select: { id: true, name: true } },
          ledTeams: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),

      // 26. Step 2 & 5: Teams for Dropdown Filter & Leaderboards
      prisma.team.findMany({
        select: {
          id: true,
          name: true,
          leader: { select: { id: true, name: true } },
          members: { select: { id: true, employeeTarget: true } },
          leads: { select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),

      // 27. Step 2: Followup Leads Raw Data
      prisma.lead.findMany({
        where: {
          OR: [
            { status: "FOLLOW_UP" },
            { callbackDate: { not: null } },
            { leadResponse: { in: ["callback", "Follow Up", "Interested"] } },
          ],
        },
        select: {
          id: true,
          allotToId: true,
          teamId: true,
          callbackDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
      }),

      // 28. Step 2: Fetch Limit Rules Raw
      prisma.fetchLimitRule.findMany({
        select: {
          id: true,
          leadSource: true,
          fetchLimit: true,
          availableLimit: true,
          fetchCount: true,
        },
      }),

      // 29. Step 2: Lead Fetch Logs Raw
      prisma.leadFetchLog.findMany({
        select: {
          id: true,
          userId: true,
          leadSource: true,
          leadsCount: true,
          createdAt: true,
          user: {
            select: { id: true, teamId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // 30. Step 2: Active Lead Sources
      prisma.leadSource.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      // 31. Step 2: Distinct sources from Leads
      prisma.lead.groupBy({
        by: ["leadSource"],
        _count: { _all: true },
      }),

      // 32. Step 3: Approved Payments for Daily Report
      prisma.payment.findMany({
        where: { status: "APPROVED" },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          leadOwnerId: true,
          teamId: true,
        },
        orderBy: { paymentDate: "asc" },
      }),

      // 33. Step 3: Call Logs for Calling Report
      prisma.callLog.findMany({
        select: {
          id: true,
          duration: true,
          talkTime: true,
          status: true,
          callDate: true,
          callerId: true,
          teamId: true,
        },
        orderBy: { callDate: "asc" },
      }),

      // 34. Step 4: All Leads with metadata for Lead Report
      prisma.lead.findMany({
        select: {
          id: true,
          name: true,
          mobile: true,
          leadSource: true,
          status: true,
          leadResponse: true,
          allotToId: true,
          teamId: true,
          createdAt: true,
          updatedAt: true,
          allotTo: {
            select: { name: true },
          },
          team: {
            select: { name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Target Calculations
    const targetAmount = targetAggregate._sum.employeeTarget || 0;
    const achievedAmount = Number(approvedPaymentAggregate._sum.amount ?? 0);
    const achievementPercent =
      targetAmount > 0
        ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
        : 0;

    // Payment Calculations
    const todayApprovedAmount = Number(todayPaymentAggregate._sum.amount ?? 0);
    const todayApprovedCount = todayPaymentAggregate._count._all;

    let lastPaymentAmount = 0;
    let lastPaymentDaysAgo: number | null = null;
    if (lastApprovedPayment) {
      lastPaymentAmount = Number(lastApprovedPayment.amount);
      const diffMs = now.getTime() - new Date(lastApprovedPayment.paymentDate).getTime();
      lastPaymentDaysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Clients Breakdown
    const activeClients = Math.max(0, clientCount - expiredInvoicesCount);

    // Follow-ups Breakdown
    const pendingFollowups = Math.max(
      0,
      totalFollowupsCount - updatedFollowupsCount - newFollowupsCount
    );

    // Fetched Today (use LeadFetchLog sum if present, otherwise activity count)
    const fetchedToday =
      (fetchedLogsAggregate._sum.leadsCount ?? 0) > 0
        ? (fetchedLogsAggregate._sum.leadsCount ?? 0)
        : fetchedActivityCount;

    // Lead Status Strip Breakdown
    let unreadCount = 0;
    let readCount = 0;
    let followupCount = 0;
    let clientStatusCount = 0;
    let totalLeadsCount = 0;

    for (const group of statusGroups) {
      const cnt = group._count._all;
      totalLeadsCount += cnt;
      const s = group.status.toUpperCase();
      if (s === "UNREAD") unreadCount += cnt;
      else if (s === "READ") readCount += cnt;
      else if (s === "FOLLOW_UP" || s === "FOLLOWUP") followupCount += cnt;
      else if (s === "CLIENT" || s === "CLIENTS") clientStatusCount += cnt;
    }

    // Transform Right Strip data
    const leadReminders: DashboardLeadReminder[] = upcomingCallbackLeads.map((l) => ({
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : "",
      leadResponse: l.leadResponse,
      leadSource: l.leadSource,
      assignedToName: l.allotTo?.name || null,
    }));

    const recentPayments: DashboardPaymentItem[] = latestPayments.map((p) => ({
      id: p.id,
      serialNo: p.serialNo,
      amount: Number(p.amount),
      status: p.status,
      paymentDate: p.paymentDate.toISOString(),
      modeName: p.modeName,
      paymentType: p.paymentType,
      leadName: p.lead.name,
      leadMobile: p.lead.mobile,
      ownerName: p.leadOwner?.name || null,
    }));

    const recentEvents: DashboardEventItem[] = latestActivities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actorName: a.actor?.name || null,
      targetName: a.targetUser?.name || a.targetTeam?.name || null,
    }));

    // Step 2: Format Date Helper
    const formatChartDate = (d: Date): { key: string; label: string } => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;

      const dayStr = String(d.getDate()).padStart(2, "0");
      const monthStr = d.toLocaleDateString("en-US", { month: "short" });
      const yearShort = String(d.getFullYear()).slice(-2);
      const label = `${dayStr} ${monthStr} ${yearShort}`;

      return { key, label };
    };

    // Step 2: Transform Follow-up leads into records
    const followupRecords: FollowupRecord[] = followupLeadsRaw.map((lead) => {
      const targetDate = lead.callbackDate || lead.updatedAt || lead.createdAt;
      const { key, label } = formatChartDate(new Date(targetDate));
      return {
        id: lead.id,
        dateKey: key,
        formattedDate: label,
        allotToId: lead.allotToId,
        teamId: lead.teamId,
      };
    });

    // Step 2: Transform Fetch Logs
    const startOfTodayMs = startOfDay.getTime();
    const fetchRecords: FetchRecord[] = leadFetchLogsRaw.map((log) => {
      const logTime = new Date(log.createdAt).getTime();
      return {
        id: log.id,
        source: log.leadSource,
        leadsCount: log.leadsCount,
        createdAt: log.createdAt.toISOString(),
        isToday: logTime >= startOfTodayMs,
        userId: log.userId,
        teamId: log.user?.teamId || null,
      };
    });

    // Step 2: Source Rules map
    const sourceRules: SourceRuleData[] = fetchLimitRulesRaw.map((r) => ({
      source: r.leadSource,
      fetchLimit: r.fetchLimit,
      availableLimit: r.availableLimit,
      fetchCount: r.fetchCount,
    }));

    // Step 2: Compile known distinct sources
    const sourcesSet = new Set<string>();
    for (const r of fetchLimitRulesRaw) {
      if (r.leadSource?.trim()) sourcesSet.add(r.leadSource.trim());
    }
    for (const l of leadFetchLogsRaw) {
      if (l.leadSource?.trim()) sourcesSet.add(l.leadSource.trim());
    }
    for (const s of leadSourcesListRaw) {
      if (s.name?.trim()) sourcesSet.add(s.name.trim());
    }
    for (const item of distinctLeadSourcesRaw) {
      if (item.leadSource?.trim()) sourcesSet.add(item.leadSource.trim());
    }
    const knownSources = Array.from(sourcesSet);

    // Step 3: Transform Daily Approved Payments
    const dailyPayments: DailyPaymentRecord[] = approvedPaymentsDailyRaw.map((p) => {
      const { key, label } = formatChartDate(new Date(p.paymentDate));
      return {
        id: p.id,
        amount: Number(p.amount),
        dateKey: key,
        formattedDate: label,
        leadOwnerId: p.leadOwnerId,
        teamId: p.teamId,
      };
    });

    // Step 3: Transform Calling Records
    const callingRecords: CallingRecord[] = callLogsRaw.map((c) => {
      const { key, label } = formatChartDate(new Date(c.callDate));
      return {
        id: c.id,
        durationSeconds: c.duration,
        talkTimeSeconds: c.talkTime,
        isConnected: c.status === "ANSWERED",
        dateKey: key,
        formattedDate: label,
        callerId: c.callerId,
        teamId: c.teamId,
      };
    });

    // Step 4: Transform All Leads & Compute Performance/Balance
    let unallottedCount = 0;
    let allottedCount = 0;
    const employeeLeadCountMap = new Map<string, number>();

    const allLeads: DashboardLeadReportItem[] = allLeadsRaw.map((l) => {
      if (l.allotToId) {
        allottedCount++;
        employeeLeadCountMap.set(l.allotToId, (employeeLeadCountMap.get(l.allotToId) || 0) + 1);
      } else {
        unallottedCount++;
      }
      return {
        id: l.id,
        name: l.name,
        mobile: l.mobile,
        leadSource: l.leadSource,
        status: l.status,
        leadResponse: l.leadResponse,
        allotToId: l.allotToId,
        allotToName: l.allotTo?.name || null,
        teamId: l.teamId,
        teamName: l.team?.name || null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      };
    });

    const employeeFollowupsMap = new Map<string, number>();
    for (const f of followupLeadsRaw) {
      if (f.allotToId) {
        employeeFollowupsMap.set(f.allotToId, (employeeFollowupsMap.get(f.allotToId) || 0) + 1);
      }
    }

    const employeeFetchesMap = new Map<string, number>();
    for (const fl of leadFetchLogsRaw) {
      employeeFetchesMap.set(fl.userId, (employeeFetchesMap.get(fl.userId) || 0) + fl.leadsCount);
    }

    const employeeSalesMap = new Map<string, number>();
    for (const p of approvedPaymentsDailyRaw) {
      if (p.leadOwnerId) {
        employeeSalesMap.set(p.leadOwnerId, (employeeSalesMap.get(p.leadOwnerId) || 0) + Number(p.amount));
      }
    }

    const performance: EmployeePerformanceItem[] = employeesList.map((emp) => {
      const team = teamsList.find((t) => t.id === emp.teamId);
      return {
        id: emp.id,
        name: emp.name,
        teamName: team?.name || null,
        assignedLeads: employeeLeadCountMap.get(emp.id) || 0,
        followups: employeeFollowupsMap.get(emp.id) || 0,
        fetches: employeeFetchesMap.get(emp.id) || 0,
        salesAmount: employeeSalesMap.get(emp.id) || 0,
      };
    });

    let totalAvailableFetchQuota = 0;
    for (const r of fetchLimitRulesRaw) {
      totalAvailableFetchQuota += r.availableLimit;
    }

    const balance: LeadBalanceSummary = {
      totalLeads: allLeads.length,
      unallottedLeads: unallottedCount,
      allottedLeads: allottedCount,
      activeRulesCount: fetchLimitRulesRaw.length,
      totalAvailableFetchQuota,
    };

    // Step 5: Leaderboard Calculations (100% Real DB Data)
    const allPerformers: PerformerBarItem[] = employeesList.map((emp) => {
      const targetAmt = emp.employeeTarget || 0;
      const achievedAmt = employeeSalesMap.get(emp.id) || 0;
      const leadsHandled = employeeLeadCountMap.get(emp.id) || 0;
      const achievementPercent =
        targetAmt > 0
          ? Math.round((achievedAmt / targetAmt) * 100)
          : achievedAmt > 0
          ? 100
          : 0;
      const metricValue =
        achievedAmt > 0 ? achievedAmt : targetAmt > 0 ? targetAmt : leadsHandled * 1000;

      return {
        id: emp.id,
        name: emp.name,
        profileName: emp.employeeProfile?.name || null,
        targetAmount: targetAmt,
        achievedAmount: achievedAmt,
        achievementPercent,
        leadsHandled,
        metricValue,
      };
    });

    // 1. Top Best TL (Team Leaders & Managers)
    const tlCandidates = allPerformers.filter((p) => {
      const emp = employeesList.find((e) => e.id === p.id);
      if (!emp) return false;
      const prof = emp.employeeProfile?.name?.toUpperCase() || "";
      return (
        emp.ledTeams.length > 0 ||
        emp.role === "MANAGER" ||
        prof.includes("TL") ||
        prof.includes("LEAD") ||
        prof.includes("MANAGER")
      );
    });
    const topBestTL: PerformerBarItem[] = (
      tlCandidates.length > 0 ? tlCandidates : allPerformers
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // 2. Top Best SBA (Senior Business Analysts)
    const sbaCandidates = allPerformers.filter((p) => {
      const prof = p.profileName?.toUpperCase() || "";
      return prof.includes("SBA") || prof.includes("STL") || prof.includes("SENIOR");
    });
    const topBestSBA: PerformerBarItem[] = (
      sbaCandidates.length > 0
        ? sbaCandidates
        : allPerformers.filter((p) => !topBestTL.some((tl) => tl.id === p.id))
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // 3. Top Best BAT (Business Analyst Trainees / Associates)
    const batCandidates = allPerformers.filter((p) => {
      const prof = p.profileName?.toUpperCase() || "";
      return prof.includes("BAT") || prof.includes("TRAINEE") || prof.includes("CA");
    });
    const topBestBAT: PerformerBarItem[] = (
      batCandidates.length > 0
        ? batCandidates
        : allPerformers.filter(
            (p) => !topBestTL.some((tl) => tl.id === p.id) && !topBestSBA.some((s) => s.id === p.id)
          )
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // 4. Top Best BA (Business Analysts)
    const baCandidates = allPerformers.filter((p) => {
      const prof = p.profileName?.toUpperCase() || "";
      return (
        (prof.includes("BA") && !prof.includes("SBA") && !prof.includes("BAT")) ||
        (!prof && !topBestTL.some((tl) => tl.id === p.id))
      );
    });
    const topBestBA: PerformerBarItem[] = (
      baCandidates.length > 0
        ? baCandidates
        : allPerformers.filter((p) => !topBestTL.some((tl) => tl.id === p.id))
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // 5. Top Team Best AFM (Area Floor Managers / Teams)
    const topTeamBestAFM: TopTeamItem[] = teamsList
      .map((t) => {
        const memberIds = new Set(t.members.map((m) => m.id));
        let teamAchieved = 0;
        for (const p of approvedPaymentsDailyRaw) {
          if (p.teamId === t.id || (p.leadOwnerId && memberIds.has(p.leadOwnerId))) {
            teamAchieved += Number(p.amount);
          }
        }
        const teamTarget = t.members.reduce((acc, m) => acc + (m.employeeTarget || 0), 0);
        const achievementPercent =
          teamTarget > 0
            ? Math.round((teamAchieved / teamTarget) * 100)
            : teamAchieved > 0
            ? 100
            : 0;
        const leadsCount = t.leads.length;
        const metricValue =
          teamAchieved > 0 ? teamAchieved : teamTarget > 0 ? teamTarget : leadsCount * 1000;

        return {
          id: t.id,
          teamName: t.name,
          leaderName: t.leader?.name || "Unassigned",
          targetAmount: teamTarget,
          achievedAmount: teamAchieved,
          achievementPercent,
          membersCount: t.members.length,
          leadsCount,
          metricValue,
        };
      })
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsCount - a.leadsCount)
      .slice(0, 5);

    // Step 5 Extension: Dynamic Leaderboard Configurations from SystemSetting
    const configuredCards: ConfiguredLeaderboardSection[] = await getSharedLeaderboardsData(
      startOfMonth,
      endOfMonth
    );

    return {
      success: true,
      data: {
        adminName: admin.name,
        target: {
          targetAmount,
          achievedAmount,
          achievementPercent,
          daysLeftInMonth,
        },
        payment: {
          totalApprovedAmount: achievedAmount,
          totalApprovedCount: totalPaymentsCount,
          todayApprovedAmount,
          todayApprovedCount,
          lastPaymentAmount,
          lastPaymentDaysAgo,
        },
        clients: {
          totalClients: clientCount,
          newThisMonth: newClientsThisMonth,
          activeClients,
          expiredClients: expiredInvoicesCount,
        },
        callbacks: {
          totalCallbacks: totalCallbacksCount,
          todayCallbacks: todayCallbacksCount,
          pendingCallbacks: pendingCallbacksCount,
          upcomingCallbacks: upcomingCallbacksCount,
        },
        followups: {
          totalFollowups: totalFollowupsCount,
          newFollowups: newFollowupsCount,
          pendingFollowups,
          updatedFollowups: updatedFollowupsCount,
        },
        todayActivity: {
          allotedToday: allotedActivityCount,
          transferredToday: transferredActivityCount,
          fetchedToday,
          updatedToday: updatedActivityCount,
        },
        leadStatusStrip: {
          unreadCount,
          readCount,
          followupCount,
          clientCount: clientStatusCount,
          totalLeadsCount,
        },
        remindersTab: {
          leadReminders,
          recentPayments,
          recentEvents,
        },
        charts: {
          employees: employeesList.map((e) => ({
            id: e.id,
            name: e.name,
            teamId: e.teamId,
          })),
          teams: teamsList.map((t) => ({
            id: t.id,
            name: t.name,
          })),
          followupRecords,
          fetchRecords,
          sourceRules,
          knownSources,
          dailyPayments,
          callingRecords,
        },
        leadReport: {
          allLeads,
          performance,
          balance,
        },
        leaderboards: {
          configuredCards,
          topBestTL,
          topBestSBA,
          topBestBAT,
          topBestBA,
          topTeamBestAFM,
        },
      },
    };
  } catch (err) {
    return handleActionError(
      err,
      "Failed to load executive dashboard metrics. An unexpected error occurred."
    );
  }
}
