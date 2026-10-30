"use server";

import {
  requireAdminSession,
  validateAdminSafety,
  handleActionError,
} from "@/src/lib/auth-guard";
import { auth } from "@/auth";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { LEAD_SOURCE_OPTIONS } from "@/src/lib/utils";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  isActive: boolean;
  mobile: string | null;
  fatherName: string | null;
  state: string | null;
  city: string | null;
  dob: string | null;
  address: string | null;
  joiningDate: string | null;
  pastExperience: string | null;
  callingExtension: string | null;
  description: string | null;
  employeeTarget: number | null;
  photo: string | null;

  departmentId: string | null;
  departmentName: string | null;
  employeeProfileId: string | null;
  employeeProfileName: string | null;
  managerId: string | null;
  managerName: string | null;
  managerProfileName: string | null;

  leadFetchSources: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
 * Fetch users/employees with filtering, search and pagination.
 * Excludes soft-deleted users and omits sensitive password hashes.
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
      deletedAt: null, // Exclude soft-deleted records
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { mobile: { contains: search, mode: "insensitive" } },
                { callingExtension: { contains: search, mode: "insensitive" } },
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
          username: true,
          role: true,
          isActive: true,
          mobile: true,
          fatherName: true,
          state: true,
          city: true,
          dob: true,
          address: true,
          joiningDate: true,
          pastExperience: true,
          callingExtension: true,
          description: true,
          employeeTarget: true,
          photo: true,
          departmentId: true,
          department: {
            select: { id: true, name: true },
          },
          employeeProfileId: true,
          employeeProfile: {
            select: { id: true, name: true },
          },
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { name: true } },
            },
          },
          leadFetchSources: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const users: SafeUser[] = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
      mobile: u.mobile,
      fatherName: u.fatherName,
      state: u.state,
      city: u.city,
      dob: u.dob ? u.dob.toISOString().split("T")[0] : null,
      address: u.address,
      joiningDate: u.joiningDate ? u.joiningDate.toISOString().split("T")[0] : null,
      pastExperience: u.pastExperience,
      callingExtension: u.callingExtension,
      description: u.description,
      employeeTarget: u.employeeTarget,
      photo: u.photo,

      departmentId: u.departmentId,
      departmentName: u.department?.name || null,
      employeeProfileId: u.employeeProfileId,
      employeeProfileName: u.employeeProfile?.name || null,
      managerId: u.managerId,
      managerName: u.manager?.name || null,
      managerProfileName: u.manager?.employeeProfile?.name || null,

      leadFetchSources: u.leadFetchSources || [],
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
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
    return handleActionError(err, "Failed to retrieve employee accounts.");
  }
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface ProfileOption {
  id: string;
  name: string;
  departmentId: string;
}

export interface ManagerOption {
  id: string;
  name: string;
  profileName: string | null;
}

export interface EmployeeFormData {
  departments: DepartmentOption[];
  profiles: ProfileOption[];
  managers: ManagerOption[];
  leadSources: readonly string[];
}

/**
 * Loads dynamic metadata required for Employee Add/Edit forms:
 * Active Departments, Active Employee Profiles, Potential Reporting Managers, and Lead Sources.
 */
export async function getEmployeeFormDataAction(): Promise<{
  success: boolean;
  data?: EmployeeFormData;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const [rawDepartments, rawProfiles, rawManagers] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        select: { id: true, name: true, departmentId: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          employeeProfile: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const managers: ManagerOption[] = rawManagers.map((m) => ({
      id: m.id,
      name: m.name,
      profileName: m.employeeProfile?.name || null,
    }));

    return {
      success: true,
      data: {
        departments: rawDepartments,
        profiles: rawProfiles,
        managers,
        leadSources: LEAD_SOURCE_OPTIONS,
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load employee form options.");
  }
}

/**
 * Retrieves a single employee by ID for read-only view or edit.
 */
export async function getUserByIdAction(userId: string): Promise<{
  success: boolean;
  user?: SafeUser;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        mobile: true,
        fatherName: true,
        state: true,
        city: true,
        dob: true,
        address: true,
        joiningDate: true,
        pastExperience: true,
        callingExtension: true,
        description: true,
        employeeTarget: true,
        photo: true,
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
        employeeProfileId: true,
        employeeProfile: {
          select: { id: true, name: true },
        },
        managerId: true,
        manager: {
          select: {
            id: true,
            name: true,
            employeeProfile: { select: { name: true } },
          },
        },
        leadFetchSources: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!u) {
      return { success: false, error: "Employee account not found." };
    }

    const safeUser: SafeUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
      mobile: u.mobile,
      fatherName: u.fatherName,
      state: u.state,
      city: u.city,
      dob: u.dob ? u.dob.toISOString().split("T")[0] : null,
      address: u.address,
      joiningDate: u.joiningDate ? u.joiningDate.toISOString().split("T")[0] : null,
      pastExperience: u.pastExperience,
      callingExtension: u.callingExtension,
      description: u.description,
      employeeTarget: u.employeeTarget,
      photo: u.photo,

      departmentId: u.departmentId,
      departmentName: u.department?.name || null,
      employeeProfileId: u.employeeProfileId,
      employeeProfileName: u.employeeProfile?.name || null,
      managerId: u.managerId,
      managerName: u.manager?.name || null,
      managerProfileName: u.manager?.employeeProfile?.name || null,

      leadFetchSources: u.leadFetchSources || [],
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
    };

    return { success: true, user: safeUser };
  } catch (err) {
    return handleActionError(err, "Failed to load employee details.");
  }
}

export interface CreateEmployeeInput {
  name: string;
  mobile?: string;
  fatherName?: string;
  email: string;
  state?: string;
  city?: string;
  dob?: string;
  address?: string;

  isActive?: boolean;
  username: string;
  password: string;
  role?: Role;
  departmentId?: string;
  employeeProfileId?: string;
  joiningDate?: string;
  pastExperience?: string;
  callingExtension?: string;
  description?: string;
  managerId?: string;
  employeeTarget?: number;
  photo?: string;

  leadFetchSources?: string[];
}

/**
 * Creates a new Employee record with full basic details, department/profile association,
 * and individual Lead Fetch Permissions.
 */
export async function createUserAction(
  input: CreateEmployeeInput
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Employee Name is required (at least 2 characters)." };
    }

    const username = input.username?.trim();
    if (!username || username.length < 2) {
      return { success: false, error: "Username is required (at least 2 characters)." };
    }

    const email = input.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address." };
    }

    const password = input.password?.trim();
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // Check unique username
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingUsername) {
      return { success: false, error: `Username "${username}" is already taken.` };
    }

    // Check unique email
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingEmail) {
      return { success: false, error: `Email "${email}" is already registered.` };
    }

    // Department & Profile validation
    let validDeptId: string | null = null;
    let validProfileId: string | null = null;

    if (input.departmentId && input.departmentId.trim()) {
      const dept = await prisma.department.findUnique({
        where: { id: input.departmentId.trim() },
      });
      if (!dept) {
        return { success: false, error: "Selected Department does not exist." };
      }
      validDeptId = dept.id;
    }

    if (input.employeeProfileId && input.employeeProfileId.trim()) {
      const profile = await prisma.employeeProfile.findUnique({
        where: { id: input.employeeProfileId.trim() },
      });
      if (!profile) {
        return { success: false, error: "Selected Employee Profile does not exist." };
      }
      if (validDeptId && profile.departmentId !== validDeptId) {
        return { success: false, error: "Selected Profile does not belong to the selected Department." };
      }
      validProfileId = profile.id;
    }

    // Manager validation
    let validManagerId: string | null = null;
    if (input.managerId && input.managerId.trim()) {
      const mgr = await prisma.user.findUnique({
        where: { id: input.managerId.trim() },
      });
      if (mgr) {
        validManagerId = mgr.id;
      }
    }

    // Dates
    const parsedDob = input.dob ? new Date(input.dob) : null;
    const parsedJoining = input.joiningDate ? new Date(input.joiningDate) : null;

    // Filter valid lead sources
    const selectedSources: string[] = Array.isArray(input.leadFetchSources)
      ? Array.from(new Set(input.leadFetchSources.filter((s) => (LEAD_SOURCE_OPTIONS as readonly string[]).includes(s))))
      : [];

    const passwordHash = await hash(password, 10);
    const role: Role = input.role && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(input.role) ? input.role : "EMPLOYEE";

    // Transaction to create User and LeadFetchPermissions
    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          username,
          email,
          passwordHash,
          role,
          isActive: input.isActive ?? true,
          mobile: input.mobile?.trim() || null,
          fatherName: input.fatherName?.trim() || null,
          state: input.state?.trim() || null,
          city: input.city?.trim() || null,
          dob: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
          address: input.address?.trim() || null,
          joiningDate: parsedJoining && !isNaN(parsedJoining.getTime()) ? parsedJoining : null,
          pastExperience: input.pastExperience?.trim() || null,
          callingExtension: input.callingExtension?.trim() || null,
          description: input.description?.trim() || null,
          employeeTarget: typeof input.employeeTarget === "number" ? Math.max(0, input.employeeTarget) : 0,
          photo: input.photo?.trim() || null,
          departmentId: validDeptId,
          employeeProfileId: validProfileId,
          managerId: validManagerId,
          leadFetchSources: selectedSources,
        },
        include: {
          department: { select: { id: true, name: true } },
          employeeProfile: { select: { id: true, name: true } },
          manager: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { name: true } },
            },
          },
        },
      });

      if (selectedSources.length > 0) {
        await tx.leadFetchPermission.createMany({
          data: selectedSources.map((source) => ({
            userId: newUser.id,
            leadSource: source,
          })),
        });
      }

      return newUser;
    });

    await logActivity({
      action: "EMPLOYEE_CREATED",
      details: `Admin ${admin.name} created employee ${created.name} (@${created.username}) with ${selectedSources.length} lead source permission(s)`,
      actorId: admin.id,
      targetUserId: created.id,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/leads/allot");

    const safeUser: SafeUser = {
      id: created.id,
      name: created.name,
      email: created.email,
      username: created.username,
      role: created.role,
      isActive: created.isActive,
      mobile: created.mobile,
      fatherName: created.fatherName,
      state: created.state,
      city: created.city,
      dob: created.dob ? created.dob.toISOString().split("T")[0] : null,
      address: created.address,
      joiningDate: created.joiningDate ? created.joiningDate.toISOString().split("T")[0] : null,
      pastExperience: created.pastExperience,
      callingExtension: created.callingExtension,
      description: created.description,
      employeeTarget: created.employeeTarget,
      photo: created.photo,
      departmentId: created.departmentId,
      departmentName: created.department?.name || null,
      employeeProfileId: created.employeeProfileId,
      employeeProfileName: created.employeeProfile?.name || null,
      managerId: created.managerId,
      managerName: created.manager?.name || null,
      managerProfileName: created.manager?.employeeProfile?.name || null,
      leadFetchSources: created.leadFetchSources || [],
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      deletedAt: null,
    };

    return { success: true, user: safeUser };
  } catch (err) {
    return handleActionError(err, "Failed to create employee.");
  }
}

export interface UpdateEmployeeInput {
  userId: string;
  name: string;
  mobile?: string;
  fatherName?: string;
  email: string;
  state?: string;
  city?: string;
  dob?: string;
  address?: string;

  isActive?: boolean;
  username: string;
  newPassword?: string;
  role?: Role;
  departmentId?: string;
  employeeProfileId?: string;
  joiningDate?: string;
  pastExperience?: string;
  callingExtension?: string;
  description?: string;
  managerId?: string;
  employeeTarget?: number;
  photo?: string;

  leadFetchSources?: string[];
}

/**
 * Updates an existing employee and synchronizes their Lead Fetch Permissions.
 */
export async function updateUserAction(
  input: UpdateEmployeeInput
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });
    const userId = input.userId?.trim();

    if (!userId) {
      return { success: false, error: "Employee ID is required." };
    }

    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Employee Name is required (at least 2 characters)." };
    }

    const username = input.username?.trim();
    if (!username || username.length < 2) {
      return { success: false, error: "Username is required (at least 2 characters)." };
    }

    const email = input.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please provide a valid email address." };
    }

    // Safety checks against admin self-lockout
    const safetyCheck = await validateAdminSafety({
      currentAdminId: admin.id,
      targetUserId: userId,
      newRole: input.role,
      newIsActive: input.isActive,
    });
    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.error };
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser || existingUser.deletedAt) {
      return { success: false, error: "Employee account not found." };
    }

    // Validate unique username (excluding current user)
    const usernameConflict = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        username: { equals: username, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (usernameConflict) {
      return { success: false, error: `Username "${username}" is already in use by another employee.` };
    }

    // Validate unique email (excluding current user)
    const emailConflict = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (emailConflict) {
      return { success: false, error: `Email "${email}" is already registered to another account.` };
    }

    // Validate department and profile relationship
    let validDeptId: string | null = null;
    let validProfileId: string | null = null;

    if (input.departmentId && input.departmentId.trim()) {
      const dept = await prisma.department.findUnique({
        where: { id: input.departmentId.trim() },
      });
      if (!dept) {
        return { success: false, error: "Selected Department does not exist." };
      }
      validDeptId = dept.id;
    }

    if (input.employeeProfileId && input.employeeProfileId.trim()) {
      const profile = await prisma.employeeProfile.findUnique({
        where: { id: input.employeeProfileId.trim() },
      });
      if (!profile) {
        return { success: false, error: "Selected Employee Profile does not exist." };
      }
      if (validDeptId && profile.departmentId !== validDeptId) {
        return { success: false, error: "Selected Profile does not belong to the selected Department." };
      }
      validProfileId = profile.id;
    }

    // Manager validation (cannot be self)
    let validManagerId: string | null = null;
    if (input.managerId && input.managerId.trim()) {
      if (input.managerId.trim() === userId) {
        return { success: false, error: "An employee cannot be assigned as their own reporting manager." };
      }
      const mgr = await prisma.user.findUnique({
        where: { id: input.managerId.trim() },
      });
      if (mgr) {
        validManagerId = mgr.id;
      }
    }

    // Password reset if provided
    let newPasswordHash: string | undefined = undefined;
    if (input.newPassword && input.newPassword.trim().length > 0) {
      if (input.newPassword.trim().length < 6) {
        return { success: false, error: "New password must be at least 6 characters long." };
      }
      newPasswordHash = await hash(input.newPassword.trim(), 10);
    }

    // Dates
    const parsedDob = input.dob ? new Date(input.dob) : null;
    const parsedJoining = input.joiningDate ? new Date(input.joiningDate) : null;

    // Filter valid lead sources
    const selectedSources: string[] = Array.isArray(input.leadFetchSources)
      ? Array.from(new Set(input.leadFetchSources.filter((s) => (LEAD_SOURCE_OPTIONS as readonly string[]).includes(s))))
      : [];

    const role: Role = input.role && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(input.role)
      ? input.role
      : existingUser.role;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          name,
          username,
          email,
          ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
          role,
          isActive: input.isActive !== undefined ? input.isActive : existingUser.isActive,
          mobile: input.mobile?.trim() || null,
          fatherName: input.fatherName?.trim() || null,
          state: input.state?.trim() || null,
          city: input.city?.trim() || null,
          dob: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
          address: input.address?.trim() || null,
          joiningDate: parsedJoining && !isNaN(parsedJoining.getTime()) ? parsedJoining : null,
          pastExperience: input.pastExperience?.trim() || null,
          callingExtension: input.callingExtension?.trim() || null,
          description: input.description?.trim() || null,
          employeeTarget: typeof input.employeeTarget === "number" ? Math.max(0, input.employeeTarget) : existingUser.employeeTarget,
          photo: input.photo?.trim() || null,
          departmentId: validDeptId,
          employeeProfileId: validProfileId,
          managerId: validManagerId,
          leadFetchSources: selectedSources,
        },
        include: {
          department: { select: { id: true, name: true } },
          employeeProfile: { select: { id: true, name: true } },
          manager: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { name: true } },
            },
          },
        },
      });

      // Synchronize permissions
      await tx.leadFetchPermission.deleteMany({ where: { userId } });
      if (selectedSources.length > 0) {
        await tx.leadFetchPermission.createMany({
          data: selectedSources.map((source) => ({
            userId,
            leadSource: source,
          })),
        });
      }

      return user;
    });

    await logActivity({
      action: "EMPLOYEE_UPDATED",
      details: `Admin ${admin.name} updated employee details for ${updated.name} (@${updated.username})${newPasswordHash ? " (password reset included)" : ""}`,
      actorId: admin.id,
      targetUserId: updated.id,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/leads/allot");

    const safeUser: SafeUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      isActive: updated.isActive,
      mobile: updated.mobile,
      fatherName: updated.fatherName,
      state: updated.state,
      city: updated.city,
      dob: updated.dob ? updated.dob.toISOString().split("T")[0] : null,
      address: updated.address,
      joiningDate: updated.joiningDate ? updated.joiningDate.toISOString().split("T")[0] : null,
      pastExperience: updated.pastExperience,
      callingExtension: updated.callingExtension,
      description: updated.description,
      employeeTarget: updated.employeeTarget,
      photo: updated.photo,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name || null,
      employeeProfileId: updated.employeeProfileId,
      employeeProfileName: updated.employeeProfile?.name || null,
      managerId: updated.managerId,
      managerName: updated.manager?.name || null,
      managerProfileName: updated.manager?.employeeProfile?.name || null,
      leadFetchSources: updated.leadFetchSources || [],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      deletedAt: null,
    };

    return { success: true, user: safeUser };
  } catch (err) {
    return handleActionError(err, "Failed to update employee.");
  }
}

/**
 * Soft-deletes an employee record.
 * Preserves all historical leads, activity logs, assignments, and audit trails.
 * Enforces admin protection rules (cannot self-delete, cannot delete last admin).
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    // Validate safety rules (self-deletion guard and last active admin protection)
    const safetyCheck = await validateAdminSafety({
      currentAdminId: admin.id,
      targetUserId: userId,
      isDeleting: true,
    });

    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.error };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, username: true },
    });

    if (!targetUser) {
      return { success: false, error: "Employee account not found." };
    }

    // Soft-delete: mark deletedAt and deactivate
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await logActivity({
      action: "EMPLOYEE_ARCHIVED",
      details: `Admin ${admin.name} archived employee ${targetUser.name} (@${targetUser.username || targetUser.email})`,
      actorId: admin.id,
      targetUserId: userId,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/leads/allot");
    revalidatePath("/admin/teams");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to delete employee account.");
  }
}

/**
 * Toggles user status (maintained for API compatibility if needed).
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
      details: `Account for ${targetUser.name} set to ${nextStatus ? "ACTIVE" : "DEACTIVATED"}`,
      actorId: admin.id,
      targetUserId: userId,
    });

    revalidatePath("/admin/users");

    return { success: true, newStatus: updated.isActive };
  } catch (err) {
    return handleActionError(err, "Failed to toggle account status.");
  }
}

/**
 * Lead Fetch Permission Enforcement:
 * Verifies that the requesting employee has explicit permission to fetch leads from the given Lead Source.
 */
export async function verifyEmployeeLeadFetchPermissionAction(
  leadSource: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { allowed: false, error: "Unauthorized: Active session required." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
        leadFetchSources: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return { allowed: false, error: "Forbidden: Account is inactive or deleted." };
    }

    // Admins always have access
    if (user.role === "ADMIN") {
      return { allowed: true };
    }

    const permitted = user.leadFetchSources.includes(leadSource);
    if (!permitted) {
      return {
        allowed: false,
        error: `Permission denied: You do not have permission to fetch leads from "${leadSource}". Please contact your Administrator.`,
      };
    }

    return { allowed: true };
  } catch (err) {
    return { allowed: false, error: "Failed to verify lead fetch permission." };
  }
}
