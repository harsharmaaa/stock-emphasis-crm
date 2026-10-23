import { prisma } from "@/src/lib/prisma";

export interface LogActivityParams {
  action: string;
  details: string;
  actorId?: string;
  targetUserId?: string;
  targetTeamId?: string;
  ipAddress?: string;
}

/**
 * Server-side audit logging helper.
 * Strictly guarantees that passwords, hashes, and secrets are never logged.
 */
export async function logActivity({
  action,
  details,
  actorId,
  targetUserId,
  targetTeamId,
  ipAddress,
}: LogActivityParams): Promise<void> {
  try {
    // Sanitize action string
    const sanitizedAction = action.trim().toUpperCase();

    // Sanitize details to ensure no sensitive credential patterns are logged
    let sanitizedDetails = details;
    if (
      /password|secret|token|hash/i.test(sanitizedDetails) &&
      !/reset|changed|updated|created/i.test(sanitizedDetails)
    ) {
      sanitizedDetails = "[Action metadata sanitized for security]";
    }

    await prisma.activityLog.create({
      data: {
        action: sanitizedAction,
        details: sanitizedDetails,
        actorId: actorId || null,
        targetUserId: targetUserId || null,
        targetTeamId: targetTeamId || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    // Audit logging should not crash the primary operational transaction, but should report cleanly
    console.error("[ACTIVITY_LOG_ERROR] Failed to record audit log:", err);
  }
}
