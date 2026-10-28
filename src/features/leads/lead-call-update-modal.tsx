"use client";

import { useState, useTransition } from "react";
import {
  X,
  Calendar,
  MessageSquare,
  Layers,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import { updateLeadDetailsAction, type LeadListItem } from "./actions";

interface LeadCallUpdateModalProps {
  lead: LeadListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CALL_RESPONSE_OPTIONS = [
  "Callback",
  "NPC",
  "Do Not Trade",
  "Not Reachable",
  "Not Interested",
  "Call Disconnect",
  "Language Issue",
  "Busy",
  "FT",
  "Interested",
] as const;

export function LeadCallUpdateModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: LeadCallUpdateModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <LeadCallUpdateModalContent
      key={lead.id}
      lead={lead}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function LeadCallUpdateModalContent({
  lead,
  onClose,
  onSuccess,
}: {
  lead: LeadListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<string>(lead.leadResponse || "");
  const [callbackDate, setCallbackDate] = useState<string>(
    lead.callbackDate ? lead.callbackDate.slice(0, 16) : ""
  );
  const [comment, setComment] = useState<string>(lead.description || "");
  const [isFollowup, setIsFollowup] = useState<boolean>(lead.status === "FOLLOW_UP");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format display date: e.g. 26-Oct-26
  const displayDate = lead.createdAt
    ? new Date(lead.createdAt)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
        .replace(/ /g, "-")
    : "";

  const handleAddFollowupClick = () => {
    const nextState = !isFollowup;
    setIsFollowup(nextState);
    if (nextState && !response) {
      setResponse("Callback");
    }
  };

  const handleSave = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await updateLeadDetailsAction({
          leadId: lead.id,
          leadResponse: response || undefined,
          callbackDate: callbackDate || null,
          description: comment || undefined,
          status: isFollowup ? "FOLLOW_UP" : undefined,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || "Failed to save call update.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving.");
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
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
            Lead Id : # {lead.id.slice(-7)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Section Header: Call Response & Last Updated */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              Call Response
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              Last Updated : {displayDate}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Form Fields Container */}
          <div className="space-y-3.5">
            {/* 1. Select Response & Add Followup Button */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                <div className="flex items-center justify-center w-11 h-10 bg-slate-100/80 dark:bg-white/[0.05] border-r border-slate-200 dark:border-white/[0.08] text-purple-600 dark:text-purple-400 shrink-0">
                  <Layers className="size-4" />
                </div>
                <select
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="" className="text-slate-400">
                    Select Response
                  </option>
                  {CALL_RESPONSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="text-slate-800 dark:text-slate-900">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Followup Button */}
              <button
                type="button"
                onClick={handleAddFollowupClick}
                className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isFollowup
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
              >
                {isFollowup ? (
                  <Check className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>Add Followup</span>
              </button>
            </div>

            {/* 2. Callback Date */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <div className="flex items-center justify-center w-11 h-10 bg-slate-100/80 dark:bg-white/[0.05] border-r border-slate-200 dark:border-white/[0.08] text-blue-600 dark:text-blue-400 shrink-0">
                <Calendar className="size-4" />
              </div>
              <input
                type="datetime-local"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                placeholder="Callback Date"
                className="w-full h-10 px-3 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* 3. Comment Textarea */}
            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <div className="flex items-start justify-center w-11 pt-3 bg-slate-100/80 dark:bg-white/[0.05] border-r border-slate-200 dark:border-white/[0.08] text-teal-600 dark:text-teal-400 shrink-0">
                <MessageSquare className="size-4" />
              </div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment here..."
                className="w-full p-3 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Bottom Save Button (Exact Teal styling matching design) */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 min-w-[120px] px-8 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-bold transition-all shadow-md shadow-[#00a884]/20 hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
