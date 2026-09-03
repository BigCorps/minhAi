'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, CircleDollarSign, CreditCard, Receipt, RefreshCw, UsersRound, WalletCards } from 'lucide-react';

import type { AdminFinanceSnapshot, AdminIdentity, FinanceProductKey } from '@/types/platform-admin-business';
import { PLATFORM_APPS } from '@/lib/platform-products';
import AdminHeader from './AdminHeader';
import { BusinessError, BusinessLoading, BusinessMetric, money, number, relative } from './AdminBusinessUi';
import { ProductRevenueChart, RevenueDailyChart } from './AdminBusinessCharts';

type Props = { admin: AdminIdentity; basePath: '' | '/admin' };

const LABELS: Record<FinanceProductKey, string> = {
  minhai: 'minhAi', minia: 'min.IA', artefinal: 'ArteFinal', pixwiki: 'PixWiki', consultatec: 'ConsultaTec', conviteia: 'ConviteIA', melhoria: 'MelhorIA', funcionaria: 'FuncionarIA', shared_credits: 'Créditos compartilhados',
};

export default function AdminFinance({ admin, basePath }: Props) {
  const [data, setData] = useState<AdminFinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loginPath = `${basePath}/login`;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/financeiro', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401 || response.status === 403) { window.location.assign(loginPath); return; }
      if (!response.ok) throw new Error(response.status === 503 ? 'A estrutura financeira ainda não está disponível no banco.' : 'Não foi possível carregar o financeiro.');
      const payload = await response.json();
      if (!payload?.ok || !payload.data) throw new Error('Resposta financeira inválida.');
      setData(payload.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar.'); }
    finally { setLoading(false); }
  }, [loginPath]);

  useEffect(() => { void load(); }, [load]);

  return <main className="min-h-screen bg-slate-950 text-white">
    <AdminHeader admin={admin} basePath={basePath} active="finance" />
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-lime-300">Receita BigCorps</p><h1 className="mt-2 text-3xl font-black">Financeiro</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Receita da plataforma separada da movimentação financeira que pertence aos clientes.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
      </div>
      {error ? <BusinessError message={error} onRetry={() => void load()} /> : null}
      {loading && !data ? <BusinessLoading text="Calculando receita e assinaturas..." /> : data ? <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <BusinessMetric title="Hoje" value={money(data.summary.revenueTodayCents)} subtitle="receita confirmada" icon={<CircleDollarSign className="h-5 w-5" />} emphasized />
          <BusinessMetric title="Este mês" value={money(data.summary.revenueMonthCents)} subtitle="receita confirmada" icon={<Banknote className="h-5 w-5" />} />
          <BusinessMetric title="MRR" value={money(data.summary.mrrCents)} subtitle="recorrência ativa" icon={<Receipt className="h-5 w-5" />} />
          <BusinessMetric title="Pagantes" value={number(data.summary.payingCustomers)} subtitle="clientes no mês" icon={<UsersRound className="h-5 w-5" />} />
          <BusinessMetric title="Ticket médio" value={money(data.summary.avgTicketCents)} subtitle="pagamentos do mês" icon={<CreditCard className="h-5 w-5" />} />
          <BusinessMetric title="Pagamentos" value={number(data.summary.paidPaymentsMonth)} subtitle="confirmados no mês" />
          <BusinessMetric title="Pendentes" value={number(data.summary.pendingPayments)} subtitle="recentes / não expirados" />
          <BusinessMetric title="Falhos" value={number(data.summary.failedPayments30d)} subtitle="últimos 30 dias" />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h2 className="font-black">Receita diária</h2><p className="mt-1 text-xs text-slate-600">Últimos 30 dias · somente receita BigCorps confirmada</p><div className="mt-5"><RevenueDailyChart daily={data.daily} /></div></article>
          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h2 className="font-black">Receita por produto</h2><p className="mt-1 text-xs text-slate-600">Créditos antigos compartilhados ficam separados para não inventar atribuição.</p><div className="mt-5"><ProductRevenueChart products={data.products} /></div></article>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {data.products.map((p) => <article key={p.productKey} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="font-bold">{LABELS[p.productKey]}</p><p className="mt-3 text-2xl font-black">{money(p.revenueMonthCents)}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500"><span>{p.paymentsMonth} pagamentos</span><span className="text-right">MRR {money(p.mrrCents)}</span></div></article>)}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h2 className="font-black">Pagamentos recentes</h2><div className="mt-4 overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="text-[11px] uppercase tracking-[.12em] text-slate-600"><tr><th className="pb-3">Cliente</th><th className="pb-3">Produto</th><th className="pb-3">Tipo</th><th className="pb-3 text-right">Valor</th><th className="pb-3 text-right">Quando</th></tr></thead><tbody className="divide-y divide-white/[.06]">{data.recentPayments.map((p) => <tr key={p.id}><td className="py-3"><p className="font-semibold text-slate-200">{p.name || p.email || 'Sem conta'}</p><p className="text-xs text-slate-600">{p.email}</p></td><td className="py-3 text-slate-400">{LABELS[p.productKey]}</td><td className="py-3 text-slate-500">{p.kind}</td><td className="py-3 text-right font-bold">{money(p.amountCents)}</td><td className="py-3 text-right text-slate-500">{relative(p.paidAt)}</td></tr>)}</tbody></table></div></article>
          <article className="rounded-3xl border border-sky-300/15 bg-sky-300/[.04] p-5 sm:p-6"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-sky-300"/><h2 className="font-black">Movimentação dos clientes</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Estes valores passaram pelos produtos, mas não são faturamento da BigCorps.</p><div className="mt-5 space-y-3"><BusinessMetric title="PixWiki" value={money(data.processed.pixwikiVolumeMonthCents)} subtitle={`${number(data.processed.pixwikiReceiptsMonth)} recebimentos no mês`} /><BusinessMetric title="Presentes ConviteIA" value={money(data.processed.conviteiaGiftVolumeMonthCents)} subtitle={`${number(data.processed.conviteiaGiftPaymentsMonth)} pagamentos no mês`} /></div></article>
        </section>
      </> : null}
    </div>
  </main>;
}
