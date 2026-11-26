"use server";

import {
  requireEmployeeSession,
  requireAdminSession,
  handleActionError,
} from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { Prisma } from "@prisma/client";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { revalidatePath } from "next/cache";
import {
  computeTrialDisplayStatus,
  formatDateYMD,
  formatDateTime,
  type TrialDisplayStatus,
} from "./helpers";

export type { TrialDisplayStatus };

export interface TrialFormProduct {
  id: string;
  name: string;
  hasFreeTrial: boolean;
  freeTrialDays: number;
}

export interface LeadTrialItem {
  id: string;
  leadId: string;
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  rawStatus: string;
  displayStatus: TrialDisplayStatus;
  remarks: string | null;
}

export interface EmployeeTrialHistoryItem {
  id: string;
  leadId: string;
  sNo: string;
  createDate: string;
  createdByName: string;
  createdById: string;
  clientName: string;
  mobile: string;
  productName: string;
  productId: string;
  startDate: string;
  endDate: string;
  leadSource: string;
  teamName: string | null;
  rawStatus: string;
  displayStatus: TrialDisplayStatus;
  remarks: string | null;
}

export interface GetEmployeeTrialHistoryInput {
  leadSource?: string;
  teamId?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GetEmployeeTrialHistoryResult {
  success: boolean;
  trials?: EmployeeTrialHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  error?: string;
}

/**
 * Returns active products prioritizing hasFreeTrial: true,
 * falling back to all active products if none have hasFreeTrial: true.
 */
export async function getTrialFormOptionsAction(): Promise<{
  success: boolean;
  products?: TrialFormProduct[];
  error?: string;
}> {
  try {
    await requireEmployeeSession({ redirect: false });

    // Prioritize products marked with hasFreeTrial: true
    let products = await prisma.product.findMany({
      where: { isActive: true, hasFreeTrial: true },
      select: {
        id: true,
        name: true,
        hasFreeTrial: true,
        freeTrialDays: true,
      },
      orderBy: { name: "asc" },
    });

    // Fallback to active products if none have hasFreeTrial: true
    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          hasFreeTrial: true,
          freeTrialDays: true,
        },
        orderBy: { name: "asc" },
      });
    }

    return {
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        hasFreeTrial: p.hasFreeTrial,
        freeTrialDays: p.freeTrialDays ?? 2,
      })),
    };
  } catch (err) {
    return handleActionError(err, "Failed to load product options for free trial.");
  }
}

export interface CreateFreeTrialsInput {
  leadId: string;
  productIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  remarks?: string;
}

/**
 * Creates a FreeTrial record per selected product,
 * updates lead status to TRIAL (if lead is not CLIENT),
 * and logs the activity.
 */
export async function createFreeTrialsAction(
  input: CreateFreeTrialsInput
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });

    if (!input.leadId || !input.leadId.trim()) {
      return { success: false, error: "Lead ID is required." };
    }

    if (!input.productIds || input.productIds.length === 0) {
      return { success: false, error: "Please select at least one product." };
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid start or end date." };
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      return {
        success: false,
        error: "To Date must be equal to or after From Date.",
      };
    }

    const [lead, user, products] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: input.leadId },
        select: {
          id: true,
          name: true,
          mobile: true,
          allotToId: true,
          teamId: true,
          status: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          name: true,
          teamId: true,
          employeeProfile: { select: { name: true } },
        },
      }),
      prisma.product.findMany({
        where: { id: { in: input.productIds } },
        select: { id: true, name: true },
      }),
    ]);

    if (!lead) {
      return { success: false, error: "Target lead not found." };
    }

    if (products.length === 0) {
      return { success: false, error: "None of the selected products were found." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create FreeTrial records
      for (const prod of products) {
        await tx.freeTrial.create({
          data: {
            leadId: lead.id,
            productId: prod.id,
            createdById: sessionUser.id,
            assignedToId: lead.allotToId || sessionUser.id,
            teamId: lead.teamId || user?.teamId || null,
            profile: user?.employeeProfile?.name || null,
            startDate: start,
            endDate: end,
            status: "APPROVED",
            remarks: input.remarks?.trim() || null,
          },
        });
      }

      // 2. Transition lead pipeline status to TRIAL unless already converted to CLIENT
      if (lead.status !== "CLIENT") {
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: "TRIAL",
            updatedAt: new Date(),
          },
        });
      }
    });

    // 3. Log audit activity
    await logActivity({
      action: "CREATE_FREE_TRIAL",
      details: `Created Free Trial for lead "${lead.name}" (${lead.mobile}) across ${products.length} product(s): ${products.map((p) => p.name).join(", ")}. Valid: ${formatDateYMD(start)} to ${formatDateYMD(end)}.`,
      actorId: sessionUser.id,
      targetTeamId: lead.teamId || user?.teamId || undefined,
    });

    // 4. Revalidate affected workspaces
    revalidatePath("/employee/leads");
    revalidatePath("/employee/trials");
    revalidatePath("/admin/leads");
    revalidatePath("/admin");
    revalidatePath("/manager/leads");
    revalidatePath("/manager/history/trials");

    return { success: true, count: products.length };
  } catch (err) {
    return handleActionError(err, "Failed to create free trial.");
  }
}

/**
 * Returns previous FreeTrial rows for a given leadId.
 */
export async function getLeadTrialsAction(
  leadId: string
): Promise<{ success: boolean; trials?: LeadTrialItem[]; error?: string }> {
  try {
    await requireEmployeeSession({ redirect: false });

    if (!leadId || !leadId.trim()) {
      return { success: false, error: "Lead ID is required." };
    }

    const rawTrials = await prisma.freeTrial.findMany({
      where: { leadId: leadId.trim() },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const trials: LeadTrialItem[] = rawTrials.map((t) => ({
      id: t.id,
      leadId: t.leadId,
      productId: t.productId,
      productName: t.product.name,
      startDate: formatDateYMD(t.startDate),
      endDate: formatDateYMD(t.endDate),
      createdAt: formatDateTime(t.createdAt),
      rawStatus: t.status,
      displayStatus: computeTrialDisplayStatus(t.status, t.startDate, t.endDate),
      remarks: t.remarks,
    }));

    return { success: true, trials };
  } catch (err) {
    return handleActionError(err, "Failed to load lead trial history.");
  }
}

/**
 * Returns dynamic filter options for employee trial history page.
 */
export async function getEmployeeTrialFiltersAction(): Promise<{
  success: boolean;
  leadSources?: string[];
  teams?: { id: string; name: string }[];
  employees?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });

    const [leadSources, teams, employees] = await Promise.all([
      getActiveLeadSourceNames(),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER"
        ? prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : prisma.user.findMany({
            where: { id: sessionUser.id },
            select: { id: true, name: true },
          }),
    ]);

    return {
      success: true,
      leadSources,
      teams,
      employees,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load trial filters.");
  }
}

/**
 * Returns scoped free trial history for employee portal matching EmployeTrialHistory.png.
 */
export async function getEmployeeTrialHistoryAction(
  params: GetEmployeeTrialHistoryInput = {}
): Promise<GetEmployeeTrialHistoryResult> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });

    // Scoping: Employee sees trials they created, are assigned to, or whose lead is allotted to them.
    // Admin sees all. Manager sees team/subordinate trials.
    const isFullPrivilege = sessionUser.role === "ADMIN";

    const baseScope: Prisma.FreeTrialWhereInput = isFullPrivilege
      ? {}
      : sessionUser.role === "MANAGER"
      ? {
          OR: [
            { createdById: sessionUser.id },
            { assignedToId: sessionUser.id },
            ...(sessionUser.teamId ? [{ teamId: sessionUser.teamId }] : []),
            { lead: { allotToId: sessionUser.id } },
          ],
        }
      : {
          OR: [
            { createdById: sessionUser.id },
            { assignedToId: sessionUser.id },
            { lead: { allotToId: sessionUser.id } },
          ],
        };

    const andConditions: Prisma.FreeTrialWhereInput[] = [baseScope];

    // Filter by Employee / Creator
    if (params.employeeId && params.employeeId.trim() && params.employeeId !== "ALL") {
      const empId = params.employeeId.trim();
      andConditions.push({
        OR: [{ createdById: empId }, { assignedToId: empId }],
      });
    }

    // Filter by Lead Source
    if (params.leadSource && params.leadSource.trim() && params.leadSource !== "ALL") {
      andConditions.push({
        lead: { leadSource: { equals: params.leadSource.trim(), mode: "insensitive" } },
      });
    }

    // Filter by Team
    if (params.teamId && params.teamId.trim() && params.teamId !== "ALL") {
      andConditions.push({ teamId: params.teamId.trim() });
    }

    // Date range filter
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

    // Status filter
    if (params.status && params.status.trim() && params.status.toUpperCase() !== "ALL") {
      const st = params.status.trim().toUpperCase();
      const now = new Date();

      if (st === "APPROVED") {
        andConditions.push({
          status: "APPROVED",
          startDate: { gt: now },
        });
      } else if (st === "RUNNING" || st === "ACTIVE") {
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

    // Search query filter (Client Name, Mobile, Product Name, Creator Name)
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

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const [totalCount, rawTrials] = await Promise.all([
      prisma.freeTrial.count({ where }),
      prisma.freeTrial.findMany({
        where,
        orderBy: { createdAt: "desc" },
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

    const trials: EmployeeTrialHistoryItem[] = rawTrials.map((t, index) => {
      const displayStatus = computeTrialDisplayStatus(t.status, t.startDate, t.endDate);
      const rowNumber = skip + index + 1;
      const shortLeadId = t.lead.id.length > 6 ? t.lead.id.slice(-6) : t.lead.id;

      return {
        id: t.id,
        leadId: t.leadId,
        sNo: `${rowNumber}--[${shortLeadId}]`,
        createDate: formatDateTime(t.createdAt),
        createdByName: t.createdBy.name,
        createdById: t.createdById,
        clientName: t.lead.name,
        mobile: t.lead.mobile,
        productName: t.product.name,
        productId: t.productId,
        startDate: formatDateYMD(t.startDate),
        endDate: formatDateYMD(t.endDate),
        leadSource: t.lead.leadSource || "DIRECT",
        teamName: t.team?.name || null,
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
    return handleActionError(err, "Failed to load employee free trial history.");
  }
}

export interface AdminApprovalTrialItem {
  id: string;
  leadId: string;
  ownerName: string;
  ownerId: string | null;
  clientName: string;
  mobile: string;
  productName: string;
  productId: string;
  startDate: string;
  endDate: string;
  status: string;
  remarks: string | null;
  createdAt: string;
}

export interface AdminBulkProcessFreeTrialsInput {
  trialIds: string[];
  action: "APPROVE" | "DENY";
  remarksByTrialId?: Record<string, string>;
  generalRemarks?: string;
}

/**
 * Returns FreeTrial records pending (or reviewable) for Admin approval.
 */
export async function getAdminApprovalTrialsAction(params?: {
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  trials?: AdminApprovalTrialItem[];
  pendingCount?: number;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const statusFilter = params?.status?.trim() || "PENDING";
    const where: Prisma.FreeTrialWhereInput = {};

    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { lead: { name: { contains: q, mode: "insensitive" } } },
        { lead: { mobile: { contains: q } } },
        { product: { name: { contains: q, mode: "insensitive" } } },
        { assignedTo: { name: { contains: q, mode: "insensitive" } } },
        { createdBy: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [rawTrials, pendingCount] = await Promise.all([
      prisma.freeTrial.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              mobile: true,
              status: true,
              allotTo: { select: { id: true, name: true } },
            },
          },
          product: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.freeTrial.count({
        where: { status: "PENDING" },
      }),
    ]);

    const trials: AdminApprovalTrialItem[] = rawTrials.map((t) => {
      const owner = t.assignedTo?.name || t.lead.allotTo?.name || t.createdBy.name || "Self";
      return {
        id: t.id,
        leadId: t.leadId,
        ownerName: owner,
        ownerId: t.assignedToId || t.lead.allotTo?.id || null,
        clientName: t.lead.name,
        mobile: t.lead.mobile,
        productName: t.product.name,
        productId: t.productId,
        startDate: formatDateYMD(t.startDate),
        endDate: formatDateYMD(t.endDate),
        status: t.status,
        remarks: t.remarks,
        createdAt: formatDateTime(t.createdAt),
      };
    });

    return {
      success: true,
      trials,
      pendingCount,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load approval trials.");
  }
}

/**
 * Returns count of currently PENDING free trials for the Admin sidebar badge.
 */
export async function getPendingTrialsCountAction(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    await requireAdminSession({ redirect: false });
    const count = await prisma.freeTrial.count({
      where: { status: "PENDING" },
    });
    return { success: true, count };
  } catch {
    return { success: true, count: 0 };
  }
}

/**
 * Bulk approves or denies selected free trials with optional per-row comments.
 */
export async function adminBulkProcessFreeTrialsAction(
  input: AdminBulkProcessFreeTrialsInput
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!input.trialIds || input.trialIds.length === 0) {
      return { success: false, error: "Please select at least one trial to process." };
    }

    const trials = await prisma.freeTrial.findMany({
      where: { id: { in: input.trialIds } },
      include: {
        lead: { select: { id: true, name: true, mobile: true, status: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (trials.length === 0) {
      return { success: false, error: "Selected trial records were not found." };
    }

    const newStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      for (const t of trials) {
        const comment = input.remarksByTrialId?.[t.id] ?? input.generalRemarks ?? t.remarks;

        await tx.freeTrial.update({
          where: { id: t.id },
          data: {
            status: newStatus,
            remarks: comment?.trim() || null,
            updatedAt: new Date(),
          },
        });

        // Transition lead pipeline status to TRIAL when approved unless already a converted CLIENT
        if (input.action === "APPROVE" && t.lead.status !== "CLIENT") {
          await tx.lead.update({
            where: { id: t.leadId },
            data: {
              status: "TRIAL",
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    await logActivity({
      action: input.action === "APPROVE" ? "ADMIN_APPROVE_FREE_TRIAL" : "ADMIN_DENY_FREE_TRIAL",
      details: `${input.action === "APPROVE" ? "Approved" : "Denied"} ${trials.length} free trial subscription(s) for ${trials.map((t) => `${t.lead.name} (${t.product.name})`).join(", ")}.`,
      actorId: admin.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/approvals/trials");
    revalidatePath("/admin/history/trials");
    revalidatePath("/manager/history/trials");
    revalidatePath("/employee/trials");
    revalidatePath("/employee/leads");
    revalidatePath("/admin/leads");

    return { success: true, count: trials.length };
  } catch (err) {
    return handleActionError(err, `Failed to ${input.action.toLowerCase()} free trials.`);
  }
}
