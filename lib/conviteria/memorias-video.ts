'use client';

import {
  MEMORIAS_MIMES_VIDEO,
  MEMORIAS_VIDEO_ALVO_BYTES,
  MEMORIAS_VIDEO_MAX_BYTES,
  MEMORIAS_VIDEO_MAX_SEGUNDOS,
  MEMORIAS_VIDEO_ORIGINAL_MAX_BYTES,
} from './memorias-config';

export type VideoMemoriasPreparado = {
  file: File;
  duracaoSegundos: number;
  largura: number | null;
  altura: number | null;
  compactado: boolean;
};

type MetaVideo = {
  duracao: number;
  largura: number;
  altura: number;
};

type Progresso = (mensagem: string) => void;

const FPS = 30;
const AUDIO_BPS = 96_000;
const VIDEO_BPS_MAX = 1_800_000;
const VIDEO_BPS_MIN = 650_000;
const VIDEO_BPS_RETRY = 950_000;
const DIMENSAO_LONGA_MAX = 1280;

function mb(bytes: number) {
  return Math.max(1, Math.round(bytes / 1024 / 1024));
}

function mimeBase(mime: string) {
  return (mime || '').split(';')[0].trim().toLowerCase();
}

function mimeOriginalAceito(file: File) {
  return (MEMORIAS_MIMES_VIDEO as readonly string[]).includes(mimeBase(file.type));
}

function nomeSaida(nome: string, mime: string) {
  const base = nome.replace(/\.[^.]+$/, '') || 'video';
  return `${base}-compactado.${mime.includes('webm') ? 'webm' : 'mp4'}`;
}

function dimensoesSaida(largura: number, altura: number) {
  const maior = Math.max(largura, altura);
  const escala = maior > DIMENSAO_LONGA_MAX ? DIMENSAO_LONGA_MAX / maior : 1;
  // H.264 costuma trabalhar melhor com dimensões pares.
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return {
    largura: par(largura * escala),
    altura: par(altura * escala),
  };
}

function mimeGravacao() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }

  // MP4/H.264 + AAC primeiro: é o melhor denominador comum para reprodução
  // posterior em TVs, iPhone e Android. WebM fica como fallback para browsers
  // Chromium/Firefox que não expõem MP4 no MediaRecorder.
  const candidatos = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

function videoLocal(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.controls = false;
  // Safari historicamente aplica restrições extras a mídia totalmente fora
  // da viewport. Mantemos 2 px praticamente invisíveis dentro da tela durante
  // o processamento; não interfere na UI e reduz bloqueios de playback.
  video.style.position = 'fixed';
  video.style.right = '0';
  video.style.bottom = '0';
  video.style.width = '2px';
  video.style.height = '2px';
  video.style.opacity = '0.01';
  video.style.pointerEvents = 'none';
  video.setAttribute('aria-hidden', 'true');
  video.src = url;
  document.body.appendChild(video);
  return { video, url };
}

async function carregarMeta(video: HTMLVideoElement): Promise<MetaVideo> {
  if (video.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      const ok = () => { limpar(); resolve(); };
      const falha = () => { limpar(); reject(new Error('Não foi possível abrir este vídeo.')); };
      const limpar = () => {
        video.removeEventListener('loadedmetadata', ok);
        video.removeEventListener('error', falha);
      };
      video.addEventListener('loadedmetadata', ok, { once: true });
      video.addEventListener('error', falha, { once: true });
      video.load();
    });
  }

  let duracao = video.duration;
  // Alguns MOV/MP4 antigos só expõem a duração depois de um seek.
  if (!Number.isFinite(duracao) || duracao <= 0) {
    await new Promise<void>((resolve) => {
      const pronto = () => resolve();
      video.addEventListener('durationchange', pronto, { once: true });
      try { video.currentTime = 1e9; } catch { resolve(); }
      window.setTimeout(resolve, 1200);
    });
    duracao = video.duration;
    try { video.currentTime = 0; } catch { /* nada */ }
  }

  return {
    duracao,
    largura: video.videoWidth,
    altura: video.videoHeight,
  };
}

function bitratePara(duracao: number) {
  const totalBps = Math.floor((MEMORIAS_VIDEO_ALVO_BYTES * 8) / Math.max(1, duracao));
  return Math.max(VIDEO_BPS_MIN, Math.min(VIDEO_BPS_MAX, totalBps - AUDIO_BPS));
}

async function transcodificar(
  file: File,
  meta: MetaVideo,
  videoBitsPerSecond: number,
  progresso?: Progresso,
  audioContextCompartilhado?: AudioContext | null,
): Promise<File> {
  const tipoRecorder = mimeGravacao();
  if (!tipoRecorder) {
    throw new Error('Este navegador não oferece compactação de vídeo compatível.');
  }

  const { video, url } = videoLocal(file);
  let audioContext: AudioContext | null = audioContextCompartilhado ?? null;
  const fechaAudioAqui = !audioContextCompartilhado;
  let origemAudio: MediaElementAudioSourceNode | null = null;
  let streamCanvas: MediaStream | null = null;
  let streamFinal: MediaStream | null = null;
  let raf = 0;
  let timer: number | null = null;

  try {
    await carregarMeta(video);
    const saida = dimensoesSaida(meta.largura, meta.altura);
    const canvas = document.createElement('canvas');
    canvas.width = saida.largura;
    canvas.height = saida.altura;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Seu navegador não conseguiu preparar o vídeo.');

    if (typeof canvas.captureStream !== 'function') {
      throw new Error('Este navegador não oferece compactação de vídeo compatível.');
    }
    streamCanvas = canvas.captureStream(FPS);
    streamFinal = new MediaStream(streamCanvas.getVideoTracks());

    // Primeiro tenta capturar o áudio diretamente do <video> (Chromium).
    // No Safari esse método ainda não é confiável, então usamos WebAudio.
    let audioAdicionado = false;
    try {
      const capturavel = video as HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };
      const capturado = capturavel.captureStream?.() ?? capturavel.mozCaptureStream?.();
      for (const track of capturado?.getAudioTracks() ?? []) {
        streamFinal.addTrack(track);
        audioAdicionado = true;
      }
      if (audioAdicionado) {
        // captureStream captura o conteúdo da faixa, não o volume de saída do
        // elemento. Mutar aqui evita o convidado ouvir o vídeo inteiro durante
        // a compactação e também facilita autoplay em Chromium/Firefox.
        video.muted = true;
        video.defaultMuted = true;
      }
    } catch { /* cai para WebAudio */ }

    if (!audioAdicionado) {
      try {
        if (!audioContext) {
          const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) audioContext = new Ctx();
        }
        if (audioContext) {
          if (audioContext.state === 'suspended') await audioContext.resume().catch(() => undefined);
          origemAudio = audioContext.createMediaElementSource(video);
          const destinoAudio = audioContext.createMediaStreamDestination();
          origemAudio.connect(destinoAudio);
          for (const track of destinoAudio.stream.getAudioTracks()) {
            streamFinal.addTrack(track);
            audioAdicionado = true;
          }
        }
      } catch {
        origemAudio = null;
      }
    }

    const partes: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamFinal, {
        mimeType: tipoRecorder,
        videoBitsPerSecond,
        audioBitsPerSecond: AUDIO_BPS,
      });
    } catch {
      recorder = new MediaRecorder(streamFinal, { mimeType: tipoRecorder });
    }

    const finalizado = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data?.size) partes.push(e.data);
      };
      recorder.onerror = () => reject(new Error('O navegador falhou ao compactar este vídeo.'));
      recorder.onstop = () => {
        const base = mimeBase(recorder.mimeType || tipoRecorder);
        resolve(new Blob(partes, { type: base || 'video/mp4' }));
      };
    });

    let desenhando = true;
    const desenhar = () => {
      if (!desenhando) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pct = Math.min(99, Math.max(0, Math.round((video.currentTime / Math.max(0.1, meta.duracao)) * 100)));
      progresso?.(`Compactando vídeo… ${pct}%`);
      raf = requestAnimationFrame(desenhar);
    };

    video.currentTime = 0;
    recorder.start(1000);
    desenhar();

    const terminar = () => {
      desenhando = false;
      if (raf) cancelAnimationFrame(raf);
      if (recorder.state !== 'inactive') recorder.stop();
    };

    video.addEventListener('ended', terminar, { once: true });
    timer = window.setTimeout(terminar, Math.ceil((meta.duracao + 4) * 1000));

    try {
      await video.play();
    } catch {
      terminar();
      throw new Error('O navegador bloqueou a compactação automática deste vídeo. Tente novamente após tocar na tela.');
    }

    const blob = await finalizado;
    progresso?.('Finalizando vídeo…');
    if (!blob.size) throw new Error('A compactação gerou um vídeo vazio.');

    const baseMime = mimeBase(blob.type || tipoRecorder) || 'video/mp4';
    return new File([blob], nomeSaida(file.name, baseMime), {
      type: baseMime,
      lastModified: Date.now(),
    });
  } finally {
    if (timer != null) window.clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf);
    try { video.pause(); } catch { /* nada */ }
    try { origemAudio?.disconnect(); } catch { /* nada */ }
    streamFinal?.getTracks().forEach((t) => t.stop());
    streamCanvas?.getTracks().forEach((t) => t.stop());
    if (fechaAudioAqui && audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => undefined);
    video.remove();
    URL.revokeObjectURL(url);
  }
}

export async function prepararVideoMemorias(file: File, progresso?: Progresso): Promise<VideoMemoriasPreparado> {
  if (!file.type.startsWith('video/')) throw new Error('Selecione um vídeo válido.');
  if (file.size > MEMORIAS_VIDEO_ORIGINAL_MAX_BYTES) {
    throw new Error(`O arquivo original é muito grande para processar no celular (máximo ${mb(MEMORIAS_VIDEO_ORIGINAL_MAX_BYTES)} MB).`);
  }

  // Criar/resumir o AudioContext antes dos primeiros awaits ajuda o Safari a
  // preservar o áudio usando a ativação que veio da escolha do arquivo. Ele é
  // mantido vivo até o fim da compactação e reaproveitado numa eventual 2ª passada.
  let contextoUsuario: AudioContext | null = null;
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      contextoUsuario = new Ctx();
      if (contextoUsuario.state === 'suspended') await contextoUsuario.resume().catch(() => undefined);
    }
  } catch { /* opcional */ }

  try {
    const probe = videoLocal(file);
    let meta: MetaVideo;
    try {
      progresso?.('Conferindo duração do vídeo…');
      meta = await carregarMeta(probe.video);
    } finally {
      probe.video.remove();
      URL.revokeObjectURL(probe.url);
    }

    if (!Number.isFinite(meta.duracao) || meta.duracao <= 0 || meta.duracao > MEMORIAS_VIDEO_MAX_SEGUNDOS + 0.25) {
      throw new Error(`O vídeo precisa ter no máximo ${MEMORIAS_VIDEO_MAX_SEGUNDOS} segundos.`);
    }
    if (!meta.largura || !meta.altura) {
      throw new Error('Não foi possível identificar as dimensões deste vídeo.');
    }

    // MP4/WebM pequenos não ganham nada sendo recodificados. QuickTime/MOV,
    // porém, passa pela conversão mesmo abaixo de 8 MB: é comum em iPhone e
    // pode usar HEVC, que falha em Chrome, algumas TVs e projetores.
    const mimeEntrada = mimeBase(file.type);
    if (
      file.size <= MEMORIAS_VIDEO_MAX_BYTES &&
      mimeOriginalAceito(file) &&
      mimeEntrada !== 'video/quicktime'
    ) {
      progresso?.('Vídeo pronto para enviar.');
      return {
        file,
        duracaoSegundos: meta.duracao,
        largura: meta.largura,
        altura: meta.altura,
        compactado: false,
      };
    }

    if (!mimeGravacao()) {
      throw new Error(
        `Este navegador não consegue compactar o vídeo localmente. Use um vídeo de até ${mb(MEMORIAS_VIDEO_MAX_BYTES)} MB ou tente pelo Safari/Chrome atualizado.`,
      );
    }

    progresso?.('Preparando compactação…');
    let compactado = await transcodificar(file, meta, bitratePara(meta.duracao), progresso, contextoUsuario);

    // Alguns engines ignoram o bitrate pedido. Se ultrapassar o teto, repete uma
    // vez com taxa conservadora; nunca envia acima do limite do bucket.
    if (compactado.size > MEMORIAS_VIDEO_MAX_BYTES) {
      progresso?.('Otimizando mais um pouco…');
      compactado = await transcodificar(file, meta, VIDEO_BPS_RETRY, progresso, contextoUsuario);
    }

    if (compactado.size > MEMORIAS_VIDEO_MAX_BYTES) {
      throw new Error(`Não foi possível reduzir este vídeo para menos de ${mb(MEMORIAS_VIDEO_MAX_BYTES)} MB.`);
    }

    const metaFinal = dimensoesSaida(meta.largura, meta.altura);
    return {
      file: compactado,
      duracaoSegundos: meta.duracao,
      largura: metaFinal.largura,
      altura: metaFinal.altura,
      compactado: true,
    };
  } finally {
    if (contextoUsuario && contextoUsuario.state !== 'closed') {
      await contextoUsuario.close().catch(() => undefined);
    }
  }
}
