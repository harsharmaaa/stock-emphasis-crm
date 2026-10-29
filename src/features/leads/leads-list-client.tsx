"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type LeadListItem,
  type AllotmentUserOption,
  getLeadsAction,
  updateLeadDetailsAction,
} from "./actions";
import { normalizeStatusFilter } from "@/src/lib/utils";
import { LeadDetailsDrawer } from "./lead-details-drawer";
import { LeadCallUpdateModal } from "./lead-call-update-modal";
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
    status: string = statusFilter
  ) => {
    startTransition(async () => {
      const res = await getLeadsAction({
        page,
        search,
        status,
        pageSize: 15,
      });

      if (res.success && res.leads) {
        setLeads(res.leads);
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.currentPage ?? 1);
        updateUrl(page, search, status, selectedLeadId);
      }
    });
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
    fetchLeads(currentPage, searchQuery, statusFilter);
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

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/leads/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            <span>Add New Lead</span>
          </Link>
        </div>
      </div>

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

      {/* Horizontal Lead Cards List */}
      <div className="space-y-3">
        {leads.length > 0 ? (
          leads.map((lead) => {
            const isHighlighted = selectedLeadId === lead.id;

            return (
              <div
                key={lead.id}
                onClick={() => handleOpenLeadDrawer(lead.id)}
                className={`group rounded-2xl p-4 transition-all duration-150 cursor-pointer border ${
                  isHighlighted
                    ? "bg-violet-500/[0.08] dark:bg-violet-500/15 border-violet-500/60 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/30"
                    : "bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border-slate-200/80 dark:border-white/[0.08] hover:border-violet-400/50 dark:hover:border-violet-500/30 hover:shadow-md hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* LEFT SECTION (Identification & Assignment) */}
                  <div className="lg:col-span-4 space-y-2.5 lg:border-r border-slate-200/60 dark:border-white/[0.06] lg:pr-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-slate-250 dark:border-white/[0.08]">
                        <Hash className="size-3 text-slate-400" />
                        ID: {lead.id.slice(-8)}
                      </span>
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
                            className={`size-7 rounded-lg flex items-center justify-center border transition-colors shadow-2xs ${
                              lead.status === "DISPOSED"
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
                          className={`text-[11px] truncate max-w-[280px] ${
                            lead.description
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

      {/* Timeline Modal (ONLY Created By and Created At timestamps) */}
      {timelineModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setTimelineModalLead(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lead Timeline
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {timelineModalLead.name} ({timelineModalLead.mobile})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close timeline modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/[0.06] space-y-3">
                {/* Created By */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <User className="size-3.5 text-slate-400" />
                    <span className="font-medium">Created By:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {timelineModalLead.allotTo?.name || "Admin"}
                    </span>
                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {timelineModalLead.allotTo?.role || "ADMIN"}
                    </span>
                  </div>
                </div>

                {/* Created At Timestamp */}
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Clock className="size-3.5 text-slate-400" />
                    <span className="font-medium">Created At:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                      {new Date(timelineModalLead.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
