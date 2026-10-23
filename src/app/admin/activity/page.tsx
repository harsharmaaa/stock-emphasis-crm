import { requireAdminSession } from "@/src/lib/auth-guard";
import { getActivityLogsAction } from "@/src/features/activity/actions";
import { ActivityLogClient } from "@/src/features/activity/activity-log-client";

export const instant = false;

export const metadata = {
  title: "Activity Log | Stock Emphasis CRM",
  description: "Comprehensive audit trail documenting administrative operations and role assignments.",
};

export default async function AdminActivityPage() {
  await requireAdminSession();

  const data = await getActivityLogsAction({ page: 1, pageSize: 15 });

  return (
    <ActivityLogClient
      initialLogs={data.logs ?? []}
      initialTotalCount={data.totalCount ?? 0}
      initialTotalPages={data.totalPages ?? 1}
    />
  );
}
