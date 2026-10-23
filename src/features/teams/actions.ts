"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

export interface SafeTeam {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
  } | null;
  membersCount: number;
  members: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    manager: {
      id: string;
      name: string;
      email: string;
    } | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface EligibleManager {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface EligibleEmployee {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamId: string | null;
  managerId: string | null;
  team: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
}

/**
 * Retrieves all teams with populated leaders, members, and counts.
 */
export async function getTeamsAction(): Promise<{
  success: boolean;
  teams?: SafeTeam[];
  managers?: EligibleManager[];
  employees?: EligibleEmployee[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const [rawTeams, rawManagers, rawEmployees] = await Promise.all([
      prisma.team.findMany({
        orderBy: { name: "asc" },
        include: {
          leader: {
            select: { id: true, name: true, email: true, role: true, isActive: true },
          },
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              manager: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { name: "asc" },
          },
          _count: {
            select: { members: true },
          },
        },
      }),
      // Active managers eligible to lead teams or manage employees
      prisma.user.findMany({
        where: { role: "MANAGER", isActive: true },
        select: { id: true, name: true, email: true, role: true, isActive: true },
        orderBy: { name: "asc" },
      }),
      // Employees eligible for assignment
      prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          teamId: true,
          managerId: true,
          team: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const teams: SafeTeam[] = rawTeams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      leaderId: t.leaderId,
      leader: t.leader,
      membersCount: t._count.members,
      members: t.members,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      success: true,
      teams,
      managers: rawManagers,
      employees: rawEmployees,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load teams. An unexpected error occurred.");
  }
}

/**
 * Creates a new Team with optional Team Lead (must be active MANAGER).
 */
export async function createTeamAction(input: {
  name: string;
  description?: string;
  leaderId?: string;
}): Promise<{ success: boolean; team?: SafeTeam; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const name = input.name?.trim();
    const description = input.description?.trim() || null;
    const leaderId = input.leaderId?.trim() || null;

    if (!name || name.length < 2) {
      return { success: false, error: "Team name must be at least 2 characters long." };
    }

    // Check duplicate name
    const existing = await prisma.team.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: `A team named "${name}" already exists.` };
    }

    // If leaderId is specified, validate on server that user is active MANAGER
    if (leaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderId },
        select: { id: true, role: true, isActive: true, name: true },
      });
      if (!leader || leader.role !== "MANAGER" || !leader.isActive) {
        return {
          success: false,
          error: "Validation failed: Only active accounts with the MANAGER role can be assigned as Team Lead.",
        };
      }
    }

    const created = await prisma.team.create({
      data: {
        name,
        description,
        leaderId,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            manager: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    await logActivity({
      action: "TEAM_CREATED",
      details: `Created team '${created.name}'${created.leader ? ` with Lead ${created.leader.name}` : ""}`,
      actorId: admin.id,
      targetTeamId: created.id,
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin/activity");
    revalidatePath("/manager");

    return {
      success: true,
      team: {
        id: created.id,
        name: created.name,
        description: created.description,
        leaderId: created.leaderId,
        leader: created.leader,
        membersCount: created._count.members,
        members: created.members,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to create team. An unexpected error occurred.");
  }
}

/**
 * Updates team name, description, and Team Lead.
 */
export async function updateTeamAction(input: {
  teamId: string;
  name: string;
  description?: string;
  leaderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const teamId = input.teamId;
    const name = input.name?.trim();
    const description = input.description?.trim() || null;
    const leaderId = input.leaderId?.trim() || null;

    if (!name || name.length < 2) {
      return { success: false, error: "Team name must be at least 2 characters long." };
    }

    const targetTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!targetTeam) {
      return { success: false, error: "Team not found." };
    }

    // Check name collision
    if (name !== targetTeam.name) {
      const conflict = await prisma.team.findUnique({
        where: { name },
        select: { id: true },
      });
      if (conflict) {
        return { success: false, error: `A team named "${name}" already exists.` };
      }
    }

    // If leaderId changed, validate active MANAGER role
    if (leaderId && leaderId !== targetTeam.leaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderId },
        select: { id: true, role: true, isActive: true, name: true },
      });
      if (!leader || leader.role !== "MANAGER" || !leader.isActive) {
        return {
          success: false,
          error: "Validation failed: Only active accounts with the MANAGER role can lead a team.",
        };
      }
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        description,
        leaderId,
      },
    });

    await logActivity({
      action: "TEAM_UPDATED",
      details: `Updated parameters for team '${name}'`,
      actorId: admin.id,
      targetTeamId: teamId,
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin/activity");
    revalidatePath("/manager");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update team. An unexpected error occurred.");
  }
}

/**
 * Deletes a team. Assigned members will have teamId set to null via foreign key cascade.
 */
export async function deleteTeamAction(
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true },
    });
    if (!team) {
      return { success: false, error: "Team not found." };
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    await logActivity({
      action: "TEAM_DELETED",
      details: `Deleted team '${team.name}'. Associated member assignments were safely cleared.`,
      actorId: admin.id,
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin/activity");
    revalidatePath("/manager");
    revalidatePath("/employee");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to delete team. An unexpected error occurred.");
  }
}

/**
 * Assigns an Employee to a Team and optionally to a direct reporting Manager.
 * Strict rules:
 * - Employee can only belong to one Team.
 * - Employee cannot manage themselves.
 * - Manager must be active and have role MANAGER.
 */
export async function assignEmployeeTeamAndManagerAction(input: {
  employeeId: string;
  teamId: string | null;
  managerId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const { employeeId, teamId, managerId } = input;

    // Verify employee
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!employee) {
      return { success: false, error: "Employee account not found." };
    }

    // Role check: Only accounts with EMPLOYEE role can be assigned to department teams
    if (employee.role !== "EMPLOYEE") {
      return {
        success: false,
        error: "Validation error: Only accounts with the EMPLOYEE role can be assigned to a department team.",
      };
    }

    // Rule: Employee cannot be their own manager
    if (managerId && managerId === employeeId) {
      return {
        success: false,
        error: "Validation error: An employee cannot be assigned as their own reporting manager.",
      };
    }

    // Rule: If managerId provided, verify active MANAGER role
    let managerName: string | null = null;
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      if (!manager || manager.role !== "MANAGER" || !manager.isActive) {
        return {
          success: false,
          error: "Validation error: The selected reporting supervisor must be an active account with the MANAGER role.",
        };
      }
      managerName = manager.name;
    }

    // Rule: If teamId provided, verify team exists
    let teamName: string | null = null;
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true },
      });
      if (!team) {
        return { success: false, error: "Target team not found." };
      }
      teamName = team.name;
    }

    await prisma.user.update({
      where: { id: employeeId },
      data: {
        teamId: teamId || null,
        managerId: managerId || null,
      },
    });

    const assignmentNarrative = [
      teamName ? `assigned to team '${teamName}'` : "unassigned from team",
      managerName ? `reporting to Manager ${managerName}` : "no reporting manager",
    ].join(" and ");

    await logActivity({
      action: "TEAM_MEMBER_ASSIGNED",
      details: `${employee.name} was ${assignmentNarrative}`,
      actorId: admin.id,
      targetUserId: employee.id,
      targetTeamId: teamId || undefined,
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin/users");
    revalidatePath("/admin/activity");
    revalidatePath("/manager");
    revalidatePath("/employee");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to assign team/manager. An unexpected error occurred.");
  }
}
