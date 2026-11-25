"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { createProductAction, updateProductAction } from "./actions";
import type { ProductItem } from "./types";
import { Modal, Field, Input, Button, Badge } from "@/src/components/ui";

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
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Product" : "Add New Product"}
      description="Configure service package name, duration pricing, and free trial settings."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={!isSubmitting ? "Check" : undefined}
          >
            {isEditing ? "Update Product" : "Save Product"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4.5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Product Name */}
        <Field label="Product Name" required>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Classic Cash Trade"
          />
        </Field>

        {/* Pricing Including GST Checkbox */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-foreground block">
              Pricing Including GST
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
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
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
          </label>
        </div>

        {/* Pricing Durations Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Plan Pricing (₹)
            </span>
            <span className="text-[10px] text-muted-foreground">Optional: leave empty if plan not offered</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Monthly (30 Days) */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  Monthly
                </label>
                <Badge tone="info">
                  30 Days
                </Badge>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder="e.g. 12500.00"
                  className="pl-6 font-mono"
                />
              </div>
            </div>

            {/* Quarterly (90 Days) */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  Quarterly
                </label>
                <Badge tone="info">
                  90 Days
                </Badge>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quarterlyPrice}
                  onChange={(e) => setQuarterlyPrice(e.target.value)}
                  placeholder="e.g. 37500.00"
                  className="pl-6 font-mono"
                />
              </div>
            </div>

            {/* Half-Yearly (180 Days) */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  Half-Yearly
                </label>
                <Badge tone="info">
                  180 Days
                </Badge>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={halfYearlyPrice}
                  onChange={(e) => setHalfYearlyPrice(e.target.value)}
                  placeholder="e.g. 75000.00"
                  className="pl-6 font-mono"
                />
              </div>
            </div>

            {/* Yearly (365 Days) */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  Yearly
                </label>
                <Badge tone="info">
                  365 Days
                </Badge>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-medium">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(e.target.value)}
                  placeholder="e.g. 150000.00"
                  className="pl-6 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FT (Free Trial) Checkbox */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                FT (Free Trial Eligibility)
              </span>
              <Badge tone="info">
                2 Days
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
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
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Optional Dormant Fields: Risk Above & Telegram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Risk Above */}
          <Field label="Risk Above" description="(Optional)">
            <Input
              type="text"
              value={riskAbove}
              onChange={(e) => setRiskAbove(e.target.value)}
              placeholder="e.g. 1"
            />
          </Field>

          {/* Telegram */}
          <Field label="Telegram" description="(Optional)">
            <Input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="Channel or link"
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

