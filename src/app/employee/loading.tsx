export default function EmployeeOverviewLoading() {
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

      {/* Row 4: 2 Analytical Charts (Followup & Fetch) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="size-6 rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-around p-4 gap-2">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div
                  key={k}
                  className="w-8 rounded-t bg-slate-200/60 dark:bg-white/[0.04]"
                  style={{ height: `${20 + k * 12}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 5: 2 Analytical Charts (Payment Daily & Calling) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="size-6 rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-64 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-around p-4 gap-2">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div
                  key={k}
                  className="w-8 rounded-t bg-slate-200/60 dark:bg-white/[0.04]"
                  style={{ height: `${15 + k * 14}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 6: Tabbed Reports Section (Lead Report, Lead Record, Performance Report, Monthly Sales) */}
      <div className="space-y-4 pt-2">
        {/* Tab switcher buttons skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="h-10 w-32 rounded-xl bg-[#4F6DF5]/30" />
          <div className="h-10 w-32 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
          <div className="h-10 w-44 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
          <div className="h-10 w-44 rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
        </div>

        {/* Tab content panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left filter card */}
          <div className="lg:col-span-4 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
          </div>

          {/* Right horizontal bars breakdown */}
          <div className="lg:col-span-8 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
            </div>
            <div className="space-y-3 pt-2">
              {[80, 5, 25, 45, 12, 35, 60].map((widthPct, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-3 w-28 rounded bg-slate-200/60 dark:bg-white/[0.04]" />
                  <div className="flex-1 h-3 rounded bg-slate-100 dark:bg-white/[0.02] overflow-hidden">
                    <div
                      className="h-full bg-blue-500/25 rounded"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="h-3 w-8 rounded bg-slate-200/60 dark:bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 7: Performance Vertical Bar Charts (Matches image_8803c9.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] space-y-4"
          >
            <div className="relative mb-5 flex justify-center items-center">
              <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="absolute right-0 top-0 size-4 rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-52 sm:h-56 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-end justify-center p-4">
              <div className="w-24 h-32 rounded-t bg-[#4F6DF5]/30" />
            </div>
            <div className="h-3 w-32 mx-auto rounded bg-slate-200/60 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
