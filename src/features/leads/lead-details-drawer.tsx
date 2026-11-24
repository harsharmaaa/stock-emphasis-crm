"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  getActiveLeadSourcesAction,
  getActiveLeadResponsesAction,
  getLeadByIdAction,
  updateLeadDetailsAction,
  type LeadDetailItem,
  type AllotmentUserOption,
} from "./actions";
import {
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
  cn,
} from "@/src/lib/utils";
import {
  Button,
  Badge,
  Card,
  Field,
  Select,
  Textarea,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import {
  Pencil,
  X,
  Phone,
  CreditCard,
  TrendingUp,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ChevronDown,
  CircleOff,
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
  const toast = useToast();
  const [lead, setLead] = useState<LeadDetailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Editable update state
  const [editResponse, setEditResponse] = useState<string>("");
  const [editSource, setEditSource] = useState<string>("");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [activeResponses, setActiveResponses] = useState<string[]>([]);
  useEffect(() => {
    getActiveLeadResponsesAction().then((res) => {
      if (res.success && res.leadResponses) setActiveResponses(res.leadResponses);
    });
  }, []);
  useEffect(() => {
    getActiveLeadSourcesAction().then((res) => {
      if (res.success && res.leadSources) setActiveSources(res.leadSources);
    });
  }, []);
  const [editProfile, setEditProfile] = useState<string>("");
  const [editExperience, setEditExperience] = useState<string>("");
  const [editCallbackDate, setEditCallbackDate] = useState<string>("");
  const [editAllotToId, setEditAllotToId] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Expandable Lead Details disclosure state
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Mark as Disposed state
  const [isConfirmingDispose, setIsConfirmingDispose] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);

  const isCurrentClient =
    lead?.status?.toUpperCase() === "CLIENT" ||
    lead?.status?.toUpperCase() === "CLIENTS";

  const handleResponseChange = (newResp: string) => {
    setEditResponse(newResp);
    const upper = newResp.trim().toUpperCase();
    if (["FT", "FREE TRIAL", "TRIAL"].includes(upper)) {
      setEditStatus("TRIAL");
    } else if (["DISPOSED", "DISPOSE"].includes(upper)) {
      setEditStatus("DISPOSED");
    } else if (["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(upper)) {
      setEditStatus("FOLLOW_UP");
    } else if (newResp) {
      if (!isCurrentClient) {
        setEditStatus("READ");
      }
    }
  };

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
            setEditResponse(res.lead.leadResponse || "");
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
          toast?.error(res.error || "Failed to update lead details.");
          return;
        }

        setSaveSuccess("Lead details and allotment updated successfully!");
        toast?.success("Lead details updated successfully!");

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
        toast?.error("An unexpected network error occurred.");
      }
    });
  };

  // Execute Dispose Action
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
        toast?.error(res.error || "Failed to mark lead as disposed.");
        setIsConfirmingDispose(false);
        return;
      }

      setLead((prev) => (prev ? { ...prev, status: "DISPOSED" } : null));
      setEditStatus("DISPOSED");
      setIsConfirmingDispose(false);
      setSaveSuccess("Lead has been successfully marked as Disposed.");
      toast?.success("Lead marked as disposed.");
      onLeadUpdated();
    } catch {
      setSaveError("An unexpected error occurred while disposing lead.");
      toast?.error("An unexpected error occurred while disposing lead.");
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
      <div className="relative w-full max-w-2xl bg-[var(--panel-solid)] backdrop-blur-2xl border-l border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.35)] h-full flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--glass-stroke)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-9 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] font-bold border border-[var(--brand)]/30 shrink-0">
              {lead ? lead.name.slice(0, 2).toUpperCase() : <User className="size-4.5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[var(--text)] truncate">
                {lead ? lead.name : "Lead Details"}
              </h2>
              {lead && (
                <p className="text-xs font-mono text-[var(--brand)]">
                  {lead.mobile}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {leadId && (
              <Link
                href={`/admin/search?leadId=${leadId}`}
                onClick={handleCloseDrawer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-all shadow-xs"
                title="Open in Full Legacy Edit View (KYC, Address, Agreements)"
              >
                <Pencil className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Full Edit View ↗</span>
              </Link>
            )}
            {lead && (
              <Button
                type="button"
                variant={lead.status === "DISPOSED" ? "secondary" : "danger"}
                size="sm"
                disabled={lead.status === "DISPOSED" || isDisposing}
                onClick={() => setIsConfirmingDispose(true)}
                title={lead.status === "DISPOSED" ? "Lead is already marked as Disposed" : "Mark Lead as Disposed"}
              >
                <CircleOff className="size-3.5" />
                <span>{lead.status === "DISPOSED" ? "Disposed" : "Mark as Disposed"}</span>
              </Button>
            )}

            <button
              onClick={handleCloseDrawer}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--glass-stroke)] transition-colors cursor-pointer"
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
              <Loader2 className="size-8 animate-spin text-[var(--brand)] mx-auto" />
              <p className="text-xs text-[var(--muted)]">Loading lead record...</p>
            </div>
          ) : fetchError ? (
            <Card className="p-4 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{fetchError}</span>
            </Card>
          ) : lead ? (
            <>
              {/* Status & Feedback Banners */}
              {saveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="size-4 text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Full Edit View Bridge Banner */}
              {leadId && (
                <Card className="p-3.5 border-emerald-500/30 bg-emerald-500/[0.05] flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Pencil className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text)] truncate">
                        Need Full KYC & Master Editing?
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate">
                        Open Legacy Console for Address, PAN/Aadhar, Investment & Agreements
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/admin/search?leadId=${leadId}`}
                    onClick={handleCloseDrawer}
                  >
                    <Button variant="primary" size="sm" className="!bg-emerald-600 hover:!bg-emerald-500">
                      <span>Full Edit View ↗</span>
                    </Button>
                  </Link>
                </Card>
              )}

              {/* SECTION: Interactive Update Controls */}
              <form onSubmit={handleSaveChanges}>
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Update Lead Disposition & Allotment
                    </span>
                    <Badge tone="info">Live Database Update</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Lead Response */}
                    <Field label="Lead Response" id="edit-response">
                      <Select
                        id="edit-response"
                        value={editResponse}
                        onChange={(e) => handleResponseChange(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">-- Select Response --</option>
                        {editResponse &&
                          !["CLIENT", "CLIENTS"].includes(editResponse.trim().toUpperCase()) &&
                          !activeResponses.includes(editResponse) && (
                            <option value={editResponse}>{editResponse} (Existing)</option>
                          )}
                        {activeResponses
                          .filter((opt) => !["CLIENT", "CLIENTS"].includes(opt.trim().toUpperCase()))
                          .map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                      </Select>
                    </Field>

                    {/* Status */}
                    <Field label="Lead Status" id="edit-status">
                      <Select
                        id="edit-status"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full text-xs font-semibold text-[var(--brand)]"
                      >
                        <option value="UNFOLLOWED">UNFOLLOWED</option>
                        <option value="UNREAD">UNREAD</option>
                        <option value="READ">READ</option>
                        <option value="FOLLOW_UP">FOLLOW_UP</option>
                        <option value="TRIAL">TRIAL</option>
                        {isCurrentClient && (
                          <option value="CLIENT" disabled>
                            CLIENT (Confirmed Payment)
                          </option>
                        )}
                        <option value="DISPOSED">DISPOSED</option>
                      </Select>
                    </Field>

                    {/* Lead Source */}
                    <Field label="Lead Source" id="edit-source">
                      <Select
                        id="edit-source"
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">-- Select Source --</option>
                        {editSource && !activeSources.includes(editSource) && (
                          <option value={editSource}>{editSource} (Existing)</option>
                        )}
                        {activeSources.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {/* Profile */}
                    <Field label="Profile" id="edit-profile">
                      <Select
                        id="edit-profile"
                        value={editProfile}
                        onChange={(e) => setEditProfile(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">-- Select Profile --</option>
                        {editProfile &&
                          !(LEAD_PROFILE_OPTIONS as readonly string[]).includes(editProfile) && (
                            <option value={editProfile}>{editProfile} (Legacy)</option>
                          )}
                        {LEAD_PROFILE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {/* Experience */}
                    <Field label="Experience" id="edit-experience">
                      <Select
                        id="edit-experience"
                        value={editExperience}
                        onChange={(e) => setEditExperience(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">-- Select Experience --</option>
                        {editExperience &&
                          !(LEAD_EXPERIENCE_OPTIONS as readonly string[]).includes(editExperience) && (
                            <option value={editExperience}>{editExperience} (Legacy)</option>
                          )}
                        {LEAD_EXPERIENCE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {/* Callback Date (native datetime-local preserved per audit) */}
                    <Field label="Callback Date & Time" id="edit-callback">
                      <input
                        id="edit-callback"
                        type="datetime-local"
                        value={editCallbackDate}
                        onChange={(e) => setEditCallbackDate(e.target.value)}
                        className="inp w-full text-xs py-2"
                      />
                    </Field>

                    {/* Allot To (Reassignment) */}
                    <Field label="Allot To (Assignee)" id="edit-allot">
                      <Select
                        id="edit-allot"
                        value={editAllotToId}
                        onChange={(e) => setEditAllotToId(e.target.value)}
                        className="w-full text-xs"
                      >
                        <option value="">-- Unassigned (General Pool) --</option>
                        {allotmentUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role} {u.teamName ? `• ${u.teamName}` : ""})
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {/* Comments / Description */}
                    <div className="sm:col-span-2">
                      <Field label="Conversation Notes / Remarks" id="edit-description">
                        <Textarea
                          id="edit-description"
                          rows={3}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Add follow-up call notes, client response feedback, or advisory requirements..."
                          className="w-full text-xs"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={isPending}
                      disabled={isPending}
                    >
                      Save Updates
                    </Button>
                  </div>
                </Card>
              </form>

              {/* Expandable/Collapsible Lead Details Section */}
              <Card className="overflow-hidden transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsDetailsExpanded((prev) => !prev)}
                  aria-expanded={isDetailsExpanded}
                  aria-controls="expandable-lead-details"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--glass-stroke)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-[var(--brand)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                      Lead Details
                    </span>
                    <span className="text-[10px] text-[var(--muted)] font-medium">
                      (Full Name, Email, State, City)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-semibold">
                    <span>{isDetailsExpanded ? "Hide Details" : "Show Details"}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform duration-200",
                        isDetailsExpanded ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </button>

                {isDetailsExpanded && (
                  <div
                    id="expandable-lead-details"
                    className="px-4 pb-4 pt-1 border-t border-[var(--border)] animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                      <div className="p-3 rounded-xl bg-[var(--glass-stroke)] border border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--muted)] block uppercase tracking-wider">
                          Full Name
                        </span>
                        <span className="font-bold text-[var(--text)] mt-0.5 block">
                          {lead.name || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--glass-stroke)] border border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--muted)] block uppercase tracking-wider">
                          Email Address
                        </span>
                        <span className="font-medium text-[var(--text)] mt-0.5 block truncate">
                          {lead.email || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--glass-stroke)] border border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--muted)] block uppercase tracking-wider">
                          State
                        </span>
                        <span className="font-medium text-[var(--text)] mt-0.5 block">
                          {lead.state || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--glass-stroke)] border border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--muted)] block uppercase tracking-wider">
                          City
                        </span>
                        <span className="font-medium text-[var(--text)] mt-0.5 block">
                          {lead.city || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* SECTION: Saved Record Profile (Read-only Overview) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Client Record Summary
                </h3>

                {/* Primary Contact Details */}
                <Card className="p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                    <Phone className="size-3.5" /> Contact & Location
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Mobile Number</span>
                      <span className="font-mono font-bold text-[var(--text)]">
                        {lead.mobile}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Alternate Mobile</span>
                      <span className="font-mono text-[var(--text)]">
                        {lead.alternateMobile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Email Address</span>
                      <span className="text-[var(--text)] truncate block">
                        {lead.email || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">City / State</span>
                      <span className="text-[var(--text)]">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">District</span>
                      <span className="text-[var(--text)]">
                        {lead.district || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Lead Source</span>
                      <span className="text-[var(--text)] font-semibold">
                        {lead.leadSource || "—"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Trading & Investment Profile */}
                <Card className="p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                    <TrendingUp className="size-3.5" /> Trading & Investment Profile
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Advisory Segment</span>
                      <span className="font-semibold text-[var(--text)]">
                        {lead.segment || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Investment Capital</span>
                      <span className="text-[var(--text)]">
                        {lead.investment || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Profile</span>
                      <span className="text-[var(--text)]">
                        {lead.profile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Experience</span>
                      <span className="text-[var(--text)]">
                        {lead.experience || "—"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* KYC & Identity Details */}
                <Card className="p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                    <CreditCard className="size-3.5" /> Personal Identification (KYC)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Father&apos;s Name</span>
                      <span className="text-[var(--text)]">
                        {lead.fatherName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Date of Birth</span>
                      <span className="text-[var(--text)]">
                        {lead.dob ? new Date(lead.dob).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Occupation</span>
                      <span className="text-[var(--text)]">
                        {lead.occupation || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">PAN</span>
                      <span className="font-mono text-[var(--text)] uppercase">
                        {lead.pan || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Aadhar Number</span>
                      <span className="font-mono text-[var(--text)]">
                        {lead.aadhar || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">GSTIN</span>
                      <span className="font-mono text-[var(--text)] uppercase">
                        {lead.gstin || "—"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Metadata */}
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-2 px-1">
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

      {/* Confirmation Dialog for Lead Disposition */}
      <ConfirmDialog
        open={isConfirmingDispose}
        onClose={() => setIsConfirmingDispose(false)}
        onConfirm={handleExecuteDispose}
        title="Mark this lead as Disposed?"
        description={
          <span>
            Setting the status to <strong className="text-rose-500 font-mono">DISPOSED</strong> will mark this lead as disposed in the system, log an activity log entry, and refresh the active leads pipeline.
          </span>
        }
        confirmText="Confirm Dispose"
        cancelText="Cancel"
        tone="danger"
        loading={isDisposing}
      />
    </div>
  );
}
