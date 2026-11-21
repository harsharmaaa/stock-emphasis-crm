"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ManagerLeadItem, ManagerStatusCounts } from "./lead-actions";
import {
  getManagerLeadsAction,
  getManagerLeadCountsSummaryAction,
  disposeManagerLeadAction,
  restoreManagerLeadAction,
} from "./lead-actions";
import {
  LeadCountModal,
  type LeadCountFilterApplyPayload,
} from "@/src/components/leads/lead-count-modal";
import { ManagerCallUpdateModal } from "./manager-call-update-modal";
import { ManagerLeadDrawer } from "./manager-lead-drawer";
import { ManagerFetchModal } from "./manager-fetch-modal";
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
  History,
  RotateCcw,
  SlidersHorizontal,
  Briefcase,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Pencil,
  CircleOff,
  AlertTriangle,
  Loader2,
  Download,
  BarChart2,
} from "lucide-react";

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
  "call disconnected ": "Call Disconnected",
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

interface ManagerLeadsClientProps {
  initialLeads: ManagerLeadItem[];
  initialStatus?: string;
  initialSearch?: string;
  initialStatusCounts?: ManagerStatusCounts;
}

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Read", value: "READ" },
  { label: "Followups", value: "FOLLOW_UP" },
  { label: "Trials", value: "TRIAL" },
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

export function ManagerLeadsClient({
  initialLeads,
  initialStatus = "ALL",
  initialSearch = "",
  initialStatusCounts,
}: ManagerLeadsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<ManagerLeadItem[]>(initialLeads);
  const [activeStatus, setActiveStatus] = useState<string>(initialStatus || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [statusCountsState, setStatusCountsState] = useState<ManagerStatusCounts | null>(
    initialStatusCounts || null
  );

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("lastUpdate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal & Drawer states
  const [detailsModalLead, setDetailsModalLead] = useState<ManagerLeadItem | null>(null);
  const [timelineModalLead, setTimelineModalLead] = useState<ManagerLeadItem | null>(null);
  const [callUpdateModalLead, setCallUpdateModalLead] = useState<ManagerLeadItem | null>(null);
  const [editDrawerLeadId, setEditDrawerLeadId] = useState<string | null>(null);
  const [confirmDisposeLead, setConfirmDisposeLead] = useState<ManagerLeadItem | null>(null);
  const [disposeReason, setDisposeReason] = useState<string>("");
  const [isDisposingId, setIsDisposingId] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);

  // ALL Lead Count Modal states
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [modalSelectedStages, setModalSelectedStages] = useState<string[]>([]);
  const [modalSelectedResponses, setModalSelectedResponses] = useState<string[]>([]);
  const [appliedCountFilters, setAppliedCountFilters] = useState<LeadCountFilterApplyPayload | null>(null);

  const [isPending, startTransition] = useTransition();

  // Compute live counts across all status tabs (prefer server groupBy counts for speed)
  const statusCounts = useMemo(() => {
    if (statusCountsState) return statusCountsState;
    const counts: ManagerStatusCounts = {
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

  // Filter leads based on active status pill, modal multi-selections, and search query
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

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = lead.name.toLowerCase().includes(q);
        const mobileMatch = lead.mobile.includes(q);
        const emailMatch = lead.email ? lead.email.toLowerCase().includes(q) : false;
        const cityMatch = lead.city ? lead.city.toLowerCase().includes(q) : false;
        const stateMatch = lead.state ? lead.state.toLowerCase().includes(q) : false;
        const sourceMatch = lead.leadSource ? lead.leadSource.toLowerCase().includes(q) : false;
        const responseMatch = lead.leadResponse ? lead.leadResponse.toLowerCase().includes(q) : false;
        const staffMatch = lead.assignedTo?.name
          ? lead.assignedTo.name.toLowerCase().includes(q)
          : false;

        return (
          nameMatch ||
          mobileMatch ||
          emailMatch ||
          cityMatch ||
          stateMatch ||
          sourceMatch ||
          responseMatch ||
          staffMatch
        );
      }

      return true;
    });
  }, [leads, activeStatus, modalSelectedStages, modalSelectedResponses, searchQuery]);

  // Sort filtered leads based on selected sort key and order
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

  // Paginated leads slice
  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLeads.slice(startIndex, startIndex + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  // Handle switching tabs
  const handleTabChange = (newStatus: string) => {
    setActiveStatus(newStatus);
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    
    router.replace(`/manager/leads?${params.toString()}`, { scroll: false });

    // Immediately fetch leads for the newly selected status tab from the database
    startTransition(async () => {
      const res = await getManagerLeadsAction({
        status: newStatus !== "ALL" ? newStatus : undefined,
        search: searchQuery || undefined,
        pageSize: 25,
        lastUpdateDateType: appliedCountFilters?.lastUpdateDateType || undefined,
        lastUpdateDate: appliedCountFilters?.lastUpdateDate || undefined,
        startDate: appliedCountFilters?.startDate || undefined,
        endDate: appliedCountFilters?.endDate || undefined,
        leadSource: appliedCountFilters?.leadSource || undefined,
        leadResponse: appliedCountFilters?.leadResponse || undefined,
        trialStatus: appliedCountFilters?.trialStatus || undefined,
        serviceStatus: appliedCountFilters?.serviceStatus || undefined,
        serviceId: appliedCountFilters?.serviceId || undefined,
        createdById: appliedCountFilters?.createdById || undefined,
        leadOwnerId: appliedCountFilters?.leadOwnerId || undefined,
        teamId: appliedCountFilters?.teamId || undefined,
        leadAssignment: appliedCountFilters?.leadAssignment || undefined,
        paidRange: appliedCountFilters?.paidRange || undefined,
        recycleCount: appliedCountFilters?.leadRecycleCount || undefined,
        mobile: appliedCountFilters?.mobile || undefined,
      });
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  // Handle applying filters from LeadCountModal
  const handleApplyCountModalFilters = (payload: LeadCountFilterApplyPayload) => {
    setModalSelectedStages(payload.selectedStages);
    setModalSelectedResponses(payload.selectedResponses);
    setAppliedCountFilters(payload);

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
    router.replace(`/manager/leads?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerLeadsAction({
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
        leadOwnerId: payload.leadOwnerId || undefined,
        teamId: payload.teamId || undefined,
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

  // Handle resetting LeadCountModal filters
  const handleResetCountModalFilters = () => {
    setModalSelectedStages([]);
    setModalSelectedResponses([]);
    setAppliedCountFilters(null);
    setActiveStatus("ALL");
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(`/manager/leads?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const res = await getManagerLeadsAction({
        status: undefined,
        search: searchQuery || undefined,
        pageSize: 25,
      });
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  // Handle sorting changes
  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder(key === "lastUpdate" || key === "id" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  // Refresh team leads action with active filters and server-computed status counts
  const handleRefreshLeads = () => {
    startTransition(async () => {
      const res = await getManagerLeadsAction({
        status: activeStatus !== "ALL" ? activeStatus : undefined,
        statusIn: modalSelectedStages.length > 0 ? modalSelectedStages : undefined,
        leadResponseIn: modalSelectedResponses.length > 0 ? modalSelectedResponses : undefined,
        search: searchQuery || undefined,
        pageSize: 25,
        lastUpdateDateType: appliedCountFilters?.lastUpdateDateType || undefined,
        lastUpdateDate: appliedCountFilters?.lastUpdateDate || undefined,
        startDate: appliedCountFilters?.startDate || undefined,
        endDate: appliedCountFilters?.endDate || undefined,
        leadSource: appliedCountFilters?.leadSource || undefined,
        leadResponse: appliedCountFilters?.leadResponse || undefined,
        trialStatus: appliedCountFilters?.trialStatus || undefined,
        serviceStatus: appliedCountFilters?.serviceStatus || undefined,
        serviceId: appliedCountFilters?.serviceId || undefined,
        createdById: appliedCountFilters?.createdById || undefined,
        leadOwnerId: appliedCountFilters?.leadOwnerId || undefined,
        teamId: appliedCountFilters?.teamId || undefined,
        leadAssignment: appliedCountFilters?.leadAssignment || undefined,
        paidRange: appliedCountFilters?.paidRange || undefined,
        recycleCount: appliedCountFilters?.leadRecycleCount || undefined,
        mobile: appliedCountFilters?.mobile || undefined,
      });
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.statusCounts) {
          setStatusCountsState(res.statusCounts);
        }
      }
    });
  };

  // Handle disposing a lead with confirmation and reason
  const handleDisposeLead = async (leadToDispose: ManagerLeadItem) => {
    setIsDisposingId(leadToDispose.id);
    try {
      const res = await disposeManagerLeadAction({
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

  // Handle restoring a disposed lead back to active status (default: READ)
  const handleRestoreLead = async (
    leadToRestore: ManagerLeadItem,
    targetStatus: "READ" | "UNREAD" = "READ"
  ) => {
    setIsRestoringId(leadToRestore.id);
    try {
      const res = await restoreManagerLeadAction({
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

  // Helper date formatter: DD-Mon-YYYY
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
          {/* + Add Button linking to /manager/leads/add */}
          <Link
            href="/manager/leads/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Add</span>
          </Link>

          {/* Status Filter Pills */}
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
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xs font-bold"
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

        {/* Right Action Buttons: Select Source Fetch & Live Refresh */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => setIsFetchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
            title="Refresh team leads list"
          >
            <RotateCcw className={`size-3.5 ${isPending ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. SEARCH & PAGE SIZE BAR */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        {/* Search Bar matching CRM reference */}
        <div className="relative flex-1 max-w-lg">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search for name/mob..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
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

        {/* Page size dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
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
          {/* Sorting label with icon */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
            <SlidersHorizontal className="size-3.5 text-blue-500" />
            <span>Sorting</span>
          </div>

          {/* Sort Option Pills */}
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

        {/* Far Right: Interactive Count Button (opens LeadCountModal) */}
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

      {/* Active Count Filters Banner */}
      {(modalSelectedStages.length > 0 || modalSelectedResponses.length > 0 || appliedCountFilters) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              Active Count Filters:
            </span>
            {modalSelectedStages.map((st) => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30 text-[11px]"
              >
                <span>Stage: {st}</span>
              </span>
            ))}
            {modalSelectedResponses.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30 text-[11px]"
              >
                <span>Response: {r}</span>
              </span>
            ))}
            {appliedCountFilters?.leadSource && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 text-[11px]">
                <span>Source: {appliedCountFilters.leadSource}</span>
              </span>
            )}
            {appliedCountFilters?.leadOwnerId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 text-[11px]">
                <span>Owner Filtered</span>
              </span>
            )}
            {appliedCountFilters?.teamId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 text-[11px]">
                <span>Team Filtered</span>
              </span>
            )}
            {appliedCountFilters?.lastUpdateDateType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 text-[11px]">
                <span>{appliedCountFilters.lastUpdateDateType}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetCountModalFilters}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
          >
            Clear Modal Filters
          </button>
        </div>
      )}

      {/* 4. STRUCTURED LEAD ROW-CARD LIST */}
      <div className="space-y-3">
        {paginatedLeads.length > 0 ? (
          paginatedLeads.map((lead) => {
            const isClient = (lead.status || "").toUpperCase().includes("CLIENT");
            const isTrial = (lead.status || "").toUpperCase().includes("TRIAL");

            return (
              <div
                key={lead.id}
                className="group rounded-2xl p-4 sm:p-5 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-400/40 dark:hover:border-blue-500/40 hover:shadow-lg transition-all duration-200 shadow-xs"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* COL 1: Metadata & Ownership */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    {/* Lead ID */}
                    <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                      #{lead.id.length > 8 ? lead.id.slice(-6).toUpperCase() : lead.id}
                    </div>

                    {/* Created Date & Role */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>Admin {formatDate(lead.createdAt)}</span>
                    </div>

                    {/* Assigned Employee */}
                    <div className="text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium pt-0.5">
                      <User className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {lead.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>

                    {/* Manager / Team Name */}
                    <div className="text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Users className="size-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {lead.team?.name || "Unassigned"}
                      </span>
                    </div>

                    {/* Allotted / Fetched Date */}
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="size-3 text-slate-400 shrink-0" />
                      <span>Allotted: {formatDate(lead.updatedAt || lead.createdAt)}</span>
                    </div>
                  </div>

                  {/* COL 2: Client Information */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    {/* Client Name */}
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="size-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{lead.name}</span>
                    </div>

                    {/* Phone Number (clickable tel:) */}
                    <div className="text-xs font-medium">
                      <a
                        href={`tel:${lead.mobile}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-mono"
                        title="Click to call"
                      >
                        <Phone className="size-3.5 shrink-0 text-blue-500" />
                        <span>{lead.mobile}</span>
                      </a>
                    </div>

                    {/* Email */}
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

                    {/* City / State */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || lead.state || lead.city || "—"}
                      </span>
                    </div>
                  </div>

                  {/* COL 3: Status & Interaction */}
                  <div className="lg:col-span-3 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/[0.06] pb-3 lg:pb-0 lg:pr-4">
                    {/* Lead Response Tag */}
                    <div className="text-xs flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-purple-500 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-[11px] font-bold">
                        {lead.leadResponse || "Interested"}
                      </span>
                    </div>

                    {/* Comment/Note snippet */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <FileText className="size-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={lead.description || "No comment"}>
                        {lead.description ? `Comment: ${lead.description}` : "No comment recorded"}
                      </span>
                    </div>

                    {/* Callback Date */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CalendarClock className="size-3 text-slate-400 shrink-0" />
                      <span>
                        Callback: {lead.callbackDate ? formatDate(lead.callbackDate) : "—"}
                      </span>
                    </div>

                    {/* Lead Source Tag */}
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="size-3 text-slate-400 shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium border border-slate-250 dark:border-slate-700">
                        {lead.leadSource || "DIRECT"}
                      </span>
                    </div>

                    {/* Lifecycle status & Investment / Paid snippet */}
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
                          Paid: ₹{lead.investment}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* COL 4: Quick Actions & Timestamps */}
                  <div className="lg:col-span-3 space-y-2.5 flex flex-col justify-between h-full">
                    {/* Action buttons pill container */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] w-fit shadow-2xs">
                      {/* 1. View Details Modal */}
                      <button
                        type="button"
                        onClick={() => setDetailsModalLead(lead)}
                        title="View Full Lead Details"
                        className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                      </button>

                      {/* 2. Edit Lead Details (Scoped Drawer) */}
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

                      {/* 5. Direct Call Action */}
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

                      {/* 7. Activity History / Timeline */}
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
            <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Search className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No team leads found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No prospective client records match the current status filter or search parameters.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
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
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.min(currentPage * pageSize, sortedLeads.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {sortedLeads.length}
            </span>{" "}
            leads
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-250 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-250 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. VIEW DETAILS MODAL */}
      {detailsModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-5 sm:p-7 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {detailsModalLead.name}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    #{detailsModalLead.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete client profile and financial advisory metadata.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Section 1: Contact Details */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Phone className="size-3.5 text-blue-500" />
                  <span>Contact Information</span>
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono font-semibold">{detailsModalLead.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Alternate:</span>
                    <span className="font-mono">{detailsModalLead.alternateMobile || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span>{detailsModalLead.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span>
                      {[detailsModalLead.city, detailsModalLead.state].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">District:</span>
                    <span>{detailsModalLead.district || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal & KYC */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  <span>Personal & KYC</span>
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Father&apos;s Name:</span>
                    <span>{detailsModalLead.fatherName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DOB:</span>
                    <span>{formatDate(detailsModalLead.dob)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PAN:</span>
                    <span className="font-mono">{detailsModalLead.pan || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aadhaar:</span>
                    <span className="font-mono">{detailsModalLead.aadhar || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Occupation:</span>
                    <span>{detailsModalLead.occupation || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Investment Profile */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-cyan-500" />
                  <span>Investment Profile</span>
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Segment:</span>
                    <span className="font-semibold">{detailsModalLead.segment || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Investment Capital:</span>
                    <span className="font-mono font-semibold">
                      {detailsModalLead.investment ? `₹${detailsModalLead.investment}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profile Type:</span>
                    <span>{detailsModalLead.profile || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trading Experience:</span>
                    <span>{detailsModalLead.experience || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: CRM Pipeline & Ownership */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-purple-500" />
                  <span>CRM Disposition & Team</span>
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{detailsModalLead.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lead Response:</span>
                    <span>{detailsModalLead.leadResponse || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lead Source:</span>
                    <span>{detailsModalLead.leadSource || "DIRECT"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned To:</span>
                    <span className="font-semibold">{detailsModalLead.assignedTo?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Team:</span>
                    <span>{detailsModalLead.team?.name || "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note/Description */}
            {detailsModalLead.description && (
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                  Comments & Notes:
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {detailsModalLead.description}
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDetailsModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TIMELINE / HISTORY MODAL */}
      {timelineModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-5 sm:p-7 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="size-4 text-purple-500" />
                  <span>Activity Timeline</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Milestones for {timelineModalLead.name} (#{timelineModalLead.id.slice(-6).toUpperCase()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Timeline Steps */}
            <div className="space-y-4 text-xs pl-2">
              {/* Step 1: Created */}
              <div className="relative pl-6 pb-2 border-l-2 border-blue-500">
                <div className="size-3 rounded-full bg-blue-500 absolute -left-[7px] top-0 ring-4 ring-blue-500/20" />
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDate(timelineModalLead.createdAt)}
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">Lead Registered</h5>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Prospect created in CRM via source &quot;{timelineModalLead.leadSource || "DIRECT"}&quot;.
                </p>
              </div>

              {/* Step 2: Allotment */}
              <div className="relative pl-6 pb-2 border-l-2 border-cyan-500">
                <div className="size-3 rounded-full bg-cyan-500 absolute -left-[7px] top-0 ring-4 ring-cyan-500/20" />
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDate(timelineModalLead.updatedAt || timelineModalLead.createdAt)}
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">Team Allotment</h5>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Assigned to {timelineModalLead.assignedTo?.name || "Direct Team Queue"} ({timelineModalLead.team?.name || "Unassigned"}).
                </p>
              </div>

              {/* Step 3: Latest Disposition */}
              <div className="relative pl-6">
                <div className="size-3 rounded-full bg-emerald-500 absolute -left-[7px] top-0 ring-4 ring-emerald-500/20" />
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDate(timelineModalLead.updatedAt)}
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">
                  Current Status: {timelineModalLead.status}
                </h5>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Response tag &quot;{timelineModalLead.leadResponse || "Interested"}&quot; recorded.
                  {timelineModalLead.callbackDate && ` Next callback on ${formatDate(timelineModalLead.callbackDate)}.`}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. CALL UPDATE / DISPOSITION MODAL */}
      <ManagerCallUpdateModal
        lead={callUpdateModalLead}
        isOpen={!!callUpdateModalLead}
        onClose={() => setCallUpdateModalLead(null)}
        onSuccess={handleRefreshLeads}
      />

      {/* 9. SCOPED EDIT LEAD DRAWER (NO ALLOTMENT SELECTOR) */}
      <ManagerLeadDrawer
        leadId={editDrawerLeadId}
        isOpen={!!editDrawerLeadId}
        onClose={() => setEditDrawerLeadId(null)}
        onLeadUpdated={handleRefreshLeads}
      />

      {/* 10. DISPOSE LEAD CONFIRMATION MODAL */}
      {confirmDisposeLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => {
              if (!isDisposingId) setConfirmDisposeLead(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-5 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mark Lead as Disposed?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to dispose{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {confirmDisposeLead.name}
                  </strong>{" "}
                  ({confirmDisposeLead.mobile})? This updates the lead status to DISPOSED.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disposal Reason / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={disposeReason}
                onChange={(e) => setDisposeReason(e.target.value)}
                placeholder="e.g. Not interested, wrong number, budget mismatch..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
              <button
                type="button"
                disabled={isDisposingId !== null}
                onClick={() => setConfirmDisposeLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisposingId !== null}
                onClick={() => handleDisposeLead(confirmDisposeLead)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDisposingId ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CircleOff className="size-3.5" />
                )}
                <span>Confirm Dispose</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 11. SELECT SOURCE FETCH MODAL */}
      <ManagerFetchModal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        onLeadFetched={handleRefreshLeads}
      />

      {/* 12. ALL Lead Count Modal */}
      <LeadCountModal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        mode="admin"
        fetchCountsAction={getManagerLeadCountsSummaryAction}
        onApplyFilters={handleApplyCountModalFilters}
        onResetFilters={handleResetCountModalFilters}
      />
    </div>
  );
}
