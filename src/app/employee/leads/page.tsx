import { requireEmployeeSession } from "@/src/lib/auth-guard";
import {
  getEmployeeLeadsAction,
  getEmployeeLeadFilterOptionsAction,
} from "@/src/features/employee/lead-actions";
import { EmployeeLeadsClient } from "@/src/features/employee/employee-leads-client";
import { normalizeStatusFilter } from "@/src/lib/utils";

export const instant = false;

export const metadata = {
  title: "My Assigned Leads | Employee Portal",
  description: "View and manage assigned prospective leads, call dispositions, and customer conversions.",
};

interface EmployeeLeadsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    q?: string;
  }>;
}

export default async function EmployeeLeadsPage({
  searchParams,
}: EmployeeLeadsPageProps) {
  await requireEmployeeSession();

  const resolvedParams = await searchParams;
  const rawStatus = resolvedParams.status || "ALL";
  const normalizedStatus = normalizeStatusFilter(rawStatus) || "ALL";
  const search = (resolvedParams.search || resolvedParams.q || "").trim();

  // Fetch paginated leads (pageSize: 25) and filter options in parallel
  const [leadsRes, filterOptionsRes] = await Promise.all([
    getEmployeeLeadsAction({
      status: normalizedStatus !== "ALL" ? normalizedStatus : undefined,
      search: search || undefined,
      pageSize: 25,
    }),
    getEmployeeLeadFilterOptionsAction(),
  ]);

  const initialLeads = leadsRes.success && leadsRes.leads ? leadsRes.leads : [];
  const statusCounts = leadsRes.statusCounts;
  const initialFilterOptions = filterOptionsRes.success
    ? filterOptionsRes.options
    : undefined;

  return (
    <EmployeeLeadsClient
      key={`${normalizedStatus}-${search}`}
      initialLeads={initialLeads}
      initialStatus={normalizedStatus}
      initialSearch={search}
      initialStatusCounts={statusCounts}
      initialFilterOptions={initialFilterOptions}
    />
  );
}
