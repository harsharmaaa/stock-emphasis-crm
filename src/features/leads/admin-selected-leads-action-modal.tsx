"use client";

import { useState, useTransition, useEffect } from "react";
import {
  executeAdminSelectedLeadsBulkAction,
  type AdminSelectedLeadsBulkOperationType,
  type AllotmentUserOption,
} from "./actions";
import {
  Modal,
  Button,
  Badge,
  Card,
  Field,
  Select,
  useToast,
} from "@/src/components/ui";
import {
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Download,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

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
  const toast = useToast();
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

          const msg = res.message || "Operation completed successfully.";
          setSuccessMessage(msg);
          toast?.success(msg);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        } else {
          const err = res.error || "Failed to execute bulk action.";
          setErrorMessage(err);
          toast?.error(err);
        }
      } catch (err) {
        const errText = err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMessage(errText);
        toast?.error(errText);
      }
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span>Bulk Actions</span>
          <Badge tone="info">
            {selectedLeadIds.length} Selected
          </Badge>
        </div>
      }
      description="Execute batch operations on explicitly selected leads."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isPending || (operation === "DELETE_FOREVER" && !confirmDeleteForever)}
            loading={isPending}
            onClick={handleExecute}
            variant={
              operation === "DELETE_FOREVER" || operation === "DELETE"
                ? "danger"
                : "primary"
            }
            size="sm"
          >
            {operation === "EXPORT"
              ? "Download CSV"
              : operation === "DELETE_FOREVER"
              ? "Delete Permanently"
              : "Execute Action"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Notifications */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-500" />
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
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center gap-1.5",
                  active
                    ? "bg-[var(--brand)]/15 border-[var(--brand)] text-[var(--brand)] shadow-xs"
                    : "bg-[var(--glass-stroke)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--glass-stroke)]/80"
                )}
              >
                <Icon className={cn("size-4", active ? "text-[var(--brand)]" : "text-[var(--muted)]")} />
                <span className="text-[11px] leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Configuration Body based on operation */}
        <Card className="p-4 space-y-3 text-xs">
          {operation === "ALLOT_USER_TEAM" && (
            <div className="space-y-3">
              <Field label="Assign to User (Lead Owner)" id="target-user">
                <Select
                  id="target-user"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">-- Keep / Clear User Assignment --</option>
                  {allotmentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) {u.teamName ? `• ${u.teamName}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Assign to Team" id="target-team">
                <Select
                  id="target-team"
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">-- Auto-resolve from User / No Team --</option>
                  {availableTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Target Lead Source (Optional)" id="target-source">
                <Select
                  id="target-source"
                  value={targetSource}
                  onChange={(e) => setTargetSource(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">-- Keep Current Lead Source --</option>
                  {availableSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>

              <label className="flex items-center gap-2 pt-1 text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearPreviousTimeline}
                  onChange={(e) => setClearPreviousTimeline(e.target.checked)}
                  className="size-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]/30"
                />
                <span className="font-medium text-xs">Clear Previous Timeline & Call History</span>
              </label>

              <p className="text-[11px] text-[var(--muted)]">
                Selected leads will be assigned with status reset to <span className="text-cyan-500 font-bold">UNREAD</span> so they appear immediately in the assignee&apos;s queue.
              </p>
            </div>
          )}

          {operation === "RECYCLE" && (
            <div className="space-y-3">
              <Field label="Target Lead Source Pool" id="recycle-source">
                <Select
                  id="recycle-source"
                  value={effectiveTargetSource}
                  onChange={(e) => setTargetSource(e.target.value)}
                  className="w-full text-xs"
                >
                  {availableSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>

              <label className="flex items-center gap-2 pt-1 text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearPreviousTimeline}
                  onChange={(e) => setClearPreviousTimeline(e.target.checked)}
                  className="size-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]/30"
                />
                <span className="font-medium text-xs">Clear Previous Timeline & Call History</span>
              </label>

              <p className="text-[11px] text-[var(--muted)]">
                Selected leads will be unassigned (<span className="text-cyan-500 font-mono">allotToId: null</span>) and reset to <span className="text-cyan-500 font-bold">UNREAD</span> in the unalloted pool for the chosen source.
              </p>
            </div>
          )}

          {operation === "DISPOSE" && (
            <div className="space-y-1">
              <p className="text-[var(--text)]">
                Move {selectedLeadIds.length} lead(s) to <span className="text-rose-500 font-bold">DISPOSED</span> status.
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Disposed leads will no longer show in active queues and can be reviewed in the Disposed tab.
              </p>
            </div>
          )}

          {operation === "EXPORT" && (
            <div className="space-y-1">
              <p className="text-[var(--text)]">
                Export all {selectedLeadIds.length} selected lead(s) to a CSV spreadsheet.
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Includes ID, contact info, lead source, response, owner assignment, and created dates.
              </p>
            </div>
          )}

          {operation === "DELETE" && (
            <div className="space-y-1">
              <p className="text-[var(--text)]">
                Move {selectedLeadIds.length} lead(s) to the <span className="text-rose-500 font-bold">Deleted Bin</span>.
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Soft-deletes the records. They can be reviewed or permanently deleted later.
              </p>
            </div>
          )}

          {operation === "DELETE_FOREVER" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-rose-500">
                  <AlertTriangle className="size-4" /> Permanent Database Deletion
                </p>
                <p className="text-[11px] leading-relaxed">
                  This action CANNOT be undone. It will permanently purge all {selectedLeadIds.length} lead records and their call logs from the database.
                </p>
              </div>

              <label className="flex items-center gap-2 text-rose-600 dark:text-rose-300 cursor-pointer">
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
        </Card>
      </div>
    </Modal>
  );
}
