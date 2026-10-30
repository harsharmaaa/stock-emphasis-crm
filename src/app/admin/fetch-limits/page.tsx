import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getFetchLimitRulesAction,
  getFetchLimitFormDataAction,
} from "@/src/features/fetch-limits/actions";
import { FetchLimitsClient } from "@/src/features/fetch-limits/fetch-limits-client";

export const instant = false;

export const metadata = {
  title: "Fetch Limit Management | Stock Emphasis CRM",
  description: "Configure employee lead self-fetch thresholds, single-request lead limits, and request quotas.",
};

export default async function AdminFetchLimitsPage() {
  await requireAdminSession();

  const [rulesRes, formDataRes] = await Promise.all([
    getFetchLimitRulesAction(),
    getFetchLimitFormDataAction(),
  ]);

  return (
    <FetchLimitsClient
      initialRules={rulesRes.rules ?? []}
      profiles={formDataRes.data?.profiles ?? []}
      employees={formDataRes.data?.employees ?? []}
      leadSources={formDataRes.data?.leadSources ?? []}
    />
  );
}

