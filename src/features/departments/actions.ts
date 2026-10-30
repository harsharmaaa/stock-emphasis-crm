"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SafeDepartment {
  id: string;
  name: string;
  isActive: boolean;
  profilesCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Retrieves all departments with profile counts.
 * Strictly restricted to system ADMIN users.
 */
export async function getDepartmentsAction(): Promise<{
  success: boolean;
  departments?: SafeDepartment[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const rawDepartments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { profiles: true },
        },
      },
    });

    const departments: SafeDepartment[] = rawDepartments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      isActive: dept.isActive,
      profilesCount: dept._count.profiles,
      createdAt: dept.createdAt.toISOString(),
      updatedAt: dept.updatedAt.toISOString(),
    }));

    return { success: true, departments };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load departments.";
    return { success: false, error: message };
  }
}

export interface CreateDepartmentInput {
  name: string;
  isActive?: boolean;
}

/**
 * Creates a new department.
 */
export async function createDepartmentAction(input: CreateDepartmentInput): Promise<{
  success: boolean;
  department?: SafeDepartment;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Department name is required." };
    }

    // Check uniqueness (case-insensitive)
    const existing = await prisma.department.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: `A department named "${trimmedName}" already exists.` };
    }

    const newDept = await prisma.department.create({
      data: {
        name: trimmedName,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: { profiles: true },
        },
      },
    });

    await logActivity({
      action: "DEPARTMENT_CREATED",
      details: `Admin ${admin.name} created department "${newDept.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/departments");
    revalidatePath("/admin/profiles");

    return {
      success: true,
      department: {
        id: newDept.id,
        name: newDept.name,
        isActive: newDept.isActive,
        profilesCount: newDept._count.profiles,
        createdAt: newDept.createdAt.toISOString(),
        updatedAt: newDept.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create department.";
    return { success: false, error: message };
  }
}

export interface UpdateDepartmentInput {
  id: string;
  name: string;
  isActive?: boolean;
}

/**
 * Updates an existing department.
 */
export async function updateDepartmentAction(input: UpdateDepartmentInput): Promise<{
  success: boolean;
  department?: SafeDepartment;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Department name is required." };
    }

    const current = await prisma.department.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      return { success: false, error: "Department not found." };
    }

    // Check duplicate name
    const existing = await prisma.department.findFirst({
      where: {
        id: { not: input.id },
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: `Another department named "${trimmedName}" already exists.` };
    }

    const updated = await prisma.department.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      },
      include: {
        _count: {
          select: { profiles: true },
        },
      },
    });

    await logActivity({
      action: "DEPARTMENT_UPDATED",
      details: `Admin ${admin.name} updated department "${current.name}" to "${updated.name}" (Active: ${updated.isActive})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/departments");
    revalidatePath("/admin/profiles");

    return {
      success: true,
      department: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        profilesCount: updated._count.profiles,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update department.";
    return { success: false, error: message };
  }
}

/**
 * Toggles a department's active/inactive status.
 */
export async function toggleDepartmentStatusAction(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { profiles: true } } },
    });

    if (!dept) {
      return { success: false, error: "Department not found." };
    }

    await prisma.department.update({
      where: { id },
      data: { isActive },
    });

    await logActivity({
      action: "DEPARTMENT_STATUS_TOGGLED",
      details: `Admin ${admin.name} set department "${dept.name}" active status to ${isActive}`,
      actorId: admin.id,
    });

    revalidatePath("/admin/departments");
    revalidatePath("/admin/profiles");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle department status.";
    return { success: false, error: message };
  }
}

/**
 * Deletes a department if no employee profiles are linked to it.
 */
export async function deleteDepartmentAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { profiles: true } } },
    });

    if (!dept) {
      return { success: false, error: "Department not found." };
    }

    if (dept._count.profiles > 0) {
      return {
        success: false,
        error: `Cannot delete department "${dept.name}" because ${dept._count.profiles} profile(s) are linked to it. Please reassign or delete those profiles first.`,
      };
    }

    await prisma.department.delete({
      where: { id },
    });

    await logActivity({
      action: "DEPARTMENT_DELETED",
      details: `Admin ${admin.name} deleted department "${dept.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/departments");
    revalidatePath("/admin/profiles");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete department.";
    return { success: false, error: message };
  }
}
