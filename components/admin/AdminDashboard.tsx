'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  CalendarClock,
  CircleUserRound,
  Clock3,
  RefreshCw,
  Sparkles,
  UserPlus,
  UsersRound,
  Wifi,
} from 'lucide-react';

import {
  PLATFORM_APPS,
  type PlatformAppKey,
} from '@/lib/platform-products';
import type {
  AdminDashboardSnapshot,
  AdminUsersPage,
  PlatformUsersSort,
  PlatformUserStatus,
} from '@/types/platform-admin';
import {
  AppsDistributionChart,
  DailyActivityChart,
} from './AdminOverviewCharts';
import AdminHeader from './AdminHeader';
import AdminHomeBusinessPulse from './AdminHomeBusinessPulse';
import AdminUsersTable, {
  type UsersFilters,
} from './AdminUsersTable';

type AdminIdentity = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type Props = {
  admin: AdminIdentity;
  basePath: '' | '/admin';
};

const INITIAL_FILTERS: UsersFilters = {
  search: '',
  app: '',
  status: '',
  sort: 'last_seen_desc',
  page: 1,
  perPage: 25,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function formatGeneratedAt(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function apiErrorMessage(status: number, fallback: string) {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 503) {
    return 'A estrutura administrativa ainda não está disponível no banco.';
  }
  return fallback;
}

export default function AdminDashboard({ admin, basePath }: Props) {
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [users, setUsers] = useState<AdminUsersPage | null>(null);
  const [filters, setFilters] = useState<UsersFilters>(INITIAL_FILTERS);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const dashboardRequestRef = useRef(0);
  const usersRequestRef = useRef(0);

  const loginPath = `${basePath}/login`;

  const handleUnauthorized = useCallback(() => {
    window.location.assign(loginPath);
  }, [loginPath]);

  const loadDashboard = useCallback(async () => {
    const requestId = ++dashboardRequestRef.current;
    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const response = await fetch('/api/admin/dashboard', {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const message = apiErrorMessage(
          response.status,
          'Não foi possível carregar o resumo administrativo.',
        );
        if (message === 'unauthorized') {
          handleUnauthorized();
          return;
        }
        throw new Error(message);
      }

      const payload = await response.json();

      if (!payload?.ok || !payload.data) {
        throw new Error('Resposta inválida do resumo administrativo.');
      }

      if (requestId === dashboardRequestRef.current) {
        setSnapshot(payload.data as AdminDashboardSnapshot);
      }
    } catch (error) {
      if (requestId === dashboardRequestRef.current) {
        setDashboardError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o resumo administrativo.',
        );
      }
    } finally {
      if (requestId === dashboardRequestRef.current) {
        setDashboardLoading(false);
      }
    }
  }, [handleUnauthorized]);

  const usersQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(filters.page),
      perPage: String(filters.perPage),
      sort: filters.sort,
    });

    if (filters.search.trim()) {
      params.set('search', filters.search.trim());
    }
    if (filters.app) params.set('app', filters.app);
    if (filters.status) params.set('status', filters.status);

    return params.toString();
  }, [filters]);

  const loadUsers = useCallback(async () => {
    const requestId = ++usersRequestRef.current;
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await fetch(`/api/admin/users?${usersQuery}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const message = apiErrorMessage(
          response.status,
          'Não foi possível carregar os usuários.',
        );
        if (message === 'unauthorized') {
          handleUnauthorized();
          return;
        }
        throw new Error(message);
      }

      const payload = await response.json();

      if (!payload?.ok || !payload.data) {
        throw new Error('Resposta inválida da lista de usuários.');
      }

      if (requestId === usersRequestRef.current) {
        setUsers(payload.data as AdminUsersPage);
      }
    } catch (error) {
      if (requestId === usersRequestRef.current) {
        setUsersError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os usuários.',
        );
      }
    } finally {
      if (requestId === usersRequestRef.current) {
        setUsersLoading(false);
      }
    }
  }, [handleUnauthorized, usersQuery]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Pequeno debounce somente para a busca textual. Os outros filtros continuam
  // respondendo imediatamente, mas não disparamos uma requisição a cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, filters.search ? 320 : 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers, filters.search]);

  const generatedAt =
    formatGeneratedAt(snapshot?.generatedAt ?? null) ??
    formatGeneratedAt(users?.generatedAt ?? null);

  const summary = snapshot?.summary;

  const appRanking = useMemo(() => {
    return [...(snapshot?.apps ?? [])].sort((a, b) => b.users - a.users);
  }, [snapshot?.apps]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="overview" />

      <div
        id="visao-geral"
        className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
              <Activity className="h-4 w-4" />
              Operação da plataforma
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Visão geral
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Acompanhe cadastros, presença, atividade e distribuição dos
              usuários entre todos os produtos da minhAi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {generatedAt && (
              <span className="text-xs text-slate-600">
                Atualizado às {generatedAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                void loadDashboard();
                void loadUsers();
              }}
              disabled={dashboardLoading || usersLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  dashboardLoading || usersLoading ? 'animate-spin' : ''
                }`}
              />
              Atualizar
            </button>
          </div>
        </div>

        <AdminHomeBusinessPulse basePath={basePath} />

        {dashboardError ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            {dashboardError}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <MetricCard
            title="Usuários"
            value={summary ? formatNumber(summary.totalUsers) : '—'}
            subtitle="Contas cadastradas"
            icon={<UsersRound className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="Online"
            value={summary ? formatNumber(summary.onlineNow) : '—'}
            subtitle="Ativos agora"
            icon={<Wifi className="h-5 w-5" />}
            loading={dashboardLoading}
            emphasized
          />
          <MetricCard
            title="24 horas"
            value={summary ? formatNumber(summary.active24h) : '—'}
            subtitle="Ativos no período"
            icon={<Clock3 className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="7 dias"
            value={summary ? formatNumber(summary.active7d) : '—'}
            subtitle="Usuários ativos"
            icon={<CalendarClock className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="30 dias"
            value={summary ? formatNumber(summary.active30d) : '—'}
            subtitle="Usuários ativos"
            icon={<Activity className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="Inativos"
            value={summary ? formatNumber(summary.inactive30d) : '—'}
            subtitle="Mais de 30 dias"
            icon={<CircleUserRound className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="Novos"
            value={summary ? formatNumber(summary.newUsers7d) : '—'}
            subtitle="Últimos 7 dias"
            icon={<UserPlus className="h-5 w-5" />}
            loading={dashboardLoading}
          />
          <MetricCard
            title="Sem uso"
            value={summary ? formatNumber(summary.neverUsed) : '—'}
            subtitle="Nenhum app detectado"
            icon={<Sparkles className="h-5 w-5" />}
            loading={dashboardLoading}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,.85fr)]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">Atividade diária</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Usuários únicos ativos nos últimos 30 dias
                </p>
              </div>
              <Activity className="h-5 w-5 text-lime-300" />
            </div>

            {dashboardLoading && !snapshot ? (
              <div className="h-72 animate-pulse rounded-2xl bg-white/[0.035]" />
            ) : snapshot?.daily?.length ? (
              <DailyActivityChart daily={snapshot.daily} />
            ) : (
              <EmptyChart text="A atividade aparecerá aqui após o tracker começar a registrar uso." />
            )}
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">Usuários por app</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Usuários identificados em cada produto
                </p>
              </div>
              <AppWindow className="h-5 w-5 text-lime-300" />
            </div>

            {dashboardLoading && !snapshot ? (
              <div className="h-72 animate-pulse rounded-2xl bg-white/[0.035]" />
            ) : appRanking.length ? (
              <AppsDistributionChart apps={appRanking} />
            ) : (
              <EmptyChart text="A distribuição aparecerá assim que houver atividade identificada." />
            )}
          </article>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {appRanking.map((app) => (
            <article
              key={app.appKey}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <p className="truncate text-xs font-bold text-slate-300">
                {PLATFORM_APPS[app.appKey]?.label ?? app.appKey}
              </p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-2xl font-black">
                    {formatNumber(app.users)}
                  </p>
                  <p className="text-[11px] text-slate-600">usuários</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-lime-300">
                    {formatNumber(app.active7d)}
                  </p>
                  <p className="text-[10px] text-slate-600">ativos 7d</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-6">
          {usersError && (
            <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              {usersError}
            </div>
          )}

          <AdminUsersTable
            data={users}
            loading={usersLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={() => void loadUsers()}
            basePath={basePath}
          />
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  emphasized = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  loading: boolean;
  emphasized?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        emphasized
          ? 'border-lime-300/25 bg-lime-300/[0.07]'
          : 'border-white/10 bg-white/[0.035]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-400">{title}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            emphasized
              ? 'bg-lime-300/15 text-lime-300'
              : 'bg-white/5 text-slate-500'
          }`}
        >
          {icon}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-8 w-20 animate-pulse rounded-lg bg-white/5" />
      ) : (
        <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      )}

      <p className="mt-1 text-[11px] text-slate-600">{subtitle}</p>
    </article>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-8 text-center text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}
