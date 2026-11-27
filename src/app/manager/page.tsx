import { Suspense } from "react";
import { requireManagerSession } from "@/src/lib/auth-guard";
import { getManagerDashboardStep1Action } from "@/src/features/manager/dashboard-actions";
import { ManagerOverviewClient } from "@/src/features/manager/manager-overview-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Manager Overview | Stock Emphasis CRM",
  description: "Operational supervision, team leadership metrics, and staff allocations.",
};

function ManagerDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse w-full min-w-0" aria-busy="true">
      {/* Header Skeleton */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-full bg-blue-500/20" />
          <div className="h-7 w-60 rounded-xl bg-slate-200 dark:bg-white/[0.08]" />
          <div className="h-3.5 w-80 max-w-full rounded-md bg-slate-100 dark:bg-white/[0.04]" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
          <div className="h-9 w-28 rounded-xl bg-blue-600/30" />
        </div>
      </div>

      {/* Row 1: Target Card (7 cols) + Reminders Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 h-48 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-5 w-20 rounded bg-blue-500/20" />
          </div>
          <div className="h-8 w-48 rounded bg-slate-200 dark:bg-white/[0.08]" />
          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-white/[0.08]" />
        </div>

        <div className="lg:col-span-5 h-48 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] p-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-7 w-28 rounded-xl bg-[#4F6DF5]/30" />
            <div className="h-7 w-24 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
            <div className="h-7 w-20 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-8 w-full rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
            <div className="h-8 w-full rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
          </div>
        </div>
      </div>

      {/* Row 2: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="size-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <div className="h-7 w-28 rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>

      {/* Row 3: 2 Wide Snapshot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-16 rounded-xl bg-slate-50 dark:bg-white/[0.02]" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: 2 Report Cards Skeleton (Step 2: Followup & Fetch) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-6 w-20 rounded bg-slate-100 dark:bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-around p-4 gap-2">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="w-8 rounded-t bg-slate-200/60 dark:bg-white/[0.04]" style={{ height: `${20 + k * 15}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 5: 2 Report Cards Skeleton (Step 3: Payment Daily & Calling) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="flex gap-2">
                <div className="h-6 w-24 rounded bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-6 w-20 rounded bg-slate-100 dark:bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-around p-4 gap-2">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="w-8 rounded-t bg-[#4F6DF5]/20 dark:bg-[#4F6DF5]/10" style={{ height: `${15 + k * 16}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 6: Tabbed Reports Section Skeleton (Step 3: Lead Reports & Matrices) */}
      <div className="p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 rounded-xl bg-[#4F6DF5]/30" />
          <div className="h-8 w-28 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-8 w-32 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-8 w-36 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02]" />
          <div className="lg:col-span-9 h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02]" />
        </div>
      </div>

      {/* Row 7: Top Best SBA & Top Best BA Leaderboards Skeleton (Step 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="size-5 rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-around p-4 gap-3">
              {[1, 2, 3].map((k) => (
                <div key={k} className="w-12 rounded-t bg-[#4F6DF5]/20 dark:bg-[#4F6DF5]/10" style={{ height: `${30 + k * 20}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ManagerOverviewContent() {
  const result = await getManagerDashboardStep1Action();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load manager operations metrics</h3>
        <p className="text-xs text-rose-400 mt-1">{result.error}</p>
      </div>
    );
  }

  return <ManagerOverviewClient initialData={result.data} />;
}

export default async function ManagerOverviewPage() {
  await requireManagerSession();

  return (
    <Suspense fallback={<ManagerDashboardSkeleton />}>
      <ManagerOverviewContent />
    </Suspense>
  );
}
