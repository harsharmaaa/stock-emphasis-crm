"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CallReportItem {
  id: string; // userId
  name: string;
  ext: string;
  outgoingCalls: number;
  outgoingConnected: number;
  outgoingDisplay: string; // e.g. "28/52" or "10"
  outgoingTimeSeconds: number;
  outgoingTime: string; // "HH:MM:SS"
  incomingCalls: number;
  incomingTimeSeconds: number;
  incomingTime: string; // "HH:MM:SS"
  totalCalls: number;
  totalTimeSeconds: number;
  totalTime: string; // "HH:MM:SS"
}

export interface GetCallReportFilterOptions {
  employees: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  extensions: string[];
}

export interface GetCallReportInput {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  teamId?: string;
  extension?: string;
  search?: string;
  sortBy?:
    | "name"
    | "ext"
    | "outgoingCalls"
    | "outgoingTimeSeconds"
    | "incomingCalls"
    | "incomingTimeSeconds"
    | "totalCalls"
    | "totalTimeSeconds";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GetCallReportResult {
  success: boolean;
  records?: CallReportItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  summary?: {
    totalOutgoingCalls: number;
    totalIncomingCalls: number;
    totalCalls: number;
    totalDurationSeconds: number;
    totalDurationFormatted: string;
  };
  error?: string;
}

function formatSecondsToHms(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Scoping helper: Computes allowed subordinate agent User IDs and relevant Team IDs
 * for the authenticated manager. Strictly excludes the manager themselves and any managers/admins.
 */
async function getManagerScoping(managerId: string, isAdmin: boolean) {
  if (isAdmin) {
    // For admin: all active EMPLOYEE agents (excluding the admin themselves)
    const adminSubordinates = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        id: { not: managerId },
        isActive: true,
      },
      select: { id: true },
    });
    return {
      isAdmin: true,
      subordinateUserIds: adminSubordinates.map((u) => u.id),
      relevantTeamIds: [],
    };
  }

  const managerUser = await prisma.user.findUnique({
    where: { id: managerId },
    select: {
      teamId: true,
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

  // Strictly exclude manager themselves (id !== managerId) and exclude role: "MANAGER" / role: "ADMIN"
  const subordinates = await prisma.user.findMany({
    where: {
      id: { not: managerId },
      role: { notIn: ["MANAGER", "ADMIN"] },
      isActive: true,
      OR: [
        { managerId },
        ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
      ],
    },
    select: { id: true },
  });

  const subordinateUserIds = subordinates.map((s) => s.id);

  return { isAdmin: false, subordinateUserIds, relevantTeamIds };
}

/**
 * Returns dynamic, 100% database-backed filter options for Call Report.
 * Excludes the manager and shows only subordinate team agents.
 */
export async function getManagerCallReportFiltersAction(): Promise<{
  success: boolean;
  filters?: GetCallReportFilterOptions;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, subordinateUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // 1. Scoped subordinate employees & team members only (manager excluded)
    const userWhere: Prisma.UserWhereInput = {
      id: { in: subordinateUserIds },
      isActive: true,
      role: { notIn: ["MANAGER", "ADMIN"] },
    };

    const scopedUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, callingExtension: true },
      orderBy: { name: "asc" },
    });

    // 2. Scoped teams
    const teamWhere: Prisma.TeamWhereInput = isAdmin
      ? {}
      : { id: { in: relevantTeamIds } };

    const scopedTeams = await prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 3. Extensions from subordinate users and their call logs
    const callLogExtensions = await prisma.callLog.findMany({
      where: {
        extension: { not: null },
        callerId: { in: subordinateUserIds },
      },
      select: { extension: true },
      distinct: ["extension"],
    });

    const extSet = new Set<string>();
    scopedUsers.forEach((u) => {
      if (u.callingExtension?.trim()) extSet.add(u.callingExtension.trim());
    });
    callLogExtensions.forEach((c) => {
      if (c.extension?.trim()) extSet.add(c.extension.trim());
    });
    const extensions = Array.from(extSet).sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      filters: {
        employees: scopedUsers.map((u) => ({ id: u.id, name: u.name })),
        teams: scopedTeams,
        extensions,
      },
    };
  } catch (error) {
    return handleActionError(error, "Failed to load call report filter options.");
  }
}

/**
 * Retrieves dynamically aggregated agent calling metrics strictly scoped to the manager's subordinate agents.
 * Excludes the manager themselves.
 */
export async function getManagerCallReportAction(
  input: GetCallReportInput = {}
): Promise<GetCallReportResult> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { subordinateUserIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // 1. Determine eligible agent users strictly scoped to subordinate team employees
    const agentWhere: Prisma.UserWhereInput = {
      id: { in: subordinateUserIds },
      isActive: true,
      role: { notIn: ["MANAGER", "ADMIN"] },
    };

    if (input.employeeId && input.employeeId.trim()) {
      const targetEmpId = input.employeeId.trim();
      if (subordinateUserIds.includes(targetEmpId)) {
        agentWhere.id = targetEmpId;
      } else {
        // If an unauthorized employeeId was supplied, match nothing
        agentWhere.id = "unauthorized_or_invalid_id";
      }
    }

    if (input.teamId && input.teamId.trim()) {
      agentWhere.teamId = input.teamId.trim();
    }

    if (input.extension && input.extension.trim()) {
      agentWhere.callingExtension = input.extension.trim();
    }

    const eligibleAgents = await prisma.user.findMany({
      where: agentWhere,
      select: {
        id: true,
        name: true,
        callingExtension: true,
        teamId: true,
      },
      orderBy: { name: "asc" },
    });

    const agentIds = eligibleAgents.map((a) => a.id);

    // If no subordinate agents match or exist, return empty report cleanly
    if (agentIds.length === 0) {
      return {
        success: true,
        records: [],
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: input.pageSize || 10,
        summary: {
          totalOutgoingCalls: 0,
          totalIncomingCalls: 0,
          totalCalls: 0,
          totalDurationSeconds: 0,
          totalDurationFormatted: "00:00:00",
        },
      };
    }

    // 2. Build CallLog where clause
    const callWhere: Prisma.CallLogWhereInput = {
      callerId: { in: agentIds },
    };

    if (input.fromDate && input.fromDate.trim()) {
      const from = new Date(input.fromDate.trim());
      from.setHours(0, 0, 0, 0);
      callWhere.callDate = { ...(callWhere.callDate as object), gte: from };
    }

    if (input.toDate && input.toDate.trim()) {
      const to = new Date(input.toDate.trim());
      to.setHours(23, 59, 59, 999);
      callWhere.callDate = { ...(callWhere.callDate as object), lte: to };
    }

    if (input.extension && input.extension.trim()) {
      callWhere.extension = input.extension.trim();
    }

    // 3. Fetch call logs for aggregation
    const callLogs = await prisma.callLog.findMany({
      where: callWhere,
      select: {
        callerId: true,
        callType: true,
        status: true,
        duration: true,
        talkTime: true,
        extension: true,
      },
    });

    // 4. Map call logs to agent buckets
    const agentStats = new Map<
      string,
      {
        outgoingCalls: number;
        outgoingConnected: number;
        outgoingTimeSeconds: number;
        incomingCalls: number;
        incomingTimeSeconds: number;
        totalCalls: number;
        totalTimeSeconds: number;
        observedExtension?: string;
      }
    >();

    // Initialize all eligible agents
    eligibleAgents.forEach((agent) => {
      agentStats.set(agent.id, {
        outgoingCalls: 0,
        outgoingConnected: 0,
        outgoingTimeSeconds: 0,
        incomingCalls: 0,
        incomingTimeSeconds: 0,
        totalCalls: 0,
        totalTimeSeconds: 0,
        observedExtension: agent.callingExtension || undefined,
      });
    });

    let totalOutgoing = 0;
    let totalIncoming = 0;
    let totalDurationAll = 0;

    callLogs.forEach((log) => {
      let stats = agentStats.get(log.callerId);
      if (!stats) {
        stats = {
          outgoingCalls: 0,
          outgoingConnected: 0,
          outgoingTimeSeconds: 0,
          incomingCalls: 0,
          incomingTimeSeconds: 0,
          totalCalls: 0,
          totalTimeSeconds: 0,
          observedExtension: log.extension || undefined,
        };
        agentStats.set(log.callerId, stats);
      }

      if (log.extension && !stats.observedExtension) {
        stats.observedExtension = log.extension;
      }

      const typeUpper = (log.callType || "").toUpperCase();
      const statusUpper = (log.status || "").toUpperCase();
      const timeVal = log.talkTime > 0 ? log.talkTime : log.duration;

      stats.totalCalls += 1;
      stats.totalTimeSeconds += timeVal;
      totalDurationAll += timeVal;

      if (typeUpper === "OUTGOING") {
        stats.outgoingCalls += 1;
        totalOutgoing += 1;
        stats.outgoingTimeSeconds += timeVal;
        if (statusUpper === "ANSWERED" || log.talkTime > 0) {
          stats.outgoingConnected += 1;
        }
      } else if (typeUpper === "INCOMING") {
        stats.incomingCalls += 1;
        totalIncoming += 1;
        stats.incomingTimeSeconds += timeVal;
      }
    });

    // 5. Build raw report rows
    let rows: CallReportItem[] = eligibleAgents.map((agent) => {
      const stats = agentStats.get(agent.id) || {
        outgoingCalls: 0,
        outgoingConnected: 0,
        outgoingTimeSeconds: 0,
        incomingCalls: 0,
        incomingTimeSeconds: 0,
        totalCalls: 0,
        totalTimeSeconds: 0,
      };

      const ext = stats.observedExtension || agent.callingExtension || "—";

      let outgoingDisplay = String(stats.outgoingCalls);
      if (stats.outgoingConnected > 0 && stats.outgoingConnected < stats.outgoingCalls) {
        outgoingDisplay = `${stats.outgoingConnected}/${stats.outgoingCalls}`;
      }

      return {
        id: agent.id,
        name: agent.name,
        ext,
        outgoingCalls: stats.outgoingCalls,
        outgoingConnected: stats.outgoingConnected,
        outgoingDisplay,
        outgoingTimeSeconds: stats.outgoingTimeSeconds,
        outgoingTime: formatSecondsToHms(stats.outgoingTimeSeconds),
        incomingCalls: stats.incomingCalls,
        incomingTimeSeconds: stats.incomingTimeSeconds,
        incomingTime: formatSecondsToHms(stats.incomingTimeSeconds),
        totalCalls: stats.totalCalls,
        totalTimeSeconds: stats.totalTimeSeconds,
        totalTime: formatSecondsToHms(stats.totalTimeSeconds),
      };
    });

    // 6. Global Search Filter
    if (input.search && input.search.trim()) {
      const q = input.search.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.ext.toLowerCase().includes(q)
      );
    }

    // 7. Multi-column Sorting
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";
    const sortBy = input.sortBy || "totalCalls";

    rows.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "ext") {
        comparison = a.ext.localeCompare(b.ext);
      } else if (sortBy === "outgoingCalls") {
        comparison = a.outgoingCalls - b.outgoingCalls;
      } else if (sortBy === "outgoingTimeSeconds") {
        comparison = a.outgoingTimeSeconds - b.outgoingTimeSeconds;
      } else if (sortBy === "incomingCalls") {
        comparison = a.incomingCalls - b.incomingCalls;
      } else if (sortBy === "incomingTimeSeconds") {
        comparison = a.incomingTimeSeconds - b.incomingTimeSeconds;
      } else if (sortBy === "totalTimeSeconds") {
        comparison = a.totalTimeSeconds - b.totalTimeSeconds;
      } else {
        comparison = a.totalCalls - b.totalCalls;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // 8. Server-side Pagination
    const totalCount = rows.length;
    const pageSize = Math.max(1, Math.min(100, input.pageSize || 10));
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.max(1, Math.min(totalPages, input.page || 1));
    const skip = (page - 1) * pageSize;
    const paginatedRows = rows.slice(skip, skip + pageSize);

    return {
      success: true,
      records: paginatedRows,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      summary: {
        totalOutgoingCalls: totalOutgoing,
        totalIncomingCalls: totalIncoming,
        totalCalls: totalOutgoing + totalIncoming,
        totalDurationSeconds: totalDurationAll,
        totalDurationFormatted: formatSecondsToHms(totalDurationAll),
      },
    };
  } catch (error) {
    return handleActionError(error, "Failed to load call report.");
  }
}
