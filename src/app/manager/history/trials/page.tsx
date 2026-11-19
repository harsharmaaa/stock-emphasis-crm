import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getManagerTrialHistoryAction,
  getManagerTrialHistoryFiltersAction,
  type TrialHistoryItem,
  type GetTrialHistoryFilterOptions,
} from "@/src/features/manager/trial-history-actions";
import { TrialHistoryClient } from "@/src/features/manager/trial-history-client";

export const instant = false;

export const metadata = {
  title: "Trial History | Manager Portal",
  description: "View and filter client free trial subscriptions across your team.",
};

interface ManagerTrialHistoryPageProps {
  searchParams: Promise<{
    profile?: string;
    employeeId?: string;
    leadSource?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const VALID_SORT_COLUMNS = [
  "createdAt",
  "clientName",
  "productName",
  "startDate",
  "endDate",
  "status",
] as const;

export default async function ManagerTrialHistoryPage({
  searchParams,
}: ManagerTrialHistoryPageProps) {
  await requireManagerSession();

  const resolvedParams = await searchParams;

  const profile = resolvedParams.profile || undefined;
  const employeeId = resolvedParams.employeeId || undefined;
  const leadSource = resolvedParams.leadSource || undefined;
  const teamId = resolvedParams.teamId || undefined;
  const fromDate = resolvedParams.fromDate || undefined;
  const toDate = resolvedParams.toDate || undefined;
  const status = resolvedParams.status || undefined;
  const search = resolvedParams.search ? resolvedParams.search.trim() : undefined;

  const rawSortBy = resolvedParams.sortBy as (typeof VALID_SORT_COLUMNS)[number] | undefined;
  const sortBy = rawSortBy && VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : "createdAt";
  const sortOrder = resolvedParams.sortOrder === "asc" ? "asc" : "desc";

  const page = resolvedParams.page ? Math.max(1, parseInt(resolvedParams.page, 10) || 1) : 1;
  const pageSize = resolvedParams.pageSize
    ? Math.max(1, Math.min(100, parseInt(resolvedParams.pageSize, 10) || 10))
    : 10;

  // Run filter options query and initial trial list query in parallel
  const [filtersRes, trialsRes] = await Promise.all([
    getManagerTrialHistoryFiltersAction(),
    getManagerTrialHistoryAction({
      profile,
      employeeId,
      leadSource,
      teamId,
      fromDate,
      toDate,
      status,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
  ]);

  const defaultFilters: GetTrialHistoryFilterOptions = {
    profiles: [],
    employees: [],
    leadSources: [],
    teams: [],
  };

  const initialFilters = filtersRes.success && filtersRes.filters ? filtersRes.filters : defaultFilters;
  const initialTrials: TrialHistoryItem[] = trialsRes.success && trialsRes.trials ? trialsRes.trials : [];
  const initialTotalCount = trialsRes.totalCount ?? 0;
  const initialTotalPages = trialsRes.totalPages ?? 1;

  return (
    <TrialHistoryClient
      initialTrials={initialTrials}
      initialFilters={initialFilters}
      initialTotalCount={initialTotalCount}
      initialTotalPages={initialTotalPages}
      initialPage={page}
      initialPageSize={pageSize}
      initialParams={{
        profile,
        employeeId,
        leadSource,
        teamId,
        fromDate,
        toDate,
        status,
        search,
        sortBy,
        sortOrder,
      }}
    />
  );
}
