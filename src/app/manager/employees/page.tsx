import { getManagerEmployeesAction } from "@/src/features/manager/actions";
import { ManagerEmployeesClient } from "@/src/features/manager/manager-employees-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Direct Reports | Stock Emphasis CRM",
  description: "Supervised employee personnel, account status, and department assignment overview.",
};

export default async function ManagerEmployeesPage() {
  const result = await getManagerEmployeesAction();

  if (!result.success || !result.employees) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load subordinate staff</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve employee records."}
        </p>
      </div>
    );
  }

  return <ManagerEmployeesClient initialEmployees={result.employees} />;
}
