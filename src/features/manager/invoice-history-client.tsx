"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  InvoiceHistoryItem,
  GetInvoiceHistoryFilterOptions,
} from "./invoice-history-actions";
import { getManagerInvoiceHistoryAction } from "./invoice-history-actions";
import {
  Search,
  RotateCcw,
  Calendar,
  Users,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Mail,
  X,
  CreditCard,
  Building,
} from "lucide-react";

interface InvoiceHistoryClientProps {
  initialInvoices: InvoiceHistoryItem[];
  initialFilters: GetInvoiceHistoryFilterOptions;
  initialTotalCount: number;
  initialTotalPages: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalAmount: number;
  initialUniqueClientCount: number;
  initialParams: {
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
  };
}

type SortColumn =
  | "invoiceDate"
  | "totalAmount"
  | "serialNo"
  | "clientName"
  | "status"
  | "createdAt";

export function InvoiceHistoryClient({
  initialInvoices,
  initialFilters,
  initialTotalCount,
  initialTotalPages,
  initialPage,
  initialPageSize,
  initialTotalAmount,
  initialUniqueClientCount,
  initialParams,
}: InvoiceHistoryClientProps) {
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>(initialInvoices);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalAmount, setTotalAmount] = useState<number>(initialTotalAmount);
  const [uniqueClientCount, setUniqueClientCount] = useState<number>(initialUniqueClientCount);

  // Selected invoice for read-only detail drawer / modal
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceHistoryItem | null>(null);

  // Filters
  const [profile, setProfile] = useState<string>(initialParams.profile || "");
  const [employeeId, setEmployeeId] = useState<string>(initialParams.employeeId || "");
  const [productId, setProductId] = useState<string>(initialParams.productId || "");
  const [teamId, setTeamId] = useState<string>(initialParams.teamId || "");
  const [status, setStatus] = useState<string>(initialParams.status || "");
  const [fromDate, setFromDate] = useState<string>(initialParams.fromDate || "");
  const [toDate, setToDate] = useState<string>(initialParams.toDate || "");
  const [search, setSearch] = useState<string>(initialParams.search || "");

  // Sorting
  const [sortBy, setSortBy] = useState<SortColumn>(initialParams.sortBy || "invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialParams.sortOrder || "desc");

  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    profile || employeeId || productId || teamId || status || fromDate || toDate || search
  );

  const executeFetch = (overrides: {
    profile?: string;
    employeeId?: string;
    productId?: string;
    teamId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    sortBy?: SortColumn;
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) => {
    const targetProfile = overrides.profile !== undefined ? overrides.profile : profile;
    const targetEmp = overrides.employeeId !== undefined ? overrides.employeeId : employeeId;
    const targetProd = overrides.productId !== undefined ? overrides.productId : productId;
    const targetTeam = overrides.teamId !== undefined ? overrides.teamId : teamId;
    const targetStatus = overrides.status !== undefined ? overrides.status : status;
    const targetFrom = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
    const targetTo = overrides.toDate !== undefined ? overrides.toDate : toDate;
    const targetSearch = overrides.search !== undefined ? overrides.search : search;
    const targetSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const targetSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const targetPage = overrides.page !== undefined ? overrides.page : currentPage;
    const targetPageSize = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;

    // Sync URL search params
    const params = new URLSearchParams();
    if (targetProfile) params.set("profile", targetProfile);
    if (targetEmp) params.set("employeeId", targetEmp);
    if (targetProd) params.set("productId", targetProd);
    if (targetTeam) params.set("teamId", targetTeam);
    if (targetStatus) params.set("status", targetStatus);
    if (targetFrom) params.set("fromDate", targetFrom);
    if (targetTo) params.set("toDate", targetTo);
    if (targetSearch) params.set("search", targetSearch);
    if (targetSortBy) params.set("sortBy", targetSortBy);
    if (targetSortOrder) params.set("sortOrder", targetSortOrder);
    if (targetPage > 1) params.set("page", String(targetPage));
    if (targetPageSize !== 10) params.set("pageSize", String(targetPageSize));

    router.replace(`/manager/history/invoices?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerInvoiceHistoryAction({
        profile: targetProfile || undefined,
        employeeId: targetEmp || undefined,
        productId: targetProd || undefined,
        teamId: targetTeam || undefined,
        status: targetStatus || undefined,
        fromDate: targetFrom || undefined,
        toDate: targetTo || undefined,
        search: targetSearch || undefined,
        sortBy: targetSortBy,
        sortOrder: targetSortOrder,
        page: targetPage,
        pageSize: targetPageSize,
      });

      if (res.success && res.invoices) {
        setInvoices(res.invoices);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || 1);
        setTotalAmount(res.totalAmount || 0);
        setUniqueClientCount(res.uniqueClientCount || 0);
      }
    });
  };

  const handleClearFilters = () => {
    setProfile("");
    setEmployeeId("");
    setProductId("");
    setTeamId("");
    setStatus("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setCurrentPage(1);

    executeFetch({
      profile: "",
      employeeId: "",
      productId: "",
      teamId: "",
      status: "",
      fromDate: "",
      toDate: "",
      search: "",
      page: 1,
    });
  };

  const handleSort = (column: SortColumn) => {
    const nextOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    executeFetch({ sortBy: column, sortOrder: nextOrder, page: 1 });
  };

  const renderSortIndicator = (column: SortColumn) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors ml-1" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1" />
    );
  };

  const renderStatusBadge = (statusStr: string) => {
    const normalized = statusStr.toLowerCase();
    if (normalized.includes("approved")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shadow-sm">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    }
    if (normalized.includes("running")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60 shadow-sm">
          <Clock className="w-3 h-3" />
          Running
        </span>
      );
    }
    if (normalized.includes("pending")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 shadow-sm">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    if (normalized.includes("cancel") || normalized.includes("reject")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 shadow-sm">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm">
        {statusStr}
      </span>
    );
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate pagination items
  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (typeof p === "string") {
        return (
          <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 select-none">
            ...
          </span>
        );
      }
      const isActive = p === currentPage;
      return (
        <button
          key={`page-${p}`}
          type="button"
          onClick={() => {
            if (p !== currentPage) {
              setCurrentPage(p);
              executeFetch({ page: p });
            }
          }}
          disabled={isPending}
          className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg transition-all ${
            isActive
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            INVOICE HISTORY
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise client billing records, service durations, tax breakdown, and invoices across your team.
          </p>
        </div>
      </div>

      {/* Top Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-center">
          {/* 1. Profile */}
          <div>
            <select
              value={profile}
              onChange={(e) => {
                setProfile(e.target.value);
                executeFetch({ profile: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Profile ---</option>
              {initialFilters.profiles.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Employee */}
          <div>
            <select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                executeFetch({ employeeId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Employee ---</option>
              {initialFilters.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product */}
          <div>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                executeFetch({ productId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Product ---</option>
              {initialFilters.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Team */}
          <div>
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                executeFetch({ teamId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Team ---</option>
              {initialFilters.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                executeFetch({ status: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Status ---</option>
              {initialFilters.statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 6. From Date */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                executeFetch({ fromDate: e.target.value, page: 1 });
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              title="From Invoice Date"
            />
          </div>

          {/* 7. To Date & Reset Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  executeFetch({ toDate: e.target.value, page: 1 });
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                title="To Invoice Date"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  executeFetch({ search, page: 1 });
                }
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400">=</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const nextSize = parseInt(e.target.value, 10);
                setPageSize(nextSize);
                executeFetch({ pageSize: nextSize, page: 1 });
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-medium"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold select-none">
                <th
                  onClick={() => handleSort("serialNo")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Serial No</span>
                    {renderSortIndicator("serialNo")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("clientName")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Client</span>
                    {renderSortIndicator("clientName")}
                  </div>
                </th>
                <th className="py-3 px-3">Pan/DOB</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Duration</th>
                <th
                  onClick={() => handleSort("invoiceDate")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Date</span>
                    {renderSortIndicator("invoiceDate")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalAmount")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Total</span>
                    {renderSortIndicator("totalAmount")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Created By</span>
                    {renderSortIndicator("createdAt")}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No invoice records found
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        There are currently no client billing or invoice receipts recorded matching the selected filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    {/* Serial No */}
                    <td className="py-3 px-3 font-mono font-medium text-[11px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {inv.serialNo}
                    </td>

                    {/* Client */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.clientName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {inv.clientMobile}
                      </div>
                      {inv.clientEmail && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {inv.clientEmail}
                        </div>
                      )}
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            inv.mailStatus === "Mail Sent"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                              : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          }`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                          {inv.mailStatus}
                        </span>
                      </div>
                    </td>

                    {/* Pan/DOB */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        {inv.pan || "—"}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {inv.dob || "—"}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {inv.productName}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {inv.planType}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {inv.durationLabel}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {inv.startDate && inv.endDate ? (
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">
                          <span>{inv.startDate}</span>
                          <span className="text-slate-400 mx-1">to</span>
                          <span>{inv.endDate}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">
                          {inv.invoiceDate}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        Inv: {inv.invoiceDate}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{inv.totalAmount.toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(inv.status)}
                    </td>

                    {/* Created By */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {inv.createdByName}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {inv.invoiceDate}
                      </div>
                    </td>

                    {/* Read-Only Action: View Details */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewingInvoice(inv)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        title="View Invoice Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Row */}
        {invoices.length > 0 && (
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Users className="w-3.5 h-3.5" />
                <span>{uniqueClientCount} Client{uniqueClientCount !== 1 ? "s" : ""}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Total = ₹{totalAmount.toLocaleString("en-IN")}</span>
              </span>
            </div>
          </div>
        )}

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {startRecord} to {endRecord} of {totalCount} entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            {/* Previous */}
            <button
              type="button"
              onClick={() => {
                if (currentPage > 1) {
                  const prev = currentPage - 1;
                  setCurrentPage(prev);
                  executeFetch({ page: prev });
                }
              }}
              disabled={currentPage <= 1 || isPending}
              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page buttons */}
            {renderPaginationButtons()}

            {/* Next */}
            <button
              type="button"
              onClick={() => {
                if (currentPage < totalPages) {
                  const next = currentPage + 1;
                  setCurrentPage(next);
                  executeFetch({ page: next });
                }
              }}
              disabled={currentPage >= totalPages || isPending}
              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Read-Only Invoice Details Modal / Drawer */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Invoice Details
                </h3>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  {viewingInvoice.serialNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Client Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {viewingInvoice.clientName}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Mobile Number</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {viewingInvoice.clientMobile}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">PAN Card</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {viewingInvoice.pan || "N/A"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {viewingInvoice.dob || "N/A"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Product</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {viewingInvoice.productName}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Plan / Duration</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {viewingInvoice.planType} ({viewingInvoice.durationLabel})
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Invoice Date</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {viewingInvoice.invoiceDate}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block mb-0.5">Status</span>
                <div>{renderStatusBadge(viewingInvoice.status)}</div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Base Amount</span>
                <span>₹{viewingInvoice.baseAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST (18%)</span>
                <span>₹{viewingInvoice.gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{viewingInvoice.totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Attribution */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Created by: <strong className="text-slate-700 dark:text-slate-300">{viewingInvoice.createdByName}</strong></span>
              {viewingInvoice.teamName && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {viewingInvoice.teamName}
                </span>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
