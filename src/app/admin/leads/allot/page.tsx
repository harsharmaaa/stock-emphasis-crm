import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getLeadAllotmentUsersAction,
  getLeadSourceCountsAction,
} from "@/src/features/leads/actions";
import { AllotLeadsClient } from "@/src/features/leads/allot-leads-client";

export const instant = false;

export const metadata = {
  title: "Allot Leads | Stock Emphasis CRM",
  description: "Bulk allocate unassigned prospect leads to sales and advisory personnel.",
};

export default async function AdminAllotLeadsPage() {
  await requireAdminSession();

  const [usersRes, countsRes] = await Promise.all([
    getLeadAllotmentUsersAction(),
    getLeadSourceCountsAction({ unassignedOnly: true }),
  ]);

  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];
  const sourceCounts = countsRes.success && countsRes.counts ? countsRes.counts : {};

  return (
    <AllotLeadsClient
      allotmentUsers={allotmentUsers}
      initialSourceCounts={sourceCounts}
    />
  );
}

