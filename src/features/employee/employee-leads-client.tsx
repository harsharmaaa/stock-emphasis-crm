"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  EmployeeLeadItem,
  EmployeeStatusCounts,
  EmployeeFilterDropdownOptions,
} from "./lead-actions";
import {
  getEmployeeLeadsAction,
  disposeEmployeeLeadAction,
  restoreEmployeeLeadAction,
  getEmployeeLeadCountsSummaryAction,
} from "./lead-actions";
import { EmployeeCallUpdateModal } from "./employee-call-update-modal";
import { EmployeeLeadDrawer } from "./employee-lead-drawer";
import { EmployeeFetchModal } from "./employee-fetch-modal";
import { EmployeeLeadDetailsModal } from "./employee-lead-details-modal";
import { EmployeeLeadTimelineModal } from "./employee-lead-timeline-modal";
import {
  LeadCountModal,
  type LeadCountFilterApplyPayload,
} from "@/src/components/leads/lead-count-modal";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CalendarClock,
  Clock,
  User,
  Users,
  Eye,
  X,
  Tag,
  MessageSquare,
  MessageCircle,
  RotateCcw,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CircleOff,
  Loader2,
  Download,
  BarChart2,
  Filter,
} from "lucide-react";

export interface EmployeeLeadFiltersState {
  lastUpdateDateType?: string;
  lastUpdateDate: string;
  startDate: string;
  endDate: string;
  leadSource: string;
  leadResponse: string;
  trialStatus: string;
  serviceStatus: string;
  serviceId: string;
  createdById: string;
  leadAssignment?: string;
  paidRange: string;
  recycleCount: string;
  mobile: string;
}

const DEFAULT_FILTERS: EmployeeLeadFiltersState = {
  lastUpdateDateType: "",
  lastUpdateDate: "",
  startDate: "",
  endDate: "",
  leadSource: "",
  leadResponse: "",
  trialStatus: "",
  serviceStatus: "",
  serviceId: "",
  createdById: "",
  leadAssignment: "",
  paidRange: "",
  recycleCount: "",
  mobile: "",
};

interface EmployeeLeadsClientProps {
  initialLeads: EmployeeLeadItem[];
  initialStatus?: string;
  initialSearch?: string;
  initialStatusCounts?: EmployeeStatusCounts;
  initialFilterOptions?: EmployeeFilterDropdownOptions;
}

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Read", value: "READ" },
  { label: "Followups", value: "FOLLOW_UP" },
  { label: "Trials", value: "TRIAL" },
  { label: "Clients", value: "CLIENT" },
  { label: "Disposed", value: "DISPOSED" },
] as const;

type SortKey = "assigned" | "id" | "name" | "callback" | "response" | "source" | "lastUpdate";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "assigned", label: "Assigned" },
  { key: "id", label: "Id" },
  { key: "name", label: "Name" },
  { key: "callback", label: "Callback" },
  { key: "response", label: "Response" },
  { key: "source", label: "Source" },
  { key: "lastUpdate", label: "Last Update" },
];

const CLIENT_CANONICAL_RESPONSES: Record<string, string> = {
  "call back": "Call Back",
  "callback": "Call Back",
  "call_back": "Call Back",
  "cb": "Call Back",
  "npc": "NPC",
  "do not trade": "Do Not Trade",
  "dnt": "Do Not Trade",
  "not reachable": "Not Reachable",
  "not rechable": "Not Reachable",
  "unreachable": "Not Reachable",
  "switch off": "Switch Off",
  "switched off": "Switch Off",
  "not interested": "Not Interested",
  "not intrested": "Not Interested",
  "ni": "Not Interested",
  "call disconnect": "Call Disconnected",
  "call disconnected": "Call Disconnected",
  "disconnected": "Call Disconnected",
  "language issue": "Language Issue",
  "busy": "Busy",
  "ft": "FT",
  "free trial": "FT",
  "trial": "FT",
  "interested": "Interested",
  "intrested": "Interested",
  "paid": "Paid",
  "payment": "Paid",
};

function normalizeClientResponse(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().toLowerCase();
  return CLIENT_CANONICAL_RESPONSES[trimmed] || trimmed;
}

export function EmployeeLeadsClient({
  initialLeads,
  initialStatus = "ALL",
  initialSearch = "",
  initialStatusCounts,
  initialFilterOptions,
}: EmployeeLeadsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<EmployeeLeadItem[]>(initialLeads);
  const [activeStatus, setActiveStatus] = useState<string>(initialStatus || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [statusCountsState, setStatusCountsState] = useState<EmployeeStatusCounts | null>(
    initialStatusCounts || null
  );

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("lastUpdate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Collapsible Filters Panel State
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [filterOptions] = useState<EmployeeFilterDropdownOptions>(
    initialFilterOptions || {
      sources: [],
      responses: [],
      products: [],
      creators: [],
      employeeName: "",
      employeeTeamName: "",
    }
  );
  const [filterState, setFilterState] = useState<EmployeeLeadFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EmployeeLeadFiltersState>(DEFAULT_FILTERS);
  const [modalSelectedStages, setModalSelectedStages] = useState<string[]>([]);
  const [modalSelectedResponses, setModalSelectedResponses] = useState<string[]>([]);

  // Modals & Drawer states
  const [detailsModalLead, setDetailsModalLead] = useState<EmployeeLeadItem | null>(null);
  const [timelineModalLead, setTimelineModalLead] = useState<EmployeeLeadItem | null>(null);
  const [callUpdateModalLead, setCallUpdateModalLead] = useState<EmployeeLeadItem | null>(null);
  const [editDrawerLeadId, setEditDrawerLeadId] = useState<string | null>(null);
  const [confirmDisposeLead, setConfirmDisposeLead] = useState<EmployeeLeadItem | null>(null);
  const [disposeReason, setDisposeReason] = useState<string>("");
  const [isDisposingId, setIsDisposingId] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Compute tab counts
  const statusCounts = useMemo(() => {
    if (statusCountsState) return statusCountsState;
    const counts: EmployeeStatusCounts = {
      ALL: leads.length,
      UNREAD: 0,
      READ: 0,
      FOLLOW_UP: 0,
      TRIAL: 0,
      CLIENT: 0,
      DISPOSED: 0,
    };
    leads.forEach((l) => {
      const s = (l.status || "").toUpperCase();
      if (s === "UNREAD" || s === "UNFOLLOWED") counts.UNREAD++;
      else if (s === "READ") counts.READ++;
      else if (s === "FOLLOW_UP" || s === "FOLLOWUPS") counts.FOLLOW_UP++;
      else if (s === "TRIAL" || s === "TRIALS") counts.TRIAL++;
      else if (s === "CLIENT" || s === "CLIENTS") counts.CLIENT++;
      else if (s === "DISPOSED") counts.DISPOSED++;
    });
    return counts;
  }, [leads, statusCountsState]);

  // Client-side filtering across active tab, modal selections, & search
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const leadStatusUpper = (lead.status || "").toUpperCase();
      const normalizedLeadResp = normalizeClientResponse(lead.leadResponse);

      // Modal multi-selection filter across stages and call responses
      if (modalSelectedStages.length > 0 || modalSelectedResponses.length > 0) {
        const stageMatch = modalSelectedStages.some((stage) => {
          if (stage === "UNREAD") return leadStatusUpper === "UNREAD" || leadStatusUpper === "UNFOLLOWED";
          if (stage === "FOLLOW_UP") return leadStatusUpper === "FOLLOW_UP" || leadStatusUpper === "FOLLOWUPS";
          if (stage === "TRIAL") return leadStatusUpper === "TRIAL" || leadStatusUpper === "TRIALS";
          if (stage === "CLIENT") return leadStatusUpper === "CLIENT" || leadStatusUpper === "CLIENTS";
          if (stage === "DISPOSED") return leadStatusUpper === "DISPOSED";
          return leadStatusUpper === stage;
        });

        const respMatch = modalSelectedResponses.some((resp) => {
          const normalizedSelected = normalizeClientResponse(resp);
          return (
            normalizedSelected === normalizedLeadResp ||
            resp.trim().toLowerCase() === (lead.leadResponse || "").trim().toLowerCase()
          );
        });

        if (modalSelectedStages.length > 0 && modalSelectedResponses.length > 0) {
          if (!stageMatch && !respMatch) return false;
        } else if (modalSelectedStages.length > 0) {
          if (!stageMatch) return false;
        } else if (modalSelectedResponses.length > 0) {
          if (!respMatch) return false;
        }
      } else if (activeStatus !== "ALL") {
        if (activeStatus === "UNREAD") {
          if (leadStatusUpper !== "UNREAD" && leadStatusUpper !== "UNFOLLOWED") return false;
        } else if (activeStatus === "TRIAL") {
          if (leadStatusUpper !== "TRIAL" && leadStatusUpper !== "TRIALS") return false;
        } else if (activeStatus === "CLIENT") {
          if (leadStatusUpper !== "CLIENT" && leadStatusUpper !== "CLIENTS") return false;
        } else if (activeStatus === "FOLLOW_UP") {
          if (leadStatusUpper !== "FOLLOW_UP" && leadStatusUpper !== "FOLLOWUPS") return false;
        } else if (activeStatus === "DISPOSED") {
          if (leadStatusUpper !== "DISPOSED") return false;
        } else if (leadStatusUpper !== activeStatus) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = lead.name.toLowerCase().includes(q);
        const mobileMatch = lead.mobile.includes(q);
        const emailMatch = lead.email ? lead.email.toLowerCase().includes(q) : false;
        const cityMatch = lead.city ? lead.city.toLowerCase().includes(q) : false;
        const stateMatch = lead.state ? lead.state.toLowerCase().includes(q) : false;
        const sourceMatch = lead.leadSource ? lead.leadSource.toLowerCase().includes(q) : false;
        const responseMatch = lead.leadResponse ? lead.leadResponse.toLowerCase().includes(q) : false;

        return (
          nameMatch ||
          mobileMatch ||
          emailMatch ||
          cityMatch ||
          stateMatch ||
          sourceMatch ||
          responseMatch
        );
      }

      return true;
    });
  }, [leads, activeStatus, modalSelectedStages, modalSelectedResponses, searchQuery]);

  // Client-side sorting
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "assigned": {
          const nameA = a.assignedTo?.name || "";
          const nameB = b.assignedTo?.name || "";
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case "id": {
          comparison = a.id.localeCompare(b.id);
          break;
        }
        case "name": {
          comparison = a.name.localeCompare(b.name);
          break;
        }
        case "callback": {
          const timeA = a.callbackDate ? new Date(a.callbackDate).getTime() : 0;
          const timeB = b.callbackDate ? new Date(b.callbackDate).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case "response": {
          const respA = a.leadResponse || "";
          const respB = b.leadResponse || "";
          comparison = respA.localeCompare(respB);
          break;
        }
        case "source": {
          const srcA = a.leadSource || "";
          const srcB = b.leadSource || "";
          comparison = srcA.localeCompare(srcB);
          break;
        }
        case "lastUpdate":
        default: {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          comparison = timeA - timeB;
          break;
        }
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredLeads, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLeads.slice(startIndex, startIndex + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  const handleApplyFilters = () => {
    setAppliedFilters(filterState);
    setCurrentPage(1);

    startTransition(async () => {
      const res = await getEmployeeLeadsAction({
        status: activeStatus !== "ALL" ? activeStatus : undefined,
        search: searchQuery || undefined,
        pageSize: 100,
        lastUpdateDateType: filterState.lastUpdateDateType || undefined,
        lastUpdateDate: filterState.lastUpdateDate || undefined,
        startDate: filterState.startDate || undefined,
        endDate: filterState.endDate || undefined,
        leadSource: filterState.leadSource || undefined,
        leadResponse: filterState.leadResponse || undefined,
        trialStatus: filterState.trialStatus || undefined,
        serviceStatus: filterState.serviceStatus || undefined,
        serviceId: filterState.serviceId || undefined,
        createdById: filterState.createdById || undefined,
        leadAssignment: filterState.leadAssignment || undefined,
        paidRange: filterState.paidRange || undefined,
        recycleCount: filterState.recycleCount || undefined,
        mobile: filterState.mobile || undefined,
      });

      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  const handleResetFilters = () => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setFilterState(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setCurrentPage(1);

    startTransition(async () => {
      const res = await getEmployeeLeadsAction({
        status: activeStatus !== "ALL" ? activeStatus : undefined,
        search: searchQuery || undefined,
        pageSize: 100,
      });

      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  const handleApplyCountModalFilters = (payload: LeadCountFilterApplyPayload) => {
    setModalSelectedStages(payload.selectedStages);
    setModalSelectedResponses(payload.selectedResponses);

    const hasSpecificStage =
      payload.selectedStages.length === 1 && payload.selectedResponses.length === 0;
    const newStatus = hasSpecificStage ? payload.selectedStages[0] : "ALL";
    setActiveStatus(newStatus);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    router.replace(`/employee/leads?${params.toString()}`, { scroll: false });

    // Sync quick filters into state
    const updatedFilters: EmployeeLeadFiltersState = {
      lastUpdateDateType: payload.lastUpdateDateType || "",
      lastUpdateDate: payload.lastUpdateDate || "",
      startDate: payload.startDate || "",
      endDate: payload.endDate || "",
      leadSource: payload.leadSource || "",
      leadResponse: payload.leadResponse || "",
      trialStatus: payload.trialStatus || "",
      serviceStatus: payload.serviceStatus || "",
      serviceId: payload.serviceId || "",
      createdById: payload.createdById || "",
      leadAssignment: payload.leadAssignment || "",
      paidRange: payload.paidRange || "",
      recycleCount: payload.leadRecycleCount || "",
      mobile: payload.mobile || "",
    };

    setFilterState(updatedFilters);
    setAppliedFilters(updatedFilters);

    startTransition(async () => {
      const res = await getEmployeeLeadsAction({
        status: hasSpecificStage ? newStatus : undefined,
        statusIn: payload.selectedStages.length > 0 ? payload.selectedStages : undefined,
        leadResponseIn:
          payload.selectedResponses.length > 0 ? payload.selectedResponses : undefined,
        search: searchQuery || undefined,
        pageSize: 100,
        lastUpdateDateType: payload.lastUpdateDateType || undefined,
        lastUpdateDate: payload.lastUpdateDate || undefined,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
        leadSource: payload.leadSource || undefined,
        leadResponse: payload.leadResponse || undefined,
        trialStatus: payload.trialStatus || undefined,
        serviceStatus: payload.serviceStatus || undefined,
        serviceId: payload.serviceId || undefined,
        createdById: payload.createdById || undefined,
        leadAssignment: payload.leadAssignment || undefined,
        paidRange: payload.paidRange || undefined,
        recycleCount: payload.leadRecycleCount || undefined,
        mobile: payload.mobile || undefined,
      });

      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  const handleResetCountModalFilters = () => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    handleResetFilters();
  };

  const handleTabChange = (newStatus: string) => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setActiveStatus(newStatus);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }

    router.replace(`/employee/leads?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getEmployeeLeadsAction({
        status: newStatus !== "ALL" ? newStatus : undefined,
        search: searchQuery || undefined,
        pageSize: 100,
        lastUpdateDate: appliedFilters.lastUpdateDate || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
        leadSource: appliedFilters.leadSource || undefined,
        leadResponse: appliedFilters.leadResponse || undefined,
        trialStatus: appliedFilters.trialStatus || undefined,
        serviceStatus: appliedFilters.serviceStatus || undefined,
        serviceId: appliedFilters.serviceId || undefined,
        createdById: appliedFilters.createdById || undefined,
        paidRange: appliedFilters.paidRange || undefined,
        recycleCount: appliedFilters.recycleCount || undefined,
        mobile: appliedFilters.mobile || undefined,
      });
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder(key === "lastUpdate" || key === "id" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const handleRefreshLeads = () => {
    startTransition(async () => {
      const res = await getEmployeeLeadsAction({
        status: activeStatus !== "ALL" ? activeStatus : undefined,
        statusIn: modalSelectedStages.length > 0 ? modalSelectedStages : undefined,
        leadResponseIn:
          modalSelectedResponses.length > 0 ? modalSelectedResponses : undefined,
        search: searchQuery || undefined,
        pageSize: 100,
        lastUpdateDateType: appliedFilters.lastUpdateDateType || undefined,
        lastUpdateDate: appliedFilters.lastUpdateDate || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
        leadSource: appliedFilters.leadSource || undefined,
        leadResponse: appliedFilters.leadResponse || undefined,
        trialStatus: appliedFilters.trialStatus || undefined,
        serviceStatus: appliedFilters.serviceStatus || undefined,
        serviceId: appliedFilters.serviceId || undefined,
        createdById: appliedFilters.createdById || undefined,
        leadAssignment: appliedFilters.leadAssignment || undefined,
        paidRange: appliedFilters.paidRange || undefined,
        recycleCount: appliedFilters.recycleCount || undefined,
        mobile: appliedFilters.mobile || undefined,
      });
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  const handleDisposeLead = async (leadToDispose: EmployeeLeadItem) => {
    setIsDisposingId(leadToDispose.id);
    try {
      const res = await disposeEmployeeLeadAction({
        leadId: leadToDispose.id,
        reason: disposeReason.trim() || undefined,
      });
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadToDispose.id ? { ...l, status: "DISPOSED" } : l))
        );
        setConfirmDisposeLead(null);
        setDisposeReason("");
        handleRefreshLeads();
      } else {
        alert(res.error || "Failed to mark lead as disposed");
      }
    } catch {
      alert("An unexpected error occurred while disposing the lead");
    } finally {
      setIsDisposingId(null);
    }
  };

  const handleRestoreLead = async (
    leadToRestore: EmployeeLeadItem,
    targetStatus: "READ" | "UNREAD" = "READ"
  ) => {
    setIsRestoringId(leadToRestore.id);
    try {
      const res = await restoreEmployeeLeadAction({
        leadId: leadToRestore.id,
        targetStatus,
      });
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadToRestore.id ? { ...l, status: targetStatus } : l))
        );
        handleRefreshLeads();
      } else {
        alert(res.error || "Failed to restore lead");
      }
    } catch {
      alert("An unexpected error occurred while restoring the lead");
    } finally {
      setIsRestoringId(null);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. TOP ACTION & STATUS FILTER BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: + Add Button + Quick Status Filter Pills with live counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap sm:flex-nowrap">
          <Link
            href="/employee/leads/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Add</span>
          </Link>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            {STATUS_TABS.map((tab) => {
              const isActive = activeStatus === tab.value;
              const count = statusCounts[tab.value as keyof typeof statusCounts] ?? 0;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action Buttons: Filters, Fetch & Live Refresh */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isFiltersOpen
                ? "bg-blue-700 text-white ring-2 ring-blue-500/50 shadow-sm"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-[1.02] active:scale-[0.98]"
            }`}
            title="Toggle Filters Panel"
          >
            <Filter className="size-3.5 stroke-[2.5]" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFetchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Open Select Source to claim leads"
          >
            <Download className="size-3.5 stroke-[2.5]" />
            <span>Fetch</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshLeads}
            disabled={isPending}
            className="size-8 rounded-xl flex items-center justify-center bg-white/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh my leads list"
          >
            <RotateCcw className={`size-3.5 ${isPending ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE FILTERS PANEL (Matching image_4ad5e8.png) */}
      {isFiltersOpen && (
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Row 1: Last Update Date, Source, Call Response, Trial Status, Service Status, Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Last Update Date */}
            <div>
              <input
                type="date"
                value={filterState.lastUpdateDate}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, lastUpdateDate: e.target.value }))
                }
                title="Last Update Date"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* 2. Source */}
            <div>
              <select
                value={filterState.leadSource}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, leadSource: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Source --</option>
                {filterOptions.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Call Response */}
            <div>
              <select
                value={filterState.leadResponse}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, leadResponse: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Call Response --</option>
                {filterOptions.responses.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Trial Status */}
            <div>
              <select
                value={filterState.trialStatus}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, trialStatus: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Trial Status --</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* 5. Service Status */}
            <div>
              <select
                value={filterState.serviceStatus}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, serviceStatus: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Service Status --</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* 6. Service (Product) */}
            <div>
              <select
                value={filterState.serviceId}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, serviceId: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Service --</option>
                {filterOptions.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Date Range, Lead Added By, Lead Owner, Team, Paid, Recycle Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Date Range (From - To) */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filterState.startDate}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, startDate: e.target.value }))
                }
                title="Date Range (From)"
                placeholder="From"
                className="w-1/2 px-2 py-2 text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
              <input
                type="date"
                value={filterState.endDate}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, endDate: e.target.value }))
                }
                title="Date Range (To)"
                placeholder="To"
                className="w-1/2 px-2 py-2 text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* 2. Lead Added By */}
            <div>
              <select
                value={filterState.createdById}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, createdById: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">-- Lead Added By --</option>
                {filterOptions.creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Lead Owner (Locked to Self) */}
            <div>
              <select
                disabled
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 opacity-70 cursor-not-allowed"
                title="Locked to logged-in employee"
              >
                <option>{filterOptions.employeeName ? `Owner: ${filterOptions.employeeName}` : "-- Lead Owner (Me) --"}</option>
              </select>
            </div>

            {/* 4. Team (Locked to Self's Team) */}
            <div>
              <select
                disabled
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 opacity-70 cursor-not-allowed"
                title="Locked to employee's team"
              >
                <option>{filterOptions.employeeTeamName ? `Team: ${filterOptions.employeeTeamName}` : "-- Team (My Team) --"}</option>
              </select>
            </div>

            {/* 5. Paid Range */}
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">₹</span>
              <input
                type="text"
                value={filterState.paidRange}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, paidRange: e.target.value }))
                }
                placeholder="Paid Ex: 500-1000"
                className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* 6. Recycle Count */}
            <div>
              <input
                type="number"
                min="0"
                value={filterState.recycleCount}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, recycleCount: e.target.value }))
                }
                placeholder="Recycle Count"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Row 3: Lead Assignment (locked), Mobile, Search & Reset */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-auto sm:max-w-md">
              {/* Lead Assignment */}
              <select
                disabled
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 opacity-70 cursor-not-allowed"
                title="Locked to logged-in employee"
              >
                <option>-- Lead Assignment (Assigned to Me) --</option>
              </select>

              {/* Mobile */}
              <div className="relative">
                <Phone className="size-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={filterState.mobile}
                  onChange={(e) =>
                    setFilterState((prev) => ({ ...prev, mobile: e.target.value }))
                  }
                  placeholder="Mobile"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            {/* Action Buttons: Search & Reset Filters */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={isPending}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/[0.08] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="size-3.5 text-slate-400" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SEARCH & PAGE SIZE BAR */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="relative flex-1 max-w-lg">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search for name, phone, city..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* 3. SORTING PILLS BAR */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
            <SlidersHorizontal className="size-3.5 text-cyan-500" />
            <span>Sorting</span>
          </div>

          {SORT_OPTIONS.map((opt) => {
            const isActive = sortKey === opt.key;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSortChange(opt.key)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
                }`}
              >
                <span>{opt.label}</span>
                {isActive && (
                  sortOrder === "asc" ? (
                    <ArrowUp className="size-3 text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <ArrowDown className="size-3 text-cyan-600 dark:text-cyan-400" />
                  )
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setIsCountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Open ALL Lead Count Modal"
          >
            <BarChart2 className="size-3.5" />
            <span>Count</span>
          </button>
        </div>
      </div>

      {/* 4. STRUCTURED LEAD ROW-CARD LIST */}
      <div className="space-y-3">
        {paginatedLeads.length > 0 ? (
          paginatedLeads.map((lead) => {
            const isClient = (lead.status || "").toUpperCase().includes("CLIENT");
            const isTrial = (lead.status || "").toUpperCase().includes("TRIAL");

            return (
              <div
                key={lead.id}
                className="group rounded-2xl p-4 sm:p-5 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] hover:border-cyan-400/40 dark:hover:border-cyan-500/40 hover:shadow-lg transition-all duration-200 shadow-xs"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* COL 1: Metadata & Assignment */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                      #{lead.id.length > 8 ? lead.id.slice(-6).toUpperCase() : lead.id}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>Created {formatDate(lead.createdAt)}</span>
                    </div>

                    <div className="text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium pt-0.5">
                      <User className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {lead.assignedTo?.name || "Self"}
                      </span>
                    </div>

                    <div className="text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Users className="size-3.5 text-cyan-500 shrink-0" />
                      <span className="truncate">
                        {lead.team?.name || "General Team"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="size-3 text-slate-400 shrink-0" />
                      <span>Allotted: {formatDate(lead.updatedAt || lead.createdAt)}</span>
                    </div>
                  </div>

                  {/* COL 2: Client Information */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="size-3.5 text-cyan-500 shrink-0" />
                      <span className="truncate">{lead.name}</span>
                    </div>

                    <div className="text-xs font-medium">
                      <a
                        href={`tel:${lead.mobile}`}
                        className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
                        title="Click to call"
                      >
                        <Phone className="size-3.5 shrink-0 text-cyan-500" />
                        <span>{lead.mobile}</span>
                      </a>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 truncate"
                          title={lead.email}
                        >
                          <Mail className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </a>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-slate-400">
                          <Mail className="size-3.5 text-slate-400 shrink-0" />
                          <span>No email provided</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || lead.state || lead.city || "—"}
                      </span>
                    </div>
                  </div>

                  {/* COL 3: Status & Interaction */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    <div className="text-xs flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-purple-500 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-[11px] font-bold">
                        {lead.leadResponse || "Interested"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <FileText className="size-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={lead.description || "No comment"}>
                        {lead.description ? `Comment: ${lead.description}` : "No comment recorded"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CalendarClock className="size-3 text-slate-400 shrink-0" />
                      <span>
                        Callback: {lead.callbackDate ? formatDate(lead.callbackDate) : "—"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="size-3 text-slate-400 shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium border border-slate-250 dark:border-slate-700">
                        {lead.leadSource || "DIRECT"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {isClient && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          Client converted {formatDate(lead.updatedAt)}
                        </span>
                      )}
                      {isTrial && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                          Active Trial
                        </span>
                      )}
                      {lead.investment && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          Investment: ₹{lead.investment}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* COL 4: Quick Actions & Timestamps */}
                  <div className="lg:col-span-3 space-y-2.5 flex flex-col justify-between h-full">
                    {/* 7 Action buttons container */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] w-fit shadow-2xs">
                      {/* 1. View Details Modal */}
                      <button
                        type="button"
                        onClick={() => setDetailsModalLead(lead)}
                        title="View Full Lead Details"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                      </button>

                      {/* 2. Edit Lead Details Drawer */}
                      <button
                        type="button"
                        onClick={() => setEditDrawerLeadId(lead.id)}
                        title="Edit Lead Details"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      {/* 3. Call Update / Disposition Modal */}
                      <button
                        type="button"
                        onClick={() => setCallUpdateModalLead(lead)}
                        title="Add Call Update / Disposition"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>

                      {/* 4. Dispose or Restore Lead */}
                      {lead.status === "DISPOSED" ? (
                        <button
                          type="button"
                          disabled={isRestoringId === lead.id}
                          onClick={() => handleRestoreLead(lead, "READ")}
                          title="Restore Lead to Active Pipeline (Read)"
                          className="size-7 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isRestoringId === lead.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isDisposingId === lead.id}
                          onClick={() => {
                            setDisposeReason("");
                            setConfirmDisposeLead(lead);
                          }}
                          title="Dispose Lead"
                          className="size-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800"
                        >
                          <CircleOff className="size-3.5" />
                        </button>
                      )}

                      {/* 5. Direct Call Link */}
                      <a
                        href={lead.mobile ? `tel:${lead.mobile}` : undefined}
                        title={`Call ${lead.name} (${lead.mobile})`}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <Phone className="size-3.5" />
                      </a>

                      {/* 6. WhatsApp Action */}
                      <a
                        href={`https://wa.me/91${lead.mobile.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <MessageCircle className="size-3.5" />
                      </a>

                      {/* 7. Activity History / Timeline Modal */}
                      <button
                        type="button"
                        onClick={() => setTimelineModalLead(lead)}
                        title="View Activity History"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <Clock className="size-3.5" />
                      </button>
                    </div>

                    {/* Last Updated Timestamp */}
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Clock className="size-3 text-slate-400 shrink-0" />
                      <span>Last Update: {formatDate(lead.updatedAt)}</span>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                        @{lead.status || "Lead"}
                      </span>
                      {isClient && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          Service Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white/60 dark:bg-[#0c1220]/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <div className="size-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Search className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No leads found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No assigned prospective records match the current status filter or search parameters.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS & DRAWERS */}
      {/* 1. View Details Modal */}
      <EmployeeLeadDetailsModal
        lead={detailsModalLead}
        isOpen={Boolean(detailsModalLead)}
        onClose={() => setDetailsModalLead(null)}
      />

      {/* 2. Scoped Lead Edit Drawer */}
      <EmployeeLeadDrawer
        leadId={editDrawerLeadId}
        isOpen={Boolean(editDrawerLeadId)}
        onClose={() => setEditDrawerLeadId(null)}
        onLeadUpdated={handleRefreshLeads}
        leadIds={filteredLeads.map((l) => l.id)}
        onNavigateLead={(newId) => setEditDrawerLeadId(newId)}
        onOpenCallModal={(lead) => setCallUpdateModalLead(lead)}
        onOpenTimelineModal={(lead) => setTimelineModalLead(lead)}
      />

      {/* 3. Call Update / Disposition Modal */}
      <EmployeeCallUpdateModal
        lead={callUpdateModalLead}
        isOpen={Boolean(callUpdateModalLead)}
        onClose={() => setCallUpdateModalLead(null)}
        onSuccess={handleRefreshLeads}
      />

      {/* 4. Timeline Modal */}
      <EmployeeLeadTimelineModal
        lead={timelineModalLead}
        isOpen={Boolean(timelineModalLead)}
        onClose={() => setTimelineModalLead(null)}
      />

      {/* 5. Fetch Modal */}
      <EmployeeFetchModal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        onLeadFetched={handleRefreshLeads}
      />

      {/* 5b. Lead Count Modal */}
      <LeadCountModal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        mode="employee"
        fetchCountsAction={getEmployeeLeadCountsSummaryAction}
        onSelectStageOrResponse={(sel) => {
          setModalSelectedStages([]);
          setModalSelectedResponses([]);
          if (sel.type === "stage") {
            handleTabChange(sel.value);
          } else {
            handleTabChange("ALL");
            setSearchQuery(sel.value);
          }
        }}
        onApplyFilters={handleApplyCountModalFilters}
        onResetFilters={handleResetCountModalFilters}
      />

      {/* 6. Confirm Dispose Dialog */}
      {confirmDisposeLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmDisposeLead(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.08] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Mark Lead as Disposed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to dispose &quot;{confirmDisposeLead.name}&quot; ({confirmDisposeLead.mobile})? You can restore it later from the Disposed tab.
            </p>
            <input
              type="text"
              placeholder="Reason (e.g. wrong number, invalid contact)..."
              value={disposeReason}
              onChange={(e) => setDisposeReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDisposeLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDisposeLead(confirmDisposeLead)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                Dispose Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
