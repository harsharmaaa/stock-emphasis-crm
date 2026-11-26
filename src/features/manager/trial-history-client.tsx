"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TrialHistoryItem,
  GetTrialHistoryFilterOptions,
} from "./trial-history-actions";
import { getManagerTrialHistoryAction } from "./trial-history-actions";
import {
  Search,
  RotateCcw,
  Calendar,
  Layers,
  User,
  Users,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Filter,
  X,
} from "lucide-react";

interface TrialHistoryClientProps {
  initialTrials: TrialHistoryItem[];
  initialFilters: GetTrialHistoryFilterOptions;
  initialTotalCount: number;
  initialTotalPages: number;
  initialPage: number;
  initialPageSize: number;
  initialParams: {
    profile?: string;
    employeeId?: string;
    leadSource?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
    sortBy?: "createdAt" | "clientName" | "productName" | "startDate" | "endDate" | "status";
    sortOrder?: "asc" | "desc";
  };
  basePath?: string;
}

type SortColumn = "createdAt" | "clientName" | "productName" | "startDate" | "endDate" | "status";

export function TrialHistoryClient({
  initialTrials,
  initialFilters,
  initialTotalCount,
  initialTotalPages,
  initialPage,
  initialPageSize,
  initialParams,
  basePath = "/manager/history/trials",
}: TrialHistoryClientProps) {
  const router = useRouter();

  const [trials, setTrials] = useState<TrialHistoryItem[]>(initialTrials);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Filters state
  const [profile, setProfile] = useState<string>(initialParams.profile || "");
  const [employeeId, setEmployeeId] = useState<string>(initialParams.employeeId || "");
  const [leadSource, setLeadSource] = useState<string>(initialParams.leadSource || "");
  const [teamId, setTeamId] = useState<string>(initialParams.teamId || "");
  const [fromDate, setFromDate] = useState<string>(initialParams.fromDate || "");
  const [toDate, setToDate] = useState<string>(initialParams.toDate || "");
  const [search, setSearch] = useState<string>(initialParams.search || "");

  // Sorting state
  const [sortBy, setSortBy] = useState<SortColumn>(initialParams.sortBy || "createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialParams.sortOrder || "desc");

  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    profile || employeeId || leadSource || teamId || fromDate || toDate || search
  );

  const executeFetch = (overrides: {
    profile?: string;
    employeeId?: string;
    leadSource?: string;
    teamId?: string;
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
    const targetSrc = overrides.leadSource !== undefined ? overrides.leadSource : leadSource;
    const targetTeam = overrides.teamId !== undefined ? overrides.teamId : teamId;
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
    if (targetSrc) params.set("leadSource", targetSrc);
    if (targetTeam) params.set("teamId", targetTeam);
    if (targetFrom) params.set("fromDate", targetFrom);
    if (targetTo) params.set("toDate", targetTo);
    if (targetSearch) params.set("search", targetSearch);
    if (targetSortBy) params.set("sortBy", targetSortBy);
    if (targetSortOrder) params.set("sortOrder", targetSortOrder);
    if (targetPage > 1) params.set("page", String(targetPage));
    if (targetPageSize !== 10) params.set("pageSize", String(targetPageSize));

    router.replace(`${basePath}?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerTrialHistoryAction({
        profile: targetProfile || undefined,
        employeeId: targetEmp || undefined,
        leadSource: targetSrc || undefined,
        teamId: targetTeam || undefined,
        fromDate: targetFrom || undefined,
        toDate: targetTo || undefined,
        search: targetSearch || undefined,
        sortBy: targetSortBy,
        sortOrder: targetSortOrder,
        page: targetPage,
        pageSize: targetPageSize,
      });

      if (res.success && res.trials) {
        setTrials(res.trials);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || 1);
      }
    });
  };

  const handleClearFilters = () => {
    setProfile("");
    setEmployeeId("");
    setLeadSource("");
    setTeamId("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setCurrentPage(1);

    executeFetch({
      profile: "",
      employeeId: "",
      leadSource: "",
      teamId: "",
      fromDate: "",
      toDate: "",
      search: "",
      page: 1,
    });
  };

  const handleSort = (column: SortColumn) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (sortBy === column) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortBy(column);
    setSortOrder(nextOrder);
    executeFetch({ sortBy: column, sortOrder: nextOrder, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    executeFetch({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    executeFetch({ pageSize: newSize, page: 1 });
  };

  // Status badge color formatting matching reference design
  const renderStatusBadge = (status: TrialHistoryItem["displayStatus"]) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-xs select-none">
            Approved
          </span>
        );
      case "Running":
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-[#14b8a6] hover:bg-[#0d9488] text-white shadow-xs select-none">
            Running
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-[#f87171] hover:bg-[#ef4444] text-white shadow-xs select-none">
            Expire
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-[#3b82f6] text-white shadow-xs select-none">
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-[#f43f5e] text-white shadow-xs select-none">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-lg text-xs font-bold bg-slate-500 text-white shadow-xs select-none">
            {status}
          </span>
        );
    }
  };

  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(totalCount, currentPage * pageSize);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. TOP FILTER CONTAINER (Matching Reference Design) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Filter Records
            </h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              <X className="size-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* 2-Row Responsive Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Profile Dropdown */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Profile
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <Layers className="size-3.5" />
              </div>
              <select
                value={profile}
                onChange={(e) => {
                  setProfile(e.target.value);
                  executeFetch({ profile: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800 dark:text-slate-900">
                  All Profiles
                </option>
                {initialFilters.profiles.map((p) => (
                  <option key={p} value={p} className="text-slate-800 dark:text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee Dropdown */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Employee
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <User className="size-3.5" />
              </div>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  executeFetch({ employeeId: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800 dark:text-slate-900">
                  All Employees
                </option>
                {initialFilters.employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="text-slate-800 dark:text-slate-900">
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead Source Dropdown */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Lead Source
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <Tag className="size-3.5" />
              </div>
              <select
                value={leadSource}
                onChange={(e) => {
                  setLeadSource(e.target.value);
                  executeFetch({ leadSource: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800 dark:text-slate-900">
                  All Lead Sources
                </option>
                {initialFilters.leadSources.map((src) => (
                  <option key={src} value={src} className="text-slate-800 dark:text-slate-900">
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range: From Date */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              From Date
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <Calendar className="size-3.5" />
              </div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  executeFetch({ fromDate: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Date Range: To Date */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              To Date
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <Calendar className="size-3.5" />
              </div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  executeFetch({ toDate: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Team Dropdown */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Team
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
              <div className="flex items-center justify-center w-9 h-9 border-r border-slate-200 dark:border-white/[0.08] text-slate-400 shrink-0">
                <Users className="size-3.5" />
              </div>
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  executeFetch({ teamId: e.target.value, page: 1 });
                }}
                className="w-full h-9 px-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800 dark:text-slate-900">
                  All Teams
                </option>
                {initialFilters.teams.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-800 dark:text-slate-900">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & PAGE SIZE BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        {/* Search records... */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              executeFetch({ search: e.target.value, page: 1 });
            }}
            placeholder="Search records..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                executeFetch({ search: "", page: 1 });
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Right side: Reload & Page Size Selector */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => executeFetch({})}
            disabled={isPending}
            title="Refresh records"
            className="size-8 rounded-xl flex items-center justify-center bg-white/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`size-3.5 ${isPending ? "animate-spin text-blue-500" : ""}`} />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              =
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 px-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="10" className="text-slate-900">
                10
              </option>
              <option value="25" className="text-slate-900">
                25
              </option>
              <option value="50" className="text-slate-900">
                50
              </option>
              <option value="100" className="text-slate-900">
                100
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TRIAL HISTORY DATA TABLE */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 font-semibold select-none">
                {/* Create Date */}
                <th
                  onClick={() => handleSort("createdAt")}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>Create Date</span>
                    {sortBy === "createdAt" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* Created By */}
                <th className="py-3 px-3.5 whitespace-nowrap">
                  <span>Created By</span>
                </th>

                {/* Client Name */}
                <th
                  onClick={() => handleSort("clientName")}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>Client Name</span>
                    {sortBy === "clientName" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* Mobile */}
                <th className="py-3 px-3.5 whitespace-nowrap">
                  <span>Mobile</span>
                </th>

                {/* Product */}
                <th
                  onClick={() => handleSort("productName")}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>Product</span>
                    {sortBy === "productName" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* From Date */}
                <th
                  onClick={() => handleSort("startDate")}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>From</span>
                    {sortBy === "startDate" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* To Date */}
                <th
                  onClick={() => handleSort("endDate")}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>To</span>
                    {sortBy === "endDate" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* Source */}
                <th className="py-3 px-3.5 whitespace-nowrap">
                  <span>Source</span>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-3.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <span>Status</span>
                    {sortBy === "status" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="size-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="size-3 text-blue-500" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.05]">
              {trials.length > 0 ? (
                trials.map((trial) => {
                  return (
                    <tr
                      key={trial.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Create Date */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {trial.createdAt}
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {trial.createdByName}
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {trial.clientName}
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.mobile}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[200px]" title={trial.productName}>
                        <div className="truncate">{trial.productName}</div>
                        {trial.remarks && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[190px]" title={trial.remarks}>
                            Note: {trial.remarks}
                          </div>
                        )}
                      </td>

                      {/* From Date */}
                      <td className="py-3.5 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.startDate}
                      </td>

                      {/* To Date */}
                      <td className="py-3.5 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.endDate}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.leadSource || "DIRECT"}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(trial.displayStatus)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                        <ScrollText className="size-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No trial records found
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        {hasActiveFilters
                          ? "No free trials match the applied filter or date criteria."
                          : "No free trials have been registered under your team scope yet."}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startEntry}</span> to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{endEntry}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span> entries
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || isPending}
                onClick={() => handlePageChange(currentPage - 1)}
                className="size-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>

              <span className="px-3 py-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => handlePageChange(currentPage + 1)}
                className="size-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
