"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  CallReportItem,
  GetCallReportFilterOptions,
} from "./call-report-actions";
import { getManagerCallReportAction } from "./call-report-actions";
import {
  Search,
  RotateCcw,
  Calendar,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Hash,
} from "lucide-react";

interface CallReportClientProps {
  initialRecords: CallReportItem[];
  initialFilters: GetCallReportFilterOptions;
  initialTotalCount: number;
  initialTotalPages: number;
  initialPage: number;
  initialPageSize: number;
  initialSummary: {
    totalOutgoingCalls: number;
    totalIncomingCalls: number;
    totalCalls: number;
    totalDurationSeconds: number;
    totalDurationFormatted: string;
  };
  initialParams: {
    fromDate?: string;
    toDate?: string;
    employeeId?: string;
    teamId?: string;
    extension?: string;
    search?: string;
    sortBy?:
      | "name"
      | "ext"
      | "outgoingCalls"
      | "outgoingTimeSeconds"
      | "incomingCalls"
      | "incomingTimeSeconds"
      | "totalCalls"
      | "totalTimeSeconds";
    sortOrder?: "asc" | "desc";
  };
}

type SortColumn =
  | "name"
  | "ext"
  | "outgoingCalls"
  | "outgoingTimeSeconds"
  | "incomingCalls"
  | "incomingTimeSeconds"
  | "totalCalls"
  | "totalTimeSeconds";

export function CallReportClient({
  initialRecords,
  initialFilters,
  initialTotalCount,
  initialTotalPages,
  initialPage,
  initialPageSize,
  initialSummary,
  initialParams,
}: CallReportClientProps) {
  const router = useRouter();

  const [records, setRecords] = useState<CallReportItem[]>(initialRecords);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [summary, setSummary] = useState(initialSummary);

  // Filters
  const [fromDate, setFromDate] = useState<string>(initialParams.fromDate || "");
  const [toDate, setToDate] = useState<string>(initialParams.toDate || "");
  const [employeeId, setEmployeeId] = useState<string>(initialParams.employeeId || "");
  const [teamId, setTeamId] = useState<string>(initialParams.teamId || "");
  const [extension, setExtension] = useState<string>(initialParams.extension || "");
  const [search, setSearch] = useState<string>(initialParams.search || "");

  // Sorting
  const [sortBy, setSortBy] = useState<SortColumn>(initialParams.sortBy || "totalCalls");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialParams.sortOrder || "desc");

  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    fromDate || toDate || employeeId || teamId || extension || search
  );

  const executeFetch = (overrides: {
    fromDate?: string;
    toDate?: string;
    employeeId?: string;
    teamId?: string;
    extension?: string;
    search?: string;
    sortBy?: SortColumn;
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) => {
    const targetFrom = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
    const targetTo = overrides.toDate !== undefined ? overrides.toDate : toDate;
    const targetEmp = overrides.employeeId !== undefined ? overrides.employeeId : employeeId;
    const targetTeam = overrides.teamId !== undefined ? overrides.teamId : teamId;
    const targetExt = overrides.extension !== undefined ? overrides.extension : extension;
    const targetSearch = overrides.search !== undefined ? overrides.search : search;
    const targetSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const targetSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const targetPage = overrides.page !== undefined ? overrides.page : currentPage;
    const targetPageSize = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;

    // Sync URL search params
    const params = new URLSearchParams();
    if (targetFrom) params.set("fromDate", targetFrom);
    if (targetTo) params.set("toDate", targetTo);
    if (targetEmp) params.set("employeeId", targetEmp);
    if (targetTeam) params.set("teamId", targetTeam);
    if (targetExt) params.set("extension", targetExt);
    if (targetSearch) params.set("search", targetSearch);
    if (targetSortBy) params.set("sortBy", targetSortBy);
    if (targetSortOrder) params.set("sortOrder", targetSortOrder);
    if (targetPage > 1) params.set("page", String(targetPage));
    if (targetPageSize !== 10) params.set("pageSize", String(targetPageSize));

    router.replace(`/manager/calling/reports?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerCallReportAction({
        fromDate: targetFrom || undefined,
        toDate: targetTo || undefined,
        employeeId: targetEmp || undefined,
        teamId: targetTeam || undefined,
        extension: targetExt || undefined,
        search: targetSearch || undefined,
        sortBy: targetSortBy,
        sortOrder: targetSortOrder,
        page: targetPage,
        pageSize: targetPageSize,
      });

      if (res.success && res.records) {
        setRecords(res.records);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || 1);
        if (res.summary) setSummary(res.summary);
      }
    });
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setEmployeeId("");
    setTeamId("");
    setExtension("");
    setSearch("");
    setCurrentPage(1);

    executeFetch({
      fromDate: "",
      toDate: "",
      employeeId: "",
      teamId: "",
      extension: "",
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

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate pagination buttons
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
            CALL REPORT
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agent call performance, duration, and disposition metrics across your team.
          </p>
        </div>
      </div>

      {/* Top Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
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
              title="From Date"
            />
          </div>

          {/* 2. To Date */}
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
              title="To Date"
            />
          </div>

          {/* 3. Employee */}
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

          {/* 5. Extension */}
          <div>
            <select
              value={extension}
              onChange={(e) => {
                setExtension(e.target.value);
                executeFetch({ extension: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">--- Extension ---</option>
              {initialFilters.extensions.map((ext) => (
                <option key={ext} value={ext}>
                  {ext}
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
                  onClick={() => handleSort("name")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("ext")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Ext</span>
                    {renderSortIndicator("ext")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("outgoingCalls")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Outgoing Calls</span>
                    {renderSortIndicator("outgoingCalls")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("outgoingTimeSeconds")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Outgoing Time</span>
                    {renderSortIndicator("outgoingTimeSeconds")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("incomingCalls")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Incoming Calls</span>
                    {renderSortIndicator("incomingCalls")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("incomingTimeSeconds")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Incoming Time</span>
                    {renderSortIndicator("incomingTimeSeconds")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalCalls")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Total Calls</span>
                    {renderSortIndicator("totalCalls")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalTimeSeconds")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Total Time</span>
                    {renderSortIndicator("totalTimeSeconds")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <PhoneCall className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No call records found
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        There are currently no CDR call logs or telephony activity matching the selected filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    {/* Name */}
                    <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                      {r.name}
                    </td>

                    {/* Ext */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {r.ext !== "—" ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          <Hash className="w-3 h-3 text-slate-400" />
                          {r.ext}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Outgoing Calls */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <PhoneOutgoing className="w-3 h-3 text-emerald-500" />
                        <span>{r.outgoingDisplay}</span>
                      </span>
                    </td>

                    {/* Outgoing Time */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {r.outgoingTime}
                    </td>

                    {/* Incoming Calls */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <PhoneIncoming className="w-3 h-3 text-blue-500" />
                        <span>{r.incomingCalls}</span>
                      </span>
                    </td>

                    {/* Incoming Time */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {r.incomingTime}
                    </td>

                    {/* Total Calls */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                        {r.totalCalls}
                      </span>
                    </td>

                    {/* Total Time */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                      {r.totalTime}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer Row */}
        {records.length > 0 && (
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Total Calls = {summary.totalCalls}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <PhoneOutgoing className="w-3.5 h-3.5" />
                <span>Outgoing = {summary.totalOutgoingCalls}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <PhoneIncoming className="w-3.5 h-3.5" />
                <span>Incoming = {summary.totalIncomingCalls}</span>
              </span>
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Total Duration = {summary.totalDurationFormatted}</span>
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
    </div>
  );
}
