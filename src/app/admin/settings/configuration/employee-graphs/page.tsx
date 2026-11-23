import { requireAdminSession } from "@/src/lib/auth-guard";
import { getEmployeeGraphsAction } from "@/src/features/employee-graphs/actions";
import { EmployeeGraphsClient } from "@/src/features/employee-graphs/employee-graphs-client";

export const instant = false;

export const metadata = {
  title: "Employee Graph Settings | Stock Emphasis CRM",
  description: "Configure leaderboard tiers, profile cohorts, and display sizes for executive graphs.",
};

export default async function EmployeeGraphsPage() {
  await requireAdminSession();

  const res = await getEmployeeGraphsAction();

  return (
    <EmployeeGraphsClient
      initialConfigs={res.configs ?? []}
      profiles={res.profiles ?? []}
    />
  );
}
