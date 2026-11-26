import { Suspense } from "react";
import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getManagerPaymentHistoryAction,
  getManagerPaymentHistoryFiltersAction,
  type PaymentHistoryItem,
  type GetPaymentHistoryFilterOptions,
} from "@/src/features/manager/payment-history-actions";
import { PaymentHistoryClient } from "@/src/features/manager/payment-history-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment History | Manager Portal",
  description: "View verified client collection transactions, payment methods, and billing ledger across your team.",
};

interface ManagerPaymentHistoryPageProps {
  searchParams?: Promise<{
    fromDate?: string;
    toDate?: string;
    status?: string;
    leadAddedById?: string;
    paymentAddedById?: string;
    leadOwnerId?: string;
    teamId?: string;
    paymentModeId?: string;
    leadSource?: string;
    invoiceId?: string;
    paymentType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const VALID_SORT_COLUMNS = [
  "paymentDate",
  "amount",
  "status",
  "clientName",
  "serialNo",
  "invoiceNumber",
  "createdAt",
] as const;

function ManagerPaymentHistoryLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading payment records...</span>
      </div>
    </div>
  );
}

async function ManagerPaymentHistoryLoader({ searchParams }: ManagerPaymentHistoryPageProps) {
  await requireManagerSession();

  const resolvedParams = searchParams ? await searchParams : {};

  const fromDate = resolvedParams.fromDate || undefined;
  const toDate = resolvedParams.toDate || undefined;
  const status = resolvedParams.status || undefined;
  const leadAddedById = resolvedParams.leadAddedById || undefined;
  const paymentAddedById = resolvedParams.paymentAddedById || undefined;
  const leadOwnerId = resolvedParams.leadOwnerId || undefined;
  const teamId = resolvedParams.teamId || undefined;
  const paymentModeId = resolvedParams.paymentModeId || undefined;
  const leadSource = resolvedParams.leadSource || undefined;
  const invoiceId = resolvedParams.invoiceId ? resolvedParams.invoiceId.trim() : undefined;
  const paymentType = resolvedParams.paymentType || undefined;
  const search = resolvedParams.search ? resolvedParams.search.trim() : undefined;

  const rawSortBy = resolvedParams.sortBy as (typeof VALID_SORT_COLUMNS)[number] | undefined;
  const sortBy = rawSortBy && VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : "paymentDate";
  const sortOrder = resolvedParams.sortOrder === "asc" ? "asc" : "desc";

  const page = resolvedParams.page ? Math.max(1, parseInt(resolvedParams.page, 10) || 1) : 1;
  const pageSize = resolvedParams.pageSize
    ? Math.max(1, Math.min(100, parseInt(resolvedParams.pageSize, 10) || 10))
    : 10;

  // Run filter options query and initial payment list query in parallel
  const [filtersRes, paymentsRes] = await Promise.all([
    getManagerPaymentHistoryFiltersAction(),
    getManagerPaymentHistoryAction({
      fromDate,
      toDate,
      status,
      leadAddedById,
      paymentAddedById,
      leadOwnerId,
      teamId,
      paymentModeId,
      leadSource,
      invoiceId,
      paymentType,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
  ]);

  const defaultFilters: GetPaymentHistoryFilterOptions = {
    statuses: [],
    users: [],
    teams: [],
    paymentModes: [],
    leadSources: [],
    paymentTypes: [],
  };

  const initialFilters = filtersRes.success && filtersRes.filters ? filtersRes.filters : defaultFilters;
  const initialPayments: PaymentHistoryItem[] = paymentsRes.success && paymentsRes.payments ? paymentsRes.payments : [];
  const initialTotalCount = paymentsRes.totalCount ?? 0;
  const initialTotalPages = paymentsRes.totalPages ?? 1;
  const initialTotalAmount = paymentsRes.totalAmount ?? 0;
  const initialUniqueClientCount = paymentsRes.uniqueClientCount ?? 0;

  return (
    <PaymentHistoryClient
      initialPayments={initialPayments}
      initialFilters={initialFilters}
      initialTotalCount={initialTotalCount}
      initialTotalPages={initialTotalPages}
      initialPage={page}
      initialPageSize={pageSize}
      initialTotalAmount={initialTotalAmount}
      initialUniqueClientCount={initialUniqueClientCount}
      initialParams={{
        fromDate,
        toDate,
        status,
        leadAddedById,
        paymentAddedById,
        leadOwnerId,
        teamId,
        paymentModeId,
        leadSource,
        invoiceId,
        paymentType,
        search,
        sortBy,
        sortOrder,
      }}
    />
  );
}

export default function ManagerPaymentHistoryPage({ searchParams }: ManagerPaymentHistoryPageProps) {
  return (
    <Suspense fallback={<ManagerPaymentHistoryLoadingSkeleton />}>
      <ManagerPaymentHistoryLoader searchParams={searchParams} />
    </Suspense>
  );
}
