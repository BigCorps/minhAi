'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader, { type PixWikiPlanKey } from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Plan = { plan:PixWikiPlanKey; name:string; rank:number; monthly_price_cents:number; annual_price_cents:number|null; included_automations:number; overage_price_cents:number };
type Invoice = { id:string; invoice_type:'base'|'overage'; target_plan:PixWikiPlanKey; billing_interval:string|null; status:string; amount_cents:number; base_price_cents:number; overage_units:number; overage_price_cents:number; protected_plan:PixWikiPlanKey|null; protected_total_cents:number|null; convenience_credit_cents:number; credit_applied_cents:number; usage_period_start:string|null; usage_period_end:string|null; due_at:string|null; grace_until:string|null; expires_at:string|null; pix_code:string|null; qr_code_url:string|null; charge_status:string|null; };
type Status = {
  can_manage_billing:boolean;
  billing:{ plan:PixWikiPlanKey; billing_interval:'monthly'|'annual'; status:string; allow_overage:boolean; spending_limit_cents:number|null; complimentary:boolean; current_period_start:string|null; current_period_end:string|null; grace_until:string|null; cancel_at_period_end:boolean; credit_balance_cents:number; payment_method:string };
  plans:Plan[]; usage:{period_start:string;period_end:string;used_units:number;convenience_credit_cents:number}|null; open_invoices:Invoice[]; recent_invoices:Invoice[];
};

function money(cents:number|null|undefined){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100)}
function n(v:number|null|undefined){return new Intl.NumberFormat('pt-BR').format(Number(v||0))}
function date(v:string|null|undefined){return v?new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR'):'—'}

export default function PlanosPage(){
  const supabase=useMemo(()=>createClient(),[]); const router=useRouter();
  const [dark,setDark]=useState(true); const [loading,setLoading]=useState(true); const [data,setData]=useState<Status|null>(null);
  const [interval,setInterval]=useState<'monthly'|'annual'>('monthly'); const [overage,setOverage]=useState(false); const [limit,setLimit]=useState('');
  const [busy,setBusy]=useState(''); const [notice,setNotice]=useState(''); const [error,setError]=useState('');

  const call=useCallback(async(body:Record<string,unknown>)=>{
    const {data:{session}}=await supabase.auth.getSession(); if(!session?.access_token) throw new Error('unauthorized');
    const r=await fetch(`${FUNCTIONS_URL}/pixwiki-plan`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},body:JSON.stringify(body),cache:'no-store'});
    const j=await r.json().catch(()=>({})); if(!r.ok||j?.error) throw new Error(j?.error||`HTTP ${r.status}`); return j;
  },[supabase]);

  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace('/pix/login');return}
    const j=await call({action:'status'}); if(!j?.billing||!Array.isArray(j?.plans))throw new Error('billing_contract_outdated'); setData(j as Status); setOverage(j.billing.allow_overage===true); setLimit(j.billing.spending_limit_cents==null?'':String((Number(j.billing.spending_limit_cents)/100).toFixed(2).replace('.',','))); setInterval(j.billing.billing_interval==='annual'?'annual':'monthly'); setLoading(false);
  },[call,router,supabase]);

  useEffect(()=>{const saved=localStorage.getItem('publicTheme');setDark(saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches);load().catch((e)=>{setError(String(e?.message||'').includes('billing_contract_outdated')?'O serviço de planos ainda está em uma versão anterior. Atualize e tente novamente.':'Não foi possível carregar o billing.');setLoading(false)})},[load]);

  async function savePrefs(){setBusy('prefs');setError('');setNotice('');try{const cents=limit.trim()?Math.round(Number(limit.replace(',','.'))*100):null;if(cents!=null&&(!Number.isFinite(cents)||cents<0))throw new Error('invalid_limit');const j=await call({action:'preferences',allow_overage:overage,spending_limit_cents:cents});setData(j as Status);setNotice('Preferências de excedente salvas.')}catch(e:any){setError(String(e?.message||'').includes('invalid')?'Informe um limite válido.':'Não foi possível salvar as preferências.')}finally{setBusy('')}}
  async function buy(plan:PixWikiPlanKey){if(plan==='free')return;setBusy(`buy-${plan}`);setError('');setNotice('');try{const j=await call({action:'create_invoice',plan,billing_interval:interval});setData(j as Status);setNotice('Cobrança criada. Pague o Pix abaixo para ativar o plano.')}catch(e:any){const m=String(e?.message||'');if(m.includes('downgrade_requires_period_end'))setError('Downgrade só pode ser feito quando o período atual terminar.');else if(m.includes('complimentary_account'))setError('Sua conta está em VIP cortesia e não precisa gerar cobrança.');else setError('Não foi possível gerar a cobrança.')}finally{setBusy('')}}
  async function invoiceAction(inv:Invoice,refresh=false){setBusy(`${refresh?'refresh':'check'}-${inv.id}`);setError('');setNotice('');try{const j=await call({action:refresh?'refresh_invoice':'check_invoice',invoice_id:inv.id});setData(j as Status);setNotice(j?.paid?'Pagamento confirmado.':'Cobrança atualizada.')}catch{setError('Não foi possível atualizar esta cobrança.')}finally{setBusy('')}}
  async function cancel(){setBusy('cancel');try{const j=await call({action:'cancel_at_period_end'});setData(j as Status);setNotice('Cancelamento agendado para o fim do período.')}catch(e:any){setError(String(e?.message||'').includes('complimentary')?'VIP cortesia não precisa ser cancelado.':'Não foi possível agendar o cancelamento.')}finally{setBusy('')}}
  async function resume(){setBusy('resume');try{const j=await call({action:'resume'});setData(j as Status);setNotice('Renovação reativada.')}catch{setError('Não foi possível reativar a renovação.')}finally{setBusy('')}}
  async function copy(v:string){await navigator.clipboard.writeText(v);setNotice('Código Pix copiado.');}

  if(loading)return <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/></main>;
  if(!data)return <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center"><p className="text-lg font-black">Não foi possível abrir Plano e cobrança</p><p className="mt-2 text-sm text-white/55">{error||'Tente novamente em instantes.'}</p><div className="mt-5 flex justify-center gap-2"><button onClick={()=>{setError('');setLoading(true);void load().catch(()=>{setError('Não foi possível carregar o billing.');setLoading(false)})}} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950">Tentar novamente</button><button onClick={()=>router.push('/dashboard')} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black">Voltar</button></div></div></main>;
  const page=dark?'bg-[#020617] text-white':'bg-[#f7f8fa] text-slate-900';const card=dark?'border-white/10 bg-white/[0.035]':'border-black/10 bg-white';const inner=dark?'border-white/10 bg-black/10':'border-black/10 bg-slate-50';const muted=dark?'text-white/55':'text-slate-600';
  const plans=Array.isArray(data.plans)?data.plans:[]; const openInvoices=Array.isArray(data.open_invoices)?data.open_invoices:[]; const current=plans.find(p=>p.plan===data.billing.plan); const pending=openInvoices[0]||null;

  return <main className={`min-h-screen pb-28 ${page}`}><div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
    <PixWikiHeader plan={data.billing.plan} dark={dark} onThemeChange={setDark}/>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black">Plano e cobrança</h1><p className={`mt-2 text-sm ${muted}`}>0% de taxa PixWiki sobre o valor recebido. Você paga pela automação.</p></div><div className={`rounded-xl border px-4 py-2 text-xs font-black ${card}`}>{data.billing.complimentary?'VIP CORTESIA':String(data.billing.status||'active').toUpperCase()}</div></div>
    {(notice||error)&&<div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error?'border-red-500/25 bg-red-500/10 text-red-300':'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error||notice}</div>}
    {!data.can_manage_billing&&<div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">Somente o proprietário de uma empresa PixWiki pode alterar plano, excedente ou cobranças.</div>}

    <section className={`mt-5 rounded-3xl border p-5 sm:p-6 ${card}`}><div className="grid gap-4 md:grid-cols-4">
      <div><p className={`text-xs ${muted}`}>Plano atual</p><p className="mt-1 text-xl font-black">{current?.name||data.billing.plan}</p></div>
      <div><p className={`text-xs ${muted}`}>Ciclo</p><p className="mt-1 text-xl font-black">{data.billing.complimentary?'Sem vencimento':data.billing.billing_interval==='annual'?'Anual':'Mensal'}</p></div>
      <div><p className={`text-xs ${muted}`}>Próximo vencimento</p><p className="mt-1 text-xl font-black">{data.billing.complimentary?'—':date(data.billing.current_period_end)}</p></div>
      <div><p className={`text-xs ${muted}`}>Crédito PixWiki</p><p className="mt-1 text-xl font-black text-emerald-400">{money(data.billing.credit_balance_cents)}</p></div>
    </div>{!data.billing.complimentary&&data.billing.plan!=='free'&&<div className="mt-5 flex flex-wrap gap-2">{data.billing.cancel_at_period_end?<button onClick={resume} disabled={!data.can_manage_billing||!!busy} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950">Manter renovação</button>:<button onClick={cancel} disabled={!data.can_manage_billing||!!busy} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${card}`}>Cancelar no fim do período</button>}</div>}</section>

    <section className={`mt-4 rounded-3xl border p-5 sm:p-6 ${card}`}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-black">Excedente controlado</h2><p className={`mt-1 max-w-2xl text-sm ${muted}`}>Se ativado, as automações podem continuar após a franquia. O fechamento aplica automaticamente a faixa mais econômica para o volume do mês.</p></div><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={overage} onChange={e=>setOverage(e.target.checked)} className="h-5 w-5 accent-emerald-500"/>Ativar excedente</label></div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1"><span className={`text-xs font-black ${muted}`}>Limite mensal de excedente (opcional)</span><input disabled={!overage} value={limit} onChange={e=>setLimit(e.target.value.replace(/[^0-9,.]/g,''))} placeholder="Ex.: 500,00" className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none ${inner}`}/></label><button onClick={savePrefs} disabled={!data.can_manage_billing||busy==='prefs'} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy==='prefs'?'Salvando…':'Salvar'}</button></div>
      <p className={`mt-3 text-xs ${muted}`}>O limite nunca bloqueia recebimentos, histórico ou Push. Ele pausa somente novas automações pagas.</p>
    </section>

    {pending&&<section className="mt-4 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-amber-300">Cobrança pendente</p><h2 className="mt-2 text-2xl font-black">{pending.invoice_type==='overage'?'Excedente do mês':'Plano '+pending.target_plan.toUpperCase()}</h2><p className="mt-1 text-3xl font-black">{money(pending.amount_cents)}</p>{pending.invoice_type==='overage'&&<p className="mt-2 text-sm text-amber-100/75">{n(pending.overage_units)} unidades excedentes · proteção aplicada: {pending.protected_plan?.toUpperCase()||'—'}</p>}</div>{pending.qr_code_url&&<Image src={pending.qr_code_url} alt="QR Code Pix" width={176} height={176} unoptimized className="h-44 w-44 rounded-2xl bg-white p-2"/>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{pending.pix_code&&<button onClick={()=>copy(pending.pix_code!)} className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950">Copiar Pix</button>}<button onClick={()=>invoiceAction(pending,false)} disabled={!data.can_manage_billing||!!busy} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${card}`}>Conferir pagamento</button><button onClick={()=>invoiceAction(pending,true)} disabled={!data.can_manage_billing||!!busy} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${card}`}>Gerar novo QR</button></div>
      {pending.grace_until&&<p className="mt-3 text-xs text-amber-100/70">Carência até {new Date(pending.grace_until).toLocaleDateString('pt-BR')}. Depois disso apenas as automações pagas são pausadas.</p>}
    </section>}

    <section className="mt-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Planos V2</h2><p className={`mt-1 text-sm ${muted}`}>Escolha o ciclo. O anual equivale a 10 mensalidades.</p></div><div className={`flex rounded-xl border p-1 ${card}`}><button onClick={()=>setInterval('monthly')} className={`rounded-lg px-3 py-2 text-xs font-black ${interval==='monthly'?'bg-emerald-500 text-slate-950':''}`}>Mensal</button><button onClick={()=>setInterval('annual')} className={`rounded-lg px-3 py-2 text-xs font-black ${interval==='annual'?'bg-emerald-500 text-slate-950':''}`}>Anual</button></div></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map(plan=>{const price=interval==='annual'?plan.annual_price_cents:plan.monthly_price_cents;const active=plan.plan===data.billing.plan;return <article key={plan.plan} className={`rounded-3xl border p-5 ${active?'border-emerald-500/40 bg-emerald-500/[0.06]':card}`}><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{plan.name}</h3><p className={`mt-1 text-xs ${muted}`}>{n(plan.included_automations)} automações/mês</p></div>{active&&<span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-black text-slate-950">ATUAL</span>}</div><p className="mt-5 text-3xl font-black">{money(price)}</p><p className={`mt-1 text-xs ${muted}`}>{interval==='annual'?'por ano':'por mês'}{plan.plan==='free'?'':' · excedente '+money(plan.overage_price_cents)+'/automação'}</p><button onClick={()=>buy(plan.plan)} disabled={!data.can_manage_billing||plan.plan==='free'||data.billing.complimentary||!!busy} className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40 ${active?card:'bg-emerald-500 text-slate-950'}`}>{plan.plan==='free'?'Plano gratuito':active?'Renovar':'Escolher plano'}</button></article>})}</div>
    </section>

    <section className={`mt-4 rounded-3xl border p-5 ${card}`}><h2 className="text-lg font-black">Como funciona a faixa mais econômica</h2><p className={`mt-2 text-sm leading-6 ${muted}`}>A base do seu plano é pré-paga. No fechamento de cada mês, o PixWiki compara seu custo de excedente com as outras faixas mensais e cobra apenas a menor diferença possível. No anual, o desconto permanece na base; os degraus de volume continuam mensais.</p></section>
  </div><PixWikiDashboardNav dark={dark}/></main>
}
