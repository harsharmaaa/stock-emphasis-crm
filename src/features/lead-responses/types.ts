export interface LeadResponseItem {
  id: string;
  name: string;
  description: string | null;
  createdById: string | null;
  createdByName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadResponseInput {
  name: string;
  description?: string;
}

export interface UpdateLeadResponseInput {
  id: string;
  name: string;
  description?: string;
}

