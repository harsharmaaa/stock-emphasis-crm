export default function ManagerLeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. TOP CONTROLS & STATUS TABS BAR SKELETON */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Action Buttons & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-20 rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-600/30" />

          {/* Status Tabs Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            {["All", "Unread", "Read", "Followups", "Trials", "Clients"].map((tab) => (
              <div
                key={tab}
                className="h-7 w-20 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        </div>

        {/* Right Action Button (Fetch/Refresh) */}
        <div className="h-8 w-20 rounded-xl bg-white/80 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] shrink-0 self-end lg:self-center" />
      </div>

      {/* 2. SEARCH & SORT BAR SKELETON */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="h-8 w-64 max-w-full rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08]" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
          <div className="h-7 w-20 rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
        </div>
      </div>

      {/* 3. MANAGER LEADS TABLE SKELETON */}
      <div className="rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
        {/* Table Header */}
        <div className="h-11 px-6 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-4">
          <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-16 rounded bg-slate-200 dark:bg-white/[0.06]" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} className="px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/[0.07]" />
              </div>
              <div className="space-y-1">
                <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-white/[0.07]" />
                <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-white/[0.04]" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-white/[0.05]" />
              <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-white/[0.05]" />
              <div className="flex items-center gap-1.5">
                <div className="size-7 rounded-lg bg-slate-200/80 dark:bg-white/[0.06]" />
                <div className="size-7 rounded-lg bg-slate-200/80 dark:bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        <div className="h-12 px-6 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-white/[0.05]" />
          <div className="flex items-center gap-1.5">
            <div className="size-7 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
            <div className="size-7 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
}
