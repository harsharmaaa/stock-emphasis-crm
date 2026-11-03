import { requireAdminSession } from "@/src/lib/auth-guard";
import { getLeadSourcesAction } from "@/src/features/lead-sources/actions";
import { LeadSourcesClient } from "@/src/features/lead-sources/lead-sources-client";

export const instant = false;

export const metadata = {
  title: "Lead Sources | Stock Emphasis CRM",
  description: "Configure marketing channels, lead origins, and authorized lead sources.",
};

export default async function LeadSourcesPage() {
  await requireAdminSession();

  const res = await getLeadSourcesAction();

  return <LeadSourcesClient initialSources={res.leadSources ?? []} />;
}

