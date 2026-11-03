"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import type {
  LeadSourceItem,
  CreateLeadSourceInput,
  UpdateLeadSourceInput,
} from "./types";

/**
 * Fetch all Lead Sources for Admin Management (both active and inactive).
 * Strictly restricted to Admin users.
 */
export async function getLeadSourcesAction(): Promise<{
  success: boolean;
  leadSources?: LeadSourceItem[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const raw = await prisma.leadSource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    const leadSources: LeadSourceItem[] = raw.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      createdById: s.createdById,
      createdByName: s.createdBy?.name || "Admin",
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return { success: true, leadSources };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load lead sources.";
    return { success: false, error: message };
  }
}

/**
 * Create a new Lead Source.
 * Strictly requires Admin session.
 * Enforces case-insensitive duplicate name prevention.
 * If an inactive record with the same name exists, suggests reactivation or reactivates it cleanly.
 */
export async function createLeadSourceAction(input: CreateLeadSourceInput): Promise<{
  success: boolean;
  leadSource?: LeadSourceItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Lead Source Name is required." };
    }

    // Check existing case-insensitively
    const existing = await prisma.leadSource.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate the existing inactive source and update description/creator
        const reactivated = await prisma.leadSource.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            description: input.description ? input.description.trim() : existing.description,
            createdById: admin.id,
          },
          include: {
            createdBy: { select: { name: true } },
          },
        });

        await logActivity({
          action: "REACTIVATE_LEAD_SOURCE",
          details: `Reactivated previously deactivated lead source "${reactivated.name}"`,
          actorId: admin.id,
        });

        revalidatePath("/admin/settings/lead-sources");
        revalidatePath("/admin/settings/configuration");

        return {
          success: true,
          leadSource: {
            id: reactivated.id,
            name: reactivated.name,
            description: reactivated.description,
            createdById: reactivated.createdById,
            createdByName: reactivated.createdBy?.name || admin.name,
            isActive: reactivated.isActive,
            createdAt: reactivated.createdAt.toISOString(),
            updatedAt: reactivated.updatedAt.toISOString(),
          },
        };
      }

      return {
        success: false,
        error: `A lead source with name "${trimmedName}" already exists.`,
      };
    }

    const created = await prisma.leadSource.create({
      data: {
        name: trimmedName,
        description: input.description ? input.description.trim() : null,
        createdById: admin.id,
        isActive: true,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    await logActivity({
      action: "CREATE_LEAD_SOURCE",
      details: `Created lead source "${created.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-sources");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      leadSource: {
        id: created.id,
        name: created.name,
        description: created.description,
        createdById: created.createdById,
        createdByName: created.createdBy?.name || admin.name,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create lead source.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing Lead Source.
 * Rename Protection:
 * If the source name is modified, verify whether ANY of the following records reference the old name:
 * - Lead.leadSource
 * - User.leadFetchSources
 * - LeadFetchPermission.leadSource
 * - FetchLimitRule.leadSource
 * - EmployeeFetchUsage.leadSource
 * - LeadFetchLog.leadSource
 * If references exist, block renaming with a clear explanation.
 */
export async function updateLeadSourceAction(input: UpdateLeadSourceInput): Promise<{
  success: boolean;
  leadSource?: LeadSourceItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!input.id) {
      return { success: false, error: "Lead Source ID is required." };
    }

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Lead Source Name is required." };
    }

    const current = await prisma.leadSource.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      return { success: false, error: "Lead source not found." };
    }

    const isRenaming = current.name !== trimmedName;

    if (isRenaming) {
      // 1. Check duplicate name on other records
      const duplicate = await prisma.leadSource.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          NOT: { id: input.id },
        },
      });

      if (duplicate) {
        return {
          success: false,
          error: `Another lead source with name "${trimmedName}" already exists.`,
        };
      }

      // 2. Check all references to the old name
      const [
        leadCount,
        userPermCount,
        fetchPermCount,
        ruleCount,
        usageCount,
        logCount,
      ] = await Promise.all([
        prisma.lead.count({ where: { leadSource: current.name } }),
        prisma.user.count({ where: { leadFetchSources: { has: current.name } } }),
        prisma.leadFetchPermission.count({ where: { leadSource: current.name } }),
        prisma.fetchLimitRule.count({ where: { leadSource: current.name } }),
        prisma.employeeFetchUsage.count({ where: { leadSource: current.name } }),
        prisma.leadFetchLog.count({ where: { leadSource: current.name } }),
      ]);

      const totalReferences =
        leadCount + userPermCount + fetchPermCount + ruleCount + usageCount + logCount;

      if (totalReferences > 0) {
        const detailsParts: string[] = [];
        if (leadCount > 0) detailsParts.push(`${leadCount} lead(s)`);
        if (userPermCount > 0 || fetchPermCount > 0)
          detailsParts.push(`${userPermCount + fetchPermCount} employee permission(s)`);
        if (ruleCount > 0) detailsParts.push(`${ruleCount} fetch limit rule(s)`);
        if (usageCount > 0) detailsParts.push(`${usageCount} employee usage record(s)`);
        if (logCount > 0) detailsParts.push(`${logCount} fetch audit log(s)`);

        return {
          success: false,
          error: `Cannot rename "${current.name}" because it is already in use by ${detailsParts.join(
            ", "
          )}. Existing records must be preserved.`,
        };
      }
    }

    const updated = await prisma.leadSource.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        description: input.description !== undefined ? input.description.trim() || null : current.description,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    await logActivity({
      action: "UPDATE_LEAD_SOURCE",
      details: `Updated lead source "${updated.name}" (ID: ${updated.id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-sources");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      leadSource: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        createdById: updated.createdById,
        createdByName: updated.createdBy?.name || "Admin",
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update lead source.";
    return { success: false, error: message };
  }
}

/**
 * Soft delete (deactivate) a Lead Source.
 * Sets isActive = false so it is hidden from new lead-entry dropdowns,
 * but historical records and relations remain completely intact.
 */
export async function deleteLeadSourceAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!id) {
      return { success: false, error: "Lead source ID is required." };
    }

    const current = await prisma.leadSource.findUnique({
      where: { id },
    });

    if (!current) {
      return { success: false, error: "Lead source not found." };
    }

    // Soft delete: set isActive to false
    await prisma.leadSource.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "DEACTIVATE_LEAD_SOURCE",
      details: `Deactivated lead source "${current.name}" (ID: ${id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-sources");
    revalidatePath("/admin/settings/configuration");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate lead source.";
    return { success: false, error: message };
  }
}

/**
 * Reactivate a previously deactivated Lead Source.
 */
export async function reactivateLeadSourceAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!id) {
      return { success: false, error: "Lead source ID is required." };
    }

    const updated = await prisma.leadSource.update({
      where: { id },
      data: { isActive: true },
    });

    await logActivity({
      action: "REACTIVATE_LEAD_SOURCE",
      details: `Reactivated lead source "${updated.name}" (ID: ${id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-sources");
    revalidatePath("/admin/settings/configuration");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reactivate lead source.";
    return { success: false, error: message };
  }
}

