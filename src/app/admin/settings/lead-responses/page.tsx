import { requireAdminSession } from "@/src/lib/auth-guard";
import { getLeadResponsesAction } from "@/src/features/lead-responses/actions";
import { LeadResponsesClient } from "@/src/features/lead-responses/lead-responses-client";

export const instant = false;

export const metadata = {
  title: "Lead Responses | Stock Emphasis CRM",
  description: "Configure conversational outcomes, response tags, and call disposition categories.",
};

export default async function LeadResponsesPage() {
  await requireAdminSession();

  const res = await getLeadResponsesAction();

  return <LeadResponsesClient initialResponses={res.leadResponses ?? []} />;
}

