import { Card, Skeleton } from "@/src/components/ui";

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading dashboard...">
      {/* Top Banner Skeleton */}
      <Card className="p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <Skeleton w={140} h={24} className="rounded-full" />
          <Skeleton w={260} h={32} className="rounded-xl" />
          <Skeleton w={380} h={16} className="rounded-lg" />
        </div>
        <Skeleton w={128} h={40} className="rounded-xl shrink-0" />
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton w={96} h={14} />
              <Skeleton w={36} h={36} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton w={80} h={32} className="rounded-lg" />
              <Skeleton w={110} h={14} />
            </div>
          </Card>
        ))}
      </div>

      {/* Two-Column Grid: Recent Accounts & System Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Accounts Table Skeleton */}
        <Card className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="space-y-1">
              <Skeleton w={180} h={16} />
              <Skeleton w={260} h={12} />
            </div>
            <Skeleton w={64} h={16} />
          </div>

          <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton w={36} h={36} className="rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton w={128} h={14} />
                    <Skeleton w={176} h={12} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton w={64} h={20} className="rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column (1 span): System Cards Skeleton */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton w={128} h={16} />
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} w="100%" h={40} className="rounded-xl" />
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <Skeleton w={160} h={16} />
            <Skeleton w="100%" h={14} />
            <Skeleton w="80%" h={14} />
          </Card>
        </div>
      </div>
    </div>
  );
}
