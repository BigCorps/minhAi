'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  PLATFORM_APPS,
  type PlatformAppKey,
} from '@/lib/platform-products';
import type {
  AdminKeyCount,
  AdminUserAppActivity,
  AdminUserDetail,
  PlatformUserStatus,
} from '@/types/platform-admin';

type Props = {
  userId: string;
  basePath: '' | '/admin';
  adminEmail: string | null;
};

const STATUS_LABELS: Record<PlatformUserStatus, string> = {
  online: 'Online agora',
  today: 'Ativo hoje',
  recent: 'Ativo até 7 dias',
  idle: 'Sem uso há 8–30 dias',
  inactive: 'Inativo há +30 dias',
  never: 'Sem uso identificado',
};

const STATUS_CLASSES: Record<PlatformUserStatus, string> = {
  online: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  today: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  recent: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  idle: 'border-orange-300/25 bg-orange-300/10 text-orange-200',
  inactive: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
  never: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
};

const PRODUCT_ACCENTS: Record<PlatformAppKey, string> = {
  minhai: 'text-lime-300 bg-lime-300/10 border-lime-300/20',
  minia: 'text-green-300 bg-green-300/10 border-green-300/20',
  artefinal: 'text-pink-300 bg-pink-300/10 border-pink-300/20',
  pixwiki: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  consultatec: 'text-red-300 bg-red-300/10 border-red-300/20',
  conviteia: 'text-rose-300 bg-rose-300/10 border-rose-300/20',
  melhoria: 'text-teal-300 bg-teal-300/10 border-teal-300/20',
  funcionaria: 'text-violet-300 bg-violet-300/10 border-violet-300/20',
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function relativeTime(value: string | null) {
  if (!value) return 'Nunca';

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), 'day');
  if (abs < 31_536_000) {
    return rtf.format(Math.round(seconds / 2_592_000), 'month');
  }

  return rtf.format(Math.round(seconds / 31_536_000), 'year');
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function formatMoneyCents(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((value ?? 0) / 100);
}

function sourceLabel(source: AdminUserAppActivity['source']) {
  if (source === 'tracker') return 'Rastreado';
  if (source === 'historical') return 'Histórico';
  return 'Rastreado + histórico';
}

function initials(name: string | null, email: string | null) {
  return (name || email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function ProductShell({
  appKey,
  detected,
  historical,
  children,
}: {
  appKey: PlatformAppKey;
  detected: boolean;
  historical: boolean;
  children: React.ReactNode;
}) {
  const accent = PRODUCT_ACCENTS[appKey];

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-lg border px-2 py-1 text-[11px] font-black ${accent}`}>
              {PLATFORM_APPS[appKey].label}
            </span>
            {historical && (
              <span className="rounded-lg border border-amber-300/15 bg-amber-300/5 px-2 py-1 text-[10px] font-bold text-amber-200">
                histórico identificado
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {detected ? 'Uso ou cadastro identificado' : 'Nenhum uso identificado'}
          </p>
        </div>

        <span
          className={`h-2.5 w-2.5 rounded-full ${
            detected ? 'bg-emerald-400' : 'bg-slate-700'
          }`}
          aria-label={detected ? 'detectado' : 'não detectado'}
        />
      </div>

      {children}
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
        {label}
      </p>
      <div className="mt-1.5 text-lg font-black text-slate-100">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function KeyCounts({ items }: { items: AdminKeyCount[] }) {
  if (!items.length) {
    return <p className="text-xs text-slate-600">Nenhum item identificado.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 12).map((item) => (
        <span
          key={item.key}
          className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-300"
        >
          {item.label || item.key}
          <strong className="ml-1.5 text-white">{item.count}</strong>
        </span>
      ))}
    </div>
  );
}

export default function AdminUserDetailView({
  userId,
  basePath,
  adminEmail,
}: Props) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backPath = basePath || '/';
  const logoutPath = `${basePath}/logout`;
  const loginPath = `${basePath}/login`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        {
          cache: 'no-store',
          credentials: 'same-origin',
        },
      );

      if (response.status === 401 || response.status === 403) {
        window.location.assign(loginPath);
        return;
      }

      if (response.status === 404) {
        throw new Error('Usuário não encontrado.');
      }

      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? 'O detalhamento administrativo ainda não está disponível no banco.'
            : 'Não foi possível carregar o usuário.',
        );
      }

      const payload = await response.json();
      if (!payload?.ok || !payload.data) {
        throw new Error('Resposta inválida do perfil administrativo.');
      }

      setData(payload.data as AdminUserDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar o usuário.',
      );
    } finally {
      setLoading(false);
    }
  }, [loginPath, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const appActivity = useMemo(() => {
    return [...(data?.activity.apps ?? [])].sort((a, b) => {
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [data?.activity.apps]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a
              href={backPath}
              className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Voltar ao Admin"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300 text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black">Perfil do usuário</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-lime-300">
                Admin minhAi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminEmail && (
              <span className="hidden max-w-[240px] truncate text-xs text-slate-600 md:block">
                {adminEmail}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href={logoutPath}
              className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {loading && !data ? (
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-lime-300" />
              Carregando perfil administrativo...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
            <p className="font-bold text-amber-100">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950"
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  {data.account.avatarUrl ? (
                    <img
                      src={data.account.avatarUrl}
                      alt=""
                      className="h-16 w-16 rounded-2xl bg-slate-900 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lg font-black text-lime-300">
                      {initials(data.account.name, data.account.email)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-black sm:text-3xl">
                        {data.account.name || 'Sem nome'}
                      </h1>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                          STATUS_CLASSES[data.activity.status]
                        }`}
                      >
                        {STATUS_LABELS[data.activity.status]}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {data.account.email || 'Sem e-mail'}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700">
                      {data.account.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric
                    label="Cadastro"
                    value={formatDateTime(data.account.createdAt).split(' ')[0]}
                  />
                  <Metric
                    label="Último login"
                    value={relativeTime(data.account.lastSignInAt)}
                  />
                  <Metric
                    label="Último uso"
                    value={relativeTime(data.activity.lastSeenAt)}
                  />
                  <Metric
                    label="Apps"
                    value={formatNumber(data.activity.apps.length)}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
                {data.account.providers.length ? (
                  data.account.providers.map((provider) => (
                    <span
                      key={provider}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-slate-300"
                    >
                      Login: {provider}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">
                    Provedor de login não identificado.
                  </span>
                )}
                {data.account.emailConfirmedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    E-mail confirmado
                  </span>
                )}
              </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Empresas"
                value={formatNumber(data.accountUsage.companies)}
                hint={`${formatNumber(data.accountUsage.activeCompanies)} ativas`}
              />
              <Metric
                label="Créditos disponíveis"
                value={
                  data.accountUsage.availableCredits == null
                    ? '—'
                    : formatNumber(data.accountUsage.availableCredits)
                }
                hint={
                  data.accountUsage.totalCreditsUsed == null
                    ? undefined
                    : `${formatNumber(data.accountUsage.totalCreditsUsed)} usados`
                }
              />
              <Metric
                label="Plano minhAi"
                value={data.accountUsage.activePlanName || 'Sem plano'}
                hint={
                  data.accountUsage.planExpiresAt
                    ? `até ${formatDateTime(data.accountUsage.planExpiresAt)}`
                    : undefined
                }
              />
              <Metric
                label="Dias ativos"
                value={`${formatNumber(data.activity.activeDays30d)} / 30`}
                hint="atividade identificada"
              />
            </section>

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-lime-300" />
                  <h2 className="text-lg font-black">Atividade por aplicativo</h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  “Histórico” significa evidência encontrada nas tabelas antigas do produto,
                  não um login reconstruído.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {appActivity.length ? (
                  appActivity.map((app) => (
                    <div
                      key={app.appKey}
                      className="rounded-2xl border border-white/[0.07] bg-slate-950/35 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">
                            {PLATFORM_APPS[app.appKey].label}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            {sourceLabel(app.source)}
                          </p>
                        </div>
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${PRODUCT_ACCENTS[app.appKey]}`}>
                          {app.activeDays30d}d
                        </span>
                      </div>

                      <dl className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-600">Primeiro uso</dt>
                          <dd className="text-right text-slate-300">
                            {formatDateTime(app.firstSeenAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-600">Último uso</dt>
                          <dd className="text-right text-slate-300">
                            {relativeTime(app.lastSeenAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-600">Último login</dt>
                          <dd className="text-right text-slate-300">
                            {relativeTime(app.lastLoginAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-600">Logins</dt>
                          <dd className="font-bold text-slate-200">
                            {formatNumber(app.loginCount)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-600">Páginas</dt>
                          <dd className="font-bold text-slate-200">
                            {formatNumber(app.pageViews)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    Nenhuma atividade por aplicativo identificada.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <ProductShell
                appKey="minhai"
                detected={data.products.minhai.detected}
                historical={data.products.minhai.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Empresas" value={formatNumber(data.products.minhai.companies)} />
                  <Metric label="Conversas" value={formatNumber(data.products.minhai.conversations)} />
                  <Metric label="Mensagens" value={formatNumber(data.products.minhai.messages)} />
                  <Metric label="Funções" value={formatNumber(data.products.minhai.functionExecutions)} />
                  <Metric label="Créditos" value={formatNumber(data.products.minhai.creditsConsumed)} />
                  <Metric label="Funções ativas" value={formatNumber(data.products.minhai.enabledFunctions)} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="Meta" value={formatNumber(data.products.minhai.metaConnections)} />
                  <Metric label="MCP" value={formatNumber(data.products.minhai.mcpConnections)} />
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Última execução de função: {formatDateTime(data.products.minhai.lastFunctionAt)}
                </p>
              </ProductShell>

              <ProductShell
                appKey="minia"
                detected={data.products.minia.detected}
                historical={data.products.minia.historical}
              >
                <div className="rounded-2xl border border-white/[0.07] bg-slate-950/35 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-green-300" />
                    <p className="text-sm leading-6 text-slate-400">
                      {data.products.minia.note}
                    </p>
                  </div>
                </div>
              </ProductShell>

              <ProductShell
                appKey="artefinal"
                detected={data.products.artefinal.detected}
                historical={data.products.artefinal.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Execuções" value={formatNumber(data.products.artefinal.executions)} />
                  <Metric label="Créditos" value={formatNumber(data.products.artefinal.creditsConsumed)} />
                  <Metric label="Última" value={relativeTime(data.products.artefinal.lastExecutionAt)} />
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-slate-500">Ferramentas usadas</p>
                  <KeyCounts items={data.products.artefinal.tools} />
                </div>
              </ProductShell>

              <ProductShell
                appKey="pixwiki"
                detected={data.products.pixwiki.detected}
                historical={data.products.pixwiki.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Plano" value={data.products.pixwiki.plan || '—'} />
                  <Metric label="Status" value={data.products.pixwiki.subscriptionStatus || '—'} />
                  <Metric label="Recebimentos" value={formatNumber(data.products.pixwiki.receipts)} />
                  <Metric label="Recebido" value={formatMoneyCents(data.products.pixwiki.receivedAmountCents)} />
                  <Metric label="Webhooks" value={formatNumber(data.products.pixwiki.webhooks)} />
                  <Metric label="API keys" value={formatNumber(data.products.pixwiki.apiKeys)} />
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Último recebimento: {formatDateTime(data.products.pixwiki.lastReceiptAt)}
                </p>
              </ProductShell>

              <ProductShell
                appKey="consultatec"
                detected={data.products.consultatec.detected}
                historical={data.products.consultatec.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Consultas" value={formatNumber(data.products.consultatec.consultations)} />
                  <Metric label="Pagas" value={formatNumber(data.products.consultatec.paidConsultations)} />
                  <Metric label="Custo" value={formatNumber(data.products.consultatec.totalCost)} hint="unidade registrada no produto" />
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-slate-500">Tipos de consulta</p>
                  <KeyCounts items={data.products.consultatec.types} />
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Última consulta: {formatDateTime(data.products.consultatec.lastConsultationAt)}
                </p>
                <p className="mt-2 rounded-xl border border-red-300/10 bg-red-300/5 p-3 text-[11px] leading-5 text-red-100/70">
                  CPF/CNPJ, entrada, resultado e PDFs não são expostos neste Admin.
                </p>
              </ProductShell>

              <ProductShell
                appKey="conviteia"
                detected={data.products.conviteia.detected}
                historical={data.products.conviteia.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Plano" value={data.products.conviteia.plan || '—'} />
                  <Metric label="Eventos" value={formatNumber(data.products.conviteia.events)} />
                  <Metric label="Publicados" value={formatNumber(data.products.conviteia.publishedEvents)} />
                  <Metric label="Arquivados" value={formatNumber(data.products.conviteia.archivedEvents)} />
                  <Metric label="Presentes pagos" value={formatNumber(data.products.conviteia.giftPayments)} />
                  <Metric label="Recebido" value={formatMoneyCents(data.products.conviteia.giftRevenueCents)} />
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Último evento identificado: {formatDateTime(data.products.conviteia.lastEventAt)}
                </p>
              </ProductShell>

              <ProductShell
                appKey="melhoria"
                detected={data.products.melhoria.detected}
                historical={data.products.melhoria.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric
                    label="Perfil"
                    value={data.products.melhoria.profileExists ? 'Criado' : 'Não criado'}
                  />
                  <Metric
                    label="Onboarding"
                    value={
                      data.products.melhoria.onboardingCompleted == null
                        ? '—'
                        : data.products.melhoria.onboardingCompleted
                          ? 'Concluído'
                          : 'Pendente'
                    }
                  />
                  <Metric
                    label="Google"
                    value={data.products.melhoria.googleConnected ? 'Conectado' : 'Não'}
                  />
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Perfil criado em: {formatDateTime(data.products.melhoria.profileCreatedAt)}
                </p>
                <p className="mt-3 rounded-xl border border-teal-300/10 bg-teal-300/5 p-3 text-[11px] leading-5 text-teal-100/70">
                  {data.products.melhoria.note}
                </p>
              </ProductShell>

              <ProductShell
                appKey="funcionaria"
                detected={data.products.funcionaria.detected}
                historical={data.products.funcionaria.historical}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Empresas" value={formatNumber(data.products.funcionaria.companies)} />
                  <Metric label="Onboardings" value={formatNumber(data.products.funcionaria.onboardingCompleted)} />
                  <Metric label="Assinatura" value={data.products.funcionaria.subscriptionStatus || 'Grátis'} />
                  <Metric label="Usos" value={formatNumber(data.products.funcionaria.usageEvents)} />
                  <Metric label="Créditos" value={formatNumber(data.products.funcionaria.creditsConsumed)} />
                  <Metric label="Fim do período" value={data.products.funcionaria.periodEnd ? formatDateTime(data.products.funcionaria.periodEnd) : '—'} />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-500">Habilidades ativas</p>
                    <div className="flex flex-wrap gap-2">
                      {data.products.funcionaria.activeSkills.length ? (
                        data.products.funcionaria.activeSkills.map((skill) => (
                          <span key={skill} className="rounded-full border border-violet-300/15 bg-violet-300/5 px-2.5 py-1 text-xs text-violet-200">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600">Nenhuma.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-500">Selecionadas</p>
                    <div className="flex flex-wrap gap-2">
                      {data.products.funcionaria.selectedSkills.length ? (
                        data.products.funcionaria.selectedSkills.map((skill) => (
                          <span key={skill} className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-300">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600">Nenhuma.</span>
                      )}
                    </div>
                  </div>
                </div>
              </ProductShell>
            </section>

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">Atividade recente</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Resumo diário rastreado ou histórico identificado, sem conteúdo das ações.
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-lime-300" />
              </div>

              {data.activity.recent.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left">
                    <thead className="text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th className="pb-3 font-bold">Data</th>
                        <th className="pb-3 font-bold">App</th>
                        <th className="pb-3 font-bold">Páginas</th>
                        <th className="pb-3 font-bold">Tempo ativo</th>
                        <th className="pb-3 text-right font-bold">Última atividade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.activity.recent.slice(0, 30).map((row, index) => (
                        <tr key={`${row.date}-${row.appKey}-${index}`}>
                          <td className="py-3 text-sm text-slate-300">{row.date}</td>
                          <td className="py-3 text-sm font-semibold text-slate-200">
                            {PLATFORM_APPS[row.appKey].label}
                          </td>
                          <td className="py-3 text-sm text-slate-400">
                            {formatNumber(row.pageViews)}
                          </td>
                          <td className="py-3 text-sm text-slate-400">
                            {formatNumber(row.activeMinutes)} min
                          </td>
                          <td className="py-3 text-right text-sm text-slate-400">
                            {formatDateTime(row.lastSeenAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Ainda não há dias de atividade registrados pelo tracker.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
