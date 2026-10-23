import { getManagerTeamsAction } from "@/src/features/manager/actions";
import { ManagerTeamsClient } from "@/src/features/manager/manager-teams-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Teams Led | Stock Emphasis CRM",
  description: "View department teams and allocated employee rosters under your operational leadership.",
};

export default async function ManagerTeamsPage() {
  const result = await getManagerTeamsAction();

  if (!result.success || !result.teams) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load department teams</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve your teams."}
        </p>
      </div>
    );
  }

  return <ManagerTeamsClient initialTeams={result.teams} />;
}
