export interface PaymentModeItem {
  id: string;
  name: string;
  charges: number;
  gstin: string | null;
  state: string | null;
  invoicePrefix: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentModeInput {
  name: string;
  charges?: number | string;
  gstin?: string;
  state?: string;
  invoicePrefix?: string;
}

export interface UpdatePaymentModeInput extends CreatePaymentModeInput {
  id: string;
}

