import { requireAdminSession } from "@/src/lib/auth-guard";
import { getPaymentModesAction } from "@/src/features/payment-modes/actions";
import { PaymentModesClient } from "@/src/features/payment-modes/payment-modes-client";

export const instant = false;

export const metadata = {
  title: "Payment Modes | Stock Emphasis CRM",
  description: "Configure payment modes, transaction charges, GSTIN, and invoice prefixes.",
};

export default async function PaymentModesPage() {
  await requireAdminSession();

  const res = await getPaymentModesAction();

  return <PaymentModesClient initialModes={res.paymentModes ?? []} />;
}

