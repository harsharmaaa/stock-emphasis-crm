import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getLeadsAction,
  getLeadAllotmentUsersAction,
} from "@/src/features/leads/actions";
import { normalizeStatusFilter } from "@/src/lib/utils";
import { LeadsListClient } from "@/src/features/leads/leads-list-client";

export const instant = false;

export const metadata = {
  title: "Leads Directory | Stock Emphasis CRM",
  description: "Governance, review, and allotment of prospect leads across sales teams.",
};

interface AdminLeadsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    leadId?: string;
  }>;
}

export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  await requireAdminSession();

  const resolvedParams = await searchParams;
  const pageNum = parseInt(resolvedParams.page || "1", 10) || 1;
  const search = resolvedParams.search || "";
  const rawStatus = resolvedParams.status || "ALL";
  const normalizedStatus = normalizeStatusFilter(rawStatus) || "ALL";

  const [leadsRes, usersRes] = await Promise.all([
    getLeadsAction({
      page: pageNum,
      pageSize: 15,
      search,
      status: normalizedStatus,
    }),
    getLeadAllotmentUsersAction(),
  ]);

  const initialLeads = leadsRes.success && leadsRes.leads ? leadsRes.leads : [];
  const initialTotalCount = leadsRes.totalCount ?? 0;
  const initialTotalPages = leadsRes.totalPages ?? 1;
  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];

  return (
    <LeadsListClient
      initialLeads={initialLeads}
      initialTotalCount={initialTotalCount}
      initialTotalPages={initialTotalPages}
      initialStatus={normalizedStatus}
      initialSearch={search}
      initialPage={pageNum}
      initialLeadId={resolvedParams.leadId}
      allotmentUsers={allotmentUsers}
    />
  );
}
