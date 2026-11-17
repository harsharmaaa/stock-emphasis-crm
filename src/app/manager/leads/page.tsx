import { requireManagerSession } from "@/src/lib/auth-guard";
import { getManagerLeadsAction } from "@/src/features/manager/lead-actions";
import { ManagerLeadsClient } from "@/src/features/manager/manager-leads-client";
import { normalizeStatusFilter } from "@/src/lib/utils";

export const instant = false;

export const metadata = {
  title: "Team Leads | Manager Portal",
  description: "Supervise team-assigned prospective leads, calling dispositions, and conversion metrics.",
};

interface ManagerLeadsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    q?: string;
  }>;
}

export default async function ManagerLeadsPage({
  searchParams,
}: ManagerLeadsPageProps) {
  await requireManagerSession();

  const resolvedParams = await searchParams;
  const rawStatus = resolvedParams.status || "ALL";
  const normalizedStatus = normalizeStatusFilter(rawStatus) || "ALL";
  const search = (resolvedParams.search || resolvedParams.q || "").trim();

  // Fetch paginated manager leads (pageSize: 25) with server-computed status counts
  const leadsRes = await getManagerLeadsAction({
    status: normalizedStatus !== "ALL" ? normalizedStatus : undefined,
    search: search || undefined,
    pageSize: 25,
  });

  const initialLeads = leadsRes.success && leadsRes.leads ? leadsRes.leads : [];
  const statusCounts = leadsRes.statusCounts;

  return (
    <ManagerLeadsClient
      key={`${normalizedStatus}-${search}`}
      initialLeads={initialLeads}
      initialStatus={normalizedStatus}
      initialSearch={search}
      initialStatusCounts={statusCounts}
    />
  );
}
