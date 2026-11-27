import { Suspense } from "react";
import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getInvoiceHistoryAction,
  getInvoiceHistoryFiltersAction,
} from "@/src/features/invoices/invoice-history-actions";
import type {
  InvoiceHistoryItem,
  GetInvoiceHistoryFilterOptions,
} from "@/src/features/invoices/types";
import { InvoiceHistoryClient } from "@/src/features/invoices/invoice-history-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Invoice History | Manager Portal",
  description: "Supervise client billing records, service durations, tax breakdown, and invoices across your team.",
};

interface ManagerInvoiceHistoryPageProps {
  searchParams?: Promise<{
    profile?: string;
    employeeId?: string;
    productId?: string;
    teamId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    sortBy?: "invoiceDate" | "totalAmount" | "serialNo" | "clientName" | "status" | "createdAt";
    sortOrder?: "asc" | "desc";
    page?: string;
    pageSize?: string;
  }>;
}

function ManagerInvoiceHistoryLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="h-16 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800" />
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading team invoice history...</span>
      </div>
    </div>
  );
}

async function ManagerInvoiceHistoryLoader({ searchParams }: ManagerInvoiceHistoryPageProps) {
  await requireManagerSession();

  const resolvedParams = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(resolvedParams.pageSize) || 10));

  const [filtersRes, invoicesRes] = await Promise.all([
    getInvoiceHistoryFiltersAction("MANAGER"),
    getInvoiceHistoryAction(
      {
        profile: resolvedParams.profile,
        employeeId: resolvedParams.employeeId,
        productId: resolvedParams.productId,
        teamId: resolvedParams.teamId,
        status: resolvedParams.status,
        fromDate: resolvedParams.fromDate,
        toDate: resolvedParams.toDate,
        search: resolvedParams.search,
        sortBy: resolvedParams.sortBy,
        sortOrder: resolvedParams.sortOrder,
        page,
        pageSize,
      },
      "MANAGER"
    ),
  ]);

  const defaultFilters: GetInvoiceHistoryFilterOptions = {
    profiles: [],
    employees: [],
    products: [],
    teams: [],
    statuses: [],
  };

  const initialFilters = filtersRes.success && filtersRes.filters ? filtersRes.filters : defaultFilters;
  const initialInvoices: InvoiceHistoryItem[] = invoicesRes.success && invoicesRes.invoices ? invoicesRes.invoices : [];
  const initialTotalCount = invoicesRes.totalCount ?? 0;
  const initialTotalPages = invoicesRes.totalPages ?? 1;
  const initialTotalAmount = invoicesRes.totalAmount ?? 0;
  const initialUniqueClientCount = invoicesRes.uniqueClientCount ?? 0;
  const initialPendingCount = invoicesRes.pendingCount ?? 0;
  const initialApprovedCount = invoicesRes.approvedCount ?? 0;

  return (
    <InvoiceHistoryClient
      initialInvoices={initialInvoices}
      initialFilters={initialFilters}
      initialTotalCount={initialTotalCount}
      initialTotalPages={initialTotalPages}
      initialPage={page}
      initialPageSize={pageSize}
      initialTotalAmount={initialTotalAmount}
      initialUniqueClientCount={initialUniqueClientCount}
      initialPendingCount={initialPendingCount}
      initialApprovedCount={initialApprovedCount}
      initialParams={{
        profile: resolvedParams.profile,
        employeeId: resolvedParams.employeeId,
        productId: resolvedParams.productId,
        teamId: resolvedParams.teamId,
        status: resolvedParams.status,
        fromDate: resolvedParams.fromDate,
        toDate: resolvedParams.toDate,
        search: resolvedParams.search,
        sortBy: resolvedParams.sortBy,
        sortOrder: resolvedParams.sortOrder,
      }}
      portalRole="MANAGER"
      baseRoute="/manager/history/invoices"
    />
  );
}

export default function ManagerInvoiceHistoryPage({ searchParams }: ManagerInvoiceHistoryPageProps) {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <Suspense fallback={<ManagerInvoiceHistoryLoadingSkeleton />}>
        <ManagerInvoiceHistoryLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
