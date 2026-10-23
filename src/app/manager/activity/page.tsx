import { getManagerActivityLogsAction } from "@/src/features/manager/actions";
import { ManagerActivityClient } from "@/src/features/manager/manager-activity-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Operations Activity | Stock Emphasis CRM",
  description: "Audit trail documenting team assignments, member status changes, and supervisor actions.",
};

export default async function ManagerActivityPage() {
  const result = await getManagerActivityLogsAction({ page: 1, pageSize: 15 });

  if (!result.success || !result.logs) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load operations activity stream</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve activity entries."}
        </p>
      </div>
    );
  }

  return (
    <ManagerActivityClient
      initialLogs={result.logs}
      initialTotalCount={result.totalCount ?? 0}
      initialTotalPages={result.totalPages ?? 1}
    />
  );
}
