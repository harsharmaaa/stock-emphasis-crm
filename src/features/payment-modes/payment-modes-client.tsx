"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PaymentModeModal } from "./payment-mode-modal";
import { deletePaymentModeAction } from "./actions";
import type { PaymentModeItem } from "./types";
import {
  PageHeader,
  Card,
  Button,
  ConfirmDialog,
  EmptyState,
  useToast,
} from "@/src/components/ui";

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

  const toast = useToast();

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
    toast.success("Saved successfully", `Payment Mode "${savedMode.name}" saved successfully.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMode) return;
    setIsDeleting(true);
    try {
      const res = await deletePaymentModeAction(deletingMode.id);
      if (res.success) {
        setModes((prev) => prev.filter((m) => m.id !== deletingMode.id));
        toast.success("Deleted", `Payment Mode "${deletingMode.name}" deleted.`);
        setDeletingMode(null);
      } else {
        toast.error("Delete failed", res.error || "Failed to delete payment mode.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="PAYMENT MODES"
        description="Manage authorized financial transaction methods, gateway surcharges, and state GSTIN configs."
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={handleOpenAdd}
            >
              Add
            </Button>

            <Link href="/admin/settings/configuration">
              <Button
                variant="danger"
                size="sm"
              >
                <ArrowLeft className="size-3.5" />
                Go Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* Table Container */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20">
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground w-12 text-center">
                  #
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Name
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Charges (%)
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  GSTIN
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  State
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Invoice Prefix
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground text-right pr-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {modes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      icon="Receipt"
                      title="No payment modes configured"
                      description='Click the "Add" button above to create one.'
                    />
                  </td>
                </tr>
              ) : (
                modes.map((mode, index) => (
                  <tr
                    key={mode.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground text-center">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                      {mode.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      {mode.charges}%
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-muted-foreground">
                      {mode.gstin || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      {mode.state || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-muted-foreground">
                      {mode.invoicePrefix || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-auto text-emerald-600 dark:text-emerald-400"
                          onClick={() => handleOpenEdit(mode)}
                          title="Edit Payment Mode"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-auto text-rose-600 dark:text-rose-400"
                          onClick={() => setDeletingMode(mode)}
                          title="Delete Payment Mode"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border/70 text-center text-[11px] text-muted-foreground">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <PaymentModeModal
          mode={editingMode}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingMode)}
        onClose={() => setDeletingMode(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment Mode"
        description={
          deletingMode ? (
            <span>
              You are about to delete <strong className="text-foreground">{deletingMode.name}</strong>. This action cannot be undone.
            </span>
          ) : undefined
        }
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        loading={isDeleting}
      />
    </div>
  );
}

