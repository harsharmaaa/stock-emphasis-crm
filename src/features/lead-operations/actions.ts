"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export type LeadOperationType =
  | "TRANSFER"
  | "DISPOSE"
  | "DELETE"
  | "PERMANENT_DELETE"
  | "UNALLOT"
  | "EXPORT";

export type LeadTypeKey =
  | "FRESH"
  | "OLD"
  | "TRIALS"
  | "CLIENTS"
  | "DISPOSED"
  | "DELETED"
  | "UNALLOTED";

export interface LeadOperationsFilterInput {
  profileId?: string | null;
  employeeId?: string | null;
  leadSource?: string | null;
  leadResponse?: string | null;
  numberOfLeads?: number | null;
  datePreset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  types?: LeadTypeKey[];
}

export interface LeadOperationsBootstrapData {
  profiles: Array<{ id: string; name: string }>;
  employees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    employeeProfileId: string | null;
    profileName: string | null;
    teamId: string | null;
    teamName: string | null;
  }>;
  leadSources: string[];
  leadResponses: string[];
}

export interface LeadOperationsPreviewResult {
  success: boolean;
  totalMatching: number;
  effectiveCount: number;
  error?: string;
}

export interface ExecuteLeadOperationInput {
  filters: LeadOperationsFilterInput;
  operation: LeadOperationType;
  targetProfileId?: string | null;
  targetUserId?: string | null;
  targetLeadSource?: string | null;
  targetLeadResponse?: string | null;
}

export interface LeadExportRow {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  state: string | null;
  status: string;
  leadSource: string | null;
  leadResponse: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface ExecuteLeadOperationResult {
  success: boolean;
  count: number;
  message?: string;
  error?: string;
  exportData?: LeadExportRow[];
}

// Canonical response variants dictionary
const RESPONSE_VARIANTS_MAP: Record<string, string[]> = {
  "Call Back": ["Call Back", "callback", "Callback", "CALL BACK", "call_back", "CB", "cb"],
  "NPC": ["NPC", "npc", "Npc"],
  "Do Not Trade": ["Do Not Trade", "do not trade", "DNT", "dnt"],
  "Not Reachable": ["Not Reachable", "not reachable", "Not Rechable", "not rechable", "unreachable", "Unreachable"],
  "Switch Off": ["Switch Off", "switch off", "Switched Off", "switched off"],
  "Not Interested": ["Not Interested", "not interested", "Not Intrested", "not intrested", "NI", "ni"],
  "Call Disconnected": ["Call Disconnected", "call disconnected", "Call Disconnect", "call disconnect", "disconnected"],
  "Language Issue": ["Language Issue", "language issue"],
  "Busy": ["Busy", "busy"],
  "FT": ["FT", "ft", "Free Trial", "free trial", "Trial", "trial"],
  "Interested": ["Interested", "interested", "Intrested", "intrested"],
  "Paid": ["Paid", "paid", "Payment", "payment"],
};

function getResponseVariants(response: string): string[] {
  const trimmed = response.trim();
  const lower = trimmed.toLowerCase();
  for (const [canonical, variants] of Object.entries(RESPONSE_VARIANTS_MAP)) {
    if (canonical.toLowerCase() === lower || variants.some((v) => v.toLowerCase() === lower)) {
      return Array.from(new Set([canonical, trimmed, ...variants]));
    }
  }
  return [trimmed];
}

/**
 * Builds Prisma WhereInput strictly matching Lead Operations criteria.
 */
function buildLeadOperationsWhere(filters: LeadOperationsFilterInput): Prisma.LeadWhereInput {
  const andConditions: Prisma.LeadWhereInput[] = [];

  // 1. Employee filter
  if (filters.employeeId && filters.employeeId.trim()) {
    const emp = filters.employeeId.trim();
    if (emp === "UNALLOTED" || emp === "UNASSIGNED") {
      andConditions.push({ allotToId: null });
    } else {
      andConditions.push({ allotToId: emp });
    }
  } else if (filters.profileId && filters.profileId.trim()) {
    // If specific profile selected without a specific employee, filter to employees in that profile
    andConditions.push({
      allotTo: {
        employeeProfileId: filters.profileId.trim(),
      },
    });
  }

  // 2. Lead Source filter
  if (filters.leadSource && filters.leadSource.trim() && filters.leadSource !== "ALL") {
    andConditions.push({
      leadSource: {
        equals: filters.leadSource.trim(),
        mode: "insensitive",
      },
    });
  }

  // 3. Lead Response filter
  if (filters.leadResponse && filters.leadResponse.trim() && filters.leadResponse !== "ALL") {
    const variants = getResponseVariants(filters.leadResponse.trim());
    andConditions.push({
      leadResponse: { in: variants },
    });
  }

  // 4. Date filter
  const now = new Date();
  let dateRange: { gte?: Date; lte?: Date } | null = null;

  if (filters.datePreset) {
    const preset = filters.datePreset.toUpperCase();
    if (preset === "TODAY") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      dateRange = { gte: start, lte: end };
    } else if (preset === "YESTERDAY") {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      dateRange = { gte: start, lte: end };
    } else if (preset === "THIS_WEEK") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      dateRange = { gte: start, lte: now };
    } else if (preset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateRange = { gte: start, lte: now };
    } else if (preset === "LAST_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateRange = { gte: start, lte: end };
    }
  }

  if (!dateRange && (filters.startDate || filters.endDate)) {
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.startDate) {
      const s = new Date(filters.startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        range.gte = s;
      }
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        range.lte = e;
      }
    }
    if (range.gte || range.lte) {
      dateRange = range;
    }
  }

  if (dateRange) {
    andConditions.push({ createdAt: dateRange });
  }

  // 5. Type filter (Fresh, Old, Free Trials, Clients, Disposed, Deleted, Un-alloted)
  if (filters.types && filters.types.length > 0) {
    const typeOrConditions: Prisma.LeadWhereInput[] = [];

    for (const t of filters.types) {
      switch (t) {
        case "FRESH":
          typeOrConditions.push({ status: { in: ["UNREAD", "UNFOLLOWED"] } });
          break;
        case "OLD":
          typeOrConditions.push({ status: { in: ["FOLLOW_UP", "FOLLOWUPS", "READ"] } });
          break;
        case "TRIALS":
          typeOrConditions.push({ status: { in: ["TRIAL", "TRIALS"] } });
          break;
        case "CLIENTS":
          typeOrConditions.push({ status: { in: ["CLIENT", "CLIENTS"] } });
          break;
        case "DISPOSED":
          typeOrConditions.push({ status: { in: ["DISPOSED", "DISPOSE"] } });
          break;
        case "DELETED":
          typeOrConditions.push({ status: "DELETED" });
          break;
        case "UNALLOTED":
          typeOrConditions.push({ allotToId: null });
          break;
      }
    }

    if (typeOrConditions.length > 0) {
      andConditions.push({ OR: typeOrConditions });
    }
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

/**
 * Bootstrap data loader for the Lead Operations screen.
 */
export async function getLeadOperationsBootstrapAction(): Promise<{
  success: boolean;
  data?: LeadOperationsBootstrapData;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const [profiles, employees, masterSources, distinctSources, masterResponses, distinctResponses] =
      await Promise.all([
        // Active employee profiles
        prisma.employeeProfile.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),

        // Active employees
        prisma.user.findMany({
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeProfileId: true,
            employeeProfile: {
              select: { id: true, name: true },
            },
            teamId: true,
            team: {
              select: { id: true, name: true },
            },
          },
          orderBy: { name: "asc" },
        }),

        // Master Lead Sources
        prisma.leadSource.findMany({
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        }),

        // Distinct existing Lead Sources on leads
        prisma.lead.findMany({
          where: { leadSource: { not: null } },
          select: { leadSource: true },
          distinct: ["leadSource"],
        }),

        // Master Lead Responses
        prisma.leadResponse.findMany({
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        }),

        // Distinct existing Lead Responses on leads
        prisma.lead.findMany({
          where: { leadResponse: { not: null } },
          select: { leadResponse: true },
          distinct: ["leadResponse"],
        }),
      ]);

    // Merge and deduplicate Lead Sources
    const leadSourcesSet = new Set<string>();
    masterSources.forEach((s) => s.name && leadSourcesSet.add(s.name.trim()));
    distinctSources.forEach((s) => s.leadSource && leadSourcesSet.add(s.leadSource.trim()));

    // Merge and deduplicate Lead Responses
    const leadResponsesSet = new Set<string>();
    masterResponses.forEach((r) => r.name && leadResponsesSet.add(r.name.trim()));
    distinctResponses.forEach((r) => r.leadResponse && leadResponsesSet.add(r.leadResponse.trim()));

    return {
      success: true,
      data: {
        profiles,
        employees: employees.map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          role: e.role,
          employeeProfileId: e.employeeProfileId,
          profileName: e.employeeProfile?.name || null,
          teamId: e.teamId,
          teamName: e.team?.name || null,
        })),
        leadSources: Array.from(leadSourcesSet).sort((a, b) => a.localeCompare(b)),
        leadResponses: Array.from(leadResponsesSet).sort((a, b) => a.localeCompare(b)),
      },
    };
  } catch (err) {
    console.error("[GET_LEAD_OPERATIONS_BOOTSTRAP_ERROR]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load lead operations configuration.",
    };
  }
}

/**
 * Preview matching leads count based on current "Leads From" filters.
 */
export async function previewLeadOperationsMatchCountAction(
  filters: LeadOperationsFilterInput
): Promise<LeadOperationsPreviewResult> {
  try {
    await requireAdminSession({ redirect: false });

    const where = buildLeadOperationsWhere(filters);
    const totalMatching = await prisma.lead.count({ where });

    let effectiveCount = totalMatching;
    if (filters.numberOfLeads && filters.numberOfLeads > 0) {
      effectiveCount = Math.min(totalMatching, filters.numberOfLeads);
    }

    return {
      success: true,
      totalMatching,
      effectiveCount,
    };
  } catch (err) {
    console.error("[PREVIEW_LEAD_OPERATIONS_MATCH_COUNT_ERROR]", err);
    return {
      success: false,
      totalMatching: 0,
      effectiveCount: 0,
      error: err instanceof Error ? err.message : "Failed to calculate matching leads count.",
    };
  }
}

/**
 * Executes a chosen bulk operation on leads matching the specified criteria.
 */
export async function executeLeadOperationAction(
  payload: ExecuteLeadOperationInput
): Promise<ExecuteLeadOperationResult> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const where = buildLeadOperationsWhere(payload.filters);
    const takeLimit =
      payload.filters.numberOfLeads && payload.filters.numberOfLeads > 0
        ? payload.filters.numberOfLeads
        : undefined;

    // Fetch matching leads up to the take limit
    const targetLeads = await prisma.lead.findMany({
      where,
      take: takeLimit,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        city: true,
        state: true,
        status: true,
        leadSource: true,
        leadResponse: true,
        createdAt: true,
        allotTo: {
          select: { name: true },
        },
      },
    });

    if (targetLeads.length === 0) {
      return {
        success: false,
        count: 0,
        error: "No matching leads found for the specified criteria.",
      };
    }

    const targetIds = targetLeads.map((l) => l.id);

    // 1. EXPORT OPERATION
    if (payload.operation === "EXPORT") {
      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_EXPORT",
        details: `Exported ${targetLeads.length} lead(s) via Lead Operations screen.`,
      });

      const exportData: LeadExportRow[] = targetLeads.map((r) => ({
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        email: r.email,
        city: r.city,
        state: r.state,
        status: r.status,
        leadSource: r.leadSource,
        leadResponse: r.leadResponse,
        assignedToName: r.allotTo?.name || null,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        success: true,
        count: exportData.length,
        message: `Successfully prepared ${exportData.length} lead(s) for export.`,
        exportData,
      };
    }

    // 2. TRANSFER OPERATION
    if (payload.operation === "TRANSFER") {
      if (!payload.targetUserId || !payload.targetUserId.trim()) {
        return {
          success: false,
          count: 0,
          error: "Please select a Target Employee in 'Leads To' to transfer leads.",
        };
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: payload.targetUserId.trim() },
        select: { id: true, name: true, teamId: true },
      });

      if (!targetUser) {
        return {
          success: false,
          count: 0,
          error: "The selected target employee does not exist.",
        };
      }

      const targetSource = payload.targetLeadSource?.trim();
      const targetResponse = payload.targetLeadResponse?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: targetIds } },
          data: {
            allotToId: targetUser.id,
            teamId: targetUser.teamId || null,
            ...(targetSource && targetSource !== "ALL" ? { leadSource: targetSource } : {}),
            status: "UNREAD",
            leadResponse: targetResponse && targetResponse !== "ALL" ? targetResponse : null,
            callbackDate: null,
            updatedAt: new Date(),
          },
        });
      });

      await logActivity({
        actorId: admin.id,
        targetUserId: targetUser.id,
        targetTeamId: targetUser.teamId || undefined,
        action: "LEAD_BULK_TRANSFER",
        details: `Bulk TRANSFER executed on ${targetIds.length} lead(s) to ${targetUser.name} via Lead Operations.${
          targetSource ? ` (Source: '${targetSource}')` : ""
        }`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully transferred ${targetIds.length} lead(s) to ${targetUser.name}.`,
      };
    }

    // 3. DISPOSE OPERATION
    if (payload.operation === "DISPOSE") {
      await prisma.lead.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: "DISPOSED",
          updatedAt: new Date(),
        },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DISPOSE",
        details: `Bulk marked ${targetIds.length} lead(s) as DISPOSED via Lead Operations.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully marked ${targetIds.length} lead(s) as Disposed.`,
      };
    }

    // 4. SOFT DELETE OPERATION
    if (payload.operation === "DELETE") {
      await prisma.lead.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: "DELETED",
          allotToId: null,
          teamId: null,
          updatedAt: new Date(),
        },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DELETE",
        details: `Bulk marked ${targetIds.length} lead(s) as DELETED via Lead Operations.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully moved ${targetIds.length} lead(s) to Deleted Bin.`,
      };
    }

    // 5. PERMANENT DELETE OPERATION
    if (payload.operation === "PERMANENT_DELETE") {
      await prisma.$transaction(async (tx) => {
        // Cascade delete child records
        await tx.callLog.deleteMany({
          where: { leadId: { in: targetIds } },
        });
        await tx.lead.deleteMany({
          where: { id: { in: targetIds } },
        });
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DELETE_FOREVER",
        details: `Permanently deleted ${targetIds.length} lead(s) and their call history from database via Lead Operations.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Permanently deleted ${targetIds.length} lead(s) and associated logs from database.`,
      };
    }

    // 6. UN-ALLOT (RECYCLE TO POOL) OPERATION
    if (payload.operation === "UNALLOT") {
      const targetSource = payload.targetLeadSource?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: targetIds } },
          data: {
            allotToId: null,
            teamId: null,
            status: "UNREAD",
            leadResponse: null,
            callbackDate: null,
            ...(targetSource && targetSource !== "ALL" ? { leadSource: targetSource } : {}),
            updatedAt: new Date(),
          },
        });
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_RECYCLE",
        details: `Bulk un-allotted ${targetIds.length} lead(s) back to pool via Lead Operations.${
          targetSource ? ` (Source: '${targetSource}')` : ""
        }`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully un-allotted ${targetIds.length} lead(s) back to the unassigned pool.`,
      };
    }

    return {
      success: false,
      count: 0,
      error: "Unsupported operation requested.",
    };
  } catch (err) {
    console.error("[EXECUTE_LEAD_OPERATION_ERROR]", err);
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to execute lead operation.",
    };
  }
}
