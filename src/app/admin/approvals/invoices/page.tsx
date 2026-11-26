import { Suspense } from "react";
import { requireComplianceOrAdminSession } from "@/src/lib/auth-guard";
import { getAdminApprovalInvoicesAction } from "@/src/features/invoices/actions";
import { AdminApproveInvoicesClient } from "@/src/features/invoices/admin-approve-invoices-client";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Approve Invoices | Compliance & Admin",
  description: "Review, edit, approve, or deny client tax invoices and billing records.",
};

async function ApprovalInvoicesLoader() {
  await requireComplianceOrAdminSession();

  const res = await getAdminApprovalInvoicesAction({
    status: "PENDING",
    page: 1,
    pageSize: 10,
  });

  const initialInvoices = res.success && res.invoices ? res.invoices : [];
  const pendingCount = res.pendingCount ?? 0;
  const approvedCount = res.approvedCount ?? 0;
  const cancelledCount = res.cancelledCount ?? 0;
  const totalCount = res.totalCount ?? 0;

  return (
    <AdminApproveInvoicesClient
      initialInvoices={initialInvoices}
      initialPendingCount={pendingCount}
      initialApprovedCount={approvedCount}
      initialCancelledCount={cancelledCount}
      initialTotalCount={totalCount}
    />
  );
}

function ApprovalInvoicesFallback() {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
      <p className="text-xs">Loading invoice approvals queue...</p>
    </div>
  );
}

export default function AdminApproveInvoicesPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <Suspense fallback={<ApprovalInvoicesFallback />}>
        <ApprovalInvoicesLoader />
      </Suspense>
    </div>
  );
}
