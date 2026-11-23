"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";

export type GraphType = "Individual" | "Team";

export interface EmployeeGraphConfigItem {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: GraphType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileOption {
  id: string;
  name: string;
  departmentName?: string;
}

export interface GraphPerformerData {
  id: string;
  name: string;
  profileName: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsCount: number;
  metricValue: number;
}

export interface GraphConfigWithData extends EmployeeGraphConfigItem {
  performers: GraphPerformerData[];
}

const SETTING_KEY = "EMPLOYEE_GRAPH_CONFIGS";
const SETTING_CATEGORY = "DASHBOARD_CONFIG";

// Default seed records matching Screenshot (189).png
const DEFAULT_GRAPH_CONFIGS: EmployeeGraphConfigItem[] = [
  {
    id: "graph_seed_1",
    title: "Best TL",
    profile: "TL",
    size: 5,
    type: "Individual",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "graph_seed_2",
    title: "Best SBA",
    profile: "SBA",
    size: 5,
    type: "Individual",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "graph_seed_3",
    title: "Best BAT",
    profile: "BAT",
    size: 5,
    type: "Individual",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "graph_seed_4",
    title: "Best BA",
    profile: "BA",
    size: 5,
    type: "Individual",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "graph_seed_5",
    title: "Best AFM",
    profile: "AFM",
    size: 5,
    type: "Team",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function loadPersistedConfigs(): Promise<EmployeeGraphConfigItem[]> {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (!record || !record.value) {
      return DEFAULT_GRAPH_CONFIGS;
    }
    const parsed = JSON.parse(record.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as EmployeeGraphConfigItem[];
    }
    return DEFAULT_GRAPH_CONFIGS;
  } catch {
    return DEFAULT_GRAPH_CONFIGS;
  }
}

async function savePersistedConfigs(configs: EmployeeGraphConfigItem[]): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: {
      key: SETTING_KEY,
      value: JSON.stringify(configs),
      category: SETTING_CATEGORY,
      description: "Employee and Team graph configurations for executive dashboard",
    },
    update: {
      value: JSON.stringify(configs),
      category: SETTING_CATEGORY,
      updatedAt: new Date(),
    },
  });
}

/**
 * Fetch all employee graph configurations and real DB telemetry
 */
export async function getEmployeeGraphsAction(): Promise<{
  success: boolean;
  configs?: GraphConfigWithData[];
  profiles?: ProfileOption[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    // Fetch raw configs, profiles, users, teams, leads, and payments in parallel
    const [configsRaw, dbProfiles, users, teams, leadCounts, approvedPayments] = await Promise.all([
      loadPersistedConfigs(),
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          role: true,
          employeeTarget: true,
          teamId: true,
          employeeProfile: { select: { id: true, name: true } },
          ledTeams: { select: { id: true, name: true } },
        },
      }),
      prisma.team.findMany({
        select: {
          id: true,
          name: true,
          leader: { select: { id: true, name: true } },
          members: { select: { id: true, employeeTarget: true } },
          leads: { select: { id: true } },
        },
      }),
      prisma.lead.groupBy({
        by: ["allotToId"],
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: { status: "APPROVED" },
        select: {
          amount: true,
          leadOwnerId: true,
          teamId: true,
          lead: { select: { allotToId: true, teamId: true } },
        },
      }),
    ]);

    // Build lead counts map
    const leadCountMap = new Map<string, number>();
    for (const item of leadCounts) {
      if (item.allotToId) {
        leadCountMap.set(item.allotToId, item._count._all);
      }
    }

    // Build employee sales map
    const userSalesMap = new Map<string, number>();
    for (const p of approvedPayments) {
      const ownerId = p.leadOwnerId || p.lead?.allotToId;
      if (ownerId) {
        userSalesMap.set(ownerId, (userSalesMap.get(ownerId) || 0) + Number(p.amount));
      }
    }

    // Format profiles list, ensuring AFM is also presented if not in DB
    const profileOptions: ProfileOption[] = dbProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      departmentName: p.department.name,
    }));
    if (!profileOptions.some((p) => p.name.toUpperCase() === "AFM")) {
      profileOptions.push({
        id: "profile_afm_default",
        name: "AFM",
        departmentName: "Area Floor Management",
      });
    }

    // Attach real DB performer metrics to each graph config
    const configsWithData: GraphConfigWithData[] = configsRaw.map((config) => {
      let performers: GraphPerformerData[] = [];

      if (config.type === "Team") {
        // Team-level telemetry (e.g. AFM / Teams)
        performers = teams.map((t) => {
          const memberIds = new Set(t.members.map((m) => m.id));
          let teamSales = 0;
          for (const p of approvedPayments) {
            if (p.teamId === t.id || p.lead?.teamId === t.id || (p.leadOwnerId && memberIds.has(p.leadOwnerId))) {
              teamSales += Number(p.amount);
            }
          }
          const target = t.members.reduce((acc, m) => acc + (m.employeeTarget || 0), 0);
          const achieved = teamSales;
          const achievementPercent =
            target > 0 ? Math.round((achieved / target) * 100) : achieved > 0 ? 100 : 0;
          const leadsCount = t.leads.length;
          const metricValue = achieved > 0 ? achieved : target > 0 ? target : leadsCount * 1000;

          return {
            id: t.id,
            name: t.leader?.name || t.name,
            profileName: `Team ${t.name}`,
            targetAmount: target,
            achievedAmount: achieved,
            achievementPercent,
            leadsCount,
            metricValue,
          };
        });
      } else {
        // Individual-level telemetry (TL, SBA, BAT, BA, etc.)
        const profUpper = config.profile.trim().toUpperCase();

        const candidateUsers = users.filter((u) => {
          const uProf = u.employeeProfile?.name?.toUpperCase() || "";
          if (profUpper === "TL") {
            return (
              u.ledTeams.length > 0 ||
              u.role === "MANAGER" ||
              uProf.includes("TL") ||
              uProf.includes("LEAD") ||
              uProf.includes("MANAGER")
            );
          }
          if (profUpper === "SBA") {
            return uProf.includes("SBA") || uProf.includes("STL") || uProf.includes("SENIOR");
          }
          if (profUpper === "BAT") {
            return uProf.includes("BAT") || uProf.includes("TRAINEE") || uProf.includes("CA");
          }
          if (profUpper === "BA") {
            return (
              (uProf.includes("BA") && !uProf.includes("SBA") && !uProf.includes("BAT")) ||
              u.role === "EMPLOYEE"
            );
          }
          return uProf === profUpper || u.name.toUpperCase().includes(profUpper);
        });

        const usersToMap = candidateUsers.length > 0 ? candidateUsers : users.filter((u) => u.role !== "ADMIN");

        performers = usersToMap.map((u) => {
          const target = u.employeeTarget || 0;
          const achieved = userSalesMap.get(u.id) || 0;
          const achievementPercent =
            target > 0 ? Math.round((achieved / target) * 100) : achieved > 0 ? 100 : 0;
          const leadsCount = leadCountMap.get(u.id) || 0;
          const metricValue = achieved > 0 ? achieved : target > 0 ? target : leadsCount * 1000;

          return {
            id: u.id,
            name: u.name,
            profileName: u.employeeProfile?.name || u.role,
            targetAmount: target,
            achievedAmount: achieved,
            achievementPercent,
            leadsCount,
            metricValue,
          };
        });
      }

      // Sort descending by performance and slice to configured Size
      performers.sort((a, b) => b.metricValue - a.metricValue || b.leadsCount - a.leadsCount);
      const topCount = Math.max(1, config.size || 5);

      return {
        ...config,
        performers: performers.slice(0, topCount),
      };
    });

    return {
      success: true,
      configs: configsWithData,
      profiles: profileOptions,
    };
  } catch (err) {
    return handleActionError(err, "Failed to retrieve employee graph configurations.");
  }
}

/**
 * Create or update an employee graph configuration
 */
export async function saveEmployeeGraphConfigAction(input: {
  id?: string;
  title: string;
  profile: string;
  size: number;
  type: GraphType;
}): Promise<{
  success: boolean;
  config?: EmployeeGraphConfigItem;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const title = input.title?.trim();
    const profile = input.profile?.trim();
    const size = Math.max(1, Math.min(50, Number(input.size) || 5));
    const type = input.type === "Team" ? "Team" : "Individual";

    if (!title) {
      return { success: false, error: "Graph Title is required." };
    }
    if (!profile) {
      return { success: false, error: "Target Profile is required." };
    }

    const currentConfigs = await loadPersistedConfigs();
    let updatedItem: EmployeeGraphConfigItem;

    if (input.id) {
      // Edit existing
      const existingIdx = currentConfigs.findIndex((c) => c.id === input.id);
      if (existingIdx === -1) {
        return { success: false, error: "Configuration not found to update." };
      }
      updatedItem = {
        ...currentConfigs[existingIdx],
        title,
        profile,
        size,
        type,
        updatedAt: new Date().toISOString(),
      };
      currentConfigs[existingIdx] = updatedItem;
    } else {
      // Create new
      updatedItem = {
        id: `graph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        profile,
        size,
        type,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentConfigs.push(updatedItem);
    }

    await savePersistedConfigs(currentConfigs);

    return {
      success: true,
      config: updatedItem,
    };
  } catch (err) {
    return handleActionError(err, "Failed to save graph configuration.");
  }
}

/**
 * Toggle active status of a graph configuration
 */
export async function toggleEmployeeGraphStatusAction(id: string): Promise<{
  success: boolean;
  isActive?: boolean;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const currentConfigs = await loadPersistedConfigs();
    const targetIdx = currentConfigs.findIndex((c) => c.id === id);
    if (targetIdx === -1) {
      return { success: false, error: "Configuration not found." };
    }

    const newStatus = !currentConfigs[targetIdx].isActive;
    currentConfigs[targetIdx].isActive = newStatus;
    currentConfigs[targetIdx].updatedAt = new Date().toISOString();

    await savePersistedConfigs(currentConfigs);

    return {
      success: true,
      isActive: newStatus,
    };
  } catch (err) {
    return handleActionError(err, "Failed to toggle graph configuration status.");
  }
}

/**
 * Delete a graph configuration
 */
export async function deleteEmployeeGraphConfigAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const currentConfigs = await loadPersistedConfigs();
    const filtered = currentConfigs.filter((c) => c.id !== id);

    if (filtered.length === currentConfigs.length) {
      return { success: false, error: "Configuration not found to delete." };
    }

    await savePersistedConfigs(filtered);

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to delete graph configuration.");
  }
}
