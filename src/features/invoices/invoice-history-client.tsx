"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  InvoiceHistoryItem,
  GetInvoiceHistoryFilterOptions,
  GetInvoiceHistoryInput,
} from "./invoice-history-actions";
import { getInvoiceHistoryAction } from "./invoice-history-actions";
import {
  Search,
  RotateCcw,
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
  Edit3,
  Building,
} from "lucide-react";
import { ViewInvoiceModal } from "./view-invoice-modal";
import { EditInvoiceModal } from "./edit-invoice-modal";

interface InvoiceHistoryClientProps {
  initialInvoices: InvoiceHistoryItem[];
  initialFilters: GetInvoiceHistoryFilterOptions;
  initialTotalCount: number;
  initialTotalPages: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalAmount: number;
  initialUniqueClientCount: number;
  initialPendingCount?: number;
  initialApprovedCount?: number;
  initialParams: GetInvoiceHistoryInput;
  portalRole: "ADMIN" | "MANAGER" | "EMPLOYEE";
  baseRoute: string;
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
  initialPendingCount = 0,
  initialApprovedCount = 0,
  initialParams,
  portalRole,
  baseRoute,
}: InvoiceHistoryClientProps) {
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>(initialInvoices);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalAmount, setTotalAmount] = useState<number>(initialTotalAmount);
  const [uniqueClientCount, setUniqueClientCount] = useState<number>(initialUniqueClientCount);
  const [pendingCount, setPendingCount] = useState<number>(initialPendingCount);
  const [approvedCount, setApprovedCount] = useState<number>(initialApprovedCount);

  // Selected invoice for detail/print/timeline modal
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceHistoryItem | null>(null);
  // Selected invoice for edit modal (Admin only)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceHistoryItem | null>(null);

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

    router.replace(`${baseRoute}?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getInvoiceHistoryAction(
        {
          profile: targetProfile || undefined,
          employeeId: targetEmp || undefined,
          productId: targetProd || undefined,
          teamId: targetTeam || undefined,
          status: targetStatus || undefined,
          fromDate: targetFrom || undefined,
          toDate: targetTo || undefined,
          search: targetSearch.trim() || undefined,
          sortBy: targetSortBy,
          sortOrder: targetSortOrder,
          page: targetPage,
          pageSize: targetPageSize,
        },
        portalRole
      );

      if (res.success && res.invoices) {
        setInvoices(res.invoices);
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.currentPage ?? 1);
        setPageSize(res.pageSize ?? 10);
        setTotalAmount(res.totalAmount ?? 0);
        setUniqueClientCount(res.uniqueClientCount ?? 0);
        if (res.pendingCount !== undefined) setPendingCount(res.pendingCount);
        if (res.approvedCount !== undefined) setApprovedCount(res.approvedCount);
      }
    });
  };

  const handleResetFilters = () => {
    setProfile("");
    setEmployeeId("");
    setProductId("");
    setTeamId("");
    setStatus("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setSortBy("invoiceDate");
    setSortOrder("desc");
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
      sortBy: "invoiceDate",
      sortOrder: "desc",
      page: 1,
    });
  };

  const handleSort = (column: SortColumn) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (sortBy === column) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      nextOrder = column === "invoiceDate" || column === "totalAmount" || column === "createdAt" ? "desc" : "asc";
    }
    setSortBy(column);
    setSortOrder(nextOrder);
    executeFetch({ sortBy: column, sortOrder: nextOrder, page: 1 });
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    );
  };

  const renderStatusBadge = (invoiceStatus: string) => {
    const s = invoiceStatus.toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    }
    if (s === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            INVOICE HISTORY
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {portalRole === "ADMIN"
              ? "Comprehensive tax invoice records, GST breakdown, service durations, and print-ready receipts."
              : portalRole === "MANAGER"
              ? "Read-only team client billing records, service validity periods, and itemized invoice details."
              : "Client tax invoices, service receipts, and validity timeline for your client accounts."}
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Total Revenue
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Total Invoices
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {totalCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Approved
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {approvedCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Pending Approval
          </span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {pendingCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Clients Billed
          </span>
          <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {uniqueClientCount}
          </span>
        </div>
      </div>

      {/* 2-Row Filter Bar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {/* From Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                executeFetch({ fromDate: e.target.value, page: 1 });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                executeFetch({ toDate: e.target.value, page: 1 });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Invoice Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                executeFetch({ status: e.target.value, page: 1 });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              {initialFilters.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Product / Package</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                executeFetch({ productId: e.target.value, page: 1 });
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Products</option>
              {initialFilters.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee (for Admin / Manager) */}
          {portalRole !== "EMPLOYEE" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  executeFetch({ employeeId: e.target.value, page: 1 });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">All Employees</option>
                {initialFilters.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Team (for Admin / Manager) */}
          {portalRole !== "EMPLOYEE" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Team</label>
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  executeFetch({ teamId: e.target.value, page: 1 });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">All Teams</option>
                {initialFilters.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Search & Page Size */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice serial, client, phone, email, agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  executeFetch({ search, page: 1 });
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setPageSize(nextSize);
                executeFetch({ pageSize: nextSize, page: 1 });
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/80 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-3 w-8">S.No.</th>
                <th
                  onClick={() => handleSort("serialNo")}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Invoice
                    {renderSortIcon("serialNo")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("invoiceDate")}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Date
                    {renderSortIcon("invoiceDate")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("clientName")}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Client Details
                    {renderSortIcon("clientName")}
                  </div>
                </th>
                <th className="py-3 px-3">Service Package</th>
                <th className="py-3 px-3">Plan / Validity</th>
                <th className="py-3 px-3 text-right">Taxable Base</th>
                <th className="py-3 px-3 text-right">IGST (18%)</th>
                <th
                  onClick={() => handleSort("totalAmount")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total Paid
                    {renderSortIcon("totalAmount")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {renderSortIcon("status")}
                  </div>
                </th>
                <th className="py-3 px-3">Raised By</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isPending && invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No invoice records found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* S.No. */}
                      <td className="py-3 px-3 font-mono text-slate-400">{sNo}</td>

                      {/* Invoice Serial */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-left"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {inv.serialNo}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {inv.invoiceDate}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {inv.clientName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {inv.clientMobile}
                        </div>
                        {inv.pan && (
                          <div className="text-[10px] font-mono text-slate-400">
                            PAN: {inv.pan}
                          </div>
                        )}
                      </td>

                      {/* Service Package */}
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {inv.productName}
                      </td>

                      {/* Plan / Validity */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                          {inv.planType} ({inv.durationLabel})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.startDate && inv.endDate ? `${inv.startDate} - ${inv.endDate}` : "Validity Pending"}
                        </div>
                      </td>

                      {/* Base Amount */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        ₹{inv.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* GST */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        ₹{inv.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">{renderStatusBadge(inv.status)}</td>

                      {/* Raised By */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {inv.createdByName}
                        </div>
                        {inv.teamName && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Building className="w-2.5 h-2.5" />
                            {inv.teamName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            title="View Tax Invoice & Timeline"
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {portalRole === "ADMIN" && (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              title="Edit Invoice Details"
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing {invoices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                setCurrentPage(prev);
                executeFetch({ page: prev });
              }}
              disabled={currentPage <= 1 || isPending}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono font-medium">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                const next = Math.min(totalPages, currentPage + 1);
                setCurrentPage(next);
                executeFetch({ page: next });
              }}
              disabled={currentPage >= totalPages || isPending}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Tax Invoice Modal */}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={{
            id: viewingInvoice.id,
            serialNo: viewingInvoice.serialNo,
            clientName: viewingInvoice.clientName,
            clientMobile: viewingInvoice.clientMobile,
            clientEmail: viewingInvoice.clientEmail,
            pan: viewingInvoice.pan,
            dob: viewingInvoice.dob,
            productName: viewingInvoice.productName,
            planType: viewingInvoice.planType,
            durationLabel: viewingInvoice.durationLabel,
            startDate: viewingInvoice.startDate,
            endDate: viewingInvoice.endDate,
            invoiceDate: viewingInvoice.invoiceDate,
            baseAmount: viewingInvoice.baseAmount,
            gstAmount: viewingInvoice.gstAmount,
            totalAmount: viewingInvoice.totalAmount,
            status: viewingInvoice.status,
            mailStatus: viewingInvoice.mailStatus,
            createdByName: viewingInvoice.createdByName,
            assignedToName: viewingInvoice.assignedToName,
            teamName: viewingInvoice.teamName,
          }}
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Edit Invoice Modal (Admin) */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={{
            id: editingInvoice.id,
            serialNo: editingInvoice.serialNo,
            leadId: editingInvoice.leadId,
            clientName: editingInvoice.clientName,
            clientMobile: editingInvoice.clientMobile,
            clientEmail: editingInvoice.clientEmail,
            pan: editingInvoice.pan,
            dob: editingInvoice.dob,
            productName: editingInvoice.productName,
            productId: editingInvoice.productId,
            planType: editingInvoice.planType,
            durationLabel: editingInvoice.durationLabel,
            startDate: editingInvoice.startDate,
            endDate: editingInvoice.endDate,
            invoiceDate: editingInvoice.invoiceDate,
            baseAmount: editingInvoice.baseAmount,
            gstAmount: editingInvoice.gstAmount,
            totalAmount: editingInvoice.totalAmount,
            status: editingInvoice.status,
            mailStatus: editingInvoice.mailStatus,
            createdByName: editingInvoice.createdByName,
            assignedToName: editingInvoice.assignedToName,
            teamName: editingInvoice.teamName,
            createdAt: editingInvoice.createdAt,
          }}
          isOpen={Boolean(editingInvoice)}
          onClose={() => setEditingInvoice(null)}
          onSuccess={() => {
            executeFetch({ page: currentPage });
          }}
        />
      )}
    </div>
  );
}
