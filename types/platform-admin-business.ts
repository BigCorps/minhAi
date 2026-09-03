import type { PlatformAppKey } from '@/lib/platform-products';

export type FinanceProductKey = PlatformAppKey | 'shared_credits';

export type AdminIdentity = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type AdminFinanceSnapshot = {
  summary: {
    revenueTodayCents: number;
    revenueMonthCents: number;
    revenue30dCents: number;
    mrrCents: number;
    payingCustomers: number;
    avgTicketCents: number;
    paidPaymentsMonth: number;
    pendingPayments: number;
    failedPayments30d: number;
    processedVolumeMonthCents: number;
  };
  products: Array<{
    productKey: FinanceProductKey;
    revenueMonthCents: number;
    revenue30dCents: number;
    paymentsMonth: number;
    mrrCents: number;
    activeSubscriptions: number;
  }>;
  daily: Array<{
    date: string;
    revenueCents: number;
    payments: number;
  }>;
  recentPayments: Array<{
    id: string;
    productKey: FinanceProductKey;
    userId: string | null;
    email: string | null;
    name: string | null;
    amountCents: number;
    kind: string;
    source: string;
    paidAt: string;
  }>;
  processed: {
    pixwikiVolumeMonthCents: number;
    pixwikiReceiptsMonth: number;
    conviteiaGiftVolumeMonthCents: number;
    conviteiaGiftPaymentsMonth: number;
  };
  generatedAt: string;
};

export type AdminOpenAICostSnapshot = {
  configured: boolean;
  available: boolean;
  costMonthUsdCents: number | null;
  spendLimitUsdCents: number | null;
  remainingUntilLimitUsdCents: number | null;
  enforcementStatus: string | null;
  currency: 'usd';
  daily: Array<{ date: string; costUsdCents: number }>;
  lineItems: Array<{ label: string; costUsdCents: number }>;
  errorCode?: string;
};

export type AdminCostsSnapshot = {
  summary: {
    databaseBytes: number;
    functionExecutions30d: number;
    functionCredits30d: number;
    funcionariaUsageEvents30d: number;
    funcionariaCredits30d: number;
    pixwikiApiRequests30d: number;
    pixwikiApiErrors30d: number;
    llmMessages30d: number;
    llmTokens30d: number;
    recordedLlmCostUsdMicros: number;
    trackedCostBrlCents: number;
    trackedCostUsdMicros: number;
    configuredFixedCostBrlCents: number;
    configuredBudgetBrlCents: number;
  };
  providers: Array<{
    key: string;
    label: string;
    requests: number;
    credits: number;
    units: number;
    costBrlCents: number;
    costUsdMicros: number;
    monthlyFixedBrlCents: number;
    monthlyBudgetBrlCents: number | null;
    lastSeenAt: string | null;
    status: 'ok' | 'warning' | 'untracked';
  }>;
  daily: Array<{
    date: string;
    functionExecutions: number;
    credits: number;
    apiRequests: number;
    trackedCostBrlCents: number;
  }>;
  openai: AdminOpenAICostSnapshot;
  generatedAt: string;
};

export type AdminMarginSnapshot = {
  summary: {
    revenueMonthCents: number;
    knownCostMonthCents: number;
    contributionMonthCents: number;
    marginPct: number | null;
    productsWithCostData: number;
    customersWithCostData: number;
  };
  products: Array<{
    productKey: FinanceProductKey;
    revenueCents: number;
    knownCostCents: number;
    contributionCents: number;
    marginPct: number | null;
    payments: number;
    costEvents: number;
  }>;
  customers: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    revenueCents: number;
    knownCostCents: number;
    contributionCents: number;
    marginPct: number | null;
    costEvents: number;
  }>;
  sharedKnownCostCents: number;
  note: string;
  openai: AdminOpenAICostSnapshot;
  generatedAt: string;
};

export type AdminAttentionItem = {
  id: string;
  category: 'retention' | 'financial' | 'commercial' | 'technical' | 'consumption';
  severity: 'high' | 'medium' | 'low';
  userId: string | null;
  email: string | null;
  name: string | null;
  productKey: FinanceProductKey | null;
  title: string;
  detail: string;
  amountCents: number | null;
  occurredAt: string;
  href: string | null;
};

export type AdminAttentionSnapshot = {
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    retention: number;
    financial: number;
    commercial: number;
    technical: number;
    consumption: number;
  };
  items: AdminAttentionItem[];
  generatedAt: string;
};

export type AdminNowSnapshot = {
  summary: {
    onlineNow: number;
    onlineUsers: number;
    onlineApps: number;
    newUsers24h: number;
    logins24h: number;
    payments24h: number;
    revenue24hCents: number;
  };
  onlineByApp: Array<{
    appKey: PlatformAppKey;
    users: number;
  }>;
  onlineUsers: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    appKey: PlatformAppKey;
    lastSeenAt: string;
    lastPath: string | null;
    lastHost: string | null;
  }>;
  feed: Array<{
    id: string;
    type: 'activity' | 'login' | 'signup' | 'payment';
    occurredAt: string;
    productKey: FinanceProductKey | null;
    userId: string | null;
    email: string | null;
    name: string | null;
    title: string;
    detail: string | null;
    amountCents: number | null;
  }>;
  generatedAt: string;
};
