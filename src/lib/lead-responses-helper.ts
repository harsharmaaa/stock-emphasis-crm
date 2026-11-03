import { prisma } from "@/src/lib/prisma";

/**
 * Centralized server-side helper to retrieve all ACTIVE Lead Response names from the database.
 * Strictly respects Admin configuration:
 * - Does NOT use a hardcoded fallback list when empty.
 * - An empty master returns an empty array `[]`.
 * - Only isActive: true responses are returned for new assignments/dropdowns.
 */
export async function getActiveLeadResponseNames(): Promise<string[]> {
  try {
    const responses = await prisma.leadResponse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    });
    return responses.map((r) => r.name);
  } catch (err) {
    console.error("[GET_ACTIVE_LEAD_RESPONSES_ERROR]", err);
    return [];
  }
}

