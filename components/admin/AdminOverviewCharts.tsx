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
import type {
  AdminAppSummary,
  AdminDailyActivity,
} from '@/types/platform-admin';

function compactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function dayLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function tooltipLabel(value: unknown) {
  if (typeof value !== 'string') return String(value ?? '');
  return dayLabel(value);
}

export function DailyActivityChart({
  daily,
}: {
  daily: AdminDailyActivity[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={daily}
          margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="adminActiveUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3e635" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#a3e635" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(148,163,184,0.10)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            minTickGap={22}
          />
          <YAxis
            allowDecimals={false}
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={compactNumber}
          />
          <Tooltip
            labelFormatter={tooltipLabel}
            contentStyle={{
              background: '#0f172a',
              border: '1px solid rgba(148,163,184,0.18)',
              borderRadius: 14,
              color: '#f8fafc',
            }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Area
            type="monotone"
            dataKey="activeUsers"
            name="Usuários ativos"
            stroke="#a3e635"
            strokeWidth={2.4}
            fill="url(#adminActiveUsers)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AppsDistributionChart({
  apps,
}: {
  apps: AdminAppSummary[];
}) {
  const data = apps.map((app) => ({
    ...app,
    label: PLATFORM_APPS[app.appKey]?.shortLabel ?? app.appKey,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 18, bottom: 0 }}
        >
          <CartesianGrid
            stroke="rgba(148,163,184,0.10)"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={86}
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.05)' }}
            contentStyle={{
              background: '#0f172a',
              border: '1px solid rgba(148,163,184,0.18)',
              borderRadius: 14,
              color: '#f8fafc',
            }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Bar
            dataKey="users"
            name="Usuários identificados"
            fill="#84cc16"
            radius={[0, 8, 8, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
