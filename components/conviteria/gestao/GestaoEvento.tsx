'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, LayoutGrid, Loader2, MessageCircle, QrCode, Shirt, Sparkles, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { ConviteConfig } from '@/lib/conviteria/tipos';
import DetalhesPainel from './DetalhesPainel';
import ConvidadosPainel from './ConvidadosPainel';
import PadrinhosPainel from './PadrinhosPainel';
import MesasPainel from './MesasPainel';
import CheckinPainel from './CheckinPainel';
import PapelariaPainel from './PapelariaPainel';
import WhatsAppPainel from './WhatsAppPainel';
import estilos from './gestao-light.module.css';

type Aba = 'detalhes' | 'convidados' | 'whatsapp' | 'padrinhos' | 'mesas' | 'checkin' | 'papelaria';
const ABAS: Array<{ id: Aba; nome: string; Icon: typeof Users }> = [
  { id: 'detalhes', nome: 'Detalhes', Icon: CalendarClock },
  { id: 'convidados', nome: 'Convidados', Icon: Users },
  { id: 'whatsapp', nome: 'WhatsApp', Icon: MessageCircle },
  { id: 'padrinhos', nome: 'Padrinhos', Icon: Shirt },
  { id: 'mesas', nome: 'Mesas', Icon: LayoutGrid },
  { id: 'checkin', nome: 'Check-in', Icon: QrCode },
  { id: 'papelaria', nome: 'Papelaria', Icon: Sparkles },
];

const MARGEM_RENOVACAO_MS = 5 * 60 * 1000;
const INTERVALO_CONFERENCIA_MS = 5 * 60 * 1000;

export default function GestaoEvento({ eventoId }: { eventoId: string }) {
  const [aba, setAba] = useState<Aba>('detalhes');
  const [token, setToken] = useState('');
  const [cfg, setCfg] = useState<ConviteConfig | null>(null);
  const [slug, setSlug] = useState('');
  const [gestao, setGestao] = useState<{ rsvpRestrito: boolean; qrModo: 'familia' | 'individual' }>({ rsvpRestrito: false, qrModo: 'familia' });
  const [erro, setErro] = useState('');
  const [supabase] = useState(() => createClient());

  /**
   * Mantém o Bearer usado pelas abas sempre sincronizado com a sessão real do
   * Supabase. Antes, a Gestão guardava o access_token obtido ao abrir a página
   * e continuava usando esse mesmo valor mesmo depois de ele expirar (~1h).
   */
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

    // Se a sessão virou exatamente entre a leitura e a chamada, renova e
    // repete uma única vez. Evita mandar o usuário de volta ao login por um
    // token velho enquanto a sessão continua válida no navegador.
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

    // O browser client renova a sessão automaticamente. Este listener mantém
    // o token passado às abas atualizado toda vez que isso acontecer.
    const { data: authListener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (sessao?.access_token) {
        setToken(sessao.access_token);
        return;
      }
      if (evento === 'SIGNED_OUT') window.location.href = '/convite/entrar';
    });

    // Safari/iOS e notebooks podem suspender timers quando a aba fica em
    // segundo plano. Ao voltar para a página, conferimos/renovamos antes que a
    // sessão antiga seja usada novamente.
    const conferirSessao = () => {
      if (document.visibilityState === 'visible') void obterTokenAtual(false);
    };
    const aoFocar = () => void obterTokenAtual(false);
    const aoVoltarDoCache = () => void obterTokenAtual(false);

    document.addEventListener('visibilitychange', conferirSessao);
    window.addEventListener('focus', aoFocar);
    window.addEventListener('pageshow', aoVoltarDoCache);

    // Enquanto a página estiver aberta, verifica periodicamente e só renova
    // quando faltar menos de cinco minutos para o vencimento.
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

  if (erro) return <div className="mx-auto max-w-3xl p-6 text-center text-red-600">{erro}</div>;
  if (!token || !cfg) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#c06078]" /></div>;

  return (
    <main className={`${estilos.root} min-h-screen bg-[#fff9fb] px-4 py-6 text-[#40232c]`}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-3"><div><Link href="/convite/painel" className="inline-flex items-center gap-1 text-sm text-[#7c5560]"><ArrowLeft className="h-4 w-4" />Meus convites</Link><h1 className="mt-2 text-2xl font-semibold">Gestão do Evento</h1><p className="text-sm text-[#7c5560]">{cfg.anfitrioes.exibicao} · {slug}.conviteia.com</p></div><a href={`https://${slug}.conviteia.com`} target="_blank" rel="noreferrer" className="rounded-xl border border-[#c0607844] bg-white px-4 py-2 text-sm font-semibold text-[#a04a63]">Ver convite</a></header>
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-2">{ABAS.map(({ id, nome, Icon }) => <button key={id} type="button" onClick={() => setAba(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${aba === id ? 'bg-[#c06078] text-white' : 'border border-[#c0607833] bg-white text-[#7c5560]'}`}><Icon className="h-4 w-4" />{nome}</button>)}</nav>
        {aba === 'detalhes' && <DetalhesPainel eventoId={eventoId} token={token} cfg={cfg} gestao={gestao} aoSalvar={(novoCfg, novaGestao) => { setCfg(novoCfg); setGestao(novaGestao); }} />}
        {aba === 'convidados' && <ConvidadosPainel eventoId={eventoId} token={token} slug={slug} qrModo={gestao.qrModo} />}
        {aba === 'whatsapp' && <WhatsAppPainel eventoId={eventoId} token={token} slug={slug} />}
        {aba === 'padrinhos' && <PadrinhosPainel eventoId={eventoId} token={token} slug={slug} />}
        {aba === 'mesas' && <MesasPainel eventoId={eventoId} token={token} />}
        {aba === 'checkin' && <CheckinPainel eventoId={eventoId} token={token} />}
        {aba === 'papelaria' && <PapelariaPainel cfg={cfg} slug={slug} />}
      </div>
    </main>
  );
}
