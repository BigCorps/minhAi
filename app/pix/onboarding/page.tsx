'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { connectMercadoPago } from '@/lib/connectMercadoPago';
import PixWikiPush from '@/components/pix/PixWikiPush';

type Screen = 'loading' | 'connect' | 'pixkey' | 'channels' | 'firstpix' | 'success' | 'explore' | 'calculator' | 'done' | 'error';
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | '';

type Company = { id: string; name: string; slug: string; logo_url?: string | null };
type PendingSignup = { slug: string; nome: string; email: string | null; wa: string | null; logo: string | null; version?: number };
type CalculatorLeadDraft = { version?: number; monthlyPix: number; ticketCents: number; feeType: 'percent'|'fixed'|'free'|'unknown'; feeValue: number; currentCostCents: number; pixwikiCostCents: number; savingsCents: number; interestedPlan: 'free'|'link'|'pro'|'vip'; savedAt?: string };

type Snapshot = {
  company_id: string;
  company_name: string;
  company_slug: string;
  mp_connected: boolean;
  pix_key: string | null;
  pix_key_type: string | null;
  notification_email: string | null;
  notification_phone: string | null;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  push_device_count: number;
  account_created_at: string | null;
  mp_connected_at: string | null;
  pix_key_configured_at: string | null;
  push_enabled_at: string | null;
  email_enabled_at: string | null;
  whatsapp_enabled_at: string | null;
  channels_configured_at: string | null;
  first_receipt_test_started_at: string | null;
  first_receipt_at: string | null;
  first_receipt_id: string | null;
  link_tested_at: string | null;
  checkout_tested_at: string | null;
  api_tested_at: string | null;
  webhook_tested_at: string | null;
  pricing_viewed_at: string | null;
  estimated_monthly_pix: number | null;
  estimated_ticket_cents: number | null;
  current_fee_type: 'percent' | 'fixed' | 'free' | 'unknown' | null;
  current_fee_value: number | null;
  estimated_current_cost_cents: number | null;
  estimated_pixwiki_cost_cents: number | null;
  estimated_savings_cents: number | null;
  interested_plan: 'free' | 'link' | 'pro' | 'vip' | null;
  last_step: string | null;
  lead_score: number;
  completed_at: string | null;
};

type FirstReceipt = { detected: boolean; receipt_id: string | null; amount_cents: number | null; source: string | null; received_at: string | null };
type TestResult = { url: string; id?: string; response?: string };
type Quote = { plan: 'free'|'link'|'pro'|'vip'; plan_name: string; included_automations: number; base_price_cents: number; overage_units: number; overage_price_cents: number; total_price_cents: number; is_best_price: boolean };

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function pixPath(path: string) {
  if (typeof window === 'undefined') return `/pix${path}`;
  const h = window.location.hostname.toLowerCase();
  return h === 'pix.wiki' || h === 'www.pix.wiki' ? path : `/pix${path}`;
}

function brl(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

function detectPixKeyType(value: string): PixKeyType {
  const clean = value.trim();
  const digits = clean.replace(/\D/g, '');
  if (clean.includes('@')) return 'email';
  if (/^[0-9a-fA-F-]{36}$/.test(clean)) return 'random';
  if (digits.length === 14) return 'cnpj';
  if (digits.length === 11 && !clean.startsWith('+') && !clean.includes('(')) return 'cpf';
  if (clean.startsWith('+') || clean.includes('(') || (digits.length >= 10 && digits.length <= 13)) return 'phone';
  return '';
}

function makeSlug(name: string) {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,28) || 'pixwiki';
  return `${base}-${Math.random().toString(36).slice(2,7)}`.slice(0,40);
}

function deriveScreen(s: Snapshot): Screen {
  if (s.completed_at) return 'done';
  if (!s.mp_connected) return 'connect';
  if (!s.pix_key_configured_at || !s.pix_key) return 'pixkey';
  if (!s.channels_configured_at) return 'channels';
  if (!s.first_receipt_at) return 'firstpix';
  return 'success';
}

function Progress({ screen }: { screen: Screen }) {
  const ordered: Screen[] = ['connect','pixkey','channels','firstpix','success'];
  const current = Math.max(0, ordered.indexOf(screen));
  return (
    <div className="grid grid-cols-5 gap-2" aria-label="Progresso do onboarding">
      {ordered.map((s,i)=><div key={s} className={`h-1.5 rounded-full ${i<=current?'bg-emerald-400':'bg-white/10'}`} />)}
    </div>
  );
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function OnboardingContent() {
  const supabase = useMemo(() => createClient(), []);
  const search = useSearchParams();
  const [dark, setDark] = useState(true);
  const [screen, setScreen] = useState<Screen>('loading');
  const [userId, setUserId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState<PixKeyType>('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [firstPixWaitSeconds, setFirstPixWaitSeconds] = useState(0);
  const [firstReceipt, setFirstReceipt] = useState<FirstReceipt | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [monthlyPix, setMonthlyPix] = useState('1000');
  const [ticket, setTicket] = useState('100');
  const [feeType, setFeeType] = useState<'percent'|'fixed'|'free'|'unknown'>('percent');
  const [feeValue, setFeeValue] = useState('1');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [currentCost, setCurrentCost] = useState(0);
  const pollRef = useRef<number | null>(null);
  const firstPixStartedAtRef = useRef<number | null>(null);

  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white shadow-sm';
  const muted = dark ? 'text-white/60' : 'text-slate-600';
  const faint = dark ? 'text-white/40' : 'text-slate-500';
  const input = dark ? 'border-white/10 bg-white/[0.055] text-white placeholder:text-white/25' : 'border-black/10 bg-white text-slate-900 placeholder:text-slate-400';

  const loadSnapshot = useCallback(async (companyId: string) => {
    const { data, error: rpcError } = await supabase.rpc('pixwiki_v2_onboarding_get', { p_company_id: companyId });
    if (rpcError) throw rpcError;
    const row = (Array.isArray(data) ? data[0] : data) as Snapshot | null;
    if (!row) throw new Error('onboarding_state_unavailable');
    setSnapshot(row);
    setPixKey(row.pix_key || '');
    setPixType((row.pix_key_type as PixKeyType) || '');
    setEmailEnabled(!!row.email_enabled);
    setPushEnabled(!!row.push_enabled);
    setWhatsappEnabled(!!row.whatsapp_enabled);
    setNotificationEmail(row.notification_email || authEmail || '');
    setNotificationPhone(row.notification_phone || '');
    if (row.estimated_monthly_pix != null) setMonthlyPix(String(row.estimated_monthly_pix));
    if (row.estimated_ticket_cents != null) setTicket((row.estimated_ticket_cents / 100).toFixed(2).replace('.', ','));
    if (row.current_fee_type) setFeeType(row.current_fee_type);
    if (row.current_fee_value != null) setFeeValue(String(row.current_fee_value).replace('.', ','));
    return row;
  }, [authEmail, supabase]);

  const ensureCompany = useCallback(async (uid: string, email: string | null) => {
    const { data: listed } = await supabase.rpc('pixwiki_list_my_companies');
    let rows = Array.isArray(listed) ? listed as any[] : [];
    let selected = rows.find(x=>x.is_primary) || rows[0] || null;

    if (!selected) {
      let pending: PendingSignup | null = null;
      try { pending = JSON.parse(localStorage.getItem('pixWikiPendingSignupV2') || 'null'); } catch { pending = null; }
      if (!pending?.nome) throw new Error('pending_signup_missing');
      const { data: created, error: createError } = await supabase.rpc('ensure_my_pix_wiki_company', {
        p_slug: pending.slug || makeSlug(pending.nome),
        p_name: pending.nome,
        p_logo_url: pending.logo,
        p_whatsapp: pending.wa,
        p_email: pending.email || email,
      }).single();
      if (createError || !created) throw createError || new Error('company_create_failed');
      selected = { id: (created as any).id, slug: (created as any).slug, name: pending.nome, logo_url: pending.logo };

      await Promise.all([
        supabase.from('demo_sessions').insert({
          nome_negocio: pending.nome, email: pending.email || email, phone: pending.wa,
          origem_simples: 'pixwiki', linked_user_id: uid, linked_company_id: selected.id,
          linked_at: new Date().toISOString(), status: 'converted',
        }).then(()=>undefined,()=>undefined),
        supabase.from('short_links').insert({
          slug: selected.slug, type: 'pix_wiki', company_id: selected.id, user_id: uid,
          original_url: `https://${selected.slug}.pix.wiki`,
        }).then(()=>undefined,()=>undefined),
      ]);
      localStorage.removeItem('pixWikiPendingSignupV2');
    }

    localStorage.setItem('pixWikiActiveCompanyId', selected.id);
    await supabase.rpc('pixwiki_v2_onboarding_begin', { p_company_id: selected.id });
    return { id: selected.id, name: selected.name || 'Minha empresa', slug: selected.slug, logo_url: selected.logo_url || null } as Company;
  }, [supabase]);

  const importCalculatorLead = useCallback(async (companyId: string) => {
    let draft: CalculatorLeadDraft | null = null;
    try { draft = JSON.parse(localStorage.getItem('pixWikiCalculatorLead') || 'null'); } catch { draft = null; }
    if (!draft || !Number.isFinite(Number(draft.monthlyPix)) || Number(draft.monthlyPix) <= 0) return;

    const savedAt = draft.savedAt ? new Date(draft.savedAt).getTime() : Date.now();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('pixWikiCalculatorLead');
      return;
    }

    const allowedFee = ['percent','fixed','free','unknown'].includes(String(draft.feeType));
    const allowedPlan = ['free','link','pro','vip'].includes(String(draft.interestedPlan));
    if (!allowedFee || !allowedPlan) return;

    const { error: importError } = await supabase.rpc('pixwiki_v2_onboarding_save_estimate', {
      p_company_id: companyId,
      p_monthly_pix: Math.max(0, Math.floor(Number(draft.monthlyPix) || 0)),
      p_ticket_cents: Math.max(0, Math.floor(Number(draft.ticketCents) || 0)),
      p_fee_type: draft.feeType,
      p_fee_value: Math.max(0, Number(draft.feeValue) || 0),
      p_current_cost_cents: Math.round(Number(draft.currentCostCents) || 0),
      p_pixwiki_cost_cents: Math.round(Number(draft.pixwikiCostCents) || 0),
      p_savings_cents: Math.round(Number(draft.savingsCents) || 0),
      p_interested_plan: draft.interestedPlan,
    });
    if (!importError) localStorage.removeItem('pixWikiCalculatorLead');
  }, [supabase]);

  const initialize = useCallback(async () => {
    setScreen('loading'); setError('');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { window.location.href = pixPath('/'); return; }
    setUserId(auth.user.id); setAuthEmail(auth.user.email || '');
    try {
      const c = await ensureCompany(auth.user.id, auth.user.email || null);
      setCompany(c);
      await importCalculatorLead(c.id).catch(error => console.warn('[PixWiki onboarding] calculator import', error));
      if (search.get('mp_connected') === '1') {
        await supabase.rpc('pixwiki_v2_onboarding_mark_mp_connected', { p_company_id: c.id });
      }
      const s = await loadSnapshot(c.id);
      if (s.mp_connected && !s.mp_connected_at) {
        await supabase.rpc('pixwiki_v2_onboarding_mark_mp_connected', { p_company_id: c.id });
        const refreshed = await loadSnapshot(c.id);
        setScreen(deriveScreen(refreshed));
      } else setScreen(deriveScreen(s));
    } catch (e) {
      console.error('[PixWiki onboarding] init', e);
      setError(e instanceof Error && e.message === 'pending_signup_missing'
        ? 'Não encontrei os dados do cadastro. Volte ao início para criar sua PixWiki.'
        : 'Não foi possível carregar sua configuração agora.');
      setScreen('error');
    }
  }, [ensureCompany, importCalculatorLead, loadSnapshot, search, supabase]);

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    void initialize();
  }, [initialize]);

  useEffect(() => () => { if (pollRef.current !== null) window.clearTimeout(pollRef.current); }, []);

  function toggleTheme() {
    setDark(v=>{ const n=!v; localStorage.setItem('publicTheme',n?'dark':'light'); return n; });
  }

  async function connectMp() {
    if (!company) return;
    const next = `${pixPath('/onboarding')}?company=${encodeURIComponent(company.id)}`;
    connectMercadoPago(company.id, next);
  }

  async function savePixKey() {
    if (!company) return;
    const type = pixType || detectPixKeyType(pixKey);
    if (pixKey.trim().length < 5 || !type) return setError('Confira a chave Pix e o tipo informado.');
    setBusy('pixkey'); setError('');
    const { error: rpcError } = await supabase.rpc('pixwiki_v2_onboarding_save_pix_key', {
      p_company_id: company.id, p_pix_key: pixKey.trim(), p_pix_key_type: type,
    });
    setBusy('');
    if (rpcError) return setError('Não foi possível salvar a chave Pix.');
    setPixType(type); await loadSnapshot(company.id); setScreen('channels');
  }

  async function saveChannels() {
    if (!company || !snapshot) return;
    if (emailEnabled && !notificationEmail.includes('@')) return setError('Informe um e-mail válido ou desative o canal E-mail.');
    const phone = notificationPhone.replace(/\D/g,'');
    if (whatsappEnabled && (phone.length<10 || phone.length>15)) return setError('Informe um WhatsApp válido com DDD ou desative o canal.');
    setBusy('channels'); setError('');
    const { error: rpcError } = await supabase.rpc('pixwiki_v2_onboarding_save_setup', {
      p_company_id: company.id,
      p_pix_key: pixKey.trim(), p_pix_key_type: pixType || detectPixKeyType(pixKey),
      p_email_enabled: emailEnabled, p_notification_email: notificationEmail.trim() || null,
      p_push_enabled: pushEnabled,
      p_whatsapp_enabled: whatsappEnabled, p_notification_phone: phone || null,
    });
    if (!rpcError && pushEnabled) {
      for (let i=0;i<6;i+=1) {
        const { data: marked } = await supabase.rpc('pixwiki_v2_onboarding_mark_push', { p_company_id: company.id });
        if (marked === true) break;
        await new Promise(resolve=>window.setTimeout(resolve,350));
      }
    }
    setBusy('');
    if (rpcError) return setError('Não foi possível salvar os canais.');
    await loadSnapshot(company.id); setScreen('firstpix');
  }

  const pollFirstReceipt = useCallback(async () => {
    if (!company) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${FUNCTIONS_URL}/pixwiki-fast-watch`, {
          method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},
          body:JSON.stringify({ company_id: company.id }), cache:'no-store',
        }).catch(()=>undefined);
      }
      const { data } = await supabase.rpc('pixwiki_v2_onboarding_detect_first_receipt', { p_company_id: company.id });
      const row = (Array.isArray(data)?data[0]:data) as FirstReceipt | null;
      if (row?.detected) {
        setFirstReceipt(row); setTestStarted(false); setFirstPixWaitSeconds(0); firstPixStartedAtRef.current=null;
        const s = await loadSnapshot(company.id); setSnapshot(s); setScreen('success');
        return;
      }
    } catch { /* fallback: próxima tentativa */ }
    if (firstPixStartedAtRef.current) {
      setFirstPixWaitSeconds(Math.max(0,Math.floor((Date.now()-firstPixStartedAtRef.current)/1000)));
    }
    pollRef.current = window.setTimeout(()=>void pollFirstReceipt(), 2000);
  }, [company, loadSnapshot, supabase]);

  async function startFirstPixTest() {
    if (!company) return;
    setBusy('firstpix'); setError('');
    const { error: rpcError } = await supabase.rpc('pixwiki_v2_onboarding_start_receipt_test', { p_company_id: company.id });
    setBusy('');
    if (rpcError) return setError('Não foi possível iniciar o teste. Confira Mercado Pago e chave Pix.');
    firstPixStartedAtRef.current=Date.now(); setFirstPixWaitSeconds(0); setTestStarted(true); setNotice('Aguardando um novo Pix nessa chave…');
    if (pollRef.current !== null) window.clearTimeout(pollRef.current);
    pollRef.current = window.setTimeout(()=>void pollFirstReceipt(), 600);
  }

  async function finish(skipExploration: boolean) {
    if (!company) return;
    setBusy('finish'); setError('');
    const { error: rpcError } = await supabase.rpc('pixwiki_v2_onboarding_finish', { p_company_id: company.id, p_skip_exploration: skipExploration });
    setBusy('');
    if (rpcError) return setError('Não foi possível concluir o onboarding agora.');
    window.location.href = `${pixPath('/dashboard')}?company=${encodeURIComponent(company.id)}&onboarding=done`;
  }

  async function createOwnerTest(kind: 'link'|'checkout') {
    if (!company) return;
    setBusy(kind); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('session_expired');
      const response = await fetch(`${FUNCTIONS_URL}/pixwiki-v2-checkout`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},
        body:JSON.stringify({ action:'create_owner', company_id:company.id, origin:kind==='link'?'pix_link':'checkout', amount_cents:100, description:`Teste ${kind} do onboarding`, external_id:`ONBOARDING-${kind.toUpperCase()}`, metadata:{onboarding:true}, is_test:true, expires_in_seconds:1800 }),
      });
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body?.error || 'test_create_failed');
      const url = String(body?.checkout_url || '');
      await supabase.rpc('pixwiki_v2_onboarding_mark_test', { p_company_id:company.id, p_kind:kind });
      setTestResults(r=>({...r,[kind]:{url,id:body?.checkout?.checkout_id}}));
      await loadSnapshot(company.id);
    } catch { setError(`Não foi possível criar o teste de ${kind === 'link' ? 'Pix Link' : 'Checkout'}.`); }
    finally { setBusy(''); }
  }

  async function testApi() {
    if (!company) return;
    setBusy('api'); setError('');
    let keyId = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('session_expired');
      const adminResponse = await fetch(`${FUNCTIONS_URL}/pixwiki-api-admin`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},
        body:JSON.stringify({action:'create_key',name:'Onboarding PixWiki'}),
      });
      const keyPayload = await adminResponse.json().catch(()=>({}));
      if (!adminResponse.ok || !keyPayload?.secret) throw new Error(keyPayload?.error || 'api_key_create_failed');
      keyId = String(keyPayload?.key?.id || '');
      const secret = String(keyPayload.secret);
      const idem = `onboarding-${company.id}-${Date.now()}`;
      const apiResponse = await fetch(`${FUNCTIONS_URL}/pixwiki-api?resource=/checkouts`, {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`,apikey:ANON_KEY,'Idempotency-Key':idem},
        body:JSON.stringify({company_id:company.id,amount_cents:100,description:'Checkout criado pela API no onboarding',external_id:'ONBOARDING-API',metadata:{onboarding:true},test:true,expires_in_seconds:1800}),
      });
      const apiPayload = await apiResponse.json().catch(()=>({}));
      if (!apiResponse.ok) throw new Error(apiPayload?.error || 'api_test_failed');
      await supabase.rpc('pixwiki_v2_onboarding_mark_test', { p_company_id:company.id, p_kind:'api' });
      setTestResults(r=>({...r,api:{url:String(apiPayload?.data?.checkout_url || apiPayload?.checkout_url || ''),response:JSON.stringify(apiPayload,null,2)}}));
      await loadSnapshot(company.id);
    } catch { setError('Não foi possível executar a chamada de API de teste.'); }
    finally {
      if (keyId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) await fetch(`${FUNCTIONS_URL}/pixwiki-api-admin`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},body:JSON.stringify({action:'revoke_key',key_id:keyId})}).catch(()=>undefined);
      }
      setBusy('');
    }
  }

  async function calculate() {
    if (!company) return;
    const units = Math.max(0,Math.floor(Number(monthlyPix.replace(/\D/g,''))||0));
    const ticketCents = Math.max(0,Math.round((Number(ticket.replace(',','.'))||0)*100));
    const fee = Math.max(0,Number(feeValue.replace(',','.'))||0);
    if (!units) return setError('Informe quantos Pix sua empresa recebe por mês.');
    setBusy('calc'); setError('');
    const { data, error: qError } = await supabase.rpc('pixwiki_v2_quote_monthly_usage', { p_units:units });
    if (qError || !Array.isArray(data)) { setBusy(''); return setError('Não foi possível calcular agora.'); }
    const best = (data as Quote[]).find(x=>x.is_best_price) || (data as Quote[])[0];
    let current = 0;
    if (feeType==='percent') current = Math.round(units*ticketCents*(fee/100));
    else if (feeType==='fixed') current = Math.round(units*fee*100);
    setQuote(best); setCurrentCost(current);
    const savings = current - Number(best.total_price_cents||0);
    await supabase.rpc('pixwiki_v2_onboarding_save_estimate', {
      p_company_id:company.id,p_monthly_pix:units,p_ticket_cents:ticketCents,p_fee_type:feeType,p_fee_value:fee,
      p_current_cost_cents:current,p_pixwiki_cost_cents:Number(best.total_price_cents||0),p_savings_cents:savings,p_interested_plan:best.plan,
    });
    await loadSnapshot(company.id); setBusy('');
  }

  if (screen==='loading') return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/></div>;

  const shell = (content: React.ReactNode, showProgress=true) => (
    <main className={`min-h-screen ${page}`}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4"><a href="https://pix.wiki" className="flex items-center gap-2"><Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={44} height={44} className="rounded-xl"/><span className="font-black">PixWiki</span></a><button onClick={toggleTheme} className={`h-10 w-10 rounded-full border ${card}`}>{dark?'☀':'☾'}</button></div>
        {showProgress && <div className="mt-7"><Progress screen={screen}/></div>}
        {(error||notice)&&<div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error?'border-red-500/25 bg-red-500/10 text-red-300':'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error||notice}</div>}
        <section className={`mt-5 rounded-[30px] border p-6 sm:p-8 ${card}`}>{content}</section>
        <p className={`py-7 text-center text-xs ${faint}`}>O dinheiro continua direto na conta Mercado Pago conectada. A PixWiki não é carteira nem instituição financeira.</p>
      </div>
    </main>
  );

  if (screen==='error') return shell(<div className="text-center"><h1 className="text-2xl font-black">Não conseguimos iniciar a configuração</h1><p className={`mt-3 ${muted}`}>{error}</p><a href={pixPath('/')} className="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950">Voltar ao início</a></div>,false);

  if (!company || !snapshot) return shell(<p>Carregando empresa…</p>);

  if (screen==='connect') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Etapa 1 de 4</p><h1 className="mt-2 text-3xl font-black">Conecte seu Mercado Pago</h1><p className={`mt-3 leading-relaxed ${muted}`}>Essa autorização permite à PixWiki acompanhar os Pix recebidos pela sua conta. Tokens ficam no backend e nunca são exibidos ao cliente.</p><div className={`mt-6 rounded-2xl border p-4 ${card}`}><p className="font-bold">{company.name}</p><p className={`mt-1 text-sm ${muted}`}>Depois da conexão você volta automaticamente para esta tela.</p></div><button onClick={connectMp} className="mt-6 w-full rounded-xl bg-sky-400 px-5 py-3.5 font-black text-slate-950">Conectar Mercado Pago</button></div>);

  if (screen==='pixkey') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Etapa 2 de 4</p><h1 className="mt-2 text-3xl font-black">Confirme sua chave Pix</h1><p className={`mt-3 ${muted}`}>Use uma chave dessa mesma conta Mercado Pago. É nela que os clientes continuarão pagando diretamente.</p><label className="mt-6 block"><span className={`text-xs font-bold ${muted}`}>Chave Pix</span><input value={pixKey} onChange={e=>{setPixKey(e.target.value);setPixType(detectPixKeyType(e.target.value));}} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className={`mt-2 w-full rounded-xl border px-4 py-3.5 outline-none ${input}`}/></label><label className="mt-4 block"><span className={`text-xs font-bold ${muted}`}>Tipo</span><select value={pixType} onChange={e=>setPixType(e.target.value as PixKeyType)} className={`mt-2 w-full rounded-xl border px-4 py-3.5 ${input}`}><option value="">Detectar automaticamente</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></label><button onClick={savePixKey} disabled={busy==='pixkey'} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950 disabled:opacity-50">{busy==='pixkey'?'Salvando…':'Confirmar chave'}</button></div>);

  if (screen==='channels') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Etapa 3 de 4</p><h1 className="mt-2 text-3xl font-black">Como você quer ser avisado?</h1><p className={`mt-3 ${muted}`}>Escolha cada canal separadamente. Push pode continuar gratuito para recebimentos pela sua própria chave.</p><div className="mt-6 space-y-3">
    <label className={`flex items-start gap-3 rounded-2xl border p-4 ${card}`}><input type="checkbox" checked={pushEnabled} onChange={e=>setPushEnabled(e.target.checked)} className="mt-1"/><div className="flex-1"><b>Push</b><p className={`mt-1 text-xs ${muted}`}>Aviso instantâneo neste dispositivo.</p>{pushEnabled&&<div className="mt-3"><PixWikiPush userId={userId} companyId={company.id} dark={dark}/></div>}</div></label>
    <label className={`block rounded-2xl border p-4 ${card}`}><div className="flex gap-3"><input type="checkbox" checked={emailEnabled} onChange={e=>setEmailEnabled(e.target.checked)}/><div><b>E-mail</b><p className={`mt-1 text-xs ${muted}`}>Receba confirmação no endereço escolhido.</p></div></div>{emailEnabled&&<input value={notificationEmail} onChange={e=>setNotificationEmail(e.target.value)} placeholder="voce@empresa.com" className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm ${input}`}/>}</label>
    <label className={`block rounded-2xl border p-4 ${card}`}><div className="flex gap-3"><input type="checkbox" checked={whatsappEnabled} onChange={e=>setWhatsappEnabled(e.target.checked)}/><div><b>WhatsApp</b><p className={`mt-1 text-xs ${muted}`}>Use quando quiser a confirmação também pelo WhatsApp.</p></div></div>{whatsappEnabled&&<input value={notificationPhone} onChange={e=>setNotificationPhone(e.target.value)} placeholder="5511999999999" inputMode="tel" className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm ${input}`}/>}</label>
  </div><button onClick={saveChannels} disabled={busy==='channels'} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950 disabled:opacity-50">{busy==='channels'?'Salvando…':'Salvar e testar meu primeiro Pix'}</button></div>);

  if (screen==='firstpix') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Etapa 4 de 4</p><h1 className="mt-2 text-3xl font-black">Veja a PixWiki funcionando</h1><p className={`mt-3 ${muted}`}>Faça um pequeno Pix usando outra conta ou banco para a chave abaixo. Sugerimos R$ 1,00. Assim que o Mercado Pago identificar, esta tela muda sozinha.</p><div className={`mt-6 rounded-2xl border p-5 ${card}`}><p className={`text-xs font-bold ${muted}`}>Sua chave Pix</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm font-bold">{pixKey}</code><button onClick={()=>copyText(pixKey)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Copiar</button></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className={muted}>Valor sugerido</span><b className="text-xl text-emerald-400">R$ 1,00</b></div></div>{!testStarted?<button onClick={startFirstPixTest} disabled={busy==='firstpix'} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950">Estou pronto — aguardar meu Pix</button>:<div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400"/><p className="mt-3 font-black text-emerald-300">Aguardando seu primeiro Pix…</p><p className={`mt-1 text-xs ${muted}`}>{firstPixWaitSeconds<20?'Você não precisa atualizar a página.':'Ainda não encontramos esse Pix na conta Mercado Pago conectada.'}</p>{firstPixWaitSeconds>=20&&<div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-left"><p className="text-sm font-black text-amber-200">Pix ainda não encontrado</p><p className={`mt-1 text-xs leading-5 ${muted}`}>Confira se o pagamento aparece no extrato da conta Mercado Pago que você acabou de conectar. Se não aparecer, revise a chave Pix ou reconecte a conta correta.</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" onClick={()=>{if(pollRef.current!==null)window.clearTimeout(pollRef.current);void pollFirstReceipt();}} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950">Verificar agora</button><button type="button" onClick={()=>{if(pollRef.current!==null)window.clearTimeout(pollRef.current);setTestStarted(false);setFirstPixWaitSeconds(0);firstPixStartedAtRef.current=null;setScreen('pixkey');}} className={`rounded-lg border px-3 py-2 text-xs font-black ${card}`}>Trocar chave Pix</button><button type="button" onClick={()=>{if(pollRef.current!==null)window.clearTimeout(pollRef.current);setTestStarted(false);setFirstPixWaitSeconds(0);firstPixStartedAtRef.current=null;void connectMp();}} className={`rounded-lg border px-3 py-2 text-xs font-black ${card}`}>Reconectar Mercado Pago</button></div></div>}</div>}</div>);

  if (screen==='success') return shell(<div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-4xl text-emerald-400">✓</div><p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Ativação concluída</p><h1 className="mt-2 text-3xl font-black">Sua PixWiki está funcionando.</h1><p className={`mx-auto mt-3 max-w-xl ${muted}`}>{firstReceipt?.amount_cents ? `Acabamos de identificar ${brl(firstReceipt.amount_cents)} na sua conta.` : 'Seu primeiro recebimento foi identificado automaticamente.'} A partir daqui os novos Pix podem aparecer no dashboard sem você conferir comprovantes.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={()=>void finish(true)} disabled={busy==='finish'} className={`rounded-xl border px-5 py-3.5 font-bold ${card}`}>Ir para meu Dashboard</button><button onClick={()=>setScreen('explore')} className="rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950">Continuar conhecendo →</button></div></div>);

  if (screen==='explore') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Exploração opcional</p><h1 className="mt-2 text-3xl font-black">Quer ver o que mais a PixWiki faz?</h1><p className={`mt-3 ${muted}`}>Estes testes são marcados como onboarding e não consomem sua franquia.</p><div className="mt-6 grid gap-4 sm:grid-cols-3">
    {[{k:'link',t:'Pix Link',d:'Cria uma cobrança de teste para você abrir ou copiar.',fn:()=>createOwnerTest('link'),done:!!snapshot.link_tested_at},{k:'checkout',t:'Checkout',d:'Mostra a experiência protegida com referência e metadata.',fn:()=>createOwnerTest('checkout'),done:!!snapshot.checkout_tested_at},{k:'api',t:'API',d:'Cria uma chave temporária, executa POST /checkouts e revoga a chave.',fn:testApi,done:!!snapshot.api_tested_at}].map(x=><article key={x.k} className={`rounded-2xl border p-4 ${card}`}><div className="flex justify-between gap-2"><b>{x.t}</b>{x.done&&<span className="text-xs font-black text-emerald-400">✓ testado</span>}</div><p className={`mt-2 min-h-14 text-xs leading-relaxed ${muted}`}>{x.d}</p><button onClick={()=>void x.fn()} disabled={busy===x.k} className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2.5 text-xs font-black disabled:opacity-50">{busy===x.k?'Testando…':x.done?'Testar novamente':'Testar agora'}</button>{testResults[x.k]?.url&&<a href={testResults[x.k].url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[11px] text-emerald-400 hover:underline">Abrir cobrança ↗</a>}</article>)}
  </div>{testResults.api?.response&&<details className={`mt-4 rounded-2xl border p-4 ${card}`}><summary className="cursor-pointer text-sm font-bold">Ver resposta da API</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] text-emerald-300">{testResults.api.response}</pre></details>}<div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={()=>void finish(false)} className={`flex-1 rounded-xl border px-5 py-3 font-bold ${card}`}>Ir para o Dashboard</button><button onClick={()=>setScreen('calculator')} className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950">Calcular minha economia →</button></div></div>,false);

  if (screen==='calculator') return shell(<div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Calculadora</p><h1 className="mt-2 text-3xl font-black">Quanto seu Pix custa hoje?</h1><p className={`mt-3 ${muted}`}>Use a sua taxa real. A comparação não depende de tabela de concorrente.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className={`text-xs font-bold ${muted}`}>Pix por mês</span><input value={monthlyPix} onChange={e=>setMonthlyPix(e.target.value)} inputMode="numeric" className={`mt-2 w-full rounded-xl border px-4 py-3 ${input}`}/></label><label><span className={`text-xs font-bold ${muted}`}>Ticket médio (R$)</span><input value={ticket} onChange={e=>setTicket(e.target.value)} inputMode="decimal" className={`mt-2 w-full rounded-xl border px-4 py-3 ${input}`}/></label><label><span className={`text-xs font-bold ${muted}`}>Como você paga hoje?</span><select value={feeType} onChange={e=>setFeeType(e.target.value as any)} className={`mt-2 w-full rounded-xl border px-4 py-3 ${input}`}><option value="percent">Percentual sobre o Pix</option><option value="fixed">Valor fixo por Pix</option><option value="free">Não pago taxa</option><option value="unknown">Não sei</option></select></label>{feeType!=='free'&&feeType!=='unknown'&&<label><span className={`text-xs font-bold ${muted}`}>{feeType==='percent'?'Taxa (%)':'Valor por Pix (R$)'}</span><input value={feeValue} onChange={e=>setFeeValue(e.target.value)} inputMode="decimal" className={`mt-2 w-full rounded-xl border px-4 py-3 ${input}`}/></label>}</div><button onClick={calculate} disabled={busy==='calc'} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950">{busy==='calc'?'Calculando…':'Calcular'}</button>{quote&&<div className="mt-6 grid gap-3 sm:grid-cols-2"><div className={`rounded-2xl border p-5 ${card}`}><p className={`text-xs ${muted}`}>Custo atual estimado</p><p className="mt-2 text-2xl font-black">{brl(currentCost)}</p></div><div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><p className="text-xs text-emerald-300">Faixa PixWiki mais econômica</p><p className="mt-2 text-xl font-black">{quote.plan_name}</p><p className="mt-1 text-2xl font-black text-emerald-400">{brl(quote.total_price_cents)}/mês</p></div><div className={`sm:col-span-2 rounded-2xl border p-5 text-center ${currentCost-quote.total_price_cents>=0?'border-emerald-500/30 bg-emerald-500/10':'border-white/10'}`}><p className={`text-xs ${muted}`}>Economia estimada</p><p className="mt-2 text-3xl font-black text-emerald-400">{brl(currentCost-quote.total_price_cents)}/mês</p><p className={`mt-2 text-xs ${faint}`}>Estimativa baseada nos dados que você informou. Tarifas reais do seu provedor podem variar.</p></div></div>}<div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={()=>void finish(false)} className={`flex-1 rounded-xl border px-5 py-3 font-bold ${card}`}>Continuar grátis</button><a href="#" onClick={e=>{e.preventDefault();void finish(false);}} className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 text-center font-black text-slate-950">Concluir onboarding</a></div></div>,false);

  if (screen==='done') return shell(<div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-4xl text-emerald-400">✓</div><h1 className="mt-5 text-3xl font-black">Tudo pronto.</h1><p className={`mx-auto mt-3 max-w-xl ${muted}`}>Sua conta está ativada. O dashboard passa a ser o centro da operação; você pode voltar ao onboarding quando quiser para rever os testes.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><a href={pixPath('/dashboard')} className="rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950">Abrir Dashboard</a><button onClick={()=>setScreen('explore')} className={`rounded-xl border px-5 py-3.5 font-bold ${card}`}>Rever testes</button></div></div>,false);

  return shell(<p>Carregando…</p>);
}

export default function PixWikiOnboardingPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/></div>}><OnboardingContent/></Suspense>;
}
