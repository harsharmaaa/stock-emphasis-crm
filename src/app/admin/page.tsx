import { getAdminOverviewStep1Action } from "@/src/features/dashboard/actions";
import { AdminOverviewClient } from "@/src/features/dashboard/admin-overview-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Admin Overview | Stock Emphasis CRM",
  description: "Executive operations, financial milestones, and real-time CRM administration.",
};

export default async function AdminOverviewPage() {
  const result = await getAdminOverviewStep1Action();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load admin overview metrics</h3>
        <p className="text-xs text-rose-400 mt-1">{result.error}</p>
      </div>
    );
  }

  return <AdminOverviewClient initialData={result.data} />;
}
