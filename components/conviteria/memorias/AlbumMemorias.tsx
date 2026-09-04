'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Maximize, Monitor, Pause, Play, RotateCcw, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { festaEstaAtiva } from '@/lib/conviteria/memorias-config';

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
  midias: Midia[];
};

type Orientacao = 'escolher' | 'horizontal' | 'vertical';

export default function AlbumMemorias({ slug }: { slug: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [orientacao, setOrientacao] = useState<Orientacao>('escolher');
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [erro, setErro] = useState('');
  const [videoBloqueado, setVideoBloqueado] = useState(false);
  const [relogio, setRelogio] = useState(() => Date.now());
  const palcoRef = useRef<HTMLDivElement>(null);
  const currentIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idsConhecidosRef = useRef<Set<string>>(new Set());
  const prioridadeRef = useRef<string[]>([]);

  const festaAtiva = useMemo(
    () => festaEstaAtiva(album?.dataEvento, new Date(relogio)),
    [album?.dataEvento, relogio],
  );

  // Uma tela pode ficar aberta antes da festa ou atravessar a madrugada. O
  // relógio local faz o Realtime entrar/sair automaticamente do Modo Festa
  // sem exigir F5 quando chega meia-noite ou passa das 06:00.
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

      // No Modo Festa, uma memória nova entra na fila preferencial e será
      // exibida na PRÓXIMA transição. A mídia atual nunca é interrompida.
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

  useEffect(() => { carregar(false).catch((e) => setErro(e.message)); }, [carregar]);

  // Assim que conhecemos a data do evento, aplica imediatamente a janela
  // correta: 100 mídias recentes no Modo Festa, álbum completo fora dela.
  // Também reage à virada de meia-noite/06:00 sem precisar recarregar a página.
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    const atualizar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void carregar(true).catch(() => undefined), 450);
    };
    const canal = sb.channel(`convite-memorias:${album.eventoId}`)
      .on('broadcast', { event: 'memoria' }, atualizar)
      .subscribe();
    const fallback = window.setInterval(() => void carregar(true).catch(() => undefined), 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      window.clearInterval(fallback);
      void sb.removeChannel(canal);
    };
  }, [album?.eventoId, festaAtiva, carregar]);

  // Renova as URLs assinadas em telas deixadas abertas por horas.
  useEffect(() => {
    if (!album) return;
    const id = window.setInterval(() => void carregar(festaAtiva).catch(() => undefined), 45 * 60_000);
    return () => window.clearInterval(id);
  }, [album, festaAtiva, carregar]);

  const midias = album?.midias ?? [];
  const atual = midias[indice];
  const avancar = useCallback(() => {
    if (!midias.length) return;

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
    if (!midias.length) return;
    setIndice((i) => (i - 1 + midias.length) % midias.length);
  }, [midias.length]);

  useEffect(() => {
    if (!atual || pausado || atual.tipo !== 'foto' || orientacao === 'escolher') return;
    const id = window.setTimeout(avancar, 5000);
    return () => window.clearTimeout(id);
  }, [atual, pausado, avancar, orientacao]);

  useEffect(() => {
    setVideoBloqueado(false);
    if (atual?.tipo !== 'video' || orientacao === 'escolher') return;
    const v = videoRef.current;
    if (!v) return;
    if (pausado) { v.pause(); return; }
    void v.play().then(() => setVideoBloqueado(false)).catch(() => setVideoBloqueado(true));
  }, [atual?.id, atual?.tipo, pausado, orientacao]);

  async function reproduzirVideoBloqueado() {
    const v = videoRef.current;
    if (!v) return;
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

  if (erro && !album) return <main className="min-h-screen grid place-items-center bg-black px-6 text-center text-white"><div><h1 className="text-xl font-semibold">Álbum indisponível</h1><p className="mt-2 text-sm text-white/70">{erro}</p></div></main>;
  if (!album) return <main className="min-h-screen grid place-items-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></main>;

  if (orientacao === 'escolher') {
    return (
      <main className="min-h-screen grid place-items-center bg-[#201116] px-5 text-white">
        <div className="w-full max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e9a9b9]">Álbum ao vivo</p>
          <h1 className="mt-2 text-3xl font-semibold">{album.titulo}</h1>
          <p className="mt-3 text-sm text-white/70">Escolha como esta tela será usada. Você pode trocar depois.</p>
          {festaAtiva && <p className="mx-auto mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">● Modo Festa — atualizações em tempo real</p>}
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
                autoPlay={!pausado}
                playsInline
                controls={false}
                className="h-full w-full object-contain"
                onPlay={() => setVideoBloqueado(false)}
                onEnded={avancar}
                onError={avancar}
                onClick={() => setPausado((v) => !v)}
              />
            )
          ) : (
            <div className="grid h-full place-items-center px-8 text-center"><div>{album.fotoCapa && <img src={album.fotoCapa} alt="" className="mx-auto mb-5 h-24 w-24 rounded-full object-cover" />}<h2 className="text-2xl font-semibold">Aguardando as primeiras memórias…</h2><p className="mt-2 text-sm text-white/60">As fotos aprovadas vão aparecer aqui.</p></div></div>
          )}

          {atual?.tipo === 'video' && videoBloqueado && !pausado && (
            <button
              type="button"
              onClick={() => void reproduzirVideoBloqueado()}
              className="absolute inset-0 z-10 grid place-items-center bg-black/35"
            >
              <span className="rounded-full bg-black/70 px-5 py-3 text-sm font-semibold backdrop-blur">
                ▶ Toque para reproduzir o vídeo
              </span>
            </button>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-5 pt-16">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-sm font-semibold">{album.titulo}</p>{atual?.nomeConvidado && <p className="mt-0.5 text-xs text-white/65">por {atual.nomeConvidado}</p>}</div>
              <div className="text-right text-xs text-white/60">{midias.length ? `${indice + 1} / ${midias.length}` : ''}{festaAtiva && <span className="ml-2 text-emerald-300">● ao vivo</span>}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 flex gap-2 rounded-full bg-black/55 p-2 backdrop-blur">
        <button title="Anterior" onClick={voltar} className="rounded-full p-2 hover:bg-white/15">‹</button>
        <button title={pausado ? 'Continuar' : 'Pausar'} onClick={() => setPausado((v) => !v)} className="rounded-full p-2 hover:bg-white/15">{pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
        <button title="Próxima" onClick={avancar} className="rounded-full p-2 hover:bg-white/15">›</button>
        <button title="Trocar orientação" onClick={() => setOrientacao('escolher')} className="rounded-full p-2 hover:bg-white/15"><RotateCcw className="h-4 w-4" /></button>
        <button title="Tela cheia" onClick={() => void telaCheia()} className="rounded-full p-2 hover:bg-white/15"><Maximize className="h-4 w-4" /></button>
      </div>
    </main>
  );
}
