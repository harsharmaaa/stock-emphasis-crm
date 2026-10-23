import { requireAdminSession } from "@/src/lib/auth-guard";
import { getTeamsAction } from "@/src/features/teams/actions";
import { TeamsManagementClient } from "@/src/features/teams/teams-management-client";

export const instant = false;

export const metadata = {
  title: "Teams Management | Stock Emphasis CRM",
  description: "Organize teams, assign department leaders, and manage employee hierarchies.",
};

export default async function AdminTeamsPage() {
  await requireAdminSession();

  const data = await getTeamsAction();

  return (
    <TeamsManagementClient
      initialTeams={data.teams ?? []}
      initialManagers={data.managers ?? []}
      initialEmployees={data.employees ?? []}
    />
  );
}
