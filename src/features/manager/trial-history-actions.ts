"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { computeTrialDisplayStatus } from "@/src/features/trials/helpers";

export interface TrialHistoryItem {
  id: string;
  leadId: string;
  clientName: string;
  mobile: string;
  productName: string;
  productId: string;
  createdByName: string;
  createdById: string;
  assignedToName: string | null;
  assignedToId: string | null;
  teamName: string | null;
  teamId: string | null;
  profile: string | null;
  leadSource: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  rawStatus: string;
  displayStatus: "Approved" | "Running" | "Expired" | "Pending" | "Rejected";
  remarks: string | null;
}

export interface GetTrialHistoryFilterOptions {
  profiles: string[];
  employees: { id: string; name: string }[];
  leadSources: string[];
  teams: { id: string; name: string }[];
}

export interface GetTrialHistoryInput {
  profile?: string;
  employeeId?: string;
  leadSource?: string;
  teamId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  search?: string;
  sortBy?: "createdAt" | "clientName" | "productName" | "startDate" | "endDate" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GetTrialHistoryResult {
  success: boolean;
  trials?: TrialHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  error?: string;
}

/**
 * Helper to get the authenticated manager's team and subordinate boundaries.
 */
async function getManagerScoping(managerId: string, isAdmin: boolean) {
  if (isAdmin) {
    return { isAdmin: true, allowedUserIds: [], relevantTeamIds: [] };
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

  const subordinates = await prisma.user.findMany({
    where: {
      OR: [
        { managerId },
        ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
      ],
    },
    select: { id: true },
  });

  const allowedUserIds = Array.from(new Set([managerId, ...subordinates.map((s) => s.id)]));

  return { isAdmin: false, allowedUserIds, relevantTeamIds };
}

/**
 * Retrieves dynamic filter options (profiles, employees, sources, teams)
 * scoped to the manager's team boundaries.
 */
export async function getManagerTrialHistoryFiltersAction(): Promise<{
  success: boolean;
  filters?: GetTrialHistoryFilterOptions;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    const [profilesData, employeesData, sourcesData, teamsData] = await Promise.all([
      // 1. Profiles
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      // 2. Employees scoped to manager's boundary
      prisma.user.findMany({
        where: {
          isActive: true,
          ...(isAdmin ? {} : { id: { in: allowedUserIds } }),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      // 3. Lead sources
      getActiveLeadSourceNames(),
      // 4. Teams scoped to manager's boundary
      prisma.team.findMany({
        where: isAdmin
          ? {}
          : relevantTeamIds.length > 0
          ? { id: { in: relevantTeamIds } }
          : { leaderId: manager.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      filters: {
        profiles: profilesData.map((p) => p.name),
        employees: employeesData,
        leadSources: sourcesData,
        teams: teamsData,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load trial history filter options.");
  }
}

/**
 * Retrieves paginated, sortable, and filterable Trial History records
 * strictly scoped to the manager's team boundaries.
 */
export async function getManagerTrialHistoryAction(
  params: GetTrialHistoryInput = {}
): Promise<GetTrialHistoryResult> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // 1. Base boundary scoping
    const boundaryWhere: Prisma.FreeTrialWhereInput = isAdmin
      ? {}
      : {
          OR: [
            { createdById: { in: allowedUserIds } },
            { assignedToId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
            { lead: { allotToId: { in: allowedUserIds } } },
          ],
        };

    // 2. Construct dynamic filter conditions
    const andConditions: Prisma.FreeTrialWhereInput[] = [boundaryWhere];

    // Filter by Profile
    if (params.profile && params.profile.trim()) {
      const p = params.profile.trim();
      andConditions.push({
        OR: [
          { profile: { equals: p, mode: "insensitive" } },
          { createdBy: { employeeProfile: { name: { equals: p, mode: "insensitive" } } } },
          { assignedTo: { employeeProfile: { name: { equals: p, mode: "insensitive" } } } },
        ],
      });
    }

    // Filter by Employee
    if (params.employeeId && params.employeeId.trim()) {
      const empId = params.employeeId.trim();
      andConditions.push({
        OR: [{ createdById: empId }, { assignedToId: empId }],
      });
    }

    // Filter by Lead Source
    if (params.leadSource && params.leadSource.trim()) {
      const src = params.leadSource.trim();
      andConditions.push({
        lead: {
          leadSource: { equals: src, mode: "insensitive" },
        },
      });
    }

    // Filter by Team
    if (params.teamId && params.teamId.trim()) {
      andConditions.push({
        teamId: params.teamId.trim(),
      });
    }

    // Filter by Date Range (From Date / To Date)
    if (params.fromDate && params.fromDate.trim()) {
      const fDate = new Date(params.fromDate.trim());
      if (!isNaN(fDate.getTime())) {
        fDate.setHours(0, 0, 0, 0);
        andConditions.push({
          OR: [{ createdAt: { gte: fDate } }, { startDate: { gte: fDate } }],
        });
      }
    }

    if (params.toDate && params.toDate.trim()) {
      const tDate = new Date(params.toDate.trim());
      if (!isNaN(tDate.getTime())) {
        tDate.setHours(23, 59, 59, 999);
        andConditions.push({
          OR: [{ createdAt: { lte: tDate } }, { endDate: { lte: tDate } }],
        });
      }
    }

    // Filter by Display Status
    if (params.status && params.status.trim() && params.status.toUpperCase() !== "ALL") {
      const st = params.status.trim().toUpperCase();
      const now = new Date();

      if (st === "APPROVED") {
        andConditions.push({
          status: "APPROVED",
          startDate: { gt: now },
        });
      } else if (st === "RUNNING") {
        andConditions.push({
          status: "APPROVED",
          startDate: { lte: now },
          endDate: { gte: now },
        });
      } else if (st === "EXPIRED" || st === "EXPIRE") {
        andConditions.push({
          OR: [
            { status: "EXPIRED" },
            {
              status: "APPROVED",
              endDate: { lt: now },
            },
          ],
        });
      } else if (st === "PENDING") {
        andConditions.push({ status: "PENDING" });
      } else if (st === "REJECTED") {
        andConditions.push({ status: "REJECTED" });
      }
    }

    // Search Filter (Client Name, Mobile, Product Name, Creator Name)
    if (params.search && params.search.trim()) {
      const query = params.search.trim();
      andConditions.push({
        OR: [
          { lead: { name: { contains: query, mode: "insensitive" } } },
          { lead: { mobile: { contains: query } } },
          { product: { name: { contains: query, mode: "insensitive" } } },
          { createdBy: { name: { contains: query, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.FreeTrialWhereInput = {
      AND: andConditions,
    };

    // 3. Sorting logic
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    let orderBy: Prisma.FreeTrialOrderByWithRelationInput;
    switch (sortBy) {
      case "clientName":
        orderBy = { lead: { name: sortOrder } };
        break;
      case "productName":
        orderBy = { product: { name: sortOrder } };
        break;
      case "startDate":
        orderBy = { startDate: sortOrder };
        break;
      case "endDate":
        orderBy = { endDate: sortOrder };
        break;
      case "status":
        orderBy = { status: sortOrder };
        break;
      case "createdAt":
      default:
        orderBy = { createdAt: sortOrder };
        break;
    }

    // 4. Pagination
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // 5. Query execution in parallel
    const [totalCount, rawTrials] = await Promise.all([
      prisma.freeTrial.count({ where }),
      prisma.freeTrial.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              mobile: true,
              leadSource: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { name: true } },
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { name: true } },
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Format createdAt as "YYYY-MM-DD HH:mm:ss"
    const formatDateTime = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const y = date.getFullYear();
      const m = pad(date.getMonth() + 1);
      const d = pad(date.getDate());
      const hh = pad(date.getHours());
      const mm = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    };

    // Format date as "YYYY-MM-DD"
    const formatDate = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const y = date.getFullYear();
      const m = pad(date.getMonth() + 1);
      const d = pad(date.getDate());
      return `${y}-${m}-${d}`;
    };

    const trials: TrialHistoryItem[] = rawTrials.map((t) => {
      const displayStatus = computeTrialDisplayStatus(t.status, t.startDate, t.endDate);
      const resolvedProfile =
        t.profile ||
        t.createdBy.employeeProfile?.name ||
        t.assignedTo?.employeeProfile?.name ||
        "Executive";

      return {
        id: t.id,
        leadId: t.leadId,
        clientName: t.lead.name,
        mobile: t.lead.mobile,
        productName: t.product.name,
        productId: t.productId,
        createdByName: t.createdBy.name,
        createdById: t.createdById,
        assignedToName: t.assignedTo?.name || null,
        assignedToId: t.assignedToId,
        teamName: t.team?.name || null,
        teamId: t.teamId,
        profile: resolvedProfile,
        leadSource: t.lead.leadSource || "DIRECT",
        startDate: formatDate(t.startDate),
        endDate: formatDate(t.endDate),
        createdAt: formatDateTime(t.createdAt),
        rawStatus: t.status,
        displayStatus,
        remarks: t.remarks,
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      success: true,
      trials,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager trial history.");
  }
}
