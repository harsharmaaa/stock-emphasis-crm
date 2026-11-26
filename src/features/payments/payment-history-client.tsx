"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  PaymentHistoryItem,
  GetPaymentHistoryFilterOptions,
} from "./payment-history-actions";
import { getPaymentHistoryAction } from "./payment-history-actions";
import {
  Search,
  RotateCcw,
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
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
  basePath?: string;
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
  basePath = "/employee/payments",
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

    router.replace(`${basePath}?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getPaymentHistoryAction({
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
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.currentPage ?? targetPage);
        setPageSize(res.pageSize ?? targetPageSize);
        setTotalAmount(res.totalAmount ?? 0);
        setUniqueClientCount(res.uniqueClientCount ?? 0);
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

  const handleSort = (col: SortColumn) => {
    let nextOrder: "asc" | "desc" = "desc";
    if (sortBy === col) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortBy(col);
    setSortOrder(nextOrder);
    executeFetch({ sortBy: col, sortOrder: nextOrder, page: 1 });
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortBy !== col) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-emerald-600 dark:text-emerald-400" />
    );
  };

  const renderStatusBadge = (st: string) => {
    const s = st.toLowerCase();
    if (s.includes("approved")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          Approved
        </span>
      );
    }
    if (s.includes("rejected")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
            Payment History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse verified client collection transactions, payment methods, invoice references, and financial receipts.
          </p>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 self-stretch sm:self-auto">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-center">
            <span className="block text-[10px] font-semibold uppercase text-slate-400">Records</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{totalCount}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
            <span className="block text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Total Collected</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-center">
            <span className="block text-[10px] font-semibold uppercase text-slate-400">Clients</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{uniqueClientCount}</span>
          </div>
        </div>
      </div>

      {/* 2-Row Filter Bar (Matching Image 3: EmployePaymentHistorySidebar.jpg) */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Payment Date */}
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                executeFetch({ fromDate: e.target.value, page: 1 });
              }}
              title="Payment Date"
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Payment Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              executeFetch({ status: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Payment Status ---</option>
            {initialFilters.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Lead Added By */}
          <select
            value={leadAddedById}
            onChange={(e) => {
              setLeadAddedById(e.target.value);
              executeFetch({ leadAddedById: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Lead Added By ---</option>
            {initialFilters.users.map((u) => (
              <option key={`leadAdded-${u.id}`} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Payment Added By */}
          <select
            value={paymentAddedById}
            onChange={(e) => {
              setPaymentAddedById(e.target.value);
              executeFetch({ paymentAddedById: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Payment Added By ---</option>
            {initialFilters.users.map((u) => (
              <option key={`payAdded-${u.id}`} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Lead Owner */}
          <select
            value={leadOwnerId}
            onChange={(e) => {
              setLeadOwnerId(e.target.value);
              executeFetch({ leadOwnerId: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Lead Owner ---</option>
            {initialFilters.users.map((u) => (
              <option key={`owner-${u.id}`} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Team */}
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              executeFetch({ teamId: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Team ---</option>
            {initialFilters.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
          {/* Lead Added Date */}
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                executeFetch({ toDate: e.target.value, page: 1 });
              }}
              title="To Payment Date"
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Payment Mode */}
          <select
            value={paymentModeId}
            onChange={(e) => {
              setPaymentModeId(e.target.value);
              executeFetch({ paymentModeId: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Payment Mode ---</option>
            {initialFilters.paymentModes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Lead Source */}
          <select
            value={leadSource}
            onChange={(e) => {
              setLeadSource(e.target.value);
              executeFetch({ leadSource: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Lead Source ---</option>
            {initialFilters.leadSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Invoice ID */}
          <input
            type="text"
            placeholder="Invoice Id"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") executeFetch({ invoiceId, page: 1 });
            }}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 font-mono"
          />

          {/* Payment Type */}
          <select
            value={paymentType}
            onChange={(e) => {
              setPaymentType(e.target.value);
              executeFetch({ paymentType: e.target.value, page: 1 });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">--- Payment Type ---</option>
            {initialFilters.paymentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filters</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 text-center">Active filters: None</div>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  executeFetch({ search, page: 1 });
                }
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400">=</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPageSize(next);
                executeFetch({ pageSize: next, page: 1 });
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Scrollable Data Table (Matching Image 3: S.No., Lead Added, Payment Added, Lead Owner, Client, Payment, Mode, Txn Id, Status, Invoice, Description, Payment Date, Source) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 font-semibold select-none">
                <th
                  onClick={() => handleSort("serialNo")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>S.No.</span>
                    {renderSortIndicator("serialNo")}
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[110px]">Lead Added</th>
                <th className="py-3 px-3 min-w-[110px]">Payment Added</th>
                <th className="py-3 px-3 min-w-[110px]">Lead Owner</th>
                <th
                  onClick={() => handleSort("clientName")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group min-w-[150px]"
                >
                  <div className="flex items-center">
                    <span>Client</span>
                    {renderSortIndicator("clientName")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group min-w-[90px]"
                >
                  <div className="flex items-center">
                    <span>Payment</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[120px]">Mode</th>
                <th className="py-3 px-3 min-w-[90px]">Txn Id</th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group min-w-[90px]"
                >
                  <div className="flex items-center">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("invoiceNumber")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group min-w-[90px]"
                >
                  <div className="flex items-center">
                    <span>Invoice</span>
                    {renderSortIndicator("invoiceNumber")}
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[160px]">Description</th>
                <th
                  onClick={() => handleSort("paymentDate")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group min-w-[100px]"
                >
                  <div className="flex items-center">
                    <span>Payment Date</span>
                    {renderSortIndicator("paymentDate")}
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[100px]">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {isPending ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    No payment history records found matching your filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors text-slate-700 dark:text-slate-300"
                  >
                    {/* S.No. (e.g. 1--[457417]) */}
                    <td className="py-3 px-3 font-mono font-medium text-[11px] text-slate-900 dark:text-white whitespace-nowrap">
                      {p.serialNo}
                    </td>

                    {/* Lead Added */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {p.leadAddedByName}
                    </td>

                    {/* Payment Added */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-900 dark:text-white font-medium">
                      {p.paymentAddedByName}
                    </td>

                    {/* Lead Owner */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {p.leadOwnerName}
                    </td>

                    {/* Client */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {p.clientName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {p.clientMobile}
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-3 uppercase text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.modeName}
                    </td>

                    {/* Txn Id */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {p.transactionId}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(p.status)}
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {p.invoiceNumber && p.invoiceNumber !== "—" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          {p.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3 max-w-[200px] truncate text-[11px] text-slate-600 dark:text-slate-400" title={p.description}>
                      {p.description}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {p.paymentDate}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500">
                      {p.leadSource}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {payments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1 || isPending}
              onClick={() => executeFetch({ page: currentPage - 1 })}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 font-mono font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => executeFetch({ page: currentPage + 1 })}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
