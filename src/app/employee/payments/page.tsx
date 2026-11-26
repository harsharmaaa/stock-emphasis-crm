import { Suspense } from "react";
import { requireEmployeeSession } from "@/src/lib/auth-guard";
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
  title: "My Payments | Staff Workspace",
  description: "View submitted client payment collections, verification statuses, and billing receipts.",
};

interface EmployeePaymentPageProps {
  searchParams?: Promise<{
    fromDate?: string;
    toDate?: string;
    status?: string;
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

function EmployeePaymentLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <span className="text-xs font-medium">Loading your payment records...</span>
      </div>
    </div>
  );
}

async function EmployeePaymentLoader({ searchParams }: EmployeePaymentPageProps) {
  await requireEmployeeSession();

  const resolvedParams = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(resolvedParams.pageSize) || 10));

  const [filtersRes, paymentsRes] = await Promise.all([
    getPaymentHistoryFiltersAction(),
    getPaymentHistoryAction({
      fromDate: resolvedParams.fromDate,
      toDate: resolvedParams.toDate,
      status: resolvedParams.status,
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
      basePath="/employee/payments"
      initialParams={{
        fromDate: resolvedParams.fromDate,
        toDate: resolvedParams.toDate,
        status: resolvedParams.status,
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

export default function EmployeePaymentPage({ searchParams }: EmployeePaymentPageProps) {
  return (
    <Suspense fallback={<EmployeePaymentLoadingSkeleton />}>
      <EmployeePaymentLoader searchParams={searchParams} />
    </Suspense>
  );
}
