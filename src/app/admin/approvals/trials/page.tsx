import { Suspense } from "react";
import { requireAdminSession } from "@/src/lib/auth-guard";
import { getAdminApprovalTrialsAction } from "@/src/features/trials/actions";
import { AdminApproveTrialsClient } from "@/src/features/trials/admin-approve-trials-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Approve Free Trial | Admin Console",
  description: "Review and approve employee-submitted free trial requests.",
};

function AdminApproveLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-[#4F6DF5]" />
        <span className="text-xs font-medium">Loading pending approvals...</span>
      </div>
    </div>
  );
}

async function AdminApproveTrialsLoader() {
  await requireAdminSession();

  const res = await getAdminApprovalTrialsAction({ status: "PENDING" });
  const initialTrials = res.success && res.trials ? res.trials : [];
  const initialPendingCount = res.pendingCount ?? initialTrials.length;

  return (
    <AdminApproveTrialsClient
      initialTrials={initialTrials}
      initialPendingCount={initialPendingCount}
    />
  );
}

export default function AdminApproveTrialsPage() {
  return (
    <Suspense fallback={<AdminApproveLoadingSkeleton />}>
      <AdminApproveTrialsLoader />
    </Suspense>
  );
}
