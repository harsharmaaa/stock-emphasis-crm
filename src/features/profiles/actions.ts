"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SafeEmployeeProfile {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  departmentIsActive: boolean;
  clientLimit: number;
  invoiceLimit: number;
  salesLimit: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Retrieves all employee profiles with associated department data.
 * Strictly restricted to system ADMIN users.
 */
export async function getEmployeeProfilesAction(): Promise<{
  success: boolean;
  profiles?: SafeEmployeeProfile[];
  departments?: DepartmentOption[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const [rawProfiles, rawDepartments] = await Promise.all([
      prisma.employeeProfile.findMany({
        orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
        include: {
          department: {
            select: { id: true, name: true, isActive: true },
          },
        },
      }),
      prisma.department.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, isActive: true },
      }),
    ]);

    const profiles: SafeEmployeeProfile[] = rawProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      departmentId: p.departmentId,
      departmentName: p.department.name,
      departmentIsActive: p.department.isActive,
      clientLimit: p.clientLimit,
      invoiceLimit: p.invoiceLimit,
      salesLimit: p.salesLimit,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return {
      success: true,
      profiles,
      departments: rawDepartments,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load employee profiles.";
    return { success: false, error: message };
  }
}

export interface CreateEmployeeProfileInput {
  name: string;
  departmentId: string;
  clientLimit?: number;
  invoiceLimit?: number;
  salesLimit?: number;
  description?: string;
  isActive?: boolean;
}

/**
 * Creates a new employee profile.
 */
export async function createEmployeeProfileAction(
  input: CreateEmployeeProfileInput
): Promise<{
  success: boolean;
  profile?: SafeEmployeeProfile;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Profile name is required." };
    }

    if (!input.departmentId) {
      return { success: false, error: "Please select a valid department." };
    }

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!dept) {
      return { success: false, error: "Selected department does not exist." };
    }

    // Check profile name uniqueness (case-insensitive)
    const existing = await prisma.employeeProfile.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: `An employee profile named "${trimmedName}" already exists.` };
    }

    const clientLimit = Math.max(0, Number(input.clientLimit) || 0);
    const invoiceLimit = Math.max(0, Number(input.invoiceLimit) || 0);
    const salesLimit = Math.max(0, Number(input.salesLimit) || 0);

    const created = await prisma.employeeProfile.create({
      data: {
        name: trimmedName,
        departmentId: input.departmentId,
        clientLimit,
        invoiceLimit,
        salesLimit,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
      include: {
        department: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    await logActivity({
      action: "EMPLOYEE_PROFILE_CREATED",
      details: `Admin ${admin.name} created employee profile "${created.name}" under department "${dept.name}" (Client: ${clientLimit}, Invoice: ${invoiceLimit}, Sales: ${salesLimit})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/profiles");
    revalidatePath("/admin/departments");

    return {
      success: true,
      profile: {
        id: created.id,
        name: created.name,
        departmentId: created.departmentId,
        departmentName: created.department.name,
        departmentIsActive: created.department.isActive,
        clientLimit: created.clientLimit,
        invoiceLimit: created.invoiceLimit,
        salesLimit: created.salesLimit,
        description: created.description,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create employee profile.";
    return { success: false, error: message };
  }
}

export interface UpdateEmployeeProfileInput {
  id: string;
  name: string;
  departmentId: string;
  clientLimit?: number;
  invoiceLimit?: number;
  salesLimit?: number;
  description?: string;
  isActive?: boolean;
}

/**
 * Updates an existing employee profile.
 */
export async function updateEmployeeProfileAction(
  input: UpdateEmployeeProfileInput
): Promise<{
  success: boolean;
  profile?: SafeEmployeeProfile;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Profile name is required." };
    }

    if (!input.departmentId) {
      return { success: false, error: "Please select a valid department." };
    }

    const current = await prisma.employeeProfile.findUnique({
      where: { id: input.id },
      include: { department: true },
    });

    if (!current) {
      return { success: false, error: "Employee profile not found." };
    }

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!dept) {
      return { success: false, error: "Selected department does not exist." };
    }

    // Check duplicate name
    const existing = await prisma.employeeProfile.findFirst({
      where: {
        id: { not: input.id },
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: `Another employee profile named "${trimmedName}" already exists.` };
    }

    const clientLimit = Math.max(0, Number(input.clientLimit) || 0);
    const invoiceLimit = Math.max(0, Number(input.invoiceLimit) || 0);
    const salesLimit = Math.max(0, Number(input.salesLimit) || 0);

    const updated = await prisma.employeeProfile.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        departmentId: input.departmentId,
        clientLimit,
        invoiceLimit,
        salesLimit,
        description: input.description !== undefined ? input.description.trim() || null : current.description,
        isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      },
      include: {
        department: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    await logActivity({
      action: "EMPLOYEE_PROFILE_UPDATED",
      details: `Admin ${admin.name} updated employee profile "${current.name}" to "${updated.name}" under "${dept.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/profiles");
    revalidatePath("/admin/departments");

    return {
      success: true,
      profile: {
        id: updated.id,
        name: updated.name,
        departmentId: updated.departmentId,
        departmentName: updated.department.name,
        departmentIsActive: updated.department.isActive,
        clientLimit: updated.clientLimit,
        invoiceLimit: updated.invoiceLimit,
        salesLimit: updated.salesLimit,
        description: updated.description,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update employee profile.";
    return { success: false, error: message };
  }
}

/**
 * Toggles an employee profile's active/hidden status.
 */
export async function toggleEmployeeProfileStatusAction(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const profile = await prisma.employeeProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return { success: false, error: "Employee profile not found." };
    }

    await prisma.employeeProfile.update({
      where: { id },
      data: { isActive },
    });

    await logActivity({
      action: "EMPLOYEE_PROFILE_STATUS_TOGGLED",
      details: `Admin ${admin.name} set employee profile "${profile.name}" active status to ${isActive}`,
      actorId: admin.id,
    });

    revalidatePath("/admin/profiles");
    revalidatePath("/admin/departments");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle profile status.";
    return { success: false, error: message };
  }
}

/**
 * Deletes an employee profile.
 */
export async function deleteEmployeeProfileAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const profile = await prisma.employeeProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return { success: false, error: "Employee profile not found." };
    }

    await prisma.employeeProfile.delete({
      where: { id },
    });

    await logActivity({
      action: "EMPLOYEE_PROFILE_DELETED",
      details: `Admin ${admin.name} deleted employee profile "${profile.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/profiles");
    revalidatePath("/admin/departments");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete employee profile.";
    return { success: false, error: message };
  }
}
