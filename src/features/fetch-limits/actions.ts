"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { LEAD_SOURCE_OPTIONS } from "@/src/lib/utils";
import { revalidatePath } from "next/cache";
import { getProfilePriorityRank } from "./constants";
import type {
  FetchLimitRuleItem,
  FetchLimitFormData,
  CreateFetchLimitInput,
  UpdateFetchLimitInput,
  ProfileRef,
  EmployeeRef,
  EmployeeUsageSummary,
} from "./types";

/**
 * Loads all Fetch Limit configurations for the Admin table.
 */
export async function getFetchLimitRulesAction(): Promise<{
  success: boolean;
  rules?: FetchLimitRuleItem[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const rawRules = await prisma.fetchLimitRule.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        profiles: {
          select: {
            id: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
        },
        assignedUsers: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            employeeProfileId: true,
            employeeProfile: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        },
        usages: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rules: FetchLimitRuleItem[] = rawRules.map((r) => {
      const profiles: ProfileRef[] = r.profiles.map((p) => ({
        id: p.id,
        name: p.name,
        departmentId: p.department?.id,
        departmentName: p.department?.name,
      }));

      const assignedUsers: EmployeeRef[] = r.assignedUsers.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        employeeProfileId: u.employeeProfileId,
        employeeProfileName: u.employeeProfile?.name || null,
      }));

      const usages: EmployeeUsageSummary[] = r.usages.map((u) => ({
        userId: u.userId,
        userName: u.user?.name || "Unknown User",
        successfulFetches: u.successfulFetches,
        lastFetchedAt: u.lastFetchedAt ? u.lastFetchedAt.toISOString() : null,
        resetAt: u.resetAt ? u.resetAt.toISOString() : null,
      }));

      const totalFetchesUsed = usages.reduce((acc, curr) => acc + curr.successfulFetches, 0);

      return {
        id: r.id,
        availableLimit: r.availableLimit,
        fetchLimit: r.fetchLimit,
        fetchCount: r.fetchCount,
        leadSource: r.leadSource,
        createdById: r.createdById,
        createdByName: r.createdBy?.name || "System Admin",
        createdByEmail: r.createdBy?.email || "",
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        profiles,
        assignedUsers,
        usages,
        totalFetchesUsed,
      };
    });

    return { success: true, rules };
  } catch (err) {
    return handleActionError(err, "Failed to load fetch limit rules.");
  }
}

/**
 * Loads dynamic metadata required for creating and editing Fetch Limit rules:
 * Active Profiles, Active Non-Deleted Employees, and Canonical Lead Sources.
 */
export async function getFetchLimitFormDataAction(): Promise<{
  success: boolean;
  data?: FetchLimitFormData;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const [rawProfiles, rawEmployees] = await Promise.all([
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          employeeProfileId: true,
          employeeProfile: { select: { id: true, name: true } },
        },
        orderBy: [{ employeeProfile: { name: "asc" } }, { name: "asc" }],
      }),
    ]);

    const profiles: ProfileRef[] = rawProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      departmentId: p.department?.id,
      departmentName: p.department?.name,
    }));

    const employees: EmployeeRef[] = rawEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      username: e.username,
      email: e.email,
      employeeProfileId: e.employeeProfileId,
      employeeProfileName: e.employeeProfile?.name || null,
    }));

    return {
      success: true,
      data: {
        profiles,
        employees,
        leadSources: LEAD_SOURCE_OPTIONS,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load fetch limit form data.");
  }
}

/**
 * Creates a new Fetch Limit configuration.
 */
export async function createFetchLimitRuleAction(
  input: CreateFetchLimitInput
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    // 1. Validate Lead Source
    const leadSource = input.leadSource?.trim();
    if (!leadSource || !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(leadSource)) {
      return { success: false, error: "Please select a valid canonical Lead Source." };
    }

    // 2. Validate numeric thresholds
    const availableLimit = Math.floor(input.availableLimit);
    if (isNaN(availableLimit) || availableLimit < 0) {
      return { success: false, error: "Available Limit must be 0 or a positive integer." };
    }

    const fetchLimit = Math.floor(input.fetchLimit);
    if (isNaN(fetchLimit) || fetchLimit <= 0) {
      return { success: false, error: "Fetch Limit must be greater than 0." };
    }

    const fetchCount = Math.floor(input.fetchCount);
    if (isNaN(fetchCount) || fetchCount <= 0) {
      return { success: false, error: "Fetch Count (maximum requests) must be greater than 0." };
    }

    // 3. Validate profile IDs
    const profileIds = Array.isArray(input.profileIds)
      ? Array.from(new Set(input.profileIds.filter(Boolean)))
      : [];
    if (profileIds.length === 0) {
      return { success: false, error: "Please select at least one Employee Profile." };
    }

    const existingProfiles = await prisma.employeeProfile.findMany({
      where: { id: { in: profileIds }, isActive: true },
      select: { id: true, name: true },
    });
    if (existingProfiles.length === 0) {
      return { success: false, error: "None of the selected Employee Profiles are valid or active." };
    }
    const validProfileIds = existingProfiles.map((p) => p.id);

    // 4. Validate assigned employee IDs if provided
    let validUserIds: string[] = [];
    if (Array.isArray(input.assignedUserIds) && input.assignedUserIds.length > 0) {
      const uniqueUserIds = Array.from(new Set(input.assignedUserIds.filter(Boolean)));
      const existingUsers = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      validUserIds = existingUsers.map((u) => u.id);
    }

    // 5. Create rule in transaction
    const created = await prisma.fetchLimitRule.create({
      data: {
        availableLimit,
        fetchLimit,
        fetchCount,
        leadSource,
        createdById: admin.id,
        profiles: {
          connect: validProfileIds.map((id) => ({ id })),
        },
        assignedUsers: {
          connect: validUserIds.map((id) => ({ id })),
        },
      },
      include: {
        profiles: { select: { name: true } },
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "FETCH_LIMIT_RULE_CREATED",
      details: `Admin ${admin.name} created Fetch Limit Rule for source '${leadSource}' (Available: ${availableLimit}, Fetch Limit: ${fetchLimit}, Max Requests: ${fetchCount}) for profiles: ${created.profiles.map((p) => p.name).join(", ")}.`,
    });

    revalidatePath("/admin/fetch-limits");
    return { success: true, ruleId: created.id };
  } catch (err) {
    return handleActionError(err, "Failed to create fetch limit configuration.");
  }
}

/**
 * Updates an existing Fetch Limit configuration.
 */
export async function updateFetchLimitRuleAction(
  input: UpdateFetchLimitInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const ruleId = input.ruleId?.trim();
    if (!ruleId) {
      return { success: false, error: "Rule ID is required." };
    }

    const existingRule = await prisma.fetchLimitRule.findUnique({
      where: { id: ruleId },
      include: { profiles: true, assignedUsers: true },
    });
    if (!existingRule) {
      return { success: false, error: "Fetch limit configuration not found." };
    }

    // 1. Validate Lead Source
    const leadSource = input.leadSource?.trim();
    if (!leadSource || !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(leadSource)) {
      return { success: false, error: "Please select a valid canonical Lead Source." };
    }

    // 2. Validate numeric thresholds
    const availableLimit = Math.floor(input.availableLimit);
    if (isNaN(availableLimit) || availableLimit < 0) {
      return { success: false, error: "Available Limit must be 0 or a positive integer." };
    }

    const fetchLimit = Math.floor(input.fetchLimit);
    if (isNaN(fetchLimit) || fetchLimit <= 0) {
      return { success: false, error: "Fetch Limit must be greater than 0." };
    }

    const fetchCount = Math.floor(input.fetchCount);
    if (isNaN(fetchCount) || fetchCount <= 0) {
      return { success: false, error: "Fetch Count (maximum requests) must be greater than 0." };
    }

    // 3. Validate profile IDs
    const profileIds = Array.isArray(input.profileIds)
      ? Array.from(new Set(input.profileIds.filter(Boolean)))
      : [];
    if (profileIds.length === 0) {
      return { success: false, error: "Please select at least one Employee Profile." };
    }

    const existingProfiles = await prisma.employeeProfile.findMany({
      where: { id: { in: profileIds }, isActive: true },
      select: { id: true, name: true },
    });
    if (existingProfiles.length === 0) {
      return { success: false, error: "None of the selected Employee Profiles are valid or active." };
    }
    const validProfileIds = existingProfiles.map((p) => p.id);

    // 4. Validate assigned employee IDs
    let validUserIds: string[] = [];
    if (Array.isArray(input.assignedUserIds) && input.assignedUserIds.length > 0) {
      const uniqueUserIds = Array.from(new Set(input.assignedUserIds.filter(Boolean)));
      const existingUsers = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      validUserIds = existingUsers.map((u) => u.id);
    }

    // 5. Update rule atomically in transaction
    await prisma.$transaction(async (tx) => {
      await tx.fetchLimitRule.update({
        where: { id: ruleId },
        data: {
          availableLimit,
          fetchLimit,
          fetchCount,
          leadSource,
          profiles: {
            set: validProfileIds.map((id) => ({ id })),
          },
          assignedUsers: {
            set: validUserIds.map((id) => ({ id })),
          },
        },
      });

      // Optional explicit reset of usage for specified users
      if (Array.isArray(input.resetUsageForUserIds) && input.resetUsageForUserIds.length > 0) {
        await tx.employeeFetchUsage.updateMany({
          where: {
            ruleId,
            userId: { in: input.resetUsageForUserIds },
          },
          data: {
            successfulFetches: 0,
            resetAt: new Date(),
            resetById: admin.id,
          },
        });
      }
    });

    await logActivity({
      actorId: admin.id,
      action: "FETCH_LIMIT_RULE_UPDATED",
      details: `Admin ${admin.name} updated Fetch Limit Rule #${ruleId.slice(-6)} (Available: ${availableLimit}, Fetch Limit: ${fetchLimit}, Max Requests: ${fetchCount}) for source '${leadSource}'.`,
    });

    revalidatePath("/admin/fetch-limits");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update fetch limit configuration.");
  }
}

/**
 * Resets fetch request usage counter for an individual employee or all employees under a rule.
 * Preserves historical LeadFetchLogs and audit records.
 */
export async function resetFetchCountUsageAction(
  ruleId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!ruleId || !ruleId.trim()) {
      return { success: false, error: "Rule ID is required." };
    }

    const whereClause: { ruleId: string; userId?: string } = { ruleId: ruleId.trim() };
    if (userId && userId.trim()) {
      whereClause.userId = userId.trim();
    }

    const updated = await prisma.employeeFetchUsage.updateMany({
      where: whereClause,
      data: {
        successfulFetches: 0,
        resetAt: new Date(),
        resetById: admin.id,
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "FETCH_LIMIT_USAGE_RESET",
      details: `Admin ${admin.name} reset fetch request usage for ${userId ? `user ${userId}` : "all users"} under Rule #${ruleId.slice(-6)} (${updated.count} record(s) reset). Historical fetch logs preserved.`,
    });

    revalidatePath("/admin/fetch-limits");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to reset fetch limit usage counter.");
  }
}

/**
 * Deletes a Fetch Limit configuration.
 */
export async function deleteFetchLimitRuleAction(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!ruleId || !ruleId.trim()) {
      return { success: false, error: "Rule ID is required." };
    }

    const target = await prisma.fetchLimitRule.findUnique({
      where: { id: ruleId.trim() },
      select: { id: true, leadSource: true },
    });

    if (!target) {
      return { success: false, error: "Fetch limit configuration not found." };
    }

    await prisma.fetchLimitRule.delete({
      where: { id: target.id },
    });

    await logActivity({
      actorId: admin.id,
      action: "FETCH_LIMIT_RULE_DELETED",
      details: `Admin ${admin.name} deleted Fetch Limit Rule #${target.id.slice(-6)} for lead source '${target.leadSource}'.`,
    });

    revalidatePath("/admin/fetch-limits");
    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to delete fetch limit configuration.");
  }
}

export interface EmployeeSelfFetchInput {
  leadSource: string;
  requestedCount?: number;
}

export interface EmployeeSelfFetchResult {
  success: boolean;
  allocatedCount: number;
  requestNumber?: number;
  leadSource: string;
  appliedProfileName?: string;
  leads?: {
    id: string;
    name: string;
    mobile: string;
    city: string | null;
    status: string;
    createdAt: string;
  }[];
  error?: string;
}

/**
 * Core Employee Self-Fetch Action:
 * Enforces all 10 security, permission, and Fetch Limit rules:
 * 1. Active authenticated session.
 * 2. Active, non-deleted employee account.
 * 3. Employee holds Lead Fetch Permission for the requested source.
 * 4. Resolves applicable Fetch Limit rule using strict Multiple Employee Profile Priority (FM > AFM > ARM > STL > TL > SBA > BA > BAT > SUPPORT).
 * 5. Verifies employee's remaining active leads <= Available Limit.
 * 6. Caps request to configured Fetch Limit.
 * 7. Checks that configured maximum Fetch Count is not exhausted.
 * 8. Concurrency-safe atomic transaction to claim unassigned leads oldest-first.
 * 9. Records LeadFetchLog audit event with sequence number.
 * 10. Logs activity and preserves historical records.
 */
export async function employeeSelfFetchLeadsAction(
  input: EmployeeSelfFetchInput
): Promise<EmployeeSelfFetchResult> {
  try {
    // 1. Session check
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: input.leadSource || "",
        error: "Unauthorized: Active session required to fetch leads.",
      };
    }

    // 2. Fetch employee profile and permissions
    const employee = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        deletedAt: true,
        teamId: true,
        employeeProfileId: true,
        employeeProfile: {
          select: { id: true, name: true },
        },
        leadFetchSources: true,
      },
    });

    if (!employee || !employee.isActive || employee.deletedAt) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: input.leadSource || "",
        error: "Forbidden: Your employee account is inactive or has been archived.",
      };
    }

    const requestedSource = input.leadSource?.trim();
    if (!requestedSource || !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(requestedSource)) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource || "",
        error: "Please specify a valid Lead Source.",
      };
    }

    // 3. Check Lead Fetch Permission (Admins bypass; standard employees require explicit grant)
    const isPermitted =
      employee.role === "ADMIN" ||
      (Array.isArray(employee.leadFetchSources) && employee.leadFetchSources.includes(requestedSource));

    if (!isPermitted) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource,
        error: `Permission Denied: You do not have permission to fetch leads from "${requestedSource}". Please contact your Administrator.`,
      };
    }

    // 4. Find all applicable Fetch Limit rules for this leadSource
    const matchingRules = await prisma.fetchLimitRule.findMany({
      where: {
        leadSource: requestedSource,
        OR: [
          // Explicit employee assignment
          { assignedUsers: { some: { id: employee.id } } },
          // Profile assignment
          ...(employee.employeeProfileId
            ? [{ profiles: { some: { id: employee.employeeProfileId } } }]
            : []),
        ],
      },
      include: {
        profiles: { select: { id: true, name: true } },
        assignedUsers: { select: { id: true } },
      },
    });

    if (matchingRules.length === 0) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource,
        error: `No fetch limit rule is configured for "${requestedSource}" matching your profile. Please contact your Administrator.`,
      };
    }

    // 5. Apply Priority Ordering to find the winning rule:
    // a) Specific employee assignment rules rank higher than general profile rules.
    // b) For profile-based rules, determine priority using the requesting employee's actual assigned Employee Profile name.
    // c) If two applicable rules have the same priority, use createdAt ASC as a deterministic tie-breaker.
    const employeeProfileName = employee.employeeProfile?.name || "";
    const employeeProfileRank = getProfilePriorityRank(employeeProfileName);

    const sortedRules = [...matchingRules].sort((a, b) => {
      const aIsDirect = a.assignedUsers.some((u) => u.id === employee.id);
      const bIsDirect = b.assignedUsers.some((u) => u.id === employee.id);

      if (aIsDirect && !bIsDirect) return -1;
      if (!aIsDirect && bIsDirect) return 1;

      // Both are direct assignments, or both are profile assignments:
      const aRank = aIsDirect ? -1 : employeeProfileRank;
      const bRank = bIsDirect ? -1 : employeeProfileRank;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      // Deterministic tie-breaker: createdAt ASC (earliest created rule wins)
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    const winningRule = sortedRules[0];

    // 6. Check Fetch Count maximum request limit
    const existingUsage = await prisma.employeeFetchUsage.findUnique({
      where: {
        userId_ruleId: { userId: employee.id, ruleId: winningRule.id },
      },
    });

    const successfulFetchesUsed = existingUsage?.successfulFetches || 0;
    if (successfulFetchesUsed >= winningRule.fetchCount) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource,
        error: `Fetch quota reached: You have completed all ${winningRule.fetchCount} allowed fetch requests for "${requestedSource}". Please contact your Administrator to adjust or reset your limit.`,
      };
    }

    // 7. Check Available Limit (remaining leads threshold)
    // Counts active/unclosed leads currently assigned to this employee of this source.
    const activeLeadsCount = await prisma.lead.count({
      where: {
        allotToId: employee.id,
        leadSource: requestedSource,
        status: { notIn: ["DISPOSED", "DELETED"] },
      },
    });

    if (activeLeadsCount > winningRule.availableLimit) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource,
        error: `Available Limit threshold not reached: You currently have ${activeLeadsCount} active lead(s) for "${requestedSource}". You can only fetch new leads when your active pool reaches ${winningRule.availableLimit} or fewer.`,
      };
    }

    // 8. Determine count to fetch (capped by configured Fetch Limit)
    const requested = input.requestedCount ? Math.floor(input.requestedCount) : winningRule.fetchLimit;
    const fetchCap = Math.max(1, Math.min(requested, winningRule.fetchLimit));

    // 9. Atomic Transaction: allocate leads oldest first with concurrency protection
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Step A: In-Transaction Concurrency Lock & Quota Verification
      // Acquire an exclusive row-level write lock on the employee's usage record.
      // In PostgreSQL, updating a row acquires an exclusive row lock, serializing concurrent requests for this employee & rule.
      const lockedUsage = await tx.employeeFetchUsage.upsert({
        where: {
          userId_ruleId: { userId: employee.id, ruleId: winningRule.id },
        },
        create: {
          userId: employee.id,
          ruleId: winningRule.id,
          leadSource: requestedSource,
          successfulFetches: 0,
        },
        update: {
          updatedAt: new Date(), // Exclusive row lock
        },
      });

      if (lockedUsage.successfulFetches >= winningRule.fetchCount) {
        throw new Error(
          `QUOTA_EXHAUSTED: You have completed all ${winningRule.fetchCount} allowed fetch requests for "${requestedSource}". Please contact your Administrator.`
        );
      }

      // Step B: Find eligible unassigned leads
      const candidateLeads = await tx.lead.findMany({
        where: {
          leadSource: requestedSource,
          allotToId: null,
        },
        orderBy: { createdAt: "asc" },
        take: fetchCap,
        select: { id: true },
      });

      if (candidateLeads.length === 0) {
        return { allocatedLeads: [], count: 0, nextRequestNumber: lockedUsage.successfulFetches };
      }

      const candidateIds = candidateLeads.map((l) => l.id);

      // Concurrency lock on leads: update only if still unassigned
      const updateResult = await tx.lead.updateMany({
        where: {
          id: { in: candidateIds },
          allotToId: null,
        },
        data: {
          allotToId: employee.id,
          teamId: employee.teamId,
        },
      });

      if (updateResult.count === 0) {
        return { allocatedLeads: [], count: 0, nextRequestNumber: lockedUsage.successfulFetches };
      }

      // Fetch the actual allocated leads
      const allocatedLeads = await tx.lead.findMany({
        where: {
          id: { in: candidateIds },
          allotToId: employee.id,
        },
        select: {
          id: true,
          name: true,
          mobile: true,
          city: true,
          status: true,
          createdAt: true,
        },
      });

      // Increment employee's request usage counter (only because leads were successfully claimed!)
      const updatedUsage = await tx.employeeFetchUsage.update({
        where: {
          userId_ruleId: { userId: employee.id, ruleId: winningRule.id },
        },
        data: {
          successfulFetches: { increment: 1 },
          lastFetchedAt: new Date(),
        },
      });

      // Record immutable audit log
      await tx.leadFetchLog.create({
        data: {
          userId: employee.id,
          ruleId: winningRule.id,
          leadSource: requestedSource,
          appliedProfile: employee.employeeProfile?.name || null,
          leadsCount: allocatedLeads.length,
          requestNumber: updatedUsage.successfulFetches,
          leadIds: allocatedLeads.map((l) => l.id),
        },
      });

      return {
        allocatedLeads,
        count: allocatedLeads.length,
        nextRequestNumber: updatedUsage.successfulFetches,
      };
    });

    if (transactionResult.count === 0) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: requestedSource,
        error: `No unassigned leads currently available for "${requestedSource}". Please check back later or contact your Administrator.`,
      };
    }

    // 10. Activity log
    await logActivity({
      actorId: employee.id,
      action: "LEAD_SELF_FETCH",
      details: `Employee ${employee.name} (@${employee.username || employee.id}) fetched ${transactionResult.count} lead(s) of source '${requestedSource}' [Request #${transactionResult.nextRequestNumber}/${winningRule.fetchCount}, Rule #${winningRule.id.slice(-6)}].`,
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/allot");
    revalidatePath("/admin/fetch-limits");

    return {
      success: true,
      allocatedCount: transactionResult.count,
      requestNumber: transactionResult.nextRequestNumber,
      leadSource: requestedSource,
      appliedProfileName: employee.employeeProfile?.name || undefined,
      leads: transactionResult.allocatedLeads.map((l) => ({
        id: l.id,
        name: l.name,
        mobile: l.mobile,
        city: l.city,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "";
    if (errorMsg.startsWith("QUOTA_EXHAUSTED:")) {
      return {
        success: false,
        allocatedCount: 0,
        leadSource: input.leadSource || "",
        error: errorMsg.replace("QUOTA_EXHAUSTED: ", ""),
      };
    }
    const res = handleActionError(err, "Failed to self-fetch leads.");
    return {
      success: false,
      allocatedCount: 0,
      leadSource: input.leadSource || "",
      error: res.error,
    };
  }
}

