"use client";

import { useState } from "react";
import { createLeadSourceAction, updateLeadSourceAction } from "./actions";
import type { LeadSourceItem } from "./types";

interface LeadSourceModalProps {
  source: LeadSourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedSource: LeadSourceItem) => void;
}

export function LeadSourceModal({
  source,
  isOpen,
  onClose,
  onSuccess,
}: LeadSourceModalProps) {
  const isEditing = Boolean(source);

  const [name, setName] = useState(source?.name || "");
  const [description, setDescription] = useState(source?.description || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && source) {
        const res = await updateLeadSourceAction({
          id: source.id,
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadSource) {
          setErrorMsg(res.error || "Failed to update lead source.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadSource);
        onClose();
      } else {
        const res = await createLeadSourceAction({
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadSource) {
          setErrorMsg(res.error || "Failed to create lead source.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadSource);
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c1220] shadow-2xl border border-slate-200/90 dark:border-white/[0.1] overflow-hidden">
        {/* Header matching legacy screenshot */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {isEditing ? "Edit Lead Source" : "Add Lead Source"}
          </h2>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Start typing here..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Buttons matching legacy screenshot: Save (turquoise/green) and Close (salmon/rose) */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white shadow-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

