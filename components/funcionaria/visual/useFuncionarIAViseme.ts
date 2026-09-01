'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lip-sync da FuncionarIA.
 *
 * Substitui o `setInterval` de 145ms que percorria os visemes em loop sem olhar
 * para o áudio. Aquele loop é o que produz a leitura de "mandíbula batendo no
 * ritmo" — o mesmo defeito do avatar vetorial, só que com foto.
 *
 * Dois caminhos, em ordem de qualidade:
 *
 * 1. Com `speechText`: monta uma timeline de visemes a partir da grafia e a
 *    percorre com `audio.currentTime`. Fica travado no áudio, então não sai do
 *    lugar se o usuário pausar ou se a rede engasgar.
 * 2. Só com áudio: analisa três bandas de frequência. Grave/médio/agudo
 *    distinguem vogal aberta, vogal fechada e sibilante — bem melhor que
 *    amplitude única, e muito melhor que um cronômetro.
 *
 * O caminho 1 usa o 2 como gate: se o áudio está em silêncio, a boca fecha,
 * mesmo que a timeline discorde.
 */

export type Viseme =
  | 'sil' | 'PP' | 'FF' | 'DD' | 'kk' | 'SS'
  | 'nn' | 'aa' | 'E' | 'I' | 'O' | 'U';

export const VISEME_ORDER: Viseme[] = [
  'sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U',
];

// ---------------------------------------------------------------------------
// Texto → visemes
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

/** Consoantes que o olho realmente enxerga. As outras a gente pula. */
const SALIENT = new Set<Viseme>(['PP', 'FF', 'SS', 'nn']);

/** Vogal segura o frame, consoante passa rápido, ponto final abre pausa. */
const WEIGHT: Record<Viseme, number> = {
  sil: 1.6, PP: 0.5, FF: 0.55, DD: 0.4, kk: 0.45, SS: 0.6,
  nn: 0.5, aa: 1.15, E: 1.0, I: 0.9, O: 1.05, U: 0.95,
};

type Frame = { viseme: Viseme; start: number; end: number };

/**
 * O português é ortograficamente transparente, então regra de grafema resolve
 * ~90% sem dicionário de pronúncia. Emite a vogal de cada sílaba sempre, e a
 * consoante de ataque só quando ela é visualmente saliente.
 */
function buildTimeline(text: string, duration: number): Frame[] {
  const clean = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const units: Array<{ viseme: Viseme; weight: number }> = [];
  const push = (v: Viseme) => units.push({ viseme: v, weight: WEIGHT[v] });

  let onset: Viseme | null = null;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1] || '';
    const pair = char + next;

    if (pair === 'ch') { onset = 'SS'; i++; continue; }
    if (pair === 'nh' || pair === 'lh') { onset = 'nn'; i++; continue; }
    if (pair === 'ss') { onset = 'SS'; i++; continue; }
    if (pair === 'rr') { onset = 'DD'; i++; continue; }
    if (pair === 'qu' || pair === 'gu') { onset = 'kk'; i++; continue; }
    if ((char === 'c' || char === 'g') && (next === 'e' || next === 'i')) { onset = 'SS'; continue; }

    const vowel = VOWEL[char];
    if (vowel) {
      if (onset && SALIENT.has(onset)) push(onset);
      onset = null;
      if (units[units.length - 1]?.viseme !== vowel) push(vowel);
      continue;
    }

    const consonant = CONSONANT[char];
    if (consonant) { onset = consonant; continue; }

    if (/[\s.,;:!?…—-]/.test(char)) {
      if (onset && SALIENT.has(onset)) push(onset);
      onset = null;
      if (units[units.length - 1]?.viseme !== 'sil') {
        units.push({ viseme: 'sil', weight: /[.!?…]/.test(char) ? 2.4 : 0.9 });
      }
    }
  }

  if (onset && SALIENT.has(onset)) push(onset);
  units.push({ viseme: 'sil', weight: 1.2 });

  const total = units.reduce((sum, u) => sum + u.weight, 0) || 1;
  const span = Math.max(0.2, duration);
  let cursor = 0;

  return units.map(u => {
    const width = (u.weight / total) * span;
    const frame: Frame = { viseme: u.viseme, start: cursor, end: cursor + width };
    cursor += width;
    return frame;
  });
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
// Análise de áudio
// ---------------------------------------------------------------------------

type Graph = { context: AudioContext; analyser: AnalyserNode };
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
    analyser.smoothingTimeConstant = 0.55;
    context.createMediaElementSource(audio).connect(analyser);
    analyser.connect(context.destination);
    const graph = { context, analyser };
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
  if (level < 0.06) return 'sil';

  // fftSize 1024 a 44.1kHz: cada bin ≈ 43Hz
  const low = band(spectrum, 2, 18);     // ~85–775Hz  · abertura da mandíbula
  const mid = band(spectrum, 18, 70);    // ~775–3k    · posição da língua
  const high = band(spectrum, 90, 200);  // ~3.9k–8.6k · sibilância

  if (high > low * 1.15 && high > 0.14) return 'SS';
  if (low > 0.3 && mid < low * 0.75) return level > 0.55 ? 'aa' : 'O';
  if (mid > low * 1.1) return level > 0.4 ? 'E' : 'I';
  if (level > 0.45) return 'aa';
  if (level > 0.22) return 'E';
  return 'U';
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
    return () => audio.removeEventListener('loadedmetadata', build);
  }, [audio, speechText]);

  useEffect(() => {
    if (!speaking) {
      setState({ viseme: 'sil', level: 0 });
      return;
    }

    // Sem elemento de áudio (prévia do onboarding): ritmo plausível.
    if (!audio) {
      const pool: Viseme[] = ['aa', 'E', 'O', 'DD', 'I', 'PP', 'U', 'SS', 'E', 'aa'];
      let index = 0;
      const timer = window.setInterval(() => {
        index = (index + 1 + Math.floor(Math.random() * 2)) % pool.length;
        setState({ viseme: pool[index], level: 0.35 + Math.random() * 0.4 });
      }, 115);
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
    let last: Viseme = 'sil';
    let heldUntil = 0;

    const tick = () => {
      let detected: Viseme = 'sil';

      if (graph && spectrum && wave) {
        graph.analyser.getByteTimeDomainData(wave);
        let squares = 0;
        for (let i = 0; i < wave.length; i++) {
          const n = (wave[i] - 128) / 128;
          squares += n * n;
        }
        const rms = Math.sqrt(squares / wave.length);
        const level = Math.max(0, Math.min(1, (rms - 0.012) * 8.5));
        smooth = smooth * 0.55 + level * 0.45;

        graph.analyser.getByteFrequencyData(spectrum);
        detected = fromSpectrum(spectrum, smooth);
      } else {
        smooth = 0.3 + Math.random() * 0.35;
        detected = 'aa';
      }

      const timeline = timelineRef.current;
      let next = detected;
      if (timeline.length) {
        next = smooth < 0.05 ? 'sil' : visemeAt(timeline, audio.currentTime);
      }

      // Piso de 55ms por viseme: sem isso a boca vibra e vira desenho animado.
      const now = performance.now();
      if (next !== last && now >= heldUntil) {
        last = next;
        heldUntil = now + 55;
      }

      setState({ viseme: last, level: smooth });
      raf = requestAnimationFrame(tick);
    };

    const resume = () => {
      if (graph && graph.context.state === 'suspended') void graph.context.resume();
    };
    audio.addEventListener('play', resume);
    resume();
    tick();

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener('play', resume);
      setState({ viseme: 'sil', level: 0 });
    };
  }, [audio, speaking]);

  return state;
}
