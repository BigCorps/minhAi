'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Maximize, Monitor, Pause, Play, RotateCcw, Smartphone } from 'lucide-react';
import * as QRCode from 'qrcode';
import { createClient } from '@/lib/supabase-browser';
import { festaEstaAtiva } from '@/lib/conviteria/memorias-config';
import GravataAoVivoOverlay, { type ContribuicaoAoVivo } from './GravataAoVivoOverlay';

type Midia = {
  id: string;
  tipo: 'foto' | 'video';
  url: string;
  nomeConvidado?: string | null;
  createdAt: string;
};

type Album = {
  eventoId: string;
  titulo: string;
  dataEvento: string | null;
  fotoCapa: string | null;
  urlMemorias: string;
  modoTeste?: boolean;
  experiencia?: {
    memoriasAtivas?: boolean;
    gravataAtiva?: boolean;
    nomeAcao?: string | null;
  };
  midias: Midia[];
};

type Orientacao = 'escolher' | 'horizontal' | 'vertical';

type RespostaAoVivo = {
  ativo?: boolean;
  nomeAcao?: string;
  mostrarValorIndividual?: boolean;
  totalCentavos?: number | null;
  metaCentavos?: number | null;
  percentualMeta?: number | null;
  contribuicoes?: Array<{
    id: string;
    nome: string;
    valorCentavos: number | null;
    pagoEm: string;
  }>;
};

export default function AlbumMemorias({ slug }: { slug: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [orientacao, setOrientacao] = useState<Orientacao>('escolher');
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [erro, setErro] = useState('');
  const [videoBloqueado, setVideoBloqueado] = useState(false);
  const [relogio, setRelogio] = useState(() => Date.now());
  const [qrFesta, setQrFesta] = useState('');
  const [contribuicaoAtiva, setContribuicaoAtiva] = useState<ContribuicaoAoVivo | null>(null);

  const palcoRef = useRef<HTMLDivElement>(null);
  const currentIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idsConhecidosRef = useRef<Set<string>>(new Set<string>());
  const prioridadeRef = useRef<string[]>([]);
  const filaContribuicoesRef = useRef<ContribuicaoAoVivo[]>([]);
  const idsContribuicoesRef = useRef<Set<string>>(new Set<string>());
  const contribuicaoAtivaRef = useRef<ContribuicaoAoVivo | null>(null);
  const primeiraCargaGravataRef = useRef(false);
  const previewGravataRef = useRef(false);

  const festaAtiva = useMemo(
    () => Boolean(album?.modoTeste) || festaEstaAtiva(album?.dataEvento, new Date(relogio)),
    [album?.modoTeste, album?.dataEvento, relogio],
  );

  const memoriasAtivas = album?.experiencia?.memoriasAtivas !== false;
  const gravataAtiva = Boolean(album?.experiencia?.gravataAtiva);
  const nomeAcao = album?.experiencia?.nomeAcao?.trim() || 'Hora da Gravata';

  useEffect(() => {
    contribuicaoAtivaRef.current = contribuicaoAtiva;
  }, [contribuicaoAtiva]);

  useEffect(() => {
    const id = window.setInterval(() => setRelogio(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const carregar = useCallback(async (modoFesta?: boolean) => {
    const atual = currentIdRef.current;
    const r = await fetch(`/api/conviteria/memorias/album?slug=${encodeURIComponent(slug)}${modoFesta ? '&modo=festa' : ''}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.erro ?? 'Álbum indisponível.');
    if (Array.isArray(j.midias)) {
      const conhecidos = idsConhecidosRef.current;
      const presentes = new Set<string>(j.midias.map((m: Midia) => m.id));

      if (modoFesta && conhecidos.size > 0) {
        const jaPriorizados = new Set(prioridadeRef.current);
        for (const m of j.midias as Midia[]) {
          if (!conhecidos.has(m.id) && !jaPriorizados.has(m.id)) {
            prioridadeRef.current.push(m.id);
            jaPriorizados.add(m.id);
          }
        }
      }
      prioridadeRef.current = prioridadeRef.current.filter((id) => presentes.has(id));
      idsConhecidosRef.current = presentes;
    }

    setAlbum(j);
    if (atual && Array.isArray(j.midias)) {
      const novo = j.midias.findIndex((m: Midia) => m.id === atual);
      setIndice((prev) => novo >= 0 ? novo : Math.min(prev, Math.max(0, j.midias.length - 1)));
    } else if (!j.midias?.length) {
      setIndice(0);
    }
  }, [slug]);

  const enfileirarContribuicao = useCallback((item: ContribuicaoAoVivo) => {
    if (idsContribuicoesRef.current.has(item.id)) return;
    idsContribuicoesRef.current.add(item.id);

    if (contribuicaoAtivaRef.current) {
      filaContribuicoesRef.current.push(item);
      return;
    }

    contribuicaoAtivaRef.current = item;
    setContribuicaoAtiva(item);
  }, []);

  const concluirContribuicao = useCallback(() => {
    const proxima = filaContribuicoesRef.current.shift() ?? null;
    contribuicaoAtivaRef.current = proxima;
    setContribuicaoAtiva(proxima);
  }, []);

  const buscarContribuicoesAoVivo = useCallback(async (enfileirarNovas: boolean) => {
    try {
      const r = await fetch(`/api/conviteria/gravata/ao-vivo?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => null) as RespostaAoVivo | null;
      if (!r.ok || !j?.ativo || !Array.isArray(j.contribuicoes)) return j;

      if (!primeiraCargaGravataRef.current) {
        for (const c of j.contribuicoes) idsContribuicoesRef.current.add(c.id);
        primeiraCargaGravataRef.current = true;
        return j;
      }

      if (!enfileirarNovas) return j;

      for (const c of j.contribuicoes) {
        if (idsContribuicoesRef.current.has(c.id)) continue;
        enfileirarContribuicao({
          id: c.id,
          nome: c.nome || 'Convidado',
          valorCentavos: c.valorCentavos ?? null,
          pagoEm: c.pagoEm,
          nomeAcao: j.nomeAcao || nomeAcao,
          totalCentavos: j.totalCentavos ?? null,
          metaCentavos: j.metaCentavos ?? null,
          percentualMeta: j.percentualMeta ?? null,
        });
      }
      return j;
    } catch {
      return null;
    }
  }, [slug, enfileirarContribuicao, nomeAcao]);

  useEffect(() => { carregar(false).catch((e) => setErro(e.message)); }, [carregar]);

  useEffect(() => {
    if (!album?.eventoId) return;
    void carregar(festaAtiva).catch(() => undefined);
  }, [album?.eventoId, festaAtiva, carregar]);

  useEffect(() => {
    const atual = album?.midias?.[indice];
    currentIdRef.current = atual?.id ?? null;
  }, [album?.midias, indice]);

  useEffect(() => {
    if (!album?.eventoId || !festaAtiva) return;
    const sb = createClient();
    let timerMidia: ReturnType<typeof setTimeout> | null = null;
    let timerGravata: ReturnType<typeof setTimeout> | null = null;

    void buscarContribuicoesAoVivo(false);

    const atualizarMidias = () => {
      if (timerMidia) clearTimeout(timerMidia);
      timerMidia = setTimeout(() => void carregar(true).catch(() => undefined), 450);
    };
    const atualizarGravata = () => {
      if (timerGravata) clearTimeout(timerGravata);
      timerGravata = setTimeout(() => void buscarContribuicoesAoVivo(true), 350);
    };

    const canal = sb.channel(`convite-memorias:${album.eventoId}`)
      .on('broadcast', { event: 'memoria' }, atualizarMidias)
      .on('broadcast', { event: 'contribuicao' }, atualizarGravata)
      .subscribe();

    const fallbackMidia = window.setInterval(() => void carregar(true).catch(() => undefined), 60_000);
    const fallbackGravata = window.setInterval(() => void buscarContribuicoesAoVivo(true), 20_000);

    return () => {
      if (timerMidia) clearTimeout(timerMidia);
      if (timerGravata) clearTimeout(timerGravata);
      window.clearInterval(fallbackMidia);
      window.clearInterval(fallbackGravata);
      void sb.removeChannel(canal);
    };
  }, [album?.eventoId, festaAtiva, carregar, buscarContribuicoesAoVivo]);

  useEffect(() => {
    if (!album) return;
    const id = window.setInterval(() => void carregar(festaAtiva).catch(() => undefined), 45 * 60_000);
    return () => window.clearInterval(id);
  }, [album, festaAtiva, carregar]);

  useEffect(() => {
    if (!festaAtiva || !album?.urlMemorias) {
      setQrFesta('');
      return;
    }
    let cancelado = false;
    QRCode.toDataURL(album.urlMemorias, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#1f1115', light: '#ffffff' },
    }).then((data) => { if (!cancelado) setQrFesta(data); }).catch(() => { if (!cancelado) setQrFesta(''); });
    return () => { cancelado = true; };
  }, [album?.urlMemorias, festaAtiva]);

  useEffect(() => {
    if (!album || orientacao === 'escolher' || previewGravataRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('testeGravata') !== '1') return;

    previewGravataRef.current = true;
    const id = window.setTimeout(async () => {
      const dados = await buscarContribuicoesAoVivo(false);
      const mostrarValor = Boolean(dados?.mostrarValorIndividual);
      const preview: ContribuicaoAoVivo = {
        id: `preview-gravata-${Date.now()}`,
        nome: 'Maria',
        valorCentavos: mostrarValor ? 5000 : null,
        pagoEm: new Date().toISOString(),
        nomeAcao: dados?.nomeAcao || nomeAcao,
        totalCentavos: dados?.totalCentavos ?? null,
        metaCentavos: dados?.metaCentavos ?? null,
        percentualMeta: dados?.percentualMeta ?? null,
      };
      contribuicaoAtivaRef.current = preview;
      setContribuicaoAtiva(preview);
    }, 1100);

    return () => window.clearTimeout(id);
  }, [album, orientacao, buscarContribuicoesAoVivo, nomeAcao]);

  const midias = album?.midias ?? [];
  const atual = midias[indice];
  const avancar = useCallback(() => {
    if (!midias.length || contribuicaoAtivaRef.current) return;

    while (prioridadeRef.current.length) {
      const id = prioridadeRef.current.shift()!;
      const preferido = midias.findIndex((m) => m.id === id);
      if (preferido >= 0 && preferido !== indice) {
        setIndice(preferido);
        return;
      }
    }

    setIndice((i) => (i + 1) % midias.length);
  }, [midias, indice]);
  const voltar = useCallback(() => {
    if (!midias.length || contribuicaoAtivaRef.current) return;
    setIndice((i) => (i - 1 + midias.length) % midias.length);
  }, [midias.length]);

  useEffect(() => {
    if (!atual || pausado || contribuicaoAtiva || atual.tipo !== 'foto' || orientacao === 'escolher') return;
    const id = window.setTimeout(avancar, 5000);
    return () => window.clearTimeout(id);
  }, [atual, pausado, contribuicaoAtiva, avancar, orientacao]);

  useEffect(() => {
    setVideoBloqueado(false);
    if (atual?.tipo !== 'video' || orientacao === 'escolher') return;
    const v = videoRef.current;
    if (!v) return;
    if (pausado || contribuicaoAtiva) { v.pause(); return; }
    void v.play().then(() => setVideoBloqueado(false)).catch(() => setVideoBloqueado(true));
  }, [atual?.id, atual?.tipo, pausado, contribuicaoAtiva, orientacao]);

  async function reproduzirVideoBloqueado() {
    const v = videoRef.current;
    if (!v || contribuicaoAtiva) return;
    try {
      await v.play();
      setPausado(false);
      setVideoBloqueado(false);
    } catch {
      setVideoBloqueado(true);
    }
  }

  async function telaCheia() {
    try { await palcoRef.current?.requestFullscreen(); } catch { /* navegador pode recusar */ }
  }

  const qrTitulo = gravataAtiva && memoriasAtivas
    ? `Envie fotos ou participe da ${nomeAcao}`
    : gravataAtiva
      ? `Participe da ${nomeAcao}`
      : 'Envie suas fotos e vídeos do evento agora';
  const qrDescricao = gravataAtiva
    ? 'Aponte a câmera para o QR Code e participe pelo celular.'
    : 'Aponte a câmera para o QR Code. Não precisa instalar aplicativo.';

  if (erro && !album) return <main className="min-h-screen grid place-items-center bg-black px-6 text-center text-white"><div><h1 className="text-xl font-semibold">Álbum indisponível</h1><p className="mt-2 text-sm text-white/70">{erro}</p></div></main>;
  if (!album) return <main className="min-h-screen grid place-items-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></main>;

  if (orientacao === 'escolher') {
    return (
      <main className="min-h-screen grid place-items-center bg-[#201116] px-5 text-white">
        <div className="w-full max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e9a9b9]">Telão do Evento</p>
          <h1 className="mt-2 text-3xl font-semibold">{album.titulo}</h1>
          <p className="mt-3 text-sm text-white/70">Escolha como esta tela será usada. Você pode trocar depois.</p>
          {festaAtiva && <p className="mx-auto mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">● Modo Festa — atualizações em tempo real + QR na tela</p>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button onClick={() => setOrientacao('horizontal')} className="rounded-3xl border border-white/20 bg-white/10 p-7 hover:bg-white/15"><Monitor className="mx-auto mb-3 h-10 w-10" /><strong className="block text-lg">Deitado</strong><span className="mt-1 block text-sm text-white/60">TV, projetor e telão 16:9</span></button>
            <button onClick={() => setOrientacao('vertical')} className="rounded-3xl border border-white/20 bg-white/10 p-7 hover:bg-white/15"><Smartphone className="mx-auto mb-3 h-10 w-10" /><strong className="block text-lg">Em pé</strong><span className="mt-1 block text-sm text-white/60">TV vertical, painel e totem 9:16</span></button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main ref={palcoRef} className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 grid place-items-center p-0 sm:p-3">
        <div className={orientacao === 'vertical'
          ? 'relative h-screen max-h-screen w-[56.25vh] max-w-full overflow-hidden bg-[#12090c] shadow-2xl'
          : 'relative h-screen w-screen overflow-hidden bg-[#12090c]'}>
          {atual ? (
            atual.tipo === 'foto' ? (
              <img key={atual.id} src={atual.url} alt="" className="h-full w-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                key={atual.id}
                src={atual.url}
                autoPlay={!pausado && !contribuicaoAtiva}
                playsInline
                controls={false}
                className="h-full w-full object-contain"
                onPlay={() => setVideoBloqueado(false)}
                onEnded={avancar}
                onError={avancar}
                onClick={() => { if (!contribuicaoAtiva) setPausado((v) => !v); }}
              />
            )
          ) : (
            <div className="grid h-full place-items-center px-8 text-center">
              <div>
                {album.fotoCapa && <img src={album.fotoCapa} alt="" className="mx-auto mb-5 h-24 w-24 rounded-full object-cover" />}
                <h2 className="text-2xl font-semibold">{gravataAtiva && !memoriasAtivas ? `${nomeAcao} pronta para começar` : 'Aguardando as primeiras memórias…'}</h2>
                <p className="mt-2 text-sm text-white/60">{gravataAtiva && !memoriasAtivas ? 'As participações confirmadas vão aparecer aqui em tempo real.' : 'As fotos aprovadas vão aparecer aqui.'}</p>
              </div>
            </div>
          )}

          {atual?.tipo === 'video' && videoBloqueado && !pausado && !contribuicaoAtiva && (
            <button type="button" onClick={() => void reproduzirVideoBloqueado()} className="absolute inset-0 z-10 grid place-items-center bg-black/35">
              <span className="rounded-full bg-black/70 px-5 py-3 text-sm font-semibold backdrop-blur">▶ Toque para reproduzir o vídeo</span>
            </button>
          )}

          {festaAtiva && qrFesta && (
            <div className="pointer-events-none absolute bottom-20 right-3 z-20 flex max-w-[290px] items-center gap-2.5 rounded-2xl border border-white/70 bg-white/95 p-2.5 text-[#28151b] shadow-2xl backdrop-blur sm:bottom-20 sm:right-5 sm:max-w-[340px] sm:gap-3 sm:p-3">
              <img src={qrFesta} alt="QR Code da festa" className="h-20 w-20 shrink-0 rounded-lg bg-white sm:h-24 sm:w-24" />
              <div className="min-w-0"><p className="text-[11px] font-bold leading-tight sm:text-sm">{qrTitulo}</p><p className="mt-1 text-[9px] leading-tight text-[#6f515a] sm:text-[11px]">{qrDescricao}</p></div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-5 pt-16">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-sm font-semibold">{album.titulo}</p>{atual?.nomeConvidado && <p className="mt-0.5 text-xs text-white/65">por {atual.nomeConvidado}</p>}</div>
              <div className="text-right text-xs text-white/60">{midias.length ? `${indice + 1} / ${midias.length}` : ''}{festaAtiva && <span className="ml-2 text-emerald-300">● ao vivo</span>}</div>
            </div>
          </div>

          {contribuicaoAtiva && (
            <GravataAoVivoOverlay
              contribuicao={contribuicaoAtiva}
              orientacao={orientacao}
              onConcluir={concluirContribuicao}
            />
          )}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-[60] flex gap-2 rounded-full bg-black/55 p-2 backdrop-blur">
        <button title="Anterior" disabled={Boolean(contribuicaoAtiva)} onClick={voltar} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-35">‹</button>
        <button title={pausado ? 'Continuar' : 'Pausar'} disabled={Boolean(contribuicaoAtiva)} onClick={() => setPausado((v) => !v)} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-35">{pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
        <button title="Próxima" disabled={Boolean(contribuicaoAtiva)} onClick={avancar} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-35">›</button>
        <button title="Trocar orientação" disabled={Boolean(contribuicaoAtiva)} onClick={() => setOrientacao('escolher')} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-35"><RotateCcw className="h-4 w-4" /></button>
        <button title="Tela cheia" onClick={() => void telaCheia()} className="rounded-full p-2 hover:bg-white/15"><Maximize className="h-4 w-4" /></button>
      </div>
    </main>
  );
}
