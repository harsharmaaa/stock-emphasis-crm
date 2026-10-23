"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import type { Role } from "@prisma/client";

export interface SafeActivityLog {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
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

export interface GetActivityLogsParams {
  page?: number;
  pageSize?: number;
  actionFilter?: string;
}

export async function getActivityLogsAction(
  params: GetActivityLogsParams = {}
): Promise<{
  success: boolean;
  logs?: SafeActivityLog[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 15));
    const actionFilter = params.actionFilter?.trim();

    const where = actionFilter && actionFilter !== "ALL"
      ? { action: actionFilter }
      : {};

    const [totalCount, rawLogs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          targetTeam: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const logs: SafeActivityLog[] = rawLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor,
      targetUser: log.targetUser,
      targetTeam: log.targetTeam,
    }));

    return {
      success: true,
      logs,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      currentPage: page,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load audit logs. An unexpected error occurred.");
  }
}
