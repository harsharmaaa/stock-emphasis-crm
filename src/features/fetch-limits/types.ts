export interface ProfileRef {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
}

export interface EmployeeRef {
  id: string;
  name: string;
  username: string | null;
  email: string;
  employeeProfileId: string | null;
  employeeProfileName: string | null;
}

export interface EmployeeUsageSummary {
  userId: string;
  userName: string;
  successfulFetches: number;
  lastFetchedAt: string | null;
  resetAt: string | null;
}

export interface FetchLimitRuleItem {
  id: string;
  availableLimit: number;
  fetchLimit: number;
  fetchCount: number;
  leadSource: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;

  profiles: ProfileRef[];
  assignedUsers: EmployeeRef[];
  usages: EmployeeUsageSummary[];
  totalFetchesUsed: number;
}

export interface FetchLimitFormData {
  profiles: ProfileRef[];
  employees: EmployeeRef[];
  leadSources: readonly string[];
}

export interface CreateFetchLimitInput {
  availableLimit: number;
  fetchLimit: number;
  fetchCount: number;
  leadSource: string;
  profileIds: string[];
  assignedUserIds?: string[];
}

export interface UpdateFetchLimitInput {
  ruleId: string;
  availableLimit: number;
  fetchLimit: number;
  fetchCount: number;
  leadSource: string;
  profileIds: string[];
  assignedUserIds?: string[];
  resetUsageForUserIds?: string[]; // Optional user IDs whose fetch count usage should be reset
}

