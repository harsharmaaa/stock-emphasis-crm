"use server";

import { requireEmployeeSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import {
  normalizePhoneNumber,
  normalizeStatusFilter,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
} from "@/src/lib/utils";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { getActiveLeadResponseNames } from "@/src/lib/lead-responses-helper";
import { logActivity } from "@/src/lib/activity-logger";
import { checkLeadHasConfirmedPayment, type CreateLeadInput } from "@/src/features/leads/actions";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// Canonical responses mapping
const CANONICAL_RESPONSE_MAP: Record<string, string> = {
  "call back": "Call Back",
  "callback": "Call Back",
  "call_back": "Call Back",
  "cb": "Call Back",
  "npc": "NPC",
  "do not trade": "Do Not Trade",
  "dnt": "Do Not Trade",
  "not reachable": "Not Reachable",
  "not rechable": "Not Reachable",
  "unreachable": "Not Reachable",
  "switch off": "Switch Off",
  "switched off": "Switch Off",
  "not interested": "Not Interested",
  "not intrested": "Not Interested",
  "ni": "Not Interested",
  "call disconnect": "Call Disconnected",
  "call disconnected": "Call Disconnected",
  "call disconnected ": "Call Disconnected",
  "disconnected": "Call Disconnected",
  "language issue": "Language Issue",
  "busy": "Busy",
  "ft": "FT",
  "free trial": "FT",
  "trial": "FT",
  "interested": "Interested",
  "intrested": "Interested",
  "paid": "Paid",
  "payment": "Paid",
};

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

function normalizeCanonicalResponse(resp: string): string {
  const trimmed = resp.trim();
  const lower = trimmed.toLowerCase();
  if (CANONICAL_RESPONSE_MAP[lower]) {
    return CANONICAL_RESPONSE_MAP[lower];
  }
  return trimmed;
}

function getResponseFilterVariants(canonicalOrRaw: string): string[] {
  const canonical = normalizeCanonicalResponse(canonicalOrRaw);
  const variants = RESPONSE_VARIANTS_MAP[canonical];
  if (variants && variants.length > 0) {
    return Array.from(new Set([canonical, canonicalOrRaw, ...variants]));
  }
  return Array.from(
    new Set([
      canonicalOrRaw,
      canonicalOrRaw.toLowerCase(),
      canonicalOrRaw.toUpperCase(),
    ])
  );
}

export interface EmployeeLeadItem {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  state: string | null;
  city: string | null;
  district: string | null;
  alternateMobile: string | null;
  dob: string | null;
  aadhar: string | null;
  fatherName: string | null;
  pan: string | null;
  gstin: string | null;
  occupation: string | null;
  segment: string | null;
  investment: string | null;
  profile: string | null;
  leadResponse: string | null;
  leadSource: string | null;
  description: string | null;
  experience: string | null;
  status: string;
  callbackDate: string | null;
  allotToId: string | null;
  teamId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
}

export interface EmployeeStatusCounts {
  ALL: number;
  UNREAD: number;
  READ: number;
  FOLLOW_UP: number;
  TRIAL: number;
  CLIENT: number;
  DISPOSED: number;
}

export interface GetEmployeeLeadsOptions {
  status?: string;
  statusIn?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  take?: number;
  skip?: number;
  all?: boolean;
  lastUpdateDate?: string | null;
  lastUpdateDateType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leadSource?: string | null;
  leadResponse?: string | null;
  leadResponseIn?: string[];
  trialStatus?: string | null;
  serviceStatus?: string | null;
  serviceId?: string | null;
  createdById?: string | null;
  leadOwnerId?: string | null;
  teamId?: string | null;
  leadAssignment?: string | null;
  paidRange?: string | null;
  recycleCount?: number | string | null;
  mobile?: string | null;
}

export interface EmployeeFetchSourceItem {
  source: string;
  availableLeadsCount: number;
  remainingLimit: number;
  totalLimit: number;
  formattedRemaining: string;
  poolAvailableCount: number;
  status: "LEADS_AVAILABLE" | "CAN_FETCH" | "NO_LEADS";
  batchSize: number;
  availableLimit: number;
}

/**
 * Retrieves leads strictly isolated to the authenticated employee (allotToId: employee.id).
 * Rocket-fast execution: executes groupBy counts, paginated findMany with lean selection,
 * and count in a single Promise.all call.
 */
export async function getEmployeeLeadsAction(
  statusOrOptions?: string | GetEmployeeLeadsOptions
): Promise<{
  success: boolean;
  leads?: EmployeeLeadItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  statusCounts?: EmployeeStatusCounts;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const isOptionsObj = typeof statusOrOptions === "object" && statusOrOptions !== null;
    const statusParam =
      typeof statusOrOptions === "string"
        ? statusOrOptions
        : statusOrOptions?.status;
    const searchParam = isOptionsObj
      ? statusOrOptions?.search?.trim()
      : undefined;

    const normalizedStatus = normalizeStatusFilter(statusParam);

    const page = isOptionsObj && statusOrOptions.page ? Math.max(1, statusOrOptions.page) : 1;
    const pageSize = isOptionsObj && statusOrOptions.pageSize
      ? Math.max(1, Math.min(100, statusOrOptions.pageSize))
      : isOptionsObj && statusOrOptions.take
        ? Math.max(1, Math.min(100, statusOrOptions.take))
        : 25;

    const skip = isOptionsObj && statusOrOptions.skip !== undefined
      ? Math.max(0, statusOrOptions.skip)
      : (page - 1) * pageSize;

    const shouldTakeAll = isOptionsObj && statusOrOptions.all === true;
    const take = shouldTakeAll ? undefined : pageSize;

    // Strict Employee Ownership Filter
    const employeeBoundary: Prisma.LeadWhereInput = {
      allotToId: employee.id,
    };

    // Status Filter Condition supporting tab aliases
    let statusFilterCondition: Prisma.LeadWhereInput = {};
    if (normalizedStatus && normalizedStatus !== "ALL") {
      if (normalizedStatus === "UNREAD" || normalizedStatus === "UNFOLLOWED") {
        statusFilterCondition = { status: { in: ["UNREAD", "UNFOLLOWED"] } };
      } else if (normalizedStatus === "FOLLOW_UP" || normalizedStatus === "FOLLOWUPS") {
        statusFilterCondition = { status: { in: ["FOLLOW_UP", "FOLLOWUPS"] } };
      } else if (normalizedStatus === "TRIAL" || normalizedStatus === "TRIALS") {
        statusFilterCondition = { status: { in: ["TRIAL", "TRIALS"] } };
      } else if (normalizedStatus === "CLIENT" || normalizedStatus === "CLIENTS") {
        statusFilterCondition = { status: { in: ["CLIENT", "CLIENTS"] } };
      } else {
        statusFilterCondition = { status: normalizedStatus };
      }
    }

    const andConditions: Prisma.LeadWhereInput[] = [
      employeeBoundary,
    ];

    // Modal / Multi-select stages condition
    let stagesCondition: Prisma.LeadWhereInput | null = null;
    if (isOptionsObj && statusOrOptions.statusIn && statusOrOptions.statusIn.length > 0) {
      const expandedStatuses: string[] = [];
      for (const st of statusOrOptions.statusIn) {
        const norm = normalizeStatusFilter(st) || st.toUpperCase();
        if (norm === "UNREAD" || norm === "UNFOLLOWED") {
          expandedStatuses.push("UNREAD", "UNFOLLOWED");
        } else if (norm === "FOLLOW_UP" || norm === "FOLLOWUPS") {
          expandedStatuses.push("FOLLOW_UP", "FOLLOWUPS");
        } else if (norm === "TRIAL" || norm === "TRIALS") {
          expandedStatuses.push("TRIAL", "TRIALS");
        } else if (norm === "CLIENT" || norm === "CLIENTS") {
          expandedStatuses.push("CLIENT", "CLIENTS");
        } else if (norm === "DISPOSED" || norm === "DISPOSE") {
          expandedStatuses.push("DISPOSED", "DISPOSE");
        } else {
          expandedStatuses.push(norm);
        }
      }
      stagesCondition = { status: { in: Array.from(new Set(expandedStatuses)) } };
    }

    // Modal / Multi-select responses condition (expanded with all spelling/casing variants)
    let responsesCondition: Prisma.LeadWhereInput | null = null;
    if (isOptionsObj && statusOrOptions.leadResponseIn && statusOrOptions.leadResponseIn.length > 0) {
      const allVariants = statusOrOptions.leadResponseIn.flatMap((resp) =>
        getResponseFilterVariants(resp)
      );
      responsesCondition = { leadResponse: { in: Array.from(new Set(allVariants)) } };
    }

    if (stagesCondition && responsesCondition) {
      andConditions.push({
        OR: [stagesCondition, responsesCondition],
      });
    } else if (stagesCondition) {
      andConditions.push(stagesCondition);
    } else if (responsesCondition) {
      andConditions.push(responsesCondition);
    } else if (Object.keys(statusFilterCondition).length > 0) {
      andConditions.push(statusFilterCondition);
    }

    if (searchParam) {
      andConditions.push({
        OR: [
          { name: { contains: searchParam, mode: "insensitive" } },
          { mobile: { contains: searchParam } },
          { email: { contains: searchParam, mode: "insensitive" } },
          { city: { contains: searchParam, mode: "insensitive" } },
          { state: { contains: searchParam, mode: "insensitive" } },
        ],
      });
    }

    if (isOptionsObj) {
      const dateType = statusOrOptions.lastUpdateDateType?.trim();

      if (dateType === "pending callback") {
        andConditions.push({
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          callbackDate: { lt: new Date(), not: null },
        });
      } else if (dateType === "upcomming callback") {
        andConditions.push({
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          callbackDate: { gte: new Date() },
        });
      } else if (dateType === "pending followup") {
        andConditions.push({
          status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
          callbackDate: null,
        });
      }

      // Date condition handling (supporting startDate/endDate range as well as single lastUpdateDate)
      const dateCondition: Prisma.DateTimeFilter = {};
      if (statusOrOptions.startDate?.trim()) {
        const s = new Date(statusOrOptions.startDate.trim());
        if (!isNaN(s.getTime())) {
          s.setHours(0, 0, 0, 0);
          dateCondition.gte = s;
        }
      }
      if (statusOrOptions.endDate?.trim()) {
        const e = new Date(statusOrOptions.endDate.trim());
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          dateCondition.lte = e;
        }
      }
      if (!dateCondition.gte && !dateCondition.lte && statusOrOptions.lastUpdateDate?.trim()) {
        const d = new Date(statusOrOptions.lastUpdateDate.trim());
        if (!isNaN(d.getTime())) {
          const s = new Date(d);
          s.setHours(0, 0, 0, 0);
          const e = new Date(d);
          e.setHours(23, 59, 59, 999);
          dateCondition.gte = s;
          dateCondition.lte = e;
        }
      }

      if (dateCondition.gte || dateCondition.lte) {
        if (dateType === "Call Back date") {
          andConditions.push({ callbackDate: dateCondition });
        } else if (dateType === "Trial added date") {
          andConditions.push({ trials: { some: { createdAt: dateCondition } } });
        } else if (dateType === "client conversion date") {
          andConditions.push({
            payments: { some: { createdAt: dateCondition, status: "APPROVED" } },
          });
        } else if (dateType === "updated followup" || dateType === "followup added date") {
          andConditions.push({ updatedAt: dateCondition });
        } else if (dateType === "Lead uploaded date" || dateType === "lead alloted date") {
          andConditions.push({ createdAt: dateCondition });
        } else {
          andConditions.push({ createdAt: dateCondition });
        }
      }

      if (statusOrOptions.leadSource?.trim()) {
        andConditions.push({
          leadSource: { equals: statusOrOptions.leadSource.trim(), mode: "insensitive" },
        });
      }

      if (
        statusOrOptions.leadResponse?.trim() &&
        (!statusOrOptions.leadResponseIn || statusOrOptions.leadResponseIn.length === 0)
      ) {
        const variants = getResponseFilterVariants(statusOrOptions.leadResponse.trim());
        if (variants.length === 1) {
          andConditions.push({ leadResponse: variants[0] });
        } else {
          andConditions.push({ leadResponse: { in: variants } });
        }
      }

      if (statusOrOptions.trialStatus?.trim()) {
        andConditions.push({
          trials: { some: { status: statusOrOptions.trialStatus.trim() } },
        });
      }

      if (statusOrOptions.serviceStatus?.trim()) {
        andConditions.push({
          invoices: { some: { status: statusOrOptions.serviceStatus.trim() } },
        });
      }

      if (statusOrOptions.serviceId?.trim()) {
        andConditions.push({
          invoices: { some: { productId: statusOrOptions.serviceId.trim() } },
        });
      }

      if (statusOrOptions.createdById?.trim()) {
        const cb = statusOrOptions.createdById.trim();
        if (cb === "ADMIN" || cb === "ADMIN_ROLE") {
          andConditions.push({ createdBy: { role: "ADMIN" } });
        } else {
          andConditions.push({ createdById: cb });
        }
      }

      if (statusOrOptions.teamId?.trim()) {
        andConditions.push({ teamId: statusOrOptions.teamId.trim() });
      }

      if (statusOrOptions.leadAssignment?.trim()) {
        const assign = statusOrOptions.leadAssignment.trim();
        if (assign === "Fetched Leads") {
          andConditions.push({ createdById: employee.id });
        } else if (assign === "Alloted Leads" || assign === "Transferred Leads") {
          andConditions.push({ createdById: { not: employee.id } });
        }
      }

      if (statusOrOptions.paidRange?.trim()) {
        const parts = statusOrOptions.paidRange
          .split("-")
          .map((p) => parseFloat(p.trim()))
          .filter((n) => !isNaN(n));
        if (parts.length === 2) {
          andConditions.push({
            payments: {
              some: {
                status: "APPROVED",
                amount: { gte: parts[0], lte: parts[1] },
              },
            },
          });
        } else if (parts.length === 1) {
          andConditions.push({
            payments: {
              some: {
                status: "APPROVED",
                amount: { gte: parts[0] },
              },
            },
          });
        }
      }

      if (statusOrOptions.mobile?.trim()) {
        andConditions.push({ mobile: { contains: statusOrOptions.mobile.trim() } });
      }
    }

    const where: Prisma.LeadWhereInput = {
      AND: andConditions,
    };

    // Parallel Execution for Rocket-Fast Performance:
    // 1. Total matching count
    // 2. Paginated leads with lean select
    // 3. Tab status distribution via groupBy
    const [totalCount, rawLeads, statusStats] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
          state: true,
          city: true,
          district: true,
          alternateMobile: true,
          dob: true,
          aadhar: true,
          fatherName: true,
          pan: true,
          gstin: true,
          occupation: true,
          segment: true,
          investment: true,
          profile: true,
          leadResponse: true,
          leadSource: true,
          description: true,
          experience: true,
          status: true,
          callbackDate: true,
          allotToId: true,
          teamId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: employeeBoundary,
        _count: { _all: true },
      }),
    ]);

    const statusCounts: EmployeeStatusCounts = {
      ALL: 0,
      UNREAD: 0,
      READ: 0,
      FOLLOW_UP: 0,
      TRIAL: 0,
      CLIENT: 0,
      DISPOSED: 0,
    };

    for (const item of statusStats) {
      const s = (item.status || "").toUpperCase();
      const count = item._count._all;
      statusCounts.ALL += count;
      if (s === "UNREAD" || s === "UNFOLLOWED") statusCounts.UNREAD += count;
      else if (s === "READ") statusCounts.READ += count;
      else if (s === "FOLLOW_UP" || s === "FOLLOWUPS") statusCounts.FOLLOW_UP += count;
      else if (s === "TRIAL" || s === "TRIALS") statusCounts.TRIAL += count;
      else if (s === "CLIENT" || s === "CLIENTS") statusCounts.CLIENT += count;
      else if (s === "DISPOSED") statusCounts.DISPOSED += count;
    }

    const leads: EmployeeLeadItem[] = rawLeads.map((l) => ({
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      email: l.email,
      state: l.state,
      city: l.city,
      district: l.district,
      alternateMobile: l.alternateMobile,
      dob: l.dob ? l.dob.toISOString() : null,
      aadhar: l.aadhar,
      fatherName: l.fatherName,
      pan: l.pan,
      gstin: l.gstin,
      occupation: l.occupation,
      segment: l.segment,
      investment: l.investment,
      profile: l.profile,
      leadResponse: l.leadResponse,
      leadSource: l.leadSource,
      description: l.description,
      experience: l.experience,
      status: l.status,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : null,
      allotToId: l.allotToId,
      teamId: l.teamId,
      createdById: l.createdById,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      assignedTo: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      },
      team: l.team ? { id: l.team.id, name: l.team.name } : null,
    }));

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      success: true,
      leads,
      totalCount,
      totalPages,
      currentPage: page,
      statusCounts,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load employee leads.");
  }
}

/**
 * Loads permitted lead sources configured by Admin for this employee,
 * checking unattended lead counts, remaining fetch quota, pool availability, and button statuses.
 */
export async function getEmployeeFetchSourcesAction(): Promise<{
  success: boolean;
  sources?: EmployeeFetchSourceItem[];
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const employeeUser = await prisma.user.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        employeeProfileId: true,
        role: true,
      },
    });

    if (!employeeUser) {
      return { success: true, sources: [] };
    }

    // Query rules assigned directly to this employee or their profile
    const permittedRules = await prisma.fetchLimitRule.findMany({
      where: {
        OR: [
          { assignedUsers: { some: { id: employee.id } } },
          ...(employeeUser.employeeProfileId
            ? [{ profiles: { some: { id: employeeUser.employeeProfileId } } }]
            : []),
        ],
      },
      include: {
        assignedUsers: { select: { id: true } },
        profiles: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (permittedRules.length === 0) {
      return { success: true, sources: [] };
    }

    // Deduplicate rules by leadSource, prioritizing direct user assignment
    const sourceRuleMap = new Map<string, (typeof permittedRules)[0]>();
    for (const rule of permittedRules) {
      const existing = sourceRuleMap.get(rule.leadSource);
      if (!existing) {
        sourceRuleMap.set(rule.leadSource, rule);
      } else {
        const isDirect = rule.assignedUsers.some((u) => u.id === employee.id);
        const existingIsDirect = existing.assignedUsers.some((u) => u.id === employee.id);
        if (isDirect && !existingIsDirect) {
          sourceRuleMap.set(rule.leadSource, rule);
        }
      }
    }

    const distinctRules = Array.from(sourceRuleMap.values());

    const sourceItems: EmployeeFetchSourceItem[] = await Promise.all(
      distinctRules.map(async (rule) => {
        const source = rule.leadSource;
        const availableLimit = rule.availableLimit;
        const fetchLimit = rule.fetchLimit;
        const fetchCount = rule.fetchCount;

        const usage = await prisma.employeeFetchUsage.findUnique({
          where: {
            userId_ruleId: { userId: employee.id, ruleId: rule.id },
          },
        });

        const usedFetches = usage?.successfulFetches || 0;
        const remainingFetches = Math.max(0, fetchCount - usedFetches);
        const formattedRemaining = `${remainingFetches}/${fetchCount}`;

        // Unattended leads currently held by this employee for this source
        const availableLeadsCount = await prisma.lead.count({
          where: {
            allotToId: employee.id,
            leadSource: source,
            status: { in: ["UNREAD", "UNFOLLOWED"] },
          },
        });

        // Unassigned pool leads available for this source
        const poolAvailableCount = await prisma.lead.count({
          where: {
            leadSource: source,
            allotToId: null,
            teamId: null,
          },
        });

        let status: "LEADS_AVAILABLE" | "CAN_FETCH" | "NO_LEADS";
        if (availableLeadsCount > availableLimit) {
          status = "LEADS_AVAILABLE";
        } else if (poolAvailableCount <= 0 || remainingFetches <= 0) {
          status = "NO_LEADS";
        } else {
          status = "CAN_FETCH";
        }

        return {
          source,
          availableLeadsCount,
          remainingLimit: remainingFetches,
          totalLimit: fetchCount,
          formattedRemaining,
          poolAvailableCount,
          status,
          batchSize: fetchLimit,
          availableLimit,
        };
      })
    );

    return { success: true, sources: sourceItems };
  } catch (err) {
    return handleActionError(err, "Failed to load employee fetch sources.");
  }
}

/**
 * Claims up to rule.fetchLimit unassigned pool leads for a source and
 * allots them directly to the requesting employee.
 */
export async function employeeFetchSourceLeadsAction(
  source: string
): Promise<{
  success: boolean;
  allocatedCount?: number;
  source?: string;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const requestedSource = source?.trim();
    if (!requestedSource) {
      return { success: false, error: "Please specify a lead source to fetch." };
    }

    const employeeUser = await prisma.user.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        name: true,
        teamId: true,
        employeeProfileId: true,
        employeeProfile: { select: { name: true } },
      },
    });

    if (!employeeUser) {
      return { success: false, error: "Employee profile not found." };
    }

    // 1. Find matching rule
    const matchingRules = await prisma.fetchLimitRule.findMany({
      where: {
        leadSource: requestedSource,
        OR: [
          { assignedUsers: { some: { id: employee.id } } },
          ...(employeeUser.employeeProfileId
            ? [{ profiles: { some: { id: employeeUser.employeeProfileId } } }]
            : []),
        ],
      },
      include: {
        assignedUsers: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (matchingRules.length === 0) {
      return {
        success: false,
        error: `You are not permitted to fetch leads for source "${requestedSource}". Please contact your Administrator.`,
      };
    }

    const directRule = matchingRules.find((r) =>
      r.assignedUsers.some((u) => u.id === employee.id)
    );
    const winningRule = directRule || matchingRules[0];

    const availableLimit = winningRule.availableLimit;
    const fetchLimit = winningRule.fetchLimit;
    const fetchCount = winningRule.fetchCount;

    // 2. Threshold Guard: check unattended unread leads
    const availableLeadsCount = await prisma.lead.count({
      where: {
        allotToId: employee.id,
        leadSource: requestedSource,
        status: { in: ["UNREAD", "UNFOLLOWED"] },
      },
    });

    if (availableLeadsCount > availableLimit) {
      return {
        success: false,
        error: `Threshold reached: You have ${availableLeadsCount} unattended leads for "${requestedSource}". Max allowed threshold is ${availableLimit}. Please work on existing leads first.`,
      };
    }

    // 3. Quota Guard: check remaining fetches
    const existingUsage = await prisma.employeeFetchUsage.findUnique({
      where: {
        userId_ruleId: { userId: employee.id, ruleId: winningRule.id },
      },
    });

    const usedFetches = existingUsage?.successfulFetches || 0;
    if (usedFetches >= fetchCount) {
      return {
        success: false,
        error: `Fetch quota exhausted: You have used ${usedFetches}/${fetchCount} allotted fetch requests for "${requestedSource}".`,
      };
    }

    // 4. Atomic lead allotment within transaction
    const allocatedLeads = await prisma.$transaction(async (tx) => {
      const poolLeads = await tx.lead.findMany({
        where: {
          leadSource: requestedSource,
          allotToId: null,
          teamId: null,
        },
        take: fetchLimit,
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      if (poolLeads.length === 0) {
        return [];
      }

      const poolLeadIds = poolLeads.map((l) => l.id);

      await tx.lead.updateMany({
        where: { id: { in: poolLeadIds } },
        data: {
          allotToId: employee.id,
          teamId: employeeUser.teamId,
          status: "UNREAD",
        },
      });

      await tx.employeeFetchUsage.upsert({
        where: {
          userId_ruleId: { userId: employee.id, ruleId: winningRule.id },
        },
        create: {
          userId: employee.id,
          ruleId: winningRule.id,
          leadSource: requestedSource,
          successfulFetches: 1,
          lastFetchedAt: new Date(),
        },
        update: {
          successfulFetches: { increment: 1 },
          lastFetchedAt: new Date(),
        },
      });

      await tx.leadFetchLog.create({
        data: {
          userId: employee.id,
          ruleId: winningRule.id,
          leadSource: requestedSource,
          appliedProfile: employeeUser.employeeProfile?.name || "Employee",
          leadsCount: poolLeadIds.length,
          requestNumber: (existingUsage?.successfulFetches || 0) + 1,
          leadIds: poolLeadIds,
        },
      });

      return poolLeadIds;
    });

    if (allocatedLeads.length === 0) {
      return {
        success: false,
        error: `No unassigned leads currently available in the central pool for "${requestedSource}".`,
      };
    }

    await logActivity({
      actorId: employee.id,
      action: "LEAD_FETCHED",
      details: `Employee ${employee.name} fetched ${allocatedLeads.length} leads for source "${requestedSource}" under rule #${winningRule.id}`,
    });

    revalidatePath("/employee/leads");
    revalidatePath("/employee");

    return {
      success: true,
      allocatedCount: allocatedLeads.length,
      source: requestedSource,
    };
  } catch (err) {
    return handleActionError(err, "Failed to fetch leads.");
  }
}

export interface UpdateEmployeeLeadCallInput {
  leadId: string;
  leadResponse?: string | null;
  callbackDate?: string | null;
  description?: string | null;
  status?: string;
}

/**
 * Updates call disposition for a lead owned by this employee.
 * Implements response-to-pill transition rules and strictly guards CLIENT status.
 */
export async function updateEmployeeLeadCallAction(
  input: UpdateEmployeeLeadCallInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        allotToId: employee.id,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        leadResponse: true,
        description: true,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const updateData: Prisma.LeadUpdateInput = {};
    let chosenResponse: string | null = null;

    if (input.leadResponse !== undefined) {
      const resp = input.leadResponse?.trim() || null;
      if (resp) {
        if (["CLIENT", "CLIENTS"].includes(resp.toUpperCase())) {
          return { success: false, error: "Client status cannot be assigned manually via call disposition." };
        }
        const activeResponses = await getActiveLeadResponseNames();
        if (!activeResponses.includes(resp)) {
          return { success: false, error: "Invalid Lead Response selected." };
        }
      }
      chosenResponse = resp;
      updateData.leadResponse = resp;
    }

    if (input.callbackDate !== undefined) {
      if (input.callbackDate) {
        const d = new Date(input.callbackDate);
        updateData.callbackDate = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.callbackDate = null;
      }
    }

    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }

    // Automatic Response-to-Status Mapping:
    // - FT / TRIAL -> TRIAL
    // - DISPOSED -> DISPOSED
    // - FOLLOW_UP -> FOLLOW_UP
    // - Any other response: if already confirmed CLIENT, preserve; else -> READ fallback
    const normalizedResp = chosenResponse
      ? chosenResponse.toUpperCase()
      : input.leadResponse
        ? input.leadResponse.trim().toUpperCase()
        : "";

    const isExistingClient = ["CLIENT", "CLIENTS"].includes((existingLead.status || "").toUpperCase());

    if (["FT", "FREE TRIAL", "TRIAL"].includes(normalizedResp)) {
      updateData.status = "TRIAL";
    } else if (["DISPOSED", "DISPOSE"].includes(normalizedResp)) {
      updateData.status = "DISPOSED";
    } else if (
      input.status === "FOLLOW_UP" ||
      ["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(normalizedResp)
    ) {
      updateData.status = "FOLLOW_UP";
    } else if (normalizedResp) {
      if (isExistingClient) {
        updateData.status = existingLead.status;
      } else {
        updateData.status = "READ";
      }
    } else if (input.status !== undefined) {
      updateData.status = input.status?.trim() || existingLead.status;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await logActivity({
      actorId: employee.id,
      action: "LEAD_CALL_UPDATED",
      details: `Employee ${employee.name} updated call disposition for lead "${existingLead.name}" (${existingLead.mobile}) - Status: ${updateData.status || existingLead.status}`,
    });

    revalidatePath("/employee/leads");
    revalidatePath("/employee");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update lead call disposition.");
  }
}

/**
 * Returns active lead responses filtered to disallow manual CLIENT selection.
 */
export async function getActiveEmployeeLeadResponsesAction(): Promise<{
  success: boolean;
  responses?: string[];
  error?: string;
}> {
  try {
    await requireEmployeeSession({ redirect: false });
    const all = await getActiveLeadResponseNames();
    const filtered = all.filter(
      (r) => !["CLIENT", "CLIENTS"].includes(r.trim().toUpperCase())
    );
    return { success: true, responses: filtered };
  } catch (err) {
    return handleActionError(err, "Failed to load lead responses.");
  }
}

/**
 * Disposes a lead owned by the employee.
 */
export async function disposeEmployeeLeadAction(input: {
  leadId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId, reason } = input;

    const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: { id: true, name: true, mobile: true },
    });

    if (!existingLead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "DISPOSED",
        description: reason ? `[Disposed]: ${reason}` : undefined,
      },
    });

    await logActivity({
      actorId: employee.id,
      action: "LEAD_DISPOSED",
      details: `Employee ${employee.name} marked lead "${existingLead.name}" (${existingLead.mobile}) as DISPOSED. Reason: ${reason || "N/A"}`,
    });

    revalidatePath("/employee/leads");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to dispose lead.");
  }
}

/**
 * Restores a disposed lead back to active status (default: READ).
 */
export async function restoreEmployeeLeadAction(input: {
  leadId: string;
  targetStatus?: "READ" | "UNREAD";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId, targetStatus = "READ" } = input;

    const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: { id: true, name: true, mobile: true },
    });

    if (!existingLead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: targetStatus,
      },
    });

    await logActivity({
      actorId: employee.id,
      action: "LEAD_RESTORED",
      details: `Employee ${employee.name} restored lead "${existingLead.name}" to active pipeline (${targetStatus})`,
    });

    revalidatePath("/employee/leads");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to restore lead.");
  }
}

/**
 * Retrieves full details for a single employee-owned lead.
 */
export async function getEmployeeLeadDetailsAction(
  leadId: string
): Promise<{
  success: boolean;
  lead?: EmployeeLeadItem;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const l = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!l) {
      return { success: false, error: "Lead record not found or access denied." };
    }

    const lead: EmployeeLeadItem = {
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      email: l.email,
      state: l.state,
      city: l.city,
      district: l.district,
      alternateMobile: l.alternateMobile,
      dob: l.dob ? l.dob.toISOString() : null,
      aadhar: l.aadhar,
      fatherName: l.fatherName,
      pan: l.pan,
      gstin: l.gstin,
      occupation: l.occupation,
      segment: l.segment,
      investment: l.investment,
      profile: l.profile,
      leadResponse: l.leadResponse,
      leadSource: l.leadSource,
      description: l.description,
      experience: l.experience,
      status: l.status,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : null,
      allotToId: l.allotToId,
      teamId: l.teamId,
      createdById: l.createdById,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      assignedTo: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      },
      team: l.team ? { id: l.team.id, name: l.team.name } : null,
    };

    return { success: true, lead };
  } catch (err) {
    return handleActionError(err, "Failed to retrieve lead details.");
  }
}

export interface UpdateEmployeeLeadDetailsInput {
  leadId: string;
  name?: string | null;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  district?: string | null;
  alternateMobile?: string | null;
  dob?: string | null;
  fatherName?: string | null;
  pan?: string | null;
  gstin?: string | null;
  occupation?: string | null;
  segment?: string | null;
  investment?: string | null;
  leadResponse?: string | null;
  leadSource?: string | null;
  profile?: string | null;
  experience?: string | null;
  callbackDate?: string | null;
  description?: string | null;
  status?: string;
}

/**
 * Updates an employee-owned lead's details (profile, experience, callback date, comments, source, response).
 * Guards against converting to CLIENT without payment.
 */
export async function updateEmployeeLeadDetailsAction(
  input: UpdateEmployeeLeadDetailsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        leadResponse: true,
        leadSource: true,
        profile: true,
        experience: true,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Target lead does not exist or unauthorized access." };
    }

    const updateData: Record<string, unknown> = {};
    let chosenResponse: string | null = null;
    let isResponseExplicitlyProvided = false;

    if (input.name !== undefined) {
      updateData.name = input.name?.trim() || existingLead.name;
    }

    if (input.email !== undefined) {
      updateData.email = input.email?.trim() || null;
    }

    if (input.state !== undefined) {
      updateData.state = input.state?.trim() || null;
    }

    if (input.city !== undefined) {
      updateData.city = input.city?.trim() || null;
    }

    if (input.district !== undefined) {
      updateData.district = input.district?.trim() || null;
    }

    if (input.alternateMobile !== undefined) {
      updateData.alternateMobile = input.alternateMobile?.trim() || null;
    }

    if (input.dob !== undefined) {
      if (input.dob) {
        const d = new Date(input.dob);
        updateData.dob = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.dob = null;
      }
    }

    if (input.fatherName !== undefined) {
      updateData.fatherName = input.fatherName?.trim() || null;
    }

    if (input.pan !== undefined) {
      updateData.pan = input.pan?.trim() || null;
    }

    if (input.gstin !== undefined) {
      updateData.gstin = input.gstin?.trim() || null;
    }

    if (input.occupation !== undefined) {
      updateData.occupation = input.occupation?.trim() || null;
    }

    if (input.segment !== undefined) {
      updateData.segment = input.segment?.trim() || null;
    }

    if (input.investment !== undefined) {
      updateData.investment = input.investment?.trim() || null;
    }

    if (input.leadResponse !== undefined) {
      isResponseExplicitlyProvided = true;
      const resp = input.leadResponse?.trim() || null;
      if (resp) {
        if (["CLIENT", "CLIENTS"].includes(resp.toUpperCase())) {
          return { success: false, error: "Client status cannot be assigned manually via call disposition." };
        }
        const activeResponses = await getActiveLeadResponseNames();
        if (!activeResponses.includes(resp) && resp !== existingLead.leadResponse) {
          return { success: false, error: "Invalid Lead Response option." };
        }
      }
      chosenResponse = resp;
      updateData.leadResponse = resp;
    }

    if (input.leadSource !== undefined) {
      const src = input.leadSource?.trim() || null;
      const activeSources = await getActiveLeadSourceNames();
      if (src && !activeSources.includes(src) && src !== existingLead.leadSource) {
        return { success: false, error: "Invalid Lead Source option." };
      }
      updateData.leadSource = src;
    }

    if (input.profile !== undefined) {
      const prof = input.profile?.trim() || null;
      if (prof && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(prof) && prof !== existingLead.profile) {
        return { success: false, error: "Invalid Profile option." };
      }
      updateData.profile = prof;
    }

    if (input.experience !== undefined) {
      const exp = input.experience?.trim() || null;
      if (exp && !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(exp) && exp !== existingLead.experience) {
        return { success: false, error: "Invalid Experience option." };
      }
      updateData.experience = exp;
    }

    if (input.callbackDate !== undefined) {
      if (input.callbackDate) {
        const d = new Date(input.callbackDate);
        updateData.callbackDate = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.callbackDate = null;
      }
    }

    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }

    // Payment-Verified CLIENT Guard
    const isExistingClient = ["CLIENT", "CLIENTS"].includes((existingLead.status || "").toUpperCase());
    if (input.status !== undefined && ["CLIENT", "CLIENTS"].includes(input.status.trim().toUpperCase())) {
      const hasPayment = await checkLeadHasConfirmedPayment(leadId);
      if (!hasPayment) {
        return {
          success: false,
          error: "Cannot convert lead to Client without a confirmed/approved payment or active invoice.",
        };
      }
    }

    // Response-to-Pill Mapping
    const normalizedResp = chosenResponse
      ? chosenResponse.toUpperCase()
      : isResponseExplicitlyProvided && input.leadResponse
        ? input.leadResponse.trim().toUpperCase()
        : "";

    if (["FT", "FREE TRIAL", "TRIAL"].includes(normalizedResp)) {
      updateData.status = "TRIAL";
    } else if (["DISPOSED", "DISPOSE"].includes(normalizedResp) || input.status === "DISPOSED") {
      updateData.status = "DISPOSED";
    } else if (
      input.status === "FOLLOW_UP" ||
      ["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(normalizedResp)
    ) {
      updateData.status = "FOLLOW_UP";
    } else if (normalizedResp) {
      if (isExistingClient) {
        updateData.status = existingLead.status;
      } else if (
        input.status !== undefined &&
        !["UNFOLLOWED", "UNREAD", "READ"].includes(input.status.trim().toUpperCase())
      ) {
        updateData.status = input.status.trim();
      } else {
        updateData.status = "READ";
      }
    } else if (input.status !== undefined) {
      updateData.status = input.status.trim();
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData as Prisma.LeadUpdateInput,
    });

    await logActivity({
      actorId: employee.id,
      action: "LEAD_UPDATED",
      details: `Employee ${employee.name} updated details for lead "${existingLead.name}" (${existingLead.mobile})`,
    });

    revalidatePath("/employee/leads");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update lead details.");
  }
}

/**
 * Validates whether a phone number already exists in the database.
 * Used for live on-blur checks in the Add Lead form.
 */
export async function checkEmployeePhoneDuplicateAction(
  rawPhone: string
): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    await requireEmployeeSession({ redirect: false });
    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized || normalized.length < 10) {
      return { isDuplicate: false };
    }

    const existing = await prisma.lead.findFirst({
      where: {
        OR: [{ mobile: normalized }, { mobile: rawPhone.trim() }],
      },
      select: { id: true, name: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        message: "This number already exists.",
      };
    }

    return { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

export type CreateEmployeeLeadInput = CreateLeadInput;

/**
 * Creates a new lead registered by the employee, self-allocated to employee.id.
 */
export async function createEmployeeLeadAction(
  input: CreateLeadInput
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const trimmedName = input.name?.trim();
    const normalizedMobile = normalizePhoneNumber(input.mobile);

    if (!trimmedName) {
      return { success: false, error: "Name is required." };
    }
    if (!normalizedMobile || normalizedMobile.length < 10) {
      return { success: false, error: "Valid 10-digit mobile number is required." };
    }

    // Check duplicate phone
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [{ mobile: normalizedMobile }, { mobile: input.mobile.trim() }],
      },
    });

    if (existing) {
      return {
        success: false,
        error: `A lead with mobile ${normalizedMobile} already exists (${existing.name}).`,
      };
    }

    // Cannot manually create lead as CLIENT
    if (input.status && ["CLIENT", "CLIENTS"].includes(input.status.toUpperCase())) {
      return { success: false, error: "Cannot create lead directly as Client without confirmed payment." };
    }

    const rawResponse = input.leadResponse?.trim() || null;
    if (rawResponse && ["CLIENT", "CLIENTS"].includes(rawResponse.toUpperCase())) {
      return { success: false, error: "Client status cannot be assigned manually via call disposition." };
    }

    let initialStatus = "UNREAD";
    const normalizedResp = rawResponse ? rawResponse.toUpperCase() : "";

    if (["FT", "FREE TRIAL", "TRIAL"].includes(normalizedResp)) {
      initialStatus = "TRIAL";
    } else if (["DISPOSED", "DISPOSE"].includes(normalizedResp)) {
      initialStatus = "DISPOSED";
    } else if (["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(normalizedResp)) {
      initialStatus = "FOLLOW_UP";
    } else if (rawResponse) {
      initialStatus = "READ";
    } else if (input.status) {
      initialStatus = input.status.trim();
    }

    const employeeUser = await prisma.user.findUnique({
      where: { id: employee.id },
      select: { teamId: true },
    });

    const newLead = await prisma.lead.create({
      data: {
        name: trimmedName,
        mobile: normalizedMobile,
        email: input.email?.trim() || null,
        state: input.state?.trim() || null,
        city: input.city?.trim() || null,
        district: input.district?.trim() || null,
        alternateMobile: input.alternateMobile?.trim() || null,
        dob: input.dob ? new Date(input.dob) : null,
        aadhar: input.aadhar?.trim() || null,
        fatherName: input.fatherName?.trim() || null,
        pan: input.pan?.trim() || null,
        gstin: input.gstin?.trim() || null,
        occupation: input.occupation?.trim() || null,
        segment: input.segment?.trim() || null,
        investment: input.investment?.trim() || null,
        profile: input.profile?.trim() || null,
        leadResponse: rawResponse,
        leadSource: input.leadSource?.trim() || "DIRECT",
        description: input.description?.trim() || null,
        experience: input.experience?.trim() || null,
        status: initialStatus,
        callbackDate: input.callbackDate ? new Date(input.callbackDate) : null,
        allotToId: employee.id,
        teamId: employeeUser?.teamId || null,
        createdById: employee.id,
      },
    });

    await logActivity({
      actorId: employee.id,
      action: "LEAD_CREATED",
      details: `Employee ${employee.name} created new lead "${newLead.name}" (${newLead.mobile}) - Assigned to self`,
    });

    revalidatePath("/employee/leads");
    revalidatePath("/employee");

    return { success: true, leadId: newLead.id };
  } catch (err) {
    return handleActionError(err, "Failed to create lead.");
  }
}

/**
 * Returns timeline activity logs for an employee-owned lead.
 */
export async function getEmployeeLeadTimelineAction(leadId: string): Promise<{
  success: boolean;
  activities?: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    actor: { name: string; email: string } | null;
  }[];
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    // Validate ownership
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: { id: true, mobile: true, name: true },
    });

    if (!lead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { details: { contains: lead.id } },
          { details: { contains: lead.mobile } },
          { details: { contains: lead.name } },
        ],
      },
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const activities = logs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor ? { name: log.actor.name, email: log.actor.email } : null,
    }));

    return { success: true, activities };
  } catch (err) {
    return handleActionError(err, "Failed to load lead activity timeline.");
  }
}

export interface EmployeeDueCallbackItem {
  id: string;
  name: string;
  mobile: string;
  leadSource: string | null;
  leadResponse: string | null;
  callbackDate: string;
  description: string | null;
  status: string;
}

/**
 * Retrieves due or upcoming callbacks for the authenticated employee up to the end of the current day.
 * Strictly scoped to allotToId: employee.id.
 */
export async function getEmployeeDueCallbacksAction(): Promise<{
  success: boolean;
  callbacks?: EmployeeDueCallbackItem[];
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueLeads = await prisma.lead.findMany({
      where: {
        allotToId: employee.id,
        status: { in: ["FOLLOW_UP", "FOLLOWUPS"] },
        callbackDate: {
          not: null,
          lte: endOfToday,
        },
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        leadSource: true,
        leadResponse: true,
        callbackDate: true,
        description: true,
        status: true,
      },
      orderBy: {
        callbackDate: "asc",
      },
      take: 50,
    });

    const callbacks: EmployeeDueCallbackItem[] = dueLeads
      .filter((l): l is typeof l & { callbackDate: Date } => l.callbackDate !== null)
      .map((l) => ({
        id: l.id,
        name: l.name,
        mobile: l.mobile,
        leadSource: l.leadSource,
        leadResponse: l.leadResponse,
        callbackDate: l.callbackDate.toISOString(),
        description: l.description,
        status: l.status,
      }));

    return { success: true, callbacks };
  } catch (err) {
    return handleActionError(err, "Failed to load due callbacks.");
  }
}

/**
 * Snoozes a scheduled callback by pushing callbackDate forward by X minutes, to tomorrow morning, or to a custom ISO date.
 * Strictly verifies ownership allotToId: employee.id.
 */
export async function snoozeEmployeeCallbackAction(input: {
  leadId: string;
  minutes?: number;
  newDate?: string;
}): Promise<{ success: boolean; callbackDate?: string; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId, minutes, newDate } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: { id: true, name: true, mobile: true, callbackDate: true },
    });

    if (!lead) {
      return { success: false, error: "Lead not found or access denied." };
    }

    let targetDate: Date;
    if (newDate) {
      targetDate = new Date(newDate);
      if (isNaN(targetDate.getTime())) {
        return { success: false, error: "Invalid date format." };
      }
    } else if (typeof minutes === "number" && minutes > 0) {
      targetDate = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      // Default: +15 minutes
      targetDate = new Date(Date.now() + 15 * 60 * 1000);
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        callbackDate: targetDate,
        status: "FOLLOW_UP",
      },
    });

    await logActivity({
      actorId: employee.id,
      action: "CALLBACK_SNOOZED",
      details: `Employee ${employee.name} snoozed callback for lead "${lead.name}" (${lead.mobile}) to ${targetDate.toLocaleString("en-GB")}`,
    });

    revalidatePath("/employee");
    revalidatePath("/employee/leads");

    return { success: true, callbackDate: targetDate.toISOString() };
  } catch (err) {
    return handleActionError(err, "Failed to snooze callback.");
  }
}

/**
 * Dismisses a callback reminder for an employee-owned lead.
 * If clearCallback is true, clears callbackDate in the database.
 */
export async function dismissEmployeeCallbackAction(input: {
  leadId: string;
  clearCallback?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });
    const { leadId, clearCallback = false } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, allotToId: employee.id },
      select: { id: true, name: true, mobile: true },
    });

    if (!lead) {
      return { success: false, error: "Lead not found or access denied." };
    }

    if (clearCallback) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          callbackDate: null,
        },
      });

      await logActivity({
        actorId: employee.id,
        action: "CALLBACK_DISMISSED",
        details: `Employee ${employee.name} cleared callback reminder for lead "${lead.name}" (${lead.mobile})`,
      });
    }

    revalidatePath("/employee");
    revalidatePath("/employee/leads");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to dismiss callback.");
  }
}

export interface EmployeeLeadCountFiltersInput {
  lastUpdateDate?: string | null;
  lastUpdateDateType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leadSource?: string | null;
  leadResponse?: string | null;
  trialStatus?: string | null;
  serviceStatus?: string | null;
  serviceId?: string | null;
  createdById?: string | null;
  leadOwnerId?: string | null;
  teamId?: string | null;
  leadAssignment?: string | null;
  mobile?: string | null;
  paidRange?: string | null;
  leadRecycleCount?: string | null;
}

export interface DispositionBreakdownItem {
  key: string;
  label: string;
  type: "stage" | "response";
  value: string;
  count: number;
  percentage: number;
}

export interface LeadCountSummaryResult {
  success: boolean;
  totalCount: number;
  breakdown: DispositionBreakdownItem[];
  sources: string[];
  responses: string[];
  products: { id: string; name: string }[];
  creators?: { id: string; name: string; role?: string }[];
  users?: { id: string; name: string; role: string; isActive: boolean }[];
  teams?: { id: string; name: string }[];
  employeeName?: string;
  employeeTeamName?: string;
  error?: string;
}

/**
 * Retrieves the disposition & stage breakdown counts for the employee's assigned leads.
 * Strictly locked to allotToId: employee.id on the server.
 */
export async function getEmployeeLeadCountsSummaryAction(
  filters: EmployeeLeadCountFiltersInput = {}
): Promise<LeadCountSummaryResult> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    // Enforce strict ownership lock: allotToId = employee.id
    const where: Prisma.LeadWhereInput = {
      allotToId: employee.id,
    };

    if (filters.leadSource && filters.leadSource.trim()) {
      where.leadSource = {
        equals: filters.leadSource.trim(),
        mode: "insensitive",
      };
    }

    if (filters.leadResponse && filters.leadResponse.trim()) {
      const variants = getResponseFilterVariants(filters.leadResponse.trim());
      if (variants.length === 1) {
        where.leadResponse = variants[0];
      } else {
        where.leadResponse = { in: variants };
      }
    }

    if (filters.mobile && filters.mobile.trim()) {
      where.mobile = { contains: filters.mobile.trim() };
    }

    if (filters.createdById && filters.createdById.trim()) {
      const cb = filters.createdById.trim();
      if (cb === "ADMIN" || cb === "ADMIN_ROLE") {
        where.createdBy = { role: "ADMIN" };
      } else {
        where.createdById = cb;
      }
    }

    if (filters.teamId && filters.teamId.trim()) {
      where.teamId = filters.teamId.trim();
    }

    if (filters.leadAssignment && filters.leadAssignment.trim()) {
      const assign = filters.leadAssignment.trim();
      if (assign === "Fetched Leads") {
        where.createdById = employee.id;
      } else if (assign === "Alloted Leads" || assign === "Transferred Leads") {
        where.createdById = { not: employee.id };
      }
    }

    if (filters.leadOwnerId && filters.leadOwnerId.trim()) {
      const owner = filters.leadOwnerId.trim();
      if (owner === "DEACTIVATED") {
        where.allotTo = { isActive: false };
      } else if (owner !== employee.id) {
        where.allotToId = owner;
      }
    }

    const dateType = filters.lastUpdateDateType?.trim();

    if (dateType === "pending callback") {
      where.status = { in: ["FOLLOW_UP", "FOLLOWUPS"] };
      where.callbackDate = { lt: new Date(), not: null };
    } else if (dateType === "upcomming callback") {
      where.status = { in: ["FOLLOW_UP", "FOLLOWUPS"] };
      where.callbackDate = { gte: new Date() };
    } else if (dateType === "pending followup") {
      where.status = { in: ["FOLLOW_UP", "FOLLOWUPS"] };
      where.callbackDate = null;
    }

    // Date Range / Single date filter
    const dateCondition: Prisma.DateTimeFilter = {};
    if (filters.startDate?.trim()) {
      const s = new Date(filters.startDate.trim());
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        dateCondition.gte = s;
      }
    }
    if (filters.endDate?.trim()) {
      const e = new Date(filters.endDate.trim());
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        dateCondition.lte = e;
      }
    }
    if (!dateCondition.gte && !dateCondition.lte && filters.lastUpdateDate?.trim()) {
      const d = new Date(filters.lastUpdateDate.trim());
      if (!isNaN(d.getTime())) {
        const s = new Date(d);
        s.setHours(0, 0, 0, 0);
        const e = new Date(d);
        e.setHours(23, 59, 59, 999);
        dateCondition.gte = s;
        dateCondition.lte = e;
      }
    }

    if (dateCondition.gte || dateCondition.lte) {
      if (dateType === "Call Back date") {
        where.callbackDate = dateCondition;
      } else if (dateType === "Trial added date") {
        where.trials = { some: { createdAt: dateCondition } };
      } else if (dateType === "client conversion date") {
        where.payments = { some: { createdAt: dateCondition, status: "APPROVED" } };
      } else if (dateType === "updated followup" || dateType === "followup added date") {
        where.updatedAt = dateCondition;
      } else if (dateType === "Lead uploaded date" || dateType === "lead alloted date") {
        where.createdAt = dateCondition;
      } else {
        where.createdAt = dateCondition;
      }
    }

    // Trial status filter
    if (filters.trialStatus && filters.trialStatus.trim()) {
      where.trials = { some: { status: filters.trialStatus.trim() } };
    }

    // Service status filter
    if (filters.serviceStatus && filters.serviceStatus.trim()) {
      where.invoices = { some: { status: filters.serviceStatus.trim() } };
    }

    // Service / Product filter
    if (filters.serviceId && filters.serviceId.trim()) {
      where.invoices = { some: { productId: filters.serviceId.trim() } };
    }

    // Paid amount range filter
    if (filters.paidRange && filters.paidRange.trim()) {
      const parts = filters.paidRange
        .split("-")
        .map((p) => parseFloat(p.trim()))
        .filter((n) => !isNaN(n));
      if (parts.length === 2) {
        where.payments = {
          some: {
            status: "APPROVED",
            amount: { gte: parts[0], lte: parts[1] },
          },
        };
      } else if (parts.length === 1) {
        where.payments = {
          some: {
            status: "APPROVED",
            amount: { gte: parts[0] },
          },
        };
      }
    }

    // Parallel aggregate queries inside Promise.all
    const [
      totalCount,
      responseGroups,
      statusGroups,
      activeResponses,
      activeSources,
      activeProducts,
      allUsers,
      allTeams,
      employeeUser,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["leadResponse"],
        where,
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      getActiveLeadResponseNames(),
      getActiveLeadSourceNames(),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, role: true, isActive: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: employee.id },
        select: { name: true, team: { select: { name: true } } },
      }),
    ]);

    // Build status counts map
    const statusCountsMap: Record<string, number> = {};
    for (const sg of statusGroups) {
      const s = (sg.status || "").toUpperCase();
      statusCountsMap[s] = (statusCountsMap[s] || 0) + sg._count._all;
    }

    // Build response counts map aggregated by canonical name
    const canonicalResponseCounts: Record<string, number> = {};
    for (const rg of responseGroups) {
      if (rg.leadResponse) {
        const canonical = normalizeCanonicalResponse(rg.leadResponse);
        canonicalResponseCounts[canonical] =
          (canonicalResponseCounts[canonical] || 0) + rg._count._all;
      }
    }

    // Calculate unread count (UNREAD + UNFOLLOWED)
    const unreadCount =
      (statusCountsMap["UNREAD"] || 0) + (statusCountsMap["UNFOLLOWED"] || 0);
    const followupCount =
      (statusCountsMap["FOLLOW_UP"] || 0) + (statusCountsMap["FOLLOWUPS"] || 0);
    const trialCount =
      (statusCountsMap["TRIAL"] || 0) + (statusCountsMap["TRIALS"] || 0);
    const clientCount =
      (statusCountsMap["CLIENT"] || 0) + (statusCountsMap["CLIENTS"] || 0);
    const disposedCount =
      (statusCountsMap["DISPOSED"] || 0) + (statusCountsMap["DISPOSE"] || 0);
    const readCount = statusCountsMap["READ"] || 0;

    // Distinct canonical list of call responses to display (deduplicated)
    const canonicalResponsesOrder = [
      "Call Back",
      "NPC",
      "Do Not Trade",
      "Not Reachable",
      "Switch Off",
      "Not Interested",
      "Call Disconnected",
      "Language Issue",
      "Busy",
      "FT",
      "Interested",
      "Paid",
    ];

    // Combine canonical responses and DB responses without duplicates
    const allKnownResponses = Array.from(
      new Set([
        ...canonicalResponsesOrder,
        ...activeResponses.map(normalizeCanonicalResponse),
        ...Object.keys(canonicalResponseCounts),
      ])
    );

    const breakdown: DispositionBreakdownItem[] = [];

    // 1. Stage: Unread Leads
    breakdown.push({
      key: "stage:UNREAD",
      label: "Unread Leads",
      type: "stage",
      value: "UNREAD",
      count: unreadCount,
      percentage: totalCount > 0 ? Number(((unreadCount / totalCount) * 100).toFixed(1)) : 0,
    });

    // 2. Call response items (deduplicated & canonical)
    for (const resp of allKnownResponses) {
      const count = canonicalResponseCounts[resp] || 0;
      breakdown.push({
        key: `response:${resp}`,
        label: resp,
        type: "response",
        value: resp,
        count,
        percentage: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0,
      });
    }

    // 3. Additional stages matching screenshot
    breakdown.push({
      key: "stage:FOLLOW_UP",
      label: "Followups",
      type: "stage",
      value: "FOLLOW_UP",
      count: followupCount,
      percentage: totalCount > 0 ? Number(((followupCount / totalCount) * 100).toFixed(1)) : 0,
    });

    breakdown.push({
      key: "stage:TRIAL",
      label: "Trials",
      type: "stage",
      value: "TRIAL",
      count: trialCount,
      percentage: totalCount > 0 ? Number(((trialCount / totalCount) * 100).toFixed(1)) : 0,
    });

    breakdown.push({
      key: "stage:CLIENT",
      label: "Clients",
      type: "stage",
      value: "CLIENT",
      count: clientCount,
      percentage: totalCount > 0 ? Number(((clientCount / totalCount) * 100).toFixed(1)) : 0,
    });

    if (disposedCount > 0) {
      breakdown.push({
        key: "stage:DISPOSED",
        label: "Disposed",
        type: "stage",
        value: "DISPOSED",
        count: disposedCount,
        percentage: totalCount > 0 ? Number(((disposedCount / totalCount) * 100).toFixed(1)) : 0,
      });
    }

    if (readCount > 0) {
      breakdown.push({
        key: "stage:READ",
        label: "Read Leads",
        type: "stage",
        value: "READ",
        count: readCount,
        percentage: totalCount > 0 ? Number(((readCount / totalCount) * 100).toFixed(1)) : 0,
      });
    }

    // Deduplicate and canonicalize active responses
    const deduplicatedResponses = Array.from(
      new Set([
        ...canonicalResponsesOrder,
        ...activeResponses.map(normalizeCanonicalResponse),
      ])
    );

    // Deduplicate active sources case-insensitively
    const sourceMap = new Map<string, string>();
    for (const s of activeSources) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!sourceMap.has(key)) {
        sourceMap.set(key, trimmed);
      }
    }
    const deduplicatedSources = Array.from(sourceMap.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    return {
      success: true,
      totalCount,
      breakdown,
      sources: deduplicatedSources,
      responses: deduplicatedResponses,
      products: activeProducts,
      creators: allUsers.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
      })),
      users: allUsers,
      teams: allTeams,
      employeeName: employeeUser?.name || employee.name || "Me",
      employeeTeamName: employeeUser?.team?.name || "General Team",
    };
  } catch {
    return {
      success: false,
      totalCount: 0,
      breakdown: [],
      sources: [],
      responses: [],
      products: [],
      error: "Failed to compute lead counts summary.",
    };
  }
}

export interface EmployeeFilterDropdownOptions {
  sources: string[];
  responses: string[];
  products: { id: string; name: string }[];
  creators: { id: string; name: string }[];
  employeeName?: string;
  employeeTeamName?: string;
}

/**
 * Retrieves lean dropdown options for the Employee Collapsible Filters Panel.
 * Runs in parallel inside Promise.all with lightweight select.
 */
export async function getEmployeeLeadFilterOptionsAction(): Promise<{
  success: boolean;
  options: EmployeeFilterDropdownOptions;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const [activeSources, activeResponses, products, creators, employeeUser] = await Promise.all([
      getActiveLeadSourceNames(),
      getActiveLeadResponseNames(),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { createdLeads: { some: {} } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: employee.id },
        select: { name: true, team: { select: { name: true } } },
      }),
    ]);

    return {
      success: true,
      options: {
        sources: activeSources,
        responses: activeResponses,
        products,
        creators,
        employeeName: employeeUser?.name || employee.name || "Me",
        employeeTeamName: employeeUser?.team?.name || "General Team",
      },
    };
  } catch {
    return {
      success: false,
      options: {
        sources: [],
        responses: [],
        products: [],
        creators: [],
      },
      error: "Failed to load filter options.",
    };
  }
}
