import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Gauge,
  LogOut,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react';

import type { AdminIdentity } from '@/types/platform-admin-business';

export type AdminSection =
  | 'overview'
  | 'finance'
  | 'costs'
  | 'margin'
  | 'attention'
  | 'now';

type Props = {
  admin: AdminIdentity;
  basePath: '' | '/admin';
  active: AdminSection;
};

const NAV = [
  { key: 'overview', label: 'Visão Geral', suffix: '', icon: Gauge },
  { key: 'users', label: 'Usuários', suffix: '#usuarios', icon: UsersRound },
  { key: 'finance', label: 'Financeiro', suffix: '/financeiro', icon: CircleDollarSign },
  { key: 'costs', label: 'Custos & APIs', suffix: '/custos', icon: WalletCards },
  { key: 'margin', label: 'Margem', suffix: '/margem', icon: TrendingUp },
  { key: 'attention', label: 'Atenção', suffix: '/atencao', icon: AlertTriangle },
  { key: 'now', label: 'Agora', suffix: '/agora', icon: Activity },
] as const;

function hrefFor(basePath: '' | '/admin', suffix: string) {
  const home = basePath || '/';
  if (!suffix) return home;
  if (suffix.startsWith('#')) return `${home}${suffix}`;
  return `${basePath}${suffix}`;
}

export default function AdminHeader({ admin, basePath, active }: Props) {
  const logoutPath = `${basePath}/logout`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href={basePath || '/'} className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight">Admin minhAi</p>
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.15em] text-lime-300">BigCorps</p>
          </div>
        </a>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-[220px] truncate text-xs font-bold text-slate-200">
              {admin.name || admin.email || 'Administrador'}
            </p>
            <p className="max-w-[220px] truncate text-[11px] text-slate-600">{admin.email}</p>
          </div>
          <a
            href={logoutPath}
            className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="border-t border-white/[0.05]">
        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const selected = item.key === active;
            return (
              <a
                key={item.key}
                href={hrefFor(basePath, item.suffix)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                  selected
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-lime-300' : ''}`} />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
