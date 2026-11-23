"use server";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { getActiveLeadResponseNames } from "@/src/lib/lead-responses-helper";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import {
  normalizePhoneNumber,
  normalizeStatusFilter,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
  mapStatusToLifecycleKey,
} from "@/src/lib/utils";
import { revalidatePath } from "next/cache";
import { type Role, Prisma } from "@prisma/client";
import type {
  EmployeeLeadCountFiltersInput,
  LeadCountSummaryResult,
  DispositionBreakdownItem,
} from "@/src/features/employee/lead-actions";

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

// Safe accessor for Lead model delegate across IDE TypeScript servers

const leadModel = prisma.lead;

export type {
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
      where: { isActive: true, deletedAt: null },
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
    // Dropdown validation for dynamic active responses
    const rawResponse = input.leadResponse?.trim() || null;
    if (rawResponse) {
      if (["CLIENT", "CLIENTS"].includes(rawResponse.toUpperCase())) {
        return { success: false, error: "Client status cannot be assigned manually via call disposition." };
      }
      const activeResponses = await getActiveLeadResponseNames();
      if (!activeResponses.includes(rawResponse)) {
        return { success: false, error: "Please select an active Lead Response from the system." };
      }
    }

    if (input.status && ["CLIENT", "CLIENTS"].includes(input.status.toUpperCase())) {
      return { success: false, error: "Cannot create lead directly as Client without confirmed payment." };
    }

    let initialStatus = input.status || "UNFOLLOWED";
    if (rawResponse) {
      const norm = rawResponse.toUpperCase();
      if (["FT", "FREE TRIAL", "TRIAL"].includes(norm)) {
        initialStatus = "TRIAL";
      } else if (["PAID", "PAYMENT"].includes(norm)) {
        initialStatus = "CLIENT";
      } else if (
        ["DISPOSED", "DISPOSE", "DO NOT TRADE", "DNT", "NOT INTERESTED", "NOT INTRESTED", "NI"].includes(norm)
      ) {
        initialStatus = "DISPOSED";
      } else if (
        ["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP", "CALL BACK", "CALLBACK", "CALL_BACK", "CB"].includes(norm) ||
        input.status === "FOLLOW_UP"
      ) {
        initialStatus = "FOLLOW_UP";
      } else {
        initialStatus = "READ";
      }
    }

    const activeSources = await getActiveLeadSourceNames();
    const rawSource = input.leadSource?.trim() || null;
    if (rawSource && !activeSources.includes(rawSource)) {
      return { success: false, error: "Please select an active Lead Source from the system." };
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
        status: initialStatus,
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
  statusIn?: string[];
  page?: number;
  pageSize?: number;
  lastUpdateDateType?: string | null;
  lastUpdateDate?: string | null;
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
  leadRecycleCount?: string | null;
  paidRange?: string | null;
  mobile?: string | null;
  scopeToAssignedOnly?: boolean;
}

function buildAdminLeadsWhere(
  params: GetLeadsParams & {
    selectedStages?: string[];
    selectedResponses?: string[];
    selectedKeys?: string[];
  }
): Prisma.LeadWhereInput {
  const andConditions: Prisma.LeadWhereInput[] = [];

  // 1. Search filter
  const search = params.search?.trim();
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // 2. Status / Stages condition
  if (params.statusIn && params.statusIn.length > 0) {
    const expandedStatuses: string[] = [];
    for (const s of params.statusIn) {
      if (s === "UNREAD" || s === "UNFOLLOWED") expandedStatuses.push("UNREAD", "UNFOLLOWED");
      else if (s === "FOLLOW_UP") expandedStatuses.push("FOLLOW_UP", "FOLLOWUPS");
      else if (s === "TRIAL") expandedStatuses.push("TRIAL", "TRIALS");
      else if (s === "CLIENT") expandedStatuses.push("CLIENT", "CLIENTS");
      else if (s === "DISPOSED") expandedStatuses.push("DISPOSED", "DISPOSE");
      else expandedStatuses.push(s);
    }
    andConditions.push({ status: { in: Array.from(new Set(expandedStatuses)) } });
  } else if (params.status) {
    const statusFilter = normalizeStatusFilter(params.status);
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "UNREAD" || statusFilter === "UNFOLLOWED") {
        andConditions.push({ status: { in: ["UNREAD", "UNFOLLOWED"] } });
      } else if (statusFilter === "FOLLOW_UP") {
        andConditions.push({ status: { in: ["FOLLOW_UP", "FOLLOWUPS"] } });
      } else if (statusFilter === "TRIAL") {
        andConditions.push({ status: { in: ["TRIAL", "TRIALS"] } });
      } else if (statusFilter === "CLIENT") {
        andConditions.push({ status: { in: ["CLIENT", "CLIENTS"] } });
      } else if (statusFilter === "DISPOSED") {
        andConditions.push({ status: { in: ["DISPOSED", "DISPOSE"] } });
      } else {
        andConditions.push({ status: statusFilter });
      }
    }
  }

  // 3. Lead Response condition
  if (params.leadResponseIn && params.leadResponseIn.length > 0) {
    const allVariants: string[] = [];
    for (const resp of params.leadResponseIn) {
      allVariants.push(...getResponseFilterVariants(resp));
    }
    andConditions.push({ leadResponse: { in: Array.from(new Set(allVariants)) } });
  } else if (params.leadResponse && params.leadResponse.trim()) {
    const variants = getResponseFilterVariants(params.leadResponse.trim());
    if (variants.length === 1) {
      andConditions.push({ leadResponse: variants[0] });
    } else {
      andConditions.push({ leadResponse: { in: variants } });
    }
  }

  // 4. Source condition
  if (params.leadSource && params.leadSource.trim()) {
    andConditions.push({
      leadSource: {
        equals: params.leadSource.trim(),
        mode: "insensitive",
      },
    });
  }

  // 5. Mobile condition
  if (params.mobile && params.mobile.trim()) {
    andConditions.push({ mobile: { contains: params.mobile.trim() } });
  }

  // 6. Creator condition
  if (params.createdById && params.createdById.trim()) {
    const cb = params.createdById.trim();
    if (cb === "ADMIN" || cb === "ADMIN_ROLE") {
      andConditions.push({ createdBy: { role: "ADMIN" } });
    } else {
      andConditions.push({ createdById: cb });
    }
  }

  // 7. Lead Owner condition
  if (params.leadOwnerId && params.leadOwnerId.trim()) {
    const owner = params.leadOwnerId.trim();
    if (owner === "DEACTIVATED") {
      andConditions.push({ allotTo: { isActive: false } });
    } else {
      andConditions.push({ allotToId: owner });
    }
  }

  // 8. Team condition
  if (params.teamId && params.teamId.trim()) {
    andConditions.push({ teamId: params.teamId.trim() });
  }

  // 9. Lead Assignment condition
  if (params.leadAssignment && params.leadAssignment.trim()) {
    const assign = params.leadAssignment.trim();
    const upper = assign.toUpperCase();
    if (upper === "UNALLOTED" || upper === "UNALLOTED LEADS" || upper === "UNASSIGNED") {
      andConditions.push({ allotToId: null });
    } else {
      andConditions.push({ allotToId: { not: null } });
    }
  } else if (params.scopeToAssignedOnly) {
    // Default Admin Count modal scope: fetched/assigned leads only
    andConditions.push({ allotToId: { not: null } });
  }

  // 10. Date filters
  const dateType = params.lastUpdateDateType?.trim();
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

  const dateCondition: Prisma.DateTimeFilter = {};
  if (params.startDate?.trim()) {
    const s = new Date(params.startDate.trim());
    if (!isNaN(s.getTime())) {
      s.setHours(0, 0, 0, 0);
      dateCondition.gte = s;
    }
  }
  if (params.endDate?.trim()) {
    const e = new Date(params.endDate.trim());
    if (!isNaN(e.getTime())) {
      e.setHours(23, 59, 59, 999);
      dateCondition.lte = e;
    }
  }
  if (!dateCondition.gte && !dateCondition.lte && params.lastUpdateDate?.trim()) {
    const d = new Date(params.lastUpdateDate.trim());
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
      andConditions.push({ payments: { some: { createdAt: dateCondition, status: "APPROVED" } } });
    } else if (dateType === "updated followup" || dateType === "followup added date") {
      andConditions.push({ updatedAt: dateCondition });
    } else {
      andConditions.push({ createdAt: dateCondition });
    }
  }

  // 11. Trial status filter
  if (params.trialStatus && params.trialStatus.trim()) {
    andConditions.push({ trials: { some: { status: params.trialStatus.trim() } } });
  }

  // 12. Service status filter
  if (params.serviceStatus && params.serviceStatus.trim()) {
    andConditions.push({ invoices: { some: { status: params.serviceStatus.trim() } } });
  }

  // 13. Service ID filter
  if (params.serviceId && params.serviceId.trim()) {
    andConditions.push({ invoices: { some: { productId: params.serviceId.trim() } } });
  }

  // 14. Paid range filter
  if (params.paidRange && params.paidRange.trim()) {
    const parts = params.paidRange
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

  return andConditions.length > 0 ? { AND: andConditions } : {};
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
    const where = buildAdminLeadsWhere(params);

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
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
 * Checks whether a lead has a confirmed/approved payment or active invoice.
 * Used to guard against unauthorized/manual conversion to CLIENT.
 */
export async function checkLeadHasConfirmedPayment(leadId: string): Promise<boolean> {
  const [confirmedPayment, confirmedInvoice] = await Promise.all([
    prisma.payment.findFirst({
      where: {
        leadId,
        status: { in: ["APPROVED", "Approved", "approved"] },
      },
      select: { id: true },
    }),
    prisma.invoice.findFirst({
      where: {
        leadId,
        status: { in: ["APPROVED", "Approved", "approved", "RUNNING", "Running", "running"] },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(confirmedPayment || confirmedInvoice);
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
    let chosenResponse: string | null = null;
    let isResponseExplicitlyProvided = false;

    // 1. Update Lead Response if supplied
    if (input.leadResponse !== undefined) {
      isResponseExplicitlyProvided = true;
      const resp = input.leadResponse?.trim() || null;
      if (resp) {
        // Disallow setting CLIENT / Client via call disposition
        if (["CLIENT", "CLIENTS"].includes(resp.toUpperCase())) {
          return { success: false, error: "Client status cannot be assigned manually via call disposition." };
        }
        const activeResponses = await getActiveLeadResponseNames();
        if (!activeResponses.includes(resp) && resp !== existingLead.leadResponse) {
          return { success: false, error: "Invalid Lead Response option. Must be an active response from Settings." };
        }
      }
      chosenResponse = resp;
      updateData.leadResponse = resp;
    }

    // 2. Update Lead Source if supplied
    if (input.leadSource !== undefined) {
      const src = input.leadSource?.trim() || null;
      const activeSources = await getActiveLeadSourceNames();
      if (src && !activeSources.includes(src) && src !== existingLead.leadSource) {
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

    // 4. Update Status with response-to-pill mapping and payment verification for CLIENT
    const isExistingClient = ["CLIENT", "CLIENTS"].includes((existingLead.status || "").toUpperCase());

    // Guard manual assignment of CLIENT status
    if (input.status !== undefined && ["CLIENT", "CLIENTS"].includes(input.status.trim().toUpperCase())) {
      const hasPayment = await checkLeadHasConfirmedPayment(leadId);
      if (!hasPayment) {
        return {
          success: false,
          error: "Cannot convert lead to Client without a confirmed/approved payment or active invoice.",
        };
      }
    }

    // Automatic Response-to-Status Mapping:
    // - If input.status === "FOLLOW_UP" OR normalized response is "FOLLOW UP" / "FOLLOW_UP" / "FOLLOWUP":
    //   -> status = "FOLLOW_UP" (moves lead to Followups tab).
    // - Else if normalized response is "FT" OR "FREE TRIAL" OR "TRIAL":
    //   -> status = "TRIAL" (moves lead to Trials tab and decrements Unread count).
    // - Else if normalized response is "DISPOSED" OR "DISPOSE" OR input.status === "DISPOSED":
    //   -> status = "DISPOSED" (moves lead to Disposed tab).
    // - Else if a response is provided (e.g. Interested, Busy, NPC, Callback, etc.):
    //   -> If the lead is already a confirmed CLIENT, preserve CLIENT status.
    //   -> If an explicit overriding status is passed (like DELETED or TRIAL), preserve it.
    //   -> Otherwise, cleanly fall back to READ (moves lead to Read tab and decrements Unread count).
    // - Else if no response is provided, fallback to explicitly passed status (guarded for CLIENT).

    const normalizedResp = chosenResponse
      ? chosenResponse.toUpperCase()
      : isResponseExplicitlyProvided && input.leadResponse
        ? input.leadResponse.trim().toUpperCase()
        : "";

    const currentStatusUpper = (existingLead.status || "").trim().toUpperCase();
    const isUnreadOrUnfollowed = ["UNREAD", "UNFOLLOWED"].includes(currentStatusUpper);

    // 1. Trials / FT -> TRIAL
    if (["FT", "FREE TRIAL", "TRIAL"].includes(normalizedResp) || input.status === "TRIAL") {
      updateData.status = "TRIAL";
    }
    // 2. Clients / Paid -> CLIENT
    else if (["PAID", "PAYMENT"].includes(normalizedResp) || input.status === "CLIENT") {
      updateData.status = "CLIENT";
    }
    // 3. Disposed / Do Not Trade / Not Interested -> DISPOSED
    else if (
      ["DISPOSED", "DISPOSE", "DO NOT TRADE", "DNT", "NOT INTERESTED", "NOT INTRESTED", "NI"].includes(normalizedResp) ||
      input.status === "DISPOSED"
    ) {
      updateData.status = "DISPOSED";
    }
    // 4. Followups / Call Back -> FOLLOW_UP
    else if (
      input.status === "FOLLOW_UP" ||
      ["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP", "CALL BACK", "CALLBACK", "CALL_BACK", "CB"].includes(normalizedResp)
    ) {
      updateData.status = "FOLLOW_UP";
    }
    // 5. Preserve existing CLIENT status
    else if (isExistingClient) {
      updateData.status = existingLead.status;
    }
    // 6. Otherwise (when no specific stage pill applies, e.g. NPC, Not Reachable, Switch Off, Busy, Call Disconnected, Language Issue, Interested, or general note/description update):
    // Transition status from UNREAD / UNFOLLOWED to "READ" so it moves cleanly out of Unread into Read.
    else if (normalizedResp || isUnreadOrUnfollowed) {
      if (
        input.status !== undefined &&
        !["UNFOLLOWED", "UNREAD", "READ"].includes(input.status.trim().toUpperCase())
      ) {
        updateData.status = input.status.trim();
      } else {
        updateData.status = "READ";
      }
    }
    // 7. Explicit status fallback if provided
    else if (input.status !== undefined) {
      updateData.status = input.status.trim() || existingLead.status;
    }

    updateData.updatedAt = new Date();

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

    // Determine active status header supporting aliases (e.g. UNFOLLOWED -> UNREAD)
    let activeKey = "";
    const normalizedReq = requestedStatus ? normalizeStatusFilter(requestedStatus) : undefined;
    if (normalizedReq && normalizedReq in statusCounts) {
      activeKey = normalizedReq;
    } else if (requestedStatus && requestedStatus.toUpperCase() in statusCounts) {
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

    const activeSources = await getActiveLeadSourceNames();
    const rawSource = input.leadSource?.trim() || null;
    if (!rawSource || !activeSources.includes(rawSource)) {
      return {
        success: false,
        totalProcessed: 0,
        importedCount: 0,
        skippedDuplicates: [],
        invalidRows: [],
        error: "Please select an active Lead Source from the system.",
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
              leadResponse: null,
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
        details: `Bulk imported ${finalLeadsToInsert.length} leads under source '${rawSource}'${allottedUserId ? ` (assigned to user ID: ${allottedUserId})` : ""
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
    if (!rawSource) {
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

    // Employee profile designation filter
    const rawProfile = input.profile?.trim() || "";

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
      where: { id: targetEmployeeId, isActive: true, deletedAt: null },
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
      } = {
        leadSource: rawSource,
        allotToId: null,
      };

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
      details: `Allotted ${result.allottedCount} lead(s) of source '${rawSource}'${rawProfile ? ` (Profile: ${rawProfile})` : ""} to ${targetUser.name} (${targetUser.role})${result.shortageCount > 0 ? ` [Shortage: requested ${requestedCount}, available ${result.allottedCount}]` : ""
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

/**
 * Server action to get all active lead sources for client components.
 */
export async function getActiveLeadSourcesAction(): Promise<{
  success: boolean;
  leadSources: string[];
}> {
  try {
    const sources = await getActiveLeadSourceNames();
    return { success: true, leadSources: sources };
  } catch {
    return { success: false, leadSources: [] };
  }
}


/**
 * Server action to get all active lead responses for client components.
 * Filters out "CLIENT" so leads cannot be manually converted to CLIENT via call updates.
 */
export async function getActiveLeadResponsesAction(): Promise<{
  success: boolean;
  leadResponses: string[];
}> {
  try {
    const rawResponses = await getActiveLeadResponseNames();
    const filteredResponses = rawResponses.filter(
      (r) => !["CLIENT", "CLIENTS"].includes(r.trim().toUpperCase())
    );
    return { success: true, leadResponses: filteredResponses };
  } catch {
    return { success: false, leadResponses: [] };
  }
}

/**
 * Retrieves the disposition & stage breakdown counts for Admin Lead Count Modal.
 * System-wide scope with support for all quick filters.
 */
export async function getAdminLeadCountsSummaryAction(
  filters: EmployeeLeadCountFiltersInput = {}
): Promise<LeadCountSummaryResult> {
  try {
    await requireAdminSession({ redirect: false });

    // In Admin Count modal, default to fetched/assigned leads (allotToId != null)
    // unless leadAssignment is explicitly specified as "UNALLOTED"
    const where = buildAdminLeadsWhere({
      ...filters,
      scopeToAssignedOnly: true,
    });

    const [
      totalCount,
      responseGroups,
      statusGroups,
      activeResponses,
      activeSources,
      activeProducts,
      allUsers,
      allTeams,
      distinctSourcesFromLeads,
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
      prisma.lead.findMany({
        select: { leadSource: true },
        distinct: ["leadSource"],
        where: { leadSource: { not: null } },
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

    // 2. Call response items
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

    // 3. Additional stages
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

    // Deduplicate sources case-insensitively
    const seenSources = new Set<string>();
    const deduplicatedSources: string[] = [];
    for (const s of [...activeSources, ...distinctSourcesFromLeads.map((d) => d.leadSource || "")]) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenSources.has(lower)) {
        seenSources.add(lower);
        deduplicatedSources.push(trimmed);
      }
    }

    const seenResponses = new Set<string>();
    const deduplicatedResponses: string[] = [];
    for (const r of [...activeResponses, ...allKnownResponses]) {
      const trimmed = r.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenResponses.has(lower)) {
        seenResponses.add(lower);
        deduplicatedResponses.push(trimmed);
      }
    }

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
    };
  } catch (err) {
    return {
      success: false,
      totalCount: 0,
      breakdown: [],
      sources: [],
      responses: [],
      products: [],
      error: err instanceof Error ? err.message : "Failed to load admin lead count summary.",
    };
  }
}

export type AdminBulkOperationType =
  | "TRANSFER"
  | "RECYCLE"
  | "DISPOSE"
  | "DELETE"
  | "DELETE_FOREVER"
  | "EXPORT";

export interface AdminLeadCountBulkActionInput {
  operation: AdminBulkOperationType;
  numberOfLeads?: number;
  clearPreviousTimeline?: boolean;
  targetSource?: string;
  targetUserId?: string | null;
  targetTeamId?: string | null;
  selectedStages?: string[];
  selectedResponses?: string[];
  selectedKeys?: string[];
  filters?: EmployeeLeadCountFiltersInput;
}

export interface AdminLeadCountBulkActionResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
  exportData?: Array<{
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    city: string | null;
    state: string | null;
    status: string;
    leadSource: string | null;
    leadResponse: string | null;
    createdAt: Date;
  }>;
}

/**
 * Executes Admin bulk action from the Lead Count Modal (Transfer, Recycle, Dispose, Delete, Delete Forever, Export).
 */
export async function executeAdminLeadCountBulkAction(
  input: AdminLeadCountBulkActionInput
): Promise<AdminLeadCountBulkActionResult> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const stages = [...(input.selectedStages || [])];
    const responses = [...(input.selectedResponses || [])];
    if (input.selectedKeys && input.selectedKeys.length > 0) {
      for (const k of input.selectedKeys) {
        if (k.startsWith("stage:")) {
          stages.push(k.replace("stage:", ""));
        } else if (k.startsWith("response:")) {
          responses.push(k.replace("response:", ""));
        }
      }
    }

    const where = buildAdminLeadsWhere({
      ...(input.filters || {}),
      scopeToAssignedOnly: true,
      statusIn: stages.length > 0 ? Array.from(new Set(stages)) : undefined,
      leadResponseIn: responses.length > 0 ? Array.from(new Set(responses)) : undefined,
    });

    const takeLimit = input.numberOfLeads && input.numberOfLeads > 0 ? input.numberOfLeads : undefined;

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
      },
    });

    if (targetLeads.length === 0) {
      return {
        success: false,
        count: 0,
        error: "No matching leads found for bulk execution.",
      };
    }

    const targetIds = targetLeads.map((l) => l.id);

    if (input.operation === "EXPORT") {
      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_EXPORT",
        details: `Exported ${targetLeads.length} lead(s) from lead count modal.`,
      });

      return {
        success: true,
        count: targetLeads.length,
        message: `Successfully prepared ${targetLeads.length} lead(s) for export.`,
        exportData: targetLeads,
      };
    }

    if (input.operation === "RECYCLE") {
      const targetSource = input.targetSource?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: targetIds } },
          data: {
            ...(targetSource ? { leadSource: targetSource } : {}),
            allotToId: null,
            teamId: null,
            status: "UNREAD",
            leadResponse: null,
            callbackDate: null,
            ...(input.clearPreviousTimeline ? { description: null } : {}),
            updatedAt: new Date(),
          },
        });

        if (input.clearPreviousTimeline) {
          await tx.callLog.deleteMany({
            where: { leadId: { in: targetIds } },
          });

          await tx.activityLog.createMany({
            data: targetIds.map((id) => ({
              actorId: admin.id,
              action: "TIMELINE_CLEARED",
              details: `Lead [${id}] timeline cleared by Admin during RECYCLE.`,
            })),
          });
        }
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_RECYCLE",
        details: `Bulk RECYCLE executed on ${targetIds.length} lead(s)${targetSource ? ` to source '${targetSource}'` : ""
          }${input.clearPreviousTimeline ? " [Timeline cleared]" : ""}.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully recycled ${targetIds.length} lead(s)${targetSource ? ` to source '${targetSource}'` : ""
          }.`,
      };
    }

    if (input.operation === "TRANSFER") {
      if (!input.targetUserId && !input.targetTeamId) {
        return {
          success: false,
          count: 0,
          error: "Please select at least a Target User or Target Team for Transfer.",
        };
      }

      let resolvedTeamId: string | null = input.targetTeamId || null;
      let assigneeName = "Unassigned";

      if (input.targetUserId && input.targetUserId.trim()) {
        const targetUser = await prisma.user.findUnique({
          where: { id: input.targetUserId.trim() },
          select: { id: true, name: true, teamId: true },
        });

        if (targetUser) {
          assigneeName = targetUser.name;
          resolvedTeamId = targetUser.teamId || resolvedTeamId;
        }
      } else if (input.targetTeamId && input.targetTeamId.trim()) {
        const team = await prisma.team.findUnique({
          where: { id: input.targetTeamId.trim() },
          select: { id: true, name: true },
        });
        if (team) {
          assigneeName = `Team: ${team.name}`;
        }
      }

      const targetSource = input.targetSource?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: targetIds } },
          data: {
            allotToId: input.targetUserId ? input.targetUserId.trim() : null,
            teamId: resolvedTeamId,
            ...(targetSource ? { leadSource: targetSource } : {}),
            status: "UNREAD",
            leadResponse: null,
            callbackDate: null,
            ...(input.clearPreviousTimeline ? { description: null } : {}),
            updatedAt: new Date(),
          },
        });

        if (input.clearPreviousTimeline) {
          await tx.callLog.deleteMany({
            where: { leadId: { in: targetIds } },
          });

          await tx.activityLog.createMany({
            data: targetIds.map((id) => ({
              actorId: admin.id,
              action: "TIMELINE_CLEARED",
              details: `Lead [${id}] timeline cleared by Admin during TRANSFER to ${assigneeName}.`,
            })),
          });
        }
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_TRANSFER",
        details: `Bulk TRANSFER executed on ${targetIds.length} lead(s) to ${assigneeName}${targetSource ? ` (Source: '${targetSource}')` : ""
          }${input.clearPreviousTimeline ? " [Timeline cleared]" : ""}.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully transferred ${targetIds.length} lead(s) to ${assigneeName}.`,
      };
    }

    if (input.operation === "DISPOSE") {
      await prisma.lead.updateMany({
        where: { id: { in: targetIds } },
        data: { status: "DISPOSED" },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DISPOSE",
        details: `Bulk marked ${targetIds.length} lead(s) as DISPOSED.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully disposed ${targetIds.length} lead(s).`,
      };
    }

    if (input.operation === "DELETE") {
      await prisma.lead.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: "DELETED",
          allotToId: null,
          teamId: null,
        },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DELETE",
        details: `Bulk marked ${targetIds.length} lead(s) as DELETED.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Successfully deleted ${targetIds.length} lead(s).`,
      };
    }

    if (input.operation === "DELETE_FOREVER") {
      await prisma.$transaction(async (tx) => {
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
        details: `Permanently deleted ${targetIds.length} lead(s) from database.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: targetIds.length,
        message: `Permanently deleted ${targetIds.length} lead(s).`,
      };
    }

    return {
      success: false,
      count: 0,
      error: "Unsupported bulk operation.",
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to execute bulk action.",
    };
  }
}

export type AdminSelectedLeadsBulkOperationType =
  | "ALLOT_USER_TEAM"
  | "RECYCLE"
  | "DISPOSE"
  | "DELETE"
  | "DELETE_FOREVER"
  | "EXPORT";

export interface AdminSelectedLeadsBulkActionInput {
  leadIds: string[];
  action: AdminSelectedLeadsBulkOperationType;
  targetUserId?: string | null;
  targetTeamId?: string | null;
  targetSource?: string;
  clearPreviousTimeline?: boolean;
}

export interface AdminSelectedLeadsBulkActionResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
  exportData?: Array<{
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
  }>;
}

/**
 * Executes Admin bulk action for explicitly selected lead IDs (checkboxes / Select All).
 */
export async function executeAdminSelectedLeadsBulkAction(
  input: AdminSelectedLeadsBulkActionInput
): Promise<AdminSelectedLeadsBulkActionResult> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const rawLeadIds = (input.leadIds || []).filter(Boolean);
    const leadIds = Array.from(new Set(rawLeadIds));

    if (leadIds.length === 0) {
      return {
        success: false,
        count: 0,
        error: "No leads were selected for bulk action.",
      };
    }

    if (input.action === "EXPORT") {
      const exportRows = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
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
        orderBy: { createdAt: "desc" },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_EXPORT",
        details: `Exported ${exportRows.length} selected lead(s) to CSV.`,
      });

      return {
        success: true,
        count: exportRows.length,
        message: `Successfully prepared ${exportRows.length} lead(s) for export.`,
        exportData: exportRows.map((r) => ({
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
        })),
      };
    }

    if (input.action === "ALLOT_USER_TEAM") {
      if (!input.targetUserId && !input.targetTeamId) {
        return {
          success: false,
          count: 0,
          error: "Please select at least a Target User or Target Team for Transfer.",
        };
      }

      let resolvedTeamId: string | null = input.targetTeamId || null;
      let assigneeName = "Unassigned";

      if (input.targetUserId && input.targetUserId.trim()) {
        const targetUser = await prisma.user.findUnique({
          where: { id: input.targetUserId.trim() },
          select: { id: true, name: true, teamId: true },
        });

        if (targetUser) {
          assigneeName = targetUser.name;
          resolvedTeamId = targetUser.teamId || resolvedTeamId;
        }
      } else if (input.targetTeamId && input.targetTeamId.trim()) {
        const team = await prisma.team.findUnique({
          where: { id: input.targetTeamId.trim() },
          select: { id: true, name: true },
        });
        if (team) {
          assigneeName = `Team: ${team.name}`;
        }
      }

      const targetSource = input.targetSource?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            allotToId: input.targetUserId ? input.targetUserId.trim() : null,
            teamId: resolvedTeamId,
            ...(targetSource ? { leadSource: targetSource } : {}),
            status: "UNREAD",
            leadResponse: null,
            callbackDate: null,
            ...(input.clearPreviousTimeline ? { description: null } : {}),
            updatedAt: new Date(),
          },
        });

        if (input.clearPreviousTimeline) {
          await tx.callLog.deleteMany({
            where: { leadId: { in: leadIds } },
          });

          await tx.activityLog.createMany({
            data: leadIds.map((id) => ({
              actorId: admin.id,
              action: "TIMELINE_CLEARED",
              details: `Lead [${id}] timeline cleared by Admin during ALLOT_USER_TEAM to ${assigneeName}.`,
            })),
          });
        }
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_ALLOT",
        details: `Bulk allotted/transferred ${leadIds.length} lead(s) to ${assigneeName}${targetSource ? ` (Source: '${targetSource}')` : ""
          }${input.clearPreviousTimeline ? " [Timeline cleared]" : ""}.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: leadIds.length,
        message: `Successfully allotted/transferred ${leadIds.length} lead(s) to ${assigneeName}.`,
      };
    }

    if (input.action === "RECYCLE") {
      const targetSource = input.targetSource?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            ...(targetSource ? { leadSource: targetSource } : {}),
            allotToId: null,
            teamId: null,
            status: "UNREAD",
            leadResponse: null,
            callbackDate: null,
            ...(input.clearPreviousTimeline ? { description: null } : {}),
            updatedAt: new Date(),
          },
        });

        if (input.clearPreviousTimeline) {
          await tx.callLog.deleteMany({
            where: { leadId: { in: leadIds } },
          });

          await tx.activityLog.createMany({
            data: leadIds.map((id) => ({
              actorId: admin.id,
              action: "TIMELINE_CLEARED",
              details: `Lead [${id}] timeline cleared by Admin during RECYCLE.`,
            })),
          });
        }
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_RECYCLE",
        details: `Bulk recycled ${leadIds.length} lead(s)${targetSource ? ` to source '${targetSource}'` : ""}${input.clearPreviousTimeline ? " [Timeline cleared]" : ""
          }.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: leadIds.length,
        message: `Successfully recycled ${leadIds.length} lead(s)${targetSource ? ` to '${targetSource}'` : ""}.`,
      };
    }

    if (input.action === "DISPOSE") {
      await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: {
          status: "DISPOSED",
          updatedAt: new Date(),
        },
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DISPOSE",
        details: `Bulk marked ${leadIds.length} lead(s) as DISPOSED.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: leadIds.length,
        message: `Successfully disposed ${leadIds.length} lead(s).`,
      };
    }

    if (input.action === "DELETE") {
      await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
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
        details: `Bulk marked ${leadIds.length} lead(s) as DELETED.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: leadIds.length,
        message: `Successfully moved ${leadIds.length} lead(s) to Deleted.`,
      };
    }

    if (input.action === "DELETE_FOREVER") {
      await prisma.$transaction(async (tx) => {
        await tx.callLog.deleteMany({
          where: { leadId: { in: leadIds } },
        });
        await tx.lead.deleteMany({
          where: { id: { in: leadIds } },
        });
      });

      await logActivity({
        actorId: admin.id,
        action: "LEAD_BULK_DELETE_FOREVER",
        details: `Permanently deleted ${leadIds.length} lead(s) from database.`,
      });

      revalidatePath("/admin/leads");
      revalidatePath("/admin");

      return {
        success: true,
        count: leadIds.length,
        message: `Permanently deleted ${leadIds.length} lead(s).`,
      };
    }

    return {
      success: false,
      count: 0,
      error: "Unsupported bulk operation.",
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to execute bulk action.",
    };
  }
}

export interface AdminFetchSourceItem {
  source: string;
  availableLeadsCount: number;
  remainingLimit: number;
  totalLimit: number;
  formattedRemaining: string;
  poolAvailableCount: number;
  status: "CAN_FETCH" | "NO_LEADS";
  batchSize: number;
}

export interface AdminFetchSourceLeadsInput {
  sourceName: string;
  count?: number;
  targetUserId?: string;
}

/**
 * Loads active lead sources and unassigned pool availability for Admin Fetch.
 */
export async function getAdminFetchSourcesAction(): Promise<{
  success: boolean;
  sources?: AdminFetchSourceItem[];
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    // 1. Fetch active sources from database & distinct sources from leads
    const [activeSources, distinctSourcesFromLeads] = await Promise.all([
      getActiveLeadSourceNames(),
      prisma.lead.findMany({
        where: { leadSource: { not: null } },
        select: { leadSource: true },
        distinct: ["leadSource"],
      }),
    ]);

    // 2. Case-insensitively deduplicate sources
    const seenSources = new Set<string>();
    const deduplicatedSources: string[] = [];
    for (const s of [
      ...activeSources,
      ...distinctSourcesFromLeads.map((d) => d.leadSource || ""),
    ]) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenSources.has(lower)) {
        seenSources.add(lower);
        deduplicatedSources.push(trimmed);
      }
    }

    // 3. Count pool leads (unalloted) and admin's own unread/unfollowed leads per source
    const [poolGrouped, adminGrouped] = await Promise.all([
      prisma.lead.groupBy({
        by: ["leadSource"],
        where: {
          allotToId: null,
          teamId: null,
          leadSource: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["leadSource"],
        where: {
          allotToId: admin.id,
          status: { in: ["UNREAD", "UNFOLLOWED"] },
          leadSource: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

    // Build lookup maps (case-insensitive)
    const poolCountMap = new Map<string, number>();
    for (const item of poolGrouped) {
      if (item.leadSource) {
        const key = item.leadSource.trim().toLowerCase();
        poolCountMap.set(key, (poolCountMap.get(key) || 0) + item._count._all);
      }
    }

    const adminCountMap = new Map<string, number>();
    for (const item of adminGrouped) {
      if (item.leadSource) {
        const key = item.leadSource.trim().toLowerCase();
        adminCountMap.set(key, (adminCountMap.get(key) || 0) + item._count._all);
      }
    }

    const sources: AdminFetchSourceItem[] = deduplicatedSources.map((sourceName) => {
      const lower = sourceName.toLowerCase();
      const poolCount = poolCountMap.get(lower) || 0;
      const availableCount = adminCountMap.get(lower) || 0;
      const canFetch = poolCount > 0;

      return {
        source: sourceName,
        availableLeadsCount: availableCount,
        remainingLimit: poolCount,
        totalLimit: poolCount,
        formattedRemaining: "Unlimited",
        poolAvailableCount: poolCount,
        status: canFetch ? "CAN_FETCH" : "NO_LEADS",
        batchSize: 10,
      };
    });

    // Sort: sources with available pool leads first, then alphabetically
    sources.sort((a, b) => {
      if (a.poolAvailableCount > 0 && b.poolAvailableCount === 0) return -1;
      if (a.poolAvailableCount === 0 && b.poolAvailableCount > 0) return 1;
      return a.source.localeCompare(b.source);
    });

    return {
      success: true,
      sources,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load admin fetch sources.");
  }
}

/**
 * Atomically claims unassigned pool leads for Admin from a specified source.
 */
export async function adminFetchSourceLeadsAction(
  input: AdminFetchSourceLeadsInput
): Promise<{
  success: boolean;
  allocatedCount?: number;
  source?: string;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });
    const requestedSource = input.sourceName?.trim();
    if (!requestedSource) {
      return { success: false, error: "Please specify a lead source to fetch." };
    }

    const batchSize = Math.max(1, Math.min(Number(input.count) || 10, 500));
    const targetAssigneeId = input.targetUserId?.trim() || admin.id;

    // 1. Fetch oldest unassigned pool candidates
    const candidates = await prisma.lead.findMany({
      where: {
        leadSource: { equals: requestedSource, mode: "insensitive" },
        allotToId: null,
        teamId: null,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: batchSize,
      select: { id: true },
    });

    if (candidates.length === 0) {
      return {
        success: false,
        error: `No unassigned leads available in the pool for "${requestedSource}".`,
      };
    }

    const candidateIds = candidates.map((c) => c.id);

    // 2. Perform atomic assignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.lead.updateMany({
        where: {
          id: { in: candidateIds },
          allotToId: null,
          teamId: null,
        },
        data: {
          allotToId: targetAssigneeId,
          teamId: null,
          status: "UNREAD",
          leadResponse: null,
          callbackDate: null,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count > 0) {
        // Record LeadFetchLog
        await tx.leadFetchLog.create({
          data: {
            userId: targetAssigneeId,
            leadSource: requestedSource,
            appliedProfile: "Admin",
            leadsCount: updateResult.count,
            requestNumber: 1,
            leadIds: candidateIds.slice(0, updateResult.count),
          },
        });
      }

      return { allocatedCount: updateResult.count };
    });

    if (!result || result.allocatedCount === 0) {
      return {
        success: false,
        error: `Could not allocate leads from "${requestedSource}". They may have already been claimed.`,
      };
    }

    // 3. Log audit activity
    await logActivity({
      actorId: admin.id,
      action: "LEAD_FETCH",
      details: `Admin fetched ${result.allocatedCount} lead(s) from source "${requestedSource}".`,
      targetUserId: targetAssigneeId,
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    return {
      success: true,
      allocatedCount: result.allocatedCount,
      source: requestedSource,
    };
  } catch (err) {
    return handleActionError(err, "Failed to fetch leads.");
  }
}

export interface AdminLeadTimelineItem {
  id: string;
  title: string;
  details: string;
  timestamp: string;
  badge?: string;
  variant?: "primary" | "info" | "success" | "warning" | "danger";
  actorName?: string;
}

/**
 * Retrieves the activity timeline for a lead in Admin view.
 * If a "TIMELINE_CLEARED" marker exists, all events dated before that reset
 * (including original "Lead Registered" and prior allotments/updates) are omitted,
 * rendering only a fresh reset milestone and events occurring at or after the reset.
 */
export async function getAdminLeadTimelineAction(leadId: string): Promise<{
  success: boolean;
  lead?: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    leadSource: string | null;
    status: string;
    leadResponse: string | null;
    callbackDate: string | null;
    description: string | null;
    allotToName: string | null;
    allotToRole: string | null;
    teamName: string | null;
    createdAt: string;
    updatedAt: string;
  };
  timeline?: AdminLeadTimelineItem[];
  timelineClearedAt?: string | null;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        allotTo: { select: { id: true, name: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      return { success: false, error: "Lead not found." };
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
    });

    const resetLog = logs.find((l) => l.action === "TIMELINE_CLEARED");
    const resetAt = resetLog ? resetLog.createdAt : null;

    const timeline: AdminLeadTimelineItem[] = [];

    if (resetLog && resetAt) {
      const resetAtTime = resetAt.getTime();

      // 1. Anchor the reset event as the base milestone
      timeline.push({
        id: `reset-${resetLog.id}`,
        title: "Timeline Reset & Re-entry",
        details:
          resetLog.details ||
          "Previous timeline, call logs, and remarks were cleared by Admin during Recycle / Transfer.",
        timestamp: resetAt.toISOString(),
        badge: "RESET",
        variant: "warning",
        actorName: resetLog.actor?.name || "Admin",
      });

      // 2. Add current state only if lead was allotted or updated AT or AFTER resetAt
      const leadUpdatedTime = new Date(lead.updatedAt).getTime();
      if (leadUpdatedTime >= resetAtTime) {
        if (lead.allotTo) {
          timeline.push({
            id: "allotment-post-reset",
            title: "Team Allotment",
            details: `Assigned to ${lead.allotTo.name} (${lead.allotTo.role})${
              lead.team ? ` • ${lead.team.name}` : ""
            }.`,
            timestamp: lead.updatedAt.toISOString(),
            badge: "ASSIGNED",
            variant: "info",
            actorName: "Admin",
          });
        } else {
          timeline.push({
            id: "pool-post-reset",
            title: "Recycled to Source Pool",
            details: `Available in source pool "${lead.leadSource || "DIRECT"}".`,
            timestamp: lead.updatedAt.toISOString(),
            badge: "POOL",
            variant: "info",
            actorName: "Admin",
          });
        }

        if (lead.leadResponse && leadUpdatedTime > resetAtTime) {
          timeline.push({
            id: "status-post-reset",
            title: `Current Status: ${lead.status}`,
            details: `Response tag "${lead.leadResponse}" recorded.${
              lead.callbackDate
                ? ` Next callback: ${new Date(lead.callbackDate).toLocaleString("en-GB")}.`
                : ""
            }${lead.description ? ` Note: ${lead.description}` : ""}`,
            timestamp: lead.updatedAt.toISOString(),
            badge: "RESPONSE",
            variant: "success",
          });
        }
      }

      // 3. Include ONLY activity logs recorded AT or AFTER resetAt (excluding historical pre-reset logs)
      for (const log of logs) {
        if (log.id !== resetLog.id && new Date(log.createdAt).getTime() >= resetAtTime) {
          timeline.push({
            id: log.id,
            title: log.action,
            details: log.details || "",
            timestamp: log.createdAt.toISOString(),
            badge: "ACTIVITY",
            variant: "primary",
            actorName: log.actor?.name,
          });
        }
      }
    } else {
      // Standard full lifecycle timeline
      timeline.push({
        id: "registered",
        title: "Lead Registered",
        details: `Prospect created in CRM via source "${lead.leadSource || "DIRECT"}".`,
        timestamp: lead.createdAt.toISOString(),
        badge: "CREATED",
        variant: "primary",
      });

      if (lead.allotTo) {
        timeline.push({
          id: "allotment",
          title: "Team Allotment",
          details: `Assigned to ${lead.allotTo.name} (${lead.allotTo.role}) ${lead.team ? `• ${lead.team.name}` : ""
            }.`,
          timestamp: lead.updatedAt.toISOString(),
          badge: "ASSIGNED",
          variant: "info",
          actorName: "Admin",
        });
      }

      if (lead.leadResponse || lead.status !== "UNREAD") {
        timeline.push({
          id: "disposition",
          title: `Current Status: ${lead.status}`,
          details: `Response tag "${lead.leadResponse || "Interested"}" recorded.${lead.callbackDate
            ? ` Next callback: ${new Date(lead.callbackDate).toLocaleString("en-GB")}.`
            : ""
            }${lead.description ? ` Note: ${lead.description}` : ""}`,
          timestamp: lead.updatedAt.toISOString(),
          badge: "RESPONSE",
          variant: "success",
        });
      }

      for (const log of logs) {
        timeline.push({
          id: log.id,
          title: log.action,
          details: log.details || "",
          timestamp: log.createdAt.toISOString(),
          badge: "ACTIVITY",
          variant: "primary",
          actorName: log.actor?.name,
        });
      }
    }

    timeline.sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (diff !== 0) return diff;
      if (a.badge === "RESET") return 1;
      if (b.badge === "RESET") return -1;
      return 0;
    });

    return {
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        mobile: lead.mobile,
        email: lead.email,
        leadSource: lead.leadSource,
        status: lead.status,
        leadResponse: lead.leadResponse,
        callbackDate: lead.callbackDate ? lead.callbackDate.toISOString() : null,
        description: lead.description,
        allotToName: lead.allotTo?.name || null,
        allotToRole: lead.allotTo?.role || null,
        teamName: lead.team?.name || null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
      timeline,
      timelineClearedAt: resetAt ? resetAt.toISOString() : null,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load lead timeline.");
  }
}
