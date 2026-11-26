import { Suspense } from "react";
import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getManagerTrialHistoryAction,
  getManagerTrialHistoryFiltersAction,
  type TrialHistoryItem,
  type GetTrialHistoryFilterOptions,
} from "@/src/features/manager/trial-history-actions";
import { TrialHistoryClient } from "@/src/features/manager/trial-history-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Trial History | Admin Console",
  description: "View and filter client free trial subscriptions across the organization.",
};

interface AdminTrialHistoryPageProps {
  searchParams?: Promise<{
    profile?: string;
    employeeId?: string;
    leadSource?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
    sortBy?: "createdAt" | "clientName" | "productName" | "startDate" | "endDate" | "status";
    sortOrder?: "asc" | "desc";
    page?: string;
    pageSize?: string;
  }>;
}

function AdminTrialHistoryLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-[#4F6DF5]" />
        <span className="text-xs font-medium">Loading trial history...</span>
      </div>
    </div>
  );
}

async function AdminTrialHistoryLoader({ searchParams }: AdminTrialHistoryPageProps) {
  await requireAdminSession();

  const resolvedParams = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(resolvedParams.pageSize) || 10));

  const [filtersRes, trialsRes] = await Promise.all([
    getManagerTrialHistoryFiltersAction(),
    getManagerTrialHistoryAction({
      profile: resolvedParams.profile,
      employeeId: resolvedParams.employeeId,
      leadSource: resolvedParams.leadSource,
      teamId: resolvedParams.teamId,
      fromDate: resolvedParams.fromDate,
      toDate: resolvedParams.toDate,
      status: resolvedParams.status,
      search: resolvedParams.search,
      sortBy: resolvedParams.sortBy,
      sortOrder: resolvedParams.sortOrder,
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
      basePath="/admin/history/trials"
      initialParams={{
        profile: resolvedParams.profile,
        employeeId: resolvedParams.employeeId,
        leadSource: resolvedParams.leadSource,
        teamId: resolvedParams.teamId,
        fromDate: resolvedParams.fromDate,
        toDate: resolvedParams.toDate,
        status: resolvedParams.status,
        search: resolvedParams.search,
        sortBy: resolvedParams.sortBy,
        sortOrder: resolvedParams.sortOrder,
      }}
    />
  );
}

export default function AdminTrialHistoryPage(props: AdminTrialHistoryPageProps) {
  return (
    <Suspense fallback={<AdminTrialHistoryLoadingSkeleton />}>
      <AdminTrialHistoryLoader {...props} />
    </Suspense>
  );
}
