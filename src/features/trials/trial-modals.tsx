"use client";

import { useState, useEffect, useId } from "react";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/src/components/ui/Toast";
import {
  getTrialFormOptionsAction,
  createFreeTrialsAction,
  getLeadTrialsAction,
  type TrialFormProduct,
  type LeadTrialItem,
} from "./actions";

interface AddFreeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    mobile: string;
    status?: string;
  } | null;
  onSuccess?: () => void;
}

const getTodayString = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addDaysToString = (startDateStr: string, days: number): string => {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return startDateStr;
  d.setDate(d.getDate() + Math.max(1, days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function AddFreeTrialModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: AddFreeTrialModalProps) {
  const toast = useToast();
  const titleId = useId();

  const [products, setProducts] = useState<TrialFormProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(() => addDaysToString(getTodayString(), 2));
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEndDateUserEdited, setIsEndDateUserEdited] = useState(false);

  // Load available products whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoadingProducts(true);
      setProductError(null);
      setSelectedProductIds([]);
      const today = getTodayString();
      setStartDate(today);
      setEndDate(addDaysToString(today, 2));
      setIsEndDateUserEdited(false);
      setRemarks("");

      getTrialFormOptionsAction()
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.products) {
            setProducts(res.products);
          } else {
            setProductError(res.error || "Failed to load product options.");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setProductError(err instanceof Error ? err.message : "Error loading products.");
        })
        .finally(() => {
          if (!cancelled) setIsLoadingProducts(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];

      // Auto update endDate if employee hasn't manually edited it
      if (!isEndDateUserEdited && next.length > 0) {
        const selectedProducts = products.filter((p) => next.includes(p.id));
        const maxDays = Math.max(
          2,
          ...selectedProducts.map((p) => p.freeTrialDays || 2)
        );
        setEndDate(addDaysToString(startDate, maxDays));
      }

      return next;
    });
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (!isEndDateUserEdited) {
      const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
      const maxDays =
        selectedProducts.length > 0
          ? Math.max(2, ...selectedProducts.map((p) => p.freeTrialDays || 2))
          : 2;
      setEndDate(addDaysToString(newStart, maxDays));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProductIds.length === 0) {
      toast.error("Selection Required", "Please select at least one product for the free trial.");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Dates Required", "Please specify both From Date and To Date.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Invalid Dates", "To Date must be equal to or later than From Date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createFreeTrialsAction({
        leadId: lead.id,
        productIds: selectedProductIds,
        startDate,
        endDate,
        remarks: remarks.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          "Free Trial Added",
          `Successfully registered ${res.count || selectedProductIds.length} free trial subscription(s) for ${lead.name}.`
        );
        onClose();
        onSuccess?.();
      } else {
        toast.error("Failed to Add Trial", res.error || "An unexpected error occurred.");
      }
    } catch (err) {
      toast.error("Network Error", err instanceof Error ? err.message : "Failed to create free trial.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              Add Free Trial
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{lead.name}</span> ({lead.mobile})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Products Multi-select Checkboxes */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Select Product(s) <span className="text-rose-500">*</span>
            </label>

            {isLoadingProducts ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin text-cyan-500" />
                <span className="text-xs">Loading available service packages...</span>
              </div>
            ) : productError ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{productError}</span>
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                No active trial products found in the catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {products.map((prod) => {
                  const isChecked = selectedProductIds.includes(prod.id);
                  return (
                    <label
                      key={prod.id}
                      onClick={() => handleToggleProduct(prod.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-950 dark:text-cyan-100 shadow-2xs"
                          : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`size-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isChecked
                            ? "bg-cyan-600 border-cyan-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block truncate leading-tight">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          {prod.freeTrialDays}-day trial period
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Pickers (From Date & To Date) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                To Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setIsEndDateUserEdited(true);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Remarks (Optional) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="E.g., Interested in Nifty futures, 2 days service requested..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="submit"
              disabled={isSubmitting || isLoadingProducts}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#00bcd4] hover:bg-[#00acc1] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#ff7043] hover:bg-[#f4511e] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ViewTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    mobile: string;
  } | null;
}

export function ViewTrialModal({ isOpen, onClose, lead }: ViewTrialModalProps) {
  const titleId = useId();
  const [trials, setTrials] = useState<LeadTrialItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      getLeadTrialsAction(lead.id)
        .then((res) => {
          if (cancelled) return;
          if (res.success && res.trials) {
            setTrials(res.trials);
          } else {
            setError(res.error || "Failed to load trial records.");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Error loading trials.");
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

  const renderStatusBadge = (status: LeadTrialItem["displayStatus"]) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
            Running
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500 text-white shadow-2xs">
            Approved
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ff7043] text-white shadow-2xs">
            Expire
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500 text-white shadow-2xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              Previous Free Trial
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{lead.name}</span> ({lead.mobile})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Table matching employeAddactionViewTrial.jpg */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="size-6 animate-spin text-cyan-500" />
              <span className="text-xs">Loading previous free trials...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : trials.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No previous free trial records found for this lead.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.08] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-3.5">
                      #
                    </th>
                    <th scope="col" className="py-3 px-3.5">
                      Product
                    </th>
                    <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                      From
                    </th>
                    <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                      To
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {trials.map((trial, index) => (
                    <tr
                      key={trial.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-white">
                        <div>{trial.productName}</div>
                        {trial.remarks && (
                          <div
                            className="text-[10px] text-amber-600 dark:text-amber-400 font-normal italic mt-0.5 max-w-[200px] truncate"
                            title={trial.remarks}
                          >
                            Note: {trial.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {trial.startDate}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {trial.endDate}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(trial.displayStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Close Button */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-xs font-bold text-white bg-[#ff7043] hover:bg-[#f4511e] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-orange-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
