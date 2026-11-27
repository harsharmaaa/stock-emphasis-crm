"use client";

import { useState, useEffect, useId } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  CreditCard,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/src/components/ui/Toast";
import {
  getPaymentFormOptionsAction,
  createPaymentAction,
  getLeadPaymentsAction,
  getLeadServiceRenewalAction,
} from "./actions";
import type {
  PaymentFormProduct,
  PaymentFormMode,
  LeadPaymentViewItem,
} from "./types";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    mobile: string;
    status?: string;
    state?: string | null;
    gstin?: string | null;
  } | null;
  onSuccess?: () => void;
}

interface ProductItemRow {
  id: string;
  productId: string;
  pack: string;
  serviceRate: number;
  discount: number;
  adjustment: number;
  paid: number;
  fromDate: string;
}

const getTodayString = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function AddPaymentModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: AddPaymentModalProps) {
  const toast = useToast();
  const titleId = useId();

  const [products, setProducts] = useState<PaymentFormProduct[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentFormMode[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Top header inputs
  const [paymentModeId, setPaymentModeId] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [transactionId, setTransactionId] = useState("");
  const [description, setDescription] = useState("");

  // Product items table rows
  const [items, setItems] = useState<ProductItemRow[]>([
    {
      id: "row-1",
      productId: "",
      pack: "Monthly",
      serviceRate: 0,
      discount: 0,
      adjustment: 0,
      paid: 0,
      fromDate: getTodayString(),
    },
  ]);

  const [renewalHint, setRenewalHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoadingOptions(true);
      setOptionsError(null);
      setRenewalHint(null);

      // Reset fields
      setPaymentDate(getTodayString());
      setTransactionId("");
      setDescription("");
      setItems([
        {
          id: "row-1",
          productId: "",
          pack: "Monthly",
          serviceRate: 0,
          discount: 0,
          adjustment: 0,
          paid: 0,
          fromDate: getTodayString(),
        },
      ]);

      // Smart check for previous service plan ending
      if (lead?.id) {
        getLeadServiceRenewalAction({ leadId: lead.id })
          .then((renRes) => {
            if (cancelled) return;
            if (renRes.success && renRes.recommendedStartDate && renRes.hint) {
              const nextDate = renRes.recommendedStartDate;
              setRenewalHint(renRes.hint);
              setItems((prev) =>
                prev.map((row, i) =>
                  i === 0 ? { ...row, fromDate: nextDate } : row
                )
              );
            }
          })
          .catch(() => { });
      }

      getPaymentFormOptionsAction()
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.products && res.paymentModes) {
            setProducts(res.products);
            setPaymentModes(res.paymentModes);
            if (res.paymentModes.length > 0) {
              setPaymentModeId(res.paymentModes[0].id);
            }
          } else {
            setOptionsError(res.error || "Failed to load options.");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setOptionsError(err instanceof Error ? err.message : "Error loading options.");
        })
        .finally(() => {
          if (!cancelled) setIsLoadingOptions(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  // Helper to get pack price from product
  const getPackPrice = (prod: PaymentFormProduct | undefined, pack: string): number => {
    if (!prod) return 0;
    if (pack === "Monthly") return prod.monthlyPrice ?? 0;
    if (pack === "Quarterly") return prod.quarterlyPrice ?? 0;
    if (pack === "Half-Yearly") return prod.halfYearlyPrice ?? 0;
    if (pack === "Yearly") return prod.yearlyPrice ?? 0;
    return prod.monthlyPrice ?? 0;
  };

  const handleProductChange = (rowId: string, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const rate = getPackPrice(selectedProd, row.pack);
        const paid = Math.max(0, rate - row.discount - row.adjustment);
        return {
          ...row,
          productId: newProductId,
          serviceRate: rate,
          paid,
        };
      })
    );

    // If changing the primary product on the first row, re-check previous service renewal date
    if (lead?.id && (rowId === items[0]?.id || items.findIndex((r) => r.id === rowId) === 0)) {
      getLeadServiceRenewalAction({ leadId: lead.id, productId: newProductId })
        .then((renRes) => {
          if (renRes.success && renRes.recommendedStartDate && renRes.hint) {
            const nextDate = renRes.recommendedStartDate;
            setRenewalHint(renRes.hint);
            setItems((prev) =>
              prev.map((r) => (r.id === rowId ? { ...r, fromDate: nextDate } : r))
            );
          }
        })
        .catch(() => { });
    }
  };

  const handlePackChange = (rowId: string, newPack: string) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const selectedProd = products.find((p) => p.id === row.productId);
        const rate = getPackPrice(selectedProd, newPack);
        const paid = Math.max(0, rate - row.discount - row.adjustment);
        return {
          ...row,
          pack: newPack,
          serviceRate: rate,
          paid,
        };
      })
    );
  };

  const handleNumberFieldChange = (
    rowId: string,
    field: "discount" | "adjustment" | "paid" | "serviceRate",
    value: string
  ) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated = { ...row, [field]: num };
        if (field === "discount" || field === "adjustment" || field === "serviceRate") {
          updated.paid = Math.max(
            0,
            updated.serviceRate - updated.discount - updated.adjustment
          );
        }
        return updated;
      })
    );
  };

  const handleFromDateChange = (rowId: string, value: string) => {
    if (rowId === items[0]?.id) {
      setRenewalHint(null);
    }
    setItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, fromDate: value } : row))
    );
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: products[0]?.id || "",
        pack: "Monthly",
        serviceRate: getPackPrice(products[0], "Monthly"),
        discount: 0,
        adjustment: 0,
        paid: getPackPrice(products[0], "Monthly"),
        fromDate: getTodayString(),
      },
    ]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // 118 rule GST calculation
  const totalPaid = items.reduce((sum, item) => sum + (Number(item.paid) || 0), 0);
  const baseAmount = Math.round(((totalPaid * 100) / 118) * 100) / 100;
  const gstAmount = Math.round((totalPaid - baseAmount) * 100) / 100;

  // Intra-state MP split (CGST 9% + SGST 9%) vs Inter-state IGST 18%
  const isMPLead =
    (lead?.state || "").toLowerCase().includes("madhya") ||
    (lead?.state || "").toLowerCase() === "mp" ||
    Boolean(lead?.gstin?.startsWith("23"));
  const cgstAmount = isMPLead ? Math.round((gstAmount / 2) * 100) / 100 : 0;
  const sgstAmount = isMPLead ? Math.round((gstAmount - cgstAmount) * 100) / 100 : 0;

  // Selected payment mode service charges
  const selectedMode = paymentModes.find((m) => m.id === paymentModeId);
  const serviceChargeAmount = selectedMode?.charges
    ? Math.round((totalPaid * (selectedMode.charges / 100)) * 100) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentModeId) {
      toast.error("Mode Required", "Please select a Payment Mode.");
      return;
    }

    if (items.some((i) => !i.productId)) {
      toast.error("Product Required", "Please select a product for all items.");
      return;
    }

    if (totalPaid <= 0) {
      toast.error("Amount Required", "Total Paid amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsPayload = items.map((i) => {
        const prod = products.find((p) => p.id === i.productId);
        return {
          productId: i.productId,
          productName: prod?.name || "Product",
          pack: i.pack,
          serviceRate: i.serviceRate,
          discount: i.discount,
          adjustment: i.adjustment,
          paid: i.paid,
          fromDate: i.fromDate,
        };
      });

      const res = await createPaymentAction({
        leadId: lead.id,
        paymentModeId,
        paymentDate,
        transactionId: transactionId.trim() || undefined,
        description: description.trim() || undefined,
        items: itemsPayload,
      });

      if (!res.success) {
        toast.error("Submission Failed", res.error || "Failed to create payment.");
        setIsSubmitting(false);
        return;
      }

      toast.success(
        "Payment Submitted",
        `Payment of ₹${totalPaid.toLocaleString("en-IN")} submitted for review.`
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Submission Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.1] shadow-2xl p-5 sm:p-6 transition-all my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h3
                id={titleId}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Add Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{lead.name}</span>{" "}
                ({lead.mobile})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {optionsError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{optionsError}</span>
          </div>
        )}

        {isLoadingOptions ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="size-8 animate-spin text-emerald-500" />
            <span className="text-xs font-medium">Loading products and payment modes...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Row 1: Payment Mode, Date, Txn ID, Call ID/Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Payment Mode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentModeId}
                  onChange={(e) => setPaymentModeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/70 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                >
                  {paymentModes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.charges > 0 ? `(${m.charges}% chg)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/70 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="Transaction ID / UTR"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/70 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              {/* Call ID / Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Call Id / Description
                </label>
                <input
                  type="text"
                  placeholder="Call Id / Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/70 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Product Items Table / Repeater (Matching Image 1) */}
            <div className="border border-slate-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 font-semibold select-none">
                      <th className="py-2.5 px-3 min-w-[180px]">Product</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Pack</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Service Rate+Tax</th>
                      <th className="py-2.5 px-3 min-w-[80px]">Discount</th>
                      <th className="py-2.5 px-3 min-w-[80px]">Adjustment</th>
                      <th className="py-2.5 px-3 min-w-[90px]">Paid</th>
                      <th className="py-2.5 px-3 min-w-[120px]">From Date</th>
                      <th className="py-2.5 px-2 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {items.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Product */}
                        <td className="py-2 px-3">
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductChange(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Pack */}
                        <td className="py-2 px-3">
                          <select
                            value={row.pack}
                            onChange={(e) => handlePackChange(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Half-Yearly">Half-Yearly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                        </td>

                        {/* Service Rate+Tax */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.serviceRate || ""}
                            onChange={(e) =>
                              handleNumberFieldChange(row.id, "serviceRate", e.target.value)
                            }
                            placeholder="Rate"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono font-medium"
                          />
                        </td>

                        {/* Discount */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.discount || ""}
                            onChange={(e) =>
                              handleNumberFieldChange(row.id, "discount", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                          />
                        </td>

                        {/* Adjustment */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.adjustment || ""}
                            onChange={(e) =>
                              handleNumberFieldChange(row.id, "adjustment", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                          />
                        </td>

                        {/* Paid */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.paid || ""}
                            onChange={(e) =>
                              handleNumberFieldChange(row.id, "paid", e.target.value)
                            }
                            placeholder="Paid"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-500/40 dark:border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono font-bold"
                          />
                        </td>

                        {/* From Date */}
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={row.fromDate}
                            onChange={(e) => handleFromDateChange(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                          />
                          {idx === 0 && renewalHint && (
                            <span
                              className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mt-0.5 truncate max-w-[140px]"
                              title={renewalHint}
                            >
                              ℹ️ {renewalHint}
                            </span>
                          )}
                        </td>

                        {/* Action (+ or Trash) */}
                        <td className="py-2 px-2 text-center">
                          {idx === 0 ? (
                            <button
                              type="button"
                              onClick={handleAddRow}
                              title="Add Product Pack Item"
                              className="size-7 rounded-lg inline-flex items-center justify-center bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Plus className="size-3.5 stroke-[2.5]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              title="Remove item"
                              className="size-7 rounded-lg inline-flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Breakdown (Matching Image 1) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-2">
              <div className="w-full sm:w-72 rounded-2xl p-4 bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Amount Received (Base)</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Service Charge ({selectedMode?.charges}%)</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      ₹{serviceChargeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {isMPLead ? (
                  <>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>CGST (9%)</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        ₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>SGST (9%)</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        ₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>IGST (18%)</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-white/[0.1] flex justify-between font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Total Paid</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Send & Close) */}
              <div className="flex items-center gap-3 w-full sm:w-auto self-end">
                <button
                  type="submit"
                  disabled={isSubmitting || totalPaid <= 0}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ViewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    mobile: string;
  } | null;
}

export function ViewPaymentModal({
  isOpen,
  onClose,
  lead,
}: ViewPaymentModalProps) {
  const titleId = useId();
  const [payments, setPayments] = useState<LeadPaymentViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      getLeadPaymentsAction(lead.id)
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.payments) {
            setPayments(res.payments);
          } else {
            setError(res.error || "Failed to load payments.");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Error loading payments.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.1] shadow-2xl p-5 sm:p-6 transition-all my-8 animate-in zoom-in-95 duration-200">
        {/* Header (Matching Image 2: "Payment Raised") */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Receipt className="size-5" />
            </div>
            <div>
              <h3
                id={titleId}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Payment Raised
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{lead.name}</span>{" "}
                ({lead.mobile})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="size-8 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Loading payment records...</span>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Table (Matching Image 2 columns: #, Raised By, Payment, Mode, Status, Invoice, Description, Date) */}
            <div className="border border-slate-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 font-semibold select-none">
                      <th className="py-3 px-3 w-10">#</th>
                      <th className="py-3 px-3">Raised By</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Invoice</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No payment records found for this client.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p, idx) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors text-slate-700 dark:text-slate-300"
                        >
                          <td className="py-3 px-3 font-mono font-medium">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                            {p.raisedByName}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                            ₹{p.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 uppercase text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {p.modeName}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${p.status === "Approved"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : p.status === "Rejected"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {p.invoiceNumber ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                {p.invoiceNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-[200px] truncate text-[11px] text-slate-600 dark:text-slate-400" title={p.description || ""}>
                            {p.description || "—"}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            {p.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 dark:border-white/[0.1] bg-slate-50/80 dark:bg-white/[0.02] font-bold text-slate-900 dark:text-white">
                        <td colSpan={2} className="py-2.5 px-3">
                          Total
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td colSpan={5} className="py-2.5 px-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
