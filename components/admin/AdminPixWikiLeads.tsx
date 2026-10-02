'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CircleDollarSign,
  Filter,
  RefreshCw,
  Rocket,
  Search,
  ShoppingCart,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import type { AdminIdentity } from '@/types/platform-admin-business';
import AdminHeader from './AdminHeader';

type Stage = 'account' | 'connected' | 'activated' | 'pricing' | 'purchase';
type Plan = 'free' | 'link' | 'pro' | 'vip';
type Sort = 'score_desc' | 'recent_desc' | 'volume_desc' | 'savings_desc';

type Lead = {
  user_id: string;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  email: string | null;
  phone: string | null;
  last_step: string | null;
  lead_score: number;
  stage: Stage;
  estimated_monthly_pix: number | null;
  estimated_ticket_cents: number | null;
  current_fee_type: string | null;
  current_fee_value: number | null;
  estimated_current_cost_cents: number | null;
  estimated_pixwiki_cost_cents: number | null;
  estimated_savings_cents: number | null;
  interested_plan: Plan | null;
  billing_plan: Plan;
  billing_status: string;
  account_created_at: string | null;
  mp_connected_at: string | null;
  first_receipt_at: string | null;
  pricing_viewed_at: string | null;
  purchase_started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
};

type Payload = {
  generatedAt: string;
  summary: {
    total: number;
    activated: number;
    pricingViewed: number;
    purchaseStarted: number;
    declared10kPlus: number;
    score80Plus: number;
    averageScore: number;
    positiveSavingsCents: number;
  };
  items: Lead[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
};

type Props = { admin: AdminIdentity; basePath: '' | '/admin' };

const STAGE_LABEL: Record<Stage, string> = {
  account: 'Conta criada',
  connected: 'MP conectado',
  activated: 'Primeiro Pix',
  pricing: 'Viu preços',
  purchase: 'Iniciou compra',
};

const PLAN_LABEL: Record<Plan, string> = {
  free: 'PIX GRÁTIS',
  link: 'PIX LINK',
  pro: 'PIX PRO',
  vip: 'PIX VIP',
};

function money(cents: number | null | undefined) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents) / 100);
}

function number(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function relative(value: string | null | undefined) {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} d`;
}

function feeLabel(lead: Lead) {
  if (lead.current_fee_type === 'percent') return `${lead.current_fee_value ?? 0}%`;
  if (lead.current_fee_type === 'fixed') return `${money(Math.round(Number(lead.current_fee_value || 0) * 100))}/Pix`;
  if (lead.current_fee_type === 'free') return 'Sem taxa';
  if (lead.current_fee_type === 'unknown') return 'Não sabe';
  return '—';
}

function scoreClass(score: number) {
  if (score >= 120) return 'border-lime-300/30 bg-lime-300/10 text-lime-200';
  if (score >= 80) return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
  if (score >= 40) return 'border-sky-400/25 bg-sky-400/10 text-sky-200';
  return 'border-white/10 bg-white/5 text-slate-300';
}

export default function AdminPixWikiLeads({ admin, basePath }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [plan, setPlan] = useState('');
  const [minScore, setMinScore] = useState('0');
  const [sort, setSort] = useState<Sort>('score_desc');
  const [page, setPage] = useState(1);
  const loginPath = `${basePath}/login`;

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      perPage: '25',
      minScore: minScore || '0',
      sort,
    });
    if (search.trim()) p.set('search', search.trim());
    if (stage) p.set('stage', stage);
    if (plan) p.set('plan', plan);
    return p.toString();
  }, [minScore, page, plan, search, sort, stage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/pixwiki-leads?${query}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401 || response.status === 403) {
        window.location.assign(loginPath);
        return;
      }
      if (!response.ok) throw new Error(response.status === 503 ? 'A estrutura de Leads PixWiki ainda não está disponível no banco.' : 'Não foi possível carregar os leads.');
      const payload = await response.json();
      if (!payload?.ok || !payload.data) throw new Error('Resposta inválida dos Leads PixWiki.');
      setData(payload.data as Payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar Leads PixWiki.');
    } finally {
      setLoading(false);
    }
  }, [loginPath, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 280 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [stage, plan, minScore, sort]);

  const summary = data?.summary;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="pixwiki-leads" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-lime-300">Comercial PixWiki</p>
            <h1 className="mt-2 text-3xl font-black">Leads PixWiki</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Priorize empresas pelo progresso real no produto: ativação, volume declarado, economia estimada, testes e início de compra.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar
          </button>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{error}</div>}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <Metric title="Leads" value={summary ? number(summary.total) : '—'} subtitle="contas no funil" icon={<UsersRound className="h-5 w-5" />} />
          <Metric title="Ativados" value={summary ? number(summary.activated) : '—'} subtitle="já receberam 1º Pix" icon={<Rocket className="h-5 w-5" />} />
          <Metric title="Calculadora" value={summary ? number(summary.pricingViewed) : '—'} subtitle="viram preço/economia" icon={<Calculator className="h-5 w-5" />} />
          <Metric title="Compra" value={summary ? number(summary.purchaseStarted) : '—'} subtitle="iniciaram plano pago" icon={<ShoppingCart className="h-5 w-5" />} emphasized />
          <Metric title="10k+ Pix" value={summary ? number(summary.declared10kPlus) : '—'} subtitle="volume declarado" icon={<Sparkles className="h-5 w-5" />} />
          <Metric title="Score 80+" value={summary ? number(summary.score80Plus) : '—'} subtitle="alto engajamento" icon={<Filter className="h-5 w-5" />} />
          <Metric title="Score médio" value={summary ? String(summary.averageScore) : '—'} subtitle="funil inteiro" />
          <Metric title="Economia potencial" value={summary ? money(summary.positiveSavingsCents) : '—'} subtitle="soma mensal declarada" icon={<CircleDollarSign className="h-5 w-5" />} />
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,minmax(0,.8fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Empresa, e-mail, slug ou telefone" className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-9 pr-3 text-sm outline-none placeholder:text-slate-700 focus:border-lime-300/40" />
            </label>
            <select value={stage} onChange={e => setStage(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm outline-none">
              <option value="">Todos os estágios</option>
              {Object.entries(STAGE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={plan} onChange={e => setPlan(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm outline-none">
              <option value="">Todos os planos</option>
              {Object.entries(PLAN_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={minScore} onChange={e => setMinScore(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm outline-none">
              <option value="0">Qualquer score</option><option value="40">Score 40+</option><option value="80">Score 80+</option><option value="120">Score 120+</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm outline-none">
              <option value="score_desc">Maior score</option><option value="recent_desc">Mais recentes</option><option value="volume_desc">Maior volume</option><option value="savings_desc">Maior economia</option>
            </select>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
          <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4">
            <div><h2 className="font-black">Funil comercial</h2><p className="mt-1 text-xs text-slate-600">{data ? `${number(data.pagination.total)} resultado(s)` : 'Carregando…'}</p></div>
            {data?.generatedAt && <p className="text-xs text-slate-700">Atualizado {relative(data.generatedAt)}</p>}
          </div>

          {loading && !data ? (
            <div className="p-10 text-center text-sm text-slate-600">Carregando leads…</div>
          ) : !data?.items?.length ? (
            <div className="p-10 text-center text-sm text-slate-600">Nenhum lead encontrado com estes filtros.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1220px] w-full text-left text-sm">
                <thead className="bg-white/[.025] text-[10px] font-black uppercase tracking-[.12em] text-slate-600">
                  <tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Estágio</th><th className="px-4 py-3">Volume</th><th className="px-4 py-3">Taxa atual</th><th className="px-4 py-3">PixWiki</th><th className="px-4 py-3">Economia</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3 text-right">Última atividade</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {data.items.map(lead => (
                    <tr key={lead.user_id} className="align-top hover:bg-white/[.02]">
                      <td className="px-4 py-4"><p className="font-bold text-slate-200">{lead.company_name || 'Sem nome'}</p><p className="mt-1 text-xs text-slate-600">{lead.email || 'sem e-mail'}</p>{lead.company_slug && <p className="mt-1 text-[11px] text-slate-700">{lead.company_slug}.pix.wiki</p>}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${scoreClass(lead.lead_score)}`}>{lead.lead_score}</span></td>
                      <td className="px-4 py-4"><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">{STAGE_LABEL[lead.stage]}</span>{lead.completed_at && <p className="mt-2 text-[10px] font-bold text-emerald-400">onboarding concluído</p>}</td>
                      <td className="px-4 py-4"><p className="font-bold">{number(lead.estimated_monthly_pix)}</p><p className="mt-1 text-[11px] text-slate-600">ticket {money(lead.estimated_ticket_cents)}</p></td>
                      <td className="px-4 py-4"><p className="font-semibold text-slate-300">{feeLabel(lead)}</p><p className="mt-1 text-[11px] text-slate-600">{money(lead.estimated_current_cost_cents)}/mês</p></td>
                      <td className="px-4 py-4 font-bold">{money(lead.estimated_pixwiki_cost_cents)}/mês</td>
                      <td className="px-4 py-4"><p className={Number(lead.estimated_savings_cents || 0) > 0 ? 'font-black text-emerald-400' : 'font-semibold text-slate-500'}>{money(lead.estimated_savings_cents)}/mês</p></td>
                      <td className="px-4 py-4"><p className="font-bold">{PLAN_LABEL[(lead.interested_plan || lead.billing_plan) as Plan]}</p><p className="mt-1 text-[11px] text-slate-600">atual: {PLAN_LABEL[lead.billing_plan]} · {lead.billing_status}</p></td>
                      <td className="px-4 py-4 text-right text-xs text-slate-500">{relative(lead.last_activity_at)}{lead.purchase_started_at && <p className="mt-1 font-bold text-lime-300">compra iniciada</p>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[.06] px-5 py-4">
              <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold disabled:opacity-30">← Anterior</button>
              <p className="text-xs text-slate-600">Página {data.pagination.page} de {data.pagination.totalPages}</p>
              <button disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold disabled:opacity-30">Próxima →</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, subtitle, icon, emphasized = false }: { title: string; value: string; subtitle: string; icon?: React.ReactNode; emphasized?: boolean }) {
  return <article className={`rounded-2xl border p-4 ${emphasized ? 'border-lime-300/25 bg-lime-300/[.07]' : 'border-white/10 bg-white/[.035]'}`}>
    <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-400">{title}</p>{icon && <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${emphasized ? 'bg-lime-300/15 text-lime-300' : 'bg-white/5 text-slate-500'}`}>{icon}</div>}</div>
    <p className="mt-3 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-[11px] text-slate-600">{subtitle}</p>
  </article>;
}
