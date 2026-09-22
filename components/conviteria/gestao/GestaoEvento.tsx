'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Images,
  LayoutGrid,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Pencil,
  QrCode,
  Settings2,
  Shirt,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { ConviteConfig } from '@/lib/conviteria/tipos';
import GoogleConvitePainel from '@/components/conviteria/GoogleConvitePainel';
import PagamentosPresentesPainel from '@/components/conviteria/PagamentosPresentesPainel';
import PresencasPainel from '@/components/conviteria/PresencasPainel';
import RecadosPainel from '@/components/conviteria/RecadosPainel';
import SaldoSaque from '@/components/conviteria/SaldoSaque';
import MemoriasPainel from '@/components/conviteria/memorias/MemoriasPainel';
import DetalhesPainel from './DetalhesPainel';
import ConvidadosPainel from './ConvidadosPainel';
import PadrinhosPainel from './PadrinhosPainel';
import MesasPainel from './MesasPainel';
import CheckinPainel from './CheckinPainel';
import PapelariaPainel, { type CategoriaPapelaria } from './PapelariaPainel';
import WhatsAppPainel from './WhatsAppPainel';
import estilos from './gestao-light.module.css';

type Aba =
  | 'convidados'
  | 'memorias'
  | 'comunicacoes'
  | 'financeiro'
  | 'padrinhos'
  | 'mesas'
  | 'checkin'
  | 'papelaria'
  | 'recados'
  | 'configuracoes';

const ABAS: Array<{ id: Aba; nome: string; Icon: typeof Users }> = [
  { id: 'convidados', nome: 'Convidados', Icon: Users },
  { id: 'memorias', nome: 'Memórias', Icon: Images },
  { id: 'comunicacoes', nome: 'Comunicações', Icon: MessageCircle },
  { id: 'financeiro', nome: 'Financeiro', Icon: WalletCards },
  { id: 'padrinhos', nome: 'Padrinhos', Icon: Shirt },
  { id: 'mesas', nome: 'Mesas', Icon: LayoutGrid },
  { id: 'checkin', nome: 'Check-in', Icon: QrCode },
  { id: 'papelaria', nome: 'Papelaria', Icon: Sparkles },
  { id: 'recados', nome: 'Recados', Icon: MessageSquareText },
  { id: 'configuracoes', nome: 'Configurações', Icon: Settings2 },
];

const MARGEM_RENOVACAO_MS = 5 * 60 * 1000;
const INTERVALO_CONFERENCIA_MS = 5 * 60 * 1000;

export default function GestaoEvento({ eventoId }: { eventoId: string }) {
  const [aba, setAba] = useState<Aba>('convidados');
  const [papelariaCategoria, setPapelariaCategoria] = useState<CategoriaPapelaria>('evento');
  const [token, setToken] = useState('');
  const [cfg, setCfg] = useState<ConviteConfig | null>(null);
  const [slug, setSlug] = useState('');
  const [gestao, setGestao] = useState<{ rsvpRestrito: boolean; qrModo: 'familia' | 'individual' }>({ rsvpRestrito: false, qrModo: 'familia' });
  const [erro, setErro] = useState('');
  const [supabase] = useState(() => createClient());

  const obterTokenAtual = useCallback(async (forcarRenovacao = false) => {
    const { data: atual } = await supabase.auth.getSession();
    let sessao = atual.session;

    const expiraEmMs = (sessao?.expires_at ?? 0) * 1000;
    const pertoDeExpirar = !sessao || expiraEmMs <= Date.now() + MARGEM_RENOVACAO_MS;

    if (forcarRenovacao || pertoDeExpirar) {
      const { data: renovada, error } = await supabase.auth.refreshSession();
      if (!error && renovada.session) sessao = renovada.session;
    }

    const atualToken = sessao?.access_token;
    if (!atualToken) {
      window.location.href = '/convite/entrar';
      return null;
    }

    setToken(atualToken);
    return atualToken;
  }, [supabase]);

  const carregarGestao = useCallback(async () => {
    setErro('');
    let t = await obterTokenAtual(false);
    if (!t) return;

    const requisitar = (accessToken: string) =>
      fetch(`/api/conviteria/gestao?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

    let r = await requisitar(t);
    if (r.status === 401) {
      const renovado = await obterTokenAtual(true);
      if (!renovado) return;
      t = renovado;
      r = await requisitar(t);
    }

    const d = await r.json().catch(() => null);
    if (!r.ok) {
      setErro(d?.erro || 'Não foi possível carregar a gestão.');
      return;
    }

    setCfg(d.evento.config);
    setSlug(d.evento.slug);
    setGestao(d.gestao);
  }, [eventoId, obterTokenAtual]);

  useEffect(() => {
    void carregarGestao();

    const { data: authListener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (sessao?.access_token) {
        setToken(sessao.access_token);
        return;
      }
      if (evento === 'SIGNED_OUT') window.location.href = '/convite/entrar';
    });

    const conferirSessao = () => {
      if (document.visibilityState === 'visible') void obterTokenAtual(false);
    };
    const aoFocar = () => void obterTokenAtual(false);
    const aoVoltarDoCache = () => void obterTokenAtual(false);

    document.addEventListener('visibilitychange', conferirSessao);
    window.addEventListener('focus', aoFocar);
    window.addEventListener('pageshow', aoVoltarDoCache);

    const intervalo = window.setInterval(
      () => void obterTokenAtual(false),
      INTERVALO_CONFERENCIA_MS,
    );

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', conferirSessao);
      window.removeEventListener('focus', aoFocar);
      window.removeEventListener('pageshow', aoVoltarDoCache);
      window.clearInterval(intervalo);
    };
  }, [carregarGestao, obterTokenAtual, supabase]);

  function abrirPapelaria(categoria: CategoriaPapelaria) {
    setPapelariaCategoria(categoria);
    setAba('papelaria');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (erro) return <div className="mx-auto max-w-3xl p-6 text-center text-red-600">{erro}</div>;
  if (!token || !cfg) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#c06078]" /></div>;

  return (
    <main className={`${estilos.root} min-h-screen bg-[#fff9fb] px-4 py-6 text-[#40232c]`}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/convite/painel" className="inline-flex items-center gap-1 text-sm text-[#7c5560]"><ArrowLeft className="h-4 w-4" />Meus convites</Link>
            <h1 className="mt-2 text-2xl font-semibold">Gestão do Evento</h1>
            <p className="truncate text-sm text-[#7c5560]">{cfg.anfitrioes.exibicao} · {slug}.conviteia.com</p>
            <p className="mt-1 text-xs text-[#9b7b84]">Tudo que acontece depois da publicação fica organizado aqui.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/convite/editar/${eventoId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0607844] bg-white px-4 py-2 text-sm font-semibold text-[#7c5560]"><Pencil className="h-4 w-4" />Editar convite</Link>
            <a href={`https://${slug}.conviteia.com`} target="_blank" rel="noreferrer" className="rounded-xl border border-[#c0607844] bg-white px-4 py-2 text-sm font-semibold text-[#a04a63]">Ver convite</a>
          </div>
        </header>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {ABAS.map(({ id, nome, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { if (id === 'papelaria') setPapelariaCategoria('evento'); setAba(id); }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${aba === id ? 'bg-[#c06078] text-white' : 'border border-[#c0607833] bg-white text-[#7c5560]'}`}
            >
              <Icon className="h-4 w-4" />{nome}
            </button>
          ))}
        </nav>

        {aba === 'convidados' && (
          <section className="space-y-5">
            <ConvidadosPainel eventoId={eventoId} token={token} slug={slug} qrModo={gestao.qrModo} />
            <PresencasPainel eventoId={eventoId} mostrarGoogle={false} />
          </section>
        )}

        {aba === 'memorias' && (
          <MemoriasPainel
            eventoId={eventoId}
            slug={slug}
            titulo={cfg.anfitrioes.exibicao}
            sempreAberto
            onAbrirPapelaria={() => abrirPapelaria('memorias')}
          />
        )}

        {aba === 'comunicacoes' && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
              <h2 className="font-semibold">Comunicações com convidados</h2>
              <p className="mt-1 text-sm text-[#7c5560]">WhatsApp oficial, envio manual, Gmail e lembretes ficam juntos aqui para evitar canais duplicados em outras telas.</p>
            </div>
            <WhatsAppPainel eventoId={eventoId} token={token} slug={slug} />
            <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
              <h3 className="font-semibold">E-mail e Google</h3>
              <p className="mt-1 mb-3 text-sm text-[#7c5560]">Conecte o Gmail deste convite e escolha os lembretes automáticos por e-mail.</p>
              <GoogleConvitePainel eventoId={eventoId} />
            </div>
          </section>
        )}

        {aba === 'financeiro' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
              <h2 className="font-semibold">Presentes e recebimentos</h2>
              <p className="mt-1 text-sm text-[#7c5560]">Pagamentos dos presentes, saldo disponível e solicitações de saque ficam concentrados nesta área.</p>
            </div>
            <PagamentosPresentesPainel eventoId={eventoId} sempreAberto />
            <SaldoSaque eventoId={eventoId} sempreAberto />
          </section>
        )}

        {aba === 'padrinhos' && <PadrinhosPainel eventoId={eventoId} token={token} slug={slug} />}
        {aba === 'mesas' && <MesasPainel eventoId={eventoId} token={token} />}
        {aba === 'checkin' && <CheckinPainel eventoId={eventoId} token={token} />}
        {aba === 'papelaria' && <PapelariaPainel cfg={cfg} slug={slug} eventoId={eventoId} token={token} qrModo={gestao.qrModo} categoriaInicial={papelariaCategoria} />}
        {aba === 'recados' && <RecadosPainel eventoId={eventoId} sempreAberto />}
        {aba === 'configuracoes' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
              <h2 className="font-semibold">Configurações operacionais</h2>
              <p className="mt-1 text-sm text-[#7c5560]">Ajustes de RSVP, QR e informações complementares do evento. Para aparência, fotos, textos e seções do convite, use “Editar convite” no topo.</p>
            </div>
            <DetalhesPainel eventoId={eventoId} token={token} cfg={cfg} gestao={gestao} aoSalvar={(novoCfg, novaGestao) => { setCfg(novoCfg); setGestao(novaGestao); }} />
          </section>
        )}
      </div>
    </main>
  );
}
