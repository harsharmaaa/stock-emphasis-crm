"use server";

import { requireEmployeeSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { getSharedLeaderboardsData } from "@/src/features/dashboard/leaderboard-service";
import type {
  EmployeeOverviewStep1Data,
  EmployeeLeadReminder,
  EmployeePaymentItem,
  EmployeeEventItem,
  EmployeeProfileQuotaData,
  EmployeeFollowupPoint,
  EmployeeFetchSourcePoint,
  EmployeeDailyPaymentPoint,
  EmployeeCallingPoint,
  EmployeeChartsData,
  EmployeeLeadReportItem,
  EmployeeMonthlySalesItem,
  EmployeePersonalPerformanceData,
  EmployeeTabbedReportsData,
} from "./overview-types";

// Helper to format chart date keys and labels
function formatChartDate(d: Date): { key: string; label: string } {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const key = `${yyyy}-${mm}-${dd}`;

  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = d.toLocaleDateString("en-US", { month: "short" });
  const yearShort = String(d.getFullYear()).slice(-2);
  const label = `${dayStr} ${monthStr} ${yearShort}`;

  return { key, label };
}

/**
 * Retrieves full overview metrics strictly self-scoped to the authenticated employee.
 *
 * Strict Rules:
 * - Leads: allotToId === employee.id
 * - Payments: leadOwnerId === employee.id
 * - Target: user.employeeTarget
 * - Callbacks/Followups: allotToId === employee.id
 * - Activity logs: actorId === employee.id OR targetUserId === employee.id
 * - Calling: callerId === employee.id
 * - Fetch quota & logs: userId === employee.id
 * - Zero cross-employee data exposure
 * - Zero dummy / mock data; 100% PostgreSQL backed
 */
export async function getEmployeeDashboardStep1Action(): Promise<{
  success: boolean;
  data?: EmployeeOverviewStep1Data;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeftInMonth = Math.max(0, daysInMonth - now.getDate());

    // 1. Fetch employee's own profile and target configuration
    const [dbUser, announcementSetting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: employee.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeTarget: true,
          team: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          employeeProfileId: true,
          employeeProfile: {
            select: {
              id: true,
              name: true,
              clientLimit: true,
              invoiceLimit: true,
              salesLimit: true,
              description: true,
            },
          },
        },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "ANNOUNCEMENT_BANNER" },
        select: { value: true },
      }),
    ]);

    if (!dbUser) {
      return { success: false, error: "Employee account not found in database." };
    }

    const employeeId = dbUser.id;

    // 2. Execute strictly-scoped parallel queries bounded to employeeId
    const [
      achievedThisMonthAggregate,
      todayApprovedPaymentAggregate,
      lastApprovedPaymentBeforeToday,
      todayApprovedPaymentFallback,
      totalApprovedPaymentsCount,
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
      latestApprovedPayments,
      latestActivities,
      // Step 2: 4 Analytical Charts Queries
      followupLeadsRaw,
      fetchLimitRulesRaw,
      leadFetchLogsRaw,
      approvedPaymentsMonthlyRaw,
      callLogsRaw,
      // Step 3: Tabbed Reports Queries (All Scoped Leads & Approved Sales)
      allScopedLeadsRaw,
      allApprovedSalesRaw,
    ] = await Promise.all([
      // 1. Approved Payments this month (Achieved)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),

      // 2. Approved Payments Today
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
          paymentDate: { gte: startOfDay, lte: endOfDay },
        },
      }),

      // 3. Last Approved Payment before today (for "X Days ago")
      prisma.payment.findFirst({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
          paymentDate: { lt: startOfDay },
        },
        orderBy: { paymentDate: "desc" },
        select: { amount: true, paymentDate: true },
      }),

      // 4. Fallback latest approved payment if none before today
      prisma.payment.findFirst({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
        },
        orderBy: { paymentDate: "desc" },
        select: { amount: true, paymentDate: true },
      }),

      // 5. Total Approved Payments Count
      prisma.payment.count({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
        },
      }),

      // 6. Total Clients (Status CLIENT)
      prisma.lead.count({
        where: {
          status: "CLIENT",
          allotToId: employeeId,
        },
      }),

      // 7. New Clients This Month
      prisma.lead.count({
        where: {
          status: "CLIENT",
          allotToId: employeeId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // 8. Expired Invoices Count (indicative of expired client cohort)
      prisma.invoice.count({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
          lead: { allotToId: employeeId },
        },
      }),

      // 9. Total Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { not: null },
          allotToId: employeeId,
        },
      }),

      // 10. Today Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gte: startOfDay, lte: endOfDay },
          allotToId: employeeId,
        },
      }),

      // 11. Pending / Overdue Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { lt: startOfDay },
          allotToId: employeeId,
        },
      }),

      // 12. Upcoming Callbacks
      prisma.lead.count({
        where: {
          callbackDate: { gt: endOfDay },
          allotToId: employeeId,
        },
      }),

      // 13. Total Follow-ups
      prisma.lead.count({
        where: {
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          allotToId: employeeId,
        },
      }),

      // 14. New Follow-ups Today
      prisma.lead.count({
        where: {
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          allotToId: employeeId,
          createdAt: { gte: startOfDay },
        },
      }),

      // 15. Updated Follow-ups Today
      prisma.lead.count({
        where: {
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          allotToId: employeeId,
          updatedAt: { gte: startOfDay },
          createdAt: { lt: startOfDay },
        },
      }),

      // 16. Alloted Today Activity (Target: employee)
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_ALLOTMENT", "LEAD_BULK_ALLOT"] },
          targetUserId: employeeId,
          createdAt: { gte: startOfDay },
        },
      }),

      // 17. Transferred Today Activity
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_BULK_TRANSFER", "LEAD_TRANSFER"] },
          createdAt: { gte: startOfDay },
          OR: [{ actorId: employeeId }, { targetUserId: employeeId }],
        },
      }),

      // 18. Fetched Today from LeadFetchLog
      prisma.leadFetchLog.aggregate({
        _sum: { leadsCount: true },
        where: {
          userId: employeeId,
          createdAt: { gte: startOfDay },
        },
      }),

      // 19. Fetched Today ActivityLog fallback
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_FETCH", "LEAD_FETCHED"] },
          actorId: employeeId,
          createdAt: { gte: startOfDay },
        },
      }),

      // 20. Updated Today Activity (Actor: employee)
      prisma.activityLog.count({
        where: {
          action: { in: ["LEAD_UPDATED", "LEAD_CALL_UPDATED", "LEAD_DETAILS_UPDATED"] },
          actorId: employeeId,
          createdAt: { gte: startOfDay },
        },
      }),

      // 21. Status Groups for employee's assigned leads
      prisma.lead.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: {
          allotToId: employeeId,
        },
      }),

      // 22. Upcoming / Today Callback Leads for Reminders Strip
      prisma.lead.findMany({
        where: {
          callbackDate: { not: null },
          allotToId: employeeId,
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
        },
      }),

      // 23. Latest Approved Payments for Payments Strip
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
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
        },
      }),

      // 24. Latest Personal Activity Events
      prisma.activityLog.findMany({
        where: {
          OR: [{ actorId: employeeId }, { targetUserId: employeeId }],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
          actor: { select: { name: true } },
          targetUser: { select: { name: true } },
        },
      }),

      // 25. Step 2: Followup Leads Raw Data (Strictly own leads)
      prisma.lead.findMany({
        where: {
          allotToId: employeeId,
          OR: [
            { status: { in: ["FOLLOW_UP", "FOLLOWUPS"] } },
            { callbackDate: { not: null } },
            { leadResponse: { in: ["callback", "Follow Up", "Interested", "Call Back"] } },
          ],
        },
        select: {
          id: true,
          callbackDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
      }),

      // 26. Step 2: Fetch Limit Rules (Applicable to employee's profile/assignment or global pool)
      prisma.fetchLimitRule.findMany({
        select: {
          id: true,
          leadSource: true,
          fetchLimit: true,
          availableLimit: true,
          fetchCount: true,
        },
      }),

      // 27. Step 2: Lead Fetch Logs (Strictly own fetches)
      prisma.leadFetchLog.findMany({
        where: {
          userId: employeeId,
        },
        select: {
          id: true,
          leadSource: true,
          leadsCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // 28. Step 2: Approved Payments Daily across current month (Strictly own payments)
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
        },
        orderBy: { paymentDate: "asc" },
      }),

      // 29. Step 2: Call Logs (Strictly own outbound/inbound calls)
      prisma.callLog.findMany({
        where: {
          callerId: employeeId,
        },
        select: {
          id: true,
          duration: true,
          talkTime: true,
          status: true,
          callDate: true,
        },
        orderBy: { callDate: "asc" },
      }),

      // 30. Step 3: All Scoped Leads for Lead Report & Records (Strictly own leads)
      prisma.lead.findMany({
        where: {
          allotToId: employeeId,
        },
        select: {
          id: true,
          name: true,
          mobile: true,
          leadSource: true,
          status: true,
          leadResponse: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),

      // 31. Step 3: All Approved Sales for Monthly Sales Report (Strictly own collections)
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          leadOwnerId: employeeId,
        },
        orderBy: { paymentDate: "desc" },
        take: 50,
        select: {
          id: true,
          serialNo: true,
          amount: true,
          status: true,
          paymentDate: true,
          modeName: true,
          paymentType: true,
          invoiceNumber: true,
          transactionId: true,
          lead: {
            select: { name: true, mobile: true },
          },
        },
      }),
    ]);

    // Target Calculations
    const targetAmount = dbUser.employeeTarget || 0;
    const achievedAmount = Number(achievedThisMonthAggregate._sum.amount ?? 0);
    const achievementPercent =
      targetAmount > 0
        ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
        : achievedAmount > 0
          ? 100
          : 0;

    // Payment Calculations
    const todayApprovedAmount = Number(todayApprovedPaymentAggregate._sum.amount ?? 0);
    const todayApprovedCount = todayApprovedPaymentAggregate._count._all;

    let lastPaymentAmount = 0;
    let lastPaymentDaysAgo: number | null = null;

    const referencePastPayment = lastApprovedPaymentBeforeToday || todayApprovedPaymentFallback;
    if (referencePastPayment) {
      lastPaymentAmount = Number(referencePastPayment.amount);
      const diffMs = startOfDay.getTime() - new Date(referencePastPayment.paymentDate).getTime();
      lastPaymentDaysAgo = Math.max(
        referencePastPayment === lastApprovedPaymentBeforeToday ? 1 : 0,
        Math.floor(diffMs / (1000 * 60 * 60 * 24))
      );
    }

    // Clients Breakdown
    const activeClients = Math.max(0, clientCount - expiredInvoicesCount);

    // Follow-ups Breakdown
    const pendingFollowups = Math.max(
      0,
      totalFollowupsCount - updatedFollowupsCount - newFollowupsCount
    );

    // Fetched Today Count
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

    // Transform Reminders Strip Data
    const leadReminders: EmployeeLeadReminder[] = upcomingCallbackLeads.map((l) => ({
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : "",
      leadResponse: l.leadResponse,
      leadSource: l.leadSource,
    }));

    const recentPayments: EmployeePaymentItem[] = latestApprovedPayments.map((p) => ({
      id: p.id,
      serialNo: p.serialNo,
      amount: Number(p.amount),
      status: p.status,
      paymentDate: p.paymentDate.toISOString(),
      modeName: p.modeName,
      paymentType: p.paymentType,
      leadName: p.lead.name,
      leadMobile: p.lead.mobile,
    }));

    const recentEvents: EmployeeEventItem[] = latestActivities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actorName: a.actor?.name || null,
      targetName: a.targetUser?.name || null,
    }));

    // Personal Quota & Conversion Metrics
    const profile = dbUser.employeeProfile;
    const conversionRatePercent =
      totalLeadsCount > 0 ? Number(((clientCount / totalLeadsCount) * 100).toFixed(1)) : 0;

    let roleCode = "BA";
    const profileUpper = profile?.name?.toUpperCase() || "";
    if (profileUpper.includes("SBA") || profileUpper.includes("SENIOR BUSINESS ANALYST")) {
      roleCode = "SBA";
    } else if (profileUpper.includes("BAT") || profileUpper.includes("TRAINEE")) {
      roleCode = "BAT";
    } else if (profileUpper.includes("TL") || profileUpper.includes("TEAM LEAD") || dbUser.role === "MANAGER") {
      roleCode = "TL";
    } else if (profileUpper.includes("AFM") || profileUpper.includes("FLOOR MANAGER")) {
      roleCode = "Team Best AFM";
    } else if (profileUpper.includes("BA") || profileUpper.includes("BUSINESS ANALYST")) {
      roleCode = "BA";
    } else if (profile?.name) {
      roleCode = profile.name;
    }

    const quotaProgress: EmployeeProfileQuotaData = {
      profileName: profile?.name || null,
      profileDescription: profile?.description || null,
      salesLimit: profile?.salesLimit || 0,
      clientLimit: profile?.clientLimit || 0,
      invoiceLimit: profile?.invoiceLimit || 0,
      conversionRatePercent,
      totalAssignedLeads: totalLeadsCount,
      totalClients: clientCount,
      roleCode,
    };

    // Step 2: Transform Data for the 4 Analytical Charts
    const followupMap = new Map<string, { key: string; label: string; count: number }>();
    for (const lead of followupLeadsRaw) {
      const targetDate = lead.callbackDate || lead.updatedAt || lead.createdAt;
      const { key, label } = formatChartDate(new Date(targetDate));
      const existing = followupMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        followupMap.set(key, { key, label, count: 1 });
      }
    }
    const followupPoints: EmployeeFollowupPoint[] = Array.from(followupMap.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    const startOfTodayMs = startOfDay.getTime();
    const fetchedMap = new Map<string, { today: number; total: number }>();
    let totalFetchesAcrossTime = 0;
    for (const log of leadFetchLogsRaw) {
      const logTime = new Date(log.createdAt).getTime();
      const existing = fetchedMap.get(log.leadSource) || { today: 0, total: 0 };
      if (logTime >= startOfTodayMs) {
        existing.today += log.leadsCount;
      }
      existing.total += log.leadsCount;
      totalFetchesAcrossTime += log.leadsCount;
      fetchedMap.set(log.leadSource, existing);
    }

    const rulesMap = new Map<string, number>();
    for (const rule of fetchLimitRulesRaw) {
      if (rule.leadSource?.trim()) {
        rulesMap.set(rule.leadSource.trim(), rule.fetchLimit);
      }
    }

    const standardSources = [
      "Fresh Lead",
      "SEO",
      "Premium Lead",
      "HNI Lead",
      "Web Lead",
      "PMS",
      "Emphasis",
      "Live",
    ];

    const sourcesSet = new Set<string>(standardSources);
    for (const r of fetchLimitRulesRaw) {
      if (r.leadSource?.trim()) sourcesSet.add(r.leadSource.trim());
    }
    for (const l of leadFetchLogsRaw) {
      if (l.leadSource?.trim()) sourcesSet.add(l.leadSource.trim());
    }
    const sourcesToShow = Array.from(sourcesSet).slice(0, 10);

    const fetchPoints: EmployeeFetchSourcePoint[] = sourcesToShow.map((source) => {
      const counts = fetchedMap.get(source) || { today: 0, total: 0 };
      const limit = rulesMap.get(source) || 0;
      return {
        source,
        fetchLimit: limit,
        todayFetched: counts.today,
        totalFetched: counts.total,
      };
    });

    const paymentDailyMap = new Map<string, { key: string; label: string; amount: number }>();
    for (const p of approvedPaymentsMonthlyRaw) {
      const { key, label } = formatChartDate(new Date(p.paymentDate));
      const existing = paymentDailyMap.get(key);
      if (existing) {
        existing.amount += Number(p.amount);
      } else {
        paymentDailyMap.set(key, { key, label, amount: Number(p.amount) });
      }
    }
    const paymentPoints: EmployeeDailyPaymentPoint[] = Array.from(paymentDailyMap.values()).sort(
      (a, b) => a.key.localeCompare(b.key)
    );

    const callingMap = new Map<
      string,
      { key: string; label: string; hours: number; connectedCalls: number }
    >();
    for (const c of callLogsRaw) {
      const { key, label } = formatChartDate(new Date(c.callDate));
      const isConnected = c.status === "ANSWERED" || (c.talkTime !== null && c.talkTime > 0);
      const existing = callingMap.get(key) || {
        key,
        label,
        hours: 0,
        connectedCalls: 0,
      };
      existing.hours += (c.duration || 0) / 3600;
      if (isConnected) {
        existing.connectedCalls += 1;
      }
      callingMap.set(key, existing);
    }
    const callingPoints: EmployeeCallingPoint[] = Array.from(callingMap.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    const charts: EmployeeChartsData = {
      followupPoints,
      fetchPoints,
      paymentPoints,
      callingPoints,
    };

    // ========================================================
    // STEP 3: Transform Tabbed Reports Data (100% Strictly Scoped)
    // ========================================================

    const distinctOwnSourcesSet = new Set<string>();
    const leads: EmployeeLeadReportItem[] = allScopedLeadsRaw.map((l) => {
      if (l.leadSource?.trim()) {
        distinctOwnSourcesSet.add(l.leadSource.trim());
      }
      return {
        id: l.id,
        name: l.name,
        mobile: l.mobile,
        leadSource: l.leadSource,
        status: l.status,
        leadResponse: l.leadResponse,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      };
    });

    const sources = Array.from(distinctOwnSourcesSet).sort();

    const sales: EmployeeMonthlySalesItem[] = allApprovedSalesRaw.map((s) => ({
      id: s.id,
      serialNo: s.serialNo,
      amount: Number(s.amount),
      status: s.status,
      paymentDate: s.paymentDate.toISOString(),
      modeName: s.modeName,
      paymentType: s.paymentType,
      invoiceNumber: s.invoiceNumber,
      transactionId: s.transactionId,
      leadName: s.lead.name,
      leadMobile: s.lead.mobile,
    }));

    const performance: EmployeePersonalPerformanceData = {
      assignedLeadsCount: totalLeadsCount,
      followupsCount: totalFollowupsCount,
      fetchesCount: totalFetchesAcrossTime > 0 ? totalFetchesAcrossTime : fetchedToday,
      approvedSalesAmount: achievedAmount,
      targetAmount,
      achievementPercent,
      conversionRatePercent,
      activeClientsCount: activeClients,
    };

    const tabbedReports: EmployeeTabbedReportsData = {
      leads,
      sources,
      sales,
      performance,
    };

    // Shared Profile Best Performers from EMPLOYEE_GRAPH_CONFIGS
    const leaderboards = await getSharedLeaderboardsData(startOfMonth, endOfMonth);

    return {
      success: true,
      data: {
        employeeId: dbUser.id,
        employeeName: dbUser.name,
        employeeEmail: dbUser.email,
        teamName: dbUser.team?.name || null,
        departmentName: dbUser.department?.name || null,
        target: {
          targetAmount,
          achievedAmount,
          achievementPercent,
          daysLeftInMonth,
        },
        payment: {
          todayApprovedAmount,
          todayApprovedCount,
          lastPaymentAmount,
          lastPaymentDaysAgo,
          totalApprovedCount: totalApprovedPaymentsCount,
        },
        clients: {
          newThisMonth: newClientsThisMonth,
          activeClients,
          expiredClients: expiredInvoicesCount,
          totalClients: clientCount,
        },
        callbacks: {
          pendingCallbacks: pendingCallbacksCount,
          todayCallbacks: todayCallbacksCount,
          upcomingCallbacks: upcomingCallbacksCount,
          totalCallbacks: totalCallbacksCount,
        },
        followups: {
          newFollowups: newFollowupsCount,
          pendingFollowups,
          updatedFollowups: updatedFollowupsCount,
          totalFollowups: totalFollowupsCount,
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
          announcementBanner: announcementSetting?.value || null,
        },
        quotaProgress,
        charts,
        tabbedReports,
        leaderboards,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load employee overview.");
  }
}
