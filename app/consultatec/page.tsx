'use client';

// app/consultatec/page.tsx
//
// Os 5 modais de consulta são versões próprias do ConsultaTec (tema creme/preto,
// sem hooks de voz/Google) em components/consultatec/ — não são os modais
// compartilhados da minhAi. Lógica de chamada ao backend é idêntica.
//
// Login: OPCIONAL. Sem login, cada consulta gera um PIX avulso na "empresa"
// compartilhada consultatec-avulso (consultas_payment_method='pix', então
// NUNCA tenta descontar saldo — sempre pede PIX). Logado, usa a company
// pessoal (ensure_my_consultatec_company) e pode pagar com saldo salvo.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Wallet, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatarDocumento, detectarTipoDocumento, documentoValido, TipoDocumento } from '@/lib/validateDocumento';

import ConsultarCpfModal from '@/components/consultatec/ConsultarCpfModal';
import ConsultarCnpjModal from '@/components/consultatec/ConsultarCnpjModal';
import RestricoesCpfModal from '@/components/consultatec/RestricoesCpfModal';
import RestricoesCnpjModal from '@/components/consultatec/RestricoesCnpjModal';
import ConsultarProtestosModal from '@/components/consultatec/ConsultarProtestosModal';
import CompletaCpfModal from '@/components/consultatec/CompletaCpfModal';
import Footer from '@/components/consultatec/Footer';

// ── paleta "papel moeda" ──────────────────────────────────────────────────
const cor = {
  fundo: '#F2EAD3',
  fundoCard: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#2F4F3A',
  destaqueHover: '#25402E',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

type ModalAtivo = 'dados' | 'restricoes' | 'protestos' | 'completa' | null;

interface Opcao {
  acao: string;
  modal: Exclude<ModalAtivo, null>;
  titulo: string;
  descricao: string;
  precoCents: number;
}

const OPCOES_CPF: Opcao[] = [
  { acao: 'dados_cpf', modal: 'dados', titulo: 'Dados', descricao: 'Nome, filiação, nascimento e situação cadastral', precoCents: 300 },
  { acao: 'restricoes_cpf', modal: 'restricoes', titulo: 'Restrições', descricao: 'Score e pendências financeiras (Quod)', precoCents: 1500 },
  { acao: 'consultar_protestos', modal: 'protestos', titulo: 'Protestos', descricao: 'Protestos em cartório e pendências tributárias', precoCents: 1000 },
  { acao: 'completa_cpf', modal: 'completa', titulo: 'Completa', descricao: 'Dados + Restrições + Protestos', precoCents: 2800 },
];

const OPCOES_CNPJ: Opcao[] = [
  { acao: 'dados_cnpj', modal: 'dados', titulo: 'Dados', descricao: 'Razão social, CNAE, capital, sócios e situação', precoCents: 300 },
  { acao: 'restricoes_cnpj', modal: 'restricoes', titulo: 'Restrições', descricao: 'Score empresarial e protestos (Quod)', precoCents: 2000 },
];

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

// Empresa fixa e sem dono, criada via migration, com consultas_payment_method='pix'.
// Usada só por quem não está logado — nunca tenta descontar saldo, sempre pede PIX.
const GUEST_COMPANY_ID = process.env.NEXT_PUBLIC_CONSULTATEC_GUEST_COMPANY_ID!;

export default function ConsultaTecPage() {
  const router = useRouter();
  const supabase = createClient();

  const [documento, setDocumento] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>(null);
  const [documentoLimpo, setDocumentoLimpo] = useState('');
  const [documentoOk, setDocumentoOk] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saldoCents, setSaldoCents] = useState<number | null>(null);

  const [modalAtivo, setModalAtivo] = useState<ModalAtivo>(null);
  const [modalCompanyId, setModalCompanyId] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setCompanyId(null);
        setSaldoCents(null);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── documento ─────────────────────────────────────────────────────────
  const handleDocumentoChange = (valor: string) => {
    const formatado = formatarDocumento(valor);
    setDocumento(formatado);
    const limpo = formatado.replace(/\D/g, '');
    setDocumentoLimpo(limpo);
    setTipo(detectarTipoDocumento(limpo));
    setDocumentoOk(documentoValido(limpo));
  };

  // ── saldo ─────────────────────────────────────────────────────────────
  const refreshSaldo = useCallback(async (cid: string) => {
    const { data: balance } = await supabase.from('company_balance').select('available_balance_cents').eq('company_id', cid).maybeSingle();
    setSaldoCents(balance?.available_balance_cents ?? 0);
  }, [supabase]);

  const garantirCompanyId = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;
    const { data, error } = await supabase.rpc('ensure_my_consultatec_company');
    if (error || !data) {
      setErroAcesso('Não foi possível abrir sua conta. Tente sair e entrar novamente.');
      return null;
    }
    setCompanyId(data);
    refreshSaldo(data);
    return data;
  }, [companyId, supabase, refreshSaldo]);

  useEffect(() => {
    if (userId) garantirCompanyId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── abrir consulta ────────────────────────────────────────────────────
  const handleAbrirOpcao = async (opcao: Opcao) => {
    setErroAcesso(null);
    if (!documentoOk) return;

    if (userId) {
      const cid = await garantirCompanyId();
      if (!cid) return;
      setModalCompanyId(cid);
    } else {
      setModalCompanyId(GUEST_COMPANY_ID);
    }

    setModalAtivo(opcao.modal);
  };

  const handleFecharModal = () => {
    setModalAtivo(null);
    // Só atualiza saldo se o modal fechado era da company pessoal —
    // consulta avulsa (guest) não tem saldo pra atualizar.
    if (companyId && modalCompanyId === companyId) {
      refreshSaldo(companyId);
    }
    setModalCompanyId(null);
  };

  const opcoes = tipo === 'cpf' ? OPCOES_CPF : tipo === 'cnpj' ? OPCOES_CNPJ : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cor.fundo, color: cor.tinta }}>
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: cor.borda }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Ajustar caminho do logo depois de subir os assets em public/brands/consultatec/ */}
            <Image src="/brands/consultatec/logo.png" alt="ConsultaTec" width={32} height={32} />
            <span className="font-serif text-xl font-bold tracking-tight">ConsultaTec</span>
          </div>

          <div className="relative">
            {!userId ? (
              <button
                onClick={() => router.push('/consultatec/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </button>
            ) : (
              <button
                onClick={() => router.push('/consultatec/dashboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
                style={{ borderColor: cor.borda, color: cor.tinta }}
              >
                <Wallet className="w-4 h-4" />
                {saldoCents === null ? '...' : formatBRL(saldoCents)}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Conteúdo central ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-16">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-2">
          Consulte CPF ou CNPJ
        </h1>
        <p className="text-center mb-10" style={{ color: cor.tintaMuted }}>
          Digite o documento — identificamos o tipo automaticamente
        </p>

        <div className="w-full max-w-md">
          <input
            type="text"
            value={documento}
            onChange={(e) => handleDocumentoChange(e.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            className="w-full px-5 py-4 rounded-xl border text-lg text-center tracking-wide font-mono bg-transparent focus:outline-none focus:ring-2"
            style={{ borderColor: cor.borda, color: cor.tinta }}
            autoFocus
          />

          {documentoLimpo.length > 0 && !documentoOk && documentoLimpo.length >= 11 && (
            <p className="text-center text-sm mt-2" style={{ color: cor.erroTexto }}>
              {tipo === 'cpf' ? 'CPF inválido' : tipo === 'cnpj' ? 'CNPJ inválido' : 'Documento inválido'}
            </p>
          )}

          {erroAcesso && (
            <p className="text-center text-sm mt-2" style={{ color: cor.erroTexto }}>{erroAcesso}</p>
          )}
        </div>

        {/* ── Cards de opção ── */}
        {documentoOk && (
          <>
            <div className="w-full max-w-2xl mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {opcoes.map((opcao) => (
                <button
                  key={opcao.acao}
                  onClick={() => handleAbrirOpcao(opcao)}
                  className="text-left p-5 rounded-xl border transition hover:shadow-md"
                  style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-serif font-bold text-lg">{opcao.titulo}</span>
                    <span className="font-mono font-semibold" style={{ color: cor.destaque }}>
                      {formatBRL(opcao.precoCents)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: cor.tintaMuted }}>{opcao.descricao}</p>
                </button>
              ))}
            </div>

            {!userId && (
              <p className="text-center text-sm mt-6" style={{ color: cor.tintaMuted }}>
                Pague na hora com PIX, sem cadastro. Quer guardar saldo pra próxima?{' '}
                <button onClick={() => router.push('/consultatec/login')} className="underline font-medium" style={{ color: cor.destaque }}>
                  Entrar
                </button>
              </p>
            )}
          </>
        )}
        {saldoCents !== null && (
          <p className="text-center text-xs mt-16" style={{ color: cor.tintaMuted }}>
            Já tem saldo? <button onClick={() => router.push('/consultatec/dashboard')} className="underline font-medium" style={{ color: cor.destaque }}>Veja seu histórico e saldo</button>
          </p>
        )}

        <Footer />
      </main>

      {/* ── Modais ── */}
      {modalAtivo && modalCompanyId && tipo === 'cpf' && (
        <>
          {modalAtivo === 'dados' && (
            <ConsultarCpfModal data={{ companyId: modalCompanyId, cpfPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
          {modalAtivo === 'restricoes' && (
            <RestricoesCpfModal data={{ companyId: modalCompanyId, cpfPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
          {modalAtivo === 'protestos' && (
            <ConsultarProtestosModal data={{ companyId: modalCompanyId, cpfPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
          {modalAtivo === 'completa' && (
            <CompletaCpfModal data={{ companyId: modalCompanyId, cpfPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
        </>
      )}

      {modalAtivo && modalCompanyId && tipo === 'cnpj' && (
        <>
          {modalAtivo === 'dados' && (
            <ConsultarCnpjModal data={{ companyId: modalCompanyId, cnpjPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
          {modalAtivo === 'restricoes' && (
            <RestricoesCnpjModal data={{ companyId: modalCompanyId, cnpjPrefill: documentoLimpo }} onClose={handleFecharModal} />
          )}
        </>
      )}
    </div>
  );
}
