"use client";

import { useState, useTransition } from "react";
import {
  Check,
  X,
  Search,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/src/components/ui/Toast";
import {
  adminBulkProcessFreeTrialsAction,
  getAdminApprovalTrialsAction,
  type AdminApprovalTrialItem,
} from "./actions";

interface AdminApproveTrialsClientProps {
  initialTrials: AdminApprovalTrialItem[];
  initialPendingCount: number;
}

export function AdminApproveTrialsClient({
  initialTrials,
  initialPendingCount,
}: AdminApproveTrialsClientProps) {
  const toast = useToast();
  const [trials, setTrials] = useState<AdminApprovalTrialItem[]>(initialTrials);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Per-row comments map: trialId -> string
  const [comments, setComments] = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  const [isPending, startTransition] = useTransition();
  const [processingAction, setProcessingAction] = useState<"APPROVE" | "DENY" | null>(null);

  const fetchTrials = (statusOverride?: string, searchOverride?: string) => {
    startTransition(async () => {
      const targetStatus = statusOverride !== undefined ? statusOverride : statusFilter;
      const targetSearch = searchOverride !== undefined ? searchOverride : searchQuery;

      const res = await getAdminApprovalTrialsAction({
        status: targetStatus,
        search: targetSearch,
      });

      if (res.success && res.trials) {
        setTrials(res.trials);
        if (res.pendingCount !== undefined) {
          setPendingCount(res.pendingCount);
        }
        setSelectedIds([]);
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === trials.length && trials.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trials.map((t) => t.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCommentChange = (id: string, text: string) => {
    setComments((prev) => ({ ...prev, [id]: text }));
  };

  const handleBulkProcess = async (action: "APPROVE" | "DENY", targetIds?: string[]) => {
    const idsToProcess = targetIds || selectedIds;

    if (idsToProcess.length === 0) {
      toast.error("Selection Required", `Please select at least one trial to ${action.toLowerCase()}.`);
      return;
    }

    setProcessingAction(action);

    try {
      const res = await adminBulkProcessFreeTrialsAction({
        trialIds: idsToProcess,
        action,
        remarksByTrialId: comments,
      });

      if (res.success) {
        toast.success(
          action === "APPROVE" ? "Trials Approved" : "Trials Denied",
          `Successfully ${action === "APPROVE" ? "approved" : "denied"} ${res.count || idsToProcess.length} trial subscription(s).`
        );
        fetchTrials();
      } else {
        toast.error("Process Failed", res.error || "Failed to process selected trials.");
      }
    } catch (err) {
      toast.error("Network Error", err instanceof Error ? err.message : "Error processing trials.");
    } finally {
      setProcessingAction(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="size-3" />
          <span>Approved</span>
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <AlertCircle className="size-3" />
          <span>Denied</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        <Clock className="size-3" />
        <span>Pending</span>
      </span>
    );
  };

  const isAllSelected = trials.length > 0 && selectedIds.length === trials.length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <span>APPROVE FREE TRIAL</span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                {pendingCount} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review, approve, or deny employee-submitted free trial service requests.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08]">
          {[
            { label: "Pending", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Denied", value: "REJECTED" },
            { label: "All", value: "ALL" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                fetchTrials(tab.value);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-white dark:bg-[#4F6DF5] text-[#4F6DF5] dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. TOP BULK ACTIONS & SEARCH BAR matching arpveadminfreetrial.png */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Bulk Approve & Deny Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={selectedIds.length === 0 || !!processingAction || isPending}
            onClick={() => handleBulkProcess("APPROVE")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingAction === "APPROVE" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5 stroke-[3]" />
            )}
            <span>Approve {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0 || !!processingAction || isPending}
            onClick={() => handleBulkProcess("DENY")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingAction === "DENY" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5 stroke-[3]" />
            )}
            <span>Deny {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {/* Right: Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTrials(statusFilter, searchQuery)}
              placeholder="Search by client, product, owner..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F6DF5]"
            />
            <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={() => fetchTrials()}
            disabled={isPending}
            title="Refresh records"
            className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <RotateCcw className={`size-3.5 ${isPending ? "animate-spin text-[#4F6DF5]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. DATA TABLE matching arpveadminfreetrial.png */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/[0.06] whitespace-nowrap uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="size-4 rounded border-slate-300 text-[#4F6DF5] focus:ring-[#4F6DF5]/30 cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <th scope="col" className="py-3 px-3.5">
                  Owner
                </th>
                <th scope="col" className="py-3 px-3.5">
                  Client
                </th>
                <th scope="col" className="py-3 px-3.5">
                  Mobile
                </th>
                <th scope="col" className="py-3 px-3.5">
                  Product
                </th>
                <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                  From Date
                </th>
                <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                  To Date
                </th>
                <th scope="col" className="py-3 px-3.5 min-w-[200px]">
                  Comment
                </th>
                <th scope="col" className="py-3 px-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-3.5 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {trials.length > 0 ? (
                trials.map((trial) => {
                  const isChecked = selectedIds.includes(trial.id);
                  const currentComment = comments[trial.id] ?? trial.remarks ?? "";

                  return (
                    <tr
                      key={trial.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors ${
                        isChecked ? "bg-cyan-500/[0.04] dark:bg-cyan-500/[0.08]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(trial.id)}
                          className="size-4 rounded border-slate-300 text-[#4F6DF5] focus:ring-[#4F6DF5]/30 cursor-pointer"
                          aria-label={`Select trial for ${trial.clientName}`}
                        />
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {trial.ownerName}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {trial.clientName}
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.mobile}
                      </td>

                      {/* Product */}
                      <td className="py-3 px-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {trial.productName}
                      </td>

                      {/* From Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.startDate}
                      </td>

                      {/* To Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trial.endDate}
                      </td>

                      {/* Comment Input */}
                      <td className="py-2.5 px-3.5">
                        <input
                          type="text"
                          value={currentComment}
                          onChange={(e) => handleCommentChange(trial.id, e.target.value)}
                          placeholder="Admin review notes..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F6DF5]"
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(trial.status)}
                      </td>

                      {/* Action buttons (Row Quick Approve / Deny) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBulkProcess("APPROVE", [trial.id])}
                            title="Approve Free Trial"
                            className="size-7 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <Check className="size-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkProcess("DENY", [trial.id])}
                            title="Deny Free Trial"
                            className="size-7 rounded-lg flex items-center justify-center bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="size-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="size-8 text-emerald-500/40" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No {statusFilter.toLowerCase()} trial requests
                      </span>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {statusFilter === "PENDING"
                          ? "All employee free trial requests have been processed."
                          : "No trial requests match the selected filter criteria."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
