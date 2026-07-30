'use client';

// app/pix/conta/page.tsx — área da conta do Pix Wiki: saldo, extrato e
// edição de dados (exceto chave PIX e slug, por segurança).

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// ─── Paletas (mesmas do app/pix/page.tsx) ──────────────────────────────────
const D = {
  pageBg: 'bg-[#020617]', cardBg: 'bg-[#020617]', border: 'border-white/10',
  text: 'text-white', textMuted: 'text-white/60', textFaint: 'text-white/40',
  inputBg: 'bg-white/5', inputBorder: 'border-white/10', inputText: 'text-white', inputPh: 'placeholder-white/25',
  divider: 'bg-white/8', toggleBg: 'bg-white/8 border-white/10 text-white/50 hover:bg-white/12',
  footerText: 'text-white/25', footerLink: 'text-white/40 hover:text-white/70',
  badgeBg: 'bg-white/5 border-white/6 text-white/40',
};
const L = {
  pageBg: 'bg-white', cardBg: 'bg-white', border: 'border-black/8',
  text: 'text-gray-900', textMuted: 'text-gray-900', textFaint: 'text-black/70',
  inputBg: 'bg-black/5', inputBorder: 'border-black/10', inputText: 'text-gray-900', inputPh: 'placeholder-black/25',
  divider: 'bg-black/8', toggleBg: 'bg-black/8 border-black/10 text-black/50 hover:bg-black/12',
  footerText: 'text-black/30', footerLink: 'text-black/40 hover:text-black/70',
  badgeBg: 'bg-black/5 border-black/6 text-black/40',
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
interface TxnRow { id: string; amount_cents: number; transaction_type: string; description: string | null; created_at: string; }

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

function PixContaContent() {
  const supabase = createClient();
  const router = useRouter();
  const search = useSearchParams();
  const bemVindo = search.get('bemvindo') === '1';

  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);

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

    const loadForUser = async (uid: string) => {
      setUserId(uid);

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
        if (!pendingRaw) { router.replace('/pix'); return; }
        activeCompany = await createFromPendingSignup(supabase, uid, JSON.parse(pendingRaw));
        if (cancelled) return;
        if (!activeCompany) { router.replace('/pix?error=slug_taken'); return; }
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
        supabase.from('balance_transactions')
          .select('id, amount_cents, transaction_type, description, created_at')
          .eq('company_id', activeCompany.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('user_profiles')
          .select('withdrawal_pix_key, withdrawal_pix_key_type, documento, documento_tipo')
          .eq('user_id', uid).maybeSingle(),
      ]);

      if (cancelled) return;
      setBalance(bal || { available_balance_cents: 0, total_received_cents: 0 });
      setTxns(tx || []);
      setProfile(prof || null);
      setEditForm(f => ({
        ...f,
        documento: prof?.documento || '',
        documentoTipo: prof?.documento_tipo || '',
      }));
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !cancelled) loadForUser(data.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !cancelled) {
        loadForUser(session.user.id);
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

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  const p = dark ? D : L;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${p.pageBg}`}>
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-8 ${p.pageBg}`}>
      <div className="w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Image src="/brands/pix/pixwiki.png" alt="Pix Wiki" width={90} height={36} className="object-contain h-8 w-auto" />
            <span className="text-gray-300 text-lg font-light select-none">|</span>
            <Image src="/logo-circle.png" alt="minhAi" width={30} height={30} className="rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
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

        <h1 className={`text-lg font-bold mb-1 ${p.text}`}>{company?.name}</h1>
        <a href={`/pix/${company?.slug}`} className="text-xs text-green-500 hover:underline mb-6 inline-block">
          pix.wiki/{company?.slug} ↗
        </a>

        {/* Saldo */}
        <div className={`rounded-2xl border p-5 mb-4 ${p.cardBg} ${p.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-1 ${p.textFaint}`}>Saldo disponível</p>
          <p className={`text-3xl font-bold ${p.text}`}>{fmt(balance?.available_balance_cents ?? 0)}</p>
          <p className={`text-xs mt-1 ${p.textMuted}`}>
            Total recebido: {fmt(balance?.total_received_cents ?? 0)}
          </p>
        </div>

        {/* Dados fixos (não editáveis) */}
        <div className={`rounded-2xl border p-5 mb-4 ${p.cardBg} ${p.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-3 ${p.textFaint}`}>Dados de recebimento</p>
          <div className="flex flex-col gap-3">
            <div>
              <p className={`text-xs ${p.textFaint}`}>Seu link (não pode ser alterado)</p>
              <p className={`text-sm ${p.text}`}>pix.wiki/{company?.slug}</p>
            </div>
            <div>
              <p className={`text-xs ${p.textFaint}`}>Chave PIX de recebimento (não pode ser alterada por segurança)</p>
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
          <p className={`text-[11px] mt-3 ${p.textFaint}`}>
            Precisa trocar o link ou a chave PIX? Fale com o suporte pelo WhatsApp (11) 98731-1425.
          </p>
        </div>

        {/* Dados editáveis */}
        <div className={`rounded-2xl border p-5 mb-4 ${p.cardBg} ${p.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-3 ${p.textFaint}`}>Editar informações</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>Nome da empresa</label>
              <input
                value={editForm.nome}
                onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText}`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>WhatsApp</label>
              <input
                value={editForm.whatsapp}
                onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="(11) 99999-9999"
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>E-mail de contato</label>
              <input
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contato@suaempresa.com"
                type="email"
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>URL do logo</label>
              <input
                value={editForm.logo}
                onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))}
                placeholder="https://suaempresa.com/logo.png"
                type="url"
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
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
                className={`w-full mt-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
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

        {/* Extrato */}
        <div className={`rounded-2xl border p-5 ${p.cardBg} ${p.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-3 ${p.textFaint}`}>Últimos recebimentos</p>
          {txns.length === 0 ? (
            <p className={`text-sm ${p.textMuted}`}>Nenhum recebimento ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left border-b ${p.border}`}>
                  <th className={`pb-2 font-normal text-[10px] uppercase tracking-widest ${p.textFaint}`}>Data</th>
                  <th className={`pb-2 font-normal text-[10px] uppercase tracking-widest ${p.textFaint}`}>Descrição</th>
                  <th className={`pb-2 font-normal text-[10px] uppercase tracking-widest text-right ${p.textFaint}`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className={`border-b last:border-0 ${p.border}`}>
                    <td className={`py-2.5 text-xs ${p.textFaint}`}>
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={`py-2.5 ${p.text}`}>{t.description || 'Recebimento PIX'}</td>
                    <td className="py-2.5 text-right font-semibold text-green-500">{fmt(t.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
