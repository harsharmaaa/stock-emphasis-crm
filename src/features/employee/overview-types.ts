export interface EmployeeLeadReminder {
  id: string;
  name: string;
  mobile: string;
  callbackDate: string;
  leadResponse: string | null;
  leadSource: string | null;
}

export interface EmployeePaymentItem {
  id: string;
  serialNo: string | null;
  amount: number;
  status: string;
  paymentDate: string;
  modeName: string | null;
  paymentType: string | null;
  leadName: string;
  leadMobile: string;
}

export interface EmployeeEventItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actorName: string | null;
  targetName: string | null;
}

export interface EmployeeTargetMilestone {
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  daysLeftInMonth: number;
}

export interface EmployeePaymentCardData {
  todayApprovedAmount: number;
  todayApprovedCount: number;
  lastPaymentAmount: number;
  lastPaymentDaysAgo: number | null;
  totalApprovedCount: number;
}

export interface EmployeeClientsCardData {
  newThisMonth: number;
  activeClients: number;
  expiredClients: number;
  totalClients: number;
}

export interface EmployeeCallbackCardData {
  pendingCallbacks: number;
  todayCallbacks: number;
  upcomingCallbacks: number;
  totalCallbacks: number;
}

export interface EmployeeFollowupsCardData {
  newFollowups: number;
  pendingFollowups: number;
  updatedFollowups: number;
  totalFollowups: number;
}

export interface EmployeeTodayActivityData {
  allotedToday: number;
  transferredToday: number;
  fetchedToday: number;
  updatedToday: number;
}

export interface EmployeeLeadStatusStripData {
  unreadCount: number;
  readCount: number;
  followupCount: number;
  clientCount: number;
  totalLeadsCount: number;
}

export interface EmployeeRemindersTabData {
  leadReminders: EmployeeLeadReminder[];
  recentPayments: EmployeePaymentItem[];
  recentEvents: EmployeeEventItem[];
  announcementBanner: string | null;
}

export interface EmployeeProfileQuotaData {
  profileName: string | null;
  profileDescription: string | null;
  salesLimit: number;
  clientLimit: number;
  invoiceLimit: number;
  conversionRatePercent: number;
  totalAssignedLeads: number;
  totalClients: number;
  roleCode?: string;
}

export interface EmployeeFollowupPoint {
  key: string;
  label: string;
  count: number;
}

export interface EmployeeFetchSourcePoint {
  source: string;
  fetchLimit: number;
  todayFetched: number;
  totalFetched: number;
}

export interface EmployeeDailyPaymentPoint {
  key: string;
  label: string;
  amount: number;
}

export interface EmployeeCallingPoint {
  key: string;
  label: string;
  hours: number;
  connectedCalls: number;
}

export interface EmployeeChartsData {
  followupPoints: EmployeeFollowupPoint[];
  fetchPoints: EmployeeFetchSourcePoint[];
  paymentPoints: EmployeeDailyPaymentPoint[];
  callingPoints: EmployeeCallingPoint[];
}

// Step 3 Types: Tabbed Reports
export interface EmployeeLeadReportItem {
  id: string;
  name: string;
  mobile: string;
  leadSource: string | null;
  status: string;
  leadResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeMonthlySalesItem {
  id: string;
  serialNo: string | null;
  amount: number;
  status: string;
  paymentDate: string;
  modeName: string | null;
  paymentType: string | null;
  invoiceNumber: string | null;
  transactionId: string | null;
  leadName: string;
  leadMobile: string;
}

export interface EmployeePersonalPerformanceData {
  assignedLeadsCount: number;
  followupsCount: number;
  fetchesCount: number;
  approvedSalesAmount: number;
  targetAmount: number;
  achievementPercent: number;
  conversionRatePercent: number;
  activeClientsCount: number;
}

export interface EmployeeTabbedReportsData {
  leads: EmployeeLeadReportItem[];
  sources: string[];
  sales: EmployeeMonthlySalesItem[];
  performance: EmployeePersonalPerformanceData;
}

export interface EmployeeOverviewStep1Data {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  teamName: string | null;
  departmentName: string | null;
  target: EmployeeTargetMilestone;
  payment: EmployeePaymentCardData;
  clients: EmployeeClientsCardData;
  callbacks: EmployeeCallbackCardData;
  followups: EmployeeFollowupsCardData;
  todayActivity: EmployeeTodayActivityData;
  leadStatusStrip: EmployeeLeadStatusStripData;
  remindersTab: EmployeeRemindersTabData;
  quotaProgress: EmployeeProfileQuotaData;
  charts: EmployeeChartsData;
  tabbedReports: EmployeeTabbedReportsData;
  leaderboards: ConfiguredLeaderboardSection[];
}

export interface PerformerBarItem {
  id: string;
  name: string;
  profileName: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsHandled: number;
  metricValue: number;
}

export interface ConfiguredLeaderboardSection {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: "Individual" | "Team";
  items: PerformerBarItem[];
}
