"use server";

import {
  requireComplianceOrAdminSession,
  requireEmployeeSession,
  requireManagerSession,
  handleActionError,
} from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";

export interface AdminApprovalInvoiceItem {
  id: string;
  serialNo: string;
  leadId: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  pan: string | null;
  dob: string | null;
  productName: string;
  productId: string | null;
  planType: string;
  durationLabel: string;
  startDate: string | null;
  endDate: string | null;
  invoiceDate: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: string; // "Approved" | "Pending" | "Cancelled"
  mailStatus: string | null;
  createdByName: string;
  assignedToName: string | null;
  teamName: string | null;
  createdAt: string;
}

export interface InvoiceTimelineEvent {
  id: string;
  action: string;
  label: string;
  timestamp: string; // ISO string
  displayTime: string;
  actorName: string;
  actorRole?: string;
  notes?: string;
  badgeColor: "emerald" | "amber" | "rose" | "blue" | "slate";
}

export interface UpdateInvoiceInput {
  invoiceId: string;
  productName?: string;
  productId?: string;
  planType?: string;
  durationLabel?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  notes?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatDob(date: Date | null | undefined): string | null {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}

/**
 * Loads pending and reviewable invoices for Admin & Compliance Officer queue.
 */
export async function getAdminApprovalInvoicesAction(params?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  invoices?: AdminApprovalInvoiceItem[];
  pendingCount?: number;
  approvedCount?: number;
  cancelledCount?: number;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  error?: string;
}> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    const statusFilter = params?.status?.trim().toUpperCase() || "PENDING";
    const where: Prisma.InvoiceWhereInput = {};

    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { serialNo: { contains: q, mode: "insensitive" } },
        { productName: { contains: q, mode: "insensitive" } },
        { lead: { name: { contains: q, mode: "insensitive" } } },
        { lead: { mobile: { contains: q } } },
        { lead: { email: { contains: q, mode: "insensitive" } } },
        { createdBy: { name: { contains: q, mode: "insensitive" } } },
        { assignedTo: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(100, params?.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const [invoices, totalCount, pendingCount, approvedCount, cancelledCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              mobile: true,
              email: true,
              pan: true,
              dob: true,
            },
          },
          createdBy: { select: { name: true } },
          assignedTo: { select: { name: true } },
          team: { select: { name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({ where: { status: "APPROVED" } }),
      prisma.invoice.count({ where: { status: "CANCELLED" } }),
    ]);

    const items: AdminApprovalInvoiceItem[] = invoices.map((inv) => {
      const rawStatus = (inv.status || "PENDING").toUpperCase();
      const status =
        rawStatus === "APPROVED"
          ? "Approved"
          : rawStatus === "CANCELLED"
          ? "Cancelled"
          : "Pending";

      return {
        id: inv.id,
        serialNo: inv.serialNo,
        leadId: inv.leadId,
        clientName: inv.lead?.name || "Unknown Client",
        clientMobile: inv.lead?.mobile || "N/A",
        clientEmail: inv.lead?.email || null,
        pan: inv.lead?.pan || null,
        dob: formatDob(inv.lead?.dob),
        productName: inv.productName || inv.product?.name || "Advisory Service Package",
        productId: inv.productId || null,
        planType: inv.planType || "Monthly",
        durationLabel: inv.durationLabel || "30 Days",
        startDate: inv.startDate ? formatDisplayDate(inv.startDate) : null,
        endDate: inv.endDate ? formatDisplayDate(inv.endDate) : null,
        invoiceDate: formatDisplayDate(inv.invoiceDate),
        baseAmount: Number(inv.baseAmount),
        gstAmount: Number(inv.gstAmount),
        totalAmount: Number(inv.totalAmount),
        status,
        mailStatus: inv.mailStatus,
        createdByName: inv.createdBy?.name || "System",
        assignedToName: inv.assignedTo?.name || null,
        teamName: inv.team?.name || null,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      invoices: items,
      pendingCount,
      approvedCount,
      cancelledCount,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      currentPage: page,
      pageSize,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load approval invoices.");
  }
}

/**
 * Returns pending invoice count for navigation badge.
 */
export async function getPendingInvoicesCountAction(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const session = await requireComplianceOrAdminSession({ redirect: false });
    if (!session) return { success: true, count: 0 };

    const count = await prisma.invoice.count({
      where: { status: "PENDING" },
    });

    return { success: true, count };
  } catch {
    return { success: true, count: 0 };
  }
}

/**
 * Approves a single invoice.
 */
export async function approveInvoiceAction({
  invoiceId,
  comment,
}: {
  invoiceId: string;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await requireComplianceOrAdminSession({ redirect: false });

    if (!invoiceId) {
      return { success: false, error: "Invoice ID is required." };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    if (invoice.status === "APPROVED") {
      return { success: false, error: "Invoice has already been approved." };
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "APPROVED",
        updatedAt: new Date(),
      },
    });

    // Log Activity & Timeline event
    const commentNote = comment?.trim() ? ` Note: "${comment.trim()}".` : "";
    await logActivity({
      action: "INVOICE_APPROVED",
      details: `[Invoice: ${invoice.serialNo}] Approved by ${sessionUser.name} (${sessionUser.role}) for client "${invoice.lead?.name || "Client"}" (${invoice.lead?.mobile || "N/A"}). Amount: ₹${Number(invoice.totalAmount).toLocaleString("en-IN")}.${commentNote}`,
      actorId: sessionUser.id,
      targetTeamId: invoice.teamId || undefined,
    });

    revalidatePath("/admin/approvals/invoices");
    revalidatePath("/admin/history/invoices");
    revalidatePath("/manager/history/invoices");
    revalidatePath("/employee/invoices");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to approve invoice.");
  }
}

/**
 * Rejects or cancels an invoice.
 */
export async function rejectInvoiceAction({
  invoiceId,
  reason,
}: {
  invoiceId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await requireComplianceOrAdminSession({ redirect: false });

    if (!invoiceId) {
      return { success: false, error: "Invoice ID is required." };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    if (invoice.status === "CANCELLED") {
      return { success: false, error: "Invoice has already been cancelled." };
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });

    const reasonNote = reason?.trim() ? ` Reason: "${reason.trim()}".` : " Reason: Unspecified.";
    await logActivity({
      action: "INVOICE_CANCELLED",
      details: `[Invoice: ${invoice.serialNo}] Cancelled/Rejected by ${sessionUser.name} (${sessionUser.role}) for client "${invoice.lead?.name || "Client"}".${reasonNote}`,
      actorId: sessionUser.id,
      targetTeamId: invoice.teamId || undefined,
    });

    revalidatePath("/admin/approvals/invoices");
    revalidatePath("/admin/history/invoices");
    revalidatePath("/manager/history/invoices");
    revalidatePath("/employee/invoices");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to reject invoice.");
  }
}

/**
 * Batch approve multiple invoices.
 */
export async function batchApproveInvoicesAction(
  items: { invoiceId: string; comment?: string }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    if (!items || items.length === 0) {
      return { success: false, error: "No invoices selected." };
    }

    let successCount = 0;
    for (const item of items) {
      const res = await approveInvoiceAction({
        invoiceId: item.invoiceId,
        comment: item.comment,
      });
      if (res.success) successCount++;
    }

    return { success: true, count: successCount };
  } catch (err) {
    return handleActionError(err, "Failed to batch approve invoices.");
  }
}

/**
 * Batch reject multiple invoices.
 */
export async function batchRejectInvoicesAction(
  items: { invoiceId: string; reason?: string }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    if (!items || items.length === 0) {
      return { success: false, error: "No invoices selected." };
    }

    let successCount = 0;
    for (const item of items) {
      const res = await rejectInvoiceAction({
        invoiceId: item.invoiceId,
        reason: item.reason,
      });
      if (res.success) successCount++;
    }

    return { success: true, count: successCount };
  } catch (err) {
    return handleActionError(err, "Failed to batch reject invoices.");
  }
}

/**
 * Updates an invoice (product, plan, duration, dates, amount with 18% GST recalculation, notes).
 */
export async function updateInvoiceAction(
  input: UpdateInvoiceInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await requireComplianceOrAdminSession({ redirect: false });

    if (!input.invoiceId) {
      return { success: false, error: "Invoice ID is required." };
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found." };
    }

    const updates: Prisma.InvoiceUpdateInput = {
      updatedAt: new Date(),
    };

    const diffs: string[] = [];

    if (input.productName !== undefined && input.productName.trim() !== (existing.productName || "")) {
      updates.productName = input.productName.trim();
      diffs.push(`Product: "${existing.productName}" -> "${input.productName.trim()}"`);
    }

    if (input.productId !== undefined && input.productId !== existing.productId) {
      updates.product = input.productId ? { connect: { id: input.productId } } : { disconnect: true };
    }

    if (input.planType !== undefined && input.planType.trim() !== (existing.planType || "")) {
      updates.planType = input.planType.trim();
      diffs.push(`Plan: "${existing.planType}" -> "${input.planType.trim()}"`);
    }

    if (input.durationLabel !== undefined && input.durationLabel.trim() !== (existing.durationLabel || "")) {
      updates.durationLabel = input.durationLabel.trim();
      diffs.push(`Duration: "${existing.durationLabel}" -> "${input.durationLabel.trim()}"`);
    }

    if (input.startDate) {
      const start = new Date(input.startDate);
      if (!isNaN(start.getTime())) {
        updates.startDate = start;
        diffs.push(`Start Date: ${formatDisplayDate(start)}`);
      }
    }

    if (input.endDate) {
      const end = new Date(input.endDate);
      if (!isNaN(end.getTime())) {
        updates.endDate = end;
        diffs.push(`End Date: ${formatDisplayDate(end)}`);
      }
    }

    if (input.totalAmount !== undefined && input.totalAmount > 0) {
      const totalAmount = Number(input.totalAmount);
      // Inclusive 18% GST math
      const baseAmount = Math.round(((totalAmount * 100) / 118) * 100) / 100;
      const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;

      updates.totalAmount = new Prisma.Decimal(totalAmount.toFixed(2));
      updates.baseAmount = new Prisma.Decimal(baseAmount.toFixed(2));
      updates.gstAmount = new Prisma.Decimal(gstAmount.toFixed(2));

      diffs.push(`Total Amount: ₹${Number(existing.totalAmount)} -> ₹${totalAmount} (Base: ₹${baseAmount}, GST: ₹${gstAmount})`);
    }

    await prisma.invoice.update({
      where: { id: input.invoiceId },
      data: updates,
    });

    const diffSummary = diffs.length > 0 ? diffs.join(", ") : "Minor details updated";
    const notesStr = input.notes?.trim() ? ` Note: "${input.notes.trim()}"` : "";

    await logActivity({
      action: "INVOICE_EDITED",
      details: `[Invoice: ${existing.serialNo}] Edited by ${sessionUser.name} (${sessionUser.role}). [${diffSummary}].${notesStr}`,
      actorId: sessionUser.id,
      targetTeamId: existing.teamId || undefined,
    });

    revalidatePath("/admin/approvals/invoices");
    revalidatePath("/admin/history/invoices");
    revalidatePath("/manager/history/invoices");
    revalidatePath("/employee/invoices");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update invoice.");
  }
}

/**
 * Returns structured timeline events for an invoice.
 * Gathers events from ActivityLog, linked Payment, and Invoice itself.
 */
export async function getInvoiceTimelineAction({
  invoiceId,
  serialNo,
}: {
  invoiceId: string;
  serialNo?: string;
}): Promise<{
  success: boolean;
  timeline?: InvoiceTimelineEvent[];
  error?: string;
}> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        createdBy: { select: { name: true, role: true } },
        lead: {
          select: {
            id: true,
            name: true,
            payments: {
              where: serialNo ? { invoiceNumber: serialNo } : undefined,
              orderBy: { createdAt: "asc" },
              include: { createdBy: { select: { name: true, role: true } } },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    const sNo = invoice.serialNo;

    // Search activity logs mentioning this invoice serialNo or leadId
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { details: { contains: sNo } },
          { details: { contains: `[Invoice: ${sNo}]` } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        actor: { select: { name: true, role: true } },
      },
    });

    const events: InvoiceTimelineEvent[] = [];

    // 1. Linked Payment raised event (if available)
    const linkedPayment = invoice.lead?.payments[0];
    if (linkedPayment) {
      events.push({
        id: `payment-raised-${linkedPayment.id}`,
        action: "CREATE_PAYMENT",
        label: "Payment Raised",
        timestamp: linkedPayment.createdAt.toISOString(),
        displayTime: formatDateTime(linkedPayment.createdAt),
        actorName: linkedPayment.createdBy?.name || "Employee",
        actorRole: linkedPayment.createdBy?.role || "EMPLOYEE",
        notes: `Payment of ₹${Number(linkedPayment.amount).toLocaleString("en-IN")} submitted via ${linkedPayment.modeName || "Payment Mode"}. Status: ${linkedPayment.status}`,
        badgeColor: "blue",
      });
    }

    // 2. Invoice Created / Payment Approved event
    events.push({
      id: `invoice-created-${invoice.id}`,
      action: "INVOICE_GENERATED",
      label: "Invoice Generated",
      timestamp: invoice.createdAt.toISOString(),
      displayTime: formatDateTime(invoice.createdAt),
      actorName: invoice.createdBy?.name || "System",
      actorRole: invoice.createdBy?.role || "ADMIN",
      notes: `Invoice ${invoice.serialNo} generated for ₹${Number(invoice.totalAmount).toLocaleString("en-IN")}. Initial Status: ${invoice.status}`,
      badgeColor: invoice.status === "APPROVED" ? "emerald" : "amber",
    });

    // 3. Activity log events
    for (const log of activityLogs) {
      let label = "Invoice Activity";
      let badgeColor: InvoiceTimelineEvent["badgeColor"] = "slate";

      switch (log.action) {
        case "INVOICE_APPROVED":
          label = "Invoice Approved";
          badgeColor = "emerald";
          break;
        case "INVOICE_CANCELLED":
          label = "Invoice Cancelled";
          badgeColor = "rose";
          break;
        case "INVOICE_EDITED":
          label = "Invoice Edited";
          badgeColor = "amber";
          break;
        case "INVOICE_PRINTED":
          label = "Tax Invoice Printed / PDF Exported";
          badgeColor = "blue";
          break;
        default:
          label = log.action.replace(/_/g, " ");
          badgeColor = "slate";
          break;
      }

      events.push({
        id: log.id,
        action: log.action,
        label,
        timestamp: log.createdAt.toISOString(),
        displayTime: formatDateTime(log.createdAt),
        actorName: log.actor?.name || "System",
        actorRole: log.actor?.role || "ADMIN",
        notes: log.details || undefined,
        badgeColor,
      });
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { success: true, timeline: events };
  } catch (err) {
    return handleActionError(err, "Failed to load invoice timeline.");
  }
}

/**
 * Logs print / PDF download event for an invoice.
 */
export async function logInvoicePrintAction({
  serialNo,
}: {
  invoiceId?: string;
  serialNo: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let sessionUser: { id: string; name: string; role: string } | null = null;
    try {
      sessionUser = await requireComplianceOrAdminSession({ redirect: false });
    } catch {
      try {
        sessionUser = await requireManagerSession({ redirect: false });
      } catch {
        sessionUser = await requireEmployeeSession({ redirect: false });
      }
    }

    if (!sessionUser) {
      return { success: false, error: "Unauthorized." };
    }

    await logActivity({
      action: "INVOICE_PRINTED",
      details: `[Invoice: ${serialNo}] Tax Invoice was viewed, printed, or downloaded as PDF by ${sessionUser.name} (${sessionUser.role}).`,
      actorId: sessionUser.id,
    });

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to log print action.");
  }
}

/**
 * Fetches available products for invoice editing.
 */
export async function getInvoiceProductsAction(): Promise<{
  success: boolean;
  products?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { success: true, products };
  } catch (err) {
    return handleActionError(err, "Failed to load products.");
  }
}
