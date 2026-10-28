import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { Role } from "@prisma/client";

export interface AuthenticatedAdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Server-side security guard for Server Components and Server Actions.
 * Validates that an active session exists, the account is active in the database,
 * and belongs strictly to an ADMIN.
 */
export async function requireAdminSession(options?: {
  redirect?: boolean;
}): Promise<AuthenticatedAdminUser> {
  await connection();
  const session = await auth();

  const shouldRedirect = options?.redirect ?? true;

  if (!session?.user?.id || !session?.user?.email) {
    if (!shouldRedirect) {
      throw new Error("Unauthorized: Active session required.");
    }
    redirect("/login");
  }

  const { id, name, email, role } = session.user;

  if (role !== "ADMIN") {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Administrator privileges required.");
    }
    if (role === "MANAGER") {
      redirect("/manager");
    } else {
      redirect("/employee");
    }
  }

  // Real-time database verification: ensure user exists, is active, and remains ADMIN
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive || dbUser.role !== "ADMIN") {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Administrator privileges required or account is inactive.");
    }
    redirect("/login");
  }

  return {
    id,
    name: name ?? "Administrator",
    email,
    role: dbUser.role,
  };
}

export interface AuthenticatedManagerUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Server-side security guard for Manager Server Components and Server Actions.
 * Validates that an active session exists, the account is active in the database,
 * and belongs to a MANAGER (or ADMIN for management oversight).
 */
export async function requireManagerSession(options?: {
  redirect?: boolean;
}): Promise<AuthenticatedManagerUser> {
  await connection();
  const session = await auth();

  const shouldRedirect = options?.redirect ?? true;

  if (!session?.user?.id || !session?.user?.email) {
    if (!shouldRedirect) {
      throw new Error("Unauthorized: Active session required.");
    }
    redirect("/login");
  }

  const { id, name, email, role } = session.user;

  if (role !== "MANAGER" && role !== "ADMIN") {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Manager privileges required.");
    }
    redirect("/employee");
  }

  // Real-time database verification: ensure user exists, is active, and is MANAGER (or ADMIN)
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive) {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Account is inactive or does not exist.");
    }
    redirect("/login");
  }

  if (dbUser.role !== "MANAGER" && dbUser.role !== "ADMIN") {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Manager privileges required.");
    }
    redirect(dbUser.role === "EMPLOYEE" ? "/employee" : "/login");
  }

  return {
    id,
    name: name ?? "Operations Manager",
    email,
    role: dbUser.role,
  };
}

export interface AuthenticatedEmployeeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  managerId: string | null;
}

/**
 * Server-side security guard for Employee Server Components and Server Actions.
 * Validates that an active session exists, the account is active in the database,
 * and belongs to an EMPLOYEE (or ADMIN/MANAGER for staff oversight).
 */
export async function requireEmployeeSession(options?: {
  redirect?: boolean;
}): Promise<AuthenticatedEmployeeUser> {
  await connection();
  const session = await auth();

  const shouldRedirect = options?.redirect ?? true;

  if (!session?.user?.id || !session?.user?.email) {
    if (!shouldRedirect) {
      throw new Error("Unauthorized: Active session required.");
    }
    redirect("/login");
  }

  const { id, name, email } = session.user;

  // Real-time database verification: ensure user exists and is active
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, teamId: true, managerId: true },
  });

  if (!dbUser || !dbUser.isActive) {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Account is inactive or does not exist.");
    }
    redirect("/login");
  }

  if (dbUser.role !== "EMPLOYEE" && dbUser.role !== "ADMIN" && dbUser.role !== "MANAGER") {
    if (!shouldRedirect) {
      throw new Error("Forbidden: Employee workspace access required.");
    }
    redirect("/login");
  }

  return {
    id,
    name: name ?? "Warehouse Employee",
    email,
    role: dbUser.role,
    teamId: dbUser.teamId,
    managerId: dbUser.managerId,
  };
}

/**
 * Validates safety rules for modifying user status or role:
 * 1. An Admin cannot deactivate their own account.
 * 2. An Admin cannot demote their own role away from ADMIN.
 * 3. Deactivating or demoting another Admin cannot leave 0 active Admins in the database.
 */
export async function validateAdminSafety({
  currentAdminId,
  targetUserId,
  newRole,
  newIsActive,
}: {
  currentAdminId: string;
  targetUserId: string;
  newRole?: Role;
  newIsActive?: boolean;
}): Promise<{ safe: boolean; error?: string }> {
  const isTargetSelf = currentAdminId === targetUserId;

  // 1. Prevent self-deactivation
  if (isTargetSelf && newIsActive === false) {
    return {
      safe: false,
      error: "Security restriction: You cannot deactivate your own active Administrator account.",
    };
  }

  // 2. Prevent self-demotion
  if (isTargetSelf && newRole !== undefined && newRole !== "ADMIN") {
    return {
      safe: false,
      error: "Security restriction: You cannot demote your own Administrator role.",
    };
  }

  // 3. If target user is an Admin, ensure at least one other active Admin remains
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, isActive: true },
  });

  if (!targetUser) {
    return { safe: false, error: "Target user account not found." };
  }

  const willBeInactiveOrNonAdmin =
    (targetUser.role === "ADMIN" && newRole !== undefined && newRole !== "ADMIN") ||
    (targetUser.role === "ADMIN" && newIsActive === false);

  if (willBeInactiveOrNonAdmin) {
    const activeAdminsCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        NOT: { id: targetUserId },
      },
    });

    if (activeAdminsCount < 1) {
      return {
        safe: false,
        error:
          "Security restriction: System requires at least one active Administrator. Deactivating or demoting this account is prohibited.",
      };
    }
  }

  return { safe: true };
}

/**
 * Normalizes Server Action error responses:
 * 1. Re-throws Next.js redirect and notFound exceptions so they are never swallowed.
 * 2. Preserves expected authorization / permission messages.
 * 3. Sanitizes unexpected database and internal exceptions into safe generic messages.
 */
export function handleActionError(
  err: unknown,
  defaultMessage: string
): { success: false; error: string } {
  // Never swallow Next.js internal control-flow exceptions (redirects, not-found, prerender postponement)
  if (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string"
  ) {
    const digest = (err as { digest: string }).digest;
    if (
      digest.startsWith("NEXT_") ||
      digest === "HANGING_PROMISE_REJECTION" ||
      digest === "CLIENT_HOOK_DYNAMIC" ||
      digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw err;
    }
  }

  // Preserve intentional authorization / permission error messages
  if (
    err instanceof Error &&
    (err.message.startsWith("Unauthorized:") || err.message.startsWith("Forbidden:"))
  ) {
    return { success: false, error: err.message };
  }

  // Log unexpected internal database / server error securely on server
  console.error(`[ACTION_ERROR] ${defaultMessage}:`, err);

  return { success: false, error: defaultMessage };
}
