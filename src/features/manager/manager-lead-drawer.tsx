"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  getManagerLeadDetailsAction,
  updateManagerLeadDetailsAction,
  disposeManagerLeadAction,
  restoreManagerLeadAction,
  getActiveManagerLeadResponsesAction,
  type ManagerLeadItem,
} from "./lead-actions";
import {
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
} from "@/src/lib/utils";
import {
  X,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ChevronDown,
  CircleOff,
  AlertTriangle,
  Building2,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";

interface ManagerLeadDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: () => void;
}

export function ManagerLeadDrawer({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
}: ManagerLeadDrawerProps) {
  if (!isOpen || !leadId) return null;

  return (
    <ManagerLeadDrawerContent
      key={leadId}
      leadId={leadId}
      onClose={onClose}
      onLeadUpdated={onLeadUpdated}
    />
  );
}

function ManagerLeadDrawerContent({
  leadId,
  onClose,
  onLeadUpdated,
}: {
  leadId: string;
  onClose: () => void;
  onLeadUpdated: () => void;
}) {
  const [lead, setLead] = useState<ManagerLeadItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Editable update state
  const [editResponse, setEditResponse] = useState<string>("");
  const [editSource, setEditSource] = useState<string>("");
  const [activeResponses, setActiveResponses] = useState<string[]>([]);
  const [editProfile, setEditProfile] = useState<string>("");
  const [editExperience, setEditExperience] = useState<string>("");
  const [editSegment, setEditSegment] = useState<string>("");
  const [editInvestment, setEditInvestment] = useState<string>("");
  const [editCallbackDate, setEditCallbackDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");

  // Editable personal info
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editAlternateMobile, setEditAlternateMobile] = useState<string>("");
  const [editCity, setEditCity] = useState<string>("");
  const [editState, setEditState] = useState<string>("");
  const [editDistrict, setEditDistrict] = useState<string>("");
  const [editPan, setEditPan] = useState<string>("");
  const [editGstin, setEditGstin] = useState<string>("");
  const [editOccupation, setEditOccupation] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Expandable Personal Details disclosure state
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Mark as Disposed state
  const [isConfirmingDispose, setIsConfirmingDispose] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    getActiveManagerLeadResponsesAction().then((res) => {
      if (res.success && res.leadResponses) {
        setActiveResponses(res.leadResponses);
      }
    });
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setLead(null);
    setSaveSuccess(null);
    setSaveError(null);
    setFetchError(null);
    setIsDetailsExpanded(false);
    setIsConfirmingDispose(false);
    onClose();
  }, [onClose]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseDrawer]);

  // Load lead details on mount
  useEffect(() => {
    let isMounted = true;

    getManagerLeadDetailsAction(leadId)
      .then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res.success && res.lead) {
          const l = res.lead;
          setLead(l);
          setEditName(l.name || "");
          setEditEmail(l.email || "");
          setEditAlternateMobile(l.alternateMobile || "");
          setEditCity(l.city || "");
          setEditState(l.state || "");
          setEditDistrict(l.district || "");
          setEditPan(l.pan || "");
          setEditGstin(l.gstin || "");
          setEditOccupation(l.occupation || "");
          setEditResponse(l.leadResponse || "");
          setEditSource(l.leadSource || "");
          setEditProfile(l.profile || "");
          setEditExperience(l.experience || "");
          setEditSegment(l.segment || "");
          setEditInvestment(l.investment || "");
          setEditCallbackDate(l.callbackDate ? l.callbackDate.slice(0, 16) : "");
          setEditDescription(l.description || "");
          setEditStatus(l.status || "UNFOLLOWED");
        } else {
          setFetchError(res.error || "Lead not found");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
        setFetchError("Failed to fetch lead details");
      });

    return () => {
      isMounted = false;
    };
  }, [leadId]);

  const handleSave = () => {
    if (!leadId) return;
    setSaveError(null);
    setSaveSuccess(null);

    startTransition(async () => {
      try {
        const res = await updateManagerLeadDetailsAction({
          leadId,
          name: editName,
          email: editEmail || null,
          alternateMobile: editAlternateMobile || null,
          city: editCity || null,
          state: editState || null,
          district: editDistrict || null,
          pan: editPan || null,
          gstin: editGstin || null,
          occupation: editOccupation || null,
          segment: editSegment || null,
          investment: editInvestment || null,
          profile: editProfile || null,
          experience: editExperience || null,
          leadResponse: editResponse || null,
          leadSource: editSource || null,
          callbackDate: editCallbackDate || null,
          description: editDescription || null,
          status: editStatus,
        });

        if (res.success) {
          setSaveSuccess("Lead details updated successfully.");
          onLeadUpdated();
        } else {
          setSaveError(res.error || "Failed to update lead details.");
        }
      } catch {
        setSaveError("An unexpected error occurred while saving.");
      }
    });
  };

  const handleDisposeConfirm = async () => {
    if (!leadId) return;
    setIsDisposing(true);
    setSaveError(null);
    try {
      const res = await disposeManagerLeadAction({ leadId });
      if (res.success) {
        setEditStatus("DISPOSED");
        setIsConfirmingDispose(false);
        setSaveSuccess("Lead has been marked as Disposed.");
        onLeadUpdated();
      } else {
        setSaveError(res.error || "Failed to dispose lead.");
      }
    } catch {
      setSaveError("An unexpected error occurred while disposing lead.");
    } finally {
      setIsDisposing(false);
    }
  };

  const handleRestoreLead = async (targetStatus: "READ" | "UNREAD" = "READ") => {
    if (!leadId) return;
    setIsRestoring(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await restoreManagerLeadAction({
        leadId,
        targetStatus,
      });
      if (res.success) {
        setEditStatus(targetStatus);
        if (lead) {
          setLead({ ...lead, status: targetStatus });
        }
        setSaveSuccess(`Lead successfully restored to ${targetStatus === "UNREAD" ? "Unread" : "Read"}!`);
        onLeadUpdated();
      } else {
        setSaveError(res.error || "Failed to restore lead.");
      }
    } catch {
      setSaveError("An unexpected error occurred while restoring lead.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={handleCloseDrawer}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-[#0c1220] shadow-2xl border-l border-slate-200 dark:border-white/[0.08] flex flex-col z-10 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                {lead?.name ? lead.name.slice(0, 2).toUpperCase() : <User className="size-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {loading ? "Loading lead details..." : lead?.name || "Lead Details"}
                  </h2>
                  {lead && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {lead.status}
                    </span>
                  )}
                </div>
                {lead && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {lead.mobile} {lead.city ? `• ${lead.city}` : ""}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="size-8 animate-spin text-blue-500" />
                <span className="text-xs font-medium">Fetching team lead details...</span>
              </div>
            )}

            {fetchError && !loading && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {!loading && lead && (
              <div className="space-y-6">
                {/* Disposed Lead Banner with Quick Restore Action */}
                {editStatus === "DISPOSED" && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <CircleOff className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">This Lead is Disposed</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Restore this lead to reactivate it back into your working pipeline.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={() => handleRestoreLead("READ")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                        <span>Restore Lead</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Assignment Info Card (Strictly Read-Only for Managers) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="size-4 text-blue-500" />
                      <span>Assignment & Scope</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/70 dark:bg-white/[0.08] px-2 py-0.5 rounded-full">
                      Admin-Managed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Assigned Staff</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                        {lead.assignedTo?.name || "Unassigned"}
                      </span>
                      {lead.assignedTo?.email && (
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {lead.assignedTo.email}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Assigned Team</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                        {lead.team?.name || "No Team Assigned"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldAlert className="size-3.5 text-blue-500 shrink-0" />
                    <span>Lead allotment and team transfers are governed exclusively by CRM Administrators.</span>
                  </div>
                </div>

                {/* 2. Operational Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Lifecycle Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="UNFOLLOWED">Unfollowed</option>
                        <option value="UNREAD">Unread</option>
                        <option value="READ">Read</option>
                        <option value="FOLLOW_UP">Followup</option>
                        <option value="TRIAL">Trial</option>
                        <option value="CLIENT">Client</option>
                        <option value="DISPOSED">Disposed</option>
                      </select>
                    </div>

                    {/* Lead Response */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Lead Response
                      </label>
                      <select
                        value={editResponse}
                        onChange={(e) => setEditResponse(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select response...</option>
                        {activeResponses.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Profile */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Client Profile
                      </label>
                      <select
                        value={editProfile}
                        onChange={(e) => setEditProfile(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select profile...</option>
                        {LEAD_PROFILE_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Experience */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Trading Experience
                      </label>
                      <select
                        value={editExperience}
                        onChange={(e) => setEditExperience(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select experience...</option>
                        {LEAD_EXPERIENCE_OPTIONS.map((exp) => (
                          <option key={exp} value={exp}>
                            {exp}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Segment */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Segment
                      </label>
                      <input
                        type="text"
                        value={editSegment}
                        onChange={(e) => setEditSegment(e.target.value)}
                        placeholder="e.g. Equity / F&O"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                      </input>
                    </div>

                    {/* Investment */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Investment Capacity
                      </label>
                      <input
                        type="text"
                        value={editInvestment}
                        onChange={(e) => setEditInvestment(e.target.value)}
                        placeholder="e.g. 5-10 Lakhs"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                      </input>
                    </div>
                  </div>

                  {/* Callback Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Callback Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editCallbackDate}
                      onChange={(e) => setEditCallbackDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remarks / Comments */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Notes / Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      placeholder="Add supervisor notes, disposition remarks, or customer feedback..."
                      className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* 3. Expandable Personal & Contact Details */}
                <div className="border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <span>Personal & KYC Information</span>
                    <ChevronDown
                      className={`size-4 text-slate-400 transition-transform duration-200 ${
                        isDetailsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDetailsExpanded && (
                    <div className="p-4 space-y-3 bg-white dark:bg-transparent border-t border-slate-200 dark:border-white/[0.08] animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Alternate Phone</label>
                          <input
                            type="tel"
                            value={editAlternateMobile}
                            onChange={(e) => setEditAlternateMobile(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">City</label>
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">State</label>
                          <input
                            type="text"
                            value={editState}
                            onChange={(e) => setEditState(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">PAN Card</label>
                          <input
                            type="text"
                            value={editPan}
                            onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Actions: Restore Lead or Dispose Lead */}
                <div className="pt-2">
                  {editStatus === "DISPOSED" ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <RotateCcw className="size-4 shrink-0" />
                        <span>Reactivate & Restore Lead</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Restore this lead to move it from Disposed status back to your team&apos;s active working views. All details, notes, and call logs are preserved.
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => handleRestoreLead("READ")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                          <span>Restore to Read</span>
                        </button>
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => handleRestoreLead("UNREAD")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span>Restore as Unread</span>
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingDispose ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>Confirm Lead Disposition</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Marking this lead as Disposed will update its status to DISPOSED across team telemetry.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isDisposing}
                          onClick={handleDisposeConfirm}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {isDisposing ? <Loader2 className="size-3 animate-spin" /> : null}
                          <span>Confirm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDispose(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDispose(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                    >
                      <CircleOff className="size-3.5" />
                      <span>Mark as Disposed</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              disabled={isPending || loading}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save Lead</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
