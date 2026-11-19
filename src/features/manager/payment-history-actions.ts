"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";

export interface PaymentHistoryItem {
  id: string;
  serialNo: string;
  leadAddedByName: string;
  paymentAddedByName: string;
  leadOwnerName: string;
  clientName: string;
  clientMobile: string;
  leadId: string;
  amount: number;
  modeName: string;
  paymentModeId: string | null;
  transactionId: string;
  status: string; // e.g. "Approved", "Pending", "Rejected"
  invoiceNumber: string;
  description: string;
  paymentDate: string; // Formatted date e.g. "03-Nov-26"
  rawPaymentDate: string; // ISO date for sorting/inputs
  leadSource: string;
  paymentType: string;
  teamName: string;
  createdAt: string;
}

export interface GetPaymentHistoryFilterOptions {
  statuses: string[];
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  paymentModes: { id: string; name: string }[];
  leadSources: string[];
  paymentTypes: string[];
}

export interface GetPaymentHistoryInput {
  fromDate?: string;
  toDate?: string;
  status?: string;
  leadAddedById?: string;
  paymentAddedById?: string;
  leadOwnerId?: string;
  teamId?: string;
  paymentModeId?: string;
  leadSource?: string;
  invoiceId?: string;
  paymentType?: string;
  search?: string;
  sortBy?: "paymentDate" | "amount" | "status" | "clientName" | "serialNo" | "invoiceNumber" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GetPaymentHistoryResult {
  success: boolean;
  payments?: PaymentHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  totalAmount?: number;
  uniqueClientCount?: number;
  error?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Scoping helper: Computes allowed subordinate User IDs and relevant Team IDs
 * for the authenticated manager.
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
 * Returns dynamic, 100% database-backed filter options for Payment History.
 */
export async function getManagerPaymentHistoryFiltersAction(): Promise<{
  success: boolean;
  filters?: GetPaymentHistoryFilterOptions;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // 1. Scoped users (subordinates and managers)
    const userWhere: Prisma.UserWhereInput = isAdmin
      ? { isActive: true }
      : { id: { in: allowedUserIds }, isActive: true };

    const scopedUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true },
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

    // 3. Active Payment Modes from database
    const paymentModes = await prisma.paymentMode.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 4. Lead Sources (master sources + distinct payment sources)
    const activeSources = await getActiveLeadSourceNames();
    const distinctPaymentSources = await prisma.payment.findMany({
      where: { leadSource: { not: null } },
      select: { leadSource: true },
      distinct: ["leadSource"],
    });

    const leadSourceSet = new Set<string>(activeSources);
    for (const item of distinctPaymentSources) {
      if (item.leadSource?.trim()) {
        leadSourceSet.add(item.leadSource.trim());
      }
    }
    const leadSources = Array.from(leadSourceSet).sort((a, b) => a.localeCompare(b));

    // 5. Payment Statuses (distinct statuses in DB or standard default set)
    const distinctStatuses = await prisma.payment.findMany({
      select: { status: true },
      distinct: ["status"],
    });
    const statusSet = new Set<string>(["Approved", "Pending", "Rejected"]);
    for (const s of distinctStatuses) {
      if (s.status?.trim()) {
        const titleCase = s.status.trim().charAt(0).toUpperCase() + s.status.trim().slice(1).toLowerCase();
        statusSet.add(titleCase);
      }
    }
    const statuses = Array.from(statusSet);

    // 6. Payment Types (distinct from DB or default set)
    const distinctTypes = await prisma.payment.findMany({
      where: { paymentType: { not: null } },
      select: { paymentType: true },
      distinct: ["paymentType"],
    });
    const typeSet = new Set<string>(["Full", "Part", "Renewal"]);
    for (const t of distinctTypes) {
      if (t.paymentType?.trim()) {
        typeSet.add(t.paymentType.trim());
      }
    }
    const paymentTypes = Array.from(typeSet);

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
 * Retrieves paginated, filterable, sortable Payment History records strictly scoped to the manager.
 */
export async function getManagerPaymentHistoryAction(
  input: GetPaymentHistoryInput = {}
): Promise<GetPaymentHistoryResult> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // Boundary conditions
    const boundaryWhere: Prisma.PaymentWhereInput = isAdmin
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

    // Filter: Payment Status
    if (input.status && input.status.trim()) {
      const s = input.status.trim();
      andConditions.push({
        status: { equals: s, mode: "insensitive" },
      });
    }

    // Filter: Lead Added By
    if (input.leadAddedById && input.leadAddedById.trim()) {
      andConditions.push({
        leadAddedById: input.leadAddedById.trim(),
      });
    }

    // Filter: Payment Added By (createdById)
    if (input.paymentAddedById && input.paymentAddedById.trim()) {
      andConditions.push({
        createdById: input.paymentAddedById.trim(),
      });
    }

    // Filter: Lead Owner
    if (input.leadOwnerId && input.leadOwnerId.trim()) {
      andConditions.push({
        leadOwnerId: input.leadOwnerId.trim(),
      });
    }

    // Filter: Team
    if (input.teamId && input.teamId.trim()) {
      andConditions.push({
        teamId: input.teamId.trim(),
      });
    }

    // Filter: Payment Mode
    if (input.paymentModeId && input.paymentModeId.trim()) {
      andConditions.push({
        paymentModeId: input.paymentModeId.trim(),
      });
    }

    // Filter: Lead Source
    if (input.leadSource && input.leadSource.trim()) {
      andConditions.push({
        OR: [
          { leadSource: { equals: input.leadSource.trim(), mode: "insensitive" } },
          { lead: { leadSource: { equals: input.leadSource.trim(), mode: "insensitive" } } },
        ],
      });
    }

    // Filter: Invoice Id (partial match)
    if (input.invoiceId && input.invoiceId.trim()) {
      andConditions.push({
        invoiceNumber: { contains: input.invoiceId.trim(), mode: "insensitive" },
      });
    }

    // Filter: Payment Type
    if (input.paymentType && input.paymentType.trim()) {
      andConditions.push({
        paymentType: { equals: input.paymentType.trim(), mode: "insensitive" },
      });
    }

    // Filter: Date Range (paymentDate)
    if (input.fromDate && input.fromDate.trim()) {
      const from = new Date(input.fromDate.trim());
      from.setHours(0, 0, 0, 0);
      andConditions.push({
        paymentDate: { gte: from },
      });
    }
    if (input.toDate && input.toDate.trim()) {
      const to = new Date(input.toDate.trim());
      to.setHours(23, 59, 59, 999);
      andConditions.push({
        paymentDate: { lte: to },
      });
    }

    // Filter: Global Search
    if (input.search && input.search.trim()) {
      const term = input.search.trim();
      andConditions.push({
        OR: [
          { lead: { name: { contains: term, mode: "insensitive" } } },
          { lead: { mobile: { contains: term, mode: "insensitive" } } },
          { serialNo: { contains: term, mode: "insensitive" } },
          { transactionId: { contains: term, mode: "insensitive" } },
          { invoiceNumber: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { modeName: { contains: term, mode: "insensitive" } },
          { paymentMode: { name: { contains: term, mode: "insensitive" } } },
          { leadSource: { contains: term, mode: "insensitive" } },
          { createdBy: { name: { contains: term, mode: "insensitive" } } },
          { leadOwner: { name: { contains: term, mode: "insensitive" } } },
          { leadAddedBy: { name: { contains: term, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput = { AND: andConditions };

    // Sorting
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";
    let orderBy: Prisma.PaymentOrderByWithRelationInput = { paymentDate: sortOrder };

    if (input.sortBy === "amount") {
      orderBy = { amount: sortOrder };
    } else if (input.sortBy === "status") {
      orderBy = { status: sortOrder };
    } else if (input.sortBy === "clientName") {
      orderBy = { lead: { name: sortOrder } };
    } else if (input.sortBy === "serialNo") {
      orderBy = { serialNo: sortOrder };
    } else if (input.sortBy === "invoiceNumber") {
      orderBy = { invoiceNumber: sortOrder };
    } else if (input.sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { paymentDate: sortOrder };
    }

    // Pagination
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.max(1, Math.min(100, input.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // Parallel queries: records, count, sum amount, and distinct clients
    const [rawPayments, totalCount, amountAggregate, clientGroups] = await Promise.all([
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
          paymentMode: {
            select: { id: true, name: true },
          },
          leadAddedBy: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          leadOwner: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["leadId"],
        where,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const totalAmount = Number(amountAggregate._sum.amount || 0);
    const uniqueClientCount = clientGroups.length;

    const payments: PaymentHistoryItem[] = rawPayments.map((p, index) => {
      const sNo = p.serialNo || `${skip + index + 1}--[${p.id.slice(-6)}]`;
      const leadAddedByName = p.leadAddedBy?.name || "Admin";
      const paymentAddedByName = p.createdBy?.name || "N/A";
      const leadOwnerName = p.leadOwner?.name || p.createdBy?.name || "N/A";
      const clientName = p.lead?.name || "N/A";
      const clientMobile = p.lead?.mobile || "N/A";
      const modeName = p.paymentMode?.name || p.modeName || "Cash";
      const txnId = p.transactionId || "NA";
      const invNum = p.invoiceNumber || "N/A";
      const description = p.description || "NA";
      const rawDateStr = p.paymentDate.toISOString();
      const displayDateStr = formatDisplayDate(p.paymentDate);
      const leadSource = p.leadSource || p.lead?.leadSource || "Direct";
      const paymentType = p.paymentType || "Full";
      const teamName = p.team?.name || "N/A";

      // Normalize status title case
      const rawStatus = (p.status || "Approved").trim();
      const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

      return {
        id: p.id,
        serialNo: sNo,
        leadAddedByName,
        paymentAddedByName,
        leadOwnerName,
        clientName,
        clientMobile,
        leadId: p.leadId,
        amount: Number(p.amount),
        modeName,
        paymentModeId: p.paymentModeId,
        transactionId: txnId,
        status,
        invoiceNumber: invNum,
        description,
        paymentDate: displayDateStr,
        rawPaymentDate: rawDateStr,
        leadSource,
        paymentType,
        teamName,
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
    return handleActionError(error, "Failed to load payment history.");
  }
}
