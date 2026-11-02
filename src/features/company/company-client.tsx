"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Building2, Shield, Bold, Italic, List, ListOrdered } from "lucide-react";
import { INDIAN_STATES } from "@/src/features/users/employee-form";
import { updateCompanyDetailsAction } from "./actions";
import type { CompanyDetailsValues } from "./types";

// Days 01 through 31
const MONTH_START_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1).padStart(2, "0");
  return day;
});

// Month end options: "Last Day Of Month", followed by 01 to 31
const MONTH_END_OPTIONS = [
  "Last Day Of Month",
  ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")),
];

interface CompanyClientProps {
  initialData: CompanyDetailsValues;
}

export function CompanyClient({ initialData }: CompanyClientProps) {
  const [name, setName] = useState(initialData.name);
  const [website, setWebsite] = useState(initialData.website);
  const [state, setState] = useState(initialData.state);
  const [city, setCity] = useState(initialData.city);
  const [address, setAddress] = useState(initialData.address);
  const [monthStartDay, setMonthStartDay] = useState(initialData.monthStartDay || "01");
  const [monthEndDay, setMonthEndDay] = useState(initialData.monthEndDay || "Last Day Of Month");
  const [policy, setPolicy] = useState(initialData.policy);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Helper formatting for policy editor
  const applyFormat = (syntaxPrefix: string, syntaxSuffix: string = "") => {
    const textarea = document.getElementById("policy-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    const replacement = `${syntaxPrefix}${selectedText || "text"}${syntaxSuffix}`;
    const newPolicy = `${beforeText}${replacement}${afterText}`;
    setPolicy(newPolicy);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxPrefix.length, start + replacement.length - syntaxSuffix.length);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("error", "Company Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateCompanyDetailsAction({
        name,
        website,
        state,
        city,
        address,
        monthStartDay,
        monthEndDay,
        policy,
      });

      if (res.success) {
        showToast("success", "Company details and policy saved successfully.");
      } else {
        showToast("error", res.error || "Failed to save company details.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-18 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar matching legacy CRM screenshot */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
            COMPANY
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure official corporate details, business calendar cycles, and company policy.
          </p>
        </div>

        {/* Go Back Button matching legacy screenshot */}
        <Link
          href="/admin/settings/configuration"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="size-3.5" />
          <span>Go Back</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Details Card */}
        <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-2">
            <Building2 className="size-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Details
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Row 1 Left: Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. STOCK EMPHASIS"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Row 1 Right: Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. www.stockemphasis.com"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Row 2 Left: State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2 Right: City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Indore"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Row 3 Left: Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="25, FA, Scheme No. 94, Sector-F, 201-202, Lake View-1, Indore (M.P.)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y"
                />
              </div>

              {/* Row 3 Right: Month Start Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Month Start Day
                </label>
                <select
                  value={monthStartDay}
                  onChange={(e) => setMonthStartDay(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                >
                  {MONTH_START_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4 Left: Month End Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Month End Day
                </label>
                <select
                  value={monthEndDay}
                  onChange={(e) => setMonthEndDay(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                >
                  {MONTH_END_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Policy Card */}
        <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-emerald-500" />
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Policy
              </h2>
            </div>

            {/* Quick format tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyFormat("**", "**")}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs"
                title="Bold (**text**)"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("*", "*")}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs"
                title="Italic (*text*)"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n- ")}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs"
                title="Bullet List (- item)"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n1. ")}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs"
                title="Numbered List (1. item)"
              >
                <ListOrdered className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <textarea
              id="policy-textarea"
              rows={8}
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              placeholder="Start typing here..."
              className="w-full p-4 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Footer info matching screenshot */}
        <div className="pt-6 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/70 dark:border-white/[0.06]">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </form>
    </div>
  );
}

