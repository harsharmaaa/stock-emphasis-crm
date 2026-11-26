import { Loader2 } from "lucide-react";

export default function EmployeeTrialsLoading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-36 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
        <div className="h-8 w-24 rounded-xl bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>

      {/* Filter box skeleton */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded-xl bg-slate-100/80 dark:bg-slate-900/60" />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-cyan-500" />
        <span className="text-xs font-medium">Loading free trials...</span>
      </div>
    </div>
  );
}
