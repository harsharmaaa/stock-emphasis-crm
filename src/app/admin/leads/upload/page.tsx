import { requireAdminSession } from "@/src/lib/auth-guard";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import {
  getLeadAllotmentUsersAction,
  getDetailedLeadSourceCountsAction,
} from "@/src/features/leads/actions";
import { UploadLeadsClient } from "@/src/features/leads/upload-leads-client";

export const instant = false;

export const metadata = {
  title: "Upload Leads | Stock Emphasis CRM",
  description: "Bulk import prospect leads via CSV mapping and auto-allocate to personnel.",
};

export default async function AdminUploadLeadsPage() {
  await requireAdminSession();

  const [usersRes, countsRes, activeSources] = await Promise.all([
    getLeadAllotmentUsersAction(),
    getDetailedLeadSourceCountsAction(),
    getActiveLeadSourceNames(),
  ]);

  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];
  const initialCounts = countsRes.success && countsRes.counts
    ? countsRes.counts
    : { total: {}, unassigned: {} };

  return (
    <UploadLeadsClient
      allotmentUsers={allotmentUsers}
      initialCounts={initialCounts}
      activeSources={activeSources}
    />
  );
}
