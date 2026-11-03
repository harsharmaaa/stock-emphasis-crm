export interface LeadSourceItem {
  id: string;
  name: string;
  description: string | null;
  createdById: string | null;
  createdByName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadSourceInput {
  name: string;
  description?: string;
}

export interface UpdateLeadSourceInput {
  id: string;
  name: string;
  description?: string;
}

