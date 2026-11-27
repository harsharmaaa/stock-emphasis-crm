import { Suspense } from "react";
import { requireEmployeeSession } from "@/src/lib/auth-guard";
import { getEmployeeDashboardStep1Action } from "@/src/features/employee/dashboard-actions";
import { EmployeeOverviewClient } from "@/src/features/employee/employee-overview-client";
import EmployeeOverviewLoading from "./loading";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Employee Overview | Stock Emphasis CRM",
  description: "Personal sales performance, assigned client collections, and real-time operational lead metrics.",
};

async function EmployeeDashboardContent() {
  await requireEmployeeSession();
  const result = await getEmployeeDashboardStep1Action();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load personal overview</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve employee metrics."}
        </p>
      </div>
    );
  }

  return <EmployeeOverviewClient initialData={result.data} />;
}

export default function EmployeeOverviewPage() {
  return (
    <Suspense fallback={<EmployeeOverviewLoading />}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
