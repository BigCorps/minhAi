'use client';

// app/pix/conta/page.tsx — perfil simples do Pix Wiki: saldo + extrato PIX.
// Sem cartão/NFC/TEF — só o que existe no fluxo Pix Wiki.

import { useState, useEffect } from 'react';
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

export default function PixContaPage() {
  const supabase = createClient();
  const router = useRouter();
  const search = useSearchParams();
  const bemVindo = search.get('bemvindo') === '1';

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/pix/login'); return; }

      const { data: comp } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .eq('segment_key', 'pix_wiki')
        .maybeSingle();

      if (!comp) { router.replace('/pix'); return; }
      setCompany(comp);

      const [{ data: bal }, { data: tx }] = await Promise.all([
        supabase.from('company_balance')
          .select('available_balance_cents, total_received_cents')
          .eq('company_id', comp.id).maybeSingle(),
        supabase.from('balance_transactions')
          .select('id, amount_cents, transaction_type, description, created_at')
          .eq('company_id', comp.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setBalance(bal || { available_balance_cents: 0, total_received_cents: 0 });
      setTxns(tx || []);
      setLoading(false);
    })();
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