import { prisma } from "@/src/lib/prisma";

/**
 * Centralized server-side helper to retrieve all ACTIVE Lead Source names from the database.
 * Strictly respects Admin configuration:
 * - Does NOT use a hardcoded fallback list when empty.
 * - An empty master returns an empty array `[]`.
 * - Only isActive: true sources are returned for new assignments/dropdowns.
 */
export async function getActiveLeadSourceNames(): Promise<string[]> {
  try {
    const sources = await prisma.leadSource.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    });
    return sources.map((s) => s.name);
  } catch (err) {
    console.error("[GET_ACTIVE_LEAD_SOURCES_ERROR]", err);
    return [];
  }
}

