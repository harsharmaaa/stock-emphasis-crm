"use server";

import { requireEmployeeSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";

import type {
  PaymentHistoryItem,
  GetPaymentHistoryFilterOptions,
  GetPaymentHistoryInput,
  GetPaymentHistoryResult,
} from "./types";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Returns role-aware database boundary conditions:
 * - ADMIN: unrestricted
 * - MANAGER: scoped to manager, led teams, and subordinates
 * - EMPLOYEE: strictly scoped to self
 */
async function getRoleScoping(user: { id: string; role: string }) {
  if (user.role === "ADMIN") {
    return { isUnrestricted: true, allowedUserIds: [], relevantTeamIds: [] };
  }

  if (user.role === "MANAGER") {
    const managerUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        teamId: true,
        ledTeams: { select: { id: true } },
      },
    });

    const relevantTeamIds = [
      ...new Set([
        ...(managerUser?.ledTeams.map((t) => t.id) || []),
        ...(managerUser?.teamId ? [managerUser.teamId] : []),
      ]),
    ];

    const subordinates = await prisma.user.findMany({
      where: {
        OR: [
          { managerId: user.id },
          ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
        ],
      },
      select: { id: true },
    });

    const allowedUserIds = Array.from(new Set([user.id, ...subordinates.map((s) => s.id)]));
    return { isUnrestricted: false, allowedUserIds, relevantTeamIds };
  }

  // EMPLOYEE
  return { isUnrestricted: false, allowedUserIds: [user.id], relevantTeamIds: [] };
}

/**
 * Dynamic, database-backed filter options for Payment History.
 */
export async function getPaymentHistoryFiltersAction(): Promise<{
  success: boolean;
  filters?: GetPaymentHistoryFilterOptions;
  error?: string;
}> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });
    const { isUnrestricted, allowedUserIds, relevantTeamIds } = await getRoleScoping(sessionUser);

    // 1. Scoped users
    const userWhere: Prisma.UserWhereInput = isUnrestricted
      ? { isActive: true }
      : { id: { in: allowedUserIds }, isActive: true };

    const scopedUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 2. Scoped teams
    const teamWhere: Prisma.TeamWhereInput = isUnrestricted
      ? {}
      : relevantTeamIds.length > 0
      ? { id: { in: relevantTeamIds } }
      : { id: "none" };

    const scopedTeams = await prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 3. Active payment modes
    const paymentModes = await prisma.paymentMode.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 4. Lead sources
    const activeSources = await getActiveLeadSourceNames();
    const leadSources = Array.from(new Set(activeSources)).sort((a, b) => a.localeCompare(b));

    // 5. Payment statuses
    const statuses = ["Approved", "Pending", "Rejected"];

    // 6. Payment types
    const paymentTypes = ["Full", "Part", "Renewal"];

    return {
      success: true,
      filters: {
        statuses,
        users: scopedUsers,
        teams: scopedTeams,
        paymentModes,
        leadSources,
        paymentTypes,
      },
    };
  } catch (error) {
    return handleActionError(error, "Failed to load payment history filter options.");
  }
}

/**
 * Retrieves paginated, filterable, sortable Payment History records with role-based scoping.
 */
export async function getPaymentHistoryAction(
  input: GetPaymentHistoryInput = {}
): Promise<GetPaymentHistoryResult> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });
    const { isUnrestricted, allowedUserIds, relevantTeamIds } = await getRoleScoping(sessionUser);

    // Role-based boundary conditions
    const boundaryWhere: Prisma.PaymentWhereInput = isUnrestricted
      ? {}
      : {
          OR: [
            { createdById: { in: allowedUserIds } },
            { leadOwnerId: { in: allowedUserIds } },
            { leadAddedById: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
            { lead: { allotToId: { in: allowedUserIds } } },
          ],
        };

    const andConditions: Prisma.PaymentWhereInput[] = [boundaryWhere];

    // Date range filters
    if (input.fromDate && input.fromDate.trim()) {
      const from = new Date(input.fromDate.trim());
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        andConditions.push({ paymentDate: { gte: from } });
      }
    }

    if (input.toDate && input.toDate.trim()) {
      const to = new Date(input.toDate.trim());
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        andConditions.push({ paymentDate: { lte: to } });
      }
    }

    // Status filter
    if (input.status && input.status.trim()) {
      const s = input.status.trim();
      andConditions.push({
        status: { equals: s, mode: "insensitive" },
      });
    }

    // Lead Added By
    if (input.leadAddedById && input.leadAddedById.trim()) {
      andConditions.push({ leadAddedById: input.leadAddedById.trim() });
    }

    // Payment Added By
    if (input.paymentAddedById && input.paymentAddedById.trim()) {
      andConditions.push({ createdById: input.paymentAddedById.trim() });
    }

    // Lead Owner
    if (input.leadOwnerId && input.leadOwnerId.trim()) {
      andConditions.push({ leadOwnerId: input.leadOwnerId.trim() });
    }

    // Team
    if (input.teamId && input.teamId.trim()) {
      andConditions.push({ teamId: input.teamId.trim() });
    }

    // Payment Mode
    if (input.paymentModeId && input.paymentModeId.trim()) {
      andConditions.push({ paymentModeId: input.paymentModeId.trim() });
    }

    // Lead Source
    if (input.leadSource && input.leadSource.trim()) {
      andConditions.push({
        OR: [
          { leadSource: { equals: input.leadSource.trim(), mode: "insensitive" } },
          { lead: { leadSource: { equals: input.leadSource.trim(), mode: "insensitive" } } },
        ],
      });
    }

    // Invoice ID filter
    if (input.invoiceId && input.invoiceId.trim()) {
      const invId = input.invoiceId.trim();
      andConditions.push({
        invoiceNumber: { contains: invId, mode: "insensitive" },
      });
    }

    // Payment Type filter
    if (input.paymentType && input.paymentType.trim()) {
      andConditions.push({
        paymentType: { equals: input.paymentType.trim(), mode: "insensitive" },
      });
    }

    // Full-text Search
    if (input.search && input.search.trim()) {
      const q = input.search.trim();
      andConditions.push({
        OR: [
          { lead: { name: { contains: q, mode: "insensitive" } } },
          { lead: { mobile: { contains: q } } },
          { serialNo: { contains: q, mode: "insensitive" } },
          { transactionId: { contains: q, mode: "insensitive" } },
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // Sorting
    const sortField = input.sortBy || "paymentDate";
    const sortDirection: Prisma.SortOrder = input.sortOrder === "asc" ? "asc" : "desc";

    let orderBy: Prisma.PaymentOrderByWithRelationInput;
    if (sortField === "clientName") {
      orderBy = { lead: { name: sortDirection } };
    } else if (sortField === "amount") {
      orderBy = { amount: sortDirection };
    } else if (sortField === "status") {
      orderBy = { status: sortDirection };
    } else if (sortField === "serialNo") {
      orderBy = { serialNo: sortDirection };
    } else if (sortField === "invoiceNumber") {
      orderBy = { invoiceNumber: sortDirection };
    } else if (sortField === "createdAt") {
      orderBy = { createdAt: sortDirection };
    } else {
      orderBy = { paymentDate: sortDirection };
    }

    // Pagination
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.max(1, Math.min(100, input.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // Parallel execution for count, aggregations, and paginated records
    const [totalCount, amountAgg, uniqueClientsAgg, rawPayments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where,
        select: { leadId: true },
        distinct: ["leadId"],
      }),
      prisma.payment.findMany({
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
          createdBy: { select: { name: true } },
          leadAddedBy: { select: { name: true } },
          leadOwner: { select: { name: true } },
          team: { select: { name: true } },
          paymentMode: { select: { name: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const totalAmount = amountAgg._sum.amount ? Number(amountAgg._sum.amount) : 0;
    const uniqueClientCount = uniqueClientsAgg.length;

    const payments: PaymentHistoryItem[] = rawPayments.map((p) => {
      const rawStatus = (p.status || "PENDING").toUpperCase();
      const status =
        rawStatus === "APPROVED"
          ? "Approved"
          : rawStatus === "REJECTED"
          ? "Rejected"
          : "Pending";

      return {
        id: p.id,
        serialNo: p.serialNo || p.id.slice(0, 8),
        leadAddedByName: p.leadAddedBy?.name || "System",
        paymentAddedByName: p.createdBy?.name || "Staff",
        leadOwnerName: p.leadOwner?.name || "Unassigned",
        clientName: p.lead?.name || "Unknown",
        clientMobile: p.lead?.mobile || "N/A",
        leadId: p.leadId,
        amount: Number(p.amount),
        modeName: p.paymentMode?.name || p.modeName || "Other",
        paymentModeId: p.paymentModeId,
        transactionId: p.transactionId || "na",
        status,
        invoiceNumber: p.invoiceNumber || "—",
        description: p.description || "—",
        paymentDate: formatDisplayDate(p.paymentDate),
        rawPaymentDate: p.paymentDate.toISOString(),
        leadSource: p.leadSource || p.lead?.leadSource || "DIRECT",
        paymentType: p.paymentType || "Full",
        teamName: p.team?.name || "—",
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      payments,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      totalAmount,
      uniqueClientCount,
    };
  } catch (error) {
    return handleActionError(error, "Failed to load payment history records.");
  }
}
