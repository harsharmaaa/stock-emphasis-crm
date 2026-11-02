"use client";

import { useState } from "react";
import { INDIAN_STATES } from "@/src/features/users/employee-form";
import { createPaymentModeAction, updatePaymentModeAction } from "./actions";
import type { PaymentModeItem } from "./types";

interface PaymentModeModalProps {
  mode: PaymentModeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedMode: PaymentModeItem) => void;
}

export function PaymentModeModal({
  mode,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModeModalProps) {
  const isEditing = Boolean(mode);

  const [name, setName] = useState(mode?.name || "");
  const [charges, setCharges] = useState(mode ? String(mode.charges) : "");
  const [gstin, setGstin] = useState(mode?.gstin || "");
  const [state, setState] = useState(mode?.state || "");
  const [invoicePrefix, setInvoicePrefix] = useState(mode?.invoicePrefix || "Inv-");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }

    let parsedCharges = 0;
    if (charges !== "") {
      parsedCharges = parseFloat(charges);
      if (isNaN(parsedCharges) || parsedCharges < 0 || parsedCharges > 100) {
        setErrorMsg("Charges must be a valid percentage between 0 and 100.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditing && mode) {
        const res = await updatePaymentModeAction({
          id: mode.id,
          name: trimmedName,
          charges: parsedCharges,
          gstin: gstin.trim() || undefined,
          state: state || undefined,
          invoicePrefix: invoicePrefix.trim() || undefined,
        });

        if (!res.success || !res.paymentMode) {
          setErrorMsg(res.error || "Failed to update payment mode.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.paymentMode);
        onClose();
      } else {
        const res = await createPaymentModeAction({
          name: trimmedName,
          charges: parsedCharges,
          gstin: gstin.trim() || undefined,
          state: state || undefined,
          invoicePrefix: invoicePrefix.trim() || undefined,
        });

        if (!res.success || !res.paymentMode) {
          setErrorMsg(res.error || "Failed to create payment mode.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.paymentMode);
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c1220] shadow-2xl border border-slate-200/90 dark:border-white/[0.1] overflow-hidden">
        {/* Header matching legacy screenshot */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {isEditing ? "Edit Payment Mode" : "Add Payment Mode"}
          </h2>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YES BANK, QR INDUSIND, PAYUMONEY"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Charges Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Charges (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* GSTIN Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 23DPNPR0615R1ZB"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors uppercase"
            />
          </div>

          {/* State Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Prefix Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="e.g. Inv-25-2026-"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Buttons matching screenshot: Save (turquoise/green) and Close (salmon/rose) */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white shadow-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

