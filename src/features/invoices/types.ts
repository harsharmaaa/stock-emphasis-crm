export interface AdminApprovalInvoiceItem {
  id: string;
  serialNo: string;
  leadId: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  pan: string | null;
  dob: string | null;
  clientState?: string | null;
  clientGstin?: string | null;
  latestNote?: string | null;
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
  comment?: string | null;
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
  gstType?: "CGST_SGST" | "IGST";
  notes?: string;
}

export interface InvoiceHistoryItem {
  id: string;
  serialNo: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  leadId: string;
  pan: string | null;
  dob: string | null;
  clientState: string | null;
  clientGstin: string | null;
  productName: string;
  productId: string | null;
  planType: string;
  durationLabel: string;
  startDate: string | null;
  endDate: string | null;
  invoiceDate: string; // Formatted e.g. "03-Nov-26"
  rawInvoiceDate: string; // ISO string
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: string; // "Approved", "Pending", "Cancelled"
  mailStatus: string | null; // "Mail Sent", "Mail Not Sent"
  comment: string | null;
  createdByName: string;
  createdById: string;
  assignedToName: string | null;
  assignedToId: string | null;
  teamName: string | null;
  profile: string | null;
  createdAt: string;
}

export interface GetInvoiceHistoryFilterOptions {
  profiles: string[];
  employees: { id: string; name: string }[];
  products: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  statuses: string[];
}

export interface GetInvoiceHistoryInput {
  profile?: string;
  employeeId?: string;
  productId?: string;
  teamId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "invoiceDate" | "totalAmount" | "serialNo" | "clientName" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface GetInvoiceHistoryResult {
  success: boolean;
  invoices?: InvoiceHistoryItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  totalAmount?: number;
  uniqueClientCount?: number;
  pendingCount?: number;
  approvedCount?: number;
  error?: string;
}
