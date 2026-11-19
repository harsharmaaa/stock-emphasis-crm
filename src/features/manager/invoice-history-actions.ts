"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
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
  status: string; // "Approved", "Running", "Pending", "Cancelled"
  mailStatus: string; // "Mail Sent", "Mail Not Sent"
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
  employeeId?: string; // matches createdById or assignedToId
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
 * Returns dynamic, 100% database-backed filter options for Invoice History.
 */
export async function getManagerInvoiceHistoryFiltersAction(): Promise<{
  success: boolean;
  filters?: GetInvoiceHistoryFilterOptions;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // 1. Scoped employees & team members
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

    // 3. Products: active Products from DB + distinct invoice product names
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 4. Profiles: distinct from EmployeeProfile + Invoice + Lead
    const [dbProfiles, invoiceProfiles] = await Promise.all([
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.invoice.findMany({
        where: { profile: { not: null } },
        select: { profile: true },
        distinct: ["profile"],
      }),
    ]);

    const profileSet = new Set<string>();
    dbProfiles.forEach((p) => profileSet.add(p.name));
    invoiceProfiles.forEach((ip) => {
      if (ip.profile?.trim()) profileSet.add(ip.profile.trim());
    });
    const profiles = Array.from(profileSet).sort((a, b) => a.localeCompare(b));

    // 5. Statuses: distinct from DB or default set
    const distinctStatuses = await prisma.invoice.findMany({
      select: { status: true },
      distinct: ["status"],
    });
    const statusSet = new Set<string>(["Approved", "Running", "Pending", "Cancelled"]);
    for (const s of distinctStatuses) {
      if (s.status?.trim()) {
        const titleCase = s.status.trim().charAt(0).toUpperCase() + s.status.trim().slice(1).toLowerCase();
        statusSet.add(titleCase);
      }
    }
    const statuses = Array.from(statusSet);

    return {
      success: true,
      filters: {
        profiles,
        employees: scopedUsers,
        products: activeProducts,
        teams: scopedTeams,
        statuses,
      },
    };
  } catch (error) {
    return handleActionError(error, "Failed to load invoice history filter options.");
  }
}

/**
 * Retrieves paginated, filterable, sortable Invoice History records strictly scoped to the manager.
 */
export async function getManagerInvoiceHistoryAction(
  input: GetInvoiceHistoryInput = {}
): Promise<GetInvoiceHistoryResult> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { isAdmin, allowedUserIds, relevantTeamIds } = await getManagerScoping(
      manager.id,
      manager.role === "ADMIN"
    );

    // Boundary conditions
    const boundaryWhere: Prisma.InvoiceWhereInput = isAdmin
      ? {}
      : {
          OR: [
            { createdById: { in: allowedUserIds } },
            { assignedToId: { in: allowedUserIds } },
            ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
            { lead: { allotToId: { in: allowedUserIds } } },
          ],
        };

    const andConditions: Prisma.InvoiceWhereInput[] = [boundaryWhere];

    // Filter: Profile
    if (input.profile && input.profile.trim()) {
      andConditions.push({
        profile: { equals: input.profile.trim(), mode: "insensitive" },
      });
    }

    // Filter: Employee (matches createdById OR assignedToId)
    if (input.employeeId && input.employeeId.trim()) {
      const empId = input.employeeId.trim();
      andConditions.push({
        OR: [{ createdById: empId }, { assignedToId: empId }],
      });
    }

    // Filter: Product
    if (input.productId && input.productId.trim()) {
      andConditions.push({
        productId: input.productId.trim(),
      });
    }

    // Filter: Team
    if (input.teamId && input.teamId.trim()) {
      andConditions.push({
        teamId: input.teamId.trim(),
      });
    }

    // Filter: Status
    if (input.status && input.status.trim()) {
      andConditions.push({
        status: { equals: input.status.trim(), mode: "insensitive" },
      });
    }

    // Filter: Date Range (invoiceDate)
    if (input.fromDate && input.fromDate.trim()) {
      const from = new Date(input.fromDate.trim());
      from.setHours(0, 0, 0, 0);
      andConditions.push({
        invoiceDate: { gte: from },
      });
    }
    if (input.toDate && input.toDate.trim()) {
      const to = new Date(input.toDate.trim());
      to.setHours(23, 59, 59, 999);
      andConditions.push({
        invoiceDate: { lte: to },
      });
    }

    // Filter: Global Search
    if (input.search && input.search.trim()) {
      const term = input.search.trim();
      andConditions.push({
        OR: [
          { serialNo: { contains: term, mode: "insensitive" } },
          { lead: { name: { contains: term, mode: "insensitive" } } },
          { lead: { mobile: { contains: term, mode: "insensitive" } } },
          { lead: { email: { contains: term, mode: "insensitive" } } },
          { lead: { pan: { contains: term, mode: "insensitive" } } },
          { productName: { contains: term, mode: "insensitive" } },
          { product: { name: { contains: term, mode: "insensitive" } } },
          { createdBy: { name: { contains: term, mode: "insensitive" } } },
          { assignedTo: { name: { contains: term, mode: "insensitive" } } },
          { planType: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.InvoiceWhereInput = { AND: andConditions };

    // Sorting
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";
    let orderBy: Prisma.InvoiceOrderByWithRelationInput = { invoiceDate: sortOrder };

    if (input.sortBy === "totalAmount") {
      orderBy = { totalAmount: sortOrder };
    } else if (input.sortBy === "serialNo") {
      orderBy = { serialNo: sortOrder };
    } else if (input.sortBy === "clientName") {
      orderBy = { lead: { name: sortOrder } };
    } else if (input.sortBy === "status") {
      orderBy = { status: sortOrder };
    } else if (input.sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { invoiceDate: sortOrder };
    }

    // Pagination
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.max(1, Math.min(100, input.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // Parallel queries: records, total count, sum totalAmount, and unique clients
    const [rawInvoices, totalCount, amountAggregate, clientGroups] = await Promise.all([
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
              profile: true,
            },
          },
          product: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          assignedTo: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.groupBy({
        by: ["leadId"],
        where,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const totalAmount = Number(amountAggregate._sum.totalAmount || 0);
    const uniqueClientCount = clientGroups.length;

    const invoices: InvoiceHistoryItem[] = rawInvoices.map((inv) => {
      const clientName = inv.lead?.name || "N/A";
      const clientMobile = inv.lead?.mobile || "N/A";
      const clientEmail = inv.lead?.email || null;
      const pan = inv.lead?.pan || null;
      const dob = formatDob(inv.lead?.dob);

      const prodName = inv.product?.name || inv.productName || "Stock Advisory";
      const planType = inv.planType || "Monthly";

      // Compute or format duration label
      let duration = inv.durationLabel;
      if (!duration) {
        if (inv.startDate && inv.endDate) {
          const diffMs = Math.abs(inv.endDate.getTime() - inv.startDate.getTime());
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          duration = `${diffDays} Days`;
        } else {
          duration = planType;
        }
      }

      const startStr = inv.startDate ? formatDisplayDate(inv.startDate) : null;
      const endStr = inv.endDate ? formatDisplayDate(inv.endDate) : null;
      const invDateStr = formatDisplayDate(inv.invoiceDate);

      const rawStatus = (inv.status || "APPROVED").trim();
      const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

      const mailStatus = inv.mailStatus || "Mail Sent";
      const createdByName = inv.createdBy?.name || "Admin";
      const assignedToName = inv.assignedTo?.name || null;
      const teamName = inv.team?.name || null;
      const profile = inv.profile || inv.lead?.profile || null;

      return {
        id: inv.id,
        serialNo: inv.serialNo,
        clientName,
        clientMobile,
        clientEmail,
        leadId: inv.leadId,
        pan,
        dob,
        productName: prodName,
        productId: inv.productId,
        planType,
        durationLabel: duration,
        startDate: startStr,
        endDate: endStr,
        invoiceDate: invDateStr,
        rawInvoiceDate: inv.invoiceDate.toISOString(),
        baseAmount: Number(inv.baseAmount),
        gstAmount: Number(inv.gstAmount),
        totalAmount: Number(inv.totalAmount),
        status,
        mailStatus,
        createdByName,
        createdById: inv.createdById,
        assignedToName,
        assignedToId: inv.assignedToId,
        teamName,
        profile,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      invoices,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      totalAmount,
      uniqueClientCount,
    };
  } catch (error) {
    return handleActionError(error, "Failed to load invoice history.");
  }
}
