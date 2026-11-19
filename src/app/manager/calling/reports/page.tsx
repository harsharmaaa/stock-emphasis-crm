import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getManagerCallReportAction,
  getManagerCallReportFiltersAction,
  type CallReportItem,
  type GetCallReportFilterOptions,
} from "@/src/features/manager/call-report-actions";
import { CallReportClient } from "@/src/features/manager/call-report-client";

export const instant = false;

export const metadata = {
  title: "Call Report | Manager Portal",
  description: "Agent call performance, duration, and disposition metrics across your team.",
};

interface ManagerCallReportPageProps {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    employeeId?: string;
    teamId?: string;
    extension?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const VALID_SORT_COLUMNS = [
  "name",
  "ext",
  "outgoingCalls",
  "outgoingTimeSeconds",
  "incomingCalls",
  "incomingTimeSeconds",
  "totalCalls",
  "totalTimeSeconds",
] as const;

export default async function ManagerCallReportPage({
  searchParams,
}: ManagerCallReportPageProps) {
  await requireManagerSession();

  const resolvedParams = await searchParams;

  const fromDate = resolvedParams.fromDate || undefined;
  const toDate = resolvedParams.toDate || undefined;
  const employeeId = resolvedParams.employeeId || undefined;
  const teamId = resolvedParams.teamId || undefined;
  const extension = resolvedParams.extension || undefined;
  const search = resolvedParams.search ? resolvedParams.search.trim() : undefined;

  const rawSortBy = resolvedParams.sortBy as (typeof VALID_SORT_COLUMNS)[number] | undefined;
  const sortBy = rawSortBy && VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : "totalCalls";
  const sortOrder = resolvedParams.sortOrder === "asc" ? "asc" : "desc";

  const page = resolvedParams.page ? Math.max(1, parseInt(resolvedParams.page, 10) || 1) : 1;
  const pageSize = resolvedParams.pageSize
    ? Math.max(1, Math.min(100, parseInt(resolvedParams.pageSize, 10) || 10))
    : 10;

  // Run filter options query and initial call report aggregation in parallel
  const [filtersRes, reportRes] = await Promise.all([
    getManagerCallReportFiltersAction(),
    getManagerCallReportAction({
      fromDate,
      toDate,
      employeeId,
      teamId,
      extension,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
  ]);

  const defaultFilters: GetCallReportFilterOptions = {
    employees: [],
    teams: [],
    extensions: [],
  };

  const initialFilters = filtersRes.success && filtersRes.filters ? filtersRes.filters : defaultFilters;
  const initialRecords: CallReportItem[] = reportRes.success && reportRes.records ? reportRes.records : [];
  const initialTotalCount = reportRes.totalCount ?? 0;
  const initialTotalPages = reportRes.totalPages ?? 1;
  const initialSummary = reportRes.summary ?? {
    totalOutgoingCalls: 0,
    totalIncomingCalls: 0,
    totalCalls: 0,
    totalDurationSeconds: 0,
    totalDurationFormatted: "00:00:00",
  };

  return (
    <CallReportClient
      initialRecords={initialRecords}
      initialFilters={initialFilters}
      initialTotalCount={initialTotalCount}
      initialTotalPages={initialTotalPages}
      initialPage={page}
      initialPageSize={pageSize}
      initialSummary={initialSummary}
      initialParams={{
        fromDate,
        toDate,
        employeeId,
        teamId,
        extension,
        search,
        sortBy,
        sortOrder,
      }}
    />
  );
}
