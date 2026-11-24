import { Card } from "@/src/components/ui/Card";
import { Skeleton } from "@/src/components/ui/Skeleton";

export default function AdminLeadsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Leads Directory">
      {/* Top Header Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton w="180px" h={28} className="rounded-xl" />
            <Skeleton w="64px" h={20} className="rounded-full" />
          </div>
          <Skeleton w="320px" h={14} className="rounded-md" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton w="84px" h={36} className="rounded-xl" />
          <Skeleton w="84px" h={36} className="rounded-xl" />
        </div>
      </div>

      {/* Filter Tabs & Search Bar Skeleton */}
      <Card className="p-4 space-y-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {["All", "Unfollowed", "Unread", "Read", "Followups", "Trials", "Clients", "Disposed"].map((tab) => (
            <Skeleton key={tab} w="80px" h={32} className="rounded-xl shrink-0" />
          ))}
        </div>

        {/* Search Bar Skeleton */}
        <div className="flex gap-2">
          <Skeleton w="100%" h={36} className="rounded-xl flex-1" />
          <Skeleton w="84px" h={36} className="rounded-xl shrink-0" />
        </div>
      </Card>

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between px-1">
        <Skeleton w="140px" h={20} className="rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton w="90px" h={30} className="rounded-xl" />
          <Skeleton w="80px" h={30} className="rounded-xl" />
          <Skeleton w="76px" h={30} className="rounded-xl" />
        </div>
      </div>

      {/* Leads Horizontal Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((row) => (
          <Card key={row} className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
              {/* Left section */}
              <div className="lg:col-span-4 space-y-2.5 lg:border-r border-[var(--border)] lg:pr-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton w="16px" h={16} className="rounded" />
                    <Skeleton w="80px" h={18} className="rounded-md" />
                  </div>
                  <Skeleton w="90px" h={14} className="rounded-md" />
                </div>
                <Skeleton w="140px" h={20} className="rounded-md" />
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton w="50px" h={12} className="rounded" />
                  <Skeleton w="100px" h={16} className="rounded-full" />
                </div>
              </div>

              {/* Middle section */}
              <div className="lg:col-span-4 space-y-2 lg:border-r border-[var(--border)] lg:pr-4">
                <Skeleton w="90px" h={14} className="rounded-md" />
                <div className="space-y-2">
                  <Skeleton w="160px" h={14} className="rounded-md" />
                  <Skeleton w="130px" h={14} className="rounded-md" />
                  <Skeleton w="180px" h={14} className="rounded-md" />
                  <Skeleton w="120px" h={14} className="rounded-md" />
                </div>
              </div>

              {/* Right section */}
              <div className="lg:col-span-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton w="70px" h={20} className="rounded-full" />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((btn) => (
                      <Skeleton key={btn} w="28px" h={28} className="rounded-lg" />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton w="140px" h={14} className="rounded-md" />
                  <Skeleton w="200px" h={14} className="rounded-md" />
                  <Skeleton w="130px" h={14} className="rounded-md" />
                  <Skeleton w="110px" h={14} className="rounded-md" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination Footer Skeleton */}
      <Card className="p-3.5 flex items-center justify-between text-xs">
        <Skeleton w="140px" h={16} className="rounded-md" />
        <div className="flex items-center gap-1.5">
          <Skeleton w="32px" h={32} className="rounded-lg" />
          <Skeleton w="32px" h={32} className="rounded-lg" />
        </div>
      </Card>
    </div>
  );
}
