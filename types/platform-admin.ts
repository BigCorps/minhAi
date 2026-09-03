import type { PlatformAppKey } from '@/lib/platform-products';

export type PlatformUserStatus =
  | 'online'
  | 'today'
  | 'recent'
  | 'idle'
  | 'inactive'
  | 'never';

export type PlatformUsersSort =
  | 'last_seen_desc'
  | 'created_desc'
  | 'created_asc'
  | 'name_asc';

export type AdminDashboardSummary = {
  totalUsers: number;
  onlineNow: number;
  active24h: number;
  active7d: number;
  active30d: number;
  inactive30d: number;
  neverUsed: number;
  newUsers7d: number;
  newUsers30d: number;
};

export type AdminAppSummary = {
  appKey: PlatformAppKey;
  users: number;
  active7d: number;
  active30d: number;
  pageViews30d: number;
  activeMinutes30d: number;
  lastSeenAt: string | null;
};

export type AdminDailyActivity = {
  date: string;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  activeMinutes: number;
};

export type AdminDashboardSnapshot = {
  summary: AdminDashboardSummary;
  apps: AdminAppSummary[];
  daily: AdminDailyActivity[];
  generatedAt: string;
};

export type AdminUserAppBadge = {
  appKey: PlatformAppKey;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  activeDays30d: number;
};

export type AdminUserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  lastAppKey: PlatformAppKey | null;
  status: PlatformUserStatus;
  appCount: number;
  activeDays30d: number;
  apps: AdminUserAppBadge[];
};

export type AdminUsersPage = {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
};

export type AdminUserAppActivity = {
  appKey: PlatformAppKey;
  source: 'tracker' | 'historical' | 'tracker+historical';
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  pageViews: number;
  activeMinutes: number;
  activeDays30d: number;
};

export type AdminUserRecentActivity = {
  date: string;
  appKey: PlatformAppKey;
  pageViews: number;
  activeMinutes: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

export type AdminKeyCount = {
  key: string;
  label?: string | null;
  count: number;
};

export type AdminUserDetail = {
  account: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    providers: string[];
    deletedAt: string | null;
  };
  activity: {
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    lastAppKey: PlatformAppKey | null;
    status: PlatformUserStatus;
    activeDays30d: number;
    apps: AdminUserAppActivity[];
    recent: AdminUserRecentActivity[];
  };
  accountUsage: {
    companies: number;
    activeCompanies: number;
    availableCredits: number | null;
    totalCreditsUsed: number | null;
    hasActivePlan: boolean | null;
    activePlanName: string | null;
    planExpiresAt: string | null;
  };
  products: {
    minhai: {
      detected: boolean;
      historical: boolean;
      companies: number;
      activeCompanies: number;
      conversations: number;
      messages: number;
      functionExecutions: number;
      creditsConsumed: number;
      enabledFunctions: number;
      metaConnections: number;
      mcpConnections: number;
      lastFunctionAt: string | null;
    };
    minia: {
      detected: boolean;
      historical: boolean;
      trackingStarted: boolean;
      note: string;
    };
    artefinal: {
      detected: boolean;
      historical: boolean;
      executions: number;
      creditsConsumed: number;
      lastExecutionAt: string | null;
      tools: AdminKeyCount[];
    };
    pixwiki: {
      detected: boolean;
      historical: boolean;
      plan: string | null;
      subscriptionStatus: string | null;
      periodEnd: string | null;
      companies: number;
      receipts: number;
      receivedAmountCents: number;
      lastReceiptAt: string | null;
      webhooks: number;
      apiKeys: number;
    };
    consultatec: {
      detected: boolean;
      historical: boolean;
      consultations: number;
      paidConsultations: number;
      totalCost: number;
      lastConsultationAt: string | null;
      types: AdminKeyCount[];
    };
    conviteia: {
      detected: boolean;
      historical: boolean;
      plan: string | null;
      planExpiresAt: string | null;
      events: number;
      publishedEvents: number;
      archivedEvents: number;
      giftPayments: number;
      giftRevenueCents: number;
      lastEventAt: string | null;
    };
    melhoria: {
      detected: boolean;
      historical: boolean;
      profileExists: boolean;
      onboardingCompleted: boolean | null;
      googleConnected: boolean;
      profileCreatedAt: string | null;
      note: string;
    };
    funcionaria: {
      detected: boolean;
      historical: boolean;
      companies: number;
      onboardingCompleted: number;
      subscriptionStatus: string | null;
      periodEnd: string | null;
      activeSkills: string[];
      selectedSkills: string[];
      usageEvents: number;
      creditsConsumed: number;
    };
  };
  generatedAt: string;
};
