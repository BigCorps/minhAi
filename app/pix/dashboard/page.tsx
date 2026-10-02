'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { connectMercadoPago } from '@/lib/connectMercadoPago';
import PixWikiHeader, { type PixWikiPlanKey } from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';
import PixWikiPush from '@/components/pix/PixWikiPush';
import PixWikiFastWatch from '@/components/pix/PixWikiFastWatch';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type ReceiptItem = { id:string; amount_cents:number; fee_amount_cents:number; net_amount_cents:number; source:string; received_at:string; checkout_id:string|null; external_id:string|null };

type Snapshot = {
  company: { id:string; name:string; slug:string; logo_url:string|null; role:string };
  companies: Array<{ id:string; name:string; slug:string; logo_url:string|null; role:string }>;
  billing: { plan:PixWikiPlanKey; billing_interval:string; status:string; allow_overage:boolean; spending_limit_cents:number|null; complimentary:boolean; base_price_cents:number; overage_price_cents:number };
  usage: { period_start:string; period_end:string; used_units:number; included_automations:number; remaining_units:number; used_percent:number; overage_units:number; convenience_credit_cents:number; threshold:'ok'|'warning'|'critical'|'limit'; origins:Record<string,number> };
  projection: { projected_units:number; days_elapsed:number; days_in_month:number; days_remaining:number; best_plan:PixWikiPlanKey; best_plan_name:string; best_cost_cents:number; current_plan_projected_cost_cents:number; potential_savings_cents:number };
  notifications: { notification_email:string|null; notification_phone:string|null; email_enabled:boolean; push_enabled:boolean; whatsapp_enabled:boolean };
  setup: { mp_connected:boolean; pix_key_configured:boolean; pix_key_type:string|null; pix_key_masked:string|null; onboarding_completed:boolean };
  stats: { last_hour_count:number; last_hour_cents:number; today_count:number; today_cents:number; month_count:number; month_cents:number };
  recent_receipts: ReceiptItem[];
  generated_at:string;
};

function money(cents:number|null|undefined) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100); }
function number(value:number|null|undefined) { return new Intl.NumberFormat('pt-BR').format(Number(value||0)); }
function dateTime(value:string) { return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function sourceLabel(source:string) { return ({pix_key:'Chave Pix',pix_link:'Pix Link',checkout:'Checkout',api:'API'} as Record<string,string>)[source] || 'Pix'; }
function digits(value:string) { return value.replace(/\D/g,'').slice(0,15); }
function receiptDayKey(value:string) {
  return new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).split('/').reverse().join('-');
}
function receiptDayLabel(dayKey:string) {
  const today=receiptDayKey(new Date().toISOString());
  const yesterday=receiptDayKey(new Date(Date.now()-86400000).toISOString());
  if(dayKey===today)return 'Hoje';
  if(dayKey===yesterday)return 'Ontem';
  const [year,month,day]=dayKey.split('-');
  return `${day}/${month}/${year}`;
}

export default function PixWikiDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [dark,setDark] = useState(true);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [snapshot,setSnapshot] = useState<Snapshot|null>(null);
  const [userId,setUserId] = useState('');
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [emailEnabled,setEmailEnabled] = useState(false);
  const [pushEnabled,setPushEnabled] = useState(true);
  const [whatsappEnabled,setWhatsappEnabled] = useState(false);
  const [savingChannels,setSavingChannels] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [companyMenuOpen,setCompanyMenuOpen] = useState(false);
  const [receiptHistory,setReceiptHistory] = useState<ReceiptItem[]>([]);
  const [receiptFilter,setReceiptFilter] = useState<'all'|'pix_key'|'pix_link'|'checkout'|'api'>('all');
  const [visibleReceiptDays,setVisibleReceiptDays] = useState(1);

  const loadReceiptHistory = useCallback(async (companyId:string) => {
    const {data,error:historyError}=await supabase.rpc('pixwiki_v2_recent_receipts',{p_company_id:companyId,p_limit:200});
    if(historyError) throw historyError;
    setReceiptHistory((Array.isArray(data)?data:[]) as ReceiptItem[]);
  },[supabase]);

  const loadSnapshot = useCallback(async (companyId?:string|null, quiet=false) => {
    if (!quiet) setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace('/pix/login'); return; }
    setUserId(auth.user.id);
    const requested = companyId || new URL(window.location.href).searchParams.get('company') || localStorage.getItem('pixWikiActiveCompanyId');
    const { data, error: rpcError } = await supabase.rpc('pixwiki_v2_dashboard_snapshot',{ p_company_id: requested || null });
    if (rpcError || !data) {
      if (String(rpcError?.message||'').includes('company_not_found')) {
        const { data: ctx } = await supabase.rpc('pixwiki_v2_my_access_context');
        if (Number(ctx?.pending_invites || 0) > 0) { router.replace('/pix/equipe/aceitar'); return; }
        if (ctx?.has_cashier === true) { router.replace('/pix/caixa'); return; }
        router.replace('/pix/onboarding'); return;
      }
      throw rpcError || new Error('dashboard_snapshot_failed');
    }
    const next = data as Snapshot;
    setSnapshot(next);
    localStorage.setItem('pixWikiActiveCompanyId',next.company.id);
    setEmail(next.notifications.notification_email || auth.user.email || '');
    setPhone(next.notifications.notification_phone || '');
    setEmailEnabled(next.notifications.email_enabled === true);
    setPushEnabled(next.notifications.push_enabled !== false);
    setWhatsappEnabled(next.notifications.whatsapp_enabled === true);
    if (!quiet) setLoading(false);
  },[router,supabase]);

  useEffect(() => {
    const saved=localStorage.getItem('publicTheme');
    setDark(saved ? saved==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    loadSnapshot().catch(() => { setError('Não foi possível carregar o painel agora.'); setLoading(false); });
  },[loadSnapshot]);

  useEffect(() => {
    if (!snapshot?.company.id) return;
    let cancelled=false;
    const timer=window.setInterval(() => {
      if (!cancelled && document.visibilityState==='visible') loadSnapshot(snapshot.company.id,true).catch(()=>undefined);
    },5000);
    return () => { cancelled=true; window.clearInterval(timer); };
  },[snapshot?.company.id,loadSnapshot]);

  useEffect(() => {
    if(!snapshot?.company.id)return;
    setVisibleReceiptDays(1);
    void loadReceiptHistory(snapshot.company.id).catch(()=>undefined);
  },[snapshot?.company.id,loadReceiptHistory]);

  useEffect(() => {
    if(!snapshot?.company.id || !snapshot.recent_receipts?.[0]?.id)return;
    void loadReceiptHistory(snapshot.company.id).catch(()=>undefined);
  },[snapshot?.company.id,snapshot?.recent_receipts?.[0]?.id,loadReceiptHistory]);

  async function refreshNow() {
    if (!snapshot?.company.id || refreshing) return;
    setRefreshing(true); setError(''); setNotice('');
    try {
      if (snapshot.setup.mp_connected) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${FUNCTIONS_URL}/pixwiki-refresh`,{
            method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},
            body:JSON.stringify({company_id:snapshot.company.id}),cache:'no-store',
          }).catch(()=>undefined);
        }
      }
      await Promise.all([loadSnapshot(snapshot.company.id,true),loadReceiptHistory(snapshot.company.id)]);
      setNotice('Painel atualizado.');
    } finally { setRefreshing(false); }
  }

  function switchCompany(id:string) {
    localStorage.setItem('pixWikiActiveCompanyId',id);
    const url=new URL(window.location.href); url.searchParams.set('company',id); window.history.replaceState({},'',url.toString());
    setLoading(true); loadSnapshot(id).catch(()=>{setError('Não foi possível trocar de empresa.');setLoading(false);});
  }

  async function saveChannels() {
    if (!snapshot) return;
    setSavingChannels(true); setError(''); setNotice('');
    try {
      const { data,error:rpcError } = await supabase.rpc('pixwiki_v2_update_notification_settings',{
        p_company_id:snapshot.company.id,p_email:email.trim()||null,p_email_enabled:emailEnabled,
        p_push_enabled:pushEnabled,p_phone:digits(phone)||null,p_whatsapp_enabled:whatsappEnabled,
      });
      if (rpcError) throw rpcError;
      setPhone(String(data?.notification_phone||''));
      setNotice('Canais de notificação atualizados.');
      await loadSnapshot(snapshot.company.id,true);
    } catch (e:any) {
      const msg=String(e?.message||'');
      if (msg.includes('invalid_notification_email')) setError('Informe um e-mail válido para ativar avisos por e-mail.');
      else if (msg.includes('invalid_notification_phone')) setError('Informe um WhatsApp válido com DDD.');
      else setError('Não foi possível salvar os canais.');
    } finally { setSavingChannels(false); }
  }

  if (loading || !snapshot) return <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" /></main>;

  const isDark=dark;
  const page=isDark?'bg-[#020617] text-white':'bg-[#f7f8fa] text-slate-900';
  const card=isDark?'border-white/10 bg-white/[0.035]':'border-black/10 bg-white shadow-sm';
  const inner=isDark?'border-white/10 bg-black/15':'border-black/10 bg-slate-50';
  const muted=isDark?'text-white/55':'text-slate-500';
  const faint=isDark?'text-white/35':'text-slate-400';
  const input=isDark?'border-white/10 bg-white/[0.05] text-white':'border-black/10 bg-white text-slate-900';
  const usagePct=Math.max(0,Math.min(100,Number(snapshot.usage.used_percent||0)));
  const thresholdClass=snapshot.usage.threshold==='limit'?'bg-red-500':snapshot.usage.threshold==='critical'?'bg-orange-500':snapshot.usage.threshold==='warning'?'bg-amber-400':'bg-emerald-500';
  const filteredReceipts=receiptHistory.filter(r=>receiptFilter==='all'||r.source===receiptFilter);
  const receiptGroups=(Object.values(filteredReceipts.reduce<Record<string,{dayKey:string;totalNet:number;items:ReceiptItem[]}>>((groups,r)=>{
    const dayKey=receiptDayKey(r.received_at);
    if(!groups[dayKey])groups[dayKey]={dayKey,totalNet:0,items:[]};
    groups[dayKey].totalNet+=Number(r.net_amount_cents||r.amount_cents||0);
    groups[dayKey].items.push(r);
    return groups;
  },{})) as Array<{dayKey:string;totalNet:number;items:ReceiptItem[]}>).sort((a,b)=>b.dayKey.localeCompare(a.dayKey));
  const visibleReceiptGroups=receiptGroups.slice(0,visibleReceiptDays);
  const hasMoreReceiptDays=receiptGroups.length>visibleReceiptDays;

  return (
    <main className={`min-h-screen pb-28 ${page}`}>
      <PixWikiFastWatch />
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <PixWikiHeader plan={snapshot.billing.plan||'free'} dark={dark} onThemeChange={setDark} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {snapshot.companies.length>1 ? <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <button type="button" onClick={()=>setCompanyMenuOpen(v=>!v)} aria-haspopup="listbox" aria-expanded={companyMenuOpen} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm outline-none ${input}`}>
              <span className="truncate">{snapshot.company.name}</span><span className={`text-xs transition-transform ${companyMenuOpen?'rotate-180':''}`}>⌄</span>
            </button>
            {companyMenuOpen&&<div role="listbox" className={`absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border p-1 shadow-2xl ${isDark?'border-white/10 bg-slate-900 text-white':'border-black/10 bg-white text-slate-900'}`}>
              {snapshot.companies.map(c=><button type="button" role="option" aria-selected={c.id===snapshot.company.id} key={c.id} onClick={()=>{setCompanyMenuOpen(false);if(c.id!==snapshot.company.id)switchCompany(c.id)}} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${c.id===snapshot.company.id?'bg-emerald-500/15 font-black text-emerald-400':isDark?'hover:bg-white/10':'hover:bg-slate-100'}`}>{c.name}</button>)}
            </div>}
          </div> : <div className={`rounded-xl border px-3 py-2.5 text-sm ${card}`}>{snapshot.company.name}</div>}
          <button onClick={refreshNow} disabled={refreshing} className={`rounded-xl border px-3 py-2.5 text-xs font-black ${card} disabled:opacity-50`}>{refreshing?'Atualizando…':'Atualizar'}</button>
          {!snapshot.setup.mp_connected && <button onClick={()=>connectMercadoPago(snapshot.company.id,`/dashboard?company=${encodeURIComponent(snapshot.company.id)}`)} className="rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-black text-white">Conectar Mercado Pago</button>}
        </div>

        {(notice||error) && <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error?'border-red-500/25 bg-red-500/10 text-red-300':'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error||notice}</div>}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Última hora',money(snapshot.stats.last_hour_cents),`${number(snapshot.stats.last_hour_count)} Pix`],
            ['Hoje',money(snapshot.stats.today_cents),`${number(snapshot.stats.today_count)} Pix`],
            ['Este mês',money(snapshot.stats.month_cents),`${number(snapshot.stats.month_count)} Pix`],
            ['Automações',`${number(snapshot.usage.used_units)} / ${number(snapshot.usage.included_automations)}`,`${number(snapshot.usage.remaining_units)} incluídas restantes`],
          ].map(([label,value,sub])=><div key={label} className={`rounded-2xl border p-5 ${card}`}><p className={`text-xs font-semibold ${muted}`}>{label}</p><p className="mt-2 text-2xl font-black tracking-tight">{value}</p><p className={`mt-1 text-xs ${faint}`}>{sub}</p></div>)}
        </section>

        <details className={`group mt-4 rounded-3xl border ${card}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">Uso deste mês</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${snapshot.usage.threshold==='limit'?'bg-red-500/15 text-red-300':snapshot.usage.threshold==='critical'?'bg-orange-500/15 text-orange-300':snapshot.usage.threshold==='warning'?'bg-amber-500/15 text-amber-300':'bg-emerald-500/15 text-emerald-300'}`}>{snapshot.usage.threshold==='limit'?'FRANQUIA ATINGIDA':snapshot.usage.threshold==='critical'?'85%+':snapshot.usage.threshold==='warning'?'70%+':'NORMAL'}</span></div>
              <p className={`mt-1 text-xs ${muted}`}>{number(snapshot.usage.used_units)} de {number(snapshot.usage.included_automations)} automações usadas</p>
            </div>
            <span className={`shrink-0 text-2xl transition group-open:rotate-45 ${faint}`} aria-hidden="true">+</span>
          </summary>
          <div className="border-t border-white/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><p className={`max-w-2xl text-sm leading-6 ${muted}`}>1 recebimento automatizado consome no máximo 1 unidade, mesmo com mais de um canal. Push e acompanhamento no dashboard continuam gratuitos.</p><Link href="/dashboard/uso" className={`rounded-xl border px-4 py-2.5 text-xs font-black ${card}`}>Ver detalhes de uso</Link></div>
            <div className={`mt-5 h-3 overflow-hidden rounded-full ${isDark?'bg-white/10':'bg-slate-200'}`}><div className={`h-full rounded-full transition-all ${thresholdClass}`} style={{width:`${usagePct}%`}} /></div>
            <div className={`mt-2 flex justify-between text-xs ${muted}`}><span>{number(snapshot.usage.used_units)} usadas</span><span>{number(snapshot.usage.included_automations)} incluídas</span></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Projeção do mês</p><p className="mt-1 text-xl font-black">{number(snapshot.projection.projected_units)}</p><p className={`mt-1 text-[11px] ${faint}`}>Com base no ritmo até hoje.</p></div>
              <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Faixa mais econômica projetada</p><p className="mt-1 text-xl font-black text-emerald-400">{snapshot.projection.best_plan_name}</p><p className={`mt-1 text-[11px] ${faint}`}>Estimativa: {money(snapshot.projection.best_cost_cents)}/mês</p></div>
              <div className={`rounded-2xl border p-4 ${inner}`}><p className={`text-xs ${muted}`}>Excedente</p><p className="mt-1 text-xl font-black">{snapshot.billing.allow_overage?'Ativado':'Desativado'}</p><p className={`mt-1 text-[11px] ${faint}`}>{snapshot.billing.allow_overage?'Uso pode seguir dentro do limite definido.':'Ao acabar a franquia, automações pagas pausam.'}</p></div>
            </div>
          </div>
        </details>

        <section className="mt-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-black">Recebimentos</h2><p className={`mt-1 text-xs ${muted}`}>Recebimentos confirmados, organizados por dia.</p></div>
            <div className={`flex w-max rounded-xl border p-1 ${card}`}>
              {([['all','Todos'],['pix_key','Chave Pix'],['pix_link','Pix Link'],['checkout','Checkout'],['api','API']] as const).map(([key,label])=><button key={key} type="button" onClick={()=>{setReceiptFilter(key);setVisibleReceiptDays(1)}} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${receiptFilter===key?'bg-emerald-500 text-slate-950':muted}`}>{label}</button>)}
            </div>
          </div>
          <div className={`overflow-hidden rounded-3xl border ${card}`}>
            {filteredReceipts.length===0?<div className="p-8 text-center"><p className="font-semibold">Nenhum recebimento neste filtro.</p><p className={`mt-1 text-sm ${muted}`}>Quando um Pix for identificado, ele aparece aqui.</p></div>:<div>
              {visibleReceiptGroups.map((group,groupIndex)=>{
                const itemBorder=isDark?'border-white/5':'border-black/5'; const dayHeader=isDark?'border-white/5 bg-white/[0.025]':'border-black/5 bg-slate-50'; const rowDivider=isDark?'divide-white/5':'divide-black/5';
                return <details key={group.dayKey} className={`${groupIndex>0?`border-t ${itemBorder} `:''}group`} open={groupIndex===0}>
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b px-4 py-3 sm:px-5 ${dayHeader}`}>
                    <div><p className="text-sm font-black">{receiptDayLabel(group.dayKey)}</p><p className={`mt-0.5 text-[11px] ${muted}`}>{group.items.length} {group.items.length===1?'recebimento':'recebimentos'}</p></div>
                    <div className="ml-auto flex items-center gap-3 text-right"><div><p className={`text-[10px] font-bold uppercase tracking-wide ${faint}`}>Total do dia</p><p className="mt-0.5 text-lg font-black text-emerald-400">{money(group.totalNet)}</p></div><span className={`text-xl transition group-open:rotate-180 ${faint}`}>⌄</span></div>
                  </summary>
                  <div className={`divide-y ${rowDivider}`}>{group.items.map(r=><div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xl font-black">{money(r.net_amount_cents||r.amount_cents)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.source==='pix_link'?'bg-sky-500/10 text-sky-400':r.source==='checkout'?'bg-violet-500/10 text-violet-300':r.source==='api'?'bg-amber-500/10 text-amber-300':'bg-emerald-500/10 text-emerald-400'}`}>{sourceLabel(r.source).toUpperCase()}</span></div><p className={`mt-1 text-xs ${muted}`}>{new Date(r.received_at).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})}{r.external_id?` · ${r.external_id}`:''}</p></div><div className="text-left sm:text-right"><p className={`text-[10px] font-bold uppercase tracking-wide ${faint}`}>Recebido</p><p className="text-sm font-black text-emerald-400">Confirmado</p></div></div>)}</div>
                </details>;
              })}
              {(hasMoreReceiptDays||visibleReceiptDays>1)&&<div className={`flex flex-wrap justify-center gap-2 border-t px-4 py-4 ${isDark?'border-white/5 bg-white/[0.015]':'border-black/5 bg-slate-50/80'}`}>{hasMoreReceiptDays&&<button type="button" onClick={()=>setVisibleReceiptDays(v=>Math.min(v+7,receiptGroups.length))} className={`rounded-xl border px-4 py-2 text-xs font-black ${card}`}>Ver mais dias</button>}{visibleReceiptDays>1&&<button type="button" onClick={()=>setVisibleReceiptDays(1)} className={`rounded-xl border px-4 py-2 text-xs font-black ${card}`}>Mostrar menos</button>}</div>}
            </div>}
          </div>
          <div className="mt-3 text-right"><Link href="/dashboard/relatorios" className="text-xs font-black text-emerald-400">Abrir relatório completo →</Link></div>
        </section>

        <section className={`mt-4 rounded-3xl border p-5 ${card}`}>
          <h2 className="text-lg font-black">Como cobrar</h2><p className={`mt-1 text-xs ${muted}`}>Todos os caminhos usam o mesmo recebimento e histórico.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[['Chave Pix','Receba normalmente pela sua própria chave.','/dashboard/pagamentos'],['Pix Link',`${snapshot.company.slug}.pix.wiki`,'/dashboard/pagamentos'],['Checkout','Pedido identificado + metadata.','/dashboard/pagamentos'],['API','Para ERP, e-commerce e sistemas.','/dashboard/api']].map(([title,desc,href])=><Link key={title} href={href} className={`block rounded-2xl border p-4 transition hover:border-emerald-500/30 ${inner}`}><p className="text-sm font-black">{title}</p><p className={`mt-1 text-xs ${muted}`}>{desc}</p></Link>)}</div>
        </section>

        <section className={`mt-4 rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-black">Avisos de recebimento</h2><p className={`mt-1 text-sm ${muted}`}>Escolha cada canal separadamente. Push é gratuito; E-mail, WhatsApp e Webhook compartilham a automação do mesmo Pix.</p></div></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${inner}`}>
              <label className="flex items-center justify-between gap-4"><div><p className="text-sm font-black">E-mail</p><p className={`mt-1 text-xs ${muted}`}>Confirmação para o endereço abaixo.</p></div><input type="checkbox" checked={emailEnabled} onChange={e=>setEmailEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-500" /></label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="financeiro@empresa.com" className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${input}`} />
            </div>
            <div className={`rounded-2xl border p-4 ${inner}`}>
              <label className="flex items-center justify-between gap-4"><div><p className="text-sm font-black">WhatsApp</p><p className={`mt-1 text-xs ${muted}`}>Ative apenas se quiser este canal.</p></div><input type="checkbox" checked={whatsappEnabled} onChange={e=>setWhatsappEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-500" /></label>
              <input value={phone} onChange={e=>setPhone(digits(e.target.value))} inputMode="tel" placeholder="5511999999999" className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${input}`} />
            </div>
            <div className={`rounded-2xl border p-4 lg:col-span-2 ${inner}`}>
              <label className="flex items-center justify-between gap-4"><div><p className="text-sm font-black">Push</p><p className={`mt-1 text-xs ${muted}`}>Grátis para todos os dispositivos autorizados desta empresa.</p></div><input type="checkbox" checked={pushEnabled} onChange={e=>setPushEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-500" /></label>
              {pushEnabled && userId && <div className="mt-3"><PixWikiPush userId={userId} companyId={snapshot.company.id} dark={dark} /></div>}
            </div>
          </div>
          <button onClick={saveChannels} disabled={savingChannels} className="mt-4 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{savingChannels?'Salvando…':'Salvar canais'}</button>
        </section>

        {(!snapshot.setup.mp_connected || !snapshot.setup.pix_key_configured) && <section className="mt-4 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5"><h2 className="font-black text-amber-300">Configuração incompleta</h2><p className="mt-2 text-sm text-amber-200/80">Para detectar e confirmar seus Pix automaticamente, mantenha o Mercado Pago conectado e uma chave Pix configurada.</p><Link href="/pix/onboarding" className="mt-4 inline-flex rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950">Revisar configuração</Link></section>}
      </div>
      <PixWikiDashboardNav dark={dark} />
    </main>
  );
}
