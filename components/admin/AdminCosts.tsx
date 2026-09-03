'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coins, Database, KeyRound, RefreshCw, ServerCog, Sigma, WalletCards } from 'lucide-react';

import type { AdminCostsSnapshot, AdminIdentity } from '@/types/platform-admin-business';
import AdminHeader from './AdminHeader';
import { BusinessError, BusinessLoading, BusinessMetric, bytes, money, number, relative, usd } from './AdminBusinessUi';

type Props = { admin: AdminIdentity; basePath: '' | '/admin' };

export default function AdminCosts({ admin, basePath }: Props) {
  const [data, setData] = useState<AdminCostsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loginPath = `${basePath}/login`;
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/custos', { cache: 'no-store', credentials: 'same-origin' });
      if (r.status === 401 || r.status === 403) { window.location.assign(loginPath); return; }
      if (!r.ok) throw new Error(r.status === 503 ? 'A estrutura de custos ainda não está disponível no banco.' : 'Não foi possível carregar custos.');
      const p = await r.json(); if (!p?.ok || !p.data) throw new Error('Resposta de custos inválida.'); setData(p.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar.'); } finally { setLoading(false); }
  }, [loginPath]);
  useEffect(() => { void load(); }, [load]);

  const openai = data?.openai;
  return <main className="min-h-screen bg-slate-950 text-white"><AdminHeader admin={admin} basePath={basePath} active="costs"/><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-lime-300">Consumo operacional</p><h1 className="mt-2 text-3xl font-black">Custos & APIs</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Uso real do backend e custos monetários somente quando o valor é conhecido ou configurado.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Atualizar</button></div>
    {error ? <BusinessError message={error} onRetry={() => void load()} /> : null}
    {loading && !data ? <BusinessLoading text="Lendo consumo e custos registrados..." /> : data ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        <BusinessMetric title="Banco Supabase" value={bytes(data.summary.databaseBytes)} subtitle="tamanho PostgreSQL" icon={<Database className="h-5 w-5"/>}/>
        <BusinessMetric title="Funções 30d" value={number(data.summary.functionExecutions30d)} subtitle="execuções registradas" icon={<ServerCog className="h-5 w-5"/>}/>
        <BusinessMetric title="Créditos 30d" value={number(data.summary.functionCredits30d)} subtitle="assistant functions" icon={<Coins className="h-5 w-5"/>}/>
        <BusinessMetric title="FuncionarIA" value={number(data.summary.funcionariaUsageEvents30d)} subtitle={`${number(data.summary.funcionariaCredits30d)} créditos`} />
        <BusinessMetric title="PixWiki API" value={number(data.summary.pixwikiApiRequests30d)} subtitle={`${number(data.summary.pixwikiApiErrors30d)} erros 5xx`} />
        <BusinessMetric title="LLM mensagens" value={number(data.summary.llmMessages30d)} subtitle={`${number(data.summary.llmTokens30d)} tokens registrados`} />
        <BusinessMetric title="Custos BRL" value={money(data.summary.trackedCostBrlCents + data.summary.configuredFixedCostBrlCents)} subtitle="conhecidos + fixos" emphasized />
        <BusinessMetric title="Orçamento BRL" value={money(data.summary.configuredBudgetBrlCents)} subtitle="limites configurados" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">OpenAI organização</h2><p className="mt-1 text-xs text-slate-600">Gasto real e limite mensal via Admin API oficial.</p></div><KeyRound className="h-5 w-5 text-slate-600"/></div>
          {!openai?.configured ? <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4"><p className="text-sm font-bold text-amber-100">Integração opcional não configurada</p><p className="mt-2 text-xs leading-5 text-slate-500">Adicione <code className="text-slate-300">OPENAI_ADMIN_KEY</code> na Vercel para exibir custo real da organização, hard spend limit e quanto resta até o limite. A chave nunca vai para o navegador.</p></div> : openai.available ? <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3"><BusinessMetric title="Gasto no mês" value={usd(openai.costMonthUsdCents)} emphasized/><BusinessMetric title="Hard limit" value={usd(openai.spendLimitUsdCents)} /><BusinessMetric title="Até o limite" value={usd(openai.remainingUntilLimitUsdCents)} /></div> : <div className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-300/[.05] p-4 text-sm text-rose-100">OpenAI Admin API indisponível ({openai?.errorCode || 'erro'}). O restante do painel continua válido.</div>}
          {openai?.available && openai.lineItems.length ? <div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-slate-600">Linhas de custo</p><div className="space-y-2">{openai.lineItems.slice(0,8).map(x=><div key={x.label} className="flex justify-between rounded-xl border border-white/[.06] px-3 py-2 text-sm"><span className="text-slate-400">{x.label}</span><strong>{usd(x.costUsdCents)}</strong></div>)}</div></div> : null}
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h2 className="font-black">Provedores e serviços</h2><p className="mt-1 text-xs text-slate-600">Custos em R$ só entram quando há evento ou custo fixo explicitamente registrado.</p><div className="mt-4 overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="text-[11px] uppercase tracking-[.12em] text-slate-600"><tr><th className="pb-3">Serviço</th><th className="pb-3 text-right">Req./usos</th><th className="pb-3 text-right">Créditos</th><th className="pb-3 text-right">Custo BRL</th><th className="pb-3 text-right">Orçamento</th><th className="pb-3 text-right">Último uso</th></tr></thead><tbody className="divide-y divide-white/[.06]">{data.providers.map(p=><tr key={p.key}><td className="py-3"><p className="font-bold text-slate-200">{p.label}</p><p className="text-[11px] text-slate-600">{p.status === 'untracked' ? 'sem custo monetário rastreado' : p.status}</p></td><td className="py-3 text-right">{number(p.requests)}</td><td className="py-3 text-right text-slate-400">{number(p.credits)}</td><td className="py-3 text-right font-bold">{money(p.costBrlCents+p.monthlyFixedBrlCents)}</td><td className="py-3 text-right text-slate-500">{p.monthlyBudgetBrlCents == null ? '—' : money(p.monthlyBudgetBrlCents)}</td><td className="py-3 text-right text-slate-500">{relative(p.lastSeenAt)}</td></tr>)}</tbody></table></div></article>
      </section>
      <div className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-300/[.04] p-4 text-xs leading-5 text-slate-500"><strong className="text-sky-200">Supabase e Vercel:</strong> esta versão mostra sinais operacionais first-party (banco, funções e uso). Faturas/overages desses provedores não são estimados sem fonte oficial conectada; isso evita transformar consumo técnico em custo inventado.</div>
    </> : null}
  </div></main>;
}
