export type MonitoriaSummary = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  signedIn30d: number;
  neverSignedIn: number;
  vipUsers: number;
  standardUsers: number;
  organizations: number;
  cameras: number;
  payingOrganizationsMonth: number;
};
export type MonitoriaOrganization = {
  id: string;
  name: string;
  role: string;
  vip: boolean;
  cameras: number;
  vipCameras: number;
  standardCameras: number;
  plans: string[];
};
export type MonitoriaAccount = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  organizations: MonitoriaOrganization[];
};
export type MonitoriaBillingAccount = {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  email: string | null;
  vip: boolean;
  paidMonthCents: number;
  paymentsMonth: number;
  lastPaidAt: string | null;
};
export type MonitoriaDirectory = {
  summary?: MonitoriaSummary;
  items: (MonitoriaAccount | MonitoriaBillingAccount)[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
};
export type MonitoriaOverview = {
  available: boolean;
  error: string | null;
  summary: MonitoriaSummary | null;
};
