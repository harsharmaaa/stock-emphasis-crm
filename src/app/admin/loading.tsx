export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 dark:bg-[#0c1224]/80 backdrop-blur-2xl border border-violet-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="h-6 w-36 rounded-full bg-violet-500/20" />
          <div className="h-8 w-64 rounded-xl bg-slate-700/50 dark:bg-white/[0.08]" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-700/40 dark:bg-white/[0.05]" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-violet-600/30 shrink-0" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-md bg-slate-200 dark:bg-white/[0.06]" />
              <div className="size-9 rounded-xl bg-slate-100 dark:bg-white/[0.05]" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-28 rounded-md bg-slate-100 dark:bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>

      {/* Two-Column Grid: Recent Accounts & System Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Accounts Table Skeleton */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="space-y-1">
              <div className="h-4 w-44 rounded-md bg-slate-200 dark:bg-white/[0.07]" />
              <div className="h-3 w-64 rounded-md bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-4 w-16 rounded-md bg-slate-200 dark:bg-white/[0.06]" />
          </div>

          <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 rounded-md bg-slate-200 dark:bg-white/[0.07]" />
                    <div className="h-3 w-44 rounded-md bg-slate-100 dark:bg-white/[0.04]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                  <div className="size-2 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 span): System Cards Skeleton */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
            <div className="h-4 w-32 rounded-md bg-slate-200 dark:bg-white/[0.07]" />
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-10 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]"
                />
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-violet-50/50 dark:bg-[#0c1322]/80 backdrop-blur-xl border border-violet-500/20 shadow-xl space-y-3">
            <div className="h-4 w-40 rounded-md bg-violet-500/20" />
            <div className="h-3 w-full rounded-md bg-slate-200 dark:bg-white/[0.05]" />
            <div className="h-3 w-4/5 rounded-md bg-slate-200 dark:bg-white/[0.05]" />
          </div>
        </div>
      </div>
    </div>
  );
}
