"use server";

import {
  requireEmployeeSession,
  requireComplianceOrAdminSession,
  handleActionError,
} from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type {
  PaymentFormProduct,
  PaymentFormMode,
  CreatePaymentInput,
  LeadPaymentViewItem,
  AdminApprovalPaymentItem,
} from "./types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatDisplayDate(date: Date): string {
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
  return `${year}-${month}-${day}`;
}

/**
 * Generates the next sequential invoice serial number in format "Inv-XXXX"
 */
async function generateNextInvoiceSerialNo(): Promise<string> {
  const latestInvoices = await prisma.invoice.findMany({
    select: { serialNo: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let highestNum = 1000;
  for (const inv of latestInvoices) {
    const match = inv.serialNo.match(/Inv-(\d+)/i);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > highestNum) {
        highestNum = n;
      }
    }
  }

  // Fallback to invoice count if no numbered Inv- found
  if (highestNum === 1000) {
    const totalCount = await prisma.invoice.count();
    highestNum = Math.max(1000, 1000 + totalCount);
  }

  let nextSerial = `Inv-${highestNum + 1}`;
  let attempt = 1;
  while (attempt < 10) {
    const exists = await prisma.invoice.findUnique({
      where: { serialNo: nextSerial },
      select: { id: true },
    });
    if (!exists) break;
    highestNum++;
    nextSerial = `Inv-${highestNum + 1}`;
    attempt++;
  }

  return nextSerial;
}

/**
 * Smart lookup for lead's previous service plan to calculate auto-next start date (previousEndDate + 1 day).
 */
export async function getLeadServiceRenewalAction({
  leadId,
  productId,
}: {
  leadId: string;
  productId?: string;
}): Promise<{
  success: boolean;
  hasPreviousService?: boolean;
  previousEndDate?: string | null;
  previousEndDisplay?: string | null;
  recommendedStartDate?: string; // YYYY-MM-DD
  hint?: string | null;
  error?: string;
}> {
  try {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (!leadId) {
      return {
        success: true,
        hasPreviousService: false,
        recommendedStartDate: todayStr,
      };
    }

    // 1. Find latest approved/running invoice for this lead (matching product first if given)
    let invoice = productId
      ? await prisma.invoice.findFirst({
        where: {
          leadId,
          status: { in: ["APPROVED", "RUNNING"] },
          endDate: { not: null },
          productId,
        },
        orderBy: { endDate: "desc" },
        select: {
          id: true,
          serialNo: true,
          productName: true,
          endDate: true,
        },
      })
      : null;

    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: {
          leadId,
          status: { in: ["APPROVED", "RUNNING"] },
          endDate: { not: null },
        },
        orderBy: { endDate: "desc" },
        select: {
          id: true,
          serialNo: true,
          productName: true,
          endDate: true,
        },
      });
    }

    if (!invoice || !invoice.endDate) {
      return {
        success: true,
        hasPreviousService: false,
        recommendedStartDate: todayStr,
      };
    }

    const prevEnd = new Date(invoice.endDate);
    const todayZero = new Date(today);
    todayZero.setHours(0, 0, 0, 0);

    const yesterdayZero = new Date(todayZero);
    yesterdayZero.setDate(yesterdayZero.getDate() - 1);

    const prevEndZero = new Date(prevEnd);
    prevEndZero.setHours(0, 0, 0, 0);

    // If prior endDate exists and is today or in future (or ended yesterday)
    if (prevEndZero.getTime() >= yesterdayZero.getTime()) {
      const nextStart = new Date(prevEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      const recommendedStartDate = `${nextStart.getFullYear()}-${pad(nextStart.getMonth() + 1)}-${pad(nextStart.getDate())}`;
      const displayEnd = formatDisplayDate(prevEnd);

      return {
        success: true,
        hasPreviousService: true,
        previousEndDate: invoice.endDate.toISOString(),
        previousEndDisplay: displayEnd,
        recommendedStartDate,
        hint: `Auto-set after previous plan ending ${displayEnd}`,
      };
    }

    // If expired earlier in the past (before yesterday)
    return {
      success: true,
      hasPreviousService: true,
      previousEndDate: invoice.endDate.toISOString(),
      previousEndDisplay: formatDisplayDate(prevEnd),
      recommendedStartDate: todayStr,
      hint: null,
    };
  } catch (err) {
    return handleActionError(err, "Failed to check service renewal dates.");
  }
}

/**
 * Returns options for AddPaymentModal (active products, payment modes).
 */
export async function getPaymentFormOptionsAction(): Promise<{
  success: boolean;
  products?: PaymentFormProduct[];
  paymentModes?: PaymentFormMode[];
  error?: string;
}> {
  try {
    await requireEmployeeSession({ redirect: false });

    const [productsRaw, modesRaw] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          monthlyPrice: true,
          quarterlyPrice: true,
          halfYearlyPrice: true,
          yearlyPrice: true,
          pricingWithGst: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.paymentMode.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          charges: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const products: PaymentFormProduct[] = productsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyPrice: p.monthlyPrice !== null ? Number(p.monthlyPrice) : null,
      quarterlyPrice: p.quarterlyPrice !== null ? Number(p.quarterlyPrice) : null,
      halfYearlyPrice: p.halfYearlyPrice !== null ? Number(p.halfYearlyPrice) : null,
      yearlyPrice: p.yearlyPrice !== null ? Number(p.yearlyPrice) : null,
      pricingWithGst: p.pricingWithGst,
    }));

    return {
      success: true,
      products,
      paymentModes: modesRaw,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load payment form options.");
  }
}

/**
 * Submits a new payment request with multiple product pack items.
 * Calculates inclusive 18% GST (118 rule).
 * Status starts as "PENDING" and logs CREATE_PAYMENT.
 */
export async function createPaymentAction(
  input: CreatePaymentInput
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const sessionUser = await requireEmployeeSession({ redirect: false });

    if (!input.leadId || !input.leadId.trim()) {
      return { success: false, error: "Lead ID is required." };
    }

    if (!input.paymentModeId || !input.paymentModeId.trim()) {
      return { success: false, error: "Please select a payment mode." };
    }

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Please add at least one product item." };
    }

    // Validate and compute total amount
    let totalPaid = 0;
    for (const item of input.items) {
      if (!item.productId) {
        return { success: false, error: "Each row must have a valid product selected." };
      }
      const paidNum = Number(item.paid);
      if (isNaN(paidNum) || paidNum < 0) {
        return { success: false, error: "Paid amount must be a positive number." };
      }
      totalPaid += paidNum;
    }

    if (totalPaid <= 0) {
      return { success: false, error: "Total paid amount must be greater than zero." };
    }

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return { success: false, error: "Invalid payment date." };
    }

    const [lead, user, paymentMode] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: input.leadId },
        select: {
          id: true,
          name: true,
          mobile: true,
          allotToId: true,
          teamId: true,
          status: true,
          leadSource: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          name: true,
          teamId: true,
        },
      }),
      prisma.paymentMode.findUnique({
        where: { id: input.paymentModeId },
        select: { id: true, name: true, charges: true },
      }),
    ]);

    if (!lead) {
      return { success: false, error: "Target lead not found." };
    }

    // Compile items summary for the description
    const itemsSummary = input.items
      .map(
        (i) =>
          `${i.productName || "Product"} (${i.pack}) - Rate: ₹${i.serviceRate}, Disc: ₹${i.discount}, Adj: ₹${i.adjustment}, Paid: ₹${i.paid}, From: ${i.fromDate}`
      )
      .join(" | ");

    const fullDescription = input.description?.trim()
      ? `${input.description.trim()} [Items: ${itemsSummary}]`
      : `[Items: ${itemsSummary}]`;

    // Generate readable Payment serialNo
    const paymentCount = await prisma.payment.count();
    const leadMobileSuffix = lead.mobile ? lead.mobile.slice(-6) : "000000";
    const paymentSerialNo = `${paymentCount + 1}--[${leadMobileSuffix}]`;

    const createdPayment = await prisma.payment.create({
      data: {
        serialNo: paymentSerialNo,
        leadId: lead.id,
        paymentModeId: input.paymentModeId,
        modeName: paymentMode?.name || "Other",
        leadAddedById: lead.allotToId || sessionUser.id,
        createdById: sessionUser.id,
        leadOwnerId: lead.allotToId || sessionUser.id,
        teamId: lead.teamId || user?.teamId || null,
        amount: new Prisma.Decimal(totalPaid.toFixed(2)),
        paymentType: input.paymentType || "Full",
        transactionId: input.transactionId?.trim() || null,
        status: "PENDING",
        description: fullDescription,
        paymentDate,
        leadSource: lead.leadSource || null,
      },
    });

    // Log activity
    await logActivity({
      action: "CREATE_PAYMENT",
      details: `Submitted payment of ₹${totalPaid.toLocaleString("en-IN")} for lead "${lead.name}" (${lead.mobile}) via ${paymentMode?.name || "Mode"}. Serial: ${paymentSerialNo}.`,
      actorId: sessionUser.id,
      targetTeamId: lead.teamId || user?.teamId || undefined,
    });

    // Revalidate workspaces
    revalidatePath("/employee/leads");
    revalidatePath("/employee/payments");
    revalidatePath("/manager/leads");
    revalidatePath("/manager/history/payments");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/approvals/payments");
    revalidatePath("/admin/history/payments");

    return { success: true, paymentId: createdPayment.id };
  } catch (err) {
    return handleActionError(err, "Failed to submit payment.");
  }
}

/**
 * Returns payments raised for a specific lead (matching ViewPaymentModal Image 2).
 */
export async function getLeadPaymentsAction(
  leadId: string
): Promise<{ success: boolean; payments?: LeadPaymentViewItem[]; error?: string }> {
  try {
    await requireEmployeeSession({ redirect: false });

    if (!leadId) {
      return { success: false, error: "Lead ID is required." };
    }

    const payments = await prisma.payment.findMany({
      where: { leadId },
      orderBy: { paymentDate: "desc" },
      include: {
        createdBy: { select: { name: true } },
        paymentMode: { select: { name: true } },
      },
    });

    const items: LeadPaymentViewItem[] = payments.map((p) => {
      const rawStatus = (p.status || "PENDING").toUpperCase();
      const status =
        rawStatus === "APPROVED"
          ? "Approved"
          : rawStatus === "REJECTED"
            ? "Rejected"
            : "Pending";

      return {
        id: p.id,
        raisedByName: p.createdBy?.name || "Staff",
        amount: Number(p.amount),
        modeName: p.paymentMode?.name || p.modeName || "N/A",
        status,
        invoiceNumber: p.invoiceNumber || null,
        description: p.description,
        date: formatDisplayDate(p.paymentDate),
      };
    });

    return { success: true, payments: items };
  } catch (err) {
    return handleActionError(err, "Failed to load lead payments.");
  }
}

/**
 * Returns payments for Admin / Compliance Officer approval queue (Image 4).
 */
export async function getAdminApprovalPaymentsAction(params?: {
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  payments?: AdminApprovalPaymentItem[];
  pendingCount?: number;
  error?: string;
}> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    const statusFilter = params?.status?.trim() || "PENDING";
    const where: Prisma.PaymentWhereInput = {};

    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { lead: { name: { contains: q, mode: "insensitive" } } },
        { lead: { mobile: { contains: q } } },
        { lead: { email: { contains: q, mode: "insensitive" } } },
        { createdBy: { name: { contains: q, mode: "insensitive" } } },
        { transactionId: { contains: q, mode: "insensitive" } },
        { invoiceNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [payments, pendingCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
          paymentMode: { select: { name: true } },
          lead: {
            select: {
              name: true,
              mobile: true,
              email: true,
              pan: true,
              dob: true,
            },
          },
        },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

    const items: AdminApprovalPaymentItem[] = payments.map((p) => {
      const rawStatus = (p.status || "PENDING").toUpperCase();
      const status =
        rawStatus === "APPROVED"
          ? "Approved"
          : rawStatus === "REJECTED"
            ? "Rejected"
            : "Pending";

      return {
        id: p.id,
        raisedByName: p.createdBy?.name || "Staff",
        clientName: p.lead?.name || "Unknown",
        clientMobile: p.lead?.mobile || "N/A",
        clientEmail: p.lead?.email || null,
        pan: p.lead?.pan || null,
        dob: formatDob(p.lead?.dob),
        payment: Number(p.amount),
        modeName: p.paymentMode?.name || p.modeName || "N/A",
        transactionId: p.transactionId,
        invoiceNumber: p.invoiceNumber,
        description: p.description,
        paymentDate: formatDisplayDate(p.paymentDate),
        status,
        leadId: p.leadId,
      };
    });

    return {
      success: true,
      payments: items,
      pendingCount,
    };
  } catch (err) {
    return handleActionError(err, "Failed to load approval payments.");
  }
}

/**
 * Returns the count of pending payment approvals (used for notification badges).
 */
export async function getPendingPaymentsCountAction(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const session = await requireComplianceOrAdminSession({ redirect: false });
    if (!session) return { success: true, count: 0 };

    const count = await prisma.payment.count({
      where: { status: "PENDING" },
    });

    return { success: true, count };
  } catch {
    return { success: true, count: 0 };
  }
}

/**
 * Approves a single payment, marks it APPROVED, transitions lead to CLIENT,
 * and creates a linked Invoice record (Inv-XXXX) with inclusive 18% GST math.
 */
export async function approvePaymentAction({
  paymentId,
  comment,
}: {
  paymentId: string;
  comment?: string;
}): Promise<{ success: boolean; invoiceSerial?: string; error?: string }> {
  try {
    const sessionUser = await requireComplianceOrAdminSession({ redirect: false });

    if (!paymentId) {
      return { success: false, error: "Payment ID is required." };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lead: { select: { id: true, name: true, mobile: true, status: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    if (payment.status === "APPROVED") {
      return { success: false, error: "Payment has already been approved." };
    }

    // Generate unique sequential invoice serial number
    const nextInvoiceSerial = await generateNextInvoiceSerialNo();

    // Calculate inclusive 18% GST (118 rule)
    const totalAmount = Number(payment.amount);
    const baseAmount = Math.round(((totalAmount * 100) / 118) * 100) / 100;
    const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;

    // Plan duration & start date: parse From: YYYY-MM-DD from items in description or check renewal
    let startDate = payment.paymentDate;
    const fromDateMatch = payment.description?.match(/From:\s*(\d{4}-\d{2}-\d{2})/);
    if (fromDateMatch) {
      const parsedFrom = new Date(fromDateMatch[1]);
      if (!isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
      }
    } else {
      // Check if previous invoice ended recently
      const renewalCheck = await getLeadServiceRenewalAction({ leadId: payment.leadId });
      if (renewalCheck.success && renewalCheck.hasPreviousService && renewalCheck.hint && renewalCheck.recommendedStartDate) {
        const autoStart = new Date(renewalCheck.recommendedStartDate);
        if (!isNaN(autoStart.getTime())) {
          startDate = autoStart;
        }
      }
    }

    let durationDays = 30;
    let durationLabel = "30 Days";
    if (payment.description?.includes("Quarterly")) {
      durationDays = 90;
      durationLabel = "90 Days";
    } else if (payment.description?.includes("Half-Yearly")) {
      durationDays = 180;
      durationLabel = "180 Days";
    } else if (payment.description?.includes("Yearly")) {
      durationDays = 365;
      durationLabel = "365 Days";
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const updatedDescription = comment?.trim()
      ? `${payment.description ? payment.description + " | " : ""}Approval Comment: ${comment.trim()}`
      : payment.description;

    await prisma.$transaction(async (tx) => {
      // 1. Update Payment status to APPROVED and link invoiceNumber
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "APPROVED",
          invoiceNumber: nextInvoiceSerial,
          description: updatedDescription,
          updatedAt: new Date(),
        },
      });

      // 2. Transition linked lead to CLIENT status
      if (payment.lead.status !== "CLIENT") {
        await tx.lead.update({
          where: { id: payment.leadId },
          data: {
            status: "CLIENT",
            updatedAt: new Date(),
          },
        });
      }

      // 3. Create linked Invoice record (Initial Status: PENDING for Compliance/Admin invoice approval)
      await tx.invoice.create({
        data: {
          serialNo: nextInvoiceSerial,
          leadId: payment.leadId,
          createdById: sessionUser.id,
          assignedToId: payment.leadOwnerId || payment.leadAddedById || sessionUser.id,
          teamId: payment.teamId,
          productName: "Advisory Service Package",
          planType: payment.paymentType || "Monthly",
          durationLabel,
          startDate,
          endDate,
          invoiceDate: new Date(),
          baseAmount: new Prisma.Decimal(baseAmount.toFixed(2)),
          gstAmount: new Prisma.Decimal(gstAmount.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          status: "PENDING",
          mailStatus: "Mail Not Sent",
        },
      });
    });

    // Log activity
    await logActivity({
      action: "APPROVE_PAYMENT",
      details: `Approved payment of ₹${totalAmount.toLocaleString("en-IN")} for lead "${payment.lead.name}" (${payment.lead.mobile}). Generated Invoice: ${nextInvoiceSerial}. Lead status transitioned to CLIENT.`,
      actorId: sessionUser.id,
      targetTeamId: payment.teamId || undefined,
    });

    await logActivity({
      action: "INVOICE_GENERATED",
      details: `[Invoice: ${nextInvoiceSerial}] Generated automatically from Payment ${payment.serialNo || payment.id} approval of ₹${totalAmount.toLocaleString("en-IN")}. Status: PENDING review.`,
      actorId: sessionUser.id,
      targetTeamId: payment.teamId || undefined,
    });

    // Revalidate workspaces
    revalidatePath("/admin/approvals/payments");
    revalidatePath("/admin/approvals/invoices");
    revalidatePath("/admin/history/payments");
    revalidatePath("/admin/history/invoices");
    revalidatePath("/admin/leads");
    revalidatePath("/manager/history/payments");
    revalidatePath("/manager/history/invoices");
    revalidatePath("/manager/leads");
    revalidatePath("/employee/payments");
    revalidatePath("/employee/invoices");
    revalidatePath("/employee/leads");

    return { success: true, invoiceSerial: nextInvoiceSerial };
  } catch (err) {
    return handleActionError(err, "Failed to approve payment.");
  }
}

/**
 * Denies/rejects a payment with comment.
 */
export async function denyPaymentAction({
  paymentId,
  comment,
}: {
  paymentId: string;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await requireComplianceOrAdminSession({ redirect: false });

    if (!paymentId) {
      return { success: false, error: "Payment ID is required." };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    const updatedDescription = comment?.trim()
      ? `${payment.description ? payment.description + " | " : ""}Denial Reason: ${comment.trim()}`
      : payment.description;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        description: updatedDescription,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await logActivity({
      action: "REJECT_PAYMENT",
      details: `Denied payment of ₹${Number(payment.amount).toLocaleString("en-IN")} for lead "${payment.lead.name}" (${payment.lead.mobile}). Reason: ${comment?.trim() || "No comment provided"}.`,
      actorId: sessionUser.id,
      targetTeamId: payment.teamId || undefined,
    });

    // Revalidate workspaces
    revalidatePath("/admin/approvals/payments");
    revalidatePath("/admin/history/payments");
    revalidatePath("/manager/history/payments");
    revalidatePath("/employee/payments");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to deny payment.");
  }
}

/**
 * Batch approve multiple payments.
 */
export async function batchApprovePaymentsAction(
  items: { paymentId: string; comment?: string }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    if (!items || items.length === 0) {
      return { success: false, error: "No payments selected." };
    }

    let successCount = 0;
    for (const item of items) {
      const res = await approvePaymentAction({
        paymentId: item.paymentId,
        comment: item.comment,
      });
      if (res.success) successCount++;
    }

    return { success: true, count: successCount };
  } catch (err) {
    return handleActionError(err, "Failed to batch approve payments.");
  }
}

/**
 * Batch deny multiple payments.
 */
export async function batchDenyPaymentsAction(
  items: { paymentId: string; comment?: string }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireComplianceOrAdminSession({ redirect: false });

    if (!items || items.length === 0) {
      return { success: false, error: "No payments selected." };
    }

    let successCount = 0;
    for (const item of items) {
      const res = await denyPaymentAction({
        paymentId: item.paymentId,
        comment: item.comment,
      });
      if (res.success) successCount++;
    }

    return { success: true, count: successCount };
  } catch (err) {
    return handleActionError(err, "Failed to batch deny payments.");
  }
}
