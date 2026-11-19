"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  PaymentHistoryItem,
  GetPaymentHistoryFilterOptions,
} from "./payment-history-actions";
import { getManagerPaymentHistoryAction } from "./payment-history-actions";
import {
  Search,
  RotateCcw,
  Calendar,
  Users,
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

interface PaymentHistoryClientProps {
  initialPayments: PaymentHistoryItem[];
  initialFilters: GetPaymentHistoryFilterOptions;
  initialTotalCount: number;
  initialTotalPages: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalAmount: number;
  initialUniqueClientCount: number;
  initialParams: {
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
  };
}

type SortColumn =
  | "paymentDate"
  | "amount"
  | "status"
  | "clientName"
  | "serialNo"
  | "invoiceNumber"
  | "createdAt";

export function PaymentHistoryClient({
  initialPayments,
  initialFilters,
  initialTotalCount,
  initialTotalPages,
  initialPage,
  initialPageSize,
  initialTotalAmount,
  initialUniqueClientCount,
  initialParams,
}: PaymentHistoryClientProps) {
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentHistoryItem[]>(initialPayments);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalAmount, setTotalAmount] = useState<number>(initialTotalAmount);
  const [uniqueClientCount, setUniqueClientCount] = useState<number>(initialUniqueClientCount);

  // Filters
  const [fromDate, setFromDate] = useState<string>(initialParams.fromDate || "");
  const [toDate, setToDate] = useState<string>(initialParams.toDate || "");
  const [status, setStatus] = useState<string>(initialParams.status || "");
  const [leadAddedById, setLeadAddedById] = useState<string>(initialParams.leadAddedById || "");
  const [paymentAddedById, setPaymentAddedById] = useState<string>(initialParams.paymentAddedById || "");
  const [leadOwnerId, setLeadOwnerId] = useState<string>(initialParams.leadOwnerId || "");
  const [teamId, setTeamId] = useState<string>(initialParams.teamId || "");
  const [paymentModeId, setPaymentModeId] = useState<string>(initialParams.paymentModeId || "");
  const [leadSource, setLeadSource] = useState<string>(initialParams.leadSource || "");
  const [invoiceId, setInvoiceId] = useState<string>(initialParams.invoiceId || "");
  const [paymentType, setPaymentType] = useState<string>(initialParams.paymentType || "");
  const [search, setSearch] = useState<string>(initialParams.search || "");

  // Sorting
  const [sortBy, setSortBy] = useState<SortColumn>(initialParams.sortBy || "paymentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialParams.sortOrder || "desc");

  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    fromDate ||
      toDate ||
      status ||
      leadAddedById ||
      paymentAddedById ||
      leadOwnerId ||
      teamId ||
      paymentModeId ||
      leadSource ||
      invoiceId ||
      paymentType ||
      search
  );

  const executeFetch = (overrides: {
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
    sortBy?: SortColumn;
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) => {
    const targetFrom = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
    const targetTo = overrides.toDate !== undefined ? overrides.toDate : toDate;
    const targetStatus = overrides.status !== undefined ? overrides.status : status;
    const targetLeadAdded = overrides.leadAddedById !== undefined ? overrides.leadAddedById : leadAddedById;
    const targetPaymentAdded = overrides.paymentAddedById !== undefined ? overrides.paymentAddedById : paymentAddedById;
    const targetLeadOwner = overrides.leadOwnerId !== undefined ? overrides.leadOwnerId : leadOwnerId;
    const targetTeam = overrides.teamId !== undefined ? overrides.teamId : teamId;
    const targetMode = overrides.paymentModeId !== undefined ? overrides.paymentModeId : paymentModeId;
    const targetSource = overrides.leadSource !== undefined ? overrides.leadSource : leadSource;
    const targetInvoice = overrides.invoiceId !== undefined ? overrides.invoiceId : invoiceId;
    const targetType = overrides.paymentType !== undefined ? overrides.paymentType : paymentType;
    const targetSearch = overrides.search !== undefined ? overrides.search : search;
    const targetSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const targetSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const targetPage = overrides.page !== undefined ? overrides.page : currentPage;
    const targetPageSize = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;

    // Sync URL search params
    const params = new URLSearchParams();
    if (targetFrom) params.set("fromDate", targetFrom);
    if (targetTo) params.set("toDate", targetTo);
    if (targetStatus) params.set("status", targetStatus);
    if (targetLeadAdded) params.set("leadAddedById", targetLeadAdded);
    if (targetPaymentAdded) params.set("paymentAddedById", targetPaymentAdded);
    if (targetLeadOwner) params.set("leadOwnerId", targetLeadOwner);
    if (targetTeam) params.set("teamId", targetTeam);
    if (targetMode) params.set("paymentModeId", targetMode);
    if (targetSource) params.set("leadSource", targetSource);
    if (targetInvoice) params.set("invoiceId", targetInvoice);
    if (targetType) params.set("paymentType", targetType);
    if (targetSearch) params.set("search", targetSearch);
    if (targetSortBy) params.set("sortBy", targetSortBy);
    if (targetSortOrder) params.set("sortOrder", targetSortOrder);
    if (targetPage > 1) params.set("page", String(targetPage));
    if (targetPageSize !== 10) params.set("pageSize", String(targetPageSize));

    router.replace(`/manager/history/payments?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerPaymentHistoryAction({
        fromDate: targetFrom || undefined,
        toDate: targetTo || undefined,
        status: targetStatus || undefined,
        leadAddedById: targetLeadAdded || undefined,
        paymentAddedById: targetPaymentAdded || undefined,
        leadOwnerId: targetLeadOwner || undefined,
        teamId: targetTeam || undefined,
        paymentModeId: targetMode || undefined,
        leadSource: targetSource || undefined,
        invoiceId: targetInvoice || undefined,
        paymentType: targetType || undefined,
        search: targetSearch || undefined,
        sortBy: targetSortBy,
        sortOrder: targetSortOrder,
        page: targetPage,
        pageSize: targetPageSize,
      });

      if (res.success && res.payments) {
        setPayments(res.payments);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || 1);
        setTotalAmount(res.totalAmount || 0);
        setUniqueClientCount(res.uniqueClientCount || 0);
      }
    });
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatus("");
    setLeadAddedById("");
    setPaymentAddedById("");
    setLeadOwnerId("");
    setTeamId("");
    setPaymentModeId("");
    setLeadSource("");
    setInvoiceId("");
    setPaymentType("");
    setSearch("");
    setCurrentPage(1);

    executeFetch({
      fromDate: "",
      toDate: "",
      status: "",
      leadAddedById: "",
      paymentAddedById: "",
      leadOwnerId: "",
      teamId: "",
      paymentModeId: "",
      leadSource: "",
      invoiceId: "",
      paymentType: "",
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
    if (normalized.includes("pending")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 shadow-sm">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    if (normalized.includes("reject")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 shadow-sm">
          <XCircle className="w-3 h-3" />
          Rejected
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
            PAYMENT HISTORY
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View verified client collection transactions, payment methods, and billing ledger across your team.
          </p>
        </div>
      </div>

      {/* Top Filter Card — 2 Rows Layout matching reference image */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-all">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {/* 1. From Date */}
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
              title="From Payment Date"
            />
          </div>

          {/* 2. Payment Status */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                executeFetch({ status: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Payment Status ---</option>
              {initialFilters.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lead Added By */}
          <div>
            <select
              value={leadAddedById}
              onChange={(e) => {
                setLeadAddedById(e.target.value);
                executeFetch({ leadAddedById: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Lead Added By ---</option>
              {initialFilters.users.map((u) => (
                <option key={`leadAdded-${u.id}`} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Payment Added By */}
          <div>
            <select
              value={paymentAddedById}
              onChange={(e) => {
                setPaymentAddedById(e.target.value);
                executeFetch({ paymentAddedById: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Payment Added By ---</option>
              {initialFilters.users.map((u) => (
                <option key={`paymentAdded-${u.id}`} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Lead Owner */}
          <div>
            <select
              value={leadOwnerId}
              onChange={(e) => {
                setLeadOwnerId(e.target.value);
                executeFetch({ leadOwnerId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Lead Owner ---</option>
              {initialFilters.users.map((u) => (
                <option key={`leadOwner-${u.id}`} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Team */}
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
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
          {/* 1. To Date */}
          <div className="relative">
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
              title="To Payment Date"
            />
          </div>

          {/* 2. Payment Mode */}
          <div>
            <select
              value={paymentModeId}
              onChange={(e) => {
                setPaymentModeId(e.target.value);
                executeFetch({ paymentModeId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Payment Mode ---</option>
              {initialFilters.paymentModes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lead Source */}
          <div>
            <select
              value={leadSource}
              onChange={(e) => {
                setLeadSource(e.target.value);
                executeFetch({ leadSource: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Lead Source ---</option>
              {initialFilters.leadSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Invoice Id */}
          <div className="relative">
            <input
              type="text"
              placeholder="Invoice Id"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  executeFetch({ invoiceId, page: 1 });
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 5. Payment Type */}
          <div>
            <select
              value={paymentType}
              onChange={(e) => {
                setPaymentType(e.target.value);
                executeFetch({ paymentType: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Payment Type ---</option>
              {initialFilters.paymentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Reset Filters */}
          <div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            ) : (
              <div className="w-full py-2 text-xs text-center text-slate-400">
                All filters active
              </div>
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
                    <span>S.No.</span>
                    {renderSortIndicator("serialNo")}
                  </div>
                </th>
                <th className="py-3 px-3">Lead Added</th>
                <th className="py-3 px-3">Payment Added</th>
                <th className="py-3 px-3">Lead Owner</th>
                <th
                  onClick={() => handleSort("clientName")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Client</span>
                    {renderSortIndicator("clientName")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Payment</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Txn Id</th>
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
                  onClick={() => handleSort("invoiceNumber")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Invoice</span>
                    {renderSortIndicator("invoiceNumber")}
                  </div>
                </th>
                <th className="py-3 px-3">Description</th>
                <th
                  onClick={() => handleSort("paymentDate")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Payment Date</span>
                    {renderSortIndicator("paymentDate")}
                  </div>
                </th>
                <th className="py-3 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <CreditCard className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No payment records found
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        There are currently no client payment or collection transactions recorded matching the selected filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    {/* S.No. */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {p.serialNo}
                    </td>

                    {/* Lead Added */}
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {p.leadAddedByName}
                    </td>

                    {/* Payment Added */}
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {p.paymentAddedByName}
                    </td>

                    {/* Lead Owner */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.leadOwnerName}
                    </td>

                    {/* Client (Name & Mobile) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.clientName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {p.clientMobile}
                      </div>
                    </td>

                    {/* Payment Amount */}
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap uppercase text-[11px]">
                      {p.modeName}
                    </td>

                    {/* Txn Id */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {p.transactionId}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(p.status)}
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {p.invoiceNumber && p.invoiceNumber !== "N/A" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50">
                          {p.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate" title={p.description}>
                      {p.description}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {p.paymentDate}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {p.leadSource}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Row (Matching screenshot summary: 'X Client' and 'Total = Y') */}
        {payments.length > 0 && (
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
            {/* Previous button */}
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

            {/* Next button */}
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
    </div>
  );
}
