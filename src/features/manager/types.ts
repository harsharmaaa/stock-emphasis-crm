export interface ManagerLeadReminder {
  id: string;
  name: string;
  mobile: string;
  callbackDate: string;
  leadResponse: string | null;
  leadSource: string | null;
  assignedToName: string | null;
}

export interface ManagerPaymentItem {
  id: string;
  serialNo: string | null;
  amount: number;
  status: string;
  paymentDate: string;
  modeName: string | null;
  paymentType: string | null;
  leadName: string;
  leadMobile: string;
  ownerName: string | null;
}

export interface ManagerEventItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actorName: string | null;
  targetName: string | null;
}

export interface ManagerTargetData {
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  daysLeftInMonth: number;
}

export interface ManagerPaymentData {
  todayApprovedAmount: number;
  yesterdayApprovedAmount: number;
  totalApprovedCount: number;
  totalApprovedAmount: number;
  todayApprovedCount: number;
  lastPaymentAmount: number;
  lastPaymentDaysAgo: number | null;
}

export interface ManagerClientsData {
  totalClients: number;
  newThisMonth: number;
  activeClients: number;
  expiredClients: number;
}

export interface ManagerCallbacksData {
  totalCallbacks: number;
  todayCallbacks: number;
  pendingCallbacks: number;
  upcomingCallbacks: number;
}

export interface ManagerFollowupsData {
  totalFollowups: number;
  newFollowups: number;
  pendingFollowups: number;
  updatedFollowups: number;
}

export interface ManagerTodayActivityData {
  allotedToday: number;
  transferredToday: number;
  fetchedToday: number;
  updatedToday: number;
}

export interface ManagerLeadStatusStripData {
  unreadCount: number;
  readCount: number;
  followupCount: number;
  clientCount: number;
  totalLeadsCount: number;
}

export interface ManagerRemindersTabData {
  leadReminders: ManagerLeadReminder[];
  recentPayments: ManagerPaymentItem[];
  recentEvents: ManagerEventItem[];
}

export interface ManagerDashboardFilterOption {
  id: string;
  name: string;
  teamId?: string | null;
}

export interface ManagerFollowupRecord {
  id: string;
  dateKey: string; // e.g. "2026-11-27"
  formattedDate: string; // e.g. "27 Nov 26"
  allotToId: string | null;
  teamId: string | null;
}

export interface ManagerFetchRecord {
  id: string;
  source: string;
  leadsCount: number;
  createdAt: string;
  isToday: boolean;
  userId: string;
  teamId: string | null;
}

export interface ManagerSourceRuleData {
  source: string;
  fetchLimit: number;
  availableLimit: number;
  fetchCount: number;
}

export interface ManagerDailyPaymentRecord {
  id: string;
  amount: number;
  dateKey: string; // e.g. "2026-11-27"
  formattedDate: string; // e.g. "27 Nov 26"
  leadOwnerId: string | null;
  teamId: string | null;
}

export interface ManagerCallingRecord {
  id: string;
  durationSeconds: number;
  talkTimeSeconds: number;
  isConnected: boolean;
  dateKey: string;
  formattedDate: string;
  callerId: string;
  teamId: string | null;
}

export interface ManagerLeadReportItem {
  id: string;
  name: string;
  mobile: string;
  leadSource: string | null;
  status: string;
  leadResponse: string | null;
  allotToId: string | null;
  allotToName: string | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerEmployeePerformanceItem {
  id: string;
  name: string;
  teamName: string | null;
  assignedLeads: number;
  followups: number;
  fetches: number;
  salesAmount: number;
}

export interface ManagerLeadBalanceSummary {
  totalLeads: number;
  unallottedLeads: number;
  allottedLeads: number;
  activeRulesCount: number;
  totalAvailableFetchQuota: number;
}

export interface ManagerLeadReportSectionData {
  allLeads: ManagerLeadReportItem[];
  performance: ManagerEmployeePerformanceItem[];
  balance: ManagerLeadBalanceSummary;
}

export interface ManagerChartsData {
  employees: ManagerDashboardFilterOption[];
  teams: ManagerDashboardFilterOption[];
  followupRecords: ManagerFollowupRecord[];
  fetchRecords: ManagerFetchRecord[];
  sourceRules: ManagerSourceRuleData[];
  knownSources: string[];
  dailyPayments: ManagerDailyPaymentRecord[];
  callingRecords: ManagerCallingRecord[];
}

export interface ManagerPerformerBarItem {
  id: string;
  name: string;
  profileName: string | null;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  leadsHandled: number;
  metricValue: number;
}

export interface ManagerConfiguredLeaderboardSection {
  id: string;
  title: string;
  profile: string;
  size: number;
  type: "Individual" | "Team";
  items: ManagerPerformerBarItem[];
}

export interface ManagerLeaderboardsData {
  configuredCards: ManagerConfiguredLeaderboardSection[];
  topBestSBA: ManagerPerformerBarItem[];
  topBestBA: ManagerPerformerBarItem[];
}

export interface ManagerOverviewStep1Data {
  managerName: string;
  managerRole: string;
  teamNames: string[];
  totalTeamsLed: number;
  totalSubordinates: number;
  target: ManagerTargetData;
  payment: ManagerPaymentData;
  clients: ManagerClientsData;
  callbacks: ManagerCallbacksData;
  followups: ManagerFollowupsData;
  todayActivity: ManagerTodayActivityData;
  leadStatusStrip: ManagerLeadStatusStripData;
  remindersTab: ManagerRemindersTabData;
  charts: ManagerChartsData;
  leadReport: ManagerLeadReportSectionData;
  leaderboards: ManagerLeaderboardsData;
}
