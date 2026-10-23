"use server";

import {
  requireAdminSession,
  validateAdminSafety,
  handleActionError,
} from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: "ALL" | Role;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}

export interface GetUsersResult {
  users: SafeUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Fetch users with filtering, search and pagination.
 * Omits sensitive fields like passwordHash.
 */
export async function getUsersAction(
  params: GetUsersParams = {}
): Promise<{ success: boolean; data?: GetUsersResult; error?: string }> {
  try {
    await requireAdminSession({ redirect: false });

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 10));
    const search = params.search?.trim();
    const roleFilter = params.role && params.role !== "ALL" ? params.role : undefined;
    const statusFilter =
      params.status === "ACTIVE"
        ? true
        : params.status === "INACTIVE"
        ? false
        : undefined;

    const where: Prisma.UserWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        roleFilter ? { role: roleFilter } : {},
        statusFilter !== undefined ? { isActive: statusFilter } : {},
      ],
    };

    const [totalCount, rawUsers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const users: SafeUser[] = rawUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        users,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        currentPage: page,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to retrieve user accounts. An unexpected error occurred.");
  }
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  temporaryPassword: string;
}

/**
 * Creates a new user account with a temporary password.
 * Protected by Admin authentication, duplicates check, and bcrypt hashing.
 */
export async function createUserAction(
  input: CreateUserInput
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const role = input.role;
    const tempPassword = input.temporaryPassword?.trim();

    if (!name || name.length < 2) {
      return { success: false, error: "Full name must be at least 2 characters long." };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address." };
    }

    if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
      return { success: false, error: "Invalid role specified." };
    }

    if (!tempPassword || tempPassword.length < 6) {
      return {
        success: false,
        error: "Temporary password must be at least 6 characters.",
      };
    }

    // Check for existing user with this email
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: `An account with email "${email}" already exists.`,
      };
    }

    // Hash password with bcryptjs (10 rounds)
    const passwordHash = await hash(tempPassword, 10);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logActivity({
      action: "USER_CREATED",
      details: `Created new ${role} account for ${created.name} (${created.email})`,
      actorId: admin.id,
      targetUserId: created.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/activity");

    return {
      success: true,
      user: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to create user account. An unexpected error occurred.");
  }
}

export interface UpdateUserInput {
  userId: string;
  name: string;
  email: string;
  role: Role;
  newPassword?: string;
}

/**
 * Updates an existing user's details, role, or resets their password.
 */
export async function updateUserAction(
  input: UpdateUserInput
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const userId = input.userId;
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const role = input.role;
    const newPassword = input.newPassword?.trim();

    if (!name || name.length < 2) {
      return { success: false, error: "Full name must be at least 2 characters long." };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address." };
    }

    if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
      return { success: false, error: "Invalid role specified." };
    }

    // Validate admin safety (prevent self-demotion, protect last remaining admin)
    const safetyCheck = await validateAdminSafety({
      currentAdminId: admin.id,
      targetUserId: userId,
      newRole: role,
    });

    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.error };
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: "User account not found." };
    }

    // Check if email changed and if new email is in use
    if (email !== targetUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailConflict) {
        return {
          success: false,
          error: `The email "${email}" is already in use by another account.`,
        };
      }
    }

    // Password reset if provided
    let newPasswordHash: string | undefined = undefined;
    if (newPassword && newPassword.length > 0) {
      if (newPassword.length < 6) {
        return {
          success: false,
          error: "New password must be at least 6 characters.",
        };
      }
      newPasswordHash = await hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logActivity({
      action: newPasswordHash ? "PASSWORD_RESET" : "USER_UPDATED",
      details: newPasswordHash
        ? `Administrative password reset performed for ${updated.name} (${updated.email})`
        : `Updated profile details and role (${role}) for ${updated.name} (${updated.email})`,
      actorId: admin.id,
      targetUserId: updated.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/activity");

    return {
      success: true,
      user: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to update user account. An unexpected error occurred.");
  }
}

/**
 * Toggles an account active/inactive status with safety checks against self-deactivation.
 */
export async function toggleUserStatusAction(
  userId: string
): Promise<{ success: boolean; newStatus?: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isActive: true, role: true },
    });

    if (!targetUser) {
      return { success: false, error: "User account not found." };
    }

    const nextStatus = !targetUser.isActive;

    // Safety check against self-deactivation and last remaining admin lockout
    const safetyCheck = await validateAdminSafety({
      currentAdminId: admin.id,
      targetUserId: userId,
      newIsActive: nextStatus,
    });

    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.error };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: nextStatus },
      select: { id: true, isActive: true },
    });

    await logActivity({
      action: "STATUS_TOGGLED",
      details: `Account for ${targetUser.name} (${targetUser.email}) set to ${nextStatus ? "ACTIVE" : "DEACTIVATED"}`,
      actorId: admin.id,
      targetUserId: userId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/activity");

    return {
      success: true,
      newStatus: updated.isActive,
    };
  } catch (err) {
    return handleActionError(err, "Failed to toggle account status. An unexpected error occurred.");
  }
}
