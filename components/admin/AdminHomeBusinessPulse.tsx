'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CircleDollarSign, TrendingUp, Wifi } from 'lucide-react';

import type {
  AdminAttentionSnapshot,
  AdminFinanceSnapshot,
  AdminNowSnapshot,
} from '@/types/platform-admin-business';
import { money, number } from './AdminBusinessUi';

type Props = { basePath: '' | '/admin' };

type Pulse = {
  finance: AdminFinanceSnapshot | null;
  attention: AdminAttentionSnapshot | null;
  now: AdminNowSnapshot | null;
};

export default function AdminHomeBusinessPulse({ basePath }: Props) {
  const [pulse, setPulse] = useState<Pulse>({
    finance: null,
    attention: null,
    now: null,
  });

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetch('/api/admin/financeiro', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null),
      fetch('/api/admin/atencao', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null),
      fetch('/api/admin/agora', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null),
    ]).then((results) => {
      if (!active) return;
      const getData = <T,>(result: PromiseSettledResult<any>): T | null =>
        result.status === 'fulfilled' && result.value?.ok ? (result.value.data as T) : null;

      setPulse({
        finance: getData<AdminFinanceSnapshot>(results[0]),
        attention: getData<AdminAttentionSnapshot>(results[1]),
        now: getData<AdminNowSnapshot>(results[2]),
      });
    });

    return () => { active = false; };
  }, []);

  const cards = [
    {
      href: `${basePath}/financeiro`,
      label: 'Receita no mês',
      value: pulse.finance ? money(pulse.finance.summary.revenueMonthCents) : '—',
      detail: pulse.finance ? `MRR ${money(pulse.finance.summary.mrrCents)}` : 'Financeiro',
      icon: CircleDollarSign,
    },
    {
      href: `${basePath}/margem`,
      label: 'MRR atual',
      value: pulse.finance ? money(pulse.finance.summary.mrrCents) : '—',
      detail: pulse.finance ? `${number(pulse.finance.summary.payingCustomers)} pagantes no mês` : 'Margem',
      icon: TrendingUp,
    },
    {
      href: `${basePath}/atencao`,
      label: 'Precisam de atenção',
      value: pulse.attention ? number(pulse.attention.summary.total) : '—',
      detail: pulse.attention ? `${number(pulse.attention.summary.high)} de alta prioridade` : 'Alertas',
      icon: AlertTriangle,
    },
    {
      href: `${basePath}/agora`,
      label: 'Online agora',
      value: pulse.now ? number(pulse.now.summary.onlineNow) : '—',
      detail: pulse.now ? `${number(pulse.now.summary.onlineApps)} apps ativos` : 'Presença',
      icon: Wifi,
    },
  ];

  return (
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <a
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-lime-300/10 bg-lime-300/[0.035] p-4 transition hover:border-lime-300/25 hover:bg-lime-300/[0.06]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-600">{card.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-slate-600">{card.detail}</p>
              </div>
              <Icon className="h-5 w-5 text-lime-300/70 transition group-hover:text-lime-300" />
            </div>
          </a>
        );
      })}
    </section>
  );
}
