"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type {
  ProductItem,
  CreateProductInput,
  UpdateProductInput,
} from "./types";

/**
 * Helper to convert Prisma Product model to serializable ProductItem.
 */
function serializeProduct(p: {
  id: string;
  name: string;
  pricingWithGst: boolean;
  monthlyPrice: Prisma.Decimal | null;
  quarterlyPrice: Prisma.Decimal | null;
  halfYearlyPrice: Prisma.Decimal | null;
  yearlyPrice: Prisma.Decimal | null;
  hasFreeTrial: boolean;
  freeTrialDays: number;
  riskAbove: string | null;
  telegram: string | null;
  isActive: boolean;
  createdById: string | null;
  createdBy?: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductItem {
  return {
    id: p.id,
    name: p.name,
    pricingWithGst: p.pricingWithGst,
    monthlyPrice: p.monthlyPrice !== null ? Number(p.monthlyPrice) : null,
    quarterlyPrice: p.quarterlyPrice !== null ? Number(p.quarterlyPrice) : null,
    halfYearlyPrice: p.halfYearlyPrice !== null ? Number(p.halfYearlyPrice) : null,
    yearlyPrice: p.yearlyPrice !== null ? Number(p.yearlyPrice) : null,
    hasFreeTrial: p.hasFreeTrial,
    freeTrialDays: p.freeTrialDays,
    riskAbove: p.riskAbove,
    telegram: p.telegram,
    isActive: p.isActive,
    createdById: p.createdById,
    createdByName: p.createdBy?.name || "Admin",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function parseDecimalPrice(val: unknown): Prisma.Decimal | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num < 0) {
    throw new Error("Prices must be valid positive numbers or zero.");
  }
  return new Prisma.Decimal(num.toFixed(2));
}

/**
 * Fetch all products (both active and inactive) for Admin Management.
 * Strictly restricted to Admin users.
 */
export async function getProductsAction(): Promise<{
  success: boolean;
  products?: ProductItem[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const raw = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    const products: ProductItem[] = raw.map(serializeProduct);

    return { success: true, products };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load products.";
    return { success: false, error: message };
  }
}

/**
 * Fetch active products only (for consumers / dropdowns).
 */
export async function getActiveProductsAction(): Promise<{
  success: boolean;
  products?: ProductItem[];
  error?: string;
}> {
  try {
    const raw = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    const products: ProductItem[] = raw.map(serializeProduct);

    return { success: true, products };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load active products.";
    return { success: false, error: message };
  }
}

/**
 * Create a new Product.
 * Strictly requires Admin session.
 * Enforces case-insensitive duplicate name prevention.
 */
export async function createProductAction(input: CreateProductInput): Promise<{
  success: boolean;
  product?: ProductItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = (input.name || "").trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: "Product Name is required (minimum 2 characters)." };
    }

    // Check existing case-insensitively
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        return {
          success: false,
          error: `A deactivated product named "${existing.name}" already exists. Please reactivate it from the list instead.`,
        };
      }
      return { success: false, error: `A product named "${existing.name}" already exists.` };
    }

    let monthlyPrice: Prisma.Decimal | null = null;
    let quarterlyPrice: Prisma.Decimal | null = null;
    let halfYearlyPrice: Prisma.Decimal | null = null;
    let yearlyPrice: Prisma.Decimal | null = null;

    try {
      monthlyPrice = parseDecimalPrice(input.monthlyPrice);
      quarterlyPrice = parseDecimalPrice(input.quarterlyPrice);
      halfYearlyPrice = parseDecimalPrice(input.halfYearlyPrice);
      yearlyPrice = parseDecimalPrice(input.yearlyPrice);
    } catch (parseErr) {
      return {
        success: false,
        error: parseErr instanceof Error ? parseErr.message : "Invalid pricing format.",
      };
    }

    const created = await prisma.product.create({
      data: {
        name: trimmedName,
        pricingWithGst: Boolean(input.pricingWithGst),
        monthlyPrice,
        quarterlyPrice,
        halfYearlyPrice,
        yearlyPrice,
        hasFreeTrial: Boolean(input.hasFreeTrial),
        freeTrialDays: 2, // Confirmed 2 days
        riskAbove: input.riskAbove ? input.riskAbove.trim() : null,
        telegram: input.telegram ? input.telegram.trim() : null,
        isActive: true,
        createdById: admin.id,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    await logActivity({
      action: "CREATE_PRODUCT",
      details: `Created new product "${created.name}" (FT: ${created.hasFreeTrial ? "Yes" : "No"}, GST Included: ${created.pricingWithGst ? "Yes" : "No"})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/products");
    revalidatePath("/admin/settings/configuration");

    return { success: true, product: serializeProduct(created) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create product.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing Product.
 * Strictly requires Admin session.
 */
export async function updateProductAction(input: UpdateProductInput): Promise<{
  success: boolean;
  product?: ProductItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!input.id) {
      return { success: false, error: "Product ID is required." };
    }

    const trimmedName = (input.name || "").trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: "Product Name is required (minimum 2 characters)." };
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id: input.id },
    });

    if (!currentProduct) {
      return { success: false, error: "Product not found." };
    }

    // Check duplicate name for other products
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: input.id },
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return { success: false, error: `Another product named "${duplicate.name}" already exists.` };
    }

    let monthlyPrice: Prisma.Decimal | null = null;
    let quarterlyPrice: Prisma.Decimal | null = null;
    let halfYearlyPrice: Prisma.Decimal | null = null;
    let yearlyPrice: Prisma.Decimal | null = null;

    try {
      monthlyPrice = parseDecimalPrice(input.monthlyPrice);
      quarterlyPrice = parseDecimalPrice(input.quarterlyPrice);
      halfYearlyPrice = parseDecimalPrice(input.halfYearlyPrice);
      yearlyPrice = parseDecimalPrice(input.yearlyPrice);
    } catch (parseErr) {
      return {
        success: false,
        error: parseErr instanceof Error ? parseErr.message : "Invalid pricing format.",
      };
    }

    const updated = await prisma.product.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        pricingWithGst: Boolean(input.pricingWithGst),
        monthlyPrice,
        quarterlyPrice,
        halfYearlyPrice,
        yearlyPrice,
        hasFreeTrial: Boolean(input.hasFreeTrial),
        freeTrialDays: 2,
        riskAbove: input.riskAbove ? input.riskAbove.trim() : null,
        telegram: input.telegram ? input.telegram.trim() : null,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    await logActivity({
      action: "UPDATE_PRODUCT",
      details: `Updated product "${updated.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/products");
    revalidatePath("/admin/settings/configuration");

    return { success: true, product: serializeProduct(updated) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update product.";
    return { success: false, error: message };
  }
}

/**
 * Deactivate a product (safe soft deactivation).
 */
export async function deactivateProductAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return { success: false, error: "Product not found." };
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "DEACTIVATE_PRODUCT",
      details: `Deactivated product "${product.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/products");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate product.";
    return { success: false, error: message };
  }
}

/**
 * Reactivate a deactivated product.
 */
export async function reactivateProductAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return { success: false, error: "Product not found." };
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: true },
    });

    await logActivity({
      action: "REACTIVATE_PRODUCT",
      details: `Reactivated product "${product.name}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/products");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reactivate product.";
    return { success: false, error: message };
  }
}

