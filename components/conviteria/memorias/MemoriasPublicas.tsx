'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Film, Loader2, UserRound, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { MEMORIAS_ARQUIVO_MAX_BYTES } from '@/lib/conviteria/memorias-config';
import { prepararVideoMemorias } from '@/lib/conviteria/memorias-video';
import {
  MEMORIAS_NOME_ERRO,
  MEMORIAS_NOME_MAX,
  nomeConvidadoValido,
  normalizarNomeConvidado,
} from '@/lib/conviteria/memorias-nome';

type Info = {
  eventoId: string;
  slug: string;
  titulo: string;
  fotoCapa: string | null;
  aprovacaoManual: boolean;
  expiraEm: string | null;
  uso: { fotos: number; videos: number; bytes: number };
  limites: { fotos: number; videos: number; bytes: number; videoSegundos: number; videoBytes: number };
};

type Preparado = {
  file: File;
  tipo: 'foto' | 'video';
  duracaoSegundos: number | null;
  largura: number | null;
  altura: number | null;
};

function carregarImagem(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir esta foto.')); };
    img.src = url;
  });
}

async function prepararFoto(file: File): Promise<Preparado> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Esta foto é grande demais para processar no celular.');

  const img = await carregarImagem(file);
  const max = 1920;
  const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const largura = Math.max(1, Math.round(img.naturalWidth * escala));
  const altura = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a foto.');
  ctx.drawImage(img, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
  if (!blob) throw new Error('Não foi possível compactar esta foto.');
  if (blob.size > MEMORIAS_ARQUIVO_MAX_BYTES) throw new Error('Esta foto continuou grande demais após a compactação.');
  const nome = (file.name.replace(/\.[^.]+$/, '') || 'foto') + '.webp';
  return {
    file: new File([blob], nome, { type: 'image/webp', lastModified: Date.now() }),
    tipo: 'foto',
    duracaoSegundos: null,
    largura,
    altura,
  };
}

export default function MemoriasPublicas({ slug }: { slug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [nome, setNome] = useState('');
  const [nomeTocado, setNomeTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState('');
  const fotosRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const nomeNormalizado = normalizarNomeConvidado(nome);
  const nomeValido = nomeConvidadoValido(nomeNormalizado);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/conviteria/memorias/publico?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.erro ?? 'Memórias indisponíveis.');
    setInfo(j);
  }, [slug]);

  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, [carregar]);

  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(`conviteia-memorias-nome:${slug}`);
      if (salvo && nomeConvidadoValido(salvo)) setNome(normalizarNomeConvidado(salvo));
    } catch { /* storage pode estar indisponível */ }
  }, [slug]);

  const garantirNome = useCallback(() => {
    setNomeTocado(true);
    if (!nomeValido) {
      setErro(MEMORIAS_NOME_ERRO);
      return false;
    }
    setErro('');
    try { window.sessionStorage.setItem(`conviteia-memorias-nome:${slug}`, nomeNormalizado); } catch { /* best effort */ }
    return true;
  }, [nomeNormalizado, nomeValido, slug]);

  const enviarUm = useCallback(async (p: Preparado) => {
    if (!nomeValido) throw new Error(MEMORIAS_NOME_ERRO);

    const reservaR = await fetch('/api/conviteria/memorias/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        tipo: p.tipo,
        mimeType: p.file.type,
        tamanhoBytes: p.file.size,
        duracaoSegundos: p.duracaoSegundos,
        largura: p.largura,
        altura: p.altura,
        nomeConvidado: nomeNormalizado,
      }),
    });
    const reserva = await reservaR.json().catch(() => null);
    if (!reservaR.ok) throw new Error(reserva?.erro ?? 'Não foi possível preparar o envio.');

    const cancelarReserva = () => fetch('/api/conviteria/memorias/finalizar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, memoriaId: reserva.memoriaId }),
    }).catch(() => undefined);

    const sb = createClient();
    const { error: uploadError } = await sb.storage
      .from(reserva.bucket)
      .uploadToSignedUrl(reserva.path, reserva.token, p.file, {
        contentType: p.file.type,
        cacheControl: '3600',
      });
    if (uploadError) {
      await cancelarReserva();
      throw new Error('A conexão falhou durante o upload. Tente novamente.');
    }

    let fim: any = null;
    let ultimoStatus = 0;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      if (tentativa > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 500 * tentativa));
      }
      const fimR = await fetch('/api/conviteria/memorias/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, memoriaId: reserva.memoriaId }),
      });
      fim = await fimR.json().catch(() => null);
      ultimoStatus = fimR.status;
      if (fimR.ok) return fim.status as string;
      if (fimR.status !== 409) {
        await cancelarReserva();
        throw new Error(fim?.erro ?? 'O arquivo subiu, mas não pôde ser confirmado.');
      }
    }

    throw new Error(
      ultimoStatus === 409
        ? 'O arquivo terminou de enviar, mas ainda está sendo confirmado. Aguarde alguns segundos e tente novamente.'
        : (fim?.erro ?? 'O arquivo subiu, mas não pôde ser confirmado.'),
    );
  }, [nomeNormalizado, nomeValido, slug]);

  async function enviarFotos(files: FileList | null) {
    if (!files?.length || enviando) return;
    if (!garantirNome()) {
      if (fotosRef.current) fotosRef.current.value = '';
      return;
    }
    const lista = Array.from(files).slice(0, 50);
    setErro(''); setSucesso(''); setEnviando(true);
    let enviados = 0;
    try {
      for (let i = 0; i < lista.length; i++) {
        setProgresso(`Preparando foto ${i + 1} de ${lista.length}…`);
        const p = await prepararFoto(lista[i]);
        setProgresso(`Enviando foto ${i + 1} de ${lista.length}…`);
        await enviarUm(p);
        enviados++;
      }
      setSucesso(info?.aprovacaoManual
        ? `${enviados} foto${enviados === 1 ? '' : 's'} enviada${enviados === 1 ? '' : 's'} para aprovação em nome de ${nomeNormalizado}.`
        : `${enviados} foto${enviados === 1 ? '' : 's'} compartilhada${enviados === 1 ? '' : 's'} com sucesso por ${nomeNormalizado}!`);
      await carregar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível enviar.');
      if (enviados) await carregar().catch(() => undefined);
    } finally {
      setEnviando(false); setProgresso('');
      if (fotosRef.current) fotosRef.current.value = '';
    }
  }

  async function enviarVideo(file: File | undefined) {
    if (!file || enviando) return;
    if (!garantirNome()) {
      if (videoRef.current) videoRef.current.value = '';
      return;
    }
    setErro(''); setSucesso(''); setEnviando(true);
    try {
      const v = await prepararVideoMemorias(file, setProgresso);
      const p: Preparado = {
        file: v.file,
        tipo: 'video',
        duracaoSegundos: v.duracaoSegundos,
        largura: v.largura,
        altura: v.altura,
      };
      setProgresso('Enviando vídeo…');
      await enviarUm(p);
      setSucesso(info?.aprovacaoManual
        ? `Vídeo enviado para aprovação em nome de ${nomeNormalizado}.`
        : `Vídeo compartilhado com sucesso por ${nomeNormalizado}!`);
      await carregar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível enviar o vídeo.');
    } finally {
      setEnviando(false); setProgresso('');
      if (videoRef.current) videoRef.current.value = '';
    }
  }

  if (!info && !erro) {
    return <main className="min-h-screen grid place-items-center bg-[#fff9fb]"><Loader2 className="h-8 w-8 animate-spin text-[#c06078]" /></main>;
  }

  if (!info) {
    return <main className="min-h-screen grid place-items-center bg-[#fff9fb] px-6 text-center"><div><XCircle className="mx-auto mb-3 h-10 w-10 text-[#a04a63]" /><h1 className="text-xl font-semibold text-[#40232c]">Memórias indisponíveis</h1><p className="mt-2 text-sm text-[#7c5560]">{erro}</p></div></main>;
  }

  const pct = Math.min(100, Math.round((info.uso.bytes / info.limites.bytes) * 100));

  return (
    <main className="min-h-screen bg-[#fff9fb] px-4 py-8 text-[#40232c]">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 text-center">
          {info.fotoCapa && <img src={info.fotoCapa} alt="" className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-sm" />}
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#a04a63]">Memórias do Evento</p>
          <h1 className="mt-2 text-3xl font-semibold">{info.titulo}</h1>
          <p className="mt-2 text-sm text-[#7c5560]">Compartilhe as fotos e os vídeos que você fez deste momento.</p>
        </header>

        <section className="rounded-3xl border border-[#c0607830] bg-white p-5 shadow-sm">
          <div className="rounded-2xl bg-[#fff8fa] p-4">
            <label htmlFor="memorias-nome" className="flex items-center gap-2 text-sm font-semibold">
              <UserRound className="h-4 w-4 text-[#a04a63]" />
              Seu nome e sobrenome <span className="text-red-600">*</span>
            </label>
            <p className="mt-1 text-xs text-[#7c5560]">Os anfitriões verão quem enviou cada foto e vídeo.</p>
            <input
              id="memorias-nome"
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (nomeTocado) setErro(''); }}
              onBlur={() => setNomeTocado(true)}
              maxLength={MEMORIAS_NOME_MAX}
              autoComplete="name"
              placeholder="Ex.: Ana Souza"
              aria-invalid={nomeTocado && !nomeValido}
              className={`mt-3 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${nomeTocado && !nomeValido ? 'border-red-300 bg-red-50/40 focus:ring-red-100' : 'border-[#c0607840] bg-white focus:ring-[#c0607830]'}`}
            />
            {nomeTocado && !nomeValido && <p className="mt-2 text-xs font-medium text-red-700">{MEMORIAS_NOME_ERRO}</p>}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button disabled={enviando || info.uso.fotos >= info.limites.fotos} onClick={() => { if (garantirNome()) fotosRef.current?.click(); }} className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#c06078] p-5 font-semibold text-white disabled:opacity-45">
              <Camera className="mb-2 h-8 w-8" />Enviar fotos
              <span className="mt-1 text-xs font-normal opacity-90">até 50 por vez</span>
            </button>
            <button disabled={enviando || info.uso.videos >= info.limites.videos} onClick={() => { if (garantirNome()) videoRef.current?.click(); }} className="flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 border-[#c0607855] bg-[#fff5f8] p-5 font-semibold text-[#a04a63] disabled:opacity-45">
              <Film className="mb-2 h-8 w-8" />Enviar vídeo
              <span className="mt-1 text-xs font-normal">até 30 s · compactação automática</span>
            </button>
          </div>

          <input ref={fotosRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void enviarFotos(e.target.files)} />
          <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="hidden" onChange={(e) => void enviarVideo(e.target.files?.[0])} />

          {enviando && <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#fff5f8] px-4 py-3 text-sm text-[#7c5560]"><Loader2 className="h-4 w-4 animate-spin" />{progresso || 'Enviando…'}</div>}
          {sucesso && <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{sucesso}</div>}
          {erro && <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{erro}</div>}
        </section>

        <section className="mt-4 rounded-2xl border border-[#c0607825] bg-white px-5 py-4 text-sm">
          <div className="flex justify-between text-[#7c5560]"><span>{info.uso.fotos}/{info.limites.fotos} fotos · {info.uso.videos}/{info.limites.videos} vídeos</span><span>{pct}% do espaço</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f7e2e6]"><div className="h-full rounded-full bg-[#c06078]" style={{ width: `${pct}%` }} /></div>
          {info.aprovacaoManual && <p className="mt-3 text-xs text-[#7c5560]">O anfitrião escolheu revisar as memórias antes de elas aparecerem no álbum.</p>}
        </section>

        <p className="mt-6 text-center text-xs text-[#7c5560]">Não precisa instalar aplicativo nem criar conta.</p>
      </div>
    </main>
  );
}
