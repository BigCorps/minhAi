'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lip-sync da FuncionarIA — V2 frontend.
 *
 * Mantem o desenho leve do motor atual: texto + currentTime do proprio audio,
 * com analise espectral como gate/fallback. Esta versao melhora tres pontos sem
 * exigir backend novo:
 *
 * 1. timeline de portugues com pausas e pesos mais naturais;
 * 2. coarticulacao/histerese: cada boca tem um tempo minimo coerente e silencio
 *    real pode fecha-la imediatamente;
 * 3. o React deixa de receber setState em todo requestAnimationFrame. O hook so
 *    publica quando visema/energia realmente mudaram.
 */

export type Viseme =
  | 'sil' | 'PP' | 'FF' | 'DD' | 'kk' | 'SS'
  | 'nn' | 'aa' | 'E' | 'I' | 'O' | 'U';

export const VISEME_ORDER: Viseme[] = [
  'sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U',
];

// ---------------------------------------------------------------------------
// Texto -> visemas
// ---------------------------------------------------------------------------

const VOWEL: Record<string, Viseme> = {
  a: 'aa', á: 'aa', â: 'aa', ã: 'aa', à: 'aa',
  e: 'E', é: 'E', ê: 'E',
  i: 'I', í: 'I', y: 'I',
  o: 'O', ó: 'O', ô: 'O', õ: 'O',
  u: 'U', ú: 'U', ü: 'U',
};

const CONSONANT: Record<string, Viseme> = {
  p: 'PP', b: 'PP', m: 'PP',
  f: 'FF', v: 'FF',
  t: 'DD', d: 'DD', n: 'DD', l: 'DD', r: 'DD',
  k: 'kk', g: 'kk', q: 'kk', c: 'kk',
  s: 'SS', z: 'SS', x: 'SS', j: 'SS', ç: 'SS',
  h: 'sil', w: 'U',
};

/** Consoantes cuja forma da boca vale a pena mostrar mesmo em passagem curta. */
const SALIENT = new Set<Viseme>(['PP', 'FF', 'SS', 'nn']);

const WEIGHT: Record<Viseme, number> = {
  sil: 1.0,
  PP: 0.52,
  FF: 0.58,
  DD: 0.38,
  kk: 0.42,
  SS: 0.62,
  nn: 0.52,
  aa: 1.18,
  E: 1.02,
  I: 0.92,
  O: 1.08,
  U: 0.98,
};

const MIN_HOLD_MS: Record<Viseme, number> = {
  sil: 34,
  PP: 54,
  FF: 56,
  DD: 46,
  kk: 48,
  SS: 58,
  nn: 54,
  aa: 72,
  E: 68,
  I: 64,
  O: 70,
  U: 66,
};

type Frame = { viseme: Viseme; start: number; end: number };
type Unit = { viseme: Viseme; weight: number };

function buildTimeline(text: string, duration: number): Frame[] {
  const clean = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const units: Unit[] = [];

  const push = (viseme: Viseme, weight = WEIGHT[viseme]) => {
    const last = units[units.length - 1];
    // Vogais repetidas em sequencia ficam como um unico gesto mais longo. Para
    // consoantes salientes, manter ocorrencias separadas evita apagar PP/FF.
    if (last?.viseme === viseme && !SALIENT.has(viseme) && viseme !== 'sil') {
      last.weight += weight * 0.62;
      return;
    }
    units.push({ viseme, weight });
  };

  let onset: Viseme | null = null;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1] || '';
    const pair = char + next;

    if (pair === 'ch' || pair === 'sh') { onset = 'SS'; i++; continue; }
    if (pair === 'nh' || pair === 'lh') { onset = 'nn'; i++; continue; }
    if (pair === 'ss') { onset = 'SS'; i++; continue; }
    if (pair === 'rr') { onset = 'DD'; i++; continue; }
    if (pair === 'qu' || pair === 'gu') { onset = 'kk'; i++; continue; }
    if ((char === 'c' || char === 'g') && (next === 'e' || next === 'i')) {
      onset = 'SS';
      continue;
    }

    const vowel = VOWEL[char];
    if (vowel) {
      if (onset && SALIENT.has(onset)) push(onset);
      onset = null;
      push(vowel);
      continue;
    }

    const consonant = CONSONANT[char];
    if (consonant) {
      // M no final e visualmente importante porque fecha os labios. Guardar o
      // onset permite emiti-lo caso uma pausa venha antes de outra vogal.
      onset = consonant;
      continue;
    }

    if (/[\s,;:]/.test(char)) {
      if (onset && SALIENT.has(onset)) push(onset);
      onset = null;
      push('sil', char === ' ' ? 0.28 : 0.62);
      continue;
    }

    if (/[.!?…—-]/.test(char)) {
      if (onset && SALIENT.has(onset)) push(onset);
      onset = null;
      push('sil', /[.!?…]/.test(char) ? 1.65 : 0.82);
    }
  }

  if (onset && SALIENT.has(onset)) push(onset);
  push('sil', 0.85);

  // Pequena margem para ataque/cauda naturais do TTS. O gate de energia ainda
  // e a autoridade final: se nao ha voz, a boca fecha independentemente daqui.
  const span = Math.max(0.2, duration);
  const guard = Math.min(0.08, span * 0.025);
  const usable = Math.max(0.12, span - guard * 2);
  const total = units.reduce((sum, unit) => sum + unit.weight, 0) || 1;

  let cursor = guard;
  const timeline = units.map(unit => {
    const width = (unit.weight / total) * usable;
    const frame: Frame = { viseme: unit.viseme, start: cursor, end: cursor + width };
    cursor += width;
    return frame;
  });

  if (guard > 0) timeline.unshift({ viseme: 'sil', start: 0, end: guard });
  return timeline;
}

function visemeAt(timeline: Frame[], time: number): Viseme {
  if (!timeline.length) return 'sil';
  let low = 0;
  let high = timeline.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const frame = timeline[mid];
    if (time < frame.start) high = mid - 1;
    else if (time >= frame.end) low = mid + 1;
    else return frame.viseme;
  }

  return 'sil';
}

// ---------------------------------------------------------------------------
// Analise de audio
// ---------------------------------------------------------------------------

type Graph = {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
};
const graphs = new WeakMap<HTMLAudioElement, Graph>();

function getGraph(audio: HTMLAudioElement): Graph | null {
  const existing = graphs.get(audio);
  if (existing) return existing;

  const Ctor = typeof window !== 'undefined'
    ? window.AudioContext || (window as any).webkitAudioContext
    : null;
  if (!Ctor) return null;

  try {
    const context: AudioContext = new Ctor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.58;
    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
    const graph = { context, analyser, source };
    graphs.set(audio, graph);
    return graph;
  } catch {
    return null;
  }
}

function band(spectrum: Uint8Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += spectrum[i];
  return sum / Math.max(1, to - from) / 255;
}

function fromSpectrum(spectrum: Uint8Array, level: number): Viseme {
  if (level < 0.055) return 'sil';

  // fftSize 1024 a 44.1kHz: cada bin ~43Hz.
  const low = band(spectrum, 2, 18);
  const mid = band(spectrum, 18, 70);
  const high = band(spectrum, 90, 200);

  if (high > low * 1.12 && high > 0.135) return 'SS';
  if (low > 0.29 && mid < low * 0.77) return level > 0.52 ? 'aa' : 'O';
  if (mid > low * 1.08) return level > 0.38 ? 'E' : 'I';
  if (level > 0.48) return 'aa';
  if (level > 0.24) return 'E';
  return 'U';
}

function rmsLevel(wave: Uint8Array): number {
  let squares = 0;
  for (let i = 0; i < wave.length; i++) {
    const value = (wave[i] - 128) / 128;
    squares += value * value;
  }
  const rms = Math.sqrt(squares / wave.length);
  return Math.max(0, Math.min(1, (rms - 0.0115) * 8.8));
}

// ---------------------------------------------------------------------------

export function useFuncionarIAViseme(
  audio: HTMLAudioElement | null,
  speaking: boolean,
  speechText?: string | null,
): { viseme: Viseme; level: number } {
  const [state, setState] = useState<{ viseme: Viseme; level: number }>({ viseme: 'sil', level: 0 });
  const timelineRef = useRef<Frame[]>([]);

  useEffect(() => {
    timelineRef.current = [];
    if (!audio || !speechText) return;

    const build = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0) timelineRef.current = buildTimeline(speechText, duration);
    };

    if (audio.readyState >= 1) build();
    audio.addEventListener('loadedmetadata', build);
    audio.addEventListener('durationchange', build);
    return () => {
      audio.removeEventListener('loadedmetadata', build);
      audio.removeEventListener('durationchange', build);
    };
  }, [audio, speechText]);

  useEffect(() => {
    if (!speaking) {
      setState({ viseme: 'sil', level: 0 });
      return;
    }

    // Previa do onboarding: sem audio real, variar devagar e com pausas curtas.
    if (!audio) {
      const pool: Viseme[] = ['aa', 'E', 'O', 'DD', 'I', 'PP', 'U', 'SS', 'E', 'aa', 'sil'];
      let index = 0;
      const timer = window.setInterval(() => {
        index = (index + 1 + Math.floor(Math.random() * 2)) % pool.length;
        const viseme = pool[index];
        setState({
          viseme,
          level: viseme === 'sil' ? 0.02 : 0.28 + Math.random() * 0.38,
        });
      }, 105 + Math.floor(Math.random() * 28));
      return () => {
        window.clearInterval(timer);
        setState({ viseme: 'sil', level: 0 });
      };
    }

    const graph = getGraph(audio);
    const spectrum = graph ? new Uint8Array(graph.analyser.frequencyBinCount) : null;
    const wave = graph ? new Uint8Array(graph.analyser.fftSize) : null;

    let raf = 0;
    let smooth = 0;
    let active: Viseme = 'sil';
    let heldUntil = 0;

    let publishedViseme: Viseme = 'sil';
    let publishedLevel = 0;
    let lastPublishedAt = 0;

    const publish = (viseme: Viseme, level: number, now: number) => {
      // 20 degraus sao mais do que suficientes para indicador de audio e
      // movimento corporal. Isso evita rerender por diferencas invisiveis.
      const quantized = Math.round(Math.max(0, Math.min(1, level)) * 20) / 20;
      const shouldPublish =
        viseme !== publishedViseme ||
        Math.abs(quantized - publishedLevel) >= 0.05 ||
        now - lastPublishedAt >= 120;

      if (!shouldPublish) return;
      publishedViseme = viseme;
      publishedLevel = quantized;
      lastPublishedAt = now;
      setState({ viseme, level: quantized });
    };

    const tick = () => {
      const now = performance.now();
      let detected: Viseme = 'sil';

      if (graph && spectrum && wave) {
        graph.analyser.getByteTimeDomainData(wave);
        const level = rmsLevel(wave);
        smooth = smooth * 0.60 + level * 0.40;

        graph.analyser.getByteFrequencyData(spectrum);
        detected = fromSpectrum(spectrum, smooth);
      } else {
        smooth = 0.30;
        detected = 'aa';
      }

      const timeline = timelineRef.current;
      let next = detected;

      if (timeline.length) {
        // Um pequeno look-ahead visual e natural em lip-sync: a boca inicia a
        // forma uma fracao antes do centro acustico do fonema.
        const visualTime = audio.currentTime + 0.024;
        next = smooth < 0.045 ? 'sil' : visemeAt(timeline, visualTime);
      }

      // Silencio real tem prioridade sobre a histerese. Para os demais frames,
      // o piso por visema elimina vibracao entre duas bocas em fronteiras.
      if (next === 'sil' && smooth < 0.038) {
        active = 'sil';
        heldUntil = now + MIN_HOLD_MS.sil;
      } else if (next !== active && now >= heldUntil) {
        active = next;
        heldUntil = now + MIN_HOLD_MS[next];
      }

      publish(active, smooth, now);
      raf = window.requestAnimationFrame(tick);
    };

    const resume = () => {
      if (graph && graph.context.state === 'suspended') void graph.context.resume();
    };

    audio.addEventListener('play', resume);
    resume();
    tick();

    return () => {
      window.cancelAnimationFrame(raf);
      audio.removeEventListener('play', resume);
      setState({ viseme: 'sil', level: 0 });
    };
  }, [audio, speaking]);

  return state;
}
