"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import type { Role } from "@prisma/client";

export interface ManagerSubordinate {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  team: {
    id: string;
    name: string;
  } | null;
}

export interface ManagerTeam {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  membersCount: number;
  activeMembersCount: number;
  members: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
  }[];
}

export interface ManagerActivityLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  targetTeam: {
    id: string;
    name: string;
  } | null;
}

export interface ManagerOverviewData {
  managerName: string;
  managerEmail: string;
  totalTeamsLed: number;
  totalSubordinates: number;
  activeSubordinates: number;
  inactiveSubordinates: number;
  teams: ManagerTeam[];
  directReports: ManagerSubordinate[];
  recentActivities: ManagerActivityLog[];
  announcementBanner: string | null;
}

/**
 * Retrieves high-level operational overview for the authenticated manager.
 * Scoped strictly to teams led by the manager and direct subordinate staff.
 */
export async function getManagerOverviewAction(): Promise<{
  success: boolean;
  data?: ManagerOverviewData;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    // 1. Fetch led teams
    const rawTeams = await prisma.team.findMany({
      where: { leaderId: manager.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch direct reports
    const rawDirectReports = await prisma.user.findMany({
      where: { managerId: manager.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 3. Fetch announcement banner
    const announcementSetting = await prisma.systemSetting.findUnique({
      where: { key: "ANNOUNCEMENT_BANNER" },
      select: { value: true },
    });

    // Collect IDs for strictly-scoped activity log filter
    const subordinateIds = rawDirectReports.map((dr) => dr.id);
    const ledTeamIds = rawTeams.map((t) => t.id);

    // 4. Fetch recent activity within this manager's domain
    const rawActivities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { actorId: manager.id },
          { targetUserId: manager.id },
          ...(subordinateIds.length > 0
            ? [{ targetUserId: { in: subordinateIds } }]
            : []),
          ...(ledTeamIds.length > 0
            ? [{ targetTeamId: { in: ledTeamIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
        targetUser: { select: { id: true, name: true, email: true, role: true } },
        targetTeam: { select: { id: true, name: true } },
      },
    });

    const teams: ManagerTeam[] = rawTeams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      membersCount: t.members.length,
      activeMembersCount: t.members.filter((m) => m.isActive).length,
      members: t.members.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    }));

    const directReports: ManagerSubordinate[] = rawDirectReports.map((dr) => ({
      id: dr.id,
      name: dr.name,
      email: dr.email,
      role: dr.role,
      isActive: dr.isActive,
      createdAt: dr.createdAt.toISOString(),
      team: dr.team,
    }));

    const recentActivities: ManagerActivityLog[] = rawActivities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      targetUser: a.targetUser,
      targetTeam: a.targetTeam,
    }));

    const activeSubordinates = directReports.filter((dr) => dr.isActive).length;
    const inactiveSubordinates = directReports.length - activeSubordinates;

    return {
      success: true,
      data: {
        managerName: manager.name,
        managerEmail: manager.email,
        totalTeamsLed: teams.length,
        totalSubordinates: directReports.length,
        activeSubordinates,
        inactiveSubordinates,
        teams,
        directReports,
        recentActivities,
        announcementBanner: announcementSetting?.value || null,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager operations overview.");
  }
}

/**
 * Retrieves all department teams led by the authenticated manager.
 */
export async function getManagerTeamsAction(): Promise<{
  success: boolean;
  teams?: ManagerTeam[];
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const rawTeams = await prisma.team.findMany({
      where: { leaderId: manager.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const teams: ManagerTeam[] = rawTeams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      membersCount: t.members.length,
      activeMembersCount: t.members.filter((m) => m.isActive).length,
      members: t.members.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    }));

    return {
      success: true,
      teams,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager teams.");
  }
}

export interface GetManagerEmployeesParams {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}

/**
 * Retrieves all employees under this manager's supervisory hierarchy:
 * 1. Direct subordinates with managerId === manager.id
 * 2. Assigned members of teams where leaderId === manager.id
 */
export async function getManagerEmployeesAction(
  params: GetManagerEmployeesParams = {}
): Promise<{
  success: boolean;
  employees?: ManagerSubordinate[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const search = params.search?.trim();
    const statusFilter =
      params.status === "ACTIVE"
        ? true
        : params.status === "INACTIVE"
        ? false
        : undefined;

    // Get all team IDs led by this manager
    const ledTeams = await prisma.team.findMany({
      where: { leaderId: manager.id },
      select: { id: true },
    });
    const ledTeamIds = ledTeams.map((t) => t.id);

    const where = {
      AND: [
        {
          OR: [
            { managerId: manager.id },
            ...(ledTeamIds.length > 0 ? [{ teamId: { in: ledTeamIds } }] : []),
          ],
        },
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
        statusFilter !== undefined ? { isActive: statusFilter } : {},
      ],
    };

    const rawUsers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    const employees: ManagerSubordinate[] = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      team: u.team,
    }));

    return {
      success: true,
      employees,
      totalCount: employees.length,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load subordinate staff.");
  }
}

export interface GetManagerActivityLogsParams {
  page?: number;
  pageSize?: number;
  actionFilter?: string;
}

/**
 * Retrieves audit logs strictly filtered to this manager's operational perimeter.
 * Managers cannot view unassociated logs from other teams or system configurations.
 */
export async function getManagerActivityLogsAction(
  params: GetManagerActivityLogsParams = {}
): Promise<{
  success: boolean;
  logs?: ManagerActivityLog[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 15));
    const actionFilter = params.actionFilter?.trim();

    // 1. Gather all subordinate IDs and led team IDs for strict perimeter isolation
    const [directReports, ledTeams] = await Promise.all([
      prisma.user.findMany({
        where: { managerId: manager.id },
        select: { id: true },
      }),
      prisma.team.findMany({
        where: { leaderId: manager.id },
        select: { id: true },
      }),
    ]);

    const subordinateIds = directReports.map((d) => d.id);
    const ledTeamIds = ledTeams.map((t) => t.id);

    const perimeterCondition = {
      OR: [
        { actorId: manager.id },
        { targetUserId: manager.id },
        ...(subordinateIds.length > 0
          ? [{ targetUserId: { in: subordinateIds } }]
          : []),
        ...(ledTeamIds.length > 0
          ? [{ targetTeamId: { in: ledTeamIds } }]
          : []),
      ],
    };

    const where = {
      AND: [
        perimeterCondition,
        actionFilter && actionFilter !== "ALL" ? { action: actionFilter } : {},
      ],
    };

    const [totalCount, rawLogs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          targetUser: { select: { id: true, name: true, email: true, role: true } },
          targetTeam: { select: { id: true, name: true } },
        },
      }),
    ]);

    const logs: ManagerActivityLog[] = rawLogs.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      targetUser: a.targetUser,
      targetTeam: a.targetTeam,
    }));

    return {
      success: true,
      logs,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      currentPage: page,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager activity logs.");
  }
}
