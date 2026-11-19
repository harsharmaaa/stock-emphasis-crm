"use server";

import { requireManagerSession, handleActionError } from "@/src/lib/auth-guard";
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
  DISPOSED: number;
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
      // Administrators have full management oversight across all assigned leads
      managerLeadsFilter = { allotToId: { not: null } };
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
      const allowedUserIds = Array.from(new Set([manager.id, ...subordinateIds]));

      // Construct the strict manager boundary filter
      // Only show leads explicitly allotted to this manager or their subordinates
      // Central pool unassigned leads (allotToId: null) must NEVER appear
      managerLeadsFilter = {
        allotToId: { in: allowedUserIds },
      };
    }

    // Build status filter condition supporting aliases like UNFOLLOWED/UNREAD, FOLLOWUPS, TRIALS
    let statusFilterCondition: Prisma.LeadWhereInput = {};
    if (normalizedStatus) {
      if (normalizedStatus === "UNREAD" || normalizedStatus === "UNFOLLOWED") {
        statusFilterCondition = { status: { in: ["UNREAD", "UNFOLLOWED"] } };
      } else if (normalizedStatus === "FOLLOW_UP") {
        statusFilterCondition = { status: { in: ["FOLLOW_UP", "FOLLOWUPS"] } };
      } else if (normalizedStatus === "TRIAL") {
        statusFilterCondition = { status: { in: ["TRIAL", "TRIALS"] } };
      } else if (normalizedStatus === "CLIENT") {
        statusFilterCondition = { status: { in: ["CLIENT", "CLIENTS"] } };
      } else {
        statusFilterCondition = { status: normalizedStatus };
      }
    }

    // Combine boundary filter with optional status and search filters
    const where: Prisma.LeadWhereInput = {
      AND: [
        managerLeadsFilter,
        statusFilterCondition,
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

/**
 * Helper to build strict manager boundary filter for finding or updating a specific lead.
 */
async function getManagerLeadBoundary(
  managerId: string,
  isRoleAdmin: boolean
): Promise<Prisma.LeadWhereInput> {
  if (isRoleAdmin) return {};

  const managerUser = await prisma.user.findUnique({
    where: { id: managerId },
    select: {
      teamId: true,
      role: true,
      ledTeams: { select: { id: true } },
    },
  });

  if (managerUser?.role === "ADMIN") return { allotToId: { not: null } };

  const ledTeamIds = managerUser?.ledTeams.map((t) => t.id) || [];
  const relevantTeamIds = [
    ...new Set([
      ...ledTeamIds,
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
  const subordinateIds = subordinates.map((u) => u.id);
  const allowedUserIds = Array.from(new Set([managerId, ...subordinateIds]));

  return {
    allotToId: { in: allowedUserIds },
  };
}

export interface UpdateManagerLeadCallInput {
  leadId: string;
  leadResponse?: string;
  callbackDate?: string | null;
  description?: string;
  status?: string;
}

/**
 * Updates call disposition, callback date, response, and remarks for a lead strictly within the manager's boundary.
 */
export async function updateManagerLeadCallAction(
  input: UpdateManagerLeadCallInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { leadId } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const boundary = await getManagerLeadBoundary(manager.id, manager.role === "ADMIN");

    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        AND: [boundary],
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
        // Disallow setting CLIENT / Client via call disposition
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
    // - If input.status === "FOLLOW_UP" OR normalized response is "FOLLOW UP" / "FOLLOW_UP" / "FOLLOWUP":
    //   -> status = "FOLLOW_UP" (moves lead to Followups tab).
    // - Else if normalized response is "FT" OR "FREE TRIAL" OR "TRIAL":
    //   -> status = "TRIAL" (moves lead to Trials tab and decrements Unread count).
    // - Else if normalized response is "DISPOSED" OR "DISPOSE":
    //   -> status = "DISPOSED" (moves lead to Disposed tab).
    // - Else (for ANY other call response such as "Interested", "Not Interested", "Busy", "NPC", "Language Issue", "Callback", "Ringing", "Switch Off", etc.):
    //   -> status = "READ" (automatically marks lead as read, moves it to Read tab, and decrements Unread count).
    const normalizedResp = chosenResponse
      ? chosenResponse.toUpperCase()
      : input.leadResponse
      ? input.leadResponse.trim().toUpperCase()
      : "";

    // 1. FT / TRIAL takes absolute priority
    if (["FT", "FREE TRIAL", "TRIAL"].includes(normalizedResp)) {
      updateData.status = "TRIAL";
    }
    // 2. DISPOSED takes absolute priority
    else if (["DISPOSED", "DISPOSE"].includes(normalizedResp)) {
      updateData.status = "DISPOSED";
    }
    // 3. FOLLOW_UP if actively requested or if response is Follow Up
    else if (
      input.status === "FOLLOW_UP" ||
      ["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(normalizedResp)
    ) {
      updateData.status = "FOLLOW_UP";
    }
    // 4. Any other non-empty call response (Interested, Busy, NPC, etc.) maps to READ
    else if (normalizedResp) {
      updateData.status = "READ";
    }
    // 5. Fallback to explicitly passed status if any
    else if (input.status !== undefined) {
      updateData.status = input.status?.trim() || existingLead.status;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await logActivity({
      actorId: manager.id,
      action: "LEAD_CALL_UPDATED",
      details: `Manager ${manager.name} updated call disposition for team lead "${existingLead.name}" (${existingLead.mobile}) - Status: ${updateData.status || existingLead.status}`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");
    revalidatePath("/manager");
    revalidatePath("/manager", "page");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update lead call disposition.");
  }
}

export interface DisposeManagerLeadInput {
  leadId: string;
  reason?: string;
}

/**
 * Marks a lead as DISPOSED with an optional remark, strictly scoped to the manager's team boundary.
 */
export async function disposeManagerLeadAction(
  input: DisposeManagerLeadInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { leadId, reason } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const boundary = await getManagerLeadBoundary(manager.id, manager.role === "ADMIN");

    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        AND: [boundary],
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        description: true,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const updatedDesc = reason?.trim()
      ? existingLead.description
        ? `${existingLead.description}\n[Disposed: ${reason.trim()}]`
        : `[Disposed: ${reason.trim()}]`
      : existingLead.description;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "DISPOSED",
        description: updatedDesc,
      },
    });

    await logActivity({
      actorId: manager.id,
      action: "LEAD_DISPOSED",
      details: `Manager ${manager.name} marked team lead "${existingLead.name}" (${existingLead.mobile}) as DISPOSED${
        reason?.trim() ? `: ${reason.trim()}` : ""
      }`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to dispose lead.");
  }
}

export interface RestoreManagerLeadInput {
  leadId: string;
  targetStatus?: "UNREAD" | "READ" | "FOLLOW_UP";
  reason?: string;
}

/**
 * Restores a DISPOSED lead back to an active working state (default: READ or UNREAD).
 * Preserves the original lead source, team, and agent assignment.
 */
export async function restoreManagerLeadAction(
  input: RestoreManagerLeadInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { leadId, targetStatus = "READ", reason } = input;

    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const boundary = await getManagerLeadBoundary(manager.id, manager.role === "ADMIN");

    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        AND: [boundary],
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        description: true,
        leadSource: true,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const validStatus = targetStatus === "UNREAD" ? "UNREAD" : "READ";

    const updatedDesc = reason?.trim()
      ? existingLead.description
        ? `${existingLead.description}\n[Restored to ${validStatus}: ${reason.trim()}]`
        : `[Restored to ${validStatus}: ${reason.trim()}]`
      : existingLead.description;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: validStatus,
        description: updatedDesc,
      },
    });

    await logActivity({
      actorId: manager.id,
      action: "LEAD_RESTORED",
      details: `Manager ${manager.name} restored team lead "${existingLead.name}" (${existingLead.mobile}) from DISPOSED to ${validStatus}`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to restore lead.");
  }
}

export interface UpdateManagerLeadDetailsInput {
  leadId: string;
  name?: string;
  email?: string | null;
  alternateMobile?: string | null;
  dob?: string | null;
  aadhar?: string | null;
  fatherName?: string | null;
  state?: string | null;
  city?: string | null;
  district?: string | null;
  pan?: string | null;
  gstin?: string | null;
  occupation?: string | null;
  segment?: string | null;
  investment?: string | null;
  profile?: string | null;
  leadResponse?: string | null;
  leadSource?: string | null;
  description?: string | null;
  experience?: string | null;
  status?: string;
  callbackDate?: string | null;
}

/**
 * Updates lead profile, remarks, segments, or responses within manager scope.
 * STRICTLY PREVENTS allotToId or teamId re-assignment (allotment is exclusive to Admin).
 */
export async function updateManagerLeadDetailsAction(
  input: UpdateManagerLeadDetailsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const { leadId } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const boundary = await getManagerLeadBoundary(manager.id, manager.role === "ADMIN");

    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        AND: [boundary],
      },
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
      return { success: false, error: "Lead not found or unauthorized access." };
    }

    const updateData: Prisma.LeadUpdateInput = {};

    if (input.name !== undefined) {
      const name = input.name?.trim();
      if (!name || name.length < 2) {
        return { success: false, error: "Please provide a valid lead name (at least 2 characters)." };
      }
      updateData.name = name;
    }

    if (input.email !== undefined) {
      const email = input.email?.trim().toLowerCase() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: "Please provide a valid email address or leave it blank." };
      }
      updateData.email = email;
    }

    if (input.alternateMobile !== undefined) {
      updateData.alternateMobile = input.alternateMobile ? normalizePhoneNumber(input.alternateMobile) : null;
    }

    if (input.dob !== undefined) {
      if (input.dob) {
        const d = new Date(input.dob);
        updateData.dob = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.dob = null;
      }
    }

    if (input.aadhar !== undefined) updateData.aadhar = input.aadhar?.trim() || null;
    if (input.fatherName !== undefined) updateData.fatherName = input.fatherName?.trim() || null;
    if (input.state !== undefined) updateData.state = input.state?.trim() || null;
    if (input.city !== undefined) updateData.city = input.city?.trim() || null;
    if (input.district !== undefined) updateData.district = input.district?.trim() || null;

    if (input.pan !== undefined) updateData.pan = input.pan?.trim().toUpperCase() || null;
    if (input.gstin !== undefined) updateData.gstin = input.gstin?.trim().toUpperCase() || null;

    if (input.occupation !== undefined) updateData.occupation = input.occupation?.trim() || null;
    if (input.segment !== undefined) updateData.segment = input.segment?.trim() || null;
    if (input.investment !== undefined) updateData.investment = input.investment?.trim() || null;

    if (input.profile !== undefined) {
      const prof = input.profile?.trim() || null;
      if (prof && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(prof)) {
        return { success: false, error: "Invalid Profile option." };
      }
      updateData.profile = prof;
    }

    if (input.experience !== undefined) {
      const exp = input.experience?.trim() || null;
      if (exp && !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(exp)) {
        return { success: false, error: "Invalid Experience option." };
      }
      updateData.experience = exp;
    }

    if (input.leadResponse !== undefined) {
      const resp = input.leadResponse?.trim() || null;
      if (resp) {
        const activeResponses = await getActiveLeadResponseNames();
        if (!activeResponses.includes(resp)) {
          return { success: false, error: "Invalid Lead Response selected." };
        }
      }
      updateData.leadResponse = resp;
    }

    if (input.leadSource !== undefined) {
      const src = input.leadSource?.trim() || null;
      if (src) {
        const activeSources = await getActiveLeadSourceNames();
        if (!activeSources.includes(src)) {
          return { success: false, error: "Invalid Lead Source selected." };
        }
      }
      updateData.leadSource = src;
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

    if (input.status !== undefined) {
      updateData.status = input.status?.trim() || existingLead.status;
    }

    // STRICT DEFENSE: Never touch allotToId or teamId
    // Only Admin has allotment / team re-assignment rights

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await logActivity({
      actorId: manager.id,
      action: "LEAD_DETAILS_UPDATED",
      details: `Manager ${manager.name} updated details for team lead "${existingLead.name}" (${existingLead.mobile})`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update lead details.");
  }
}

/**
 * Returns active lead responses configured in the CRM for managers.
 * Filters out "CLIENT" so leads cannot be manually converted to CLIENT via call updates.
 */
export async function getActiveManagerLeadResponsesAction(): Promise<{
  success: boolean;
  leadResponses: string[];
}> {
  try {
    const responses = await getActiveLeadResponseNames();
    const filteredResponses = responses.filter(
      (r) => !["CLIENT", "CLIENTS"].includes(r.trim().toUpperCase())
    );
    return { success: true, leadResponses: filteredResponses };
  } catch {
    return { success: false, leadResponses: [] };
  }
}

export interface ManagerFetchSourceItem {
  source: string;
  availableLeadsCount: number;
  remainingLimit: number;
  totalLimit: number;
  formattedRemaining: string; // e.g. "140/200"
  poolAvailableCount: number;
  status: "LEADS_AVAILABLE" | "CAN_FETCH" | "NO_LEADS";
  batchSize: number;
  availableLimit: number;
}

/**
 * Loads permitted lead sources configured by Admin for this manager,
 * calculating unattended lead counts, remaining fetch quota, pool availability, and button statuses.
 */
export async function getManagerFetchSourcesAction(): Promise<{
  success: boolean;
  sources?: ManagerFetchSourceItem[];
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });

    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: {
        id: true,
        employeeProfileId: true,
        role: true,
      },
    });

    if (!managerUser) {
      return { success: true, sources: [] };
    }

    // 1. Query ONLY rules assigned directly to this manager or their profile
    const permittedRules = await prisma.fetchLimitRule.findMany({
      where: {
        OR: [
          { assignedUsers: { some: { id: manager.id } } },
          ...(managerUser.employeeProfileId
            ? [{ profiles: { some: { id: managerUser.employeeProfileId } } }]
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

    // 2. Group rules by leadSource, prioritizing direct user assignment over profile assignment
    const sourceRuleMap = new Map<string, (typeof permittedRules)[0]>();
    for (const rule of permittedRules) {
      const existing = sourceRuleMap.get(rule.leadSource);
      if (!existing) {
        sourceRuleMap.set(rule.leadSource, rule);
      } else {
        const isDirect = rule.assignedUsers.some((u) => u.id === manager.id);
        const existingIsDirect = existing.assignedUsers.some((u) => u.id === manager.id);
        if (isDirect && !existingIsDirect) {
          sourceRuleMap.set(rule.leadSource, rule);
        }
      }
    }

    const distinctRules = Array.from(sourceRuleMap.values());

    // 3. For each permitted source, calculate availability, limits, and status
    const sourceItems: ManagerFetchSourceItem[] = await Promise.all(
      distinctRules.map(async (rule) => {
        const source = rule.leadSource;
        const availableLimit = rule.availableLimit;
        const fetchLimit = rule.fetchLimit;
        const fetchCount = rule.fetchCount; // Total allowed fetch requests / clicks

        // Fetch usage for this manager & rule
        const usage = await prisma.employeeFetchUsage.findUnique({
          where: {
            userId_ruleId: { userId: manager.id, ruleId: rule.id },
          },
        });

        const usedFetches = usage?.successfulFetches || 0;
        const remainingFetches = Math.max(0, fetchCount - usedFetches);
        const formattedRemaining = `${remainingFetches}/${fetchCount}`;

        // Count active/unattended leads currently held by the manager for this source
        const availableLeadsCount = await prisma.lead.count({
          where: {
            allotToId: manager.id,
            leadSource: source,
            status: { in: ["UNREAD", "UNFOLLOWED"] },
          },
        });

        // Number of unassigned pool leads for that source
        const poolAvailableCount = await prisma.lead.count({
          where: {
            leadSource: source,
            allotToId: null,
            teamId: null,
          },
        });

        // Determine status:
        // - If availableLeadsCount > rule.availableLimit: "LEADS_AVAILABLE" (Blue badge: "Leads Available") and block fetching.
        // - If availableLeadsCount <= rule.availableLimit: allow fetching ("CAN_FETCH", Green button: "Fetch") provided poolAvailableCount > 0 and remainingFetches > 0.
        // - Otherwise (pool has 0 leads or remaining fetches is 0): "NO_LEADS" (Orange badge: "No Leads").
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
    return handleActionError(err, "Failed to load manager fetch sources.");
  }
}

/**
 * Claims up to rule.fetchLimit unassigned pool leads for a source and
 * allots them directly to the requesting manager with full audit logging.
 */
export async function managerFetchSourceLeadsAction(
  source: string
): Promise<{
  success: boolean;
  allocatedCount?: number;
  source?: string;
  error?: string;
}> {
  try {
    const manager = await requireManagerSession({ redirect: false });
    const requestedSource = source?.trim();
    if (!requestedSource) {
      return { success: false, error: "Please specify a lead source to fetch." };
    }

    const managerUser = await prisma.user.findUnique({
      where: { id: manager.id },
      select: {
        id: true,
        name: true,
        teamId: true,
        employeeProfileId: true,
        employeeProfile: { select: { name: true } },
        ledTeams: { select: { id: true } },
      },
    });

    if (!managerUser) {
      return { success: false, error: "Manager profile not found." };
    }

    // 1. Find matching rule permitted for this manager
    const matchingRules = await prisma.fetchLimitRule.findMany({
      where: {
        leadSource: requestedSource,
        OR: [
          { assignedUsers: { some: { id: manager.id } } },
          ...(managerUser.employeeProfileId
            ? [{ profiles: { some: { id: managerUser.employeeProfileId } } }]
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
      r.assignedUsers.some((u) => u.id === manager.id)
    );
    const winningRule = directRule || matchingRules[0];

    const availableLimit = winningRule.availableLimit;
    const fetchLimit = winningRule.fetchLimit;
    const fetchCount = winningRule.fetchCount;

    // 2. Check unattended leads threshold
    const availableLeadsCount = await prisma.lead.count({
      where: {
        allotToId: manager.id,
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

    // 3. Check remaining quota
    const existingUsage = await prisma.employeeFetchUsage.findUnique({
      where: {
        userId_ruleId: { userId: manager.id, ruleId: winningRule.id },
      },
    });
    const usedFetches = existingUsage?.successfulFetches || 0;
    if (usedFetches >= fetchCount) {
      return {
        success: false,
        error: `Fetch quota reached: You have completed all ${fetchCount} allowed fetch requests for "${requestedSource}".`,
      };
    }

    const assignedTeamId = managerUser.teamId || managerUser.ledTeams[0]?.id || null;

    // 4. Atomic transaction to claim pool leads
    const result = await prisma.$transaction(async (tx) => {
      // Find eligible unassigned leads from the central pool
      const candidateLeads = await tx.lead.findMany({
        where: {
          leadSource: requestedSource,
          allotToId: null,
          teamId: null,
        },
        orderBy: { createdAt: "asc" },
        take: fetchLimit,
        select: { id: true },
      });

      if (candidateLeads.length === 0) {
        return { allocatedCount: 0 };
      }

      const candidateIds = candidateLeads.map((l) => l.id);

      // Concurrency lock: update only if still unassigned in pool
      const updateResult = await tx.lead.updateMany({
        where: {
          id: { in: candidateIds },
          allotToId: null,
          teamId: null,
        },
        data: {
          allotToId: manager.id,
          teamId: assignedTeamId,
          status: "UNREAD",
        },
      });

      if (updateResult.count === 0) {
        return { allocatedCount: 0 };
      }

      // Update or create usage
      const usage = await tx.employeeFetchUsage.upsert({
        where: {
          userId_ruleId: { userId: manager.id, ruleId: winningRule.id },
        },
        create: {
          userId: manager.id,
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

      // Audit log
      await tx.leadFetchLog.create({
        data: {
          userId: manager.id,
          ruleId: winningRule.id,
          leadSource: requestedSource,
          appliedProfile: managerUser.employeeProfile?.name || "Manager",
          leadsCount: updateResult.count,
          requestNumber: usage.successfulFetches,
          leadIds: candidateIds.slice(0, updateResult.count),
        },
      });

      return { allocatedCount: updateResult.count };
    });

    if (!result || result.allocatedCount === 0) {
      return {
        success: false,
        error: `No unassigned leads available in the pool for "${requestedSource}".`,
      };
    }

    await logActivity({
      actorId: manager.id,
      action: "LEAD_FETCHED",
      details: `Manager ${manager.name} fetched ${result.allocatedCount} leads from source "${requestedSource}"`,
    });

    revalidatePath("/manager/leads");
    revalidatePath("/manager/leads", "page");

    return {
      success: true,
      allocatedCount: result.allocatedCount,
      source: requestedSource,
    };
  } catch (err) {
    return handleActionError(err, "Failed to fetch leads from source.");
  }
}
