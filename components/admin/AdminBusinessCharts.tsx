'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PLATFORM_APPS } from '@/lib/platform-products';
import type { AdminFinanceSnapshot, AdminMarginSnapshot, FinanceProductKey } from '@/types/platform-admin-business';
import { money } from './AdminBusinessUi';

const LABELS: Record<FinanceProductKey, string> = {
  ...Object.fromEntries(Object.entries(PLATFORM_APPS).map(([key, value]) => [key, value.label])),
  shared_credits: 'Créditos compartilhados',
} as Record<FinanceProductKey, string>;

export function RevenueDailyChart({ daily }: { daily: AdminFinanceSnapshot['daily'] }) {
  const data = daily.map((row) => ({ ...row, label: row.date.slice(5).split('-').reverse().join('/') }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${Math.round(Number(v) / 100)}`} width={58} />
          <Tooltip formatter={(v) => [money(Number(v)), 'Receita']} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
          <Area type="monotone" dataKey="revenueCents" stroke="currentColor" fill="currentColor" fillOpacity={0.08} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductRevenueChart({ products }: { products: AdminFinanceSnapshot['products'] }) {
  const data = products.filter((p) => p.revenueMonthCents > 0).map((p) => ({ label: LABELS[p.productKey], value: p.revenueMonthCents }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.08)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="label" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={135} />
          <Tooltip formatter={(v) => [money(Number(v)), 'Receita']} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
          <Bar dataKey="value" fill="currentColor" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarginProductsChart({ products }: { products: AdminMarginSnapshot['products'] }) {
  const data = products.filter((p) => p.revenueCents > 0 || p.knownCostCents > 0).map((p) => ({ label: LABELS[p.productKey], value: p.contributionCents }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.08)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="label" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={135} />
          <Tooltip formatter={(v) => [money(Number(v)), 'Contribuição']} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
          <Bar dataKey="value" fill="currentColor" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
