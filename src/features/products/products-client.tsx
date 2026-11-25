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
  Check,
} from "lucide-react";
import { ProductModal } from "./product-modal";
import { deactivateProductAction, reactivateProductAction } from "./actions";
import type { ProductItem } from "./types";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  ConfirmDialog,
  EmptyState,
  useToast,
} from "@/src/components/ui";

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

  const toast = useToast();

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
    toast.success(
      "Saved successfully",
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
          toast.success("Deactivated", `Product "${confirmToggleProduct.name}" deactivated.`);
          setConfirmToggleProduct(null);
        } else {
          toast.error("Deactivation failed", res.error || "Failed to deactivate product.");
        }
      } else {
        const res = await reactivateProductAction(confirmToggleProduct.id);
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) => (p.id === confirmToggleProduct.id ? { ...p, isActive: true } : p))
          );
          toast.success("Reactivated", `Product "${confirmToggleProduct.name}" reactivated.`);
          setConfirmToggleProduct(null);
        } else {
          toast.error("Reactivation failed", res.error || "Failed to reactivate product.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
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
      {/* Header bar */}
      <PageHeader
        title="PRODUCT"
        description="Service packages, multi-tier duration pricing, and free trial configurations."
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/admin/settings/configuration">
              <Button
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="size-3.5" />
                Go Back
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={handleOpenAdd}
            >
              Add Product
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name..."
            className="pl-8"
          />
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All" : status === "ACTIVE" ? "Active" : "Inactive"}
            </Button>
          ))}
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-border/40">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8">
                    <EmptyState
                      icon="Inbox"
                      title={
                        searchQuery || statusFilter !== "ALL"
                          ? "No products matching your search filter"
                          : "No products configured yet"
                      }
                      description='Click "Add Product" above to set up your first investment product.'
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      !p.isActive ? "opacity-60 bg-muted/10" : ""
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 pl-4 pr-2 text-center text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.pricingWithGst && (
                          <Badge tone="ok">
                            Incl. GST
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Added by {p.createdByName || "Admin"}
                      </span>
                    </td>

                    {/* Pricing Grid */}
                    <td className="py-3 px-4">
                      <div className="grid grid-cols-1 divide-y divide-border/40 text-[11px]">
                        {/* Monthly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-foreground font-medium">
                            Monthly
                          </span>
                          <span className="col-span-3 text-muted-foreground font-mono text-[10px]">
                            30 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-foreground">
                            {formatPrice(p.monthlyPrice)}
                          </span>
                        </div>
                        {/* Quarterly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-foreground font-medium">
                            Quarterly
                          </span>
                          <span className="col-span-3 text-muted-foreground font-mono text-[10px]">
                            90 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-foreground">
                            {formatPrice(p.quarterlyPrice)}
                          </span>
                        </div>
                        {/* Half-Yearly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-foreground font-medium">
                            Half-Yearly
                          </span>
                          <span className="col-span-3 text-muted-foreground font-mono text-[10px]">
                            180 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-foreground">
                            {formatPrice(p.halfYearlyPrice)}
                          </span>
                        </div>
                        {/* Yearly */}
                        <div className="grid grid-cols-12 py-1 items-center">
                          <span className="col-span-4 text-foreground font-medium">
                            Yearly
                          </span>
                          <span className="col-span-3 text-muted-foreground font-mono text-[10px]">
                            365 Days
                          </span>
                          <span className="col-span-5 text-right font-mono font-semibold text-foreground">
                            {formatPrice(p.yearlyPrice)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* FT (Free Trial) Indicator */}
                    <td className="py-3.5 px-3 text-center">
                      {p.hasFreeTrial ? (
                        <div className="inline-flex items-center justify-center size-6 rounded-md bg-brand text-white shadow-2xs" title="Eligible for 2 Days Free Trial">
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center size-6 rounded-md border border-border bg-muted/40 text-muted-foreground" title="No Free Trial">
                          <span className="text-[10px]">—</span>
                        </div>
                      )}
                    </td>

                    {/* Risk Above */}
                    <td className="py-3.5 px-3 text-center font-mono text-muted-foreground text-[11px]">
                      {p.riskAbove || "—"}
                    </td>

                    {/* Telegram */}
                    <td className="py-3.5 px-3 text-center text-muted-foreground text-[11px] truncate max-w-[140px]">
                      {p.telegram || "—"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <Badge tone={p.isActive ? "ok" : "warn"} dot={p.isActive}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-auto text-foreground hover:text-brand"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`p-1.5 h-auto ${
                            p.isActive
                              ? "text-muted-foreground hover:text-destructive"
                              : "text-emerald-600 hover:text-emerald-700"
                          }`}
                          onClick={() => setConfirmToggleProduct(p)}
                          title={p.isActive ? "Deactivate Product" : "Reactivate Product"}
                        >
                          <Power className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        product={editingProduct}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
      />

      {/* Confirmation Dialog for Deactivate / Reactivate */}
      <ConfirmDialog
        open={Boolean(confirmToggleProduct)}
        onClose={() => setConfirmToggleProduct(null)}
        onConfirm={handleToggleStatusConfirm}
        title={confirmToggleProduct?.isActive ? "Deactivate Product?" : "Reactivate Product?"}
        description={
          confirmToggleProduct ? (
            <span>
              {confirmToggleProduct.isActive
                ? `This will make ${confirmToggleProduct.name} inactive. It will no longer appear in new client allotment or subscription selections, but historic records are preserved.`
                : `This will restore ${confirmToggleProduct.name} as active so it can be selected across the system.`}
            </span>
          ) : undefined
        }
        confirmText={confirmToggleProduct?.isActive ? "Yes, Deactivate" : "Yes, Reactivate"}
        cancelText="Cancel"
        tone={confirmToggleProduct?.isActive ? "danger" : "info"}
        loading={isToggling}
      />
    </div>
  );
}

