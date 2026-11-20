export default function EmployeeLeadsLoading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      {/* 1. TOP CONTROLS & STATUS TABS BAR SKELETON */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-20 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30" />

          {/* Status Tabs Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
            {["All", "Unread", "Read", "Followups", "Trials", "Clients", "Disposed"].map((tab) => (
              <div
                key={tab}
                className="h-7 w-20 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        </div>

        {/* Right Action Button (Fetch/Refresh) */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <div className="h-8 w-20 rounded-xl bg-cyan-600/30" />
          <div className="h-8 w-8 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
        </div>
      </div>

      {/* 2. SEARCH & SORT BAR SKELETON */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-8 w-64 max-w-full rounded-xl bg-slate-100/70 dark:bg-slate-900/60" />
        <div className="h-8 w-20 rounded-xl bg-slate-100 dark:bg-slate-900" />
      </div>

      {/* 3. SORTING PILLS SKELETON */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-6 w-16 rounded-xl bg-slate-200/60 dark:bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-6 w-16 rounded-xl bg-slate-200/60 dark:bg-white/[0.04]" />
      </div>

      {/* 4. LEADS ROW CARDS SKELETON */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl p-5 bg-white/80 dark:bg-[#0c1220]/80 border border-slate-200/80 dark:border-white/[0.08] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-3 space-y-2">
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-36 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
            <div className="lg:col-span-3 space-y-2 flex flex-col justify-between">
              <div className="h-7 w-48 rounded-xl bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
