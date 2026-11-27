"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckSquare,
  XSquare,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/src/components/ui/Toast";
import {
  getAdminApprovalPaymentsAction,
  approvePaymentAction,
  denyPaymentAction,
  batchApprovePaymentsAction,
  batchDenyPaymentsAction,
} from "./actions";
import type { AdminApprovalPaymentItem } from "./types";

interface AdminApprovePaymentsClientProps {
  initialPayments: AdminApprovalPaymentItem[];
  initialPendingCount: number;
}

export function AdminApprovePaymentsClient({
  initialPayments,
  initialPendingCount,
}: AdminApprovePaymentsClientProps) {
  const toast = useToast();

  const [payments, setPayments] = useState<AdminApprovalPaymentItem[]>(initialPayments);
  const [pendingCount, setPendingCount] = useState<number>(initialPendingCount);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");

  // Checkbox Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row comments typed by approver
  const [comments, setComments] = useState<Record<string, string>>({});

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Refresh list from server
  const fetchPayments = (overrides?: { status?: string; search?: string }) => {
    const sFilter = overrides?.status !== undefined ? overrides.status : statusFilter;
    const qSearch = overrides?.search !== undefined ? overrides.search : search;

    startTransition(async () => {
      const res = await getAdminApprovalPaymentsAction({
        status: sFilter,
        search: qSearch.trim() || undefined,
      });

      if (res.success && res.payments) {
        setPayments(res.payments);
        if (res.pendingCount !== undefined) {
          setPendingCount(res.pendingCount);
        }
        setSelectedIds(new Set());
      } else {
        toast.error("Fetch Failed", res.error || "Unable to load approval list.");
      }
    });
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedPayments.length && paginatedPayments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPayments.map((p) => p.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCommentChange = (id: string, text: string) => {
    setComments((prev) => ({ ...prev, [id]: text }));
  };

  // Single Approve
  const handleApproveSingle = async (p: AdminApprovalPaymentItem) => {
    setActionLoadingId(p.id);
    try {
      const comment = comments[p.id];
      const res = await approvePaymentAction({ paymentId: p.id, comment });
      if (res.success) {
        toast.success(
          "Payment Approved",
          `Payment for "${p.clientName}" approved. Invoice ${res.invoiceSerial || ""} generated.`
        );
        fetchPayments();
      } else {
        toast.error("Approval Failed", res.error || "Could not approve payment.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Single Deny
  const handleDenySingle = async (p: AdminApprovalPaymentItem) => {
    setActionLoadingId(p.id);
    try {
      const comment = comments[p.id];
      const res = await denyPaymentAction({ paymentId: p.id, comment });
      if (res.success) {
        toast.success("Payment Denied", `Payment for "${p.clientName}" has been rejected.`);
        fetchPayments();
      } else {
        toast.error("Denial Failed", res.error || "Could not deny payment.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Batch Approve
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selection Required", "Please select at least one payment to approve.");
      return;
    }

    setIsBatchLoading(true);
    try {
      const items = Array.from(selectedIds).map((id) => ({
        paymentId: id,
        comment: comments[id],
      }));

      const res = await batchApprovePaymentsAction(items);
      if (res.success) {
        toast.success("Batch Completed", `Successfully approved ${res.count ?? items.length} payment(s).`);
        fetchPayments();
      } else {
        toast.error("Batch Failed", res.error || "Batch approval encountered errors.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected batch error.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Batch Deny
  const handleBatchDeny = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selection Required", "Please select at least one payment to deny.");
      return;
    }

    setIsBatchLoading(true);
    try {
      const items = Array.from(selectedIds).map((id) => ({
        paymentId: id,
        comment: comments[id],
      }));

      const res = await batchDenyPaymentsAction(items);
      if (res.success) {
        toast.success("Batch Completed", `Successfully denied ${res.count ?? items.length} payment(s).`);
        fetchPayments();
      } else {
        toast.error("Batch Failed", res.error || "Batch denial encountered errors.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected batch error.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayments = payments.slice(startIndex, startIndex + pageSize);

  const isAllOnPageSelected =
    paginatedPayments.length > 0 && paginatedPayments.every((p) => selectedIds.has(p.id));

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Header Card (Matching Image 4 layout) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              Approve Payment
            </h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review client transaction receipts, verify accounts, and approve payment records to generate tax invoices.
          </p>
        </div>

        {/* Action Buttons Top Right: Approve & Deny */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={selectedIds.size === 0 || isBatchLoading}
            onClick={handleBatchApprove}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isBatchLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckSquare className="size-3.5" />
            )}
            <span>Approve {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0 || isBatchLoading}
            onClick={handleBatchDeny}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
          >
            <XSquare className="size-3.5" />
            <span>Deny {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white/70 dark:bg-[#0c1220]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchPayments();
                }
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                fetchPayments({ status: e.target.value });
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Records</option>
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="10">10 Rows</option>
              <option value="25">25 Rows</option>
              <option value="50">50 Rows</option>
            </select>

            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("PENDING");
                fetchPayments({ status: "PENDING", search: "" });
              }}
              title="Reset Filters"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Data Table (Matching Image 4 columns) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 font-semibold select-none">
                <th className="py-3 px-3 w-12 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <input
                      type="checkbox"
                      checked={isAllOnPageSelected}
                      onChange={handleToggleSelectAll}
                      className="size-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>#</span>
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[130px]">Raised By</th>
                <th className="py-3 px-3 min-w-[160px]">Client</th>
                <th className="py-3 px-3 min-w-[110px]">Pan/DOB</th>
                <th className="py-3 px-3 min-w-[90px]">Payment</th>
                <th className="py-3 px-3 min-w-[130px]">Mode</th>
                <th className="py-3 px-3 min-w-[130px]">Transaction Id</th>
                <th className="py-3 px-3 min-w-[90px]">Invoice</th>
                <th className="py-3 px-3 min-w-[140px]">Description</th>
                <th className="py-3 px-3 min-w-[160px]">Comment</th>
                <th className="py-3 px-3 min-w-[100px]">Payment Date</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {isPending ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="size-7 animate-spin text-emerald-500" />
                      <span className="text-xs font-medium">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="size-8 opacity-40" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No payments waiting for approval
                      </p>
                      <p className="text-xs text-slate-500">
                        All staff-submitted payment collections have been processed.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const isSelected = selectedIds.has(p.id);
                  const isRowLoading = actionLoadingId === p.id;
                  const rowNumber = startIndex + idx + 1;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      {/* Checkbox + # */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(p.id)}
                            className="size-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="font-mono text-slate-500">{rowNumber}</span>
                        </div>
                      </td>

                      {/* Raised By */}
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {p.raisedByName}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.clientName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {p.clientMobile}
                        </div>
                        {p.clientEmail && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {p.clientEmail}
                          </div>
                        )}
                      </td>

                      {/* Pan/DOB */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          {p.pan || "—"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {p.dob || "—"}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        ₹{p.payment.toLocaleString("en-IN")}
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3 uppercase text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {p.modeName}
                      </td>

                      {/* Transaction Id */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.transactionId || "—"}
                      </td>

                      {/* Invoice */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.invoiceNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                            {p.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 max-w-[180px] truncate text-[11px] text-slate-600 dark:text-slate-400" title={p.description || ""}>
                        {p.description || "—"}
                      </td>

                      {/* Comment Input */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Comment..."
                          value={comments[p.id] || ""}
                          onChange={(e) => handleCommentChange(p.id, e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Payment Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-[11px] text-slate-600 dark:text-slate-400">
                        {p.paymentDate}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {p.status === "Pending" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              disabled={isRowLoading}
                              onClick={() => handleApproveSingle(p)}
                              title="Approve this payment"
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                              {isRowLoading ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isRowLoading}
                              onClick={() => handleDenySingle(p)}
                              title="Deny this payment"
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              p.status === "Approved"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {p.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Matching Image 4 footer) */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {payments.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + pageSize, payments.length)} of {payments.length} entries
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`size-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  currentPage === pg
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
