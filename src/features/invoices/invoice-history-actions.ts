"use server";

import {
  requireAdminSession,
  requireManagerSession,
  requireEmployeeSession,
  handleActionError,
} from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

export interface InvoiceHistoryItem {
  id: string;
  serialNo: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  leadId: string;
  pan: string | null;
  dob: string | null;
  productName: string;
  productId: string | null;
  planType: string;
  durationLabel: string;
  startDate: string | null;
  endDate: string | null;
  invoiceDate: string; // Formatted e.g. "03-Nov-26"
  rawInvoiceDate: string; // ISO string
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: string; // "Approved", "Pending", "Cancelled"
  mailStatus: string | null; // "Mail Sent", "Mail Not Sent"
  createdByName: string;
  createdById: string;
  assignedToName: string | null;
  assignedToId: string | null;
  teamName: string | null;
  profile: string | null;
  createdAt: string;
}

export interface GetInvoiceHistoryFilterOptions {
  profiles: string[];
  employees: { id: string; name: string }[];
  products: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  statuses: string[];
}

export interface GetInvoiceHistoryInput {
  profile?: string;
  employeeId?: string;
  productId?: string;
  teamId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: "invoiceDate" | "totalAmount" | "serialNo" | "clientName" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GetInvoiceHistoryResult {
  success: boolean;
  invoices?: InvoiceHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  totalAmount?: number;
  uniqueClientCount?: number;
  pendingCount?: number;
  approvedCount?: number;
  error?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatDob(date: Date | null | undefined): string | null {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Manager scoping helper
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
 * Returns dynamic database-backed filter options for Invoice History based on user role.
 */
export async function getInvoiceHistoryFiltersAction(portalRole?: "ADMIN" | "MANAGER" | "EMPLOYEE"): Promise<{
  success: boolean;
  filters?: GetInvoiceHistoryFilterOptions;
  error?: string;
}> {
  try {
    let role = portalRole;
    let userId = "";

    if (!role) {
      try {
        const admin = await requireAdminSession({ redirect: false });
        role = "ADMIN";
        userId = admin.id;
      } catch {
        try {
          const mgr = await requireManagerSession({ redirect: false });
          role = "MANAGER";
          userId = mgr.id;
        } catch {
          const emp = await requireEmployeeSession({ redirect: false });
          role = "EMPLOYEE";
          userId = emp.id;
        }
      }
    }

    let userWhere: Prisma.UserWhereInput = { isActive: true };

    if (role === "MANAGER") {
      const { allowedUserIds } = await getManagerScoping(userId, false);
      userWhere = { id: { in: allowedUserIds }, isActive: true };
    } else if (role === "EMPLOYEE") {
      userWhere = { id: userId, isActive: true };
    }

    const [scopedUsers, products, teams, profileAgg] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.invoice.groupBy({
        by: ["profile"],
        where: { profile: { not: null } },
      }),
    ]);

    const profiles = profileAgg
      .map((p) => p.profile)
      .filter((p): p is string => Boolean(p && p.trim().length > 0));

    const statuses = ["Approved", "Pending", "Cancelled"];

    return {
      success: true,
      filters: {
        profiles: Array.from(new Set(profiles)),
        employees: scopedUsers,
        products,
        teams,
        statuses,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load invoice filter options.");
  }
}

/**
 * Returns paginated, filtered, and sorted Invoice History records according to the caller's portal/role.
 */
export async function getInvoiceHistoryAction(
  input: GetInvoiceHistoryInput = {},
  portalRole?: "ADMIN" | "MANAGER" | "EMPLOYEE"
): Promise<GetInvoiceHistoryResult> {
  try {
    let sessionUser: { id: string; role: string } | null = null;
    let effectiveRole: "ADMIN" | "MANAGER" | "EMPLOYEE" = portalRole || "EMPLOYEE";

    try {
      const admin = await requireAdminSession({ redirect: false });
      sessionUser = admin;
      if (!portalRole) effectiveRole = "ADMIN";
    } catch {
      try {
        const mgr = await requireManagerSession({ redirect: false });
        sessionUser = mgr;
        if (!portalRole) effectiveRole = "MANAGER";
      } catch {
        const emp = await requireEmployeeSession({ redirect: false });
        sessionUser = emp;
        if (!portalRole) effectiveRole = "EMPLOYEE";
      }
    }

    if (!sessionUser) {
      return { success: false, error: "Unauthorized session." };
    }

    const where: Prisma.InvoiceWhereInput = {};

    // 1. Role-based scoping
    if (effectiveRole === "EMPLOYEE") {
      where.OR = [
        { createdById: sessionUser.id },
        { assignedToId: sessionUser.id },
        { lead: { allotToId: sessionUser.id } },
      ];
    } else if (effectiveRole === "MANAGER") {
      const { allowedUserIds, relevantTeamIds } = await getManagerScoping(
        sessionUser.id,
        sessionUser.role === "ADMIN"
      );

      where.OR = [
        { createdById: { in: allowedUserIds } },
        { assignedToId: { in: allowedUserIds } },
        ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
      ];
    }
    // ADMIN has full visibility (no forced scope)

    // 2. Profile filter
    if (input.profile && input.profile.trim()) {
      where.profile = input.profile.trim();
    }

    // 3. Employee filter (createdById or assignedToId)
    if (input.employeeId && input.employeeId.trim()) {
      const empId = input.employeeId.trim();
      const empOr = [{ createdById: empId }, { assignedToId: empId }];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: empOr }];
        delete where.OR;
      } else {
        where.OR = empOr;
      }
    }

    // 4. Product filter
    if (input.productId && input.productId.trim()) {
      where.productId = input.productId.trim();
    }

    // 5. Team filter
    if (input.teamId && input.teamId.trim()) {
      where.teamId = input.teamId.trim();
    }

    // 6. Status filter
    if (input.status && input.status.trim()) {
      where.status = { equals: input.status.trim(), mode: "insensitive" };
    }

    // 7. Date range filter (invoiceDate)
    if (input.fromDate || input.toDate) {
      where.invoiceDate = {};
      if (input.fromDate) {
        const from = new Date(input.fromDate);
        from.setHours(0, 0, 0, 0);
        where.invoiceDate.gte = from;
      }
      if (input.toDate) {
        const to = new Date(input.toDate);
        to.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = to;
      }
    }

    // 8. Search query filter
    if (input.search && input.search.trim()) {
      const query = input.search.trim();
      const searchConditions: Prisma.InvoiceWhereInput[] = [
        { serialNo: { contains: query, mode: "insensitive" } },
        { productName: { contains: query, mode: "insensitive" } },
        { lead: { name: { contains: query, mode: "insensitive" } } },
        { lead: { mobile: { contains: query } } },
        { lead: { email: { contains: query, mode: "insensitive" } } },
        { createdBy: { name: { contains: query, mode: "insensitive" } } },
        { assignedTo: { name: { contains: query, mode: "insensitive" } } },
      ];

      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // 9. Sorting
    const sortBy = input.sortBy || "invoiceDate";
    const sortOrder = input.sortOrder || "desc";

    let orderBy: Prisma.InvoiceOrderByWithRelationInput = { invoiceDate: sortOrder };

    if (sortBy === "totalAmount") {
      orderBy = { totalAmount: sortOrder };
    } else if (sortBy === "serialNo") {
      orderBy = { serialNo: sortOrder };
    } else if (sortBy === "clientName") {
      orderBy = { lead: { name: sortOrder } };
    } else if (sortBy === "status") {
      orderBy = { status: sortOrder };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    }

    // 10. Pagination
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.max(1, Math.min(100, input.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // Execute queries in parallel
    const [rawInvoices, totalCount, aggregations, pendingCount, approvedCount] = await Promise.all([
      prisma.invoice.findMany({
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
              email: true,
              pan: true,
              dob: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          team: { select: { name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { leadId: true },
      }),
      prisma.invoice.count({ where: { ...where, status: "PENDING" } }),
      prisma.invoice.count({ where: { ...where, status: "APPROVED" } }),
    ]);

    const invoices: InvoiceHistoryItem[] = rawInvoices.map((inv) => {
      const rawStatus = (inv.status || "APPROVED").toUpperCase();
      const displayStatus =
        rawStatus === "APPROVED"
          ? "Approved"
          : rawStatus === "CANCELLED"
          ? "Cancelled"
          : "Pending";

      return {
        id: inv.id,
        serialNo: inv.serialNo,
        clientName: inv.lead?.name || "Unknown",
        clientMobile: inv.lead?.mobile || "N/A",
        clientEmail: inv.lead?.email || null,
        leadId: inv.leadId,
        pan: inv.lead?.pan || null,
        dob: formatDob(inv.lead?.dob),
        productName: inv.productName || inv.product?.name || "Advisory Service Package",
        productId: inv.productId || null,
        planType: inv.planType || "Monthly",
        durationLabel: inv.durationLabel || "30 Days",
        startDate: inv.startDate ? formatDisplayDate(inv.startDate) : null,
        endDate: inv.endDate ? formatDisplayDate(inv.endDate) : null,
        invoiceDate: formatDisplayDate(inv.invoiceDate),
        rawInvoiceDate: inv.invoiceDate.toISOString(),
        baseAmount: Number(inv.baseAmount),
        gstAmount: Number(inv.gstAmount),
        totalAmount: Number(inv.totalAmount),
        status: displayStatus,
        mailStatus: inv.mailStatus || "Mail Not Sent",
        createdByName: inv.createdBy?.name || "System",
        createdById: inv.createdById,
        assignedToName: inv.assignedTo?.name || null,
        assignedToId: inv.assignedToId || null,
        teamName: inv.team?.name || null,
        profile: inv.profile || null,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const totalAmount = Number(aggregations._sum.totalAmount || 0);
    const uniqueClientCount = aggregations._count.leadId || 0;

    return {
      success: true,
      invoices,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      totalAmount,
      uniqueClientCount,
      pendingCount,
      approvedCount,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load invoice history.");
  }
}
