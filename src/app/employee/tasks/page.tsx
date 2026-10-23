import { getEmployeeTasksAction } from "@/src/features/employee/actions";
import { EmployeeTasksClient } from "@/src/features/employee/employee-tasks-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Tasks & Follow-ups | Stock Emphasis CRM",
  description: "Manage personal operational checklists, inspection tasks, and inventory audits.",
};

export default async function EmployeeTasksPage() {
  const result = await getEmployeeTasksAction();

  if (!result.success || !result.tasks) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load operational tasks</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve tasks."}
        </p>
      </div>
    );
  }

  return <EmployeeTasksClient initialTasks={result.tasks} />;
}
