"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import type {
  LeadResponseItem,
  CreateLeadResponseInput,
  UpdateLeadResponseInput,
} from "./types";

/**
 * Fetch all Lead Responses for Admin Management (both active and inactive).
 * Strictly restricted to Admin users.
 */
export async function getLeadResponsesAction(): Promise<{
  success: boolean;
  leadResponses?: LeadResponseItem[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const raw = await prisma.leadResponse.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    const leadResponses: LeadResponseItem[] = raw.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdById: r.createdById,
      createdByName: r.createdBy?.name || "Admin",
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { success: true, leadResponses };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load lead responses.";
    return { success: false, error: message };
  }
}

/**
 * Create a new Lead Response.
 * Strictly requires Admin session.
 * Enforces case-insensitive duplicate name prevention.
 * If an inactive record with the same name exists, reactivates it cleanly.
 */
export async function createLeadResponseAction(input: CreateLeadResponseInput): Promise<{
  success: boolean;
  leadResponse?: LeadResponseItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Lead Response Name is required." };
    }

    // Check existing case-insensitively
    const existing = await prisma.leadResponse.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate the existing inactive response
        const reactivated = await prisma.leadResponse.update({
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
          action: "REACTIVATE_LEAD_RESPONSE",
          details: `Reactivated previously deactivated lead response "${reactivated.name}"`,
          actorId: admin.id,
        });

        revalidatePath("/admin/settings/lead-responses");
        revalidatePath("/admin/settings/configuration");

        return {
          success: true,
          leadResponse: {
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
        error: `A lead response with name "${trimmedName}" already exists.`,
      };
    }

    const created = await prisma.leadResponse.create({
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
      action: "CREATE_LEAD_RESPONSE",
      details: `Created lead response "${created.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-responses");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      leadResponse: {
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
    const message = err instanceof Error ? err.message : "Failed to create lead response.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing Lead Response.
 * Rename Protection:
 * If the response name is changed, check if ANY Lead records currently use the old name.
 * If leads exist, block renaming with a clear message explaining how many leads use it.
 */
export async function updateLeadResponseAction(input: UpdateLeadResponseInput): Promise<{
  success: boolean;
  leadResponse?: LeadResponseItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!input.id) {
      return { success: false, error: "Lead Response ID is required." };
    }

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Lead Response Name is required." };
    }

    const current = await prisma.leadResponse.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      return { success: false, error: "Lead response not found." };
    }

    const isRenaming = current.name !== trimmedName;

    if (isRenaming) {
      // 1. Check duplicate name on other records
      const duplicate = await prisma.leadResponse.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          NOT: { id: input.id },
        },
      });

      if (duplicate) {
        return {
          success: false,
          error: `Another lead response with name "${trimmedName}" already exists.`,
        };
      }

      // 2. Check if any leads reference the old name
      const referencingLeadsCount = await prisma.lead.count({
        where: { leadResponse: current.name },
      });

      if (referencingLeadsCount > 0) {
        return {
          success: false,
          error: `Cannot rename "${current.name}" because it is currently used by ${referencingLeadsCount} historical lead(s). Historical lead records must remain intact.`,
        };
      }
    }

    const updated = await prisma.leadResponse.update({
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
      action: "UPDATE_LEAD_RESPONSE",
      details: `Updated lead response "${updated.name}" (ID: ${updated.id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-responses");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      leadResponse: {
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
    const message = err instanceof Error ? err.message : "Failed to update lead response.";
    return { success: false, error: message };
  }
}

/**
 * Soft delete (deactivate) a Lead Response.
 * Sets isActive = false so it is hidden from new dropdowns,
 * while preserving all historical lead records.
 */
export async function deleteLeadResponseAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!id) {
      return { success: false, error: "Lead response ID is required." };
    }

    const current = await prisma.leadResponse.findUnique({
      where: { id },
    });

    if (!current) {
      return { success: false, error: "Lead response not found." };
    }

    // Soft delete: set isActive to false
    await prisma.leadResponse.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "DEACTIVATE_LEAD_RESPONSE",
      details: `Deactivated lead response "${current.name}" (ID: ${id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-responses");
    revalidatePath("/admin/settings/configuration");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate lead response.";
    return { success: false, error: message };
  }
}

/**
 * Reactivate a previously deactivated Lead Response.
 */
export async function reactivateLeadResponseAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!id) {
      return { success: false, error: "Lead response ID is required." };
    }

    const updated = await prisma.leadResponse.update({
      where: { id },
      data: { isActive: true },
    });

    await logActivity({
      action: "REACTIVATE_LEAD_RESPONSE",
      details: `Reactivated lead response "${updated.name}" (ID: ${id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/lead-responses");
    revalidatePath("/admin/settings/configuration");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reactivate lead response.";
    return { success: false, error: message };
  }
}

