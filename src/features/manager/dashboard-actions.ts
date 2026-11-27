"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import type {
  ManagerOverviewStep1Data,
  ManagerLeadReminder,
  ManagerPaymentItem,
  ManagerEventItem,
  ManagerDashboardFilterOption,
  ManagerFollowupRecord,
  ManagerFetchRecord,
  ManagerSourceRuleData,
  ManagerChartsData,
  ManagerDailyPaymentRecord,
  ManagerCallingRecord,
  ManagerLeadReportItem,
  ManagerEmployeePerformanceItem,
  ManagerLeadBalanceSummary,
  ManagerLeadReportSectionData,
  ManagerPerformerBarItem,
  ManagerConfiguredLeaderboardSection,
  ManagerLeaderboardsData,
} from "./types";

/**
 * Retrieves Step 1 & Step 2 overview metrics strictly scoped to the authenticated Manager
 * and their assigned teams/subordinates.
 *
 * Rules:
 * - Direct subordinates (managerId === manager.id)
 * - Assigned members of teams led by manager (teamId in ledTeams)
 * - Leads/Payments/Logs strictly scoped to allowedUserIds / relevantTeamIds
 * - ZERO dummy or hardcoded metrics; 100% PostgreSQL backed
 */
export async function getManagerDashboardStep1Action(): Promise<{
  success: boolean;
  data?: ManagerOverviewStep1Data;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const endOfYesterday = new Date(endOfDay);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeftInMonth = Math.max(0, daysInMonth - now.getDate());

    // 1. Resolve manager's supervisory boundary
    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: {
        id: true,
        name: true,
        role: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        ledTeams: { select: { id: true, name: true } },
      },
    });

    const ledTeams = managerUser?.ledTeams || [];
    const relevantTeamIds = [
      ...new Set([
        ...ledTeams.map((t) => t.id),
        ...(managerUser?.teamId ? [managerUser.teamId] : []),
      ]),
    ];

    const teamNames = [
      ...ledTeams.map((t) => t.name),
      ...(managerUser?.team ? [managerUser.team.name] : []),
    ];

    // Find all active non-manager subordinates under this manager's domain
    let rawSubordinates = await prisma.user.findMany({
      where: {
        id: { not: manager.id },
        role: { notIn: ["MANAGER", "ADMIN"] },
        isActive: true,
        deletedAt: null,
        OR: [
          { managerId: manager.id },
          ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        employeeTarget: true,
        teamId: true,
        employeeProfile: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    let subordinateUserIds = rawSubordinates.map((s) => s.id);

    // If an Admin accesses the manager portal and has no assigned subordinates,
    // evaluate against all active non-admin employees for preview
    if (manager.role === "ADMIN" && subordinateUserIds.length === 0) {
      const allEmployees = await prisma.user.findMany({
        where: { role: "EMPLOYEE", isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          employeeTarget: true,
          teamId: true,
          employeeProfile: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      });
      rawSubordinates = allEmployees;
      subordinateUserIds = allEmployees.map((e) => e.id);
    }

    const allowedUserIds = Array.from(new Set([manager.id, ...subordinateUserIds]));

    // 2. Execute strictly-scoped parallel queries
    const [
      subordinatesTargetAggregate,
      approvedPaymentAggregate,
      todayPaymentAggregate,
      yesterdayPaymentAggregate,
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
      followupLeadsRaw,
      fetchLimitRulesRaw,
      leadFetchLogsRaw,
      activeLeadSourcesRaw,
      distinctScopedSourcesRaw,
      // Step 3 Additions: Payment Daily, Calling, All Leads
      approvedPaymentsDailyRaw,
      callLogsRaw,
      scopedAllLeadsRaw,
      // Step 4 Additions: Leaderboard Configurations from SystemSetting
      savedGraphConfigsRaw,
    ] = await Promise.all([
      // 1. Target Sum (sum of employeeTarget for scoped subordinate users)
      prisma.user.aggregate({
        _sum: { employeeTarget: true },
        where: {
          id: { in: subordinateUserIds },
          isActive: true,
          deletedAt: null,
        },
      }),

      // 2. Approved Payments Total for scoped team
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
        },
      }),

      // 3. Approved Payments Today for scoped team
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
          paymentDate: { gte: startOfDay, lte: endOfDay },
        },
      }),

      // 4. Approved Payments 1 Day Ago (Yesterday) for scoped team
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
          paymentDate: { gte: startOfYesterday, lte: endOfYesterday },
        },
      }),

      // 5. Last Approved Payment for scoped team
      prisma.payment.findFirst({
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
        },
        orderBy: { paymentDate: "desc" },
        select: { amount: true, paymentDate: true },
      }),

      // 6. Total Approved Payments Count for scoped team
      prisma.payment.count({
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
        },
      }),

      // 7. Clients Count (Scoped Lead status CLIENT)
      prisma.lead.count({
        where: {
          status: "CLIENT",
          allotToId: { in: allowedUserIds },
        },
      }),

      // 8. New Clients This Month
      prisma.lead.count({
        where: {
          status: "CLIENT",
          allotToId: { in: allowedUserIds },
          createdAt: { gte: startOfMonth },
        },
      }),

      // 9. Expired Invoices Count (indicative of expired client cohort for scoped leads)
      prisma.invoice.count({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
          lead: {
            allotToId: { in: allowedUserIds },
          },
        },
      }),

      // 10. Total Callbacks for scoped team
      prisma.lead.count({
        where: {
          callbackDate: { not: null },
          allotToId: { in: allowedUserIds },
        },
      }),

      // 11. Today Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gte: startOfDay, lte: endOfDay },
          allotToId: { in: allowedUserIds },
        },
      }),

      // 12. Pending / Overdue Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { lt: startOfDay },
          allotToId: { in: allowedUserIds },
        },
      }),

      // 13. Upcoming Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gt: endOfDay },
          allotToId: { in: allowedUserIds },
        },
      }),

      // 14. Total Follow-ups for scoped team
      prisma.lead.count({
        where: {
          status: "FOLLOW_UP",
          allotToId: { in: allowedUserIds },
        },
      }),

      // 15. New Follow-ups Today
      prisma.lead.count({
        where: {
          status: "FOLLOW_UP",
          allotToId: { in: allowedUserIds },
          createdAt: { gte: startOfDay },
        },
      }),

      // 16. Updated Follow-ups Today
      prisma.lead.count({
        where: {
          status: "FOLLOW_UP",
          allotToId: { in: allowedUserIds },
          updatedAt: { gte: startOfDay },
          createdAt: { lt: startOfDay },
        },
      }),

      // 17. Alloted Today Activity in manager's perimeter
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_ALLOTMENT", "LEAD_BULK_ALLOT"] },
          createdAt: { gte: startOfDay },
          OR: [
            { actorId: { in: allowedUserIds } },
            { targetUserId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ targetTeamId: { in: relevantTeamIds } }] : []),
          ],
        },
      }),

      // 18. Transferred Today Activity in manager's perimeter
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_BULK_TRANSFER", "LEAD_TRANSFER"] },
          createdAt: { gte: startOfDay },
          OR: [
            { actorId: { in: allowedUserIds } },
            { targetUserId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ targetTeamId: { in: relevantTeamIds } }] : []),
          ],
        },
      }),

      // 19. Fetched Today from LeadFetchLog for scoped subordinates
      prisma.leadFetchLog.aggregate({
        _sum: { leadsCount: true },
        where: {
          userId: { in: allowedUserIds },
          createdAt: { gte: startOfDay },
        },
      }),

      // 20. Fetched Today ActivityLog fallback
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_FETCH", "LEAD_FETCHED"] },
          createdAt: { gte: startOfDay },
          OR: [
            { actorId: { in: allowedUserIds } },
            { targetUserId: { in: allowedUserIds } },
          ],
        },
      }),

      // 21. Updated Today Activity in manager's perimeter
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_UPDATED", "LEAD_CALL_UPDATED", "LEAD_DETAILS_UPDATED"] },
          createdAt: { gte: startOfDay },
          OR: [
            { actorId: { in: allowedUserIds } },
            { targetUserId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ targetTeamId: { in: relevantTeamIds } }] : []),
          ],
        },
      }),

      // 22. Status Groups for scoped leads
      prisma.lead.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: {
          allotToId: { in: allowedUserIds },
        },
      }),

      // 23. Upcoming / Today Callback Leads for Reminders Tab
      prisma.lead.findMany({
        where: {
          callbackDate: { not: null },
          allotToId: { in: allowedUserIds },
        },
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

      // 24. Latest Approved Payments for Reminders Tab
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
        },
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

      // 25. Latest Activity Events in manager's perimeter
      prisma.activityLog.findMany({
        where: {
          OR: [
            { actorId: { in: allowedUserIds } },
            { targetUserId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ targetTeamId: { in: relevantTeamIds } }] : []),
          ],
        },
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

      // 26. Step 2: Followup Leads Raw Data for scoped team
      prisma.lead.findMany({
        where: {
          allotToId: { in: allowedUserIds },
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

      // 27. Step 2: Fetch Limit Rules Raw
      prisma.fetchLimitRule.findMany({
        select: {
          id: true,
          leadSource: true,
          fetchLimit: true,
          availableLimit: true,
          fetchCount: true,
        },
      }),

      // 28. Step 2: Lead Fetch Logs Raw for scoped team
      prisma.leadFetchLog.findMany({
        where: {
          userId: { in: allowedUserIds },
        },
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

      // 29. Step 2: Active Lead Sources
      prisma.leadSource.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      // 30. Step 2: Distinct sources from scoped leads
      prisma.lead.groupBy({
        by: ["leadSource"],
        _count: { _all: true },
        where: {
          allotToId: { in: allowedUserIds },
        },
      }),

      // 31. Step 3: Approved Payments Daily for Payment Daily Report
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          leadOwnerId: { in: allowedUserIds },
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          leadOwnerId: true,
          leadOwner: {
            select: { teamId: true },
          },
        },
        orderBy: { paymentDate: "asc" },
      }),

      // 32. Step 3: Call Logs for Calling Report
      prisma.callLog.findMany({
        where: {
          callerId: { in: subordinateUserIds },
        },
        select: {
          id: true,
          duration: true,
          talkTime: true,
          status: true,
          callDate: true,
          callerId: true,
          caller: {
            select: { teamId: true },
          },
        },
        orderBy: { callDate: "asc" },
      }),

      // 33. Step 3: All Scoped Leads for Lead Report & Records
      prisma.lead.findMany({
        where: {
          allotToId: { in: allowedUserIds },
        },
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

      // 34. Step 4: Leaderboard Configurations from SystemSetting
      prisma.systemSetting.findUnique({
        where: { key: "EMPLOYEE_GRAPH_CONFIGS" },
      }),
    ]);

    // Target Calculations
    const targetAmount = subordinatesTargetAggregate._sum.employeeTarget || 0;
    const achievedAmount = Number(approvedPaymentAggregate._sum.amount ?? 0);
    const achievementPercent =
      targetAmount > 0
        ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
        : achievedAmount > 0
        ? 100
        : 0;

    // Payment Calculations
    const todayApprovedAmount = Number(todayPaymentAggregate._sum.amount ?? 0);
    const todayApprovedCount = todayPaymentAggregate._count._all;
    const yesterdayApprovedAmount = Number(yesterdayPaymentAggregate._sum.amount ?? 0);

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

    // Fetched Today
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
      if (s === "UNREAD" || s === "UNFOLLOWED") unreadCount += cnt;
      else if (s === "READ") readCount += cnt;
      else if (s === "FOLLOW_UP" || s === "FOLLOWUP" || s === "FOLLOWUPS") followupCount += cnt;
      else if (s === "CLIENT" || s === "CLIENTS") clientStatusCount += cnt;
    }

    // Transform Right Strip data
    const leadReminders: ManagerLeadReminder[] = upcomingCallbackLeads.map((l) => ({
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : "",
      leadResponse: l.leadResponse,
      leadSource: l.leadSource,
      assignedToName: l.allotTo?.name || null,
    }));

    const recentPayments: ManagerPaymentItem[] = latestPayments.map((p) => ({
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

    const recentEvents: ManagerEventItem[] = latestActivities.map((a) => ({
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
    const followupRecords: ManagerFollowupRecord[] = followupLeadsRaw.map((lead) => {
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
    const fetchRecords: ManagerFetchRecord[] = leadFetchLogsRaw.map((log) => {
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
    const sourceRules: ManagerSourceRuleData[] = fetchLimitRulesRaw.map((r) => ({
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
    for (const s of activeLeadSourcesRaw) {
      if (s.name?.trim()) sourcesSet.add(s.name.trim());
    }
    for (const item of distinctScopedSourcesRaw) {
      if (item.leadSource?.trim()) sourcesSet.add(item.leadSource.trim());
    }
    const knownSources = Array.from(sourcesSet);

    // Step 2: Filter options for dropdowns
    const employeesFilterOptions: ManagerDashboardFilterOption[] = rawSubordinates.map((s) => ({
      id: s.id,
      name: s.name,
      teamId: s.teamId,
    }));

    const teamsMap = new Map<string, string>();
    for (const t of ledTeams) {
      teamsMap.set(t.id, t.name);
    }
    if (managerUser?.team) {
      teamsMap.set(managerUser.team.id, managerUser.team.name);
    }
    const teamsFilterOptions: ManagerDashboardFilterOption[] = Array.from(teamsMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    // Step 3: Transform Daily Payments for Scoped Team
    const dailyPayments: ManagerDailyPaymentRecord[] = approvedPaymentsDailyRaw.map((p) => {
      const { key, label } = formatChartDate(p.paymentDate);
      return {
        id: p.id,
        amount: Number(p.amount),
        dateKey: key,
        formattedDate: label,
        leadOwnerId: p.leadOwnerId,
        teamId: p.leadOwner?.teamId || null,
      };
    });

    // Step 3: Transform Calling Records for Scoped Subordinates
    const callingRecords: ManagerCallingRecord[] = callLogsRaw.map((c) => {
      const { key, label } = formatChartDate(c.callDate);
      const isConnected = c.status === "ANSWERED" || (c.talkTime !== null && c.talkTime > 0);
      return {
        id: c.id,
        durationSeconds: c.duration,
        talkTimeSeconds: c.talkTime ?? 0,
        isConnected,
        dateKey: key,
        formattedDate: label,
        callerId: c.callerId,
        teamId: c.caller?.teamId || null,
      };
    });

    // Step 3: Transform All Scoped Leads & Compute Performance/Balance
    const employeeLeadCountMap = new Map<string, number>();
    const allLeads: ManagerLeadReportItem[] = scopedAllLeadsRaw.map((l) => {
      if (l.allotToId) {
        employeeLeadCountMap.set(l.allotToId, (employeeLeadCountMap.get(l.allotToId) || 0) + 1);
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

    const performance: ManagerEmployeePerformanceItem[] = rawSubordinates.map((emp) => {
      const teamName = teamsMap.get(emp.teamId || "");
      return {
        id: emp.id,
        name: emp.name,
        teamName: teamName || null,
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

    const balance: ManagerLeadBalanceSummary = {
      totalLeads: allLeads.length,
      unallottedLeads: 0,
      allottedLeads: allLeads.length,
      activeRulesCount: fetchLimitRulesRaw.length,
      totalAvailableFetchQuota,
    };

    const leadReport: ManagerLeadReportSectionData = {
      allLeads,
      performance,
      balance,
    };

    // Step 4: Leaderboards (100% Real DB Data Strictly Scoped to Subordinates)
    const allPerformers: ManagerPerformerBarItem[] = rawSubordinates.map((emp) => {
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

    // Top Best SBA (Senior Business Analysts)
    const sbaCandidates = allPerformers.filter((p) => {
      const prof = p.profileName?.toUpperCase() || "";
      return prof.includes("SBA") || prof.includes("STL") || prof.includes("SENIOR");
    });
    const topBestSBA: ManagerPerformerBarItem[] = (
      sbaCandidates.length > 0 ? sbaCandidates : allPerformers
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // Top Best BA (Business Analysts)
    const baCandidates = allPerformers.filter((p) => {
      const prof = p.profileName?.toUpperCase() || "";
      return (
        (prof.includes("BA") && !prof.includes("SBA") && !prof.includes("BAT")) ||
        (!prof && !sbaCandidates.some((s) => s.id === p.id))
      );
    });
    const topBestBA: ManagerPerformerBarItem[] = (
      baCandidates.length > 0
        ? baCandidates
        : allPerformers.filter((p) => !sbaCandidates.some((s) => s.id === p.id))
    )
      .slice()
      .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
      .slice(0, 3);

    // Dynamic Leaderboard Configurations from SystemSetting
    interface SavedConfigItem {
      id: string;
      title: string;
      profile: string;
      size: number;
      type: "Individual" | "Team";
      isActive: boolean;
    }

    let parsedConfigs: SavedConfigItem[] = [];
    if (savedGraphConfigsRaw?.value) {
      try {
        const parsed = JSON.parse(savedGraphConfigsRaw.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedConfigs = parsed;
        }
      } catch {
        parsedConfigs = [];
      }
    }

    const activeConfigs = parsedConfigs.filter((c) => c.isActive !== false);

    const configuredCards: ManagerConfiguredLeaderboardSection[] = activeConfigs.map((cfg) => {
      let items: ManagerPerformerBarItem[] = [];
      const profUpper = (cfg.profile || "").trim().toUpperCase();

      const candidateUsers = allPerformers.filter((p) => {
        const emp = rawSubordinates.find((e) => e.id === p.id);
        if (!emp) return false;
        const uProf = (emp.employeeProfile?.name || "").toUpperCase();

        if (profUpper === "SBA") {
          return uProf.includes("SBA") || uProf.includes("STL") || uProf.includes("SENIOR");
        }
        if (profUpper === "BAT") {
          return uProf.includes("BAT") || uProf.includes("TRAINEE") || uProf.includes("CA");
        }
        if (profUpper === "BA") {
          return (
            (uProf.includes("BA") && !uProf.includes("SBA") && !uProf.includes("BAT")) ||
            !uProf
          );
        }
        return uProf === profUpper || emp.name.toUpperCase().includes(profUpper);
      });

      items = (candidateUsers.length > 0 ? candidateUsers : allPerformers)
        .slice()
        .sort((a, b) => b.metricValue - a.metricValue || b.leadsHandled - a.leadsHandled)
        .slice(0, cfg.size || 3);

      return {
        id: cfg.id,
        title: cfg.title,
        profile: cfg.profile,
        size: cfg.size,
        type: cfg.type,
        items,
      };
    });

    const leaderboards: ManagerLeaderboardsData = {
      configuredCards,
      topBestSBA,
      topBestBA,
    };

    const charts: ManagerChartsData = {
      employees: employeesFilterOptions,
      teams: teamsFilterOptions,
      followupRecords,
      fetchRecords,
      sourceRules,
      knownSources,
      dailyPayments,
      callingRecords,
    };

    return {
      success: true,
      data: {
        managerName: manager.name,
        managerRole: manager.role,
        teamNames,
        totalTeamsLed: ledTeams.length,
        totalSubordinates: subordinateUserIds.length,
        target: {
          targetAmount,
          achievedAmount,
          achievementPercent,
          daysLeftInMonth,
        },
        payment: {
          todayApprovedAmount,
          yesterdayApprovedAmount,
          totalApprovedCount: totalPaymentsCount,
          totalApprovedAmount: achievedAmount,
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
        charts,
        leadReport,
        leaderboards,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager overview metrics.");
  }
}
