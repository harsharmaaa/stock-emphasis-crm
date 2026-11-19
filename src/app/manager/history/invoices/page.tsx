import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getManagerInvoiceHistoryAction,
  getManagerInvoiceHistoryFiltersAction,
  type InvoiceHistoryItem,
  type GetInvoiceHistoryFilterOptions,
} from "@/src/features/manager/invoice-history-actions";
import { InvoiceHistoryClient } from "@/src/features/manager/invoice-history-client";

export const instant = false;

export const metadata = {
  title: "Invoice History | Manager Portal",
  description: "Supervise client billing records, service durations, tax breakdown, and invoices across your team.",
};

interface ManagerInvoiceHistoryPageProps {
  searchParams: Promise<{
    profile?: string;
    employeeId?: string;
    productId?: string;
    teamId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const VALID_SORT_COLUMNS = [
  "invoiceDate",
  "totalAmount",
  "serialNo",
  "clientName",
  "status",
  "createdAt",
] as const;

export default async function ManagerInvoiceHistoryPage({
  searchParams,
}: ManagerInvoiceHistoryPageProps) {
  await requireManagerSession();

  const resolvedParams = await searchParams;

  const profile = resolvedParams.profile || undefined;
  const employeeId = resolvedParams.employeeId || undefined;
  const productId = resolvedParams.productId || undefined;
  const teamId = resolvedParams.teamId || undefined;
  const status = resolvedParams.status || undefined;
  const fromDate = resolvedParams.fromDate || undefined;
  const toDate = resolvedParams.toDate || undefined;
  const search = resolvedParams.search ? resolvedParams.search.trim() : undefined;

  const rawSortBy = resolvedParams.sortBy as (typeof VALID_SORT_COLUMNS)[number] | undefined;
  const sortBy = rawSortBy && VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : "invoiceDate";
  const sortOrder = resolvedParams.sortOrder === "asc" ? "asc" : "desc";

  const page = resolvedParams.page ? Math.max(1, parseInt(resolvedParams.page, 10) || 1) : 1;
  const pageSize = resolvedParams.pageSize
    ? Math.max(1, Math.min(100, parseInt(resolvedParams.pageSize, 10) || 10))
    : 10;

  // Run filter options query and initial invoice list query in parallel
  const [filtersRes, invoicesRes] = await Promise.all([
    getManagerInvoiceHistoryFiltersAction(),
    getManagerInvoiceHistoryAction({
      profile,
      employeeId,
      productId,
      teamId,
      status,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
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
      initialParams={{
        profile,
        employeeId,
        productId,
        teamId,
        status,
        fromDate,
        toDate,
        search,
        sortBy,
        sortOrder,
      }}
    />
  );
}
