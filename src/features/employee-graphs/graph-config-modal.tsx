"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import {
  saveEmployeeGraphConfigAction,
  type EmployeeGraphConfigItem,
  type ProfileOption,
  type GraphType,
} from "./actions";

interface GraphConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: EmployeeGraphConfigItem) => void;
  initialData?: EmployeeGraphConfigItem | null;
  profiles: ProfileOption[];
}

export function GraphConfigModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  profiles,
}: GraphConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <GraphConfigForm
          key={initialData?.id || "new"}
          onClose={onClose}
          onSaved={onSaved}
          initialData={initialData}
          profiles={profiles}
        />
      </div>
    </div>
  );
}

function GraphConfigForm({
  onClose,
  onSaved,
  initialData,
  profiles,
}: {
  onClose: () => void;
  onSaved: (item: EmployeeGraphConfigItem) => void;
  initialData?: EmployeeGraphConfigItem | null;
  profiles: ProfileOption[];
}) {
  const isKnown = initialData
    ? profiles.some((p) => p.name.toUpperCase() === initialData.profile.toUpperCase())
    : true;

  const [title, setTitle] = useState(initialData?.title || "");
  const [profile, setProfile] = useState(
    initialData ? (isKnown ? initialData.profile : "CUSTOM") : profiles[0]?.name || "TL"
  );
  const [customProfile, setCustomProfile] = useState(
    initialData && !isKnown ? initialData.profile : ""
  );
  const [size, setSize] = useState(initialData?.size || 5);
  const [type, setType] = useState<GraphType>(initialData?.type || "Individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please provide a Title for the graph.");
      return;
    }
    const finalProfile = profile === "CUSTOM" ? customProfile.trim() : profile;
    if (!finalProfile) {
      setErrorMsg("Please select or enter a Profile.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await saveEmployeeGraphConfigAction({
        id: initialData?.id,
        title: title.trim(),
        profile: finalProfile,
        size: Number(size) || 5,
        type,
      });

      if (res.success && res.config) {
        onSaved(res.config);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to save graph configuration.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {initialData ? "Edit Graph Configuration" : "Add Graph Configuration"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure leaderboard tier, profile cohort, and display size.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Graph Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Best TL, Top Best SBA"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Profile Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Target Profile <span className="text-rose-500">*</span>
          </label>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} {p.departmentName ? `(${p.departmentName})` : ""}
              </option>
            ))}
            <option value="CUSTOM">+ Custom Profile Name</option>
          </select>
        </div>

        {profile === "CUSTOM" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Custom Profile Identifier
            </label>
            <input
              type="text"
              required
              value={customProfile}
              onChange={(e) => setCustomProfile(e.target.value)}
              placeholder="e.g. AFM, Executive, Specialist"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Size (Top Count) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Display Size (Top Performers Count)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          <span className="text-[10px] text-slate-400">
            Number of top ranking operators or teams displayed on the bar graph.
          </span>
        </div>

        {/* Type (Individual vs Team) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Graph Type
          </label>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setType("Individual")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                type === "Individual"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              Individual
            </button>

            <button
              type="button"
              onClick={() => setType("Team")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                type === "Team"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              Team
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>{initialData ? "Update Configuration" : "Create Configuration"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

