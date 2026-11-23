"use client";

import { useState, useTransition, useEffect } from "react";
import {
  executeAdminSelectedLeadsBulkAction,
  type AdminSelectedLeadsBulkOperationType,
  type AllotmentUserOption,
} from "./actions";
import {
  X,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface AdminSelectedLeadsActionModalProps {
  isOpen: boolean;
  selectedLeadIds: string[];
  onClose: () => void;
  onSuccess: () => void;
  allotmentUsers: AllotmentUserOption[];
  availableSources: string[];
  availableTeams: { id: string; name: string }[];
}

export function AdminSelectedLeadsActionModal({
  isOpen,
  selectedLeadIds,
  onClose,
  onSuccess,
  allotmentUsers,
  availableSources,
  availableTeams,
}: AdminSelectedLeadsActionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [operation, setOperation] = useState<AdminSelectedLeadsBulkOperationType>("ALLOT_USER_TEAM");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [targetTeamId, setTargetTeamId] = useState<string>("");
  const [targetSource, setTargetSource] = useState<string>("");
  const [clearPreviousTimeline, setClearPreviousTimeline] = useState<boolean>(false);
  const [confirmDeleteForever, setConfirmDeleteForever] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const effectiveTargetSource = targetSource || availableSources[0] || "";

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const downloadCsv = (data: Array<Record<string, unknown>>) => {
    if (!data || data.length === 0) return;
    const headers = [
      "ID",
      "Name",
      "Mobile",
      "Email",
      "City",
      "State",
      "Status",
      "Lead Source",
      "Lead Response",
      "Assigned To",
      "Created At",
    ];

    const rows = data.map((d) => [
      d.id || "",
      `"${String(d.name || "").replace(/"/g, '""')}"`,
      d.mobile || "",
      d.email || "",
      d.city || "",
      d.state || "",
      d.status || "",
      d.leadSource || "",
      d.leadResponse || "",
      `"${String(d.assignedToName || "").replace(/"/g, '""')}"`,
      d.createdAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `leads_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecute = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedLeadIds.length === 0) {
      setErrorMessage("No leads selected.");
      return;
    }

    if (operation === "DELETE_FOREVER" && !confirmDeleteForever) {
      setErrorMessage("Please check the confirmation box to permanently delete leads.");
      return;
    }

    if (operation === "ALLOT_USER_TEAM" && !targetUserId && !targetTeamId) {
      setErrorMessage("Please select at least a Target User or Target Team for Transfer.");
      return;
    }

    if (operation === "RECYCLE" && !effectiveTargetSource) {
      setErrorMessage("Please select a target Lead Source.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await executeAdminSelectedLeadsBulkAction({
          leadIds: selectedLeadIds,
          action: operation,
          targetUserId: targetUserId || null,
          targetTeamId: targetTeamId || null,
          targetSource:
            operation === "RECYCLE"
              ? effectiveTargetSource
              : targetSource.trim() || undefined,
          clearPreviousTimeline:
            operation === "RECYCLE" || operation === "ALLOT_USER_TEAM"
              ? clearPreviousTimeline
              : false,
        });

        if (res.success) {
          if (operation === "EXPORT" && res.exportData) {
            downloadCsv(res.exportData);
          }

          setSuccessMessage(res.message || "Operation completed successfully.");
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        } else {
          setErrorMessage(res.error || "Failed to execute bulk action.");
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#121826] border border-slate-700/60 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Bulk Actions</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {selectedLeadIds.length} Selected
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute batch operations on explicitly selected leads.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Type Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "ALLOT_USER_TEAM", label: "Allot / Transfer", icon: UserCheck },
            { id: "RECYCLE", label: "Recycle to Pool", icon: RotateCcw },
            { id: "DISPOSE", label: "Dispose", icon: CheckCircle2 },
            { id: "EXPORT", label: "Export CSV", icon: Download },
            { id: "DELETE", label: "Move to Bin", icon: Trash2 },
            { id: "DELETE_FOREVER", label: "Delete Forever", icon: AlertTriangle },
          ].map((item) => {
            const Icon = item.icon;
            const active = operation === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOperation(item.id as AdminSelectedLeadsBulkOperationType)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center gap-1.5 ${
                  active
                    ? "bg-violet-600/20 border-violet-500 text-white shadow-xs"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-violet-400" : "text-slate-400"}`} />
                <span className="text-[11px] leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Configuration Body based on operation */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
          {operation === "ALLOT_USER_TEAM" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Assign to User (Lead Owner):
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-violet-500 text-xs"
                >
                  <option value="">-- Keep / Clear User Assignment --</option>
                  {allotmentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) {u.teamName ? `• ${u.teamName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Assign to Team:
                </label>
                <select
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-violet-500 text-xs"
                >
                  <option value="">-- Auto-resolve from User / No Team --</option>
                  {availableTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Target Lead Source (Optional):
                </label>
                <select
                  value={targetSource}
                  onChange={(e) => setTargetSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-violet-500 text-xs"
                >
                  <option value="">-- Keep Current Lead Source --</option>
                  {availableSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearPreviousTimeline}
                  onChange={(e) => setClearPreviousTimeline(e.target.checked)}
                  className="size-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/30"
                />
                <span className="font-medium text-xs">Clear Previous Timeline & Call History</span>
              </label>

              <p className="text-[11px] text-slate-400">
                Selected leads will be assigned with status reset to <span className="text-cyan-400 font-bold">UNREAD</span> so they appear immediately in the assignee&apos;s queue.
              </p>
            </div>
          )}

          {operation === "RECYCLE" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Target Lead Source Pool:
                </label>
                <select
                  value={effectiveTargetSource}
                  onChange={(e) => setTargetSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-violet-500 text-xs"
                >
                  {availableSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearPreviousTimeline}
                  onChange={(e) => setClearPreviousTimeline(e.target.checked)}
                  className="size-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/30"
                />
                <span className="font-medium text-xs">Clear Previous Timeline & Call History</span>
              </label>

              <p className="text-[11px] text-slate-400">
                Selected leads will be unassigned (<span className="text-cyan-400 font-mono">allotToId: null</span>) and reset to <span className="text-cyan-400 font-bold">UNREAD</span> in the unalloted pool for the chosen source.
              </p>
            </div>
          )}

          {operation === "DISPOSE" && (
            <div className="space-y-1">
              <p className="text-slate-300">
                Move {selectedLeadIds.length} lead(s) to <span className="text-rose-400 font-bold">DISPOSED</span> status.
              </p>
              <p className="text-[11px] text-slate-400">
                Disposed leads will no longer show in active queues and can be reviewed in the Disposed tab.
              </p>
            </div>
          )}

          {operation === "EXPORT" && (
            <div className="space-y-1">
              <p className="text-slate-300">
                Export all {selectedLeadIds.length} selected lead(s) to a CSV spreadsheet.
              </p>
              <p className="text-[11px] text-slate-400">
                Includes ID, contact info, lead source, response, owner assignment, and created dates.
              </p>
            </div>
          )}

          {operation === "DELETE" && (
            <div className="space-y-1">
              <p className="text-slate-300">
                Move {selectedLeadIds.length} lead(s) to the <span className="text-rose-400 font-bold">Deleted Bin</span>.
              </p>
              <p className="text-[11px] text-slate-400">
                Soft-deletes the records. They can be reviewed or permanently deleted later.
              </p>
            </div>
          )}

          {operation === "DELETE_FOREVER" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-rose-200">
                  <AlertTriangle className="size-4 text-rose-400" /> Permanent Database Deletion
                </p>
                <p className="text-[11px] leading-relaxed">
                  This action CANNOT be undone. It will permanently purge all {selectedLeadIds.length} lead records and their call logs from the database.
                </p>
              </div>

              <label className="flex items-center gap-2 text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDeleteForever}
                  onChange={(e) => setConfirmDeleteForever(e.target.checked)}
                  className="size-4 rounded border-rose-500/50 text-rose-600 focus:ring-rose-500/30"
                />
                <span className="font-bold text-xs">Yes, permanently delete these records</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPending || (operation === "DELETE_FOREVER" && !confirmDeleteForever)}
            onClick={handleExecute}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              operation === "DELETE_FOREVER" || operation === "DELETE"
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : operation === "EXPORT"
                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <span>
                {operation === "EXPORT"
                  ? "Download CSV"
                  : operation === "DELETE_FOREVER"
                  ? "Delete Permanently"
                  : "Execute Action"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
