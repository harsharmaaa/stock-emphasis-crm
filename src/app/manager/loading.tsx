export default function ManagerOverviewLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome & Announcement Banner Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-xl">
          <div className="space-y-2 max-w-xl">
            <div className="h-4 w-32 rounded-full bg-blue-500/20" />
            <div className="h-7 w-60 rounded-xl bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-3.5 w-80 max-w-full rounded-md bg-slate-100 dark:bg-white/[0.04]" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="h-9 w-28 rounded-xl bg-blue-600/30" />
            <div className="h-9 w-28 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
          </div>
        </div>

        {/* Announcement banner placeholder */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
          <div className="size-4 rounded bg-indigo-500/30 shrink-0" />
          <div className="h-4 w-72 rounded bg-indigo-500/20" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-7 w-14 rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20" />
          </div>
        ))}
      </div>

      {/* Main Content Grid: Teams & Subordinate Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Teams Led */}
        <div className="p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.07]" />
            <div className="h-3.5 w-16 rounded bg-blue-500/20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((t) => (
              <div
                key={t}
                className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.07]" />
                  <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                </div>
                <div className="h-3 w-48 rounded bg-slate-100 dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Team Activity */}
        <div className="p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.07]" />
            <div className="h-3.5 w-16 rounded bg-blue-500/20" />
          </div>
          <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
            {[1, 2, 3, 4].map((act) => (
              <div key={act} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-white/[0.07]" />
                  <div className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.04]" />
                </div>
                <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
