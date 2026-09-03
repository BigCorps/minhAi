'use client';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  UsersRound,
} from 'lucide-react';

import {
  PLATFORM_APPS,
  PLATFORM_APP_KEYS,
  type PlatformAppKey,
} from '@/lib/platform-products';
import type {
  AdminUserListItem,
  AdminUsersPage,
  PlatformUsersSort,
  PlatformUserStatus,
} from '@/types/platform-admin';

export type UsersFilters = {
  search: string;
  app: PlatformAppKey | '';
  status: PlatformUserStatus | '';
  sort: PlatformUsersSort;
  page: number;
  perPage: number;
};

type Props = {
  data: AdminUsersPage | null;
  loading: boolean;
  filters: UsersFilters;
  onFiltersChange: (next: UsersFilters) => void;
  onRefresh: () => void;
  basePath: '' | '/admin';
};

const STATUS_LABELS: Record<PlatformUserStatus, string> = {
  online: 'Online',
  today: 'Hoje',
  recent: 'Até 7 dias',
  idle: '8–30 dias',
  inactive: 'Inativo +30d',
  never: 'Sem uso',
};

const STATUS_CLASSES: Record<PlatformUserStatus, string> = {
  online: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  today: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  recent: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  idle: 'border-orange-300/25 bg-orange-300/10 text-orange-200',
  inactive: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
  never: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
};

const APP_CLASSES: Partial<Record<PlatformAppKey, string>> = {
  minhai: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  minia: 'border-green-400/20 bg-green-400/10 text-green-300',
  artefinal: 'border-pink-400/20 bg-pink-400/10 text-pink-300',
  pixwiki: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  consultatec: 'border-red-400/20 bg-red-400/10 text-red-300',
  conviteia: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  melhoria: 'border-teal-400/20 bg-teal-400/10 text-teal-300',
  funcionaria: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
};

function relativeTime(value: string | null) {
  if (!value) return 'Nunca';

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat('pt-BR', {
    numeric: 'auto',
  });

  if (abs < 60) return rtf.format(diffSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 2_592_000) {
    return rtf.format(Math.round(diffSeconds / 86_400), 'day');
  }
  if (abs < 31_536_000) {
    return rtf.format(Math.round(diffSeconds / 2_592_000), 'month');
  }
  return rtf.format(Math.round(diffSeconds / 31_536_000), 'year');
}

function dateLabel(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function initials(user: AdminUserListItem) {
  const source = user.name || user.email || '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function updateFilters(
  filters: UsersFilters,
  patch: Partial<UsersFilters>,
): UsersFilters {
  return {
    ...filters,
    ...patch,
  };
}

export default function AdminUsersTable({
  data,
  loading,
  filters,
  onFiltersChange,
  onRefresh,
  basePath,
}: Props) {
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;
  const currentPage = data?.pagination.page ?? filters.page;

  return (
    <section
      id="usuarios"
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
    >
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-lime-300" />
              <h2 className="text-xl font-bold">Usuários</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {total
                ? `${total.toLocaleString('pt-BR')} usuário${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`
                : 'Contas da plataforma e atividade por aplicativo'}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1.6fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_minmax(180px,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={filters.search}
              onChange={(event) =>
                onFiltersChange(
                  updateFilters(filters, {
                    search: event.target.value,
                    page: 1,
                  }),
                )
              }
              placeholder="Buscar por nome ou e-mail"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300/40"
            />
          </label>

          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={filters.app}
              onChange={(event) =>
                onFiltersChange(
                  updateFilters(filters, {
                    app: event.target.value as PlatformAppKey | '',
                    page: 1,
                  }),
                )
              }
              className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-8 text-sm text-slate-200 outline-none focus:border-lime-300/40"
            >
              <option value="">Todos os apps</option>
              {PLATFORM_APP_KEYS.map((key) => (
                <option value={key} key={key}>
                  {PLATFORM_APPS[key].label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange(
                updateFilters(filters, {
                  status: event.target.value as PlatformUserStatus | '',
                  page: 1,
                }),
              )
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-lime-300/40"
          >
            <option value="">Todos os status</option>
            <option value="online">Online agora</option>
            <option value="today">Ativo hoje</option>
            <option value="recent">Ativo até 7 dias</option>
            <option value="idle">Sem uso há 8–30 dias</option>
            <option value="inactive">Inativo há +30 dias</option>
            <option value="never">Sem uso identificado</option>
          </select>

          <select
            value={filters.sort}
            onChange={(event) =>
              onFiltersChange(
                updateFilters(filters, {
                  sort: event.target.value as PlatformUsersSort,
                  page: 1,
                }),
              )
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-lime-300/40"
          >
            <option value="last_seen_desc">Uso mais recente</option>
            <option value="created_desc">Cadastro mais recente</option>
            <option value="created_asc">Cadastro mais antigo</option>
            <option value="name_asc">Nome A–Z</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full text-left">
          <thead className="bg-slate-950/45 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Usuário</th>
              <th className="px-4 py-4 font-semibold">Apps</th>
              <th className="px-4 py-4 font-semibold">Último app</th>
              <th className="px-4 py-4 font-semibold">Última atividade</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Cadastro</th>
              <th className="px-4 py-4 text-right font-semibold">Dias ativos</th>
              <th className="px-6 py-4 text-right font-semibold">Detalhes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {loading && !data ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-5">
                    <div className="h-10 w-48 rounded-xl bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-7 w-36 rounded-lg bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-6 w-24 rounded-lg bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-6 w-24 rounded-lg bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-7 w-20 rounded-full bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-6 w-24 rounded-lg bg-white/5" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="ml-auto h-6 w-10 rounded-lg bg-white/5" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="ml-auto h-7 w-14 rounded-lg bg-white/5" />
                  </td>
                </tr>
              ))
            ) : data?.items.length ? (
              data.items.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full bg-slate-800 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-300/10 text-xs font-black text-lime-300">
                          {initials(user)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[260px] truncate text-sm font-bold text-slate-100">
                          {user.name || 'Sem nome'}
                        </p>
                        <p className="max-w-[260px] truncate text-xs text-slate-500">
                          {user.email || 'Sem e-mail'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex max-w-[280px] flex-wrap gap-1.5">
                      {user.apps.length ? (
                        user.apps.slice(0, 4).map((app) => (
                          <span
                            key={app.appKey}
                            className={`rounded-full border px-2 py-1 text-[11px] font-bold ${
                              APP_CLASSES[app.appKey] ??
                              'border-white/10 bg-white/5 text-slate-300'
                            }`}
                            title={`Último uso: ${relativeTime(app.lastSeenAt)}`}
                          >
                            {PLATFORM_APPS[app.appKey]?.shortLabel ?? app.appKey}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600">
                          Nenhum identificado
                        </span>
                      )}
                      {user.apps.length > 4 && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400">
                          +{user.apps.length - 4}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-300">
                    {user.lastAppKey
                      ? PLATFORM_APPS[user.lastAppKey]?.shortLabel ??
                        user.lastAppKey
                      : '—'}
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-200">
                      {relativeTime(user.lastSeenAt)}
                    </p>
                    {user.lastSeenAt && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {dateLabel(user.lastSeenAt)}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                        STATUS_CLASSES[user.status]
                      }`}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-400">
                    {dateLabel(user.createdAt)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className="font-bold text-slate-200">
                      {user.activeDays30d}
                    </span>
                    <span className="ml-1 text-xs text-slate-600">/ 30</span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <a
                      href={`${basePath}/usuarios/${user.id}`}
                      className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-lime-300/30 hover:bg-lime-300/5 hover:text-lime-200"
                    >
                      Abrir
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="font-semibold text-slate-300">
                    Nenhum usuário encontrado
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Tente remover algum filtro ou alterar a busca.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Exibir</span>
          <select
            value={filters.perPage}
            onChange={(event) =>
              onFiltersChange(
                updateFilters(filters, {
                  perPage: Number(event.target.value),
                  page: 1,
                }),
              )
            }
            className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-slate-300 outline-none"
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span>por página</span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-slate-500">
            Página {currentPage} de {Math.max(1, totalPages)}
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={loading || currentPage <= 1}
              onClick={() =>
                onFiltersChange(
                  updateFilters(filters, {
                    page: Math.max(1, currentPage - 1),
                  }),
                )
              }
              className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={loading || currentPage >= totalPages}
              onClick={() =>
                onFiltersChange(
                  updateFilters(filters, {
                    page: currentPage + 1,
                  }),
                )
              }
              className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
