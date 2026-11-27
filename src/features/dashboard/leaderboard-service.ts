import { prisma } from "@/src/lib/prisma";

export interface PerformerBarItem {
  id: string;
  name: string;
  profileName: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsHandled: number;
  metricValue: number;
}

export interface ConfiguredLeaderboardSection {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: "Individual" | "Team";
  items: PerformerBarItem[];
}

interface SavedConfigItem {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: "Individual" | "Team";
  isActive: boolean;
}

const DEFAULT_GRAPH_CONFIGS: SavedConfigItem[] = [
  { id: "graph_seed_1", title: "Top Best TL", profile: "TL", size: 5, type: "Individual", isActive: true },
  { id: "graph_seed_2", title: "Top Best SBA", profile: "SBA", size: 5, type: "Individual", isActive: true },
  { id: "graph_seed_3", title: "Top Best BAT", profile: "BAT", size: 5, type: "Individual", isActive: true },
  { id: "graph_seed_4", title: "Top Best BA", profile: "BA", size: 5, type: "Individual", isActive: true },
  { id: "graph_seed_5", title: "Top Team Best AFM", profile: "AFM", size: 5, type: "Team", isActive: true },
];

/**
 * Normalizes graph titles so that legacy seed titles like "Best TL" render as "Top Best TL"
 * while preserving custom titles like "Top Team Best AFM".
 */
export function normalizeLeaderboardTitle(rawTitle: string): string {
  const trimmed = (rawTitle || "").trim();
  if (!trimmed) return "Top Performers";
  if (/^top\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Top ${trimmed}`;
}

/**
 * Fetches company-wide best performers for each active Admin-configured profile graph
 * in EMPLOYEE_GRAPH_CONFIGS based strictly on current-month real approved collections.
 *
 * Rules:
 * - Shared across Admin, Manager, and Employee (all see the company-wide top performers)
 * - Current-month payments only (status: APPROVED, paymentDate between startOfMonth and endOfMonth)
 * - Zero synthetic/fake fallbacks (no leadsHandled * 1000 or targetAmt stand-ins)
 * - Dynamic sorting: highest real approved achievement rises to the top
 */
export async function getSharedLeaderboardsData(
  startOfMonth: Date,
  endOfMonth: Date
): Promise<ConfiguredLeaderboardSection[]> {
  const [savedGraphConfigsRaw, employeesList, teamsList, approvedPaymentsMonthlyRaw, leadCountsRaw] =
    await Promise.all([
      prisma.systemSetting.findUnique({
        where: { key: "EMPLOYEE_GRAPH_CONFIGS" },
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
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          id: true,
          amount: true,
          leadOwnerId: true,
          teamId: true,
        },
      }),
      prisma.lead.groupBy({
        by: ["allotToId"],
        _count: { _all: true },
      }),
    ]);

  // Parse admin configured profile graphs
  let parsedConfigs: SavedConfigItem[] = DEFAULT_GRAPH_CONFIGS;
  if (savedGraphConfigsRaw?.value) {
    try {
      const parsed = JSON.parse(savedGraphConfigsRaw.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedConfigs = parsed;
      }
    } catch {
      parsedConfigs = DEFAULT_GRAPH_CONFIGS;
    }
  }

  const activeConfigs = parsedConfigs.filter((c) => c.isActive !== false);

  // Map approved monthly collections per employee
  const employeeSalesMap = new Map<string, number>();
  for (const p of approvedPaymentsMonthlyRaw) {
    if (p.leadOwnerId) {
      employeeSalesMap.set(
        p.leadOwnerId,
        (employeeSalesMap.get(p.leadOwnerId) || 0) + Number(p.amount)
      );
    }
  }

  // Map total lead counts per employee
  const leadCountMap = new Map<string, number>();
  for (const item of leadCountsRaw) {
    if (item.allotToId) {
      leadCountMap.set(item.allotToId, item._count._all);
    }
  }

  // Evaluate performance for each company employee
  const allPerformers: PerformerBarItem[] = employeesList.map((emp) => {
    const targetAmt = emp.employeeTarget || 0;
    const achievedAmt = employeeSalesMap.get(emp.id) || 0;
    const leadsHandled = leadCountMap.get(emp.id) || 0;
    const achievementPercent =
      targetAmt > 0
        ? Math.round((achievedAmt / targetAmt) * 100)
        : achievedAmt > 0
        ? 100
        : 0;

    return {
      id: emp.id,
      name: emp.name,
      profileName: emp.employeeProfile?.name || null,
      targetAmount: targetAmt,
      achievedAmount: achievedAmt,
      achievementPercent,
      leadsHandled,
      metricValue: achievedAmt, // Pure real DB approved sales
    };
  });

  // Build each configured card
  const configuredCards: ConfiguredLeaderboardSection[] = activeConfigs.map((cfg) => {
    let items: PerformerBarItem[] = [];

    if (cfg.type?.toUpperCase() === "TEAM") {
      items = teamsList.map((t) => {
        const memberIds = new Set(t.members.map((m) => m.id));
        let teamAchieved = 0;
        for (const p of approvedPaymentsMonthlyRaw) {
          if (p.teamId === t.id || (p.leadOwnerId && memberIds.has(p.leadOwnerId))) {
            teamAchieved += Number(p.amount);
          }
        }
        const teamTarget = t.members.reduce((acc, m) => acc + (m.employeeTarget || 0), 0);
        const achievementPercent =
          teamTarget > 0
            ? Math.round((teamAchieved / teamTarget) * 100)
            : teamAchieved > 0
            ? 100
            : 0;
        const leadsCount = t.leads.length;

        return {
          id: t.id,
          name: t.leader?.name || t.name,
          profileName: `Team ${t.name}`,
          targetAmount: teamTarget,
          achievedAmount: teamAchieved,
          achievementPercent,
          leadsHandled: leadsCount,
          metricValue: teamAchieved,
        };
      });
    } else {
      const profUpper = (cfg.profile || "").trim().toUpperCase();

      const candidateUsers = allPerformers.filter((p) => {
        const emp = employeesList.find((e) => e.id === p.id);
        if (!emp) return false;
        const uProf = (emp.employeeProfile?.name || "").toUpperCase();

        if (profUpper === "TL") {
          return (
            emp.ledTeams.length > 0 ||
            emp.role === "MANAGER" ||
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
            emp.role === "EMPLOYEE"
          );
        }
        return uProf === profUpper || uProf.includes(profUpper) || emp.name.toUpperCase().includes(profUpper);
      });

      items = candidateUsers.length > 0 ? candidateUsers : allPerformers;
    }

    // Dynamic Monthly Sorting: Highest real approved achievement rises to top
    items = items
      .slice()
      .sort(
        (a, b) =>
          b.achievedAmount - a.achievedAmount ||
          b.achievementPercent - a.achievementPercent ||
          b.leadsHandled - a.leadsHandled
      )
      .slice(0, Math.max(1, cfg.size || 5));

    return {
      id: cfg.id,
      title: normalizeLeaderboardTitle(cfg.title),
      profile: cfg.profile,
      size: cfg.size,
      type: (cfg.type?.toUpperCase() === "TEAM" ? "Team" : "Individual") as "Individual" | "Team",
      items,
    };
  });

  return configuredCards;
}
