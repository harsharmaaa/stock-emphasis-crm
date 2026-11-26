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
  Edit3,
  Eye,
} from "lucide-react";
import { useToast } from "@/src/components/ui/Toast";
import type { AdminApprovalInvoiceItem } from "./actions";
import {
  getAdminApprovalInvoicesAction,
  approveInvoiceAction,
  rejectInvoiceAction,
  batchApproveInvoicesAction,
  batchRejectInvoicesAction,
} from "./actions";
import { ViewInvoiceModal } from "./view-invoice-modal";
import { EditInvoiceModal } from "./edit-invoice-modal";

interface AdminApproveInvoicesClientProps {
  initialInvoices: AdminApprovalInvoiceItem[];
  initialPendingCount: number;
  initialApprovedCount: number;
  initialCancelledCount: number;
  initialTotalCount: number;
}

export function AdminApproveInvoicesClient({
  initialInvoices,
  initialPendingCount,
  initialApprovedCount,
  initialCancelledCount,
  initialTotalCount,
}: AdminApproveInvoicesClientProps) {
  const toast = useToast();

  const [invoices, setInvoices] = useState<AdminApprovalInvoiceItem[]>(initialInvoices);
  const [pendingCount, setPendingCount] = useState<number>(initialPendingCount);
  const [approvedCount, setApprovedCount] = useState<number>(initialApprovedCount);
  const [cancelledCount, setCancelledCount] = useState<number>(initialCancelledCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");

  // Checkbox Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row comments / reasons typed by approver
  const [comments, setComments] = useState<Record<string, string>>({});

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal states
  const [viewingInvoice, setViewingInvoice] = useState<AdminApprovalInvoiceItem | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<AdminApprovalInvoiceItem | null>(null);

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Refresh list from server
  const fetchInvoices = (overrides?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const sFilter = overrides?.status !== undefined ? overrides.status : statusFilter;
    const qSearch = overrides?.search !== undefined ? overrides.search : search;
    const pPage = overrides?.page !== undefined ? overrides.page : currentPage;
    const pPageSize = overrides?.pageSize !== undefined ? overrides.pageSize : pageSize;

    startTransition(async () => {
      const res = await getAdminApprovalInvoicesAction({
        status: sFilter,
        search: qSearch.trim() || undefined,
        page: pPage,
        pageSize: pPageSize,
      });

      if (res.success && res.invoices) {
        setInvoices(res.invoices);
        if (res.pendingCount !== undefined) setPendingCount(res.pendingCount);
        if (res.approvedCount !== undefined) setApprovedCount(res.approvedCount);
        if (res.cancelledCount !== undefined) setCancelledCount(res.cancelledCount);
        if (res.totalCount !== undefined) setTotalCount(res.totalCount);
        setSelectedIds(new Set());
      } else {
        toast.error("Fetch Failed", res.error || "Unable to load approval list.");
      }
    });
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((inv) => inv.id)));
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
  const handleApproveSingle = async (inv: AdminApprovalInvoiceItem) => {
    setActionLoadingId(inv.id);
    try {
      const comment = comments[inv.id];
      const res = await approveInvoiceAction({ invoiceId: inv.id, comment });
      if (res.success) {
        toast.success(
          "Invoice Approved",
          `Invoice "${inv.serialNo}" for ${inv.clientName} approved.`
        );
        fetchInvoices();
      } else {
        toast.error("Approval Failed", res.error || "Could not approve invoice.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Single Reject / Cancel
  const handleRejectSingle = async (inv: AdminApprovalInvoiceItem) => {
    setActionLoadingId(inv.id);
    try {
      const reason = comments[inv.id];
      const res = await rejectInvoiceAction({ invoiceId: inv.id, reason });
      if (res.success) {
        toast.warning(
          "Invoice Cancelled",
          `Invoice "${inv.serialNo}" has been cancelled.`
        );
        fetchInvoices();
      } else {
        toast.error("Denial Failed", res.error || "Could not cancel invoice.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Batch Approve
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);
    try {
      const items = Array.from(selectedIds).map((id) => ({
        invoiceId: id,
        comment: comments[id],
      }));
      const res = await batchApproveInvoicesAction(items);
      if (res.success) {
        toast.success("Batch Approved", `Successfully approved ${res.count ?? items.length} invoice(s).`);
        fetchInvoices();
      } else {
        toast.error("Batch Failed", res.error || "Failed to approve selected invoices.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Batch Reject
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);
    try {
      const items = Array.from(selectedIds).map((id) => ({
        invoiceId: id,
        reason: comments[id],
      }));
      const res = await batchRejectInvoicesAction(items);
      if (res.success) {
        toast.warning("Batch Cancelled", `Successfully cancelled ${res.count ?? items.length} invoice(s).`);
        fetchInvoices();
      } else {
        toast.error("Batch Failed", res.error || "Failed to cancel selected invoices.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Approved
        </span>
      );
    }
    if (s === "CANCELLED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Pending
      </span>
    );
  };

  // Pagination slice
  const paginatedInvoices = invoices;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const isAllSelected =
    paginatedInvoices.length > 0 && selectedIds.size === paginatedInvoices.length;

  return (
    <div className="space-y-4">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            APPROVE INVOICE
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compliance Officer & Admin verification queue for client tax invoices and billing records.
          </p>
        </div>

        {/* Action Buttons: Batch Approve / Deny */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBatchApprove}
            disabled={selectedIds.size === 0 || isBatchLoading || isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
          >
            {isBatchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            Approve {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>

          <button
            type="button"
            onClick={handleBatchReject}
            disabled={selectedIds.size === 0 || isBatchLoading || isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
          >
            {isBatchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XSquare className="w-3.5 h-3.5" />}
            Deny {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      </div>

      {/* Filter / Status Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("PENDING");
                setCurrentPage(1);
                fetchInvoices({ status: "PENDING", page: 1 });
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "PENDING"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("APPROVED");
                setCurrentPage(1);
                fetchInvoices({ status: "APPROVED", page: 1 });
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "APPROVED"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("CANCELLED");
                setCurrentPage(1);
                fetchInvoices({ status: "CANCELLED", page: 1 });
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "CANCELLED"
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
                fetchInvoices({ status: "ALL", page: 1 });
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "ALL"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Invoices
            </button>
          </div>

          {/* Search + Page Size */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice, client, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchInvoices({ search, page: 1 });
                  }
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchInvoices({ search: "" });
              }}
              title="Reset Search"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setPageSize(nextSize);
                setCurrentPage(1);
                fetchInvoices({ pageSize: nextSize, page: 1 });
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 Rows</option>
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
            </select>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Select All ({paginatedInvoices.length} on this page)</span>
          </label>

          {selectedIds.size > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {selectedIds.size} invoice(s) selected
            </span>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8">#</th>
                <th className="py-3 px-3 w-10">Select</th>
                <th className="py-3 px-3">Invoice / Date</th>
                <th className="py-3 px-3">Raised By</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Pan / DOB</th>
                <th className="py-3 px-3">Service Package</th>
                <th className="py-3 px-3">Plan / Validity</th>
                <th className="py-3 px-3 text-right">Taxable Base</th>
                <th className="py-3 px-3 text-right">IGST (18%)</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Approver Comment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isPending && invoices.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading approval queue...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No invoices found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, index) => {
                  const isSelected = selectedIds.has(inv.id);
                  const isRowLoading = actionLoadingId === inv.id;
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      {/* Row # */}
                      <td className="py-3 px-3 font-mono text-slate-400">{rowNumber}</td>

                      {/* Select Checkbox */}
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(inv.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Invoice Serial & Date */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          {inv.serialNo}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.invoiceDate}
                        </div>
                      </td>

                      {/* Raised By */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {inv.createdByName}
                        </div>
                        {inv.teamName && (
                          <div className="text-[11px] text-slate-400">
                            {inv.teamName}
                          </div>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {inv.clientName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {inv.clientMobile}
                        </div>
                        {inv.clientEmail && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {inv.clientEmail}
                          </div>
                        )}
                      </td>

                      {/* Pan / DOB */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {inv.pan || "N/A"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {inv.dob || "N/A"}
                        </div>
                      </td>

                      {/* Service Package */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {inv.productName}
                        </div>
                      </td>

                      {/* Plan / Validity */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                          {inv.planType} ({inv.durationLabel})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.startDate && inv.endDate ? `${inv.startDate} - ${inv.endDate}` : "Validity Pending"}
                        </div>
                      </td>

                      {/* Taxable Base */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        ₹{inv.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* IGST (18%) */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        ₹{inv.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {renderStatusBadge(inv.status)}
                      </td>

                      {/* Comment Input */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Add comment..."
                          value={comments[inv.id] || ""}
                          onChange={(e) => handleCommentChange(inv.id, e.target.value)}
                          className="w-36 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Tax Invoice */}
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            title="View Tax Invoice & Timeline"
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Invoice */}
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            title="Edit Invoice Fields"
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Approve Button */}
                          {inv.status !== "Approved" && (
                            <button
                              type="button"
                              onClick={() => handleApproveSingle(inv)}
                              disabled={isRowLoading || isBatchLoading}
                              title="Approve Invoice"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-all shadow-xs disabled:opacity-40 flex items-center gap-1"
                            >
                              {isRowLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </button>
                          )}

                          {/* Reject / Cancel Button */}
                          {inv.status !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleRejectSingle(inv)}
                              disabled={isRowLoading || isBatchLoading}
                              title="Cancel / Deny Invoice"
                              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold transition-all shadow-xs disabled:opacity-40 flex items-center gap-1"
                            >
                              {isRowLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Deny"
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing {invoices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                setCurrentPage(prev);
                fetchInvoices({ page: prev });
              }}
              disabled={currentPage <= 1 || isPending}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono font-medium">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                const next = Math.min(totalPages, currentPage + 1);
                setCurrentPage(next);
                fetchInvoices({ page: next });
              }}
              disabled={currentPage >= totalPages || isPending}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Tax Invoice & Timeline Modal */}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={{
            id: viewingInvoice.id,
            serialNo: viewingInvoice.serialNo,
            clientName: viewingInvoice.clientName,
            clientMobile: viewingInvoice.clientMobile,
            clientEmail: viewingInvoice.clientEmail,
            pan: viewingInvoice.pan,
            dob: viewingInvoice.dob,
            productName: viewingInvoice.productName,
            planType: viewingInvoice.planType,
            durationLabel: viewingInvoice.durationLabel,
            startDate: viewingInvoice.startDate,
            endDate: viewingInvoice.endDate,
            invoiceDate: viewingInvoice.invoiceDate,
            baseAmount: viewingInvoice.baseAmount,
            gstAmount: viewingInvoice.gstAmount,
            totalAmount: viewingInvoice.totalAmount,
            status: viewingInvoice.status,
            mailStatus: viewingInvoice.mailStatus,
            createdByName: viewingInvoice.createdByName,
            assignedToName: viewingInvoice.assignedToName,
            teamName: viewingInvoice.teamName,
          }}
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          isOpen={Boolean(editingInvoice)}
          onClose={() => setEditingInvoice(null)}
          onSuccess={() => {
            fetchInvoices();
            toast.success("Invoice Updated", `Invoice "${editingInvoice.serialNo}" updated successfully.`);
          }}
        />
      )}
    </div>
  );
}
