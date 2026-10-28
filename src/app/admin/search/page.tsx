import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  searchLeadsWithLifecycleAction,
  getLeadAllotmentUsersAction,
} from "@/src/features/leads/actions";
import { AdminSearchClient } from "@/src/features/leads/admin-search-client";

export const instant = false;

export const metadata = {
  title: "Global Search | Stock Emphasis CRM",
  description: "Dynamic lead lifecycle header mapping and timeline interface.",
};

interface AdminSearchPageProps {
  searchParams: Promise<{
    q?: string;
    leadId?: string;
    status?: string;
  }>;
}

export default async function AdminSearchPage({
  searchParams,
}: AdminSearchPageProps) {
  await requireAdminSession();

  const resolved = await searchParams;
  const query = resolved.q || "";
  const leadId = resolved.leadId || "";
  const status = resolved.status || "";

  const [searchRes, usersRes] = await Promise.all([
    searchLeadsWithLifecycleAction(query, status, leadId),
    getLeadAllotmentUsersAction(),
  ]);

  const leads = searchRes.success ? searchRes.leads : [];
  const statusCounts = searchRes.success
    ? searchRes.statusCounts
    : {
        UNREAD: 0,
        READ: 0,
        FOLLOW_UP: 0,
        TRIAL: 0,
        CLIENT: 0,
        DISPOSED: 0,
        DELETED: 0,
        AVAILABLE: 0,
      };
  const activeStatusKey = searchRes.activeStatusKey || "READ";
  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];

  return (
    <AdminSearchClient
      initialQuery={query}
      initialLeads={leads}
      initialStatusCounts={statusCounts}
      initialActiveStatusKey={activeStatusKey}
      allotmentUsers={allotmentUsers}
      initialSelectedLeadId={leadId || undefined}
    />
  );
}
