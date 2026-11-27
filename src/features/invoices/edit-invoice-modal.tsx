"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Edit3,
  Calendar,
  Layers,
  IndianRupee,
  AlertCircle,
  Save,
  Sparkles,
} from "lucide-react";
import type { AdminApprovalInvoiceItem } from "./types";
import {
  updateInvoiceAction,
  getInvoiceProductsAction,
} from "./actions";
import { getLeadServiceRenewalAction } from "@/src/features/payments/actions";

interface EditInvoiceModalProps {
  invoice: AdminApprovalInvoiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: EditInvoiceModalProps) {
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [planType, setPlanType] = useState("Monthly");
  const [durationLabel, setDurationLabel] = useState("30 Days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [gstType, setGstType] = useState<"CGST_SGST" | "IGST">("CGST_SGST");
  const [notes, setNotes] = useState("");
  const [renewalHint, setRenewalHint] = useState<string | null>(null);

  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load available products for dropdown
  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      const res = await getInvoiceProductsAction();
      if (isMounted && res.success && res.products) {
        setAvailableProducts(res.products);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize fields on open
  useEffect(() => {
    if (!invoice || !isOpen) return;

    const timer = setTimeout(() => {
      setProductName(invoice.productName || "");
      setProductId(invoice.productId || undefined);
      setPlanType(invoice.planType || "Monthly");
      setDurationLabel(invoice.durationLabel || "30 Days");
      setStartDate(invoice.startDate || "");
      setEndDate(invoice.endDate || "");
      setTotalAmount(invoice.totalAmount || 0);

      // Auto-detect GST scheme from client's state or GSTIN prefix (23 for Madhya Pradesh)
      const stateStr = (invoice.clientState || "").toLowerCase();
      const isMP =
        stateStr.includes("madhya") ||
        stateStr === "mp" ||
        invoice.clientGstin?.startsWith("23");
      setGstType(isMP ? "CGST_SGST" : "IGST");

      setNotes(invoice.latestNote || "");
      setRenewalHint(null);
      setError(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  // 18% Inclusive GST calculations with CGST/SGST vs IGST split
  const baseAmount = totalAmount > 0 ? Math.round(((totalAmount * 100) / 118) * 100) / 100 : 0;
  const totalGst = totalAmount > 0 ? Math.round((totalAmount - baseAmount) * 100) / 100 : 0;
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;

  const handleProductSelect = (id: string) => {
    if (id === "custom") {
      setProductId(undefined);
      return;
    }
    const found = availableProducts.find((p) => p.id === id);
    if (found) {
      setProductId(found.id);
      setProductName(found.name);
    }
  };

  const handleDurationPreset = (days: number, label: string) => {
    setDurationLabel(label);
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, "0");
        const dd = String(end.getDate()).padStart(2, "0");
        setEndDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  // Smart auto-next start date from previous service plan (+1 day)
  const handleAutoNextStartDate = async () => {
    if (!invoice?.leadId) return;
    const res = await getLeadServiceRenewalAction({
      leadId: invoice.leadId,
      productId,
    });
    if (res.success && res.recommendedStartDate) {
      setStartDate(res.recommendedStartDate);
      setRenewalHint(res.hint || "Auto-set after previous plan (+1 Day)");

      // Adjust endDate accordingly
      let days = 30;
      if (durationLabel.includes("90") || planType.includes("Quarterly")) days = 90;
      else if (durationLabel.includes("60")) days = 60;
      else if (durationLabel.includes("180") || planType.includes("Half")) days = 180;
      else if (durationLabel.includes("365") || planType.includes("Year")) days = 365;

      const start = new Date(res.recommendedStartDate);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, "0");
        const dd = String(end.getDate()).padStart(2, "0");
        setEndDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalAmount <= 0) {
      setError("Total Amount must be greater than zero.");
      return;
    }

    startTransition(async () => {
      const res = await updateInvoiceAction({
        invoiceId: invoice.id,
        productName,
        productId,
        planType,
        durationLabel,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalAmount,
        gstType,
        notes: notes || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to update invoice.");
        return;
      }

      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Invoice Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoice: <strong className="font-mono text-blue-600 dark:text-blue-400">{invoice.serialNo}</strong> • Client: {invoice.clientName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Product Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Service / Product Name
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={productId || "custom"}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="custom">-- Custom Product Name --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product Name"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Plan Type & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Plan Type
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
                <option value="Special">Special / Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Duration Label
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  placeholder="e.g. 30 Days"
                  required
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(30, "30 Days")}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(60, "60 Days")}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  60D
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(90, "90 Days")}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  90D
                </button>
              </div>
            </div>
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Service Start Date
                </label>
                <button
                  type="button"
                  onClick={handleAutoNextStartDate}
                  title="Auto-set next service start date based on previous plan (+1 Day)"
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Auto-next (+1D)
                </button>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRenewalHint(null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {renewalHint && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">
                  ℹ️ {renewalHint}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Service End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* GST Scheme Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Taxation Scheme / GST Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGstType("CGST_SGST")}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  gstType === "CGST_SGST"
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                CGST 9% + SGST 9% (Intra-state MP)
              </button>
              <button
                type="button"
                onClick={() => setGstType("IGST")}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  gstType === "IGST"
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                IGST 18% (Inter-state)
              </button>
            </div>
          </div>

          {/* Amount and Live 18% GST Recalculation */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
              Total Amount Paid (Inclusive of 18% GST)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Live Calculation Pill with CGST+SGST vs IGST */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Calculated Base Amount (118 Rule):</span>
                <span className="font-mono font-medium">₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              {gstType === "CGST_SGST" ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>CGST (9%):</span>
                    <span className="font-mono font-medium">₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>SGST (9%):</span>
                    <span className="font-mono font-medium">₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>IGST (18%):</span>
                  <span className="font-mono font-medium">₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                <span>Total Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Comment / Description (Remarks) for Edit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Comment / Description (Remarks)</span>
              <span className="text-[10px] text-slate-400 font-normal">Visible in Invoice Summary & Timeline</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record administrative or compliance notes/reason for this modification..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
