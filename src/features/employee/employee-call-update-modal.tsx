"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  Calendar,
  Layers,
  MessageSquare,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import {
  updateEmployeeLeadCallAction,
  getActiveEmployeeLeadResponsesAction,
  type EmployeeLeadItem,
} from "./lead-actions";

interface EmployeeCallUpdateModalProps {
  lead: EmployeeLeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeCallUpdateModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: EmployeeCallUpdateModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <EmployeeCallUpdateModalContent
      key={lead.id}
      lead={lead}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function EmployeeCallUpdateModalContent({
  lead,
  onClose,
  onSuccess,
}: {
  lead: EmployeeLeadItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<string>(lead.leadResponse || "");
  const [activeResponses, setActiveResponses] = useState<string[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState<boolean>(true);
  const [callbackDate, setCallbackDate] = useState<string>(
    lead.callbackDate ? lead.callbackDate.slice(0, 16) : ""
  );
  const [comment, setComment] = useState<string>(lead.description || "");
  const [isFollowup, setIsFollowup] = useState<boolean>(lead.status === "FOLLOW_UP");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getActiveEmployeeLeadResponsesAction().then((res) => {
      if (res.success && res.responses) {
        setActiveResponses(res.responses);
      }
      setIsLoadingResponses(false);
    });
  }, []);

  const formatLastUpdated = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const formattedUpdated = formatLastUpdated(lead.updatedAt || lead.createdAt);

  const handleResponseChange = (newResp: string) => {
    setResponse(newResp);
    const upper = newResp.trim().toUpperCase();
    if (["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(upper)) {
      setIsFollowup(true);
    } else if (newResp) {
      setIsFollowup(false);
    }
  };

  const handleToggleFollowup = () => {
    setIsFollowup((prev) => !prev);
  };

  const handleSave = () => {
    setErrorMessage(null);

    const normResp = (response || "").trim().toUpperCase();
    const isSpecialTerminal = ["FT", "FREE TRIAL", "TRIAL", "DISPOSED", "DISPOSE"].includes(normResp);
    const statusPayload = isFollowup && !isSpecialTerminal ? "FOLLOW_UP" : undefined;

    startTransition(async () => {
      try {
        const res = await updateEmployeeLeadCallAction({
          leadId: lead.id,
          leadResponse: response || undefined,
          callbackDate: callbackDate || null,
          description: comment || undefined,
          status: statusPayload,
        });

        if (res.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("employee:callback-updated"));
          }
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || "Failed to save call disposition.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving call disposition.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog Card (Matching Image 1) */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white tracking-tight">
            Lead Id : # {lead.id.slice(-7)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Subheader: CALL RESPONSE & Last Updated */}
        <div className="flex items-center justify-between pb-4">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            CALL RESPONSE
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Last Updated : {formattedUpdated}
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form Rows */}
        <div className="space-y-3.5">
          {/* Row 1: Icon + Select + Add Followup button */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-900/60 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
              <Layers className="size-4 text-purple-600 dark:text-purple-400 mr-2.5 shrink-0" />
              <select
                value={response}
                onChange={(e) => handleResponseChange(e.target.value)}
                disabled={isLoadingResponses}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Select Call Response --</option>
                {activeResponses.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                {response &&
                  !activeResponses.includes(response) &&
                  !["CLIENT", "CLIENTS"].includes(response.trim().toUpperCase()) && (
                    <option value={response}>{response}</option>
                  )}
              </select>
            </div>

            <button
              type="button"
              onClick={handleToggleFollowup}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                isFollowup
                  ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-slate-900 border-blue-400/80 dark:border-blue-500/70 text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/30"
              }`}
            >
              {isFollowup ? (
                <>
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span>Followup Active</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Add Followup</span>
                </>
              )}
            </button>
          </div>

          {/* Row 2: Icon + Scheduled Callback datetime */}
          <div className="flex items-center px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-900/60 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
            <Calendar className="size-4 text-purple-600 dark:text-purple-400 mr-2.5 shrink-0" />
            <input
              type="datetime-local"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
              placeholder="mm/dd/yyyy --:-- --"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Row 3: Icon + Comment Notes */}
          <div className="flex items-start px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-900/60 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
            <MessageSquare className="size-4 text-purple-600 dark:text-purple-400 mr-2.5 mt-0.5 shrink-0" />
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Call notes / summary..."
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer: Red Close pill & Teal Save pill */}
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-7 py-2 rounded-full text-xs font-semibold text-white bg-[#e11d48] hover:bg-[#be123c] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-7 py-2 rounded-full text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
