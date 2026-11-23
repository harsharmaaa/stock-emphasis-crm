"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type LeadListItem,
  type AllotmentUserOption,
  type GetLeadsParams,
  getLeadsAction,
  updateLeadDetailsAction,
  getAdminLeadCountsSummaryAction,
  executeAdminLeadCountBulkAction,
} from "./actions";
import { normalizeStatusFilter } from "@/src/lib/utils";
import { LeadDetailsDrawer } from "./lead-details-drawer";
import { LeadCallUpdateModal } from "./lead-call-update-modal";
import {
  LeadCountModal,
  type LeadCountFilterApplyPayload,
} from "@/src/components/leads/lead-count-modal";
import { AdminFetchModal } from "./admin-fetch-modal";
import { AdminSelectedLeadsActionModal } from "./admin-selected-leads-action-modal";
import { AdminLeadTimelineModal } from "./admin-lead-timeline-modal";
import {
  Inbox,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Loader2,
  Clock,
  User,
  Calendar,
  Tag,
  Hash,
  Pencil,
  Plus,
  Eye,
  SlidersHorizontal,
  CircleOff,
  MessageCircle,
  X,
  AlertTriangle,
  Headphones,
  BarChart2,
  Filter,
  Download,
  Layers,
} from "lucide-react";

interface LeadsListClientProps {
  initialLeads: LeadListItem[];
  initialTotalCount: number;
  initialTotalPages: number;
  initialStatus?: string;
  initialSearch?: string;
  initialPage?: number;
  initialLeadId?: string;
  allotmentUsers: AllotmentUserOption[];
}

/**
 * Exact filters requested in CRM requirements:
 * All, Unfollowed, Unread, Read, Followups, Trials, Clients, Disposed.
 */
const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Unfollowed", value: "UNFOLLOWED" },
  { label: "Unread", value: "UNREAD" },
  { label: "Read", value: "READ" },
  { label: "Followups", value: "FOLLOW_UP" },
  { label: "Trials", value: "TRIAL" },
  { label: "Clients", value: "CLIENT" },
  { label: "Disposed", value: "DISPOSED" },
];

export function LeadsListClient({
  initialLeads,
  initialTotalCount,
  initialTotalPages,
  initialStatus = "ALL",
  initialSearch = "",
  initialPage = 1,
  initialLeadId,
  allotmentUsers,
}: LeadsListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<LeadListItem[]>(initialLeads);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(
    normalizeStatusFilter(initialStatus) || "ALL"
  );
  const [isPending, startTransition] = useTransition();

  // Drawer state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    initialLeadId || null
  );
  // Action bar state
  const [timelineModalLead, setTimelineModalLead] = useState<LeadListItem | null>(null);
  const [callUpdateModalLead, setCallUpdateModalLead] = useState<LeadListItem | null>(null);
  const [confirmDisposeLead, setConfirmDisposeLead] = useState<LeadListItem | null>(null);
  const [isDisposingId, setIsDisposingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(!!initialLeadId);

  // Lead Count Modal State
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [modalSelectedStages, setModalSelectedStages] = useState<string[]>([]);
  const [modalSelectedResponses, setModalSelectedResponses] = useState<string[]>([]);
  const [appliedCountFilters, setAppliedCountFilters] = useState<LeadCountFilterApplyPayload | null>(null);

  // Admin Fetch Modal & Quick Filters State
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isQuickFiltersOpen, setIsQuickFiltersOpen] = useState(false);
  const [quickFilterSource, setQuickFilterSource] = useState("");
  const [quickFilterResponse, setQuickFilterResponse] = useState("");
  const [quickFilterOwnerId, setQuickFilterOwnerId] = useState("");
  const [quickFilterTeamId, setQuickFilterTeamId] = useState("");
  const [quickFilterAssignment, setQuickFilterAssignment] = useState("");
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableResponses, setAvailableResponses] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string }[]>([]);

  // Selected Leads & Action Modal State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Handle indeterminate checkbox state for Select All
  const currentPageLeadIds = leads.map((l) => l.id);
  const isAllCurrentPageSelected =
    currentPageLeadIds.length > 0 &&
    currentPageLeadIds.every((id) => selectedLeadIds.includes(id));
  const isPartiallySelected =
    selectedLeadIds.length > 0 && !isAllCurrentPageSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedLeadIds((prev) =>
        prev.filter((id) => !currentPageLeadIds.includes(id))
      );
    } else {
      setSelectedLeadIds((prev) =>
        Array.from(new Set([...prev, ...currentPageLeadIds]))
      );
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Load filter option metadata
  useEffect(() => {
    let isMounted = true;
    getAdminLeadCountsSummaryAction().then((res) => {
      if (!isMounted || !res.success) return;
      if (res.sources) setAvailableSources(res.sources);
      if (res.responses) setAvailableResponses(res.responses);
      if (res.teams) setAvailableTeams(res.teams);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const hasActiveQuickFilters = Boolean(
    quickFilterSource ||
    quickFilterResponse ||
    quickFilterOwnerId ||
    quickFilterTeamId ||
    quickFilterAssignment
  );

  // Sync with searchParams on mount or popstate
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const urlStatus = searchParams.get("status");
      const urlSearch = searchParams.get("search");
      const urlLeadId = searchParams.get("leadId");

      if (urlStatus) {
        const normalized = normalizeStatusFilter(urlStatus) || "ALL";
        setStatusFilter((prev) => (prev !== normalized ? normalized : prev));
      }
      if (urlSearch !== null) {
        setSearchQuery((prev) => (prev !== urlSearch ? urlSearch : prev));
      }
      if (urlLeadId) {
        setSelectedLeadId((prev) => (prev !== urlLeadId ? urlLeadId : prev));
        setIsDrawerOpen((prev) => (!prev ? true : prev));
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchParams]);

  // Update URL query parameters to preserve state
  const updateUrl = (page: number, search: string, status: string, leadId?: string | null) => {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    if (page > 1) params.set("page", page.toString());
    if (leadId) params.set("leadId", leadId);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const fetchLeads = (
    page: number = currentPage,
    search: string = searchQuery,
    status: string = statusFilter,
    countFilters: LeadCountFilterApplyPayload | null = appliedCountFilters
  ) => {
    setSelectedLeadIds([]);
    startTransition(async () => {
      const params: GetLeadsParams = {
        page,
        search,
        status,
        pageSize: 15,
      };

      if (countFilters) {
        params.scopeToAssignedOnly = countFilters.scopeToAssignedOnly ?? true;
        if (countFilters.selectedStages && countFilters.selectedStages.length > 0) {
          params.statusIn = countFilters.selectedStages;
        }
        if (countFilters.selectedResponses && countFilters.selectedResponses.length > 0) {
          params.leadResponseIn = countFilters.selectedResponses;
        }
        if (countFilters.lastUpdateDateType) params.lastUpdateDateType = countFilters.lastUpdateDateType;
        if (countFilters.startDate) params.startDate = countFilters.startDate;
        if (countFilters.endDate) params.endDate = countFilters.endDate;
        if (countFilters.leadSource) params.leadSource = countFilters.leadSource;
        if (countFilters.leadResponse) params.leadResponse = countFilters.leadResponse;
        if (countFilters.trialStatus) params.trialStatus = countFilters.trialStatus;
        if (countFilters.serviceStatus) params.serviceStatus = countFilters.serviceStatus;
        if (countFilters.serviceId) params.serviceId = countFilters.serviceId;
        if (countFilters.createdById) params.createdById = countFilters.createdById;
        if (countFilters.leadOwnerId) params.leadOwnerId = countFilters.leadOwnerId;
        if (countFilters.teamId) params.teamId = countFilters.teamId;
        if (countFilters.leadAssignment) params.leadAssignment = countFilters.leadAssignment;
        if (countFilters.leadRecycleCount) params.leadRecycleCount = countFilters.leadRecycleCount;
        if (countFilters.paidRange) params.paidRange = countFilters.paidRange;
        if (countFilters.mobile) params.mobile = countFilters.mobile;
      }

      const res = await getLeadsAction(params);

      if (res.success && res.leads) {
        setLeads(res.leads);
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.currentPage ?? 1);
        updateUrl(page, search, status, selectedLeadId);
      }
    });
  };

  const handleApplyCountModalFilters = (payload: LeadCountFilterApplyPayload) => {
    setModalSelectedStages(payload.selectedStages);
    setModalSelectedResponses(payload.selectedResponses);
    setAppliedCountFilters(payload);
    fetchLeads(1, searchQuery, statusFilter, payload);
  };

  const handleResetCountModalFilters = () => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setAppliedCountFilters(null);
    fetchLeads(1, searchQuery, statusFilter, null);
  };

  const handleApplyQuickFilters = () => {
    const isUnalloted = quickFilterAssignment === "UNALLOTED";
    const isAll = quickFilterAssignment === "ALL";
    const newPayload: LeadCountFilterApplyPayload = {
      ...(appliedCountFilters || { selectedKeys: [], selectedStages: [], selectedResponses: [] }),
      leadSource: quickFilterSource || undefined,
      leadResponse: quickFilterResponse || undefined,
      leadOwnerId: quickFilterOwnerId || undefined,
      teamId: quickFilterTeamId || undefined,
      leadAssignment: quickFilterAssignment || undefined,
      scopeToAssignedOnly: isUnalloted || isAll ? false : true,
    };
    setAppliedCountFilters(newPayload);
    fetchLeads(1, searchQuery, statusFilter, newPayload);
  };

  const handleResetQuickFilters = () => {
    setQuickFilterSource("");
    setQuickFilterResponse("");
    setQuickFilterOwnerId("");
    setQuickFilterTeamId("");
    setQuickFilterAssignment("");
    if (appliedCountFilters) {
      const newPayload: LeadCountFilterApplyPayload = {
        ...appliedCountFilters,
        leadSource: undefined,
        leadResponse: undefined,
        leadOwnerId: undefined,
        teamId: undefined,
        leadAssignment: undefined,
        scopeToAssignedOnly: true,
      };
      if (
        (!newPayload.selectedStages || newPayload.selectedStages.length === 0) &&
        (!newPayload.selectedResponses || newPayload.selectedResponses.length === 0) &&
        !newPayload.startDate &&
        !newPayload.endDate
      ) {
        setAppliedCountFilters(null);
        fetchLeads(1, searchQuery, statusFilter, null);
      } else {
        setAppliedCountFilters(newPayload);
        fetchLeads(1, searchQuery, statusFilter, newPayload);
      }
    } else {
      fetchLeads(1, searchQuery, statusFilter, null);
    }
  };

  const handleResetAllFilters = () => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setQuickFilterSource("");
    setQuickFilterResponse("");
    setQuickFilterOwnerId("");
    setQuickFilterTeamId("");
    setQuickFilterAssignment("");
    setAppliedCountFilters(null);
    fetchLeads(1, searchQuery, statusFilter, null);
  };

  const handleLeadFetched = () => {
    setStatusFilter("UNREAD");
    setModalSelectedStages([]);
    let newPayload = appliedCountFilters;
    if (newPayload) {
      newPayload = {
        ...newPayload,
        selectedStages: [],
        leadAssignment: undefined,
        scopeToAssignedOnly: true,
      };
      setAppliedCountFilters(newPayload);
    }
    if (quickFilterAssignment === "UNALLOTED") {
      setQuickFilterAssignment("");
    }
    updateUrl(1, searchQuery, "UNREAD", selectedLeadId);
    fetchLeads(1, searchQuery, "UNREAD", newPayload);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(1, searchQuery, statusFilter);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    fetchLeads(1, searchQuery, status);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLeads(newPage, searchQuery, statusFilter);
  };

  const handleOpenLeadDrawer = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsDrawerOpen(true);
    updateUrl(currentPage, searchQuery, statusFilter, leadId);
  };

  const handleCloseLeadDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLeadId(null);
    updateUrl(currentPage, searchQuery, statusFilter, null);
  };

  const handleDisposeLead = async (leadToDispose: LeadListItem) => {
    setIsDisposingId(leadToDispose.id);
    try {
      const res = await updateLeadDetailsAction({
        leadId: leadToDispose.id,
        status: "DISPOSED",
      });
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadToDispose.id ? { ...l, status: "DISPOSED" } : l))
        );
        fetchLeads(currentPage, searchQuery, statusFilter);
      } else {
        alert(res.error || "Failed to mark lead as disposed");
      }
    } catch {
      alert("An unexpected error occurred while disposing lead.");
    } finally {
      setIsDisposingId(null);
      setConfirmDisposeLead(null);
    }
  };

  const handleLeadUpdated = () => {
    // Refresh leads table in background
    fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "CLIENT":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "TRIAL":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "FOLLOW_UP":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "DISPOSED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "READ":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "UNREAD":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "UNFOLLOWED":
      default:
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Leads Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
              {totalCount} {totalCount === 1 ? "Lead" : "Leads"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central repository of client inquiries, advisory prospects, and sales pipeline allotments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsQuickFiltersOpen(!isQuickFiltersOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border ${isQuickFiltersOpen || hasActiveQuickFilters
              ? "bg-violet-600 text-white border-violet-500 shadow-violet-600/20"
              : "bg-slate-100/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] border-slate-250 dark:border-white/[0.08]"
              }`}
            title="Toggle Quick Filters"
          >
            <Filter className="size-3.5" />
            <span>Filters</span>
            {hasActiveQuickFilters && (
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Fetch Button (Select Source Modal) */}
          <button
            type="button"
            onClick={() => setIsFetchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Open Select Source to claim leads"
          >
            <Download className="size-3.5 stroke-[2.5]" />
            <span>Fetch</span>
          </button>
        </div>
      </div>

      {/* Quick Filters Collapsible Bar */}
      {isQuickFiltersOpen && (
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1322]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Quick Filters
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickFiltersOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Source */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Lead Source
              </label>
              <select
                value={quickFilterSource}
                onChange={(e) => setQuickFilterSource(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">All Sources</option>
                {availableSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Call Response */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Call Response
              </label>
              <select
                value={quickFilterResponse}
                onChange={(e) => setQuickFilterResponse(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">All Responses</option>
                {availableResponses.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Owner */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Lead Owner
              </label>
              <select
                value={quickFilterOwnerId}
                onChange={(e) => setQuickFilterOwnerId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">All Owners</option>
                {allotmentUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Team
              </label>
              <select
                value={quickFilterTeamId}
                onChange={(e) => setQuickFilterTeamId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">All Teams</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Assignment */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Assignment
              </label>
              <select
                value={quickFilterAssignment}
                onChange={(e) => setQuickFilterAssignment(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">Assigned / Fetched (Default)</option>
                <option value="ALL">All (Assigned & Pool)</option>
                <option value="UNALLOTED">Unassigned Pool Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleResetQuickFilters}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyQuickFilters}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xs cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="p-4 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-3">
        {/* Status Filter Badges (Exact 8 Filters) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => handleStatusFilterChange(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all shrink-0 ${active
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, email, city..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors border border-slate-250 dark:border-white/[0.08] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Search"}
          </button>
        </form>
      </div>

      {/* Toolbar: Selection Info + Select All + Action + Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        {/* Left: Selected count indicator */}
        <div className="flex items-center gap-2 min-h-[28px]">
          {selectedLeadIds.length > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 px-2.5 py-1 rounded-lg border border-violet-500/20">
                {selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer underline transition-colors"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Select leads to perform batch operations
            </span>
          )}
        </div>

        {/* Right side: Select All + Action + Count */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Select All Checkbox */}
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08]">
            <input
              ref={selectAllCheckboxRef}
              type="checkbox"
              checked={isAllCurrentPageSelected}
              onChange={toggleSelectAllCurrentPage}
              className="size-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
            />
            <span>Select All</span>
          </label>

          {/* Action Button */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setIsActionModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${selectedLeadIds.length > 0
              ? "border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 active:scale-95"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed opacity-50"
              }`}
            title={
              selectedLeadIds.length > 0
                ? "Perform bulk action on selected leads"
                : "Select leads to enable actions"
            }
          >
            <Layers className="size-3.5" />
            <span>Action</span>
            {selectedLeadIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {selectedLeadIds.length}
              </span>
            )}
          </button>

          {/* Existing Count Button */}
          <button
            type="button"
            onClick={() => setIsCountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Open Lead Count Modal"
          >
            <BarChart2 className="size-3.5" />
            <span>Count</span>
          </button>
        </div>
      </div>

      {/* Active Count & Quick Filters Banner */}
      {(modalSelectedStages.length > 0 ||
        modalSelectedResponses.length > 0 ||
        appliedCountFilters ||
        hasActiveQuickFilters) && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                Active Filters:
              </span>
              {modalSelectedStages.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30 text-[11px]"
                >
                  Stage: {st}
                </span>
              ))}
              {modalSelectedResponses.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 text-[11px]"
                >
                  Response: {r}
                </span>
              ))}
              {appliedCountFilters?.leadSource && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-500/30 text-[11px]">
                  Source: {appliedCountFilters.leadSource}
                </span>
              )}
              {appliedCountFilters?.leadResponse &&
                !modalSelectedResponses.includes(appliedCountFilters.leadResponse) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-medium border border-purple-500/30 text-[11px]">
                    Response: {appliedCountFilters.leadResponse}
                  </span>
                )}
              {appliedCountFilters?.leadOwnerId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/30 text-[11px]">
                  Owner:{" "}
                  {allotmentUsers.find((u) => u.id === appliedCountFilters.leadOwnerId)?.name ||
                    appliedCountFilters.leadOwnerId}
                </span>
              )}
              {appliedCountFilters?.teamId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/30 text-[11px]">
                  Team:{" "}
                  {availableTeams.find((t) => t.id === appliedCountFilters.teamId)?.name ||
                    appliedCountFilters.teamId}
                </span>
              )}
              {appliedCountFilters?.leadAssignment && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 font-medium border border-teal-500/30 text-[11px]">
                  Assignment: {appliedCountFilters.leadAssignment}
                </span>
              )}
              {appliedCountFilters?.startDate && appliedCountFilters?.endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-medium border border-cyan-500/30 text-[11px]">
                  Date: {appliedCountFilters.startDate} to {appliedCountFilters.endDate}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors cursor-pointer shrink-0"
            >
              <X className="size-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}

      {/* Horizontal Lead Cards List */}
      <div className="space-y-3">
        {leads.length > 0 ? (
          leads.map((lead) => {
            const isHighlighted = selectedLeadId === lead.id;
            const isSelected = selectedLeadIds.includes(lead.id);

            return (
              <div
                key={lead.id}
                onClick={() => handleOpenLeadDrawer(lead.id)}
                className={`group rounded-2xl p-4 transition-all duration-150 cursor-pointer border ${isSelected
                  ? "bg-violet-500/[0.04] dark:bg-violet-500/10 border-violet-500/60 ring-2 ring-violet-500/30 shadow-md shadow-violet-500/10"
                  : isHighlighted
                    ? "bg-violet-500/[0.08] dark:bg-violet-500/15 border-violet-500/60 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/30"
                    : "bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border-slate-200/80 dark:border-white/[0.08] hover:border-violet-400/50 dark:hover:border-violet-500/30 hover:shadow-md hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* LEFT SECTION (Identification & Assignment) */}
                  <div className="lg:col-span-4 space-y-2.5 lg:border-r border-slate-200/60 dark:border-white/[0.06] lg:pr-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleLeadSelection(lead.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 rounded-md border-slate-300 dark:border-slate-700 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
                          aria-label={`Select lead ${lead.name}`}
                        />
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-slate-250 dark:border-white/[0.08]">
                          <Hash className="size-3 text-slate-400" />
                          ID: {lead.id.slice(-8)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="size-3 text-slate-400" />
                        <span>
                          Created:{" "}
                          {new Date(lead.createdAt).toLocaleDateString('en-GB', {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {lead.name}
                      </h3>
                    </div>

                    <div className="pt-0.5 flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 shrink-0">
                        Assigned:
                      </span>
                      {lead.allotTo ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="size-5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {lead.allotTo.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lead.allotTo.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            ({lead.allotTo.role})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* MIDDLE SECTION (Contact & Location) */}
                  <div className="lg:col-span-4 space-y-2 lg:border-r border-slate-200/60 dark:border-white/[0.06] lg:pr-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="size-3 text-slate-400" /> Contact Details
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <span className="text-slate-400 text-[11px] w-14 shrink-0">Name:</span>
                        <span className="font-semibold">{lead.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-14 shrink-0">Mobile:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-violet-600 dark:text-violet-400">
                          <Phone className="size-3 shrink-0" />
                          <span>{lead.mobile}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-14 shrink-0">Email:</span>
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
                          <Mail className="size-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.email || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-14 shrink-0">State:</span>
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <MapPin className="size-3 text-slate-400 shrink-0" />
                          <span>
                            {[lead.city, lead.state].filter(Boolean).join(", ") || lead.state || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SECTION (Status, Response, Callback, Source & Action) */}
                  <div className="lg:col-span-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>

                        {lead.segment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <TrendingUp className="size-2.5 text-purple-500" />
                            {lead.segment}
                          </span>
                        )}
                      </div>

                      {/* Comprehensive Action Bar (Left to Right: Action, Edit, Call, Dispose, Timeline, WhatsApp) */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Action Icon (Hover Popup with 3 rows: Trial, Payment, Invoice) */}
                        <div className="relative group/actions inline-block">
                          <div className="relative group/tip flex items-center justify-center">
                            <button
                              type="button"
                              title="Actions"
                              aria-label="Actions"
                              className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-purple-100/80 text-slate-600 hover:text-purple-700 dark:bg-white/[0.06] dark:hover:bg-purple-950/50 dark:text-slate-300 dark:hover:text-purple-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                            >
                              <SlidersHorizontal className="size-3.5" />
                            </button>
                            <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                              Actions
                            </span>
                          </div>

                          {/* Hover Popup: 3 Rows with [Add Icon] [View Icon] */}
                          <div className="absolute right-0 top-full mt-1.5 hidden group-hover/actions:block w-44 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                            {/* Trial Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Trial</span>
                              <div className="flex items-center gap-1">
                                <button type="button" title="Add Trial" className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors">
                                  <Plus className="size-3" />
                                </button>
                                <button type="button" title="View Trial" className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors">
                                  <Eye className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Payment Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Payment</span>
                              <div className="flex items-center gap-1">
                                <button type="button" title="Add Payment" className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors">
                                  <Plus className="size-3" />
                                </button>
                                <button type="button" title="View Payment" className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors">
                                  <Eye className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Invoice Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Invoice</span>
                              <div className="flex items-center gap-1">
                                <button type="button" title="Add Invoice" className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors">
                                  <Plus className="size-3" />
                                </button>
                                <button type="button" title="View Invoice" className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors">
                                  <Eye className="size-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 1.5. Add Update Icon (Call Response Logger) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setCallUpdateModalLead(lead)}
                            title="Add Update"
                            aria-label="Add Update"
                            className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-indigo-100/80 text-slate-600 hover:text-indigo-700 dark:bg-white/[0.06] dark:hover:bg-indigo-950/50 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                          >
                            <Headphones className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Add Update
                          </span>
                        </div>

                        {/* 2. Edit Icon (Triggers working Edit Form logic) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenLeadDrawer(lead.id)}
                            title="Edit"
                            aria-label="Edit lead"
                            className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-emerald-100/80 text-slate-600 hover:text-emerald-700 dark:bg-white/[0.06] dark:hover:bg-emerald-950/50 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Edit
                          </span>
                        </div>

                        {/* 3. Call Icon (UI-Only Placeholder) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (lead.mobile) window.open(`tel:${lead.mobile}`, "_self");
                            }}
                            title="Call"
                            aria-label="Call lead"
                            className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-blue-100/80 text-slate-600 hover:text-blue-700 dark:bg-white/[0.06] dark:hover:bg-blue-950/50 dark:text-slate-300 dark:hover:text-blue-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                          >
                            <Phone className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Call
                          </span>
                        </div>

                        {/* 4. Dispose Icon (Triggers working lead disposition logic) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            disabled={lead.status === "DISPOSED" || isDisposingId === lead.id}
                            onClick={() => setConfirmDisposeLead(lead)}
                            title={lead.status === "DISPOSED" ? "Already Disposed" : "Dispose"}
                            aria-label="Dispose lead"
                            className={`size-7 rounded-lg flex items-center justify-center border transition-colors shadow-2xs ${lead.status === "DISPOSED"
                              ? "bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                              : "bg-slate-100/90 hover:bg-rose-100/80 text-slate-600 hover:text-rose-700 dark:bg-white/[0.06] dark:hover:bg-rose-950/50 dark:text-slate-300 dark:hover:text-rose-300 border-slate-200/90 dark:border-white/[0.08]"
                              }`}
                          >
                            {isDisposingId === lead.id ? (
                              <Loader2 className="size-3.5 animate-spin text-rose-500" />
                            ) : (
                              <CircleOff className="size-3.5" />
                            )}
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Dispose
                          </span>
                        </div>

                        {/* 5. Timeline Icon (Displays Created By & Created At timestamps) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setTimelineModalLead(lead)}
                            title="Timeline"
                            aria-label="View Timeline"
                            className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-sky-100/80 text-slate-600 hover:text-sky-700 dark:bg-white/[0.06] dark:hover:bg-sky-950/50 dark:text-slate-300 dark:hover:text-sky-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                          >
                            <Clock className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Timeline
                          </span>
                        </div>

                        {/* 6. WhatsApp Icon (UI-Only Placeholder) */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (lead.mobile) {
                                window.open(`https://wa.me/91${lead.mobile.replace(/\D/g, "")}`, "_blank");
                              }
                            }}
                            title="WhatsApp"
                            aria-label="WhatsApp"
                            className="size-7 rounded-lg flex items-center justify-center bg-slate-100/90 hover:bg-emerald-100/80 text-emerald-600 hover:text-emerald-700 dark:bg-white/[0.06] dark:hover:bg-emerald-950/50 dark:text-emerald-400 dark:hover:text-emerald-300 border border-slate-200/90 dark:border-white/[0.08] transition-colors shadow-2xs"
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            WhatsApp
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-20 shrink-0">Response:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {lead.leadResponse || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-20 shrink-0">Comment:</span>
                        <span
                          className={`text-[11px] truncate max-w-[280px] ${lead.description
                            ? "text-slate-700 dark:text-slate-300 font-medium not-italic"
                            : "text-slate-400 italic"
                            }`}
                          title={lead.description || undefined}
                        >
                          {lead.description || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-20 shrink-0">Callback:</span>
                        {lead.callbackDate ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="size-3 shrink-0" />
                            <span>
                              {new Date(lead.callbackDate).toLocaleDateString('en-GB', {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-20 shrink-0">Source:</span>
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Tag className="size-3 text-slate-400 shrink-0" />
                          <span>{lead.leadSource || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs text-slate-400 space-y-2">
            <div className="inline-flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
              <Inbox className="size-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No leads found
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No leads match the selected filter or search query."
                : "Start building your sales pipeline by adding your first lead."}
            </p>
            <div className="pt-2">
              <Link
                href="/admin/leads/add"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
              >
                <UserPlus className="size-3.5" />
                <span>Add First Lead</span>
              </Link>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Lead Timeline Modal */}
      <AdminLeadTimelineModal
        lead={timelineModalLead}
        isOpen={!!timelineModalLead}
        onClose={() => setTimelineModalLead(null)}
      />

      {/* Confirmation Modal for Lead Disposition */}
      {confirmDisposeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setConfirmDisposeLead(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-5 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mark Lead as Disposed?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to dispose <strong className="text-slate-800 dark:text-slate-200">{confirmDisposeLead.name}</strong> ({confirmDisposeLead.mobile})? This updates the lead status to DISPOSED and refreshes your pipeline.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
              <button
                type="button"
                disabled={isDisposingId !== null}
                onClick={() => setConfirmDisposeLead(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisposingId !== null}
                onClick={() => handleDisposeLead(confirmDisposeLead)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
              >
                {isDisposingId ? <Loader2 className="size-3.5 animate-spin" /> : <CircleOff className="size-3.5" />}
                <span>Confirm Dispose</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Response (Add Update) Modal */}
      <LeadCallUpdateModal
        lead={callUpdateModalLead}
        isOpen={!!callUpdateModalLead}
        onClose={() => setCallUpdateModalLead(null)}
        onSuccess={() => {
          fetchLeads(currentPage, searchQuery, statusFilter);
        }}
      />

      {/* Details & Update Drawer */}
      <LeadDetailsDrawer
        leadId={selectedLeadId}
        isOpen={isDrawerOpen}
        onClose={handleCloseLeadDrawer}
        onLeadUpdated={handleLeadUpdated}
        allotmentUsers={allotmentUsers}
      />

      {/* Admin Lead Count Modal */}
      <LeadCountModal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        mode="admin"
        currentStatus={statusFilter}
        allotmentUsers={allotmentUsers}
        teams={availableTeams}
        fetchCountsAction={getAdminLeadCountsSummaryAction}
        onApplyFilters={handleApplyCountModalFilters}
        onResetFilters={handleResetCountModalFilters}
        onExecuteAdminBulkAction={executeAdminLeadCountBulkAction}
        onBulkSuccess={() => {
          fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
        }}
      />

      {/* Admin Select Source Fetch Modal */}
      <AdminFetchModal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        onLeadFetched={handleLeadFetched}
      />

      {/* Admin Selected Leads Action Modal */}
      <AdminSelectedLeadsActionModal
        isOpen={isActionModalOpen}
        selectedLeadIds={selectedLeadIds}
        onClose={() => setIsActionModalOpen(false)}
        onSuccess={() => {
          setSelectedLeadIds([]);
          fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
        }}
        allotmentUsers={allotmentUsers}
        availableSources={availableSources}
        availableTeams={availableTeams}
      />
    </div>
  );
}
