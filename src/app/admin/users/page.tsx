import { requireAdminSession } from "@/src/lib/auth-guard";
import { getUsersAction } from "@/src/features/users/actions";
import { UserManagementClient } from "@/src/features/users/user-management-client";

export const instant = false;

export const metadata = {
  title: "User Management | Stock Emphasis CRM",
  description: "Manage accounts, roles, credentials, and access permissions.",
};

export default async function AdminUsersPage() {
  const admin = await requireAdminSession();

  // Load initial page of users on server
  const initialData = await getUsersAction({ page: 1, pageSize: 10 });

  const users = initialData.data?.users ?? [];
  const totalCount = initialData.data?.totalCount ?? 0;
  const totalPages = initialData.data?.totalPages ?? 1;

  return (
    <UserManagementClient
      initialUsers={users}
      initialTotalCount={totalCount}
      initialTotalPages={totalPages}
      currentAdminId={admin.id}
    />
  );
}
