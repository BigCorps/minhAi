'use client';

// app/pix/dashboard/page.tsx — dashboard do Pix Wiki: foco em recebimentos,
// link de cobrança compartilhável, saque, e configurações da conta em card
// expansível. Card de "Seu Assistente" (brinde minhAi) na lateral/desktop.

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { connectMercadoPago } from '@/lib/connectMercadoPago';

// ─── Paletas ────────────────────────────────────────────────────────────────
const D = {
  pageBg: 'bg-[#020617]', cardBg: 'bg-[#020617]', border: 'border-white/10',
  text: 'text-white', textMuted: 'text-white/60', textFaint: 'text-white/40',
  inputBg: 'bg-white/5', inputBorder: 'border-white/10', inputText: 'text-white', inputPh: 'placeholder-white/25',
  divider: 'bg-white/8', toggleBg: 'bg-white/8 border-white/10 text-white/50 hover:bg-white/12',
  footerText: 'text-white/25', footerLink: 'text-white/40 hover:text-white/70',
  badgeBg: 'bg-white/5 border-white/6 text-white/40',
  hoverBg: 'hover:bg-white/5',
};
const L = {
  pageBg: 'bg-white', cardBg: 'bg-white', border: 'border-black/8',
  text: 'text-gray-900', textMuted: 'text-gray-900', textFaint: 'text-black/70',
  inputBg: 'bg-black/5', inputBorder: 'border-black/10', inputText: 'text-gray-900', inputPh: 'placeholder-black/25',
  divider: 'bg-black/8', toggleBg: 'bg-black/8 border-black/10 text-black/50 hover:bg-black/12',
  footerText: 'text-black/30', footerLink: 'text-black/40 hover:text-black/70',
  badgeBg: 'bg-black/5 border-black/6 text-black/40',
  hoverBg: 'hover:bg-black/5',
};

interface CompanyRow {
  id: string; name: string; slug: string;
  logo_url: string | null; whatsapp_number: string | null; email_contato: string | null;
}
interface ProfileRow {
  withdrawal_pix_key: string | null; withdrawal_pix_key_type: string | null;
  documento: string | null; documento_tipo: string | null;
}
interface BalanceRow { available_balance_cents: number; total_received_cents: number; }
interface TxnRow {
  id: string; amount_cents: number; status: string;
  requested_at: string; confirmed_at: string | null; notes: string | null;
}

interface PendingSignup {
  slug: string; nome: string; pix: string; pixTipo: string | null;
  logo: string | null; doc: string | null; docTipo: string | null;
  wa: string | null; email: string | null;
}

function detectDocumentoTipo(v: string): 'cpf' | 'cnpj' | '' {
  const d = v.replace(/\D/g, '');
  return d.length === 11 ? 'cpf' : d.length === 14 ? 'cnpj' : '';
}

async function createFromPendingSignup(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pending: PendingSignup
): Promise<CompanyRow | null> {
  const { data: company, error } = await supabase
    .rpc('ensure_my_pix_wiki_company', {
      p_slug: pending.slug,
      p_name: pending.nome,
      p_logo_url: pending.logo,
      p_whatsapp: pending.wa,
      p_email: pending.email,
    })
    .single();

  if (error || !company) return null;

  await supabase.from('user_profiles').upsert({
    user_id: userId,
    withdrawal_pix_key: pending.pix,
    withdrawal_pix_key_type: pending.pixTipo,
    documento: pending.doc,
    documento_tipo: pending.docTipo,
  }, { onConflict: 'user_id' });

  await supabase.from('short_links').insert({
    slug: company.slug, type: 'pix_wiki',
    company_id: company.id, user_id: userId,
    original_url: `https://minhai.app/pix/${company.slug}`,
  });

  await supabase.from('demo_sessions').insert({
    nome_negocio: pending.nome,
    email: pending.email, phone: pending.wa,
    origem_simples: 'pixwiki',
    linked_user_id: userId, linked_company_id: company.id,
    linked_at: new Date().toISOString(), status: 'converted',
  });

  return {
    id: company.id, name: pending.nome, slug: company.slug,
    logo_url: pending.logo, whatsapp_number: pending.wa, email_contato: pending.email,
  };
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const p = dark ? D : L;
  return (
    <button
      onClick={onToggle}
      aria-label="Alternar tema"
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${p.toggleBg}`}
    >
      {dark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Footer({ dark }: { dark: boolean }) {
  const p = dark ? D : L;
  return (
    <footer className={`mt-8 text-center flex flex-col gap-1 ${p.footerText} text-xs`}>
      <p>
        <a href="https://pix.wiki" className={`transition-colors ${p.footerLink}`}>Pix.Wiki</a>
        {' '}|{' '}
        Desenvolvido por{' '}
        <a href="https://bigcorps.com.br" className={`transition-colors ${p.footerLink}`}>BigCorps</a>
        {' '}| Tecnologia{' '}
        <a href="https://minhai.app" className={`transition-colors ${p.footerLink}`}>minhAi</a>
      </p>
    </footer>
  );
}

// ─── Card do assistente por voz (brinde minhAi) ────────────────────────────
function VoiceAssistantCard({ dark, slug }: { dark: boolean; slug: string }) {
  const p = dark ? D : L;
  const utmUrl = `https://minhai.app?utm_source=pixwiki&utm_medium=dashboard&utm_campaign=brinde-voz&ref=${slug}`;

  return (
    <div className={`rounded-2xl border p-5 ${p.cardBg} ${p.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <Image src="/logo-circle.png" alt="minhAi" width={28} height={28} className="rounded-lg" />
        <span className={`text-[10px] uppercase tracking-widest font-bold ${p.textFaint}`}>
          Seu Assistente
        </span>
      </div>
      <p className={`text-sm font-bold mb-1.5 ${p.text}`}>
        Seu link já vem com um assistente que ouve
      </p>
      <p className={`text-xs mb-4 ${p.textMuted}`}>
        A minhAi tem ativação por voz, tipo Alexa — e já sabe gerar o seu PIX
        só de você pedir falando. Nenhuma configuração extra, já está ativo
        na sua conta.
      </p>
      <a
        href={utmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-green-500 hover:text-green-400 transition-colors"
      >
        Conhecer todos os recursos da minhAi
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  );
}

function PixContaContent() {
  const supabase = createClient();
  const router = useRouter();
  const search = useSearchParams();
  const bemVindo = search.get('bemvindo') === '1';
  const justLinked = search.get('linked') === 'google';

  // ── Estado geral / conta ──────────────────────────────────────────────────
  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [slugTakenError, setSlugTakenError] = useState(false);

  // ── Login e segurança ─────────────────────────────────────────────────────
  const [identities, setIdentities] = useState<string[]>([]);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');

  // ── Recebimentos / saque ──────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'confirmed' | 'cancelled' | 'all'>('confirmed');

  // ── Link de cobrança compartilhável ───────────────────────────────────────
  const [shareValue, setShareValue] = useState('');
  const [copiedSimple, setCopiedSimple] = useState(false);
  const [copiedWithValue, setCopiedWithValue] = useState(false);

  // ── Configurações da conta ────────────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [mpConnected, setMpConnected] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '', logo: '', whatsapp: '', email: '', documento: '', documentoTipo: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    if (saved) { setDark(saved === 'dark'); return; }
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const toggleDark = () => {
    setDark(v => {
      const next = !v;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadForUser = async (authUser: { id: string; identities?: { provider: string }[] | null }) => {
      const uid = authUser.id;
      setUserId(uid);
      setIdentities((authUser.identities || []).map(i => i.provider));

      const { data: comp } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, whatsapp_number, email_contato')
        .eq('user_id', uid)
        .eq('segment_key', 'pix_wiki')
        .maybeSingle();

      if (cancelled) return;

      let activeCompany = comp;
      if (!activeCompany) {
        const pendingRaw = localStorage.getItem('pixWikiPendingSignup');
        if (!pendingRaw) { setNeedsSignup(true); setLoading(false); return; }
        activeCompany = await createFromPendingSignup(supabase, uid, JSON.parse(pendingRaw));
        if (cancelled) return;
        if (!activeCompany) { setSlugTakenError(true); setLoading(false); return; }
        localStorage.removeItem('pixWikiPendingSignup');
      }
      setCompany(activeCompany);
      setEditForm({
        nome: activeCompany.name,
        logo: activeCompany.logo_url || '',
        whatsapp: activeCompany.whatsapp_number || '',
        email: activeCompany.email_contato || '',
        documento: '', documentoTipo: '',
      });

      const [{ data: bal }, { data: tx }, { data: prof }] = await Promise.all([
        supabase.from('company_balance')
          .select('available_balance_cents, total_received_cents')
          .eq('company_id', activeCompany.id).maybeSingle(),
       supabase.from('pix_transactions')
         .select('id, amount_cents, status, requested_at, confirmed_at, notes')
         .eq('company_id', activeCompany.id)
         .order('requested_at', { ascending: false })
         .limit(200),
        supabase.from('user_profiles')
          .select('withdrawal_pix_key, withdrawal_pix_key_type, documento, documento_tipo')
          .eq('user_id', uid).maybeSingle(),
      ]);

      if (cancelled) return;
      setBalance(bal || { available_balance_cents: 0, total_received_cents: 0 });
      setTxns(tx || []);
      setProfile(prof || null);
      const { data: mpConn } = await supabase
        .from('mp_connections')
        .select('id')
        .eq('user_id', uid)
        .eq('is_active', true)
        .maybeSingle();
      setMpConnected(!!mpConn);
      setEditForm(f => ({
        ...f,
        documento: prof?.documento || '',
        documentoTipo: prof?.documento_tipo || '',
      }));
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !cancelled) loadForUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !cancelled) {
        loadForUser(session.user);
      }
    });

    const timeout = setTimeout(() => {
      if (cancelled) return;
      const hasPendingOAuth = window.location.search.includes('code=');
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user && !hasPendingOAuth && !cancelled) {
          router.replace('/pix/login');
        }
      });
    }, 2500);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase, router]);

// ── Recebimentos: filtro por status + agrupamento por dia ────────────────
const CONFIRMED_STATUSES = ['confirmed', 'transferred'];
const CANCELLED_STATUSES = ['cancelled', 'expired'];

const filteredTxns = txns.filter(t => {
  if (statusFilter === 'confirmed') return CONFIRMED_STATUSES.includes(t.status);
  if (statusFilter === 'cancelled') return CANCELLED_STATUSES.includes(t.status);
  return true;
});

const statusCounts = {
  confirmed: txns.filter(t => CONFIRMED_STATUSES.includes(t.status)).length,
  cancelled: txns.filter(t => CANCELLED_STATUSES.includes(t.status)).length,
  all: txns.length,
};

const statusLabel = (s: string) =>
  CONFIRMED_STATUSES.includes(s) ? 'Confirmado' :
  CANCELLED_STATUSES.includes(s) ? (s === 'expired' ? 'Expirado' : 'Cancelado') :
  'Pendente';

const statusColor = (s: string) =>
  CONFIRMED_STATUSES.includes(s) ? 'text-green-500' :
  CANCELLED_STATUSES.includes(s) ? 'text-red-500' :
  'text-amber-500';

interface DayGroup { key: string; label: string; total: number; items: TxnRow[]; }

const dayGroups: DayGroup[] = (() => {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  for (const t of filteredTxns) {
    const d = new Date(t.confirmed_at || t.requested_at);
    const key = d.toDateString();
    let group = byKey.get(key);
    if (!group) {
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        .toUpperCase().replace(/\.?,/, ',');
      group = { key, label, total: 0, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(t);
    if (CONFIRMED_STATUSES.includes(t.status)) group.total += t.amount_cents;
  }
  return groups;
})();

  // ── Link de cobrança compartilhável ───────────────────────────────────────
  const simpleLink = `pix.wiki/${company?.slug}`;
  const cleanShareValue = shareValue.trim().replace(',', '.');
  const hasValidShareValue = !!cleanShareValue && parseFloat(cleanShareValue) > 0;
  const linkWithValue = hasValidShareValue ? `pix.wiki/${company?.slug}/${cleanShareValue}` : '';

  function copySimpleLink() {
    navigator.clipboard.writeText(`https://${simpleLink}`);
    setCopiedSimple(true);
    setTimeout(() => setCopiedSimple(false), 2000);
  }
  function copyLinkWithValue() {
    if (!linkWithValue) return;
    navigator.clipboard.writeText(`https://${linkWithValue}`);
    setCopiedWithValue(true);
    setTimeout(() => setCopiedWithValue(false), 2000);
  }

  // ── Editar informações ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!company || !userId) return;
    setSaving(true);
    setSaveMsg('');

    const { error: e1 } = await supabase.from('companies').update({
      name: editForm.nome,
      logo_url: editForm.logo || null,
      whatsapp_number: editForm.whatsapp || null,
      email_contato: editForm.email || null,
    }).eq('id', company.id);

    const { error: e2 } = await supabase.from('user_profiles').upsert({
      user_id: userId,
      documento: editForm.documento || null,
      documento_tipo: editForm.documentoTipo || null,
    }, { onConflict: 'user_id' });

    setSaving(false);
    if (e1 || e2) { setSaveMsg('Erro ao salvar. Tente novamente.'); return; }

    setCompany(c => c ? {
      ...c, name: editForm.nome, logo_url: editForm.logo || null,
      whatsapp_number: editForm.whatsapp || null, email_contato: editForm.email || null,
    } : c);
    setSaveMsg('Salvo com sucesso.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/pix/login');
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setLinkMsg('');
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?link=true&next=${encodeURIComponent('/dashboard?linked=google')}`,
      },
    });
    if (error) {
      setLinkMsg(error.message || 'Erro ao vincular conta Google.');
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('Desvincular sua conta Google? Você continuará acessando por e-mail e senha.')) return;

    if (!identities.includes('email')) {
      setLinkMsg('Não é possível desvincular: essa conta não tem senha cadastrada ainda.');
      return;
    }

    setUnlinkingGoogle(true);
    setLinkMsg('');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const googleIdentity = authUser?.identities?.find(i => i.provider === 'google');
    if (!googleIdentity) {
      setLinkMsg('Identidade Google não encontrada.');
      setUnlinkingGoogle(false);
      return;
    }
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
    setUnlinkingGoogle(false);
    if (error) { setLinkMsg(error.message || 'Erro ao desvincular Google.'); return; }
    setIdentities(prev => prev.filter(id => id !== 'google'));
    setLinkMsg('Conta Google desvinculada com sucesso.');
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  const p = dark ? D : L;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${p.pageBg}`}>
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsSignup) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${p.pageBg}`}>
        <div className={`max-w-sm w-full rounded-2xl border p-6 text-center ${p.cardBg} ${p.border}`}>
          <p className={`text-lg font-bold mb-2 ${p.text}`}>Essa conta ainda não tem um link Pix Wiki</p>
          <p className={`text-sm mb-5 ${p.textMuted}`}>
            Você entrou com uma conta Google que ainda não criou um link de cobrança. Vamos criar agora?
          </p>
          <a
            href="/pix"
            className="inline-block w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all"
          >
            Criar meu link Pix agora
          </a>
        </div>
      </div>
    );
  }

  if (slugTakenError) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${p.pageBg}`}>
        <div className={`max-w-sm w-full rounded-2xl border p-6 text-center ${p.cardBg} ${p.border}`}>
          <p className={`text-lg font-bold mb-2 ${p.text}`}>O link escolhido acabou de ser ocupado</p>
          <p className={`text-sm mb-5 ${p.textMuted}`}>
            Alguém pegou esse link enquanto você fazia login. Escolhe outro pra continuar.
          </p>
          <a
            href="/pix"
            className="inline-block w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all"
          >
            Tentar outro link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-8 ${p.pageBg}`}>
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto">

        {/* Header — logo + nome/link do usuário, toggle/sair à direita */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/brands/pix/pixwiki.png" alt="Pix Wiki" width={40} height={40} className="object-contain h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className={`text-base font-bold truncate ${p.text}`}>{company?.name}</h1>
              <a href={`/pix/${company?.slug}`} className="text-xs text-green-500 hover:underline truncate block">
                pix.wiki/{company?.slug} ↗
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle dark={dark} onToggle={toggleDark} />
            <button
              onClick={handleSignOut}
              className={`text-xs px-3 py-2 rounded-xl border transition-colors ${p.border} ${p.textFaint} hover:${p.text}`}
            >
              Sair
            </button>
          </div>
        </div>

        {bemVindo && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            Sua conta foi criada! Seu link já está ativo: pix.wiki/{company?.slug}
          </div>
        )}
        {justLinked && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            Conta Google vinculada com sucesso!
          </div>
        )}

{!mpConnected && (
  <div className="mb-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 flex flex-col gap-3">
    <p className={`text-sm font-bold ${p.text}`}>Conecte sua conta Mercado Pago pra começar a receber</p>
    <p className={`text-xs ${p.textMuted}`}>
      Seus PIX caem direto na sua conta — a gente nunca vê nem guarda seu dinheiro.
    </p>

    <p className={`text-[11px] ${p.textFaint}`}>
      O Mercado Pago cobra uma taxa de 0,99% por PIX recebido.
    </p>
    
    <button
      onClick={() => connectMercadoPago(company!.id, '/pix/dashboard')}
      className="w-full py-2.5 bg-blue-500 text-white font-bold rounded-xl text-sm hover:bg-blue-400 transition-all active:scale-95"
    >
      Conectar Mercado Pago →
    </button>
  </div>
)}

        {/* Layout: 1 coluna no mobile, 2 colunas no desktop (principal + lateral) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

          {/* ── Coluna principal: saldo, link de cobrança, recebimentos/saque ── */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* Link de cobrança — lado a lado no desktop, empilhado no mobile */}
            <div className={`rounded-2xl border p-5 ${p.cardBg} ${p.border}`}>
              <p className={`text-[10px] uppercase tracking-widest mb-3 ${p.textFaint}`}>Seu link de cobrança</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs mb-1.5 ${p.textMuted}`}>Link simples — cliente digita o valor na hora</p>
                  <div className="flex gap-2">
                    <div className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-sm font-mono truncate ${p.inputBg} ${p.inputBorder} ${p.text}`}>
                      {simpleLink}
                    </div>
                    <button
                      onClick={copySimpleLink}
                      className={`flex-shrink-0 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        copiedSimple ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      }`}
                    >
                      {copiedSimple ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className={`text-xs mb-1.5 ${p.textMuted}`}>Link com valor fixo — cliente só confirma</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${p.textFaint}`}>R$</span>
                      <input
                        type="number" step="0.01" value={shareValue}
                        onChange={e => setShareValue(e.target.value)}
                        placeholder="0,00"
                        className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText}`}
                      />
                    </div>
                    <button
                      onClick={copyLinkWithValue}
                      disabled={!hasValidShareValue}
                      className={`flex-shrink-0 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
                        copiedWithValue ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                      }`}
                    >
                      {copiedWithValue ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  {hasValidShareValue && (
                    <p className={`text-[11px] mt-1.5 font-mono truncate ${p.textFaint}`}>{linkWithValue}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recebimentos / Saque */}
            <div className={`rounded-2xl border p-5 ${p.cardBg} ${p.border}`}>
              <p className={`text-[10px] uppercase tracking-widest mb-3 ${p.textFaint}`}>Recebimentos</p>

              {(txns.length === 0 ? (
                 <p className={`text-sm ${p.textMuted}`}>Nenhum recebimento ainda.</p>
               ) : (
                 <div>
                 {/* Filtro de status */}
                 <div className="flex items-center gap-2 mb-4 flex-wrap">
                   {([
                     ['confirmed', `Confirmados (${statusCounts.confirmed})`],
                     ['cancelled', `Cancelados (${statusCounts.cancelled})`],
                     ['all', `Todos (${statusCounts.all})`],
                   ] as const).map(([key, label]) => (
                     <button
                       key={key}
                       onClick={() => setStatusFilter(key)}
                       className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                         statusFilter === key
                           ? 'bg-green-500/15 border-green-500/40 text-green-500'
                           : `${p.border} ${p.textFaint} hover:${p.text}`
                       }`}
                     >
                       {label}
                     </button>
                   ))}
                 </div>

                 {filteredTxns.length === 0 ? (
                   <p className={`text-sm ${p.textMuted}`}>Nenhum recebimento nesse filtro.</p>
                 ) : (
                   <div className="flex flex-col gap-5">
                     {dayGroups.map(group => (
                       <div key={group.key}>
                         <div className={`flex items-center justify-between gap-2 pb-1.5 mb-2 border-b ${p.border}`}>
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>{group.label}</span>
                           <span className={`text-[11px] font-semibold ${p.textMuted}`}>
                             Recebido: <span className="text-green-500">{fmt(group.total)}</span>
                           </span>
                         </div>
                         <div className="flex flex-col">
                           {group.items.map(t => (
                             <div key={t.id} className={`flex items-center justify-between gap-2 py-2 border-b last:border-0 ${p.border}`}>
                               <div className="min-w-0">
                                 <p className={`text-xs whitespace-nowrap ${p.textFaint}`}>
                                   {new Date(t.requested_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                                 {t.notes && <p className={`text-xs truncate ${p.text}`}>{t.notes}</p>}
                               </div>
                               <div className="flex items-center gap-3 flex-shrink-0">
                                 <span className={`text-[10px] font-bold uppercase ${statusColor(t.status)}`}>
                                   {statusLabel(t.status)}
                                 </span>
                                 <span className={`text-sm font-semibold whitespace-nowrap ${p.text}`}>{fmt(t.amount_cents)}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
                 </div>
               ))}
            </div>
          </div>

          {/* ── Coluna lateral: assistente + configurações ── */}
          <div className="flex flex-col gap-4 min-w-0">

            <VoiceAssistantCard dark={dark} slug={company?.slug || ''} />

            {/* Configurações — card único, colapsado por padrão */}
            <div className={`rounded-2xl border overflow-hidden ${p.cardBg} ${p.border}`}>
              <button
                onClick={() => setConfigOpen(v => !v)}
                className={`w-full flex items-center justify-between p-5 transition-colors ${p.hoverBg}`}
              >
                <span className={`text-sm font-bold ${p.text}`}>Configurações da conta</span>
                <ChevronIcon open={configOpen} />
              </button>

              {configOpen && (
                <div className={`px-5 pb-5 border-t ${p.border} flex flex-col gap-5 pt-4`}>

                  {/* Dados fixos */}
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest mb-2 ${p.textFaint}`}>Dados de recebimento</p>
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <p className={`text-[11px] ${p.textFaint}`}>Seu link (fixo)</p>
                        <p className={`text-sm ${p.text}`}>pix.wiki/{company?.slug}</p>
                      </div>
                      <div>
                        <p className={`text-[11px] ${p.textFaint}`}>Chave PIX (fixa por segurança)</p>
                        <p className={`text-sm ${p.text}`}>
                          {profile?.withdrawal_pix_key || '—'}
                          {profile?.withdrawal_pix_key_type && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border capitalize ${p.badgeBg}`}>
                              {profile.withdrawal_pix_key_type}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[11px] mt-2 ${p.textFaint}`}>
                      Precisa trocar? Suporte: (11) 98731-1425.
                    </p>
                  </div>

                  {/* Login e segurança */}
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest mb-2 ${p.textFaint}`}>Login e segurança</p>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className={`text-sm ${p.text}`}>
                          {identities.includes('google') ? 'Conta Google conectada' : 'Conecte sua conta Google'}
                        </p>
                        <p className={`text-[11px] ${p.textFaint}`}>
                          {identities.includes('google')
                            ? 'Você pode entrar com Google ou e-mail e senha.'
                            : 'Entre mais rápido, sem digitar senha.'}
                        </p>
                      </div>
                      {identities.includes('google') ? (
                        identities.includes('email') && (
                          <button
                            onClick={handleUnlinkGoogle}
                            disabled={unlinkingGoogle}
                            className={`text-xs px-3 py-2 rounded-xl border transition-colors ${p.border} text-red-500 hover:bg-red-500/10 disabled:opacity-50`}
                          >
                            {unlinkingGoogle ? 'Desvinculando…' : 'Desvincular'}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={handleLinkGoogle}
                          disabled={linkingGoogle}
                          className={`text-xs px-3 py-2 rounded-xl border transition-colors ${p.border} ${p.text} hover:bg-white/5 disabled:opacity-50`}
                        >
                          {linkingGoogle ? 'Redirecionando…' : 'Vincular Google'}
                        </button>
                      )}
                    </div>
                    {linkMsg && (
                      <p className={`text-xs mt-2 ${linkMsg.includes('sucesso') ? 'text-green-500' : 'text-red-500'}`}>{linkMsg}</p>
                    )}
                  </div>

                  {/* Editar informações */}
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest mb-2 ${p.textFaint}`}>Editar informações</p>
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>Nome da empresa</label>
                        <input
                          value={editForm.nome}
                          onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>WhatsApp</label>
                        <input
                          value={editForm.whatsapp}
                          onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>E-mail de contato</label>
                        <input
                          value={editForm.email}
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="contato@suaempresa.com"
                          type="email"
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>URL do logo</label>
                        <input
                          value={editForm.logo}
                          onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))}
                          placeholder="https://suaempresa.com/logo.png"
                          type="url"
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>CNPJ ou CPF</label>
                        <input
                          value={editForm.documento}
                          onChange={e => {
                            const v = e.target.value;
                            setEditForm(f => ({ ...f, documento: v, documentoTipo: detectDocumentoTipo(v) }));
                          }}
                          placeholder="00.000.000/0000-00 ou 000.000.000-00"
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
                        />
                      </div>

                      {saveMsg && (
                        <p className={`text-xs ${saveMsg.startsWith('Erro') ? 'text-red-500' : 'text-green-500'}`}>{saveMsg}</p>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {saving ? 'Salvando…' : 'Salvar alterações'}
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        <Footer dark={dark} />
      </div>
    </div>
  );
}

export default function PixContaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PixContaContent />
    </Suspense>
  );
}
