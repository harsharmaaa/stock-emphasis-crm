import { Suspense } from "react";
import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getPaymentHistoryAction,
  getPaymentHistoryFiltersAction,
  type PaymentHistoryItem,
  type GetPaymentHistoryFilterOptions,
} from "@/src/features/payments/payment-history-actions";
import { PaymentHistoryClient } from "@/src/features/payments/payment-history-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment History | Admin Console",
  description: "Browse verified client collection transactions, payment methods, and ledger across the organization.",
};

interface AdminPaymentHistoryPageProps {
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
    sortBy?: "paymentDate" | "amount" | "status" | "clientName" | "serialNo" | "invoiceNumber" | "createdAt";
    sortOrder?: "asc" | "desc";
    page?: string;
    pageSize?: string;
  }>;
}

function AdminPaymentHistoryLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <span className="text-xs font-medium">Loading payment history...</span>
      </div>
    </div>
  );
}

async function AdminPaymentHistoryLoader({ searchParams }: AdminPaymentHistoryPageProps) {
  await requireAdminSession();

  const resolvedParams = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(resolvedParams.pageSize) || 10));

  const [filtersRes, paymentsRes] = await Promise.all([
    getPaymentHistoryFiltersAction(),
    getPaymentHistoryAction({
      fromDate: resolvedParams.fromDate,
      toDate: resolvedParams.toDate,
      status: resolvedParams.status,
      leadAddedById: resolvedParams.leadAddedById,
      paymentAddedById: resolvedParams.paymentAddedById,
      leadOwnerId: resolvedParams.leadOwnerId,
      teamId: resolvedParams.teamId,
      paymentModeId: resolvedParams.paymentModeId,
      leadSource: resolvedParams.leadSource,
      invoiceId: resolvedParams.invoiceId,
      paymentType: resolvedParams.paymentType,
      search: resolvedParams.search,
      sortBy: resolvedParams.sortBy,
      sortOrder: resolvedParams.sortOrder,
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
      basePath="/admin/history/payments"
      initialParams={{
        fromDate: resolvedParams.fromDate,
        toDate: resolvedParams.toDate,
        status: resolvedParams.status,
        leadAddedById: resolvedParams.leadAddedById,
        paymentAddedById: resolvedParams.paymentAddedById,
        leadOwnerId: resolvedParams.leadOwnerId,
        teamId: resolvedParams.teamId,
        paymentModeId: resolvedParams.paymentModeId,
        leadSource: resolvedParams.leadSource,
        invoiceId: resolvedParams.invoiceId,
        paymentType: resolvedParams.paymentType,
        search: resolvedParams.search,
        sortBy: resolvedParams.sortBy,
        sortOrder: resolvedParams.sortOrder,
      }}
    />
  );
}

export default function AdminPaymentHistoryPage({ searchParams }: AdminPaymentHistoryPageProps) {
  return (
    <Suspense fallback={<AdminPaymentHistoryLoadingSkeleton />}>
      <AdminPaymentHistoryLoader searchParams={searchParams} />
    </Suspense>
  );
}
