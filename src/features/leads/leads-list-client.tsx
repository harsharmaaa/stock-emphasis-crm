"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type LeadListItem,
  type AllotmentUserOption,
  getLeadsAction,
} from "./actions";
import { normalizeStatusFilter } from "@/src/lib/utils";
import { LeadDetailsDrawer } from "./lead-details-drawer";
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
  ExternalLink,
  Clock,
  User,
  Calendar,
  Tag,
  Hash,
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
                          {new Date(lead.createdAt).toLocaleDateString(undefined, {
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

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLeadDrawer(lead.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100/90 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-950/60 dark:hover:text-violet-300 border border-slate-250 dark:border-white/[0.08] transition-colors shrink-0"
                      >
                        <ExternalLink className="size-3" />
                        <span>View / Update</span>
                      </button>
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
                        <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                          —
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] w-20 shrink-0">Callback:</span>
                        {lead.callbackDate ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="size-3 shrink-0" />
                            <span>
                              {new Date(lead.callbackDate).toLocaleDateString(undefined, {
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
