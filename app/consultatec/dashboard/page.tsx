'use client';

// app/consultatec/dashboard/page.tsx
// Base: app/pix/dashboard/page.tsx. Trocado: sem link de cobrança/saque (não
// existe aqui — quem consulta é o próprio usuário, não recebe de terceiros),
// sem toggle dark/light (ConsultaTec tem só o tema creme/preto), histórico é
// de CONSULTAS (tipo, custo, data) em vez de recebimentos PIX.

import { useState, useEffect, Suspense, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Wallet, LogOut, Search } from 'lucide-react';
import AdicionarSaldoModal from '@/components/consultatec/AdicionarSaldoModal';
import Footer from '@/components/consultatec/Footer';

const cor = {
  fundo: '#F2EAD3',
  fundoCard: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  tintaFaint: '#8A8168',
  destaque: '#2F4F3A',
  inputBg: '#EFE6CE',
};

interface HistoricoRow {
  id: string;
  tipo_consulta: string;
  custo: number; // já em reais (não centavos) — confirmado no schema
  status_pagamento: string;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  dados_cpf: 'Dados CPF',
  dados_cnpj: 'Dados CNPJ',
  restricoes_cpf: 'Restrições CPF',
  restricoes_cnpj: 'Restrições CNPJ',
  consultar_protestos: 'Protestos CPF',
  completa_cpf: 'Completa CPF',
};

interface DayGroup { key: string; label: string; total: number; items: HistoricoRow[]; }

function agruparPorDia(rows: HistoricoRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = d.toDateString();
    let group = byKey.get(key);
    if (!group) {
      const label = d
        .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        .toUpperCase()
        .replace(/\.?,/, ',');
      group = { key, label, total: 0, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(r);
    group.total += r.custo;
  }
  return groups;
}

// ── Card de propaganda da minhAi ───────────────────────────────────────────
function MinhaiPromoCard() {
  const utmUrl = 'https://minhai.app?utm_source=consultatec&utm_medium=dashboard&utm_campaign=brinde-minhai';

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}>
      <div className="flex items-center gap-2 mb-3">
        <Image src="/logo-circle.png" alt="minhAi" width={28} height={28} className="rounded-lg" />
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: cor.tintaFaint }}>
          Powered by minhAi
        </span>
      </div>
      <p className="text-sm font-bold mb-1.5" style={{ color: cor.tinta }}>
        O ConsultaTec roda em cima da minhAi
      </p>
      <p className="text-xs mb-4" style={{ color: cor.tintaMuted }}>
        A mesma tecnologia por trás dessa consulta também atende clientes por voz e WhatsApp,
        gera PIX na hora, agenda horários e tem mais de 100 outras funções — pra qualquer negócio.
      </p>
      <a
        href={utmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-70"
        style={{ color: cor.destaque }}
      >
        Conhecer todos os recursos da minhAi
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  );
}

function ConsultaTecDashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const search = useSearchParams();
  const bemVindo = search.get('bemvindo') === '1';

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saldoCents, setSaldoCents] = useState<number | null>(null);
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  const [saldoModalAberto, setSaldoModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (cid: string) => {
    const [{ data: bal }, { data: hist }] = await Promise.all([
      supabase.from('company_balance').select('available_balance_cents').eq('company_id', cid).maybeSingle(),
      supabase
        .from('historico_consultas')
        .select('id, tipo_consulta, custo, status_pagamento, created_at')
        .eq('company_id', cid)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setSaldoCents(bal?.available_balance_cents ?? 0);
    setHistorico(hist || []);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    const loadForUser = async (email: string | undefined) => {
      if (cancelled) return;
      setUserEmail(email ?? null);

      const { data: cid, error } = await supabase.rpc('ensure_my_consultatec_company');
      if (cancelled) return;

      if (error || !cid) {
        setErro('Não foi possível abrir sua conta. Tente sair e entrar novamente.');
        setLoading(false);
        return;
      }

      setCompanyId(cid);
      await carregar(cid);
      if (cancelled) return;
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !cancelled) loadForUser(data.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !cancelled) loadForUser(session.user.email);
    });

    const timeout = setTimeout(() => {
      if (cancelled) return;
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user && !cancelled) router.replace('/consultatec/login');
      });
    }, 2500);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/consultatec/login');
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  const fmtReais = (reais: number) => `R$ ${reais.toFixed(2).replace('.', ',')}`;

  const dayGroups = agruparPorDia(historico);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: cor.fundo }}>
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: cor.destaque, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: cor.fundo }}>
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/brands/consultatec/logo.png" alt="ConsultaTec" width={40} height={40} className="object-contain h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-serif text-base font-bold truncate" style={{ color: cor.tinta }}>ConsultaTec</h1>
              {userEmail && <p className="text-xs truncate" style={{ color: cor.tintaFaint }}>{userEmail}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push('/consultatec')}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: cor.destaque, color: cor.fundo }}
            >
              <Search className="w-3.5 h-3.5" />
              Nova consulta
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-opacity hover:opacity-70"
              style={{ borderColor: cor.borda, color: cor.tintaFaint }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        {bemVindo && (
          <div
            className="mb-4 px-4 py-3 rounded-xl border text-sm text-center"
            style={{ backgroundColor: cor.fundoCard, borderColor: cor.destaque, color: cor.destaque }}
          >
            Sua conta foi criada!
          </div>
        )}

        {erro && (
          <div className="mb-4 px-4 py-3 rounded-xl border text-sm text-center" style={{ backgroundColor: '#F4E4E0', borderColor: '#7A2E2E', color: '#7A2E2E' }}>
            {erro}
          </div>
        )}

        {/* Layout: 1 coluna no mobile, 2 no desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

          {/* ── Coluna principal: saldo + histórico ── */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* Saldo */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: cor.tintaFaint }}>
                    <Wallet className="w-3.5 h-3.5" />
                    Saldo disponível
                  </p>
                  <p className="text-3xl font-bold" style={{ color: cor.tinta }}>{fmt(saldoCents ?? 0)}</p>
                </div>
                <button
                  onClick={() => setSaldoModalAberto(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: cor.destaque, color: cor.fundo }}
                >
                  Adicionar saldo
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: cor.tintaMuted }}>
                Usado automaticamente nas próximas consultas — sem precisar pagar PIX de novo.
              </p>
            </div>

            {/* Histórico de consultas */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}>
              <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: cor.tintaFaint }}>
                Consultas realizadas {historico.length > 0 && `(${historico.length})`}
              </p>

              {historico.length === 0 ? (
                <p className="text-sm" style={{ color: cor.tintaMuted }}>Nenhuma consulta feita ainda.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {dayGroups.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b" style={{ borderColor: cor.borda }}>
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cor.tintaFaint }}>
                          {group.label}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: cor.tintaMuted }}>
                          Gasto: <span style={{ color: cor.destaque }}>{fmtReais(group.total)}</span>
                        </span>
                      </div>
                      <div className="flex flex-col">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: cor.borda }}>
                            <div className="min-w-0">
                              <p className="text-sm truncate" style={{ color: cor.tinta }}>
                                {TIPO_LABEL[item.tipo_consulta] || item.tipo_consulta}
                              </p>
                              <p className="text-xs" style={{ color: cor.tintaFaint }}>
                                {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: cor.tinta }}>
                              {fmtReais(item.custo)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Coluna lateral: propaganda minhAi ── */}
          <div className="flex flex-col gap-4 min-w-0">
            <MinhaiPromoCard />
          </div>
        </div>

        <Footer />
      </div>

      {saldoModalAberto && companyId && (
        <AdicionarSaldoModal
          companyId={companyId}
          onClose={() => setSaldoModalAberto(false)}
          onSuccess={(novoSaldo) => setSaldoCents(novoSaldo)}
        />
      )}
    </div>
  );
}

export default function ConsultaTecDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: cor.fundo }}>
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: cor.destaque, borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <ConsultaTecDashboardContent />
    </Suspense>
  );
}
