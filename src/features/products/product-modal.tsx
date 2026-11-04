"use client";

import { useState } from "react";
import { X, AlertCircle, Package, ShieldCheck, Check } from "lucide-react";
import { createProductAction, updateProductAction } from "./actions";
import type { ProductItem } from "./types";

interface ProductModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProduct: ProductItem) => void;
}

export function ProductModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: ProductModalProps) {
  const isEditing = Boolean(product);

  const [name, setName] = useState(product?.name || "");
  const [pricingWithGst, setPricingWithGst] = useState(product?.pricingWithGst || false);
  const [monthlyPrice, setMonthlyPrice] = useState(
    product?.monthlyPrice !== null && product?.monthlyPrice !== undefined
      ? String(product.monthlyPrice)
      : ""
  );
  const [quarterlyPrice, setQuarterlyPrice] = useState(
    product?.quarterlyPrice !== null && product?.quarterlyPrice !== undefined
      ? String(product.quarterlyPrice)
      : ""
  );
  const [halfYearlyPrice, setHalfYearlyPrice] = useState(
    product?.halfYearlyPrice !== null && product?.halfYearlyPrice !== undefined
      ? String(product.halfYearlyPrice)
      : ""
  );
  const [yearlyPrice, setYearlyPrice] = useState(
    product?.yearlyPrice !== null && product?.yearlyPrice !== undefined
      ? String(product.yearlyPrice)
      : ""
  );
  const [hasFreeTrial, setHasFreeTrial] = useState(product?.hasFreeTrial || false);
  const [riskAbove, setRiskAbove] = useState(product?.riskAbove || "");
  const [telegram, setTelegram] = useState(product?.telegram || "");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("Product Name is required (minimum 2 characters).");
      return;
    }

    const parseNum = (val: string): number | null => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error("Prices must be valid positive numbers (e.g. 999.50) or left empty.");
      }
      return parsed;
    };

    let mPrice: number | null = null;
    let qPrice: number | null = null;
    let hPrice: number | null = null;
    let yPrice: number | null = null;

    try {
      mPrice = parseNum(monthlyPrice);
      qPrice = parseNum(quarterlyPrice);
      hPrice = parseNum(halfYearlyPrice);
      yPrice = parseNum(yearlyPrice);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid pricing format.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && product) {
        const res = await updateProductAction({
          id: product.id,
          name: trimmedName,
          pricingWithGst,
          monthlyPrice: mPrice,
          quarterlyPrice: qPrice,
          halfYearlyPrice: hPrice,
          yearlyPrice: yPrice,
          hasFreeTrial,
          riskAbove: riskAbove.trim() || null,
          telegram: telegram.trim() || null,
        });

        if (!res.success || !res.product) {
          setErrorMsg(res.error || "Failed to update product.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.product);
        onClose();
      } else {
        const res = await createProductAction({
          name: trimmedName,
          pricingWithGst,
          monthlyPrice: mPrice,
          quarterlyPrice: qPrice,
          halfYearlyPrice: hPrice,
          yearlyPrice: yPrice,
          hasFreeTrial,
          riskAbove: riskAbove.trim() || null,
          telegram: telegram.trim() || null,
        });

        if (!res.success || !res.product) {
          setErrorMsg(res.error || "Failed to create product.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.product);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl max-w-xl w-full border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Configure service package name, duration pricing, and free trial settings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4.5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Classic Cash Trade"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Pricing Including GST Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-white block">
                Pricing Including GST
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Check if the duration pricing listed below already includes applicable taxes.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pricingWithGst}
                onChange={(e) => setPricingWithGst(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Pricing Durations Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Plan Pricing (₹)
              </span>
              <span className="text-[10px] text-slate-400">Optional: leave empty if plan not offered</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monthly (30 Days) */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Monthly
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
                    30 Days
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    placeholder="e.g. 12500.00"
                    className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Quarterly (90 Days) */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Quarterly
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
                    90 Days
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quarterlyPrice}
                    onChange={(e) => setQuarterlyPrice(e.target.value)}
                    placeholder="e.g. 37500.00"
                    className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Half-Yearly (180 Days) */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Half-Yearly
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
                    180 Days
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={halfYearlyPrice}
                    onChange={(e) => setHalfYearlyPrice(e.target.value)}
                    placeholder="e.g. 75000.00"
                    className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Yearly (365 Days) */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Yearly
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
                    365 Days
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(e.target.value)}
                    placeholder="e.g. 150000.00"
                    className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FT (Free Trial) Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-white">
                  FT (Free Trial Eligibility)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  2 Days
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Enables employees to raise a 2-day Free Trial query for this product.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasFreeTrial}
                onChange={(e) => setHasFreeTrial(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Optional Dormant Fields: Risk Above & Telegram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Risk Above */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Risk Above <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={riskAbove}
                onChange={(e) => setRiskAbove(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telegram <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="Channel or link"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-250 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{isEditing ? "Update Product" : "Save Product"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

