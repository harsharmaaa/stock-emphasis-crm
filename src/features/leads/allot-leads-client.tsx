"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Database,
  UserCheck,
  AlertTriangle,
  X,
  Hash,
} from "lucide-react";
import {
  type AllotmentUserOption,
  allotLeadsAction,
  getLeadSourceCountsAction,
  type AllotLeadsResult,
} from "./actions";
import { LEAD_SOURCE_OPTIONS, LEAD_PROFILE_OPTIONS } from "@/src/lib/utils";

interface AllotLeadsClientProps {
  allotmentUsers: AllotmentUserOption[];
  initialSourceCounts: Record<string, number>;
}

export function AllotLeadsClient({
  allotmentUsers,
  initialSourceCounts,
}: AllotLeadsClientProps) {
  const leadSourceId = useId();
  const profileId = useId();
  const employeeId = useId();
  const leadCountId = useId();

  const [leadSource, setLeadSource] = useState<string>("Premium Lead");
  const [profile, setProfile] = useState<string>(""); // "" = All Profiles
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [numberOfLeads, setNumberOfLeads] = useState<string>("");

  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>(initialSourceCounts);
  const [isPending, startTransition] = useTransition();
  const [isCountsLoading, setIsCountsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AllotLeadsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableCount = sourceCounts[leadSource] || 0;

  // Refresh counts when profile changes
  const handleProfileChange = async (selectedProfile: string) => {
    setProfile(selectedProfile);
    setErrorMsg(null);
    setIsCountsLoading(true);

    try {
      const res = await getLeadSourceCountsAction({
        unassignedOnly: true,
        profile: selectedProfile || undefined,
      });
      if (res.success && res.counts) {
        setSourceCounts(res.counts);
      }
    } catch {
      // Ignore network fetch errors gracefully
    } finally {
      setIsCountsLoading(false);
    }
  };

  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    const countNum = parseInt(numberOfLeads, 10);
    if (isNaN(countNum) || countNum <= 0) {
      setErrorMsg("Please enter a valid positive number of leads to allot.");
      return;
    }

    if (!targetEmployeeId) {
      setErrorMsg("Please select an employee to receive the leads.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await allotLeadsAction({
          leadSource,
          profile: profile || undefined,
          employeeId: targetEmployeeId,
          numberOfLeads: countNum,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to allot leads.");
        } else {
          setResult(res);
          // Decrement available unassigned count locally
          setSourceCounts((prev) => ({
            ...prev,
            [leadSource]: Math.max(0, (prev[leadSource] || 0) - res.allottedCount),
          }));
          // Reset count input
          setNumberOfLeads("");
        }
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during lead allotment."
        );
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Back to Leads
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Share2 className="size-5" />
            </div>
            Allot Leads
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distribute unassigned prospect leads to sales and advisory personnel in oldest-first order.
          </p>
        </div>

        <Link
          href="/admin/leads"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all"
        >
          Go Back
        </Link>
      </div>

      {/* Main Grid: Form (Col-span 8) + Leads Count Sidebar (Col-span 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Box */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden backdrop-blur-xl">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="size-4 text-violet-500" />
              Lead Allocation Details
            </h2>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Available in &quot;{leadSource}&quot;{profile ? ` (${profile})` : ""}:{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {availableCount.toLocaleString()}
              </span>
            </span>
          </div>

          <form onSubmit={handleAllot} className="p-5 sm:p-6 space-y-5">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
                <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Success / Result Feedback */}
            {result && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Allotment Completed
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    title="Dismiss message"
                    className="p-1 rounded-md text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Assigned To</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {result.employeeName}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Lead Source</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {result.source}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Profile</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {result.profile || "All Profiles"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Allotted</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {result.allottedCount}
                    </span>
                  </div>
                </div>

                {result.shortageCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                    <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                    <span>
                      Notice: Requested {result.requestedCount} leads, but only {result.allottedCount} unassigned leads were available in &quot;{result.source}&quot;{result.profile ? ` (${result.profile})` : ""}. All {result.allottedCount} available leads were assigned.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 1. Lead Source */}
            <div>
              <label
                htmlFor={leadSourceId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Lead Source <span className="text-rose-500">*</span>
              </label>
              <select
                id={leadSourceId}
                value={leadSource}
                onChange={(e) => {
                  setLeadSource(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                {LEAD_SOURCE_OPTIONS.map((src) => (
                  <option key={src} value={src}>
                    {src} ({sourceCounts[src] || 0} unassigned)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Profile (Restored Field - Matching Reference Layout) */}
            <div>
              <label
                htmlFor={profileId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Profile <span className="text-slate-400 font-normal">(Optional Filter)</span>
              </label>
              <select
                id={profileId}
                value={profile}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">All Profiles (No Filter)</option>
                {LEAD_PROFILE_OPTIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Filters unassigned leads by customer profile category (e.g. Trader, Investor, Businessman).
              </p>
            </div>

            {/* 3. Employee Selection */}
            <div>
              <label
                htmlFor={employeeId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Employee <span className="text-rose-500">*</span>
              </label>
              <select
                id={employeeId}
                value={targetEmployeeId}
                onChange={(e) => {
                  setTargetEmployeeId(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Select Employee to receive leads</option>
                {allotmentUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) {u.teamName ? `— ${u.teamName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Number of Leads */}
            <div>
              <label
                htmlFor={leadCountId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Number Of Leads <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id={leadCountId}
                  type="number"
                  min={1}
                  value={numberOfLeads}
                  onChange={(e) => {
                    setNumberOfLeads(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 50, 100, 500"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="size-3.5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Leads are picked in oldest-first order ({availableCount} currently available in &quot;{leadSource}&quot;{profile ? ` for ${profile}` : ""}).
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
              <button
                type="submit"
                disabled={isPending || !targetEmployeeId || !numberOfLeads || availableCount === 0}
                className="w-full sm:w-auto px-7 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Allotting Leads...
                  </>
                ) : (
                  <>
                    <Share2 className="size-4" />
                    Allot
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Leads Count Breakdown */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden backdrop-blur-xl">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="size-4 text-violet-500" />
              Unassigned Leads Count
            </h3>
            <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
              {profile ? profile : "All Profiles"}
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-2 divide-y divide-slate-100 dark:divide-white/[0.04]">
            {isCountsLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-4 animate-spin text-violet-500" />
                <span className="text-[11px]">Updating counts for {profile}...</span>
              </div>
            ) : (
              LEAD_SOURCE_OPTIONS.map((src) => {
                const count = sourceCounts[src] || 0;
                const isSelected = src === leadSource;
                return (
                  <div
                    key={src}
                    onClick={() => setLeadSource(src)}
                    className={`pt-2 first:pt-0 flex items-center justify-between text-xs cursor-pointer rounded-lg px-1.5 py-1 transition-colors ${
                      isSelected
                        ? "bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <span className="truncate">{src}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white ml-2">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
