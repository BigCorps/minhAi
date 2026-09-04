'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import RendaBackground from '@/components/conviteria/RendaBackground';
import {
  AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Images, Loader2,
  MonitorPlay, QrCode, Video,
} from 'lucide-react';
import { MARCA } from '@/lib/conviteria/marca';

const cor = {
  fora: '#ffffff', papel: '#fdf0f3', acento: '#c06078', acentoTexto: '#a04a63',
  tinta: '#40232c', tintaSuave: '#7c5560', blocoTexto: '#fff5f8',
  erroBg: '#f7e2e6', erroTexto: '#8c2f43',
};

type Passo = 'carregando' | 'oferta' | 'gerando' | 'pix' | 'conferindo' | 'sucesso';
type Info = {
  eventoId: string;
  slug: string;
  url: string;
  publicado: boolean;
  origemPlano: 'avulso' | 'mensal';
  conviteCentavos: number;
  pixConvitePendente: boolean;
  memorias: { precoCentavos: number; status: string; ativas: boolean; expiraEm: string | null };
};
type Cobranca = {
  valorCentavos: number;
  conviteCentavos: number;
  memoriasCentavos: number;
  incluiMemorias: boolean;
  qrcode: string;
  copiaECola: string;
};

function brl(c: number) {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PagarConteudo() {
  const params = useSearchParams();
  const eventoId = params.get('evento');
  const querMemoriasPorUrl = params.get('memorias') === '1';
  const [supabase] = useState(() => createClient());
  const [passo, setPasso] = useState<Passo>('carregando');
  const [info, setInfo] = useState<Info | null>(null);
  const [incluirMemorias, setIncluirMemorias] = useState(querMemoriasPorUrl);
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [urlConvite, setUrlConvite] = useState<string | null>(null);
  const emVoo = useRef(false);

  const autorizacao = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const carregarInfo = useCallback(async () => {
    if (!eventoId) throw new Error('Convite não informado.');
    const acesso = await autorizacao();
    if (!acesso) throw new Error('Faça login para continuar.');
    const r = await fetch(`/api/conviteria/memorias/checkout-info?eventoId=${encodeURIComponent(eventoId)}`, {
      headers: { Authorization: `Bearer ${acesso}` }, cache: 'no-store',
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.erro ?? 'Não foi possível carregar o pagamento.');
    setInfo(j);
    // Uma cobrança de Memórias já iniciada não pode ser silenciosamente
    // trocada por outra combinação ao recarregar a página.
    if (j.memorias?.status === 'aguardando_pagamento') setIncluirMemorias(true);
    else if (j.pixConvitePendente) setIncluirMemorias(false);
    else if (querMemoriasPorUrl) setIncluirMemorias(true);
    return j as Info;
  }, [autorizacao, eventoId, querMemoriasPorUrl]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const i = await carregarInfo();
        if (cancelado) return;
        // Se entrou pelo painel para comprar o add-on, ou veio da criação, a
        // oferta aparece antes de qualquer PIX ser criado.
        if (i.publicado && i.memorias.ativas) {
          setUrlConvite(i.url); setPasso('sucesso');
        } else setPasso('oferta');
      } catch (e: any) {
        if (!cancelado) { setErro(e.message); setPasso('oferta'); }
      }
    })();
    return () => { cancelado = true; };
  }, [carregarInfo]);

  const conferir = useCallback(async (): Promise<boolean> => {
    if (!eventoId) return false;
    const acesso = await autorizacao();
    if (!acesso) return false;
    const espera = cobranca?.incluiMemorias || incluirMemorias;
    const r = await fetch(`/api/conviteria/evento-status?eventoId=${encodeURIComponent(eventoId)}${espera ? '&memorias=1' : ''}`, {
      headers: { Authorization: `Bearer ${acesso}` }, cache: 'no-store',
    });
    if (!r.ok) return false;
    const j = await r.json();
    if (j.concluido) {
      localStorage.removeItem('conviteia:rascunho');
      setUrlConvite(j.url);
      setPasso('sucesso');
      await carregarInfo().catch(() => undefined);
      return true;
    }
    return false;
  }, [autorizacao, eventoId, cobranca?.incluiMemorias, incluirMemorias, carregarInfo]);

  async function continuar() {
    if (!info || !eventoId) return;
    setErro(null);

    // Mensal ou convite já publicado sem add-on: não há cobrança. Apenas
    // conclui o fluxo e preserva o convite que já está no ar.
    const totalPrevisto = info.conviteCentavos + (incluirMemorias && !info.memorias.ativas ? info.memorias.precoCentavos : 0);
    if (totalPrevisto === 0) {
      localStorage.removeItem('conviteia:rascunho');
      setUrlConvite(info.url);
      setPasso('sucesso');
      return;
    }

    setPasso('gerando');
    const acesso = await autorizacao();
    if (!acesso) { setErro('Faça login para continuar.'); setPasso('oferta'); return; }

    const r = await fetch('/api/conviteria/cobrar-convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso}` },
      body: JSON.stringify({ eventoId, incluirMemorias }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setErro(j?.erro ?? 'Não foi possível gerar o PIX.'); setPasso('oferta'); return; }
    if (j.semCobranca) {
      setUrlConvite(info.url); setPasso('sucesso'); return;
    }
    setCobranca({
      valorCentavos: Number(j.valorCentavos),
      conviteCentavos: Number(j.conviteCentavos || 0),
      memoriasCentavos: Number(j.memoriasCentavos || 0),
      incluiMemorias: Boolean(j.incluiMemorias),
      qrcode: j.qrcode,
      copiaECola: j.copiaECola,
    });
    setPasso('pix');
  }

  useEffect(() => {
    if (passo !== 'pix') return;
    let encerrado = false;
    const tentar = async () => {
      if (encerrado || emVoo.current) return;
      emVoo.current = true;
      try { await conferir(); } finally { emVoo.current = false; }
    };
    const atraso = window.setTimeout(tentar, 7000);
    const id = window.setInterval(tentar, 5000);
    return () => { encerrado = true; clearTimeout(atraso); clearInterval(id); };
  }, [passo, conferir]);

  async function copiar() {
    if (!cobranca) return;
    await navigator.clipboard.writeText(cobranca.copiaECola);
    setCopiado(true); setTimeout(() => setCopiado(false), 1800);
  }

  async function conferirAgora() {
    setErro(null); setPasso('conferindo');
    if (!(await conferir())) {
      setErro('Ainda não identificamos o pagamento. Aguarde alguns segundos e tente novamente.');
      setPasso('pix');
    }
  }

  const total = info ? info.conviteCentavos + (incluirMemorias && !info.memorias.ativas ? info.memorias.precoCentavos : 0) : 0;
  const memoriaPendente = info?.memorias.status === 'aguardando_pagamento';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <RendaBackground />
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border shadow-sm" style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}>
        <header className="border-b px-6 py-5 text-center" style={{ borderColor: cor.acento + '22' }}>
          <h1 className="text-xl font-semibold" style={{ color: cor.tinta }}>{info?.publicado ? 'Adicionar ao seu convite' : 'Publicar seu convite'}</h1>
          <p className="mt-1 text-sm" style={{ color: cor.tintaSuave }}>{MARCA}</p>
        </header>

        <div className="px-5 py-6 sm:px-6">
          {erro && <div className="mb-5 flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: cor.erroBg, color: cor.erroTexto }}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{erro}</p></div>}

          {(passo === 'carregando' || passo === 'gerando' || passo === 'conferindo') && <div className="flex flex-col items-center py-12"><Loader2 className="mb-3 h-9 w-9 animate-spin" style={{ color: cor.acento }} /><p style={{ color: cor.tinta }}>{passo === 'carregando' ? 'Preparando…' : passo === 'gerando' ? 'Gerando o PIX…' : 'Conferindo o pagamento…'}</p></div>}

          {passo === 'oferta' && info && <div>
            {!info.memorias.ativas && <button type="button" disabled={memoriaPendente || info.pixConvitePendente} onClick={() => setIncluirMemorias((v) => !v)} className="w-full rounded-2xl border-2 p-4 text-left transition disabled:cursor-default" style={{ borderColor: incluirMemorias ? cor.acento : cor.acento + '32', backgroundColor: incluirMemorias ? cor.papel : '#fff' }}>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: cor.acento + '18', color: cor.acentoTexto }}><Images className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong style={{ color: cor.tinta }}>Memórias do Evento</strong><strong style={{ color: cor.acentoTexto }}>+ {brl(info.memorias.precoCentavos)}</strong></div><p className="mt-1 text-sm leading-5" style={{ color: cor.tintaSuave }}>Seus convidados enviam fotos e vídeos por QR Code. Você recebe um álbum com slideshow ao vivo para TV, telão ou painel.</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: cor.tintaSuave }}><span className="flex items-center gap-1"><Images className="h-3.5 w-3.5" />300 fotos</span><span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />30 vídeos</span><span className="flex items-center gap-1"><QrCode className="h-3.5 w-3.5" />QR para convidados</span><span className="flex items-center gap-1"><MonitorPlay className="h-3.5 w-3.5" />Modo Festa</span></div></div>
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border" style={{ borderColor: incluirMemorias ? cor.acento : cor.acento + '55', backgroundColor: incluirMemorias ? cor.acento : '#fff', color:'#fff' }}>{incluirMemorias && <Check className="h-4 w-4" />}</span>
              </div>
              {memoriaPendente && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Há um PIX de Memórias pendente para este convite. Ele será reutilizado.</p>}
              {info.pixConvitePendente && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Já existe um PIX de R$ 29,90 deste convite. Para evitar cobrança duplicada, conclua este PIX primeiro e ative Memórias depois no painel por R$ 19,90.</p>}
            </button>}

            {info.memorias.ativas && <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" /><strong>Memórias já está ativo neste convite.</strong>{info.memorias.expiraEm && <p className="mt-1 text-xs">Disponível até {new Date(info.memorias.expiraEm).toLocaleDateString('pt-BR')}.</p>}</div>}

            {!info.memorias.ativas && <a href="/memorias" target="_blank" className="mx-auto mt-3 flex w-fit items-center gap-1 text-xs font-semibold" style={{ color: cor.acentoTexto }}>Ver todos os detalhes <ExternalLink className="h-3 w-3" /></a>}

            <div className="mt-6 rounded-2xl bg-[#fff9fb] p-4 text-sm">
              {info.conviteCentavos > 0 && <div className="flex justify-between"><span style={{ color: cor.tintaSuave }}>Convite avulso</span><span style={{ color: cor.tinta }}>{brl(info.conviteCentavos)}</span></div>}
              {info.origemPlano === 'mensal' && info.conviteCentavos === 0 && <div className="flex justify-between"><span style={{ color: cor.tintaSuave }}>Convite · plano mensal</span><span className="font-medium text-emerald-700">Incluído</span></div>}
              {incluirMemorias && !info.memorias.ativas && <div className="mt-2 flex justify-between"><span style={{ color: cor.tintaSuave }}>Memórias do Evento</span><span style={{ color: cor.tinta }}>{brl(info.memorias.precoCentavos)}</span></div>}
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold" style={{ borderColor: cor.acento + '22', color: cor.tinta }}><span>Total agora</span><span>{total > 0 ? brl(total) : 'R$ 0,00'}</span></div>
            </div>

            <button onClick={() => void continuar()} className="mt-5 w-full rounded-lg py-3 font-semibold" style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}>{total > 0 ? 'Continuar para o PIX' : 'Continuar sem Memórias'}</button>
            {!incluirMemorias && !info.memorias.ativas && <p className="mt-2 text-center text-xs" style={{ color: cor.tintaSuave }}>Você pode ativar Memórias depois pelo painel deste convite.</p>}
          </div>}

          {passo === 'pix' && cobranca && <div className="flex flex-col items-center gap-4">
            <div className="w-full rounded-xl bg-[#fff9fb] px-4 py-3 text-sm"><div className="flex justify-between font-semibold" style={{ color: cor.tinta }}><span>Total</span><span>{brl(cobranca.valorCentavos)}</span></div>{cobranca.conviteCentavos > 0 && <div className="mt-1 flex justify-between text-xs" style={{ color: cor.tintaSuave }}><span>Convite</span><span>{brl(cobranca.conviteCentavos)}</span></div>}{cobranca.memoriasCentavos > 0 && <div className="mt-1 flex justify-between text-xs" style={{ color: cor.tintaSuave }}><span>Memórias</span><span>{brl(cobranca.memoriasCentavos)}</span></div>}</div>
            <img src={cobranca.qrcode} alt="QR Code do PIX" className="h-56 w-56 rounded-lg border" style={{ borderColor: cor.acento + '44' }} />
            <p className="text-center text-sm" style={{ color: cor.tintaSuave }}>Escaneie no app do seu banco. A tela avança automaticamente quando o PIX for confirmado.</p>
            <button onClick={() => void copiar()} className="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium" style={{ borderColor: cor.acento + '55', color: cor.tinta }}>{copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiado ? 'Código copiado!' : 'Copiar código PIX'}</button>
            <button onClick={() => void conferirAgora()} className="w-full rounded-lg py-3 font-semibold" style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}>Já paguei</button>
          </div>}

          {passo === 'sucesso' && <div className="flex flex-col items-center gap-3 py-6 text-center"><CheckCircle2 className="h-12 w-12" style={{ color: cor.acento }} /><p className="text-lg font-semibold" style={{ color: cor.tinta }}>{info?.publicado ? (info?.memorias.ativas || incluirMemorias ? 'Tudo pronto!' : 'Convite pronto!') : 'Convite publicado!'}</p>{urlConvite && <><p className="break-all text-sm" style={{ color: cor.tintaSuave }}>{urlConvite}</p><a href={urlConvite} className="mt-2 w-full rounded-lg py-3 font-semibold" style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}>Ver meu convite</a><a href="/convite/painel" className="w-full rounded-lg border py-3 font-semibold" style={{ borderColor: cor.acento + '55', color: cor.acentoTexto }}>Meus convites</a></>}</div>}
        </div>
      </div>
    </main>
  );
}

export default function PagarPage() {
  return <Suspense fallback={null}><PagarConteudo /></Suspense>;
}
