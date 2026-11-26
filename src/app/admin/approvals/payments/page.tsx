import { Suspense } from "react";
import { requireComplianceOrAdminSession } from "@/src/lib/auth-guard";
import { getAdminApprovalPaymentsAction } from "@/src/features/payments/actions";
import { AdminApprovePaymentsClient } from "@/src/features/payments/admin-approve-payments-client";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Approve Payment | Admin & Compliance",
  description: "Verify client payment collections, UTR numbers, and approve billing records.",
};

function AdminApprovePaymentsLoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="h-6 w-44 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
      </div>
      <div className="rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 border border-slate-200/80 dark:border-white/[0.08] p-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[320px]">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <span className="text-xs font-medium">Loading pending payment approvals...</span>
      </div>
    </div>
  );
}

async function AdminApprovePaymentsLoader() {
  await requireComplianceOrAdminSession();

  const res = await getAdminApprovalPaymentsAction({ status: "PENDING" });
  const initialPayments = res.success && res.payments ? res.payments : [];
  const initialPendingCount = res.pendingCount ?? initialPayments.length;

  return (
    <AdminApprovePaymentsClient
      initialPayments={initialPayments}
      initialPendingCount={initialPendingCount}
    />
  );
}

export default function AdminApprovePaymentsPage() {
  return (
    <Suspense fallback={<AdminApprovePaymentsLoadingSkeleton />}>
      <AdminApprovePaymentsLoader />
    </Suspense>
  );
}
