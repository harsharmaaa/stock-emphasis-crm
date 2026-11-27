export interface PaymentFormProduct {
  id: string;
  name: string;
  monthlyPrice: number | null;
  quarterlyPrice: number | null;
  halfYearlyPrice: number | null;
  yearlyPrice: number | null;
  pricingWithGst: boolean;
}

export interface PaymentFormMode {
  id: string;
  name: string;
  charges: number;
}

export interface PaymentItemInput {
  productId: string;
  productName?: string;
  pack: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | string;
  serviceRate: number;
  discount: number;
  adjustment: number;
  paid: number;
  fromDate: string;
}

export interface CreatePaymentInput {
  leadId: string;
  paymentModeId: string;
  paymentDate: string;
  transactionId?: string;
  paymentType?: string;
  description?: string;
  items: PaymentItemInput[];
}

export interface LeadPaymentViewItem {
  id: string;
  raisedByName: string;
  amount: number;
  modeName: string;
  status: string;
  invoiceNumber: string | null;
  description: string | null;
  date: string;
}

export interface AdminApprovalPaymentItem {
  id: string;
  raisedByName: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  pan: string | null;
  dob: string | null;
  payment: number;
  modeName: string;
  transactionId: string | null;
  invoiceNumber: string | null;
  description: string | null;
  comment?: string;
  paymentDate: string;
  status: string;
  leadId: string;
}

export interface PaymentHistoryItem {
  id: string;
  serialNo: string;
  leadAddedByName: string;
  paymentAddedByName: string;
  leadOwnerName: string;
  clientName: string;
  clientMobile: string;
  leadId: string;
  amount: number;
  modeName: string;
  paymentModeId: string | null;
  transactionId: string;
  status: string; // e.g. "Approved", "Pending", "Rejected"
  invoiceNumber: string;
  description: string;
  paymentDate: string; // Formatted date e.g. "03-Nov-26"
  rawPaymentDate: string; // ISO date
  leadSource: string;
  paymentType: string;
  teamName: string;
  createdAt: string;
}

export interface GetPaymentHistoryFilterOptions {
  statuses: string[];
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  paymentModes: { id: string; name: string }[];
  leadSources: string[];
  paymentTypes: string[];
}

export interface GetPaymentHistoryInput {
  fromDate?: string;
  toDate?: string;
  status?: string;
  leadAddedById?: string;
  paymentAddedById?: string;
  leadOwnerId?: string;
  teamId?: string;
  paymentModeId?: string;
  leadSource?: string;
  invoiceId?: string;
  paymentType?: string;
  search?: string;
  sortBy?: "paymentDate" | "amount" | "status" | "clientName" | "serialNo" | "invoiceNumber" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface GetPaymentHistoryResult {
  success: boolean;
  payments?: PaymentHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  totalAmount?: number;
  uniqueClientCount?: number;
  error?: string;
}

export interface LeadServiceRenewalResult {
  success: boolean;
  hasPreviousService?: boolean;
  previousEndDate?: string | null;
  previousEndDisplay?: string | null;
  recommendedStartDate?: string;
  hint?: string | null;
  error?: string;
}
