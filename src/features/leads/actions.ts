"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import {
  normalizePhoneNumber,
  normalizeStatusFilter,
  LEAD_RESPONSE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
  mapStatusToLifecycleKey,
} from "@/src/lib/utils";
import { revalidatePath } from "next/cache";
import { type Role } from "@prisma/client";

// Safe accessor for Lead model delegate across IDE TypeScript servers

const leadModel = prisma.lead;

export type {
  LeadResponseOption,
  LeadSourceOption,
  LeadProfileOption,
  LeadExperienceOption,
} from "@/src/lib/utils";

export interface CreateLeadInput {
  allotToId?: string;
  name: string;
  mobile: string;
  email?: string;
  district?: string;
  alternateMobile?: string;
  dob?: string;
  aadhar?: string;
  fatherName?: string;
  state?: string;
  city?: string;
  pan?: string;
  gstin?: string;
  occupation?: string;
  segment?: string;
  investment?: string;
  profile?: string;
  leadResponse?: string;
  leadSource?: string;
  description?: string;
  experience?: string;
  status?: string;
  callbackDate?: string;
}

export interface AllotmentUserOption {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamName: string | null;
}

/**
 * Validates whether a phone number already exists in the database.
 * Used for live on-blur checks in the Add Lead form.
 */
export async function checkPhoneDuplicateAction(
  rawPhone: string
): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    await requireAdminSession({ redirect: false });

    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized || normalized.length < 10) {
      return { isDuplicate: false };
    }

    const existing = await leadModel.findFirst({
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
 * Retrieves eligible active users for the "Allot To" dropdown in Add Lead form and Lead Drawer.
 */
export async function getLeadAllotmentUsersAction(): Promise<{
  success: boolean;
  users?: AllotmentUserOption[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const rawUsers = await prisma.user.findMany({
      where: { isActive: true },
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
      name: u.name,
      email: u.email,
      role: u.role,
      teamName: u.team?.name || null,
    }));

    return { success: true, users };
  } catch (err) {
    return handleActionError(err, "Failed to load personnel list for allotment.");
  }
}

/**
 * Creates a new lead with duplicate validation and atomic safety checks.
 */
export async function createLeadAction(
  input: CreateLeadInput
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Please enter a valid Lead name (at least 2 characters)." };
    }

    const normalizedMobile = normalizePhoneNumber(input.mobile || "");
    if (!normalizedMobile || normalizedMobile.length < 10) {
      return { success: false, error: "Please enter a valid 10-digit mobile number." };
    }

    // Server-side duplicate phone check
    const existingLead = await leadModel.findFirst({
      where: { mobile: normalizedMobile },
      select: { id: true, name: true },
    });

    if (existingLead) {
      return { success: false, error: "This number already exists." };
    }

    // Optional email validation
    const email = input.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address or leave it blank." };
    }

    // Optional allotment resolution
    let allottedUserId: string | null = null;
    let allottedTeamId: string | null = null;

    if (input.allotToId && input.allotToId.trim()) {
      const targetUser = await prisma.user.findUnique({
        where: { id: input.allotToId },
        select: { id: true, teamId: true, isActive: true },
      });

      if (targetUser && targetUser.isActive) {
        allottedUserId = targetUser.id;
        allottedTeamId = targetUser.teamId;
      }
    }

    // Dropdown validation for confirmed CRM options
    const rawResponse = input.leadResponse?.trim() || "Interested";
    if (rawResponse && !(LEAD_RESPONSE_OPTIONS as readonly string[]).includes(rawResponse)) {
      return { success: false, error: "Please select a valid Lead Response option." };
    }

    const rawSource = input.leadSource?.trim() || "Fresh Lead";
    if (rawSource && !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(rawSource)) {
      return { success: false, error: "Please select a valid Lead Source option." };
    }

    const rawProfile = input.profile?.trim() || null;
    if (rawProfile && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(rawProfile)) {
      return { success: false, error: "Please select a valid Profile option." };
    }

    const rawExperience = input.experience?.trim() || null;
    if (rawExperience && !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(rawExperience)) {
      return { success: false, error: "Please select a valid Experience option." };
    }

    // Sanitize and normalize other fields
    const alternateMobile = input.alternateMobile
      ? normalizePhoneNumber(input.alternateMobile)
      : null;

    const dob = input.dob ? new Date(input.dob) : null;
    const callbackDate = input.callbackDate ? new Date(input.callbackDate) : null;

    const created = await leadModel.create({
      data: {
        name,
        mobile: normalizedMobile,
        email,
        district: input.district?.trim() || null,
        alternateMobile,
        dob: dob && !isNaN(dob.getTime()) ? dob : null,
        aadhar: input.aadhar?.trim() || null,
        fatherName: input.fatherName?.trim() || null,
        state: input.state?.trim() || null,
        city: input.city?.trim() || null,
        pan: input.pan?.trim().toUpperCase() || null,
        gstin: input.gstin?.trim().toUpperCase() || null,
        occupation: input.occupation || null,
        segment: input.segment || null,
        investment: input.investment || null,
        profile: rawProfile,
        leadResponse: rawResponse,
        leadSource: rawSource,
        description: input.description?.trim() || null,
        experience: rawExperience,
        status: input.status || "UNFOLLOWED",
        callbackDate: callbackDate && !isNaN(callbackDate.getTime()) ? callbackDate : null,
        allotToId: allottedUserId,
        teamId: allottedTeamId,
        createdById: admin.id,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
      },
    });

    // Safely audit action with masked phone to avoid exposing sensitive PII in audit log
    const maskedPhone =
      created.mobile.length >= 4
        ? created.mobile.slice(-4).padStart(created.mobile.length, "*")
        : "****";

    await logActivity({
      action: "LEAD_CREATED",
      details: `Created lead '${created.name}' (${maskedPhone})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/add");
    revalidatePath("/admin");

    return {
      success: true,
      leadId: created.id,
    };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return { success: false, error: "This number already exists." };
    }
    return handleActionError(err, "Failed to create lead. An unexpected error occurred.");
  }
}

export interface LeadListItem {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  state: string | null;
  city: string | null;
  segment: string | null;
  status: string;
  leadResponse: string | null;
  leadSource: string | null;
  description: string | null;
  callbackDate: string | null;
  allotTo: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  createdAt: string;
}

export interface LeadDetailItem {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  district: string | null;
  alternateMobile: string | null;
  dob: string | null;
  aadhar: string | null;
  fatherName: string | null;
  state: string | null;
  city: string | null;
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
  allotTo: {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamName: string | null;
  } | null;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetLeadsParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves leads with pagination and search for the Admin Leads table.
 */
export async function getLeadsAction(params: GetLeadsParams = {}): Promise<{
  success: boolean;
  leads?: LeadListItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 15));
    const search = params.search?.trim();
    const statusFilter = normalizeStatusFilter(params.status);

    const where: Record<string, unknown> = {
      AND: [
        search
          ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { mobile: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
          : {},
        statusFilter ? { status: statusFilter } : {},
      ],
    };

    const [totalCount, rawLeads] = await Promise.all([
      leadModel.count({ where }),
      leadModel.findMany({
        where,
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
          state: true,
          city: true,
          segment: true,
          status: true,
          leadResponse: true,
          leadSource: true,
          description: true,
          callbackDate: true,
          allotTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const leads: LeadListItem[] = (rawLeads as Array<LeadListItem & { callbackDate: Date | null; createdAt: Date }>).map((l) => ({
      ...l,
      description: l.description || null,
      callbackDate: l.callbackDate ? l.callbackDate.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      success: true,
      leads,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load leads directory.");
  }
}

/**
 * Retrieves full details of a specific lead for the detail/update drawer.
 */
export async function getLeadByIdAction(leadId: string): Promise<{
  success: boolean;
  lead?: LeadDetailItem;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const lead = await leadModel.findUnique({
      where: { id: leadId },
      include: {
        allotTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return { success: false, error: "Lead not found." };
    }

    return {
      success: true,
      lead: {
        ...lead,
        dob: lead.dob ? lead.dob.toISOString() : null,
        callbackDate: lead.callbackDate ? lead.callbackDate.toISOString() : null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        allotTo: lead.allotTo
          ? {
            id: lead.allotTo.id,
            name: lead.allotTo.name,
            email: lead.allotTo.email,
            role: lead.allotTo.role,
            teamName: lead.allotTo.team?.name || null,
          }
          : null,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load lead details.");
  }
}

export interface UpdateLeadDetailsInput {
  leadId: string;
  name?: string;
  mobile?: string;
  email?: string;
  alternateMobile?: string;
  district?: string;
  dob?: string | null;
  aadhar?: string;
  fatherName?: string;
  state?: string;
  city?: string;
  pan?: string;
  gstin?: string;
  occupation?: string;
  segment?: string;
  investment?: string;
  leadResponse?: string;
  leadSource?: string;
  profile?: string;
  experience?: string;
  callbackDate?: string | null;
  description?: string;
  allotToId?: string | null;
  status?: string;
}

/**
 * Updates a lead's response, source, profile, experience, callback date, comments/description, and allotment.
 * Records changes in ActivityLog.
 */
export async function updateLeadDetailsAction(
  input: UpdateLeadDetailsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const { leadId } = input;
    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const existingLead = await leadModel.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        mobile: true,
        allotToId: true,
        teamId: true,
        status: true,
        leadResponse: true,
        leadSource: true,
        profile: true,
        experience: true,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Target lead does not exist." };
    }

    const updateData: Record<string, unknown> = {};

    // 1. Update Lead Response if supplied
    if (input.leadResponse !== undefined) {
      const resp = input.leadResponse?.trim() || null;
      if (resp && !(LEAD_RESPONSE_OPTIONS as readonly string[]).includes(resp) && resp !== existingLead.leadResponse) {
        return { success: false, error: "Invalid Lead Response option." };
      }
      updateData.leadResponse = resp;
    }

    // 2. Update Lead Source if supplied
    if (input.leadSource !== undefined) {
      const src = input.leadSource?.trim() || null;
      if (src && !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(src) && src !== existingLead.leadSource) {
        return { success: false, error: "Invalid Lead Source option." };
      }
      updateData.leadSource = src;
    }

    // 3. Update Profile if supplied
    if (input.profile !== undefined) {
      const prof = input.profile?.trim() || null;
      if (prof && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(prof) && prof !== existingLead.profile) {
        return { success: false, error: "Invalid Profile option." };
      }
      updateData.profile = prof;
    }

    // 4. Update Experience if supplied
    if (input.experience !== undefined) {
      const exp = input.experience?.trim() || null;
      if (exp && !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(exp) && exp !== existingLead.experience) {
        return { success: false, error: "Invalid Experience option." };
      }
      updateData.experience = exp;
    }

    // 2. Update Callback Date if supplied
    if (input.callbackDate !== undefined) {
      if (input.callbackDate) {
        const d = new Date(input.callbackDate);
        updateData.callbackDate = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.callbackDate = null;
      }
    }

    // 3. Update Comments / Description if supplied
    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }

    // 4. Update Status if supplied
    if (input.status !== undefined) {
      updateData.status = input.status?.trim() || existingLead.status;
    }

    // 5. Reassign Lead (Allot To)
    if (input.allotToId !== undefined) {
      if (input.allotToId && input.allotToId.trim()) {
        const targetAssignee = await prisma.user.findUnique({
          where: { id: input.allotToId.trim() },
          select: { id: true, name: true, teamId: true, isActive: true },
        });

        if (!targetAssignee || !targetAssignee.isActive) {
          return { success: false, error: "Selected assignee user is not active." };
        }

        updateData.allotTo = { connect: { id: targetAssignee.id } };
        if (targetAssignee.teamId) {
          updateData.team = { connect: { id: targetAssignee.teamId } };
        } else {
          updateData.team = { disconnect: true };
        }
      } else {
        // Unassign lead
        updateData.allotTo = { disconnect: true };
        updateData.team = { disconnect: true };
      }
    }

    // Update basic contact info if supplied
    if (input.name !== undefined && input.name.trim().length >= 2) {
      updateData.name = input.name.trim();
    }
    if (input.mobile !== undefined && input.mobile.trim().length >= 10) {
      updateData.mobile = normalizePhoneNumber(input.mobile.trim());
    }
    if (input.email !== undefined) {
      updateData.email = input.email?.trim().toLowerCase() || null;
    }
    if (input.alternateMobile !== undefined) {
      updateData.alternateMobile = input.alternateMobile ? normalizePhoneNumber(input.alternateMobile) : null;
    }

    // Update address if supplied
    if (input.state !== undefined) updateData.state = input.state?.trim() || null;
    if (input.city !== undefined) updateData.city = input.city?.trim() || null;
    if (input.district !== undefined) updateData.district = input.district?.trim() || null;

    // Update other details if supplied
    if (input.fatherName !== undefined) updateData.fatherName = input.fatherName?.trim() || null;
    if (input.dob !== undefined) {
      if (input.dob) {
        const d = new Date(input.dob);
        updateData.dob = !isNaN(d.getTime()) ? d : null;
      } else {
        updateData.dob = null;
      }
    }
    if (input.aadhar !== undefined) updateData.aadhar = input.aadhar?.trim() || null;
    if (input.pan !== undefined) updateData.pan = input.pan?.trim().toUpperCase() || null;
    if (input.gstin !== undefined) updateData.gstin = input.gstin?.trim().toUpperCase() || null;
    if (input.occupation !== undefined) updateData.occupation = input.occupation?.trim() || null;

    // Update investment & segment if supplied
    if (input.investment !== undefined) updateData.investment = input.investment?.trim() || null;
    if (input.segment !== undefined) updateData.segment = input.segment?.trim() || null;

    await leadModel.update({
      where: { id: leadId },
      data: updateData,
    });

    // Mask phone for activity log (never log full PII)
    const maskedPhone =
      existingLead.mobile.length >= 4
        ? existingLead.mobile.slice(-4).padStart(existingLead.mobile.length, "*")
        : "****";

    await logActivity({
      action: "LEAD_UPDATED",
      details: `Updated lead '${existingLead.name}' (${maskedPhone}) disposition/allotment`,
      actorId: admin.id,
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin/search");
    revalidatePath("/admin");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update lead details.");
  }
}

export interface GlobalLeadSearchResult {
  id: string;
  name: string;
  mobile: string;
  status: string;
  segment: string | null;
  leadResponse: string | null;
  assignedToName: string | null;
  assignedToRole: string | null;
}

/**
 * Searches leads by phone number, name, or email for the Admin Global Search bar.
 * Safe read with admin authorization and PII masking.
 */
export async function searchLeadsGlobalAction(
  query: string
): Promise<{ success: boolean; leads: GlobalLeadSearchResult[]; error?: string }> {
  try {
    await requireAdminSession({ redirect: false });

    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      return { success: true, leads: [] };
    }

    const normalizedDigits = normalizePhoneNumber(trimmed);

    // Build search conditions:
    // If query has digits, search normalized mobile phone
    // Also search name and email case-insensitively
    const orConditions: Array<Record<string, unknown>> = [
      { name: { contains: trimmed, mode: "insensitive" } },
      { email: { contains: trimmed, mode: "insensitive" } },
    ];

    if (normalizedDigits.length >= 2) {
      orConditions.push({ mobile: { contains: normalizedDigits } });
    } else {
      orConditions.push({ mobile: { contains: trimmed } });
    }

    const matches = await leadModel.findMany({
      where: { OR: orConditions },
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        segment: true,
        leadResponse: true,
        allotTo: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const results: GlobalLeadSearchResult[] = (matches as Array<{
      id: string;
      name: string;
      mobile: string;
      status: string;
      segment: string | null;
      leadResponse: string | null;
      allotTo?: { name: string; role: Role } | null;
    }>).map((m) => ({
      id: m.id,
      name: m.name,
      mobile: m.mobile,
      status: m.status,
      segment: m.segment,
      leadResponse: m.leadResponse,
      assignedToName: m.allotTo?.name || null,
      assignedToRole: m.allotTo?.role || null,
    }));

    return { success: true, leads: results };
  } catch (err) {
    const errorRes = handleActionError(err, "Failed to perform global search for leads.");
    return { ...errorRes, leads: [] };
  }
}


export interface LifecycleSearchLead extends LeadDetailItem {
  ownerName: string;
  ownerRole: string;
  createdByName?: string | null;
  createdByRole?: string | null;
}

export interface SearchLifecycleResult {
  success: boolean;
  query: string;
  leads: LifecycleSearchLead[];
  statusCounts: Record<string, number>;
  activeStatusKey: string;
  error?: string;
}

/**
 * Searches leads by query (name, phone, email) or targetLeadId,
 * aggregates counts across all 8 lifecycle headers, and identifies the active status header.
 */
export async function searchLeadsWithLifecycleAction(
  query: string,
  requestedStatus?: string,
  targetLeadId?: string
): Promise<SearchLifecycleResult> {
  try {
    await requireAdminSession({ redirect: false });

    const trimmed = query?.trim() || "";
    const normalizedDigits = normalizePhoneNumber(trimmed);

    let where: Record<string, unknown> = {};

    if (targetLeadId && targetLeadId.trim()) {
      where = { id: targetLeadId.trim() };
    } else if (trimmed.length > 0) {
      const orConditions: Array<Record<string, unknown>> = [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
        { city: { contains: trimmed, mode: "insensitive" } },
      ];

      if (normalizedDigits.length >= 2) {
        orConditions.push({ mobile: { contains: normalizedDigits } });
      } else {
        orConditions.push({ mobile: { contains: trimmed } });
      }

      where = { OR: orConditions };
    }

    const rawMatches = await prisma.lead.findMany({
      where,
      include: {
        allotTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const statusCounts: Record<string, number> = {
      UNREAD: 0,
      READ: 0,
      FOLLOW_UP: 0,
      TRIAL: 0,
      CLIENT: 0,
      DISPOSED: 0,
      DELETED: 0,
      AVAILABLE: 0,
    };

    const leads: LifecycleSearchLead[] = rawMatches.map((l) => {
      const lifecycleKey = mapStatusToLifecycleKey(l.status);
      statusCounts[lifecycleKey] = (statusCounts[lifecycleKey] || 0) + 1;

      return {
        id: l.id,
        name: l.name,
        mobile: l.mobile,
        email: l.email || null,
        district: l.district || null,
        alternateMobile: l.alternateMobile || null,
        dob: l.dob ? l.dob.toISOString() : null,
        aadhar: l.aadhar || null,
        fatherName: l.fatherName || null,
        state: l.state || null,
        city: l.city || null,
        pan: l.pan || null,
        gstin: l.gstin || null,
        occupation: l.occupation || null,
        segment: l.segment || null,
        investment: l.investment || null,
        profile: l.profile || null,
        leadResponse: l.leadResponse || null,
        leadSource: l.leadSource || null,
        description: l.description || null,
        experience: l.experience || null,
        status: l.status,
        callbackDate: l.callbackDate ? l.callbackDate.toISOString() : null,
        allotToId: l.allotToId || null,
        allotTo: l.allotTo
          ? {
              id: l.allotTo.id,
              name: l.allotTo.name,
              email: l.allotTo.email,
              role: l.allotTo.role,
              teamName: l.allotTo.team?.name || null,
            }
          : null,
        teamId: l.teamId || null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        ownerName: l.allotTo?.name || "Admin",
        ownerRole: l.allotTo?.role || "ADMIN",
      };
    });

    // Determine active status header
    let activeKey = "";
    if (requestedStatus && requestedStatus.toUpperCase() in statusCounts) {
      activeKey = requestedStatus.toUpperCase();
    } else if (leads.length > 0) {
      // Automatically select the status of the first matched lead!
      activeKey = mapStatusToLifecycleKey(leads[0].status);
    } else {
      activeKey = "READ";
    }

    return {
      success: true,
      query: trimmed,
      leads,
      statusCounts,
      activeStatusKey: activeKey,
    };
  } catch (err) {
    const errRes = handleActionError(err, "Failed to search leads across lifecycle headers.");
    return {
      ...errRes,
      query,
      leads: [],
      statusCounts: {
        UNREAD: 0,
        READ: 0,
        FOLLOW_UP: 0,
        TRIAL: 0,
        CLIENT: 0,
        DISPOSED: 0,
        DELETED: 0,
        AVAILABLE: 0,
      },
      activeStatusKey: "READ",
    };
  }
}


export interface SourceCountsBreakdown {
  total: Record<string, number>;
  unassigned: Record<string, number>;
}

/**
 * Returns breakdown of leads grouped by their leadSource (both Total and Unassigned).
 */
export async function getDetailedLeadSourceCountsAction(): Promise<{
  success: boolean;
  counts?: SourceCountsBreakdown;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    // Single parallel execution using groupBy without fetching individual lead records
    const [totalGrouped, unassignedGrouped] = await Promise.all([
      prisma.lead.groupBy({
        by: ["leadSource"],
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["leadSource"],
        where: { allotToId: null },
        _count: { _all: true },
      }),
    ]);

    const total: Record<string, number> = {};
    for (const g of totalGrouped) {
      if (g.leadSource) {
        total[g.leadSource] = g._count._all;
      }
    }

    const unassigned: Record<string, number> = {};
    for (const g of unassignedGrouped) {
      if (g.leadSource) {
        unassigned[g.leadSource] = g._count._all;
      }
    }

    return { success: true, counts: { total, unassigned } };
  } catch (err) {
    return handleActionError(err, "Failed to retrieve detailed lead source breakdown.");
  }
}

/**
 * Returns total count of leads grouped by their leadSource, with optional unassigned-only filter and profile filter.
 */
export async function getLeadSourceCountsAction(params?: {
  unassignedOnly?: boolean;
  profile?: string;
}): Promise<{
  success: boolean;
  counts?: Record<string, number>;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const whereClause: { allotToId?: null; profile?: string } = {};
    if (params?.unassignedOnly) {
      whereClause.allotToId = null;
    }
    if (params?.profile) {
      (whereClause as Record<string, unknown>).profile = {
        equals: params.profile,
        mode: "insensitive",
      };
    }

    const grouped = await prisma.lead.groupBy({
      by: ["leadSource"],
      where: whereClause,
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const g of grouped) {
      if (g.leadSource) {
        counts[g.leadSource] = g._count._all;
      }
    }

    return { success: true, counts };
  } catch (err) {
    return handleActionError(err, "Failed to retrieve lead source breakdown.");
  }
}

export interface CsvLeadRow {
  mobile: string;
  name: string;
  email?: string;
  city?: string;
  address?: string;
  segment?: string;
  occupation?: string;
  investment?: string;
  profile?: string;
}

export interface UploadLeadsBatchInput {
  leadSource: string;
  allotToId?: string;
  leads: CsvLeadRow[];
}

export interface UploadLeadsResult {
  success: boolean;
  totalProcessed: number;
  importedCount: number;
  skippedDuplicates: string[];
  invalidRows: { rowNumber: number; reason: string }[];
  error?: string;
}

/**
 * Bulk imports parsed leads with duplicate skipping and address-in-description convention.
 */
export async function uploadLeadsBatchAction(
  input: UploadLeadsBatchInput
): Promise<UploadLeadsResult> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const rawSource = input.leadSource?.trim() || "Fresh Lead";
    if (rawSource && !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(rawSource)) {
      return {
        success: false,
        totalProcessed: 0,
        importedCount: 0,
        skippedDuplicates: [],
        invalidRows: [],
        error: "Please select a valid Lead Source option.",
      };
    }

    // Validate employee if allotted
    let allottedUserId: string | null = null;
    let allottedTeamId: string | null = null;
    if (input.allotToId && input.allotToId.trim()) {
      const targetUser = await prisma.user.findFirst({
        where: { id: input.allotToId.trim(), isActive: true },
        select: { id: true, teamId: true },
      });
      if (!targetUser) {
        return {
          success: false,
          totalProcessed: 0,
          importedCount: 0,
          skippedDuplicates: [],
          invalidRows: [],
          error: "The chosen employee is either inactive or does not exist.",
        };
      }
      allottedUserId = targetUser.id;
      allottedTeamId = targetUser.teamId;
    }

    const skippedDuplicates: string[] = [];
    const invalidRows: { rowNumber: number; reason: string }[] = [];
    const seenMobilesInBatch = new Set<string>();

    interface ValidatedLeadItem {
      name: string;
      mobile: string;
      email?: string | null;
      city?: string | null;
      district?: string | null;
      occupation?: string | null;
      segment?: string | null;
      investment?: string | null;
      description?: string | null;
      profile?: string | null;
    }

    const candidatesToInsert: ValidatedLeadItem[] = [];

    // Step 1: In-memory normalization and within-batch deduplication
    input.leads.forEach((row, idx) => {
      const rowNum = idx + 1;
      const rawName = (row.name || "").trim();
      const rawMobile = (row.mobile || "").trim();

      // If name is not provided or empty, fallback gracefully to lead's source or mobile identifier
      const finalName = rawName || "Lead";

      const normalizedMobile = normalizePhoneNumber(rawMobile);
      if (!normalizedMobile || normalizedMobile.length < 10) {
        invalidRows.push({ rowNumber: rowNum, reason: `Invalid mobile number: '${rawMobile}'` });
        return;
      }

      if (seenMobilesInBatch.has(normalizedMobile)) {
        skippedDuplicates.push(normalizedMobile);
        return;
      }
      seenMobilesInBatch.add(normalizedMobile);

      // Address convention: store formatted address into description if provided
      const cleanAddress = (row.address || "").trim();
      const description = cleanAddress ? `[Address: ${cleanAddress}]` : null;

      const cleanProfile = (row.profile || "").trim() || null;

      candidatesToInsert.push({
        name: finalName,
        mobile: normalizedMobile,
        email: (row.email || "").trim() || null,
        city: (row.city || "").trim() || null,
        district: null,
        occupation: (row.occupation || "").trim() || null,
        segment: (row.segment || "").trim() || null,
        investment: (row.investment || "").trim() || null,
        description,
        profile: cleanProfile,
      });
    });

    if (candidatesToInsert.length === 0) {
      return {
        success: true,
        totalProcessed: input.leads.length,
        importedCount: 0,
        skippedDuplicates,
        invalidRows,
      };
    }

    // Step 2: Query database for existing mobile numbers in one batch
    const candidateMobiles = candidatesToInsert.map((c) => c.mobile);
    const existingLeads = await prisma.lead.findMany({
      where: { mobile: { in: candidateMobiles } },
      select: { mobile: true },
    });

    const existingMobilesSet = new Set(existingLeads.map((l) => l.mobile));

    const finalLeadsToInsert = candidatesToInsert.filter((candidate) => {
      if (existingMobilesSet.has(candidate.mobile)) {
        skippedDuplicates.push(candidate.mobile);
        return false;
      }
      return true;
    });

    // Step 3: Insert non-duplicates safely in transaction
    if (finalLeadsToInsert.length > 0) {
      await prisma.$transaction(
        finalLeadsToInsert.map((item) =>
          prisma.lead.create({
            data: {
              name: item.name,
              mobile: item.mobile,
              email: item.email,
              city: item.city,
              district: item.district,
              occupation: item.occupation,
              segment: item.segment,
              investment: item.investment,
              description: item.description,
              profile: item.profile,
              leadSource: rawSource,
              leadResponse: "Interested",
              status: "UNFOLLOWED",
              allotToId: allottedUserId,
              teamId: allottedTeamId,
              createdById: admin.id,
            },
          })
        )
      );

      // Log bulk upload activity
      await logActivity({
        actorId: admin.id,
        action: "LEAD_IMPORT",
        details: `Bulk imported ${finalLeadsToInsert.length} leads under source '${rawSource}'${
          allottedUserId ? ` (assigned to user ID: ${allottedUserId})` : ""
        }. Skipped ${skippedDuplicates.length} duplicates.`,
      });
    }

    revalidatePath("/admin/leads");

    return {
      success: true,
      totalProcessed: input.leads.length,
      importedCount: finalLeadsToInsert.length,
      skippedDuplicates,
      invalidRows,
    };
  } catch (err) {
    const errRes = handleActionError(err, "Bulk lead import failed. Please verify CSV formatting.");
    return {
      success: false,
      totalProcessed: input.leads.length,
      importedCount: 0,
      skippedDuplicates: [],
      invalidRows: [],
      error: errRes.error,
    };
  }
}


export interface AllotLeadsInput {
  leadSource: string;
  profile?: string; // Optional customer profile filter (Trader, Investor, etc.)
  employeeId: string;
  numberOfLeads: number;
}

export interface AllotLeadsResult {
  success: boolean;
  source: string;
  profile?: string | null;
  employeeName: string;
  requestedCount: number;
  allottedCount: number;
  shortageCount: number;
  error?: string;
}

/**
 * Allots unassigned leads of a specified source to an active employee in oldest-first order (createdAt asc).
 * Safe against race conditions and preserves existing lead status.
 */
export async function allotLeadsAction(
  input: AllotLeadsInput
): Promise<AllotLeadsResult> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const rawSource = input.leadSource?.trim();
    if (!rawSource || !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(rawSource)) {
      return {
        success: false,
        source: rawSource || "",
        employeeName: "",
        requestedCount: input.numberOfLeads || 0,
        allottedCount: 0,
        shortageCount: 0,
        error: "Please select a valid Lead Source.",
      };
    }

    const requestedCount = Math.floor(input.numberOfLeads);
    if (isNaN(requestedCount) || requestedCount <= 0) {
      return {
        success: false,
        source: rawSource,
        employeeName: "",
        requestedCount: 0,
        allottedCount: 0,
        shortageCount: 0,
        error: "Please enter a valid positive number of leads to allot.",
      };
    }

    // Validate customer profile if specified
    const rawProfile = input.profile?.trim() || "";
    if (rawProfile && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(rawProfile)) {
      return {
        success: false,
        source: rawSource,
        profile: rawProfile,
        employeeName: "",
        requestedCount,
        allottedCount: 0,
        shortageCount: 0,
        error: "Please select a valid Profile option or leave it as All Profiles.",
      };
    }

    const targetEmployeeId = input.employeeId?.trim();
    if (!targetEmployeeId) {
      return {
        success: false,
        source: rawSource,
        profile: rawProfile || null,
        employeeName: "",
        requestedCount,
        allottedCount: 0,
        shortageCount: 0,
        error: "Please select an employee to receive the leads.",
      };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetEmployeeId, isActive: true },
      select: { id: true, name: true, role: true, teamId: true },
    });

    if (!targetUser) {
      return {
        success: false,
        source: rawSource,
        employeeName: "",
        requestedCount,
        allottedCount: 0,
        shortageCount: 0,
        error: "Selected employee is not active or does not exist.",
      };
    }

    // Atomic transaction: Find oldest unassigned leads & allot them
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch oldest eligible leads matching source and optional profile with allotToId: null
      const leadFilter: {
        leadSource: string;
        allotToId: null;
        profile?: string;
      } = {
        leadSource: rawSource,
        allotToId: null,
      };

      if (rawProfile) {
        // Match case-insensitively or exact match
        (leadFilter as Record<string, unknown>).profile = {
          equals: rawProfile,
          mode: "insensitive",
        };
      }

      const eligibleLeads = await tx.lead.findMany({
        where: leadFilter,
        orderBy: {
          createdAt: "asc",
        },
        take: requestedCount,
        select: {
          id: true,
        },
      });

      if (eligibleLeads.length === 0) {
        return { allottedCount: 0, shortageCount: requestedCount };
      }

      const eligibleIds = eligibleLeads.map((l) => l.id);

      // 2. Perform conditional bulk update ensuring allotToId is still null
      const updated = await tx.lead.updateMany({
        where: {
          id: { in: eligibleIds },
          allotToId: null, // Guard against concurrent allotment
        },
        data: {
          allotToId: targetUser.id,
          teamId: targetUser.teamId,
          // Preserves existing lead status (does not touch status)
        },
      });

      const actualAllotted = updated.count;
      const shortage = Math.max(0, requestedCount - actualAllotted);

      return {
        allottedCount: actualAllotted,
        shortageCount: shortage,
      };
    });

    // Record activity log
    await logActivity({
      actorId: admin.id,
      action: "LEAD_ALLOTMENT",
      details: `Allotted ${result.allottedCount} lead(s) of source '${rawSource}'${rawProfile ? ` (Profile: ${rawProfile})` : ""} to ${targetUser.name} (${targetUser.role})${
        result.shortageCount > 0 ? ` [Shortage: requested ${requestedCount}, available ${result.allottedCount}]` : ""
      }.`,
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/allot");

    return {
      success: true,
      source: rawSource,
      profile: rawProfile || null,
      employeeName: targetUser.name,
      requestedCount,
      allottedCount: result.allottedCount,
      shortageCount: result.shortageCount,
    };
  } catch (err) {
    const errRes = handleActionError(err, "Failed to allot leads.");
    return {
      success: false,
      source: input.leadSource || "",
      employeeName: "",
      requestedCount: input.numberOfLeads || 0,
      allottedCount: 0,
      shortageCount: 0,
      error: errRes.error,
    };
  }
}
