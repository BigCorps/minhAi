'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogIn, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { detectarTipoDocumento, documentoValido, formatarDocumento, TipoDocumento } from '@/lib/validateDocumento';
import ConsultaTecV2Modal from '@/components/consultatec/ConsultaTecV2Modal';
import Footer from '@/components/consultatec/Footer';
import PapelMoedaBackground from '@/components/consultatec/PapelMoedaBackground';
import type { ConsultaOpcao } from '@/types/consultatec';

const cor = {
  fundo: '#F2EAD3',
  fundoCard: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#7A6142',
  erroTexto: '#7A2E2E',
};

const OPCOES_CPF: ConsultaOpcao[] = [
  {
    acao: 'dados_cpf',
    tipo: 'cpf',
    titulo: 'Dados',
    descricao: 'Nome, filiação, nascimento e situação cadastral',
    precoCents: 300,
  },
  {
    acao: 'restricoes_cpf',
    tipo: 'cpf',
    titulo: 'Restrições',
    descricao: 'Pendências financeiras, restrições e indicadores de risco',
    precoCents: 1500,
  },
  {
    acao: 'consultar_protestos',
    tipo: 'cpf',
    titulo: 'Protestos',
    descricao: 'Protestos em cartório e pendências identificadas na consulta',
    precoCents: 1000,
  },
  {
    acao: 'completa_cpf',
    tipo: 'cpf',
    titulo: 'Completa',
    descricao: 'Dados + Restrições + Protestos em uma única consulta',
    precoCents: 2800,
  },
];

const OPCOES_CNPJ: ConsultaOpcao[] = [
  {
    acao: 'dados_cnpj',
    tipo: 'cnpj',
    titulo: 'Dados',
    descricao: 'Cadastro, CNAEs, capital, quadro societário, endereço e contatos',
    precoCents: 300,
  },
  {
    acao: 'restricoes_cnpj',
    tipo: 'cnpj',
    titulo: 'Restrições',
    descricao: 'Pendências, protestos agregados, restrições e indicadores de risco',
    precoCents: 2000,
  },
  {
    acao: 'completa_cnpj',
    tipo: 'cnpj',
    titulo: 'Completa',
    descricao: 'Cadastro enriquecido + QSA + score ou faixa de risco + restrições e protestos',
    precoCents: 2300,
  },
];

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const GUEST_COMPANY_ID = process.env.NEXT_PUBLIC_CONSULTATEC_GUEST_COMPANY_ID || '';

export default function ConsultaTecPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [documento, setDocumento] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>(null);
  const [documentoLimpo, setDocumentoLimpo] = useState('');
  const [documentoOk, setDocumentoOk] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saldoCents, setSaldoCents] = useState<number | null>(null);
  const [opcaoAtiva, setOpcaoAtiva] = useState<ConsultaOpcao | null>(null);
  const [modalCompanyId, setModalCompanyId] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);

  const handleDocumentoChange = (valor: string) => {
    const formatado = formatarDocumento(valor);
    const limpo = formatado.replace(/\D/g, '');
    setDocumento(formatado);
    setDocumentoLimpo(limpo);
    setTipo(detectarTipoDocumento(limpo));
    setDocumentoOk(documentoValido(limpo));
  };

  const refreshSaldo = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_shared_minai_balance');
    if (error) {
      setSaldoCents(0);
      return;
    }
    setSaldoCents(Number(data?.available_balance_cents ?? 0));
  }, [supabase]);

  const garantirCompanyId = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;

    // A company separa histórico/configurações do ConsultaTec; o saldo é compartilhado
    // entre os aplicativos que usam a carteira minhAi.
    const { data, error } = await supabase.rpc('ensure_my_consultatec_company_v2');
    if (error || !data) {
      setErroAcesso('Não foi possível abrir sua conta ConsultaTec. Tente sair e entrar novamente.');
      return null;
    }

    setCompanyId(data);
    await refreshSaldo();
    return data;
  }, [companyId, refreshSaldo, supabase]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setCompanyId(null);
        setSaldoCents(null);
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (userId) garantirCompanyId();
  }, [userId, garantirCompanyId]);

  const handleAbrirOpcao = async (opcao: ConsultaOpcao) => {
    setErroAcesso(null);
    if (!documentoOk) return;

    let cid: string | null = null;
    if (userId) {
      cid = await garantirCompanyId();
    } else {
      cid = GUEST_COMPANY_ID || null;
      if (!cid) {
        setErroAcesso('Configuração de consulta avulsa ausente. Entre na sua conta para continuar.');
        return;
      }
    }

    if (!cid) return;
    setModalCompanyId(cid);
    setOpcaoAtiva(opcao);
  };

  const fecharModal = () => {
    setOpcaoAtiva(null);
    setModalCompanyId(null);
    if (userId) refreshSaldo();
  };

  const opcoes = tipo === 'cpf' ? OPCOES_CPF : tipo === 'cnpj' ? OPCOES_CNPJ : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ color: cor.tinta }}>
      <PapelMoedaBackground />

      <header className="border-b" style={{ borderColor: cor.borda }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Image src="/brands/consultatec/logo.png" alt="ConsultaTec" width={32} height={32} className="flex-shrink-0" />
            <span className="font-serif text-xl font-bold tracking-tight truncate">ConsultaTec</span>
          </div>

          {!userId ? (
            <button
              onClick={() => router.push('/consultatec/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: cor.destaque, color: cor.fundo }}
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
          ) : (
            <button
              onClick={() => router.push('/consultatec/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border flex-shrink-0"
              style={{ borderColor: cor.borda, color: cor.tinta }}
            >
              <Wallet className="w-4 h-4" />
              {saldoCents === null ? '...' : formatBRL(saldoCents)}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-3xl text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Consulte CPF ou CNPJ</h1>
          <p className="text-sm sm:text-base" style={{ color: cor.tintaMuted }}>
            Digite o documento e escolha os dados que deseja consultar.
          </p>
        </div>

        <div className="w-full max-w-md mt-9">
          <input
            type="text"
            value={documento}
            onChange={(e) => handleDocumentoChange(e.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            className="w-full px-2 sm:px-5 py-4 rounded-xl border text-xs sm:text-lg text-center sm:tracking-wide font-mono bg-transparent focus:outline-none focus:ring-2"
            style={{ borderColor: cor.borda, color: cor.tinta }}
            autoFocus
          />

          {documentoLimpo.length >= 11 && !documentoOk && (
            <p className="text-center text-sm mt-2" style={{ color: cor.erroTexto }}>
              {tipo === 'cpf' ? 'CPF inválido' : tipo === 'cnpj' ? 'CNPJ inválido' : 'Documento inválido'}
            </p>
          )}
          {erroAcesso && <p className="text-center text-sm mt-2" style={{ color: cor.erroTexto }}>{erroAcesso}</p>}
        </div>

        {documentoOk && (
          <>
            <div className={`w-full mt-10 grid grid-cols-1 gap-4 ${tipo === 'cnpj' ? 'max-w-4xl sm:grid-cols-3' : 'max-w-2xl sm:grid-cols-2'}`}>
              {opcoes.map((opcao) => (
                <button
                  key={opcao.acao}
                  onClick={() => handleAbrirOpcao(opcao)}
                  className="text-left p-5 rounded-xl border transition hover:shadow-md"
                  style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="font-serif font-bold text-lg">{opcao.titulo}</span>
                    <span className="font-mono font-semibold whitespace-nowrap" style={{ color: cor.destaque }}>
                      {formatBRL(opcao.precoCents)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: cor.tintaMuted }}>{opcao.descricao}</p>
                </button>
              ))}
            </div>

            {!userId && (
              <p className="text-center text-sm mt-6" style={{ color: cor.tintaMuted }}>
                Pague na hora com PIX, sem cadastro. Quer manter saldo para as próximas?{' '}
                <button onClick={() => router.push('/consultatec/login')} className="underline font-medium" style={{ color: cor.destaque }}>
                  Entrar
                </button>
              </p>
            )}
          </>
        )}

        {saldoCents !== null && (
          <p className="text-center text-xs mt-14" style={{ color: cor.tintaMuted }}>
            Já tem saldo?{' '}
            <button onClick={() => router.push('/consultatec/dashboard')} className="underline font-medium" style={{ color: cor.destaque }}>
              Veja seu histórico e saldo
            </button>
          </p>
        )}
      </main>

      <Footer />

      {opcaoAtiva && modalCompanyId && (
        <ConsultaTecV2Modal
          companyId={modalCompanyId}
          documento={documentoLimpo}
          action={opcaoAtiva.acao}
          titulo={`${opcaoAtiva.titulo} — ${opcaoAtiva.tipo.toUpperCase()}`}
          descricao={opcaoAtiva.descricao}
          precoCents={opcaoAtiva.precoCents}
          onClose={fecharModal}
          onSuccess={() => userId && refreshSaldo()}
        />
      )}
    </div>
  );
}
