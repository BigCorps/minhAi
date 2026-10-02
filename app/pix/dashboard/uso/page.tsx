'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader, { type PixWikiPlanKey } from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

type Snapshot = {
  company:{id:string;name:string};
  billing:{plan:PixWikiPlanKey;allow_overage:boolean;spending_limit_cents:number|null;overage_price_cents:number;base_price_cents:number};
  usage:{period_start:string;period_end:string;used_units:number;included_automations:number;remaining_units:number;used_percent:number;overage_units:number;convenience_credit_cents:number;threshold:string;origins:Record<string,number>};
  projection:{projected_units:number;days_remaining:number;best_plan:PixWikiPlanKey;best_plan_name:string;best_cost_cents:number;current_plan_projected_cost_cents:number;potential_savings_cents:number};
};

type UsageEvent={id:string;origin:string;units:number;convenience_credit_cents:number;occurred_at:string;metadata:any};

function money(c:number|null|undefined){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(c||0)/100)}
function n(v:number|null|undefined){return new Intl.NumberFormat('pt-BR').format(Number(v||0))}
function dt(v:string){return new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function sourceLabel(v:string){return({pix_key:'Chave Pix',pix_link:'Pix Link',checkout:'Checkout',api:'API'} as Record<string,string>)[v]||v}

export default function PixWikiUsoPage(){
  const supabase=useMemo(()=>createClient(),[]);
  const router=useRouter();
  const [dark,setDark]=useState(true);
  const [loading,setLoading]=useState(true);
  const [snap,setSnap]=useState<Snapshot|null>(null);
  const [events,setEvents]=useState<UsageEvent[]>([]);
  const [error,setError]=useState('');

  useEffect(()=>{
    const saved=localStorage.getItem('publicTheme');setDark(saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches);
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace('/pix/login');return;}
      const active=localStorage.getItem('pixWikiActiveCompanyId');
      const [{data:snapshot,error:se},{data:rows,error:ee}]=await Promise.all([
        supabase.rpc('pixwiki_v2_dashboard_snapshot',{p_company_id:active||null}),
        supabase.from('pixwiki_v2_usage_events').select('id,origin,units,convenience_credit_cents,occurred_at,metadata').eq('is_test',false).order('occurred_at',{ascending:false}).limit(50),
      ]);
      if(se) throw se; if(ee) throw ee;
      setSnap(snapshot as Snapshot);setEvents((rows||[]) as UsageEvent[]);setLoading(false);
    })().catch(()=>{setError('Não foi possível carregar o uso agora.');setLoading(false);});
  },[router,supabase]);

  const page=dark?'bg-[#020617] text-white':'bg-[#f7f8fa] text-slate-900';
  const card=dark?'border-white/10 bg-white/[0.035]':'border-black/10 bg-white shadow-sm';
  const inner=dark?'border-white/10 bg-black/15':'border-black/10 bg-slate-50';
  const muted=dark?'text-white/55':'text-slate-500';
  if(loading||!snap)return <main className={`min-h-screen flex items-center justify-center ${page}`}><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/></main>;

  const pct=Math.max(0,Math.min(100,Number(snap.usage.used_percent||0)));
  const originEntries=[['pix_key','Chave Pix'],['pix_link','Pix Link'],['checkout','Checkout'],['api','API']] as const;

  return <main className={`min-h-screen pb-28 ${page}`}>
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PixWikiHeader plan={snap.billing.plan} dark={dark} onThemeChange={setDark}/>
      <div className="mt-6"><h1 className="text-3xl font-black">Uso e franquia</h1><p className={`mt-2 text-sm ${muted}`}>Acompanhe o consumo de automações. Push e consulta no dashboard não entram na franquia.</p></div>
      {error&&<div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <section className={`mt-6 rounded-3xl border p-6 ${card}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className={`text-xs font-black uppercase tracking-wide ${muted}`}>Plano atual</p><h2 className="mt-1 text-3xl font-black">{snap.billing.plan==='free'?'PIX GRÁTIS':snap.billing.plan==='link'?'PIX LINK':snap.billing.plan==='pro'?'PIX PRO':'PIX VIP'}</h2></div><div className="text-left md:text-right"><p className={`text-xs ${muted}`}>Usadas neste mês</p><p className="text-3xl font-black">{n(snap.usage.used_units)} <span className={`text-base ${muted}`}>/ {n(snap.usage.included_automations)}</span></p></div></div>
        <div className={`mt-6 h-4 overflow-hidden rounded-full ${dark?'bg-white/10':'bg-slate-200'}`}><div className={`h-full rounded-full ${snap.usage.threshold==='limit'?'bg-red-500':snap.usage.threshold==='critical'?'bg-orange-500':snap.usage.threshold==='warning'?'bg-amber-400':'bg-emerald-500'}`} style={{width:`${pct}%`}}/></div>
        <div className={`mt-2 flex justify-between text-xs ${muted}`}><span>{n(snap.usage.remaining_units)} incluídas restantes</span><span>{Number(snap.usage.used_percent||0).toFixed(1).replace('.',',')}%</span></div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {originEntries.map(([key,label])=><div key={key} className={`rounded-2xl border p-5 ${card}`}><p className={`text-xs ${muted}`}>{label}</p><p className="mt-2 text-2xl font-black">{n(snap.usage.origins?.[key]||0)}</p><p className={`mt-1 text-[11px] ${muted}`}>automações no período</p></div>)}
      </section>

      <section className={`mt-4 rounded-3xl border p-6 ${card}`}>
        <h2 className="text-lg font-black">Projeção</h2><p className={`mt-1 text-sm ${muted}`}>Estimativa com base no ritmo atual. Não é cobrança nem troca automática de plano.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Fechamento projetado</p><p className="mt-1 text-2xl font-black">{n(snap.projection.projected_units)}</p><p className={`mt-1 text-[11px] ${muted}`}>{n(snap.projection.days_remaining)} dia(s) restantes</p></div>
          <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Faixa mais econômica</p><p className="mt-1 text-2xl font-black text-emerald-400">{snap.projection.best_plan_name}</p><p className={`mt-1 text-[11px] ${muted}`}>Estimativa {money(snap.projection.best_cost_cents)}/mês</p></div>
          <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Crédito de conveniência</p><p className="mt-1 text-2xl font-black">{money(snap.usage.convenience_credit_cents)}</p><p className={`mt-1 text-[11px] ${muted}`}>Centavos absorvidos pela PixWiki no período.</p></div>
        </div>
        {!snap.billing.allow_overage&&<div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">Com excedente desativado, novas automações pagas pausam ao atingir a franquia. Recebimentos pela chave, dashboard e Push continuam funcionando.</div>}
      </section>

      <section className={`mt-4 overflow-hidden rounded-3xl border ${card}`}>
        <div className="px-5 py-4"><h2 className="text-lg font-black">Últimas automações</h2><p className={`mt-1 text-xs ${muted}`}>Cada linha representa no máximo uma unidade de um recebimento.</p></div>
        {events.length===0?<div className={`border-t p-8 text-center text-sm ${dark?'border-white/10':'border-black/10'} ${muted}`}>Nenhuma automação contabilizada ainda.</div>:<div className={`divide-y ${dark?'divide-white/10':'divide-black/10'}`}>{events.map(e=><div key={e.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><div className="flex items-center gap-2"><p className="text-sm font-black">{sourceLabel(e.origin)}</p><span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-400">{e.units} unidade</span></div><p className={`mt-1 text-xs ${muted}`}>{dt(e.occurred_at)}{e.metadata?.external_id?` · ${e.metadata.external_id}`:''}</p></div><div className="text-right"><p className="font-black">{e.units}</p>{Number(e.convenience_credit_cents||0)>0&&<p className={`text-[10px] ${muted}`}>crédito {money(e.convenience_credit_cents)}</p>}</div></div>)}</div>}
      </section>
    </div>
    <PixWikiDashboardNav dark={dark}/>
  </main>;
}
