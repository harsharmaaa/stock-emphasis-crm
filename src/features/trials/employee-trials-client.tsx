"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  getEmployeeTrialHistoryAction,
  type EmployeeTrialHistoryItem,
  type GetEmployeeTrialHistoryInput,
} from "./actions";

interface EmployeeTrialsClientProps {
  initialTrials: EmployeeTrialHistoryItem[];
  initialTotalCount: number;
  initialTotalPages: number;
  leadSources: string[];
  teams: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}

export function EmployeeTrialsClient({
  initialTrials,
  initialTotalCount,
  initialTotalPages,
  leadSources,
  teams,
  employees,
}: EmployeeTrialsClientProps) {
  const [trials, setTrials] = useState<EmployeeTrialHistoryItem[]>(initialTrials);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters matching EmployeTrialHistory.png
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("ALL");
  const [selectedLeadSource, setSelectedLeadSource] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isPending, startTransition] = useTransition();

  const fetchTrials = useCallback(
    (overrideParams: Partial<GetEmployeeTrialHistoryInput> = {}) => {
      startTransition(async () => {
        const params: GetEmployeeTrialHistoryInput = {
          employeeId: overrideParams.employeeId !== undefined ? overrideParams.employeeId : selectedEmployeeId,
          leadSource: overrideParams.leadSource !== undefined ? overrideParams.leadSource : selectedLeadSource,
          fromDate: overrideParams.fromDate !== undefined ? overrideParams.fromDate : fromDate,
          toDate: overrideParams.toDate !== undefined ? overrideParams.toDate : toDate,
          teamId: overrideParams.teamId !== undefined ? overrideParams.teamId : selectedTeamId,
          search: overrideParams.search !== undefined ? overrideParams.search : searchQuery,
          page: overrideParams.page !== undefined ? overrideParams.page : currentPage,
          pageSize: overrideParams.pageSize !== undefined ? overrideParams.pageSize : pageSize,
        };

        const res = await getEmployeeTrialHistoryAction(params);
        if (res.success && res.trials) {
          setTrials(res.trials);
          setTotalCount(res.totalCount ?? 0);
          setTotalPages(res.totalPages ?? 1);
          if (overrideParams.page !== undefined) {
            setCurrentPage(overrideParams.page);
          }
        }
      });
    },
    [
      selectedEmployeeId,
      selectedLeadSource,
      fromDate,
      toDate,
      selectedTeamId,
      searchQuery,
      currentPage,
      pageSize,
    ]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrials({ page: 1, search: searchQuery });
  };

  const handleResetFilters = () => {
    setSelectedEmployeeId("ALL");
    setSelectedLeadSource("ALL");
    setFromDate("");
    setToDate("");
    setSelectedTeamId("ALL");
    setSearchQuery("");
    fetchTrials({
      employeeId: "ALL",
      leadSource: "ALL",
      fromDate: "",
      toDate: "",
      teamId: "ALL",
      search: "",
      page: 1,
    });
  };

  const renderStatusBadge = (status: EmployeeTrialHistoryItem["displayStatus"]) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white shadow-2xs">
            Running
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500 text-white shadow-2xs">
            Approved
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#ff7043] text-white shadow-2xs">
            Expire
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500 text-white shadow-2xs">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500 text-white shadow-2xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
          FREE TRIAL
        </h1>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total Records: <span className="font-bold text-cyan-600 dark:text-cyan-400">{totalCount}</span>
        </div>
      </div>

      {/* 1. FILTER CARD matching EmployeTrialHistory.png */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
        {/* Row 1: All (Employee), Lead Source, From Date, To Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dropdown 1: All / Employee */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                fetchTrials({ employeeId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">All</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Lead Source */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Lead Source
            </label>
            <select
              value={selectedLeadSource}
              onChange={(e) => {
                setSelectedLeadSource(e.target.value);
                fetchTrials({ leadSource: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">Lead Source</option>
              {leadSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Input 3: From Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                fetchTrials({ fromDate: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Input 4: To Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                fetchTrials({ toDate: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Row 2: Team Dropdown & Reset Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="w-full sm:w-64">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Team
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                fetchTrials({ teamId: e.target.value, page: 1 });
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DATA TABLE CARD matching EmployeTrialHistory.png */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        {/* Card Header & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Free Trial
            </h2>
            {isPending && <Loader2 className="size-4 animate-spin text-cyan-500" />}
          </div>

          {/* Search + Page Size */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for records..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </form>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPageSize(size);
                  fetchTrials({ pageSize: size, page: 1 });
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/[0.06] whitespace-nowrap">
              <tr>
                <th scope="col" className="py-3 px-4">
                  S.No.
                </th>
                <th scope="col" className="py-3 px-4">
                  Create Date
                </th>
                <th scope="col" className="py-3 px-4">
                  Created By
                </th>
                <th scope="col" className="py-3 px-4">
                  Client Name
                </th>
                <th scope="col" className="py-3 px-4">
                  Mobile
                </th>
                <th scope="col" className="py-3 px-4">
                  Product
                </th>
                <th scope="col" className="py-3 px-4">
                  From
                </th>
                <th scope="col" className="py-3 px-4">
                  To
                </th>
                <th scope="col" className="py-3 px-4">
                  Source
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {trials.length > 0 ? (
                trials.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.sNo}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.createDate}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {t.createdByName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {t.clientName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.mobile}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="whitespace-nowrap">{t.productName}</div>
                      {t.remarks && (
                        <div
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-normal italic mt-0.5 max-w-[180px] truncate"
                          title={t.remarks}
                        >
                          Note: {t.remarks}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.startDate}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.endDate}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.leadSource}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {renderStatusBadge(t.displayStatus)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs"
                  >
                    No free trial records found matching the applied criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Page <span className="font-bold text-slate-800 dark:text-white">{currentPage}</span> of{" "}
            <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span> ({totalCount} total)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || isPending}
              onClick={() => fetchTrials({ page: currentPage - 1 })}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => fetchTrials({ page: currentPage + 1 })}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
