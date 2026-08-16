'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { connectMercadoPago } from '@/lib/connectMercadoPago';
import PixWikiPush from '@/components/pix/PixWikiPush';

type PlanKey = 'free' | 'link' | 'pro';
type SourceKey = 'pix_key' | 'pixwiki_link';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string | null;
  email_contato: string | null;
}

interface CompanyOption extends CompanyRow {
  pix_key: string | null;
  pix_key_type: string | null;
  mp_connection_id: string | null;
  mp_connected: boolean;
  notification_email: string | null;
  notification_phone: string | null;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  is_primary: boolean;
  plan_access: boolean;
}

interface PaymentSettings {
  company_id: string;
  user_id: string;
  pix_key: string | null;
  pix_key_type: string | null;
  mp_connection_id: string | null;
}

interface NotificationSettings {
  company_id: string;
  user_id: string;
  notification_email: string | null;
  notification_phone: string | null;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
}

interface ReceiptRow {
  id: string;
  company_id: string;
  user_id: string;
  mp_payment_id: string | null;
  amount_cents: number;
  fee_amount_cents: number;
  net_amount_cents: number;
  status: string;
  source: SourceKey | string;
  provider: string;
  received_at: string;
}

interface PlanCatalogRow {
  plan: PlanKey;
  name: string;
  price_cents: number;
  rank: number;
  features: Record<string, unknown>;
}

interface InvoiceInfo {
  id: string;
  target_plan: 'link' | 'pro';
  status: string;
  amount_cents: number;
  expires_at: string | null;
  transaction_id: string | null;
  txid: string | null;
  pix_code: string | null;
  qr_code_url: string | null;
}

interface PlanStatus {
  effective_plan: PlanKey;
  features: {
    push?: boolean;
    email?: boolean;
    subdomain?: boolean;
    whatsapp?: boolean;
    multi_company?: boolean;
    api?: boolean;
    reports?: boolean;
    max_companies?: number | null;
  };
  subscription: {
    plan: PlanKey;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    started_at: string;
  } | null;
  plans: PlanCatalogRow[];
  pending_invoice: InvoiceInfo | null;
}

interface PendingSignup {
  slug: string;
  nome: string;
  pix: string;
  pixTipo: string | null;
  logo: string | null;
  doc: string | null;
  docTipo: string | null;
  wa: string | null;
  email: string | null;
}

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PLAN_COPY: Record<PlanKey, { title: string; subtitle: string; items: string[] }> = {
  free: {
    title: 'Pix Grátis',
    subtitle: 'Sua chave Pix, agora inteligente.',
    items: ['Confirmação automática', 'Dashboard', 'Push', 'E-mail'],
  },
  link: {
    title: 'Pix Link',
    subtitle: 'Seu endereço profissional para receber Pix.',
    items: ['Tudo do Grátis', 'slug.pix.wiki', 'Link com valor', 'QR Code', 'Histórico completo'],
  },
  pro: {
    title: 'Pix Pro',
    subtitle: 'Pix profissional para sua operação.',
    items: ['Tudo do Pix Link', 'WhatsApp', 'Multiempresa', 'Relatórios', 'API e Webhooks'],
  },
};

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function dateOnly(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function normalizeAmountInput(v: string) {
  const cleaned = v.replace(/[^0-9,.]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizePhoneInput(v: string) {
  return v.replace(/\D/g, '').slice(0, 15);
}

async function createFromPendingSignup(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  authEmail: string | null,
  pending: PendingSignup,
): Promise<CompanyRow | null> {
  const { data: company, error } = await supabase
    .rpc('ensure_my_pix_wiki_company', {
      p_slug: pending.slug,
      p_name: pending.nome,
      p_logo_url: pending.logo,
      p_whatsapp: pending.wa,
      p_email: pending.email || authEmail,
    })
    .single();

  if (error || !company) return null;

  // Mantém o campo legado durante a transição e grava a nova estrutura
  // semântica do PixWiki por empresa.
  await supabase.from('user_profiles').upsert({
    user_id: userId,
    withdrawal_pix_key: pending.pix,
    withdrawal_pix_key_type: pending.pixTipo,
    documento: pending.doc,
    documento_tipo: pending.docTipo,
  }, { onConflict: 'user_id' });

  await supabase.from('pixwiki_payment_settings').upsert({
    company_id: company.id,
    user_id: userId,
    pix_key: pending.pix,
    pix_key_type: pending.pixTipo,
  }, { onConflict: 'company_id' });

  await supabase.from('pixwiki_notification_settings').upsert({
    company_id: company.id,
    user_id: userId,
    notification_email: pending.email || authEmail,
    email_enabled: true,
    push_enabled: true,
  }, { onConflict: 'company_id' });

  // Mantém os registros auxiliares usados pelo funil atual.
  await supabase.from('short_links').insert({
    slug: company.slug,
    type: 'pix_wiki',
    company_id: company.id,
    user_id: userId,
    original_url: `https://pix.wiki/${company.slug}`,
  }).then(() => undefined, () => undefined);

  await supabase.from('demo_sessions').insert({
    nome_negocio: pending.nome,
    email: pending.email || authEmail,
    phone: pending.wa,
    origem_simples: 'pixwiki',
    linked_user_id: userId,
    linked_company_id: company.id,
    linked_at: new Date().toISOString(),
    status: 'converted',
  }).then(() => undefined, () => undefined);

  return {
    id: company.id,
    name: pending.nome,
    slug: company.slug,
    logo_url: pending.logo,
    whatsapp_number: pending.wa,
    email_contato: pending.email || authEmail,
  };
}

function Spinner() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
    </div>
  );
}

function DashboardContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();

  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [payment, setPayment] = useState<PaymentSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [mpConnected, setMpConnected] = useState(false);
  const [plan, setPlan] = useState<PlanStatus | null>(null);

  const [shareValue, setShareValue] = useState('');
  const [copied, setCopied] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'pix_key' | 'pixwiki_link'>('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [emailDraft, setEmailDraft] = useState('');
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [pixKeyDraft, setPixKeyDraft] = useState('');
  const [pixTypeDraft, setPixTypeDraft] = useState('random');
  const [nameDraft, setNameDraft] = useState('');
  const [logoDraft, setLogoDraft] = useState('');
  const [slugDraft, setSlugDraft] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [planBusy, setPlanBusy] = useState<PlanKey | ''>('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [newCompanyPixKey, setNewCompanyPixKey] = useState('');
  const [newCompanyPixType, setNewCompanyPixType] = useState('random');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);

  const isDark = dark;
  const page = isDark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = isDark ? 'bg-white/[0.035] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const muted = isDark ? 'text-white/55' : 'text-slate-500';
  const faint = isDark ? 'text-white/35' : 'text-slate-400';
  const input = isDark
    ? 'bg-white/[0.055] border-white/10 text-white placeholder:text-white/25'
    : 'bg-white border-black/10 text-slate-900 placeholder:text-slate-400';

  const callPlan = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada');

    const response = await fetch(`${FUNCTIONS_URL}/pixwiki-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  }, [supabase]);

  const loadPlan = useCallback(async () => {
    const data = await callPlan({ action: 'status' });
    setPlan({
      effective_plan: data.effective_plan,
      features: data.features || {},
      subscription: data.subscription || null,
      plans: data.plans || [],
      pending_invoice: data.pending_invoice || null,
    });
    return data;
  }, [callPlan]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      router.replace('/pix/login');
      return;
    }

    setUserId(user.id);
    setAuthEmail(user.email || '');

    const loadCompanies = async () => {
      const { data, error: listError } = await supabase.rpc('pixwiki_list_my_companies');
      if (listError) throw listError;
      return (data || []) as CompanyOption[];
    };

    let companyRows: CompanyOption[] = [];
    try {
      companyRows = await loadCompanies();
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Não foi possível carregar suas empresas.');
      return;
    }

    if (companyRows.length === 0) {
      const raw = localStorage.getItem('pixWikiPendingSignup');
      if (raw) {
        try {
          const created = await createFromPendingSignup(supabase, user.id, user.email || null, JSON.parse(raw));
          if (created) {
            localStorage.removeItem('pixWikiPendingSignup');
            companyRows = await loadCompanies();
          }
        } catch (e) {
          console.error('[PixWiki] pending signup:', e);
        }
      }
    }

    if (companyRows.length === 0) {
      setLoading(false);
      setError('Não encontramos sua empresa PixWiki. Volte ao início para concluir o cadastro.');
      return;
    }

    setCompanies(companyRows);

    const queryCompanyId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('company')
      : null;
    const savedCompanyId = typeof window !== 'undefined'
      ? localStorage.getItem('pixWikiActiveCompanyId')
      : null;
    const active = companyRows.find(c => c.id === queryCompanyId)
      || companyRows.find(c => c.id === savedCompanyId)
      || companyRows.find(c => c.is_primary)
      || companyRows[0];

    localStorage.setItem('pixWikiActiveCompanyId', active.id);

    const activeCompany: CompanyRow = {
      id: active.id,
      name: active.name,
      slug: active.slug,
      logo_url: active.logo_url,
      whatsapp_number: active.whatsapp_number,
      email_contato: active.email_contato,
    };
    setCompany(activeCompany);
    setNameDraft(active.name);
    setLogoDraft(active.logo_url || '');
    setSlugDraft(active.slug);

    // Empresas antigas podem ainda não ter as linhas auxiliares; só a empresa
    // principal herda a chave legada do perfil. Empresas Pro adicionais sempre
    // nascem pelo RPC pixwiki_create_company e já recebem seus próprios settings.
    let paymentSettings: PaymentSettings = {
      company_id: active.id,
      user_id: user.id,
      pix_key: active.pix_key,
      pix_key_type: active.pix_key_type,
      mp_connection_id: active.mp_connection_id,
    };

    if (!active.pix_key && active.is_primary) {
      const { data: legacy } = await supabase.from('user_profiles')
        .select('withdrawal_pix_key,withdrawal_pix_key_type')
        .eq('user_id', user.id).maybeSingle();
      if (legacy?.withdrawal_pix_key) {
        paymentSettings = {
          ...paymentSettings,
          pix_key: legacy.withdrawal_pix_key,
          pix_key_type: legacy.withdrawal_pix_key_type,
        };
        await supabase.from('pixwiki_payment_settings').upsert({
          ...paymentSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });
      }
    }

    const notificationSettings: NotificationSettings = {
      company_id: active.id,
      user_id: user.id,
      notification_email: active.notification_email || active.email_contato || user.email || null,
      notification_phone: active.notification_phone || active.whatsapp_number || null,
      email_enabled: active.email_enabled !== false,
      push_enabled: active.push_enabled !== false,
      whatsapp_enabled: active.whatsapp_enabled === true,
    };

    await supabase.from('pixwiki_notification_settings').upsert({
      ...notificationSettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    const { data: receiptRows, error: receiptError } = await supabase.from('pixwiki_receipts')
      .select('id,company_id,user_id,mp_payment_id,amount_cents,fee_amount_cents,net_amount_cents,status,source,provider,received_at')
      .eq('company_id', active.id)
      .order('received_at', { ascending: false })
      .limit(200);
    if (receiptError) console.error('[PixWiki] recebimentos:', receiptError.message);

    setPayment(paymentSettings);
    setNotifications(notificationSettings);
    setPixKeyDraft(paymentSettings.pix_key || '');
    setPixTypeDraft(paymentSettings.pix_key_type || 'random');
    setEmailDraft(notificationSettings.notification_email || user.email || '');
    setWhatsappDraft(notificationSettings.notification_phone || '');
    setReceipts((receiptRows || []) as ReceiptRow[]);
    setMpConnected(active.mp_connected === true);

    try {
      await loadPlan();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar seu plano.');
    }

    setLoading(false);
  }, [loadPlan, router, supabase]);
  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') {
      setDark(saved === 'dark');
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (search.get('mp_connected') === '1') setNotice('Mercado Pago conectado com sucesso para esta empresa.');
    const mpError = search.get('mp_error');
    if (mpError === 'account_in_use') {
      setError('Esta conta Mercado Pago já está vinculada a outra empresa PixWiki. Cada empresa precisa da própria conta Mercado Pago.');
    } else if (mpError) {
      setError('Não foi possível concluir a conexão com o Mercado Pago. Tente novamente.');
    }
  }, [search]);

  // Enquanto houver uma cobrança de plano, verifica automaticamente sem
  // misturar esse pagamento com as notificações de vendas do PixWiki.
  useEffect(() => {
    const invoice = plan?.pending_invoice;
    if (!invoice?.id || invoice.status !== 'pending') return;

    const id = window.setInterval(async () => {
      try {
        const result = await callPlan({ action: 'check_invoice', invoice_id: invoice.id });
        if (result?.paid) {
          setNotice(`Pagamento confirmado. Plano ${PLAN_COPY[result.effective_plan as PlanKey]?.title || ''} ativado.`);
          setPlan({
            effective_plan: result.effective_plan,
            features: result.features || {},
            subscription: result.subscription || null,
            plans: result.plans || [],
            pending_invoice: result.pending_invoice || null,
          });
          window.clearInterval(id);
        } else if (result?.pending_invoice === null) {
          await loadPlan();
          window.clearInterval(id);
        }
      } catch {
        // polling silencioso; o botão de conferir continua disponível
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [callPlan, loadPlan, plan?.pending_invoice]);

  const filteredReceipts = receipts.filter(r => receiptFilter === 'all' || r.source === receiptFilter);

  const now = new Date();
  const todayKey = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const monthKey = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: '2-digit', year: 'numeric' });
  const todayReceipts = receipts.filter(r => new Date(r.received_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === todayKey);
  const monthReceipts = receipts.filter(r => new Date(r.received_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: '2-digit', year: 'numeric' }) === monthKey);
  const todayGross = todayReceipts.reduce((a, r) => a + r.amount_cents, 0);
  const monthNet = monthReceipts.reduce((a, r) => a + r.net_amount_cents, 0);
  const monthFees = monthReceipts.reduce((a, r) => a + r.fee_amount_cents, 0);

  const effectivePlan = plan?.effective_plan || 'free';
  const activeCompanyOption = companies.find(c => c.id === company?.id) || null;
  const companyPlanAccess = activeCompanyOption?.plan_access !== false;
  const canLink = plan?.features?.subdomain === true && companyPlanAccess;
  const linkBase = company && canLink ? `https://${company.slug}.pix.wiki` : '';
  const amountNumber = normalizeAmountInput(shareValue);
  const linkWithAmount = linkBase && amountNumber > 0 ? `${linkBase}/${amountNumber.toFixed(2)}` : linkBase;
  const estimatedMpFee = amountNumber > 0 ? Math.round(amountNumber * 100 * 0.01) : 0;

  async function copyText(value: string, key: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('Não foi possível copiar automaticamente.');
    }
  }

  async function saveSettings() {
    if (!company || !userId) return;
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      const [companyUpdate, paymentUpdate, notificationUpdate] = await Promise.all([
        supabase.from('companies').update({
          name: nameDraft.trim() || company.name,
          logo_url: logoDraft.trim() || null,
          email_contato: emailDraft.trim() || company.email_contato,
          updated_at: new Date().toISOString(),
        }).eq('id', company.id).eq('user_id', userId),
        supabase.from('pixwiki_payment_settings').upsert({
          company_id: company.id,
          user_id: userId,
          pix_key: pixKeyDraft.trim() || null,
          pix_key_type: pixTypeDraft || null,
          mp_connection_id: payment?.mp_connection_id || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' }),
        supabase.from('pixwiki_notification_settings').upsert({
          company_id: company.id,
          user_id: userId,
          notification_email: emailDraft.trim() || authEmail || null,
          notification_phone: normalizePhoneInput(whatsappDraft) || null,
          email_enabled: notifications?.email_enabled !== false,
          push_enabled: notifications?.push_enabled !== false,
          whatsapp_enabled: effectivePlan === 'pro' && notifications?.whatsapp_enabled === true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' }),
      ]);

      const firstError = companyUpdate.error || paymentUpdate.error || notificationUpdate.error;
      if (firstError) throw firstError;

      const savedName = nameDraft.trim() || company.name;
      const savedLogo = logoDraft.trim() || null;
      const savedEmail = emailDraft.trim() || company.email_contato;
      setCompany({ ...company, name: savedName, logo_url: savedLogo, email_contato: savedEmail });
      setCompanies(prev => prev.map(c => c.id === company.id ? {
        ...c,
        name: savedName,
        logo_url: savedLogo,
        email_contato: savedEmail,
        pix_key: pixKeyDraft.trim() || null,
        pix_key_type: pixTypeDraft,
        notification_email: emailDraft.trim() || authEmail || null,
        notification_phone: normalizePhoneInput(whatsappDraft) || null,
      } : c));
      setPayment(prev => prev ? { ...prev, pix_key: pixKeyDraft.trim() || null, pix_key_type: pixTypeDraft } : prev);
      setNotifications(prev => prev ? {
        ...prev,
        notification_email: emailDraft.trim() || authEmail || null,
        notification_phone: normalizePhoneInput(whatsappDraft) || null,
        whatsapp_enabled: effectivePlan === 'pro' && prev.whatsapp_enabled === true,
      } : prev);
      setNotice('Configurações salvas.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function claimSlug() {
    if (!company) return;
    if (!canLink) {
      setError('O subdomínio personalizado está disponível no Pix Link e no Pix Pro.');
      return;
    }
    setSavingSlug(true);
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('pixwiki_claim_slug', {
        p_company_id: company.id,
        p_slug: slugDraft,
      });
      if (rpcError) throw rpcError;
      const claimed = String(data || slugDraft).toLowerCase();
      setSlugDraft(claimed);
      setCompany({ ...company, slug: claimed });
      setNotice(`Endereço atualizado para ${claimed}.pix.wiki`);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('reserved_slug')) setError('Esse endereço é reservado pelo PixWiki. Escolha outro.');
      else if (msg.includes('slug_unavailable')) setError('Esse endereço já está em uso.');
      else if (msg.includes('invalid_slug')) setError('Use de 3 a 40 caracteres: letras minúsculas, números e hífen.');
      else if (msg.includes('plan_required')) setError('É necessário Pix Link ou Pix Pro.');
      else if (msg.includes('company_paused_by_plan')) setError('Esta empresa adicional requer o Pix Pro ativo.');
      else setError('Não foi possível salvar o subdomínio.');
    } finally {
      setSavingSlug(false);
    }
  }

  async function createInvoice(target: 'link' | 'pro') {
    if (plan?.pending_invoice?.status === 'pending') {
      setError('Você já tem uma cobrança de plano pendente. Pague ou aguarde a expiração antes de gerar outra.');
      return;
    }
    setPlanBusy(target);
    setError('');
    setNotice('');
    try {
      const result = await callPlan({ action: 'create_invoice', plan: target });
      await loadPlan();
      if (result?.invoice) setNotice(`Cobrança do ${PLAN_COPY[target].title} gerada. Escaneie o QR Code ou copie o Pix.`);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('downgrade_requires_period_end')) {
        setError('Seu Pix Pro continua ativo até o vencimento. Depois, você poderá ativar o Pix Link.');
      } else {
        setError('Não foi possível gerar a cobrança do plano. Tente novamente.');
      }
    } finally {
      setPlanBusy('');
    }
  }

  async function checkInvoice() {
    const invoice = plan?.pending_invoice;
    if (!invoice) return;
    setPlanBusy(invoice.target_plan);
    setError('');
    try {
      const result = await callPlan({ action: 'check_invoice', invoice_id: invoice.id });
      setPlan({
        effective_plan: result.effective_plan,
        features: result.features || {},
        subscription: result.subscription || null,
        plans: result.plans || [],
        pending_invoice: result.pending_invoice || null,
      });
      if (result?.paid) setNotice(`Pagamento confirmado. ${PLAN_COPY[result.effective_plan as PlanKey]?.title || 'Plano'} ativado.`);
      else setNotice('Pagamento ainda não identificado. O PixWiki continuará verificando automaticamente.');
    } catch {
      setError('Não foi possível verificar a mensalidade agora.');
    } finally {
      setPlanBusy('');
    }
  }

  async function toggleNotification(channel: 'email_enabled' | 'push_enabled' | 'whatsapp_enabled') {
    if (!company || !notifications) return;

    const next = !notifications[channel];

    if (channel === 'whatsapp_enabled') {
      if (effectivePlan !== 'pro' || plan?.features?.whatsapp !== true) {
        setError('As notificações por WhatsApp estão disponíveis somente no Pix Pro.');
        return;
      }

      const phone = normalizePhoneInput(whatsappDraft);
      if (next && (phone.length < 10 || phone.length > 15)) {
        setError('Informe um número de WhatsApp válido antes de ativar os avisos.');
        return;
      }

      const [settingsResult, companyResult] = await Promise.all([
        supabase.from('pixwiki_notification_settings')
          .update({
            whatsapp_enabled: next,
            notification_phone: phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', company.id),
        phone
          ? supabase.from('companies')
              .update({ whatsapp_number: phone, updated_at: new Date().toISOString() })
              .eq('id', company.id)
              .eq('user_id', userId)
          : Promise.resolve({ error: null } as any),
      ]);

      const updateError = settingsResult.error || companyResult.error;
      if (updateError) {
        setError('Não foi possível alterar a notificação por WhatsApp.');
        return;
      }

      setNotifications({ ...notifications, whatsapp_enabled: next, notification_phone: phone || null });
      setCompany({ ...company, whatsapp_number: phone || company.whatsapp_number });
      setNotice(next ? 'Avisos por WhatsApp ativados.' : 'Avisos por WhatsApp pausados.');
      return;
    }

    const { error: updateError } = await supabase.from('pixwiki_notification_settings')
      .update({ [channel]: next, updated_at: new Date().toISOString() })
      .eq('company_id', company.id);
    if (updateError) {
      setError('Não foi possível alterar a notificação.');
      return;
    }
    setNotifications({ ...notifications, [channel]: next });
  }

  async function saveWhatsappNumber() {
    if (!company || !notifications) return;
    if (effectivePlan !== 'pro' || plan?.features?.whatsapp !== true) {
      setError('O número de avisos por WhatsApp é um recurso do Pix Pro.');
      return;
    }

    const phone = normalizePhoneInput(whatsappDraft);
    if (phone.length < 10 || phone.length > 15) {
      setError('Informe um número de WhatsApp válido com DDD.');
      return;
    }

    setError('');
    const [settingsResult, companyResult] = await Promise.all([
      supabase.from('pixwiki_notification_settings')
        .update({ notification_phone: phone, updated_at: new Date().toISOString() })
        .eq('company_id', company.id),
      supabase.from('companies')
        .update({ whatsapp_number: phone, updated_at: new Date().toISOString() })
        .eq('id', company.id)
        .eq('user_id', userId),
    ]);

    const updateError = settingsResult.error || companyResult.error;
    if (updateError) {
      setError('Não foi possível salvar o número de WhatsApp.');
      return;
    }

    setNotifications({ ...notifications, notification_phone: phone });
    setCompany({ ...company, whatsapp_number: phone });
    setWhatsappDraft(phone);
    setNotice('Número de WhatsApp salvo para esta empresa.');
  }

  function switchCompany(companyId: string) {
    if (!companyId || companyId === company?.id) return;
    localStorage.setItem('pixWikiActiveCompanyId', companyId);
    window.location.href = `/dashboard?company=${encodeURIComponent(companyId)}`;
  }

  async function createCompany() {
    if (effectivePlan !== 'pro' || plan?.features?.multi_company !== true) {
      setError('Multiempresa está disponível somente no Pix Pro.');
      return;
    }

    const slug = newCompanySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!newCompanyName.trim()) {
      setError('Informe o nome da nova empresa.');
      return;
    }
    if (slug.length < 3) {
      setError('Escolha um endereço com pelo menos 3 caracteres.');
      return;
    }

    setCreatingCompany(true);
    setError('');
    setNotice('');
    try {
      const { data, error: createError } = await supabase.rpc('pixwiki_create_company', {
        p_name: newCompanyName.trim(),
        p_slug: slug,
        p_logo_url: null,
        p_whatsapp: normalizePhoneInput(newCompanyPhone) || null,
        p_email: newCompanyEmail.trim() || authEmail || null,
        p_pix_key: newCompanyPixKey.trim() || null,
        p_pix_key_type: newCompanyPixType || null,
      }).single();
      if (createError) throw createError;
      const created = data as { id: string; slug: string; name: string } | null;
      if (!created?.id) throw new Error('company_create_failed');
      localStorage.setItem('pixWikiActiveCompanyId', created.id);
      window.location.href = `/dashboard?company=${encodeURIComponent(created.id)}`;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('pix_pro_required')) setError('Multiempresa requer Pix Pro ativo.');
      else if (msg.includes('reserved_slug')) setError('Esse endereço é reservado pelo PixWiki.');
      else if (msg.includes('slug_unavailable')) setError('Esse endereço já está em uso.');
      else if (msg.includes('invalid_slug')) setError('Use letras minúsculas, números e hífen no endereço.');
      else setError('Não foi possível criar a nova empresa.');
    } finally {
      setCreatingCompany(false);
    }
  }

  async function logout() {
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      await new Promise<void>((resolve) => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        const timeout = window.setTimeout(finish, 1500);

        window.OneSignalDeferred!.push(async (OneSignal: any) => {
          try {
            const subscriptionId = String(OneSignal?.User?.PushSubscription?.id || '');
            if (subscriptionId) {
              await supabase.rpc('pixwiki_unregister_push_subscription', {
                p_subscription_id: subscriptionId,
              });
            }
            await OneSignal.logout();
          } catch {
            // best effort
          } finally {
            window.clearTimeout(timeout);
            finish();
          }
        });
      });
    }

    await supabase.auth.signOut();
    window.location.href = 'https://pix.wiki';
  }

  if (loading) return <Spinner />;

  if (!company) {
    return (
      <div className={`min-h-screen ${page} flex items-center justify-center px-6`}>
        <div className={`w-full max-w-lg rounded-3xl border p-8 text-center ${card}`}>
          <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={96} height={96} className="mx-auto rounded-2xl" />
          <h1 className="mt-5 text-xl font-bold">Conclua seu cadastro</h1>
          <p className={`mt-2 text-sm ${muted}`}>{error || 'Precisamos criar sua primeira empresa PixWiki.'}</p>
          <a href="https://pix.wiki" className="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950">Voltar ao início</a>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen ${page}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={46} height={46} className="rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">PixWiki</h1>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                  {PLAN_COPY[effectivePlan].title}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {companies.length > 1 ? (
                  <select
                    value={company.id}
                    onChange={e => switchCompany(e.target.value)}
                    className={`max-w-[210px] rounded-lg border px-2 py-1 text-xs outline-none ${input}`}
                    aria-label="Empresa ativa"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.plan_access === false ? ' · pausada' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={`text-xs ${muted}`}>{company.name}</p>
                )}
                {effectivePlan === 'pro' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCompanyEmail(authEmail);
                      setShowCompanyForm(true);
                    }}
                    className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400"
                  >
                    + Empresa
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDark(v => {
                  const next = !v;
                  localStorage.setItem('publicTheme', next ? 'dark' : 'light');
                  return next;
                });
              }}
              aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={dark ? 'Tema claro' : 'Tema escuro'}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${card}`}
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button onClick={logout} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${card}`}>Sair</button>
          </div>
        </header>

        {(notice || error) && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
            {error || notice}
          </div>
        )}

        {showCompanyForm && effectivePlan === 'pro' && (
          <section className={`mt-5 rounded-3xl border p-5 sm:p-6 ${card}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Nova empresa PixWiki</h2>
                <p className={`mt-1 text-sm ${muted}`}>Cada empresa pode ter sua própria chave, Mercado Pago, subdomínio e WhatsApp.</p>
              </div>
              <button type="button" onClick={() => setShowCompanyForm(false)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${card}`}>Fechar</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Nome da empresa</span>
                <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
              </label>
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Subdomínio</span>
                <div className="relative mt-1">
                  <input value={newCompanySlug} onChange={e => setNewCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={`w-full rounded-xl border px-4 py-3 pr-24 text-sm outline-none ${input}`} />
                  <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${faint}`}>.pix.wiki</span>
                </div>
              </label>
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>E-mail</span>
                <input type="email" value={newCompanyEmail} onChange={e => setNewCompanyEmail(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
              </label>
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>WhatsApp de avisos</span>
                <input inputMode="tel" value={newCompanyPhone} onChange={e => setNewCompanyPhone(normalizePhoneInput(e.target.value))} placeholder="11999999999" className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
              </label>
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Tipo da chave Pix</span>
                <select value={newCompanyPixType} onChange={e => setNewCompanyPixType(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none ${input}`}>
                  <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option>
                </select>
              </label>
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Chave Pix Mercado Pago</span>
                <input value={newCompanyPixKey} onChange={e => setNewCompanyPixKey(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
              </label>
            </div>
            <button type="button" onClick={createCompany} disabled={creatingCompany} className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
              {creatingCompany ? 'Criando...' : 'Criar empresa'}
            </button>
          </section>
        )}

        {!companyPlanAccess && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-amber-300">Empresa pausada pelo plano</p>
              <p className={`mt-1 text-sm ${muted}`}>Empresas adicionais fazem parte do Pix Pro. O histórico continua visível, mas recebimentos, subdomínio e automações ficam pausados até reativar o Pro.</p>
            </div>
            <button onClick={() => createInvoice('pro')} disabled={!!planBusy || !!plan?.pending_invoice} className="rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50">Reativar Pix Pro</button>
          </div>
        )}

        {!mpConnected && companyPlanAccess && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-amber-300">Conecte seu Mercado Pago</p>
              <p className={`mt-1 text-sm ${muted}`}>
                É a conexão que permite ao PixWiki identificar os Pix que chegam direto na sua chave e os Pix Link.
              </p>
            </div>
            <button
              onClick={() => connectMercadoPago(company.id, '/dashboard')}
              className="rounded-xl bg-[#009ee3] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Conectar Mercado Pago
            </button>
          </div>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Recebido hoje', money(todayGross)],
            ['Líquido no mês', money(monthNet)],
            ['Tarifas Mercado Pago', money(monthFees)],
            ['Pix no mês', String(monthReceipts.length)],
          ].map(([label, value]) => (
            <div key={label} className={`rounded-2xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold ${muted}`}>{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black">Como cobrar?</h2>
              <p className={`text-sm ${muted}`}>Escolha o que faz mais sentido em cada venda.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">CHAVE PIX</span>
                  <h3 className="mt-3 text-lg font-black">Direto, sem link</h3>
                  <p className={`mt-1 text-sm leading-relaxed ${muted}`}>
                    Ideal para balcão e clientes recorrentes. O cliente informa a chave e o valor manualmente.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-emerald-400">PixWiki</p>
                  <p className="text-lg font-black">R$ 0,00</p>
                </div>
              </div>

              <div className={`mt-5 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-black/15' : 'border-black/10 bg-slate-50'}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wide ${faint}`}>Sua chave</p>
                <p className="mt-1 break-all text-sm font-semibold">{payment?.pix_key || 'Cadastre sua chave nas configurações abaixo.'}</p>
                {payment?.pix_key && (
                  <button onClick={() => copyText(payment.pix_key || '', 'pixkey')} className="mt-3 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950">
                    {copied === 'pixkey' ? 'Copiado!' : 'Copiar chave Pix'}
                  </button>
                )}
              </div>

              <p className={`mt-4 text-xs leading-relaxed ${muted}`}>
                Nos Pix diretos testados na conta Mercado Pago conectada, o valor chegou integralmente. O PixWiki não cobra percentual por transação.
              </p>
            </div>

            <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-400">PIX LINK</span>
                  <h3 className="mt-3 text-lg font-black">Profissional e com valor pronto</h3>
                  <p className={`mt-1 text-sm leading-relaxed ${muted}`}>
                    Ideal para WhatsApp, Instagram e vendas à distância. O cliente abre sua página e paga o valor já preenchido.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-sky-400">PixWiki</p>
                  <p className="text-lg font-black">R$ 0,00</p>
                </div>
              </div>

              {!canLink ? (
                <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                  <p className="text-sm font-bold text-sky-300">Disponível no Pix Link</p>
                  <p className={`mt-1 text-xs ${muted}`}>Ative por R$ 29,90/mês e use seu endereço empresa.pix.wiki.</p>
                  <button onClick={() => createInvoice('link')} className="mt-3 rounded-xl bg-sky-400 px-3 py-2 text-xs font-black text-slate-950">
                    Ativar Pix Link
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={shareValue}
                      onChange={e => setShareValue(e.target.value)}
                      placeholder="Valor, ex.: 149,90"
                      inputMode="decimal"
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-sky-400/60 ${input}`}
                    />
                    <button onClick={() => copyText(linkWithAmount, 'link')} className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950">
                      {copied === 'link' ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                  <p className={`mt-3 break-all text-xs font-semibold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>{linkWithAmount || linkBase}</p>

                  {amountNumber > 0 && (
                    <div className={`mt-4 rounded-2xl border p-4 text-xs ${isDark ? 'border-white/10 bg-black/15' : 'border-black/10 bg-slate-50'}`}>
                      <div className="flex justify-between gap-4"><span className={muted}>Venda</span><strong>{money(Math.round(amountNumber * 100))}</strong></div>
                      <div className="mt-2 flex justify-between gap-4"><span className={muted}>Tarifa estimada Mercado Pago (~1%)</span><strong>{money(estimatedMpFee)}</strong></div>
                      <div className="mt-2 flex justify-between gap-4"><span className={muted}>Tarifa PixWiki</span><strong className="text-emerald-400">R$ 0,00</strong></div>
                    </div>
                  )}
                </>
              )}

              <p className={`mt-4 text-xs leading-relaxed ${muted}`}>
                A tarifa do Pix Link é cobrada diretamente pelo Mercado Pago. Nos pagamentos reais já medidos nesta conta, foi 1%. O histórico mostra a tarifa efetivamente retornada pelo provedor.
              </p>
            </div>
          </div>
        </section>

        {plan?.pending_invoice && (
          <section className={`mt-6 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 sm:p-6`}>
            <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
              <div className="mx-auto w-[180px] overflow-hidden rounded-2xl bg-white p-2">
                {plan.pending_invoice.qr_code_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={plan.pending_invoice.qr_code_url} alt="QR Code da mensalidade PixWiki" className="h-auto w-full" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-500">QR Code indisponível</div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Mensalidade pendente</p>
                <h3 className="mt-1 text-xl font-black">{PLAN_COPY[plan.pending_invoice.target_plan].title} · {money(plan.pending_invoice.amount_cents)}</h3>
                <p className={`mt-2 text-sm ${muted}`}>O PixWiki verifica o pagamento automaticamente. Esta cobrança expira em {dateTime(plan.pending_invoice.expires_at)}.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.pending_invoice.pix_code && (
                    <button onClick={() => copyText(plan.pending_invoice?.pix_code || '', 'invoice')} className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-black text-slate-950">
                      {copied === 'invoice' ? 'Pix copiado!' : 'Copiar Pix'}
                    </button>
                  )}
                  <button onClick={checkInvoice} disabled={!!planBusy} className={`rounded-xl border px-4 py-2 text-xs font-bold ${card} disabled:opacity-50`}>
                    Conferir pagamento
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Recebimentos</h2>
              <p className={`text-sm ${muted}`}>Chave Pix e Pix Link no mesmo histórico.</p>
            </div>
            <div className={`inline-flex rounded-xl border p-1 ${card}`}>
              {([
                ['all', 'Todos'], ['pix_key', 'Chave Pix'], ['pixwiki_link', 'Pix Link'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setReceiptFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${receiptFilter === key ? 'bg-emerald-500 text-slate-950' : muted}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden rounded-3xl border ${card}`}>
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold">Nenhum recebimento neste filtro.</p>
                <p className={`mt-1 text-sm ${muted}`}>Quando um Pix for detectado, ele aparece aqui automaticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredReceipts.map(r => (
                  <div key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black">{money(r.amount_cents)}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.source === 'pixwiki_link' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {r.source === 'pixwiki_link' ? 'PIX LINK' : 'CHAVE PIX'}
                        </span>
                      </div>
                      <p className={`mt-1 text-xs ${muted}`}>{dateTime(r.received_at)}{r.mp_payment_id ? ` · MP ${r.mp_payment_id}` : ''}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${faint}`}>Tarifa Mercado Pago</p>
                      <p className={`text-sm font-bold ${r.fee_amount_cents > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{money(r.fee_amount_cents)}</p>
                    </div>
                    <div className="text-left sm:min-w-28 sm:text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${faint}`}>Líquido</p>
                      <p className="text-sm font-black">{money(r.net_amount_cents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-lg font-black">Planos PixWiki</h2>
            <p className={`text-sm ${muted}`}>Três opções. Nenhuma cobra percentual das suas vendas para o PixWiki.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {(['free', 'link', 'pro'] as PlanKey[]).map(key => {
              const catalog = plan?.plans.find(p => p.plan === key);
              const current = effectivePlan === key;
              const disabledByPro = effectivePlan === 'pro' && key === 'link';
              const price = catalog?.price_cents ?? (key === 'link' ? 2990 : key === 'pro' ? 9990 : 0);
              return (
                <div key={key} className={`relative rounded-3xl border p-6 ${key === 'link' ? 'border-sky-500/35' : isDark ? 'border-white/10' : 'border-black/10'} ${card}`}>
                  {key === 'link' && <span className="absolute right-4 top-4 rounded-full bg-sky-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950">Mais popular</span>}
                  <h3 className="text-xl font-black">{PLAN_COPY[key].title}</h3>
                  <p className={`mt-1 min-h-10 text-sm ${muted}`}>{PLAN_COPY[key].subtitle}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-3xl font-black">{price === 0 ? 'Grátis' : money(price)}</span>
                    {price > 0 && <span className={`pb-1 text-xs ${muted}`}>/mês</span>}
                  </div>
                  <div className="mt-5 space-y-2">
                    {PLAN_COPY[key].items.map(item => <p key={item} className={`text-sm ${muted}`}>✓ {item}</p>)}
                  </div>

                  <div className="mt-6">
                    {key === 'free' ? (
                      <button disabled className={`w-full rounded-xl border px-4 py-3 text-sm font-bold ${card} opacity-70`}>
                        {current ? 'Seu plano atual' : 'Plano gratuito'}
                      </button>
                    ) : (
                      <button
                        onClick={() => createInvoice(key)}
                        disabled={!!planBusy || disabledByPro || !!plan?.pending_invoice}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${key === 'pro' ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-sky-400 text-slate-950 hover:bg-sky-300'}`}
                      >
                        {planBusy === key ? 'Gerando...' : current ? `Renovar ${PLAN_COPY[key].title}` : disabledByPro ? 'Disponível após o Pro' : `Ativar ${PLAN_COPY[key].title}`}
                      </button>
                    )}
                  </div>

                  {current && plan?.subscription?.current_period_end && key !== 'free' && (
                    <p className={`mt-3 text-center text-xs ${muted}`}>Ativo até {dateOnly(plan.subscription.current_period_end)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
            <h2 className="text-lg font-black">Notificações</h2>
            <p className={`mt-1 text-sm ${muted}`}>E-mail e Push estão incluídos desde o Pix Grátis.</p>

            <div className="mt-5 space-y-3">
              <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.025]' : 'border-black/10 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">E-mail</p>
                    <p className={`mt-1 text-xs ${muted}`}>Aviso para {emailDraft || authEmail || 'seu e-mail'}.</p>
                  </div>
                  <button
                    onClick={() => toggleNotification('email_enabled')}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${notifications?.email_enabled !== false ? 'bg-emerald-500 text-slate-950' : isDark ? 'bg-white/10 text-white/50' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {notifications?.email_enabled !== false ? 'Ativo' : 'Pausado'}
                  </button>
                </div>
              </div>

              {notifications?.push_enabled !== false ? (
                <div>
                  {userId && <PixWikiPush userId={userId} companyId={company.id} dark={dark} />}
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => toggleNotification('push_enabled')}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${card}`}
                    >
                      Pausar Push
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.025]' : 'border-black/10 bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">Push PixWiki</p>
                      <p className={`mt-1 text-xs ${muted}`}>Canal pausado para esta empresa.</p>
                    </div>
                    <button
                      onClick={() => toggleNotification('push_enabled')}
                      className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950"
                    >
                      Ativar
                    </button>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-4 ${effectivePlan === 'pro' ? 'border-emerald-500/20 bg-emerald-500/5' : isDark ? 'border-white/10 bg-white/[0.025]' : 'border-black/10 bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">WhatsApp</p>
                    <p className={`mt-1 text-xs leading-relaxed ${muted}`}>
                      {effectivePlan === 'pro'
                        ? '1 número de aviso por empresa. Se a janela estiver fechada, o PixWiki usa o template de confirmação com botão para reativar os avisos.'
                        : 'Incluído no Pix Pro, com 1 número de aviso por empresa/Pix configurado.'}
                    </p>
                  </div>

                  {effectivePlan === 'pro' && (
                    <button
                      onClick={() => toggleNotification('whatsapp_enabled')}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${notifications?.whatsapp_enabled === true ? 'bg-emerald-500 text-slate-950' : isDark ? 'bg-white/10 text-white/50' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {notifications?.whatsapp_enabled === true ? 'Ativo' : 'Pausado'}
                    </button>
                  )}
                </div>

                {effectivePlan === 'pro' ? (
                  <div className="mt-4">
                    <label className="block">
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${faint}`}>Número que recebe os avisos</span>
                      <div className="mt-1 flex gap-2">
                        <input
                          value={whatsappDraft}
                          onChange={e => setWhatsappDraft(normalizePhoneInput(e.target.value))}
                          inputMode="tel"
                          placeholder="11999999999"
                          className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`}
                        />
                        <button
                          type="button"
                          onClick={saveWhatsappNumber}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950"
                        >
                          Salvar
                        </button>
                      </div>
                    </label>
                    <p className={`mt-2 text-[11px] leading-relaxed ${muted}`}>
                      Informe DDD + número. O envio usa a mesma infraestrutura WhatsApp já utilizada pelo minhAi.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => createInvoice('pro')}
                    disabled={!!planBusy || !!plan?.pending_invoice}
                    className="mt-4 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                  >
                    Ativar Pix Pro
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
            <h2 className="text-lg font-black">Configurações</h2>
            <p className={`mt-1 text-sm ${muted}`}>Dados usados no seu painel e nas notificações.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Nome da empresa</span>
                <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
              </label>

              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>Logo (URL)</span>
                <input value={logoDraft} onChange={e => setLogoDraft(e.target.value)} placeholder="https://..." className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
              </label>

              <label className="block">
                <span className={`text-xs font-bold ${muted}`}>E-mail das notificações</span>
                <input type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
              </label>

              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <label className="block">
                  <span className={`text-xs font-bold ${muted}`}>Tipo da chave</span>
                  <select value={pixTypeDraft} onChange={e => setPixTypeDraft(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none ${input}`}>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Aleatória</option>
                  </select>
                </label>
                <label className="block">
                  <span className={`text-xs font-bold ${muted}`}>Chave Pix Mercado Pago</span>
                  <input value={pixKeyDraft} onChange={e => setPixKeyDraft(e.target.value)} className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
                </label>
              </div>

              <button onClick={saveSettings} disabled={savingSettings} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50">
                {savingSettings ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </div>
        </section>

        <section className={`mt-4 rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-black">Seu endereço PixWiki</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                No Pix Link e Pix Pro, escolha o endereço profissional que você envia aos clientes.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    value={slugDraft}
                    onChange={e => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    disabled={!canLink}
                    className={`w-full rounded-xl border px-4 py-3 pr-24 text-sm outline-none focus:border-sky-400/60 disabled:opacity-50 ${input}`}
                  />
                  <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${faint}`}>.pix.wiki</span>
                </div>
                <button onClick={claimSlug} disabled={!canLink || savingSlug} className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45">
                  {savingSlug ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              {!canLink && <p className={`mt-2 text-xs ${muted}`}>Ative o Pix Link para publicar o subdomínio.</p>}
              {canLink && <p className={`mt-2 break-all text-xs text-sky-400`}>https://{company.slug}.pix.wiki</p>}
            </div>
          </div>
        </section>

        <section className={`mt-4 rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Mercado Pago</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                {mpConnected ? 'Conectado para esta empresa. Seus recebimentos são conciliados automaticamente.' : companyPlanAccess ? 'Ainda não conectado para esta empresa.' : 'Conexão pausada enquanto esta empresa estiver fora do Pix Pro.'}
              </p>
            </div>
            <button disabled={!companyPlanAccess} onClick={() => connectMercadoPago(company.id, '/dashboard')} className={`rounded-xl px-4 py-3 text-sm font-black disabled:opacity-45 ${mpConnected ? isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800' : 'bg-[#009ee3] text-white'}`}>
              {mpConnected ? 'Reconectar Mercado Pago' : 'Conectar Mercado Pago'}
            </button>
          </div>
        </section>

        <footer className={`py-8 text-center text-xs ${faint}`}>
          PixWiki · Seu dinheiro cai direto na sua conta · Tecnologia minhAi / BigCorps
        </footer>
      </div>
    </main>
  );
}

export default function PixWikiDashboardPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardContent />
    </Suspense>
  );
}
