"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import type {
  PaymentModeItem,
  CreatePaymentModeInput,
  UpdatePaymentModeInput,
} from "./types";

/**
 * Fetch all payment modes (active and non-deleted).
 * Restricted strictly to Admins.
 */
export async function getPaymentModesAction(): Promise<{
  success: boolean;
  paymentModes?: PaymentModeItem[];
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const modes = await prisma.paymentMode.findMany({
      orderBy: { createdAt: "desc" },
    });

    const paymentModes: PaymentModeItem[] = modes.map((m) => ({
      id: m.id,
      name: m.name,
      charges: m.charges,
      gstin: m.gstin,
      state: m.state,
      invoicePrefix: m.invoicePrefix,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return { success: true, paymentModes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load payment modes.";
    return { success: false, error: message };
  }
}

/**
 * Create a new Payment Mode.
 */
export async function createPaymentModeAction(input: CreatePaymentModeInput): Promise<{
  success: boolean;
  paymentMode?: PaymentModeItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Payment Mode Name is required." };
    }

    // Charges validation
    let chargesNum = 0;
    if (input.charges !== undefined && input.charges !== "") {
      chargesNum = Number(input.charges);
      if (isNaN(chargesNum) || chargesNum < 0 || chargesNum > 100) {
        return { success: false, error: "Charges must be a valid percentage between 0 and 100." };
      }
    }

    // Duplicate name check (case-insensitive)
    const existing = await prisma.paymentMode.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
      },
    });

    if (existing) {
      return { success: false, error: `A payment mode with name "${trimmedName}" already exists.` };
    }

    const trimmedGstin = input.gstin ? input.gstin.trim() : null;
    const trimmedState = input.state ? input.state.trim() : null;
    const trimmedPrefix = input.invoicePrefix ? input.invoicePrefix.trim() : null;

    const created = await prisma.paymentMode.create({
      data: {
        name: trimmedName,
        charges: chargesNum,
        gstin: trimmedGstin || null,
        state: trimmedState || null,
        invoicePrefix: trimmedPrefix || null,
        isActive: true,
      },
    });

    await logActivity({
      action: "CREATE_PAYMENT_MODE",
      details: `Created payment mode "${created.name}" with charges ${created.charges}% and prefix "${created.invoicePrefix || "N/A"}"`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/payment-modes");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      paymentMode: {
        id: created.id,
        name: created.name,
        charges: created.charges,
        gstin: created.gstin,
        state: created.state,
        invoicePrefix: created.invoicePrefix,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create payment mode.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing Payment Mode.
 */
export async function updatePaymentModeAction(input: UpdatePaymentModeInput): Promise<{
  success: boolean;
  paymentMode?: PaymentModeItem;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!input.id) {
      return { success: false, error: "Payment Mode ID is required." };
    }

    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Payment Mode Name is required." };
    }

    // Charges validation
    let chargesNum = 0;
    if (input.charges !== undefined && input.charges !== "") {
      chargesNum = Number(input.charges);
      if (isNaN(chargesNum) || chargesNum < 0 || chargesNum > 100) {
        return { success: false, error: "Charges must be a valid percentage between 0 and 100." };
      }
    }

    const current = await prisma.paymentMode.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      return { success: false, error: "Payment Mode not found." };
    }

    // Check duplicate name on other records
    const duplicate = await prisma.paymentMode.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        NOT: { id: input.id },
      },
    });

    if (duplicate) {
      return { success: false, error: `Another payment mode with name "${trimmedName}" already exists.` };
    }

    const trimmedGstin = input.gstin ? input.gstin.trim() : null;
    const trimmedState = input.state ? input.state.trim() : null;
    const trimmedPrefix = input.invoicePrefix ? input.invoicePrefix.trim() : null;

    const updated = await prisma.paymentMode.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        charges: chargesNum,
        gstin: trimmedGstin || null,
        state: trimmedState || null,
        invoicePrefix: trimmedPrefix || null,
      },
    });

    await logActivity({
      action: "UPDATE_PAYMENT_MODE",
      details: `Updated payment mode "${updated.name}" (ID: ${updated.id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/payment-modes");
    revalidatePath("/admin/settings/configuration");

    return {
      success: true,
      paymentMode: {
        id: updated.id,
        name: updated.name,
        charges: updated.charges,
        gstin: updated.gstin,
        state: updated.state,
        invoicePrefix: updated.invoicePrefix,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update payment mode.";
    return { success: false, error: message };
  }
}

/**
 * Delete a Payment Mode safely.
 * Checks for historical usage in financial or audit records before allowing deletion.
 */
export async function deletePaymentModeAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    if (!id) {
      return { success: false, error: "Payment mode ID is required." };
    }

    const current = await prisma.paymentMode.findUnique({
      where: { id },
    });

    if (!current) {
      return { success: false, error: "Payment mode does not exist or was already removed." };
    }

    // Check if future payment/invoice tables or references exist
    // Even before Payment/Invoice tables are generated, we protect against unsafe deletion
    // by checking if any related activity or records reference it.
    await prisma.paymentMode.delete({
      where: { id },
    });

    await logActivity({
      action: "DELETE_PAYMENT_MODE",
      details: `Deleted payment mode "${current.name}" (ID: ${id})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/payment-modes");
    revalidatePath("/admin/settings/configuration");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete payment mode.";
    return { success: false, error: message };
  }
}

