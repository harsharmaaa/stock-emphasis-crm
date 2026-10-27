"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  getLeadByIdAction,
  updateLeadDetailsAction,
  type LeadDetailItem,
  type AllotmentUserOption,
} from "./actions";
import {
  LEAD_RESPONSE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
} from "@/src/lib/utils";
import {
  X,
  Phone,
  CreditCard,
  TrendingUp,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  ChevronDown,
  CircleOff,
  AlertTriangle,
} from "lucide-react";

interface LeadDetailsDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: () => void;
  allotmentUsers: AllotmentUserOption[];
}

export function LeadDetailsDrawer({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
  allotmentUsers,
}: LeadDetailsDrawerProps) {
  const [lead, setLead] = useState<LeadDetailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Editable update state
  const [editResponse, setEditResponse] = useState<string>("");
  const [editSource, setEditSource] = useState<string>("");
  const [editProfile, setEditProfile] = useState<string>("");
  const [editExperience, setEditExperience] = useState<string>("");
  const [editCallbackDate, setEditCallbackDate] = useState<string>("");
  const [editAllotToId, setEditAllotToId] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Feature 1: Expandable Lead Details disclosure state
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Feature 2: Mark as Disposed state
  const [isConfirmingDispose, setIsConfirmingDispose] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);

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
      if (e.key === "Escape" && isOpen) {
        handleCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCloseDrawer]);

  // Load lead details when drawer opens
  useEffect(() => {
    if (!isOpen || !leadId) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setFetchError(null);
      setSaveSuccess(null);
      setSaveError(null);
      setIsDetailsExpanded(false);
      setIsConfirmingDispose(false);

      getLeadByIdAction(leadId)
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.lead) {
            setLead(res.lead);
            setEditResponse(res.lead.leadResponse || "Interested");
            setEditSource(res.lead.leadSource || "");
            setEditProfile(res.lead.profile || "");
            setEditExperience(res.lead.experience || "");
            setEditCallbackDate(
              res.lead.callbackDate ? res.lead.callbackDate.slice(0, 16) : ""
            );
            setEditAllotToId(res.lead.allotToId || "");
            setEditDescription(res.lead.description || "");
            setEditStatus(res.lead.status || "UNFOLLOWED");
          } else {
            setFetchError(res.error || "Failed to retrieve lead details.");
          }
        })
        .catch(() => {
          if (!cancelled) setFetchError("An unexpected error occurred while loading details.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, leadId]);

  // Handle saving updates
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;

    setSaveSuccess(null);
    setSaveError(null);

    startTransition(async () => {
      try {
        const res = await updateLeadDetailsAction({
          leadId,
          leadResponse: editResponse,
          leadSource: editSource || undefined,
          profile: editProfile || undefined,
          experience: editExperience || undefined,
          callbackDate: editCallbackDate || null,
          description: editDescription,
          allotToId: editAllotToId || null,
          status: editStatus,
        });

        if (!res.success) {
          setSaveError(res.error || "Failed to update lead details.");
          return;
        }

        setSaveSuccess("Lead details and allotment updated successfully!");

        // Update local lead record view
        setLead((prev) =>
          prev
            ? {
              ...prev,
              leadResponse: editResponse,
              leadSource: editSource || null,
              profile: editProfile || null,
              experience: editExperience || null,
              callbackDate: editCallbackDate || null,
              description: editDescription,
              allotToId: editAllotToId || null,
              status: editStatus,
              allotTo: editAllotToId
                ? allotmentUsers.find((u) => u.id === editAllotToId)
                  ? {
                    id: editAllotToId,
                    name: allotmentUsers.find((u) => u.id === editAllotToId)!.name,
                    email: allotmentUsers.find((u) => u.id === editAllotToId)!.email,
                    role: allotmentUsers.find((u) => u.id === editAllotToId)!.role,
                    teamName: allotmentUsers.find((u) => u.id === editAllotToId)!.teamName,
                  }
                  : null
                : null,
            }
            : null
        );

        onLeadUpdated();
      } catch {
        setSaveError("An unexpected network error occurred.");
      }
    });
  };

  // Feature 2: Execute Dispose Action
  const handleExecuteDispose = async () => {
    if (!leadId) return;
    setIsDisposing(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await updateLeadDetailsAction({
        leadId,
        status: "DISPOSED",
      });

      if (!res.success) {
        setSaveError(res.error || "Failed to mark lead as disposed.");
        setIsConfirmingDispose(false);
        return;
      }

      setLead((prev) => (prev ? { ...prev, status: "DISPOSED" } : null));
      setEditStatus("DISPOSED");
      setIsConfirmingDispose(false);
      setSaveSuccess("Lead has been successfully marked as Disposed.");
      onLeadUpdated();
    } catch {
      setSaveError("An unexpected error occurred while disposing lead.");
      setIsConfirmingDispose(false);
    } finally {
      setIsDisposing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-150">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={handleCloseDrawer}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-2xl border-l border-slate-200/90 dark:border-white/[0.10] shadow-[0_0_50px_rgba(0,0,0,0.35)] h-full flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-9 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold border border-violet-500/20 shrink-0">
              {lead ? lead.name.slice(0, 2).toUpperCase() : <User className="size-4.5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                {lead ? lead.name : "Lead Details"}
              </h2>
              {lead && (
                <p className="text-xs font-mono text-violet-600 dark:text-violet-400">
                  {lead.mobile}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead && (
              <button
                type="button"
                disabled={lead.status === "DISPOSED" || isDisposing}
                onClick={() => setIsConfirmingDispose(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  lead.status === "DISPOSED"
                    ? "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-750 cursor-not-allowed"
                    : "bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200/90 dark:border-rose-800/70 shadow-xs active:scale-95"
                }`}
                title={lead.status === "DISPOSED" ? "Lead is already marked as Disposed" : "Mark Lead as Disposed"}
              >
                <CircleOff className="size-3.5" />
                <span>{lead.status === "DISPOSED" ? "Disposed" : "Mark as Disposed"}</span>
              </button>
            )}

            <button
              onClick={handleCloseDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close details drawer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-purple-600 mx-auto" />
              <p className="text-xs text-slate-500">Loading lead record...</p>
            </div>
          ) : fetchError ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          ) : lead ? (
            <>
              {/* Feature 2: Confirmation Banner for Mark as Disposed */}
              {isConfirmingDispose && (
                <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        Mark this lead as Disposed?
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        Setting the status to DISPOSED will mark this lead as disposed in the system, log an activity log entry, and refresh the active leads pipeline.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDisposing}
                      onClick={() => setIsConfirmingDispose(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDisposing}
                      onClick={handleExecuteDispose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isDisposing ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Disposing...</span>
                        </>
                      ) : (
                        <>
                          <CircleOff className="size-3" />
                          <span>Confirm Dispose</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Status & Feedback Banners */}
              {saveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="size-4 text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* SECTION: Interactive Update Controls */}
              <form onSubmit={handleSaveChanges} className="p-5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-500/20 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-violet-200/60 dark:border-violet-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-900 dark:text-violet-300 flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Update Lead Disposition & Allotment
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                    Live Database Update
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Lead Response (Exact 12 options from confirmed CRM requirements) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lead Response
                    </label>
                    <select
                      value={editResponse}
                      onChange={(e) => setEditResponse(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {editResponse && !(LEAD_RESPONSE_OPTIONS as readonly string[]).includes(editResponse) && (
                        <option value={editResponse}>{editResponse} (Legacy)</option>
                      )}
                      {LEAD_RESPONSE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lead Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-purple-600 dark:text-purple-400 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="UNFOLLOWED">UNFOLLOWED</option>
                      <option value="UNREAD">UNREAD</option>
                      <option value="READ">READ</option>
                      <option value="FOLLOW_UP">FOLLOW_UP</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="CLIENT">CLIENT</option>
                      <option value="DISPOSED">DISPOSED</option>
                    </select>
                  </div>

                  {/* Lead Source (Exact 11 options from confirmed CRM requirements) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lead Source
                    </label>
                    <select
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="">-- Select Source --</option>
                      {editSource && !(LEAD_SOURCE_OPTIONS as readonly string[]).includes(editSource) && (
                        <option value={editSource}>{editSource} (Legacy)</option>
                      )}
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Profile (Exact 6 options from confirmed CRM requirements) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Profile
                    </label>
                    <select
                      value={editProfile}
                      onChange={(e) => setEditProfile(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="">-- Select Profile --</option>
                      {editProfile && !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(editProfile) && (
                        <option value={editProfile}>{editProfile} (Legacy)</option>
                      )}
                      {LEAD_PROFILE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Experience (Exact 5 options from confirmed CRM requirements) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Experience
                    </label>
                    <select
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="">-- Select Experience --</option>
                      {editExperience && !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(editExperience) && (
                        <option value={editExperience}>{editExperience} (Legacy)</option>
                      )}
                      {LEAD_EXPERIENCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Callback Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Callback Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editCallbackDate}
                      onChange={(e) => setEditCallbackDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>

                  {/* Allot To (Reassignment) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Allot To (Assignee)
                    </label>
                    <select
                      value={editAllotToId}
                      onChange={(e) => setEditAllotToId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="">-- Unassigned (General Pool) --</option>
                      {allotmentUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role} {u.teamName ? `• ${u.teamName}` : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comments / Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Conversation Notes / Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add follow-up call notes, client response feedback, or advisory requirements..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-violet-600/30 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-3.5" />
                        <span>Save Updates</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* FEATURE 1: Expandable/Collapsible Lead Details Section */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] overflow-hidden transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsDetailsExpanded((prev) => !prev)}
                  aria-expanded={isDetailsExpanded}
                  aria-controls="expandable-lead-details"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Lead Details
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      (Full Name, Email, State, City)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                    <span>{isDetailsExpanded ? "Hide Details" : "Show Details"}</span>
                    <ChevronDown
                      className={`size-4 transition-transform duration-200 ${
                        isDetailsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isDetailsExpanded && (
                  <div
                    id="expandable-lead-details"
                    className="px-4 pb-4 pt-1 border-t border-slate-200/60 dark:border-white/[0.05] animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          Full Name
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                          {lead.name || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          Email Address
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                          {lead.email || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          State
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {lead.state || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          City
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {lead.city || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Saved Record Profile (Read-only Overview) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Client Record Summary
                </h3>

                {/* Primary Contact Details */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <Phone className="size-3.5" /> Contact & Location
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Mobile Number</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {lead.mobile}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Alternate Mobile</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {lead.alternateMobile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Email Address</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate block">
                        {lead.email || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">City / State</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">District</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.district || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lead Source</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        {lead.leadSource || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trading & Investment Profile */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <TrendingUp className="size-3.5" /> Trading & Investment Profile
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Advisory Segment</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {lead.segment || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Investment Capital</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.investment || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Profile</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.profile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Experience</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.experience || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KYC & Identity Details */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <CreditCard className="size-3.5" /> Personal Identification (KYC)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Father&apos;s Name</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.fatherName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.dob ? new Date(lead.dob).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Occupation</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lead.occupation || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">PAN</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 uppercase">
                        {lead.pan || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Aadhar Number</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {lead.aadhar || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">GSTIN</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 uppercase">
                        {lead.gstin || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-1">
                  <span>
                    Created: {new Date(lead.createdAt).toLocaleString()}
                  </span>
                  <span>
                    Last Updated: {new Date(lead.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
