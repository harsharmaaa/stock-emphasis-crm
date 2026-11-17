export default function AdminLeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-48 rounded-xl bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-5 w-20 rounded-full bg-violet-500/20" />
          </div>
          <div className="h-3.5 w-80 max-w-full rounded-md bg-slate-150 dark:bg-white/[0.04]" />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 rounded-xl bg-slate-200/80 dark:bg-white/[0.06]" />
          <div className="h-9 w-28 rounded-xl bg-violet-600/30" />
        </div>
      </div>

      {/* Filter Tabs & Search Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Unfollowed", "Unread", "Read", "Followups", "Trials", "Clients"].map((tab) => (
            <div
              key={tab}
              className="h-8 w-20 rounded-xl bg-slate-100 dark:bg-white/[0.05]"
            />
          ))}
        </div>

        {/* Search & Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div className="h-9 w-full sm:w-80 rounded-xl bg-slate-100 dark:bg-white/[0.05]" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
            <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
          </div>
        </div>
      </div>

      {/* Leads Table Skeleton */}
      <div className="rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
        {/* Table Header */}
        <div className="h-12 px-6 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-4">
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
          <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-white/[0.06]" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-white/[0.07]" />
                  <div className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.04]" />
                </div>
              </div>
              <div className="h-3.5 w-28 rounded bg-slate-100 dark:bg-white/[0.05]" />
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-white/[0.05]" />
              <div className="h-8 w-16 rounded-xl bg-slate-200/80 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        <div className="h-14 px-6 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-white/[0.05]" />
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
            <div className="size-8 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
}
