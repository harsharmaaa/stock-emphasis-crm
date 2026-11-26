"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  getEmployeeLeadDetailsAction,
  updateEmployeeLeadDetailsAction,
  disposeEmployeeLeadAction,
  restoreEmployeeLeadAction,
  getActiveEmployeeLeadResponsesAction,
  type EmployeeLeadItem,
} from "./lead-actions";
import {
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
} from "@/src/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  CircleOff,
  CornerUpLeft,
  PhoneCall,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Eye,
} from "lucide-react";
import {
  AddFreeTrialModal,
  ViewTrialModal,
} from "@/src/features/trials/trial-modals";
import {
  AddPaymentModal,
  ViewPaymentModal,
} from "@/src/features/payments/payment-modals";

type ActiveTab = "basic" | "address" | "other" | "investment";

interface EmployeeLeadDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: () => void;
  leadIds?: string[];
  onNavigateLead?: (nextId: string) => void;
  onOpenCallModal?: (lead: EmployeeLeadItem) => void;
  onOpenTimelineModal?: (lead: EmployeeLeadItem) => void;
  onOpenAddTrialModal?: (lead: EmployeeLeadItem) => void;
  onOpenViewTrialModal?: (lead: EmployeeLeadItem) => void;
  onOpenAddPaymentModal?: (lead: EmployeeLeadItem) => void;
  onOpenViewPaymentModal?: (lead: EmployeeLeadItem) => void;
}

export function EmployeeLeadDrawer({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
  leadIds = [],
  onNavigateLead,
  onOpenCallModal,
  onOpenTimelineModal,
  onOpenAddTrialModal,
  onOpenViewTrialModal,
  onOpenAddPaymentModal,
  onOpenViewPaymentModal,
}: EmployeeLeadDrawerProps) {
  if (!isOpen || !leadId) return null;

  return (
    <EmployeeLeadDrawerContent
      key={leadId}
      leadId={leadId}
      onClose={onClose}
      onLeadUpdated={onLeadUpdated}
      leadIds={leadIds}
      onNavigateLead={onNavigateLead}
      onOpenCallModal={onOpenCallModal}
      onOpenTimelineModal={onOpenTimelineModal}
      onOpenAddTrialModal={onOpenAddTrialModal}
      onOpenViewTrialModal={onOpenViewTrialModal}
      onOpenAddPaymentModal={onOpenAddPaymentModal}
      onOpenViewPaymentModal={onOpenViewPaymentModal}
    />
  );
}

function EmployeeLeadDrawerContent({
  leadId,
  onClose,
  onLeadUpdated,
  leadIds = [],
  onNavigateLead,
  onOpenCallModal,
  onOpenTimelineModal,
  onOpenAddTrialModal,
  onOpenViewTrialModal,
  onOpenAddPaymentModal,
  onOpenViewPaymentModal,
}: {
  leadId: string;
  onClose: () => void;
  onLeadUpdated: () => void;
  leadIds?: string[];
  onNavigateLead?: (nextId: string) => void;
  onOpenCallModal?: (lead: EmployeeLeadItem) => void;
  onOpenTimelineModal?: (lead: EmployeeLeadItem) => void;
  onOpenAddTrialModal?: (lead: EmployeeLeadItem) => void;
  onOpenViewTrialModal?: (lead: EmployeeLeadItem) => void;
  onOpenAddPaymentModal?: (lead: EmployeeLeadItem) => void;
  onOpenViewPaymentModal?: (lead: EmployeeLeadItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("investment");
  const [lead, setLead] = useState<EmployeeLeadItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTrialMenuOpen, setIsTrialMenuOpen] = useState(false);
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const [isInvoiceMenuOpen, setIsInvoiceMenuOpen] = useState(false);
  const [isAddTrialModalOpen, setIsAddTrialModalOpen] = useState(false);
  const [isViewTrialModalOpen, setIsViewTrialModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);

  // Form states across tabs
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [altMobile, setAltMobile] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [fatherName, setFatherName] = useState<string>("");

  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [district, setDistrict] = useState<string>("");

  const [pan, setPan] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [occupation, setOccupation] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [segment, setSegment] = useState<string>("");
  const [investment, setInvestment] = useState<string>("");
  const [profile, setProfile] = useState<string>("");
  const [experience, setExperience] = useState<string>("");

  const [leadResponse, setLeadResponse] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [callbackDate, setCallbackDate] = useState<string>("");
  const [leadStatus, setLeadStatus] = useState<string>("UNREAD");

  const [activeResponses, setActiveResponses] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isConfirmingDispose, setIsConfirmingDispose] = useState(false);
  const [disposeReason, setDisposeReason] = useState("");
  const [isDisposing, setIsDisposing] = useState(false);

  // Calculate prev / next lead ids
  const currentIndex = useMemo(() => {
    return leadIds.indexOf(leadId);
  }, [leadIds, leadId]);

  const prevLeadId = currentIndex > 0 ? leadIds[currentIndex - 1] : null;
  const nextLeadId =
    currentIndex >= 0 && currentIndex < leadIds.length - 1
      ? leadIds[currentIndex + 1]
      : null;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getEmployeeLeadDetailsAction(leadId),
      getActiveEmployeeLeadResponsesAction(),
    ])
      .then(([leadRes, respRes]) => {
        if (!isMounted) return;
        setLoading(false);

        if (leadRes.success && leadRes.lead) {
          const l = leadRes.lead;
          setLead(l);
          setName(l.name || "");
          setEmail(l.email || "");
          setAltMobile(l.alternateMobile || "");
          setDob(l.dob ? l.dob.slice(0, 10) : "");
          setFatherName(l.fatherName || "");

          setCity(l.city || "");
          setState(l.state || "");
          setDistrict(l.district || "");

          setPan(l.pan || "");
          setGstin(l.gstin || "");
          setOccupation(l.occupation || "");
          setDescription(l.description || "");

          setSegment(l.segment || "");
          setInvestment(l.investment || "");
          setProfile(l.profile || "");
          setExperience(l.experience || "");

          setLeadResponse(l.leadResponse || "");
          setLeadSource(l.leadSource || "DIRECT");
          setCallbackDate(l.callbackDate ? l.callbackDate.slice(0, 16) : "");
          setLeadStatus(l.status || "UNREAD");
        } else {
          setFetchError(leadRes.error || "Failed to load lead details.");
        }

        if (respRes.success && respRes.responses) {
          setActiveResponses(respRes.responses);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
        setFetchError("An error occurred while loading lead details.");
      });

    return () => {
      isMounted = false;
    };
  }, [leadId]);

  const formatLastUpdated = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const handleSave = (advanceToNext: boolean = false) => {
    setSaveError(null);
    setSaveSuccess(null);

    startTransition(async () => {
      try {
        const res = await updateEmployeeLeadDetailsAction({
          leadId,
          name: name || null,
          email: email || null,
          alternateMobile: altMobile || null,
          dob: dob || null,
          fatherName: fatherName || null,
          city: city || null,
          state: state || null,
          district: district || null,
          pan: pan || null,
          gstin: gstin || null,
          occupation: occupation || null,
          segment: segment || null,
          investment: investment || null,
          profile: profile || null,
          experience: experience || null,
          leadResponse: leadResponse || null,
          leadSource: leadSource || null,
          callbackDate: callbackDate || null,
          description: description || null,
          status: leadStatus || undefined,
        });

        if (res.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("employee:callback-updated"));
          }
          setSaveSuccess("Lead details updated successfully.");
          onLeadUpdated();

          if (advanceToNext && nextLeadId && onNavigateLead) {
            onNavigateLead(nextLeadId);
          } else {
            setTimeout(() => setSaveSuccess(null), 3000);
          }
        } else {
          setSaveError(res.error || "Failed to save lead updates.");
        }
      } catch {
        setSaveError("An unexpected error occurred while saving.");
      }
    });
  };

  const handleDispose = async () => {
    setIsDisposing(true);
    try {
      const res = await disposeEmployeeLeadAction({
        leadId,
        reason: disposeReason.trim() || undefined,
      });
      if (res.success) {
        setIsConfirmingDispose(false);
        setLeadStatus("DISPOSED");
        onLeadUpdated();
      } else {
        setSaveError(res.error || "Failed to mark lead as disposed.");
      }
    } catch {
      setSaveError("Error disposing lead.");
    } finally {
      setIsDisposing(false);
    }
  };

  const handleRestore = async () => {
    setIsDisposing(true);
    try {
      const res = await restoreEmployeeLeadAction({
        leadId,
        targetStatus: "READ",
      });
      if (res.success) {
        setLeadStatus("READ");
        onLeadUpdated();
      } else {
        setSaveError(res.error || "Failed to restore lead.");
      }
    } catch {
      setSaveError("Error restoring lead.");
    } finally {
      setIsDisposing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Main Container matching Image 2 */}
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* TOP QUICK ACTION BUTTONS ROW */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/40 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Previous Lead Button */}
            <button
              type="button"
              disabled={!prevLeadId || !onNavigateLead}
              onClick={() => prevLeadId && onNavigateLead && onNavigateLead(prevLeadId)}
              className="p-1.5 rounded-lg bg-[#ff7043] hover:bg-[#f4511e] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Lead"
            >
              <ChevronLeft className="size-4 stroke-[2.5]" />
            </button>

            {/* Trial Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsTrialMenuOpen((prev) => !prev);
                  setIsPaymentMenuOpen(false);
                  setIsInvoiceMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#00bcd4] hover:bg-[#00acc1] transition-colors cursor-pointer shadow-2xs"
              >
                <span>Trial</span>
                <ChevronDown className={`size-3.5 transition-transform ${isTrialMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isTrialMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1"
                  onClick={() => setIsTrialMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (lead) {
                        if (onOpenAddTrialModal) onOpenAddTrialModal(lead);
                        else setIsAddTrialModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors text-left cursor-pointer"
                  >
                    <Plus className="size-3.5 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                    <span>Add Free Trial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (lead) {
                        if (onOpenViewTrialModal) onOpenViewTrialModal(lead);
                        else setIsViewTrialModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left cursor-pointer"
                  >
                    <Eye className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span>View Trial</span>
                  </button>
                </div>
              )}
            </div>

            {/* Payment Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentMenuOpen((prev) => !prev);
                  setIsTrialMenuOpen(false);
                  setIsInvoiceMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#00bcd4] hover:bg-[#00acc1] transition-colors cursor-pointer shadow-2xs"
              >
                <span>Payment</span>
                <ChevronDown className={`size-3.5 transition-transform ${isPaymentMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isPaymentMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1"
                  onClick={() => setIsPaymentMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (lead) {
                        if (onOpenAddPaymentModal) onOpenAddPaymentModal(lead);
                        else setIsAddPaymentModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (lead) {
                        if (onOpenViewPaymentModal) onOpenViewPaymentModal(lead);
                        else setIsViewPaymentModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                  >
                    <Eye className="size-3.5" />
                    <span>View Payment</span>
                  </button>
                </div>
              )}
            </div>

            {/* Invoice Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceMenuOpen((prev) => !prev);
                  setIsTrialMenuOpen(false);
                  setIsPaymentMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#00bcd4] hover:bg-[#00acc1] transition-colors cursor-pointer shadow-2xs"
              >
                <span>Invoice</span>
                <ChevronDown className={`size-3.5 transition-transform ${isInvoiceMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isInvoiceMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-52 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsInvoiceMenuOpen(false)}
                >
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Invoicing Engine
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    GST invoicing and proforma generation scheduled for Phase 2.
                  </div>
                </div>
              )}
            </div>

            {/* SMS Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#00bcd4] hover:bg-[#00acc1] transition-colors cursor-pointer shadow-2xs"
              >
                <span>SMS</span>
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* Calls Button */}
            <button
              type="button"
              onClick={() => lead && onOpenCallModal && onOpenCallModal(lead)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors cursor-pointer shadow-2xs"
            >
              <PhoneCall className="size-3.5" />
              <span>Calls</span>
            </button>

            {/* Timeline Button */}
            <button
              type="button"
              onClick={() => lead && onOpenTimelineModal && onOpenTimelineModal(lead)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors cursor-pointer shadow-2xs"
            >
              <History className="size-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          {/* Right Action Icons: Dispose, Go Back, Next */}
          <div className="flex items-center gap-1.5">
            {leadStatus === "DISPOSED" ? (
              <button
                type="button"
                disabled={isDisposing}
                onClick={handleRestore}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                title="Restore Lead"
              >
                <RotateCcw className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDispose((prev) => !prev)}
                className="p-1.5 rounded-lg bg-[#00bcd4] hover:bg-[#00acc1] text-white transition-colors cursor-pointer shadow-2xs"
                title="Dispose Lead"
              >
                <CircleOff className="size-4" />
              </button>
            )}

            {/* Go Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#ff7043] hover:bg-[#f4511e] transition-colors cursor-pointer shadow-2xs"
            >
              <CornerUpLeft className="size-3.5" />
              <span>Go Back</span>
            </button>

            {/* Next Lead Button */}
            <button
              type="button"
              disabled={!nextLeadId || !onNavigateLead}
              onClick={() => nextLeadId && onNavigateLead && onNavigateLead(nextLeadId)}
              className="p-1.5 rounded-lg bg-[#ff7043] hover:bg-[#f4511e] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Lead"
            >
              <ChevronRight className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* METADATA STRIP (Matching Image 2) */}
        <div className="px-6 py-3 bg-[#f8fafc] dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="text-slate-400 font-normal">@</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">Lead Owner:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {lead?.assignedTo?.name || "Unassigned"}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Lead Source:</span>{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {leadSource || "DIRECT"}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              Lead Id: #{lead ? lead.id.slice(-7) : "..."}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Last Updated: {formatLastUpdated(lead?.updatedAt || lead?.createdAt)}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => lead && onOpenCallModal && onOpenCallModal(lead)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-400/80 dark:border-blue-500/70 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                <Plus className="size-3 stroke-[2.5]" />
                <span>Add to Followup</span>
              </button>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50">
                @{leadStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Dispose confirmation bar if triggered */}
        {isConfirmingDispose && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Disposal reason:
              </span>
              <input
                type="text"
                placeholder="Optional disposal reason..."
                value={disposeReason}
                onChange={(e) => setDisposeReason(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-800 dark:text-slate-200 flex-1 max-w-md focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDisposing}
                onClick={handleDispose}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                {isDisposing ? "Disposing..." : "Confirm Dispose"}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDispose(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY: LEFT TABS & RIGHT PANELS */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {loading ? (
            <div className="py-24 w-full flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="size-8 animate-spin text-cyan-500" />
              <span>Loading lead details...</span>
            </div>
          ) : fetchError ? (
            <div className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          ) : (
            <>
              {/* Left Vertical Tabs (Matching Image 2) */}
              <div className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("basic")}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    activeTab === "basic"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Basic Details
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("address")}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    activeTab === "address"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Address
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("other")}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    activeTab === "other"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Other
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("investment")}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    activeTab === "investment"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Investment
                </button>
              </div>

              {/* Right Panel Forms */}
              <div className="flex-1 space-y-4">
                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                {saveError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* 1. INVESTMENT TAB PANEL (Matching Image 2) */}
                {activeTab === "investment" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                    {/* Segment */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Segment
                      </label>
                      <input
                        type="text"
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                        placeholder="e.g. Cash, Futures, Options"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Investment */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Investment
                      </label>
                      <input
                        type="text"
                        value={investment}
                        onChange={(e) => setInvestment(e.target.value)}
                        placeholder="investmnet"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Profile */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Profile
                      </label>
                      <select
                        value={profile}
                        onChange={(e) => setProfile(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Select Profile</option>
                        {LEAD_PROFILE_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Experience */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Experience
                      </label>
                      <select
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Not Started</option>
                        {LEAD_EXPERIENCE_OPTIONS.map((exp) => (
                          <option key={exp} value={exp}>
                            {exp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 2. BASIC DETAILS TAB PANEL */}
                {activeTab === "basic" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Client full name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={lead?.mobile || ""}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-500 cursor-not-allowed select-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Alternate Mobile
                      </label>
                      <input
                        type="text"
                        value={altMobile}
                        onChange={(e) => setAltMobile(e.target.value)}
                        placeholder="Secondary contact number"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Father&apos;s Name
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Father's full name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* 3. ADDRESS TAB PANEL */}
                {activeTab === "address" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="District"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* 4. OTHER TAB PANEL */}
                {activeTab === "other" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        PAN
                      </label>
                      <input
                        type="text"
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="22AAAAA0000A1Z5"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Business / Salaried / Professional"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Call Response
                      </label>
                      <select
                        value={leadResponse}
                        onChange={(e) => setLeadResponse(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Select Response</option>
                        {activeResponses.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Notes / Description
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Additional notes about lead preferences, discussion details..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* BOTTOM ACTION BUTTONS & FOOTER (Matching Image 2) */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/40 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending || loading}
              onClick={() => handleSave(false)}
              className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-xs font-bold text-white bg-[#00b4a7] hover:bg-[#009688] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <span>Save</span>
            </button>

            <button
              type="button"
              disabled={isPending || loading}
              onClick={() => handleSave(true)}
              className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-xs font-bold text-white bg-[#00b4a7] hover:bg-[#009688] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <span>Save & Next</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            &copy; Stock Emphasis v4.2.0. All rights reserved.
          </div>
        </div>
      </div>

      {lead && (
        <>
          <AddFreeTrialModal
            isOpen={isAddTrialModalOpen}
            onClose={() => setIsAddTrialModalOpen(false)}
            lead={lead}
            onSuccess={() => {
              onLeadUpdated();
              getEmployeeLeadDetailsAction(leadId).then((leadRes) => {
                if (leadRes.success && leadRes.lead) {
                  setLead(leadRes.lead);
                  setLeadStatus(leadRes.lead.status || "UNREAD");
                }
              });
            }}
          />
          <ViewTrialModal
            isOpen={isViewTrialModalOpen}
            onClose={() => setIsViewTrialModalOpen(false)}
            lead={lead}
          />
          <AddPaymentModal
            isOpen={isAddPaymentModalOpen}
            onClose={() => setIsAddPaymentModalOpen(false)}
            lead={lead}
            onSuccess={() => {
              onLeadUpdated();
              getEmployeeLeadDetailsAction(leadId).then((leadRes) => {
                if (leadRes.success && leadRes.lead) {
                  setLead(leadRes.lead);
                  setLeadStatus(leadRes.lead.status || "UNREAD");
                }
              });
            }}
          />
          <ViewPaymentModal
            isOpen={isViewPaymentModalOpen}
            onClose={() => setIsViewPaymentModalOpen(false)}
            lead={lead}
          />
        </>
      )}
    </div>
  );
}
