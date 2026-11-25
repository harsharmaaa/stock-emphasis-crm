import { requireAdminSession } from "@/src/lib/auth-guard";
import { getLeadOperationsBootstrapAction } from "@/src/features/lead-operations/actions";
import { LeadOperationsClient } from "@/src/features/lead-operations/lead-operations-client";

export const instant = false;

export const metadata = {
  title: "Lead Operations | Stock Emphasis CRM",
  description: "Bulk lead reassignment, recycling, filtering, disposing, deletion, and export operations.",
};

export default async function LeadOperationsPage() {
  await requireAdminSession();

  const res = await getLeadOperationsBootstrapAction();

  const bootstrapData = res.data ?? {
    profiles: [],
    employees: [],
    leadSources: [],
    leadResponses: [],
  };

  return <LeadOperationsClient bootstrapData={bootstrapData} />;
}
