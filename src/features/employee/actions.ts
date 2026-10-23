"use server";

import { requireEmployeeSession, handleActionError } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

export interface EmployeeProfileData {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  team: {
    id: string;
    name: string;
    description: string | null;
    leader: {
      id: string;
      name: string;
      email: string;
    } | null;
    membersCount: number;
    colleagues: {
      id: string;
      name: string;
      email: string;
      isActive: boolean;
    }[];
  } | null;
  manager: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
}

export interface EmployeeActivityLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  targetTeam: {
    id: string;
    name: string;
  } | null;
}

export interface EmployeeOverviewResult {
  profile: EmployeeProfileData;
  announcementBanner: string | null;
  supportEmail: string;
  recentActivities: EmployeeActivityLog[];
  metrics: {
    assignedStocksCount: number;
    activeTasksCount: number;
    completedTasksCount: number;
    followUpsLogged: number;
  };
}

/**
 * Default departmental stock catalog templates associated with operational teams.
 */
export interface StockLeadItem {
  id: string;
  sku: string;
  title: string;
  category: "RAW_MATERIALS" | "FINISHED_GOODS" | "TRANSIT_BATCH" | "CLIENT_LEAD";
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  status: "IN_STOCK" | "LOW_STOCK" | "ALLOCATED" | "PENDING_CHECK";
  quantity: number;
  unit: string;
  location: string;
  leadContact?: string;
  lastInspected?: string;
}

/**
 * Operational tasks assigned to warehouse employee.
 */
export interface EmployeeTaskItem {
  id: string;
  title: string;
  category: "INSPECTION" | "STOCK_AUDIT" | "LEAD_FOLLOWUP" | "DISPATCH";
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  dueDate: string;
  completed: boolean;
  notes?: string;
}

/**
 * In-memory seed tasks scoped by employee ID and team.
 */
function getInitialTasksForEmployee(employeeId: string, teamName: string): EmployeeTaskItem[] {
  return [
    {
      id: `task-1-${employeeId.slice(-4)}`,
      title: `Daily physical count verification for ${teamName || "General Warehouse"}`,
      category: "STOCK_AUDIT",
      priority: "HIGH",
      dueDate: "Today, 5:00 PM",
      completed: false,
      notes: "Verify batch barcodes and cross-reference with delivery manifests.",
    },
    {
      id: `task-2-${employeeId.slice(-4)}`,
      title: "Inspect incoming shipment packaging and seal integrity",
      category: "INSPECTION",
      priority: "MEDIUM",
      dueDate: "Tomorrow, 11:00 AM",
      completed: true,
      notes: "Log any damaged containers immediately to reporting supervisor.",
    },
    {
      id: `task-3-${employeeId.slice(-4)}`,
      title: "Client fulfillment inquiry follow-up for allocated stock batch",
      category: "LEAD_FOLLOWUP",
      priority: "HIGH",
      dueDate: "Within 24 Hours",
      completed: false,
      notes: "Confirm dispatch timeline with regional logistics partner.",
    },
    {
      id: `task-4-${employeeId.slice(-4)}`,
      title: "Update pallet location tags in staging sector B",
      category: "DISPATCH",
      priority: "NORMAL",
      dueDate: "End of Week",
      completed: false,
      notes: "Ensure aisle clearance conforms to warehouse safety guidelines.",
    },
  ];
}

function getStockCatalogForTeam(teamName: string): StockLeadItem[] {
  const prefix = teamName ? teamName.slice(0, 3).toUpperCase() : "STK";
  return [
    {
      id: "stock-1",
      sku: `${prefix}-9021`,
      title: "Precision Micro-Bearings (Box of 500)",
      category: "RAW_MATERIALS",
      priority: "HIGH",
      status: "IN_STOCK",
      quantity: 1450,
      unit: "Units",
      location: "Aisle 4 - Shelf B2",
      leadContact: "Industrial Motion Ltd",
      lastInspected: "Today",
    },
    {
      id: "stock-2",
      sku: `${prefix}-8412`,
      title: "High-Tensile Fasteners (Grade 8.8)",
      category: "RAW_MATERIALS",
      priority: "MEDIUM",
      status: "LOW_STOCK",
      quantity: 80,
      unit: "Boxes",
      location: "Aisle 2 - Bin 14",
      leadContact: "Apex Mechanical Works",
      lastInspected: "Yesterday",
    },
    {
      id: "stock-3",
      sku: `${prefix}-6320`,
      title: "Hydraulic Actuator Assemblies (Model H-3)",
      category: "FINISHED_GOODS",
      priority: "HIGH",
      status: "ALLOCATED",
      quantity: 42,
      unit: "Sets",
      location: "Staging Bay 1",
      leadContact: "Eastern Logistics Fleet",
      lastInspected: "2 days ago",
    },
    {
      id: "stock-4",
      sku: `${prefix}-4109`,
      title: "Thermal Insulation Blankets (Bulk Pack)",
      category: "TRANSIT_BATCH",
      priority: "NORMAL",
      status: "PENDING_CHECK",
      quantity: 210,
      unit: "Rolls",
      location: "Inbound Dock 3",
      leadContact: "Global Marine Supplies",
      lastInspected: "Pending Verification",
    },
    {
      id: "stock-5",
      sku: `${prefix}-1184`,
      title: "Bulk Order Inflow - Commercial Client Lead",
      category: "CLIENT_LEAD",
      priority: "HIGH",
      status: "ALLOCATED",
      quantity: 500,
      unit: "Units",
      location: "Reserved Section C",
      leadContact: "Titan Automation Inc (R. Mehta)",
      lastInspected: "Today",
    },
  ];
}

/**
 * Retrieves the comprehensive overview data for the authenticated employee.
 * Scoped strictly to employee's own profile, assigned team, supervisor, and audit trail.
 */
export async function getEmployeeOverviewAction(): Promise<{
  success: boolean;
  data?: EmployeeOverviewResult;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    // 1. Fetch employee profile with team, supervisor, and colleagues
    const [dbUser, announcementSetting, supportEmailSetting, rawActivities] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: employee.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true,
                leader: {
                  select: { id: true, name: true, email: true },
                },
                members: {
                  select: { id: true, name: true, email: true, isActive: true },
                  where: { NOT: { id: employee.id } },
                  take: 6,
                },
                _count: {
                  select: { members: true },
                },
              },
            },
            manager: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        }),
        prisma.systemSetting.findUnique({
          where: { key: "ANNOUNCEMENT_BANNER" },
          select: { value: true },
        }),
        prisma.systemSetting.findUnique({
          where: { key: "SUPPORT_EMAIL" },
          select: { value: true },
        }),
        prisma.activityLog.findMany({
          where: {
            OR: [
              { actorId: employee.id },
              { targetUserId: employee.id },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            actor: { select: { id: true, name: true, email: true } },
            targetTeam: { select: { id: true, name: true } },
          },
        }),
      ]);

    if (!dbUser) {
      return { success: false, error: "Employee account not found." };
    }

    const teamData = dbUser.team
      ? {
          id: dbUser.team.id,
          name: dbUser.team.name,
          description: dbUser.team.description,
          leader: dbUser.team.leader,
          membersCount: dbUser.team._count.members,
          colleagues: dbUser.team.members,
        }
      : null;

    const profile: EmployeeProfileData = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt.toISOString(),
      team: teamData,
      manager: dbUser.manager,
    };

    const recentActivities: EmployeeActivityLog[] = rawActivities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      targetTeam: a.targetTeam,
    }));

    // Calculate metrics
    const initialTasks = getInitialTasksForEmployee(employee.id, teamData?.name || "");
    const activeTasksCount = initialTasks.filter((t) => !t.completed).length;
    const completedTasksCount = initialTasks.filter((t) => t.completed).length;
    const assignedStocksCount = teamData ? 5 : 0;
    const followUpsLogged = recentActivities.length;

    return {
      success: true,
      data: {
        profile,
        announcementBanner: announcementSetting?.value || null,
        supportEmail: supportEmailSetting?.value || "support@stockemphasis.com",
        recentActivities,
        metrics: {
          assignedStocksCount,
          activeTasksCount,
          completedTasksCount,
          followUpsLogged,
        },
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load employee overview.");
  }
}

/**
 * Retrieves stock inventory items and leads assigned to employee's department.
 */
export async function getEmployeeStocksAction(params?: {
  search?: string;
  category?: string;
}): Promise<{
  success: boolean;
  stocks?: StockLeadItem[];
  teamName?: string;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    // Fetch employee team name
    const userWithTeam = await prisma.user.findUnique({
      where: { id: employee.id },
      select: {
        team: { select: { id: true, name: true } },
      },
    });

    const teamName = userWithTeam?.team?.name || "General Operational Unit";
    let catalog = getStockCatalogForTeam(teamName);

    const search = params?.search?.trim().toLowerCase();
    const category = params?.category;

    if (search) {
      catalog = catalog.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          s.sku.toLowerCase().includes(search) ||
          s.location.toLowerCase().includes(search) ||
          (s.leadContact && s.leadContact.toLowerCase().includes(search))
      );
    }

    if (category && category !== "ALL") {
      catalog = catalog.filter((s) => s.category === category);
    }

    return {
      success: true,
      stocks: catalog,
      teamName,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load assigned stocks and leads.");
  }
}

/**
 * Retrieves daily tasks and operational checklists for this employee.
 */
export async function getEmployeeTasksAction(): Promise<{
  success: boolean;
  tasks?: EmployeeTaskItem[];
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const userWithTeam = await prisma.user.findUnique({
      where: { id: employee.id },
      select: { team: { select: { name: true } } },
    });

    const tasks = getInitialTasksForEmployee(employee.id, userWithTeam?.team?.name || "");

    return {
      success: true,
      tasks,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load operational tasks.");
  }
}

/**
 * Logs an inspection check or follow-up note by the employee into ActivityLog.
 */
export async function logEmployeeFollowUpAction(input: {
  title: string;
  details: string;
  referenceItem?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const title = input.title?.trim();
    const details = input.details?.trim();
    const reference = input.referenceItem?.trim();

    if (!title || title.length < 3) {
      return { success: false, error: "Follow-up subject must be at least 3 characters." };
    }

    if (!details || details.length < 5) {
      return { success: false, error: "Follow-up details must be at least 5 characters." };
    }

    await logActivity({
      action: "INVENTORY_FOLLOW_UP",
      details: `${title}${reference ? ` [Ref: ${reference}]` : ""}: ${details}`,
      actorId: employee.id,
      targetUserId: employee.id,
      targetTeamId: employee.teamId || undefined,
    });

    revalidatePath("/employee");
    revalidatePath("/employee/activity");
    revalidatePath("/employee/tasks");
    revalidatePath("/manager/activity");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to record follow-up entry.");
  }
}

/**
 * Toggles a task status and writes an audit record.
 */
export async function toggleEmployeeTaskAction(input: {
  taskId: string;
  taskTitle: string;
  completed: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const { taskTitle, completed } = input;

    await logActivity({
      action: completed ? "TASK_COMPLETED" : "TASK_REOPENED",
      details: `${completed ? "Completed" : "Reopened"} task: "${taskTitle}"`,
      actorId: employee.id,
      targetUserId: employee.id,
      targetTeamId: employee.teamId || undefined,
    });

    revalidatePath("/employee");
    revalidatePath("/employee/tasks");
    revalidatePath("/employee/activity");
    revalidatePath("/manager/activity");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update task state.");
  }
}

/**
 * Retrieves the activity logs strictly scoped to this employee.
 */
export async function getEmployeeActivityLogsAction(params?: {
  page?: number;
  pageSize?: number;
  actionFilter?: string;
}): Promise<{
  success: boolean;
  logs?: EmployeeActivityLog[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}> {
  try {
    const employee = await requireEmployeeSession({ redirect: false });

    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 15));
    const actionFilter = params?.actionFilter?.trim();

    const perimeter = {
      OR: [
        { actorId: employee.id },
        { targetUserId: employee.id },
      ],
    };

    const where = {
      AND: [
        perimeter,
        actionFilter && actionFilter !== "ALL" ? { action: actionFilter } : {},
      ],
    };

    const [totalCount, rawLogs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, name: true, email: true } },
          targetTeam: { select: { id: true, name: true } },
        },
      }),
    ]);

    const logs: EmployeeActivityLog[] = rawLogs.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      targetTeam: a.targetTeam,
    }));

    return {
      success: true,
      logs,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      currentPage: page,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load activity logs.");
  }
}
