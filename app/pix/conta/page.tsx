'use client';

// app/pix/conta/page.tsx — perfil simples do Pix Wiki: saldo + extrato PIX.
// Sem cartão/NFC/TEF — só o que existe no fluxo Pix Wiki.

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';

const P = {
  pageBg: 'bg-[#020617]', cardBg: 'bg-[#0f172a]', border: 'border-white/10',
  text: 'text-white', textMuted: 'text-white/50', textFaint: 'text-white/25',
  divider: 'bg-white/8',
};

interface CompanyRow { id: string; name: string; slug: string; }
interface BalanceRow { available_balance_cents: number; total_received_cents: number; }
interface TxnRow { id: string; amount_cents: number; transaction_type: string; description: string | null; created_at: string; }

interface PendingSignup {
  slug: string; nome: string; pix: string; pixTipo: string | null;
  logo: string | null; doc: string | null; docTipo: string | null;
  wa: string | null; email: string | null;
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

  return { id: company.id, name: pending.nome, slug: company.slug };
}

function PixContaContent() {
  const supabase = createClient();
  const router = useRouter();
  const search = useSearchParams();
  const bemVindo = search.get('bemvindo') === '1';

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadForUser = async (userId: string) => {
      const { data: comp } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', userId)
        .eq('segment_key', 'pix_wiki')
        .maybeSingle();

      if (cancelled) return;
     let activeCompany = comp;
     if (!activeCompany) {
       const pendingRaw = localStorage.getItem('pixWikiPendingSignup');
       if (!pendingRaw) { router.replace('/pix'); return; }
       activeCompany = await createFromPendingSignup(supabase, userId, JSON.parse(pendingRaw));
       if (cancelled) return;
       if (!activeCompany) { router.replace('/pix?error=slug_taken'); return; }
       localStorage.removeItem('pixWikiPendingSignup');
     }
     setCompany(activeCompany);

      const [{ data: bal }, { data: tx }] = await Promise.all([
        supabase.from('company_balance')
          .select('available_balance_cents, total_received_cents')
          .eq('company_id', activeCompany.id).maybeSingle(),
        supabase.from('balance_transactions')
          .select('id, amount_cents, transaction_type, description, created_at')
          .eq('company_id', activeCompany.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;
      setBalance(bal || { available_balance_cents: 0, total_received_cents: 0 });
      setTxns(tx || []);
      setLoading(false);
    };

    // Sessão já pronta (login recorrente por e-mail/senha, ou revisita).
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !cancelled) loadForUser(data.user.id);
    });

    // Cobre o caso de retorno do redirect OAuth do Google, onde a troca do
    // código por sessão é assíncrona e pode não ter terminado no getUser() acima.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !cancelled) {
        loadForUser(session.user.id);
      }
    });

    // Só manda pro login se, depois de um tempo razoável, ainda não há sessão
    // nem um "code" de OAuth pendente na URL (ou seja, é visita direta sem login).
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

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${P.pageBg}`}>
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-10 ${P.pageBg}`}>
      <div className="w-full max-w-md mx-auto">
        {bemVindo && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            Sua conta foi criada! Seu link já está ativo: pix.wiki/{company?.slug}
          </div>
        )}

        <h1 className={`text-lg font-bold mb-1 ${P.text}`}>{company?.name}</h1>
        <p className={`text-xs mb-6 ${P.textFaint}`}>pix.wiki/{company?.slug}</p>

        <div className={`rounded-2xl border p-5 mb-4 ${P.cardBg} ${P.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-1 ${P.textFaint}`}>Saldo disponível</p>
          <p className={`text-3xl font-bold ${P.text}`}>{fmt(balance?.available_balance_cents ?? 0)}</p>
          <p className={`text-xs mt-1 ${P.textMuted}`}>
            Total recebido: {fmt(balance?.total_received_cents ?? 0)}
          </p>
        </div>

        <div className={`rounded-2xl border p-5 ${P.cardBg} ${P.border}`}>
          <p className={`text-[10px] uppercase tracking-widest mb-3 ${P.textFaint}`}>Últimos recebimentos</p>
          {txns.length === 0 && (
            <p className={`text-sm ${P.textMuted}`}>Nenhum recebimento ainda.</p>
          )}
          <div className="flex flex-col divide-y divide-white/6">
            {txns.map(t => (
              <div key={t.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className={`text-sm ${P.text}`}>{t.description || 'Recebimento PIX'}</p>
                  <p className={`text-[11px] ${P.textFaint}`}>
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <p className="text-sm font-semibold text-green-400">{fmt(t.amount_cents)}</p>
              </div>
            ))}
          </div>
        </div>
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
