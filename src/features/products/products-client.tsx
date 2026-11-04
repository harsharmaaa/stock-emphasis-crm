"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  ArrowLeft,
  Edit2,
  Power,
  Search,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
import { ProductModal } from "./product-modal";
import { deactivateProductAction, reactivateProductAction } from "./actions";
import type { ProductItem } from "./types";

interface ProductsClientProps {
  initialProducts: ProductItem[];
}

export function ProductsClient({ initialProducts }: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Toggle Status State
  const [confirmToggleProduct, setConfirmToggleProduct] = useState<ProductItem | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (savedProduct: ProductItem) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedProduct.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedProduct;
        return next;
      }
      return [savedProduct, ...prev];
    });
    showToast(
      "success",
      `Product "${savedProduct.name}" ${editingProduct ? "updated" : "created"} successfully.`
    );
  };

  const handleToggleStatusConfirm = async () => {
    if (!confirmToggleProduct) return;
    setIsToggling(true);

    try {
      if (confirmToggleProduct.isActive) {
        const res = await deactivateProductAction(confirmToggleProduct.id);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => (p.id === confirmToggleProduct.id ? { ...p, isActive: false } : p))
          );
          showToast("success", `Product "${confirmToggleProduct.name}" deactivated.`);
          setConfirmToggleProduct(null);
        } else {
          showToast("error", res.error || "Failed to deactivate product.");
        }
      } else {
        const res = await reactivateProductAction(confirmToggleProduct.id);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => (p.id === confirmToggleProduct.id ? { ...p, isActive: true } : p))
          );
          showToast("success", `Product "${confirmToggleProduct.name}" reactivated.`);
          setConfirmToggleProduct(null);
        } else {
          showToast("error", res.error || "Failed to reactivate product.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast("error", message);
    } finally {
      setIsToggling(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? p.isActive
          : !p.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const formatPrice = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return `Rs. ${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`;
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

      {/* Header bar matching screenshot and CRM standard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
              PRODUCT
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {products.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Service packages, multi-tier duration pricing, and free trial configurations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/settings/configuration"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </Link>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0c1220] p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
              }`}
            >
              {status === "ALL" ? "All" : status === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 pl-4 pr-2 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[200px]">Product Name</th>
                <th className="py-3.5 px-4 min-w-[340px]">Pricing Tiers</th>
                <th className="py-3.5 px-3 text-center w-20">FT</th>
                <th className="py-3.5 px-3 text-center w-24">Risk Above</th>
                <th className="py-3.5 px-3 text-center min-w-[120px]">Telegram</th>
                <th className="py-3.5 px-3 text-center w-24">Status</th>
                <th className="py-3.5 pr-4 pl-2 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Package className="size-5" />
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {searchQuery || statusFilter !== "ALL"
                          ? "No products matching your search filter."
                          : "No products configured yet."}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Click &ldquo;Add Product&rdquo; above to set up your first investment product.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors ${
                      !p.isActive ? "opacity-60 bg-slate-50/30 dark:bg-white/[0.01]" : ""
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 pl-4 pr-2 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.pricingWithGst && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            Incl. GST
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Added by {p.createdByName || "Admin"}
                      </span>
                    </td>

                    {/* Pricing Grid matching legacy screenshot */}
                    <td className="py-3 px-4">
                      <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-white/[0.04] text-[11px]">
                        {/* Monthly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-slate-600 dark:text-slate-300 font-medium">
                            Monthly
                          </span>
                          <span className="col-span-3 text-slate-400 font-mono text-[10px]">
                            30 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatPrice(p.monthlyPrice)}
                          </span>
                        </div>
                        {/* Quarterly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-slate-600 dark:text-slate-300 font-medium">
                            Quarterly
                          </span>
                          <span className="col-span-3 text-slate-400 font-mono text-[10px]">
                            90 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatPrice(p.quarterlyPrice)}
                          </span>
                        </div>
                        {/* Half-Yearly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-slate-600 dark:text-slate-300 font-medium">
                            Half-Yearly
                          </span>
                          <span className="col-span-3 text-slate-400 font-mono text-[10px]">
                            180 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatPrice(p.halfYearlyPrice)}
                          </span>
                        </div>
                        {/* Yearly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-slate-600 dark:text-slate-300 font-medium">
                            Yearly
                          </span>
                          <span className="col-span-3 text-slate-400 font-mono text-[10px]">
                            365 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatPrice(p.yearlyPrice)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* FT (Free Trial) Indicator */}
                    <td className="py-3.5 px-3 text-center">
                      {p.hasFreeTrial ? (
                        <div className="inline-flex items-center justify-center size-6 rounded-md bg-blue-500 text-white shadow-2xs" title="Eligible for 2 Days Free Trial">
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center size-6 rounded-md border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 text-slate-300" title="No Free Trial">
                          <span className="text-[10px]">—</span>
                        </div>
                      )}
                    </td>

                    {/* Risk Above */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {p.riskAbove || "—"}
                    </td>

                    {/* Telegram */}
                    <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                      {p.telegram || "—"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                          className="p-1.5 rounded-lg border border-slate-250 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmToggleProduct(p)}
                          title={p.isActive ? "Deactivate Product" : "Reactivate Product"}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            p.isActive
                              ? "border-slate-250 dark:border-white/[0.1] text-slate-400 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              : "border-emerald-300 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          }`}
                        >
                          <Power className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        product={editingProduct}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
      />

      {/* Confirmation Modal for Deactivate / Reactivate */}
      {confirmToggleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmToggleProduct.isActive
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <Power className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {confirmToggleProduct.isActive ? "Deactivate Product?" : "Reactivate Product?"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {confirmToggleProduct.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmToggleProduct.isActive
                ? "This will make the product inactive. It will no longer appear in new client allotment or subscription selections, but historic records are preserved."
                : "This will restore the product as active so it can be selected across the system."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmToggleProduct(null)}
                disabled={isToggling}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-250 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatusConfirm}
                disabled={isToggling}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  confirmToggleProduct.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isToggling
                  ? "Processing..."
                  : confirmToggleProduct.isActive
                  ? "Yes, Deactivate"
                  : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

