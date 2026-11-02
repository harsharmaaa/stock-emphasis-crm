"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, ArrowLeft, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PaymentModeModal } from "./payment-mode-modal";
import { deletePaymentModeAction } from "./actions";
import type { PaymentModeItem } from "./types";

interface PaymentModesClientProps {
  initialModes: PaymentModeItem[];
}

export function PaymentModesClient({ initialModes }: PaymentModesClientProps) {
  const [modes, setModes] = useState<PaymentModeItem[]>(initialModes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<PaymentModeItem | null>(null);

  // Delete State
  const [deletingMode, setDeletingMode] = useState<PaymentModeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingMode(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mode: PaymentModeItem) => {
    setEditingMode(mode);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (savedMode: PaymentModeItem) => {
    setModes((prev) => {
      const idx = prev.findIndex((m) => m.id === savedMode.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedMode;
        return next;
      }
      return [savedMode, ...prev];
    });
    showToast("success", `Payment Mode "${savedMode.name}" saved successfully.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMode) return;
    setIsDeleting(true);
    try {
      const res = await deletePaymentModeAction(deletingMode.id);
      if (res.success) {
        setModes((prev) => prev.filter((m) => m.id !== deletingMode.id));
        showToast("success", `Payment Mode "${deletingMode.name}" deleted.`);
        setDeletingMode(null);
      } else {
        showToast("error", res.error || "Failed to delete payment mode.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast("error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-18 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar matching screenshot */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
            PAYMENT MODES
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage authorized financial transaction methods, gateway surcharges, and state GSTIN configs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Add Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </button>

          {/* Go Back to Configuration Landing Page */}
          <Link
            href="/admin/settings/configuration"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </Link>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 w-12 text-center">
                  #
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Name
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Charges (%)
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  GSTIN
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  State
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Invoice Prefix
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 text-right pr-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {modes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <CreditCard className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No payment modes configured yet.</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Click the &quot;Add&quot; button above to create one.
                    </p>
                  </td>
                </tr>
              ) : (
                modes.map((mode, index) => (
                  <tr
                    key={mode.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-white">
                      {mode.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {mode.charges}%
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                      {mode.gstin || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {mode.state || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                      {mode.invoicePrefix || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(mode)}
                          className="p-1.5 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Edit Payment Mode"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMode(mode)}
                          className="p-1.5 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Payment Mode"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info matching screenshot */}
        <div className="p-4 border-t border-slate-200/70 dark:border-white/[0.06] text-center text-[11px] text-slate-400 dark:text-slate-500">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <PaymentModeModal
          mode={editingMode}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1220] p-6 shadow-2xl border border-slate-200 dark:border-white/[0.1] space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-10 rounded-full bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Payment Mode</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to proceed?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              You are about to delete <span className="font-semibold text-slate-900 dark:text-white">{deletingMode.name}</span>. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMode(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

