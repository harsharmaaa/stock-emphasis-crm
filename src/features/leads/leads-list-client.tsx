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
import { normalizeStatusFilter, cn } from "@/src/lib/utils";
import type { Tone } from "@/src/types/ui-kit";
import {
  PageHeader,
  Badge,
  Button,
  Card,
  Tabs,
  Pagination,
  EmptyState,
  ConfirmDialog,
  Input,
  useToast,
} from "@/src/components/ui";
import { LeadDetailsDrawer } from "./lead-details-drawer";
import { LeadCallUpdateModal } from "./lead-call-update-modal";
import {
  LeadCountModal,
  type LeadCountFilterApplyPayload,
} from "@/src/components/leads/lead-count-modal";
import { AdminFetchModal } from "./admin-fetch-modal";
import { AdminSelectedLeadsActionModal } from "./admin-selected-leads-action-modal";
import { AdminLeadTimelineModal } from "./admin-lead-timeline-modal";
import { AddFreeTrialModal, ViewTrialModal } from "@/src/features/trials/trial-modals";
import { AddPaymentModal, ViewPaymentModal } from "@/src/features/payments/payment-modals";
import {
  Search,
  Phone,
  Mail,
  MapPin,
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
  { id: "ALL", label: "All" },
  { id: "UNFOLLOWED", label: "Unfollowed" },
  { id: "UNREAD", label: "Unread" },
  { id: "READ", label: "Read" },
  { id: "FOLLOW_UP", label: "Followups" },
  { id: "TRIAL", label: "Trials" },
  { id: "CLIENT", label: "Clients" },
  { id: "DISPOSED", label: "Disposed" },
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
  const toast = useToast();

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

  // Free Trial Modals State
  const [addTrialModalLead, setAddTrialModalLead] = useState<LeadListItem | null>(null);
  const [viewTrialModalLead, setViewTrialModalLead] = useState<LeadListItem | null>(null);

  // Payment Modals State
  const [addPaymentModalLead, setAddPaymentModalLead] = useState<LeadListItem | null>(null);
  const [viewPaymentModalLead, setViewPaymentModalLead] = useState<LeadListItem | null>(null);

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
      } else {
        setStatusFilter("ALL");
      }
      if (urlSearch !== null) {
        setSearchQuery((prev) => (prev !== urlSearch ? urlSearch : prev));
      } else {
        setSearchQuery("");
      }
      if (urlLeadId) {
        setSelectedLeadId((prev) => (prev !== urlLeadId ? urlLeadId : prev));
        setIsDrawerOpen((prev) => (!prev ? true : prev));
      } else {
        setSelectedLeadId(null);
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
        toast?.success(`Lead "${leadToDispose.name}" marked as disposed.`);
        fetchLeads(currentPage, searchQuery, statusFilter);
      } else {
        toast?.error(res.error || "Failed to mark lead as disposed");
      }
    } catch {
      toast?.error("An unexpected error occurred while disposing lead.");
    } finally {
      setIsDisposingId(null);
      setConfirmDisposeLead(null);
    }
  };

  const handleLeadUpdated = () => {
    // Refresh leads table in background
    fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
  };

  const getStatusBadgeTone = (status: string): Tone => {
    switch (status) {
      case "CLIENT":
        return "ok";
      case "TRIAL":
        return "info";
      case "FOLLOW_UP":
        return "warn";
      case "DISPOSED":
        return "err";
      case "READ":
        return "info";
      case "UNREAD":
      case "UNFOLLOWED":
      default:
        return "info";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Controls with PageHeader */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-[var(--text)] tracking-tight">
              Leads Management
            </h1>
            <Badge tone="info">
              {totalCount} {totalCount === 1 ? "Lead" : "Leads"}
            </Badge>
          </div>
        }
        description="Central repository of client inquiries, advisory prospects, and sales pipeline allotments."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Leads" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Filters Toggle Button */}
            <Button
              type="button"
              variant={isQuickFiltersOpen || hasActiveQuickFilters ? "primary" : "secondary"}
              size="sm"
              onClick={() => setIsQuickFiltersOpen(!isQuickFiltersOpen)}
              title="Toggle Quick Filters"
            >
              <Filter className="size-3.5" />
              <span>Filters</span>
              {hasActiveQuickFilters && (
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
              )}
            </Button>

            {/* Fetch Button (Select Source Modal) */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsFetchModalOpen(true)}
              title="Open Select Source to claim leads"
            >
              <Download className="size-3.5 stroke-[2.5]" />
              <span>Fetch</span>
            </Button>
          </div>
        }
      />

      {/* Quick Filters Collapsible Bar */}
      {isQuickFiltersOpen && (
        <Card className="p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-[var(--brand)]" />
              <span className="text-xs font-bold text-[var(--text)]">
                Quick Filters
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickFiltersOpen(false)}
              className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Source */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                Lead Source
              </label>
              <select
                value={quickFilterSource}
                onChange={(e) => setQuickFilterSource(e.target.value)}
                className="inp text-xs py-1.5 h-8 w-full"
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
              <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                Call Response
              </label>
              <select
                value={quickFilterResponse}
                onChange={(e) => setQuickFilterResponse(e.target.value)}
                className="inp text-xs py-1.5 h-8 w-full"
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
              <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                Lead Owner
              </label>
              <select
                value={quickFilterOwnerId}
                onChange={(e) => setQuickFilterOwnerId(e.target.value)}
                className="inp text-xs py-1.5 h-8 w-full"
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
              <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                Team
              </label>
              <select
                value={quickFilterTeamId}
                onChange={(e) => setQuickFilterTeamId(e.target.value)}
                className="inp text-xs py-1.5 h-8 w-full"
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
              <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                Assignment
              </label>
              <select
                value={quickFilterAssignment}
                onChange={(e) => setQuickFilterAssignment(e.target.value)}
                className="inp text-xs py-1.5 h-8 w-full"
              >
                <option value="">Assigned / Fetched (Default)</option>
                <option value="ALL">All (Assigned & Pool)</option>
                <option value="UNALLOTED">Unassigned Pool Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetQuickFilters}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyQuickFilters}
            >
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Filter Tabs & Search Controls */}
      <Card className="p-4 space-y-3">
        {/* Status Filter Badges with Tabs in filter mode */}
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <Tabs
            mode="filter"
            items={STATUS_FILTERS}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            label="Filter Leads by Status"
          />
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 text-[var(--muted)] absolute left-3.5 top-2.5 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, email, city..."
              className="pl-9 pr-4 text-xs h-9"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Search"}
          </Button>
        </form>
      </Card>

      {/* Toolbar: Selection Info + Select All + Action + Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        {/* Left: Selected count indicator */}
        <div className="flex items-center gap-2 min-h-[28px]">
          {selectedLeadIds.length > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <Badge tone="info">
                {selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? "" : "s"} selected
              </Badge>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-[11px] font-semibold text-[var(--muted)] hover:text-rose-500 cursor-pointer underline transition-colors"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--muted)] font-medium hidden sm:inline">
              Select leads to perform batch operations
            </span>
          )}
        </div>

        {/* Right side: Select All + Action + Count */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Select All Checkbox */}
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text)] hover:bg-[var(--glass-stroke)] transition-colors cursor-pointer select-none border border-transparent hover:border-[var(--border)]">
            <input
              ref={selectAllCheckboxRef}
              type="checkbox"
              checked={isAllCurrentPageSelected}
              onChange={toggleSelectAllCurrentPage}
              className="size-3.5 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]/30 cursor-pointer"
            />
            <span>Select All</span>
          </label>

          {/* Action Button */}
          <Button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setIsActionModalOpen(true)}
            variant={selectedLeadIds.length > 0 ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              selectedLeadIds.length > 0
                ? "!border-amber-400/50 !text-amber-700 dark:!text-amber-300 !bg-amber-500/10"
                : "opacity-50"
            )}
            title={
              selectedLeadIds.length > 0
                ? "Perform bulk action on selected leads"
                : "Select leads to enable actions"
            }
          >
            <Layers className="size-3.5" />
            <span>Action</span>
            {selectedLeadIds.length > 0 && (
              <Badge tone="warn" className="px-1.5 py-0 text-[10px]">
                {selectedLeadIds.length}
              </Badge>
            )}
          </Button>

          {/* Existing Count Button */}
          <Button
            type="button"
            onClick={() => setIsCountModalOpen(true)}
            variant="secondary"
            size="sm"
            className="!border-rose-400/40 !text-rose-600 dark:!text-rose-400 !bg-rose-500/10"
            title="Open Lead Count Modal"
          >
            <BarChart2 className="size-3.5" />
            <span>Count</span>
          </Button>
        </div>
      </div>

      {/* Active Count & Quick Filters Banner */}
      {(modalSelectedStages.length > 0 ||
        modalSelectedResponses.length > 0 ||
        appliedCountFilters ||
        hasActiveQuickFilters) && (
          <Card className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--brand)]/[0.05] border-[var(--brand)]/20 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--brand)]">
                Active Filters:
              </span>
              {modalSelectedStages.map((st) => (
                <Badge key={st} tone="info">
                  Stage: {st}
                </Badge>
              ))}
              {modalSelectedResponses.map((r) => (
                <Badge key={r} tone="info">
                  Response: {r}
                </Badge>
              ))}
              {appliedCountFilters?.leadSource && (
                <Badge tone="info">
                  Source: {appliedCountFilters.leadSource}
                </Badge>
              )}
              {appliedCountFilters?.leadResponse &&
                !modalSelectedResponses.includes(appliedCountFilters.leadResponse) && (
                  <Badge tone="info">
                    Response: {appliedCountFilters.leadResponse}
                  </Badge>
                )}
              {appliedCountFilters?.leadOwnerId && (
                <Badge tone="ok">
                  Owner:{" "}
                  {allotmentUsers.find((u) => u.id === appliedCountFilters.leadOwnerId)?.name ||
                    appliedCountFilters.leadOwnerId}
                </Badge>
              )}
              {appliedCountFilters?.teamId && (
                <Badge tone="warn">
                  Team:{" "}
                  {availableTeams.find((t) => t.id === appliedCountFilters.teamId)?.name ||
                    appliedCountFilters.teamId}
                </Badge>
              )}
              {appliedCountFilters?.leadAssignment && (
                <Badge tone="info">
                  Assignment: {appliedCountFilters.leadAssignment}
                </Badge>
              )}
              {appliedCountFilters?.startDate && appliedCountFilters?.endDate && (
                <Badge tone="info">
                  Date: {appliedCountFilters.startDate} to {appliedCountFilters.endDate}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetAllFilters}
              className="!text-rose-500 hover:!bg-rose-500/10 shrink-0"
            >
              <X className="size-3.5" />
              <span>Clear Filters</span>
            </Button>
          </Card>
        )}

      {/* Horizontal Lead Cards List */}
      <div className="space-y-3">
        {leads.length > 0 ? (
          leads.map((lead) => {
            const isHighlighted = selectedLeadId === lead.id;
            const isSelected = selectedLeadIds.includes(lead.id);

            return (
              <Card
                key={lead.id}
                onClick={() => handleOpenLeadDrawer(lead.id)}
                className={cn(
                  "group p-4 transition-all duration-150 cursor-pointer overflow-visible",
                  isSelected
                    ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/30 shadow-md bg-[var(--brand)]/[0.04] dark:bg-[var(--brand)]/10"
                    : isHighlighted
                    ? "border-[var(--brand)]/80 ring-1 ring-[var(--brand)]/30 shadow-md bg-[var(--brand)]/[0.06] dark:bg-[var(--brand)]/15"
                    : "hover:border-[var(--brand)]/50 hover:shadow-md"
                )}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* LEFT SECTION (Identification & Assignment) */}
                  <div className="lg:col-span-4 space-y-2.5 lg:border-r border-[var(--border)] lg:pr-4">
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
                          className="size-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]/30 cursor-pointer"
                          aria-label={`Select lead ${lead.name}`}
                        />
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--muted)] bg-[var(--glass-stroke)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                          <Hash className="size-3 text-[var(--muted)]" />
                          ID: {lead.id.slice(-8)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <Calendar className="size-3 text-[var(--muted)]" />
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
                      <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors">
                        {lead.name}
                      </h3>
                    </div>

                    <div className="pt-0.5 flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] shrink-0">
                        Assigned:
                      </span>
                      {lead.allotTo ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="size-5 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] font-bold text-[9px] flex items-center justify-center shrink-0">
                            {lead.allotTo.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-[var(--text)] truncate">
                            {lead.allotTo.name}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
                            ({lead.allotTo.role})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)] italic text-[11px]">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* MIDDLE SECTION (Contact & Location) */}
                  <div className="lg:col-span-4 space-y-2 lg:border-r border-[var(--border)] lg:pr-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
                      <User className="size-3 text-[var(--muted)]" /> Contact Details
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-[var(--text)]">
                        <span className="text-[var(--muted)] text-[11px] w-14 shrink-0">Name:</span>
                        <span className="font-semibold">{lead.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-14 shrink-0">Mobile:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-[var(--brand)]">
                          <Phone className="size-3 shrink-0" />
                          <span>{lead.mobile}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-14 shrink-0">Email:</span>
                        <div className="flex items-center gap-1 text-[var(--text)] truncate">
                          <Mail className="size-3 text-[var(--muted)] shrink-0" />
                          <span className="truncate">{lead.email || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-14 shrink-0">State:</span>
                        <div className="flex items-center gap-1 text-[var(--text)]">
                          <MapPin className="size-3 text-[var(--muted)] shrink-0" />
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
                        <Badge tone={getStatusBadgeTone(lead.status)}>
                          {lead.status}
                        </Badge>

                        {lead.segment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--glass-stroke)] text-[var(--text)] border border-[var(--border)]">
                            <TrendingUp className="size-2.5 text-[var(--brand)]" />
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
                              className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-[var(--brand)]/15 text-[var(--text)] hover:text-[var(--brand)] border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
                            >
                              <SlidersHorizontal className="size-3.5" />
                            </button>
                            <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                              Actions
                            </span>
                          </div>

                          {/* Hover Popup: 3 Rows with [Add Icon] [View Icon] */}
                          <div className="absolute right-0 top-full mt-1.5 hidden group-hover/actions:block w-44 rounded-xl bg-[var(--panel-solid)] border border-[var(--border)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                            {/* Trial Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--glass-stroke)] transition-colors text-xs">
                              <span className="font-semibold text-[var(--text)]">Trial</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAddTrialModalLead(lead)}
                                  title="Add Trial"
                                  className="p-1 rounded-md hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                                >
                                  <Plus className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewTrialModalLead(lead)}
                                  title="View Trial"
                                  className="p-1 rounded-md hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                >
                                  <Eye className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Payment Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--glass-stroke)] transition-colors text-xs">
                              <span className="font-semibold text-[var(--text)]">Payment</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAddPaymentModalLead(lead)}
                                  title="Add Payment"
                                  className="p-1 rounded-md hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                                >
                                  <Plus className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewPaymentModalLead(lead)}
                                  title="View Payment"
                                  className="p-1 rounded-md hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                >
                                  <Eye className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Invoice Row */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--glass-stroke)] transition-colors text-xs">
                              <span className="font-semibold text-[var(--text)]">Invoice</span>
                              <div className="flex items-center gap-1">
                                <button type="button" title="Add Invoice" className="p-1 rounded-md hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer">
                                  <Plus className="size-3" />
                                </button>
                                <button type="button" title="View Invoice" className="p-1 rounded-md hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer">
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
                            className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-[var(--brand)]/15 text-[var(--text)] hover:text-[var(--brand)] border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
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
                            className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-emerald-500/15 text-[var(--text)] hover:text-emerald-600 dark:hover:text-emerald-400 border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Edit
                          </span>
                        </div>

                        {/* 3. Call Icon */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (lead.mobile) window.open(`tel:${lead.mobile}`, "_self");
                            }}
                            title="Call"
                            aria-label="Call lead"
                            className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-blue-500/15 text-[var(--text)] hover:text-blue-600 dark:hover:text-blue-400 border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
                          >
                            <Phone className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Call
                          </span>
                        </div>

                        {/* 4. Dispose Icon */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            disabled={lead.status === "DISPOSED" || isDisposingId === lead.id}
                            onClick={() => setConfirmDisposeLead(lead)}
                            title={lead.status === "DISPOSED" ? "Already Disposed" : "Dispose"}
                            aria-label="Dispose lead"
                            className={cn(
                              "size-7 rounded-lg flex items-center justify-center border transition-colors shadow-2xs",
                              lead.status === "DISPOSED"
                                ? "bg-[var(--glass-stroke)] text-[var(--muted)] opacity-50 cursor-not-allowed"
                                : "bg-[var(--glass-stroke)] hover:bg-rose-500/15 text-[var(--text)] hover:text-rose-600 dark:hover:text-rose-400 border-[var(--border)] cursor-pointer"
                            )}
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

                        {/* 5. Timeline Icon */}
                        <div className="relative group/tip flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setTimelineModalLead(lead)}
                            title="Timeline"
                            aria-label="View Timeline"
                            className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-cyan-500/15 text-[var(--text)] hover:text-cyan-600 dark:hover:text-cyan-400 border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
                          >
                            <Clock className="size-3.5" />
                          </button>
                          <span className="absolute -top-7 hidden group-hover/tip:block text-[10px] font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                            Timeline
                          </span>
                        </div>

                        {/* 6. WhatsApp Icon */}
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
                            className="size-7 rounded-lg flex items-center justify-center bg-[var(--glass-stroke)] hover:bg-emerald-500/15 text-[var(--text)] hover:text-emerald-600 dark:hover:text-emerald-400 border border-[var(--border)] transition-colors shadow-2xs cursor-pointer"
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
                        <span className="text-[var(--muted)] text-[11px] w-20 shrink-0">Response:</span>
                        <span className="font-semibold text-[var(--text)]">
                          {lead.leadResponse || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-20 shrink-0">Comment:</span>
                        <span
                          className={cn(
                            "text-[11px] truncate max-w-[280px]",
                            lead.description
                              ? "text-[var(--text)] font-medium not-italic"
                              : "text-[var(--muted)] italic"
                          )}
                          title={lead.description || undefined}
                        >
                          {lead.description || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-20 shrink-0">Callback:</span>
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
                          <span className="text-[var(--muted)] text-[11px]">—</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)] text-[11px] w-20 shrink-0">Source:</span>
                        <div className="flex items-center gap-1 text-[var(--text)]">
                          <Tag className="size-3 text-[var(--muted)] shrink-0" />
                          <span>{lead.leadSource || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="Inbox"
            title="No leads found"
            description={
              searchQuery || statusFilter !== "ALL"
                ? "No leads match the selected filter or search query."
                : "Start building your sales pipeline by adding your first lead."
            }
          >
            <div className="pt-2">
              <Link href="/admin/leads/add">
                <Button variant="primary" size="sm">
                  Add First Lead
                </Button>
              </Link>
            </div>
          </EmptyState>
        )}

        {/* Server Pagination Footer */}
        {totalPages > 1 && (
          <Card className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <span>
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <Pagination
              page={currentPage}
              pages={totalPages}
              onChange={handlePageChange}
            />
          </Card>
        )}
      </div>

      {/* Admin Lead Timeline Modal */}
      <AdminLeadTimelineModal
        lead={timelineModalLead}
        isOpen={!!timelineModalLead}
        onClose={() => setTimelineModalLead(null)}
      />

      {/* Confirmation Modal for Lead Disposition with ConfirmDialog */}
      <ConfirmDialog
        open={!!confirmDisposeLead}
        onClose={() => setConfirmDisposeLead(null)}
        onConfirm={() => confirmDisposeLead && handleDisposeLead(confirmDisposeLead)}
        title="Mark Lead as Disposed?"
        description={
          confirmDisposeLead ? (
            <span>
              Are you sure you want to dispose{" "}
              <strong className="text-[var(--text)]">{confirmDisposeLead.name}</strong> (
              {confirmDisposeLead.mobile})? This updates the lead status to DISPOSED and refreshes your pipeline.
            </span>
          ) : undefined
        }
        confirmText="Confirm Dispose"
        cancelText="Cancel"
        tone="danger"
        loading={isDisposingId !== null}
      />

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

      {/* Free Trial Modals */}
      <AddFreeTrialModal
        isOpen={Boolean(addTrialModalLead)}
        onClose={() => setAddTrialModalLead(null)}
        lead={addTrialModalLead}
        onSuccess={() => {
          fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
        }}
      />
      <ViewTrialModal
        isOpen={Boolean(viewTrialModalLead)}
        onClose={() => setViewTrialModalLead(null)}
        lead={viewTrialModalLead}
      />

      {/* Payment Modals */}
      <AddPaymentModal
        isOpen={Boolean(addPaymentModalLead)}
        onClose={() => setAddPaymentModalLead(null)}
        lead={addPaymentModalLead}
        onSuccess={() => {
          fetchLeads(currentPage, searchQuery, statusFilter, appliedCountFilters);
        }}
      />
      <ViewPaymentModal
        isOpen={Boolean(viewPaymentModalLead)}
        onClose={() => setViewPaymentModalLead(null)}
        lead={viewPaymentModalLead}
      />
    </div>
  );
}
