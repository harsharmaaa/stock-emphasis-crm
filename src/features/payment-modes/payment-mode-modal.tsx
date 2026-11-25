"use client";

import { useState } from "react";
import { INDIAN_STATES } from "@/src/features/users/employee-form";
import { createPaymentModeAction, updatePaymentModeAction } from "./actions";
import type { PaymentModeItem } from "./types";
import { Modal, Field, Input, Select, Button } from "@/src/components/ui";

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
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Payment Mode" : "Add Payment Mode"}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Name Field */}
        <Field label="Name" required>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. YES BANK, QR INDUSIND, PAYUMONEY"
          />
        </Field>

        {/* Charges Field */}
        <Field label="Charges (%)">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={charges}
            onChange={(e) => setCharges(e.target.value)}
            placeholder="0"
          />
        </Field>

        {/* GSTIN Field */}
        <Field label="GSTIN">
          <Input
            type="text"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="e.g. 23DPNPR0615R1ZB"
            className="uppercase font-mono"
          />
        </Field>

        {/* State Field */}
        <Field label="State">
          <Select
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </Field>

        {/* Invoice Prefix Field */}
        <Field label="Invoice Prefix">
          <Input
            type="text"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
            placeholder="e.g. Inv-25-2026-"
            className="font-mono"
          />
        </Field>
      </form>
    </Modal>
  );
}

