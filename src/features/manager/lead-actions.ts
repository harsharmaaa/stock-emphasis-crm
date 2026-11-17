"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { normalizePhoneNumber, normalizeStatusFilter } from "@/src/lib/utils";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { getActiveLeadResponseNames } from "@/src/lib/lead-responses-helper";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import type { AllotmentUserOption, CreateLeadInput } from "@/src/features/leads/actions";

export interface ManagerLeadAssignedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ManagerLeadTeam {
  id: string;
  name: string;
}

export interface ManagerLeadItem {
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
  // Aliased for convenience across consumers
  assignedTo: ManagerLeadAssignedUser | null;
  allotTo: ManagerLeadAssignedUser | null;
  team: ManagerLeadTeam | null;
}

export interface ManagerStatusCounts {
  ALL: number;
  UNREAD: number;
  READ: number;
  FOLLOW_UP: number;
  TRIAL: number;
  CLIENT: number;
}

export interface GetManagerLeadsOptions {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  take?: number;
  skip?: number;
  all?: boolean;
}

/**
 * Retrieves leads strictly isolated to the authenticated manager's team boundary.
 *
 * Boundary Rules:
 * 1. Leads assigned to any team led by the manager (teamId in ledTeams).
 * 2. Leads assigned to any direct subordinate of the manager (allotToId in subordinates).
 * 3. Leads assigned directly to the manager (allotToId === manager.id).
 *
 * Supports server-side pagination (default pageSize: 25) and fast status aggregation.
 *
 * @param statusOrOptions Optional status string (e.g. "UNREAD", "TRIALS") or options object
 */
export async function getManagerLeadsAction(
  statusOrOptions?: string | GetManagerLeadsOptions
): Promise<{
  success: boolean;
  leads?: ManagerLeadItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  statusCounts?: ManagerStatusCounts;
  error?: string;
}> {
  try {
    // 1. Authentication & Role Check
    const manager = await requireManagerSession({ redirect: false });

    // Parse status, search and pagination parameters
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

    // 2. Manager Boundary Filtering: fetch manager relations in a single query
    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: {
        teamId: true,
        role: true,
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

    let managerLeadsFilter: Prisma.LeadWhereInput;

    if (manager.role === "ADMIN" || managerUser?.role === "ADMIN") {
      // Administrators have full management oversight across all leads
      managerLeadsFilter = {};
    } else {
      // Determine subordinate users reporting to the manager or belonging to led teams
      const subordinates = await prisma.user.findMany({
        where: {
          OR: [
            { managerId: manager.id },
            ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((u) => u.id);

      // Construct the strict manager boundary filter
      managerLeadsFilter = {
        OR: [
          ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
          ...(subordinateIds.length > 0 ? [{ allotToId: { in: subordinateIds } }] : []),
          { allotToId: manager.id },
        ],
      };
    }

    // Combine boundary filter with optional status and search filters
    const where: Prisma.LeadWhereInput = {
      AND: [
        managerLeadsFilter,
        normalizedStatus ? { status: normalizedStatus } : {},
        searchParam
          ? {
              OR: [
                { name: { contains: searchParam, mode: "insensitive" } },
                { mobile: { contains: searchParam } },
                { email: { contains: searchParam, mode: "insensitive" } },
                { city: { contains: searchParam, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    // 3. Parallel Query Execution: count, paginated leads, and status tab metrics
    const [totalCount, rawLeads, statusStats] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          allotTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
              ledTeams: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      // Fast status counts across the manager boundary for UI tabs in one round-trip
      prisma.lead.groupBy({
        by: ["status"],
        where: managerLeadsFilter,
        _count: { _all: true },
      }),
    ]);

    // Aggregate tab counts from groupBy results
    const statusCounts: ManagerStatusCounts = {
      ALL: 0,
      UNREAD: 0,
      READ: 0,
      FOLLOW_UP: 0,
      TRIAL: 0,
      CLIENT: 0,
    };

    for (const item of statusStats) {
      const s = (item.status || "").toUpperCase();
      const count = item._count._all;
      statusCounts.ALL += count;
      if (s === "UNREAD") statusCounts.UNREAD += count;
      else if (s === "READ") statusCounts.READ += count;
      else if (s === "FOLLOW_UP" || s === "FOLLOWUPS") statusCounts.FOLLOW_UP += count;
      else if (s === "TRIAL" || s === "TRIALS") statusCounts.TRIAL += count;
      else if (s === "CLIENT" || s === "CLIENTS") statusCounts.CLIENT += count;
    }

    const leads: ManagerLeadItem[] = rawLeads.map((l) => {
      const resolvedTeam =
        l.team ||
        l.allotTo?.team ||
        (l.allotTo?.ledTeams && l.allotTo.ledTeams.length > 0 ? l.allotTo.ledTeams[0] : null) ||
        (ledTeams.length > 0 ? ledTeams[0] : null);

      return {
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
        teamId: resolvedTeam?.id || l.teamId,
        createdById: l.createdById,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        assignedTo: l.allotTo,
        allotTo: l.allotTo,
        team: resolvedTeam ? { id: resolvedTeam.id, name: resolvedTeam.name } : null,
      };
    });

    return {
      success: true,
      leads,
      totalCount,
      totalPages: take ? Math.ceil(totalCount / take) : 1,
      currentPage: page,
      statusCounts,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load manager leads.");
  }
}

/**
 * Retrieves eligible personnel for the manager to allot leads to:
 * 1. The manager themselves.
 * 2. Subordinate users reporting to the manager.
 * 3. Members of teams led by the manager.
 */
export async function getManagerLeadAllotmentUsersAction(): Promise<{
  success: boolean;
  users?: AllotmentUserOption[];
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    // 1. Get teams led by this manager
    const ledTeams = await prisma.team.findMany({
      where: { leaderId: manager.id },
      select: { id: true, name: true },
    });
    const ledTeamIds = ledTeams.map((t) => t.id);

    // 2. Query the manager themselves and active subordinates
    const rawUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { id: manager.id },
          { managerId: manager.id },
          ...(ledTeamIds.length > 0 ? [{ teamId: { in: ledTeamIds } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: {
          select: { name: true },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const users: AllotmentUserOption[] = rawUsers.map((u) => ({
      id: u.id,
      name: u.id === manager.id ? `${u.name} (Me)` : u.name,
      email: u.email,
      role: u.role,
      teamName: u.team?.name || ledTeams[0]?.name || null,
    }));

    return { success: true, users };
  } catch (err) {
    return handleActionError(err, "Failed to load personnel list for manager allotment.");
  }
}

/**
 * Validates whether a phone number already exists in the database for a manager session.
 */
export async function checkManagerPhoneDuplicateAction(
  rawPhone: string
): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    await requireManagerSession({ redirect: false });

    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized || normalized.length < 10) {
      return { isDuplicate: false };
    }

    const existing = await prisma.lead.findFirst({
      where: { mobile: normalized },
      select: { id: true, name: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        message: "This number already exists.",
      };
    }

    return { isDuplicate: false };
  } catch (err) {
    return {
      isDuplicate: false,
      message: err instanceof Error ? err.message : "Unable to verify number",
    };
  }
}

/**
 * Creates a new lead scoped strictly to the manager's team and createdBy.
 * Allows allotting to the manager themselves or any subordinate/team member.
 */
export async function createManagerLeadAction(
  input: CreateLeadInput
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Please enter a valid Lead name (at least 2 characters)." };
    }

    const normalizedMobile = normalizePhoneNumber(input.mobile || "");
    if (!normalizedMobile || normalizedMobile.length < 10) {
      return { success: false, error: "Please enter a valid 10-digit mobile number." };
    }

    // Server-side duplicate check
    const existing = await prisma.lead.findFirst({
      where: { mobile: normalizedMobile },
      select: { id: true, name: true },
    });
    if (existing) {
      return { success: false, error: "This number already exists." };
    }

    // Optional email validation
    const email = input.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address or leave it blank." };
    }

    // Determine manager team
    const ledTeams = await prisma.team.findMany({
      where: { leaderId: manager.id },
      select: { id: true, name: true },
    });
    const ledTeamIds = ledTeams.map((t) => t.id);

    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: { teamId: true },
    });

    const defaultTeamId = ledTeamIds[0] || managerUser?.teamId || null;

    let allottedUserId: string | null = null;
    let allottedTeamId: string | null = defaultTeamId;

    if (input.allotToId && input.allotToId.trim()) {
      const targetUser = await prisma.user.findUnique({
        where: { id: input.allotToId },
        select: { id: true, teamId: true, isActive: true, managerId: true },
      });

      if (targetUser && targetUser.isActive) {
        const isSelf = targetUser.id === manager.id;
        const isSubordinate = targetUser.managerId === manager.id;
        const isInLedTeam = targetUser.teamId && ledTeamIds.includes(targetUser.teamId);

        if (isSelf || isSubordinate || isInLedTeam) {
          allottedUserId = targetUser.id;
          allottedTeamId = targetUser.teamId || defaultTeamId;
        } else {
          return {
            success: false,
            error: "You can only allot leads to yourself or members of your assigned team.",
          };
        }
      }
    }

    // Dynamic response & source validation
    const rawResponse = input.leadResponse?.trim() || null;
    if (rawResponse) {
      const activeResponses = await getActiveLeadResponseNames();
      if (!activeResponses.includes(rawResponse)) {
        return { success: false, error: "Please select an active Lead Response from the system." };
      }
    }

    const activeSources = await getActiveLeadSourceNames();
    const rawSource = input.leadSource?.trim() || null;
    if (rawSource && !activeSources.includes(rawSource)) {
      return { success: false, error: "Please select an active Lead Source from the system." };
    }

    // Parse dates
    let parsedDob: Date | null = null;
    if (input.dob && input.dob.trim()) {
      const d = new Date(input.dob);
      if (!isNaN(d.getTime())) parsedDob = d;
    }

    let parsedCallbackDate: Date | null = null;
    if (input.callbackDate && input.callbackDate.trim()) {
      const d = new Date(input.callbackDate);
      if (!isNaN(d.getTime())) parsedCallbackDate = d;
    }

    // Create the lead strictly scoped
    const newLead = await prisma.lead.create({
      data: {
        name,
        mobile: normalizedMobile,
        email,
        district: input.district?.trim() || null,
        alternateMobile: input.alternateMobile ? normalizePhoneNumber(input.alternateMobile) : null,
        dob: parsedDob,
        aadhar: input.aadhar?.trim() || null,
        fatherName: input.fatherName?.trim() || null,
        state: input.state?.trim() || null,
        city: input.city?.trim() || null,
        pan: input.pan?.trim().toUpperCase() || null,
        gstin: input.gstin?.trim().toUpperCase() || null,
        occupation: input.occupation?.trim() || null,
        segment: input.segment?.trim() || null,
        investment: input.investment?.trim() || null,
        profile: input.profile?.trim() || null,
        leadResponse: rawResponse,
        leadSource: rawSource || "DIRECT",
        description: input.description?.trim() || null,
        experience: input.experience?.trim() || null,
        status: input.status?.trim() || "UNFOLLOWED",
        callbackDate: parsedCallbackDate,
        allotToId: allottedUserId,
        teamId: allottedTeamId,
        createdById: manager.id,
      },
    });

    await logActivity({
      actorId: manager.id,
      action: "CREATE_LEAD",
      targetTeamId: allottedTeamId || undefined,
      details: `Manager ${manager.name} registered team lead "${name}" (${normalizedMobile})${
        allottedUserId ? ` allotted to user ${allottedUserId}` : " unassigned"
      }`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");
    revalidatePath("/manager/leads/add");
    revalidatePath("/admin/leads");

    return {
      success: true,
      leadId: newLead.id,
    };
  } catch (err) {
    return handleActionError(err, "Failed to create manager team lead.");
  }
}

/**
 * Retrieves lead details verifying strict manager team isolation.
 */
export async function getManagerLeadDetailsAction(leadId: string): Promise<{
  success: boolean;
  lead?: ManagerLeadItem;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: { teamId: true, role: true },
    });

    let boundaryFilter: Prisma.LeadWhereInput;

    if (manager.role === "ADMIN" || managerUser?.role === "ADMIN") {
      boundaryFilter = { id: leadId };
    } else {
      const ledTeams = await prisma.team.findMany({
        where: {
          OR: [
            { leaderId: manager.id },
            ...(managerUser?.teamId ? [{ id: managerUser.teamId }] : []),
          ],
        },
        select: { id: true },
      });
      const relevantTeamIds = [
        ...new Set([
          ...ledTeams.map((t) => t.id),
          ...(managerUser?.teamId ? [managerUser.teamId] : []),
        ]),
      ];

      const subordinates = await prisma.user.findMany({
        where: {
          OR: [
            { managerId: manager.id },
            ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((u) => u.id);

      boundaryFilter = {
        id: leadId,
        OR: [
          ...(relevantTeamIds.length > 0 ? [{ teamId: { in: relevantTeamIds } }] : []),
          ...(subordinateIds.length > 0 ? [{ allotToId: { in: subordinateIds } }] : []),
          { allotToId: manager.id },
          { createdById: manager.id },
        ],
      };
    }

    const lead = await prisma.lead.findFirst({
      where: boundaryFilter,
      include: {
        allotTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: { id: true, name: true },
            },
            ledTeams: {
              select: { id: true, name: true },
            },
          },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!lead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const resolvedTeam =
      lead.team ||
      lead.allotTo?.team ||
      (lead.allotTo?.ledTeams && lead.allotTo.ledTeams.length > 0 ? lead.allotTo.ledTeams[0] : null);

    return {
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        mobile: lead.mobile,
        email: lead.email,
        state: lead.state,
        city: lead.city,
        district: lead.district,
        alternateMobile: lead.alternateMobile,
        dob: lead.dob ? lead.dob.toISOString() : null,
        aadhar: lead.aadhar,
        fatherName: lead.fatherName,
        pan: lead.pan,
        gstin: lead.gstin,
        occupation: lead.occupation,
        segment: lead.segment,
        investment: lead.investment,
        profile: lead.profile,
        leadResponse: lead.leadResponse,
        leadSource: lead.leadSource,
        description: lead.description,
        experience: lead.experience,
        status: lead.status,
        callbackDate: lead.callbackDate ? lead.callbackDate.toISOString() : null,
        allotToId: lead.allotToId,
        teamId: resolvedTeam?.id || lead.teamId,
        createdById: lead.createdById,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        assignedTo: lead.allotTo,
        allotTo: lead.allotTo,
        team: resolvedTeam ? { id: resolvedTeam.id, name: resolvedTeam.name } : null,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load lead details.");
  }
}
