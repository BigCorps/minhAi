'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lip-sync V4 da FuncionarIA.
 *
 * Continua 100% frontend: texto + currentTime do proprio audio + Web Audio.
 *
 * A gravacao V3 revelou o defeito estrutural que as calibracoes anteriores nao
 * conseguiam resolver: pagina publica e widget passavam `audioElement`, mas nao
 * passavam `speechText`. Com isso a boca caia no fallback espectral e a voz
 * feminina ficava classificada como O/U por trechos longos.
 *
 * O V4 le o texto exato que o hook de TTS grava no proprio HTMLAudioElement.
 * Quando existe texto, ele manda na identidade do visema e o Web Audio fica
 * responsavel principalmente por silencio e intensidade. Sem texto continua
 * existindo fallback espectral para compatibilidade.
 */

export type Viseme =
  | 'sil' | 'PP' | 'FF' | 'DD' | 'kk' | 'SS'
  | 'nn' | 'aa' | 'E' | 'I' | 'O' | 'U';

export const VISEME_ORDER: Viseme[] = [
  'sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U',
];

type FuncionarIATimedAudio = HTMLAudioElement & {
  __funcionariaSpeechText?: string;
};

const VOWELS = new Set<Viseme>(['aa', 'E', 'I', 'O', 'U']);
const CONSONANTS = new Set<Viseme>(['PP', 'FF', 'DD', 'kk', 'SS', 'nn']);

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
  t: 'DD', d: 'DD', l: 'DD', r: 'DD',
  n: 'nn',
  k: 'kk', g: 'kk', q: 'kk', c: 'kk',
  s: 'SS', z: 'SS', x: 'SS', j: 'SS', ç: 'SS',
  h: 'sil', w: 'U',
};

const WEIGHT: Record<Viseme, number> = {
  sil: 1.0,
  PP: 0.52,
  FF: 0.50,
  DD: 0.38,
  kk: 0.40,
  SS: 0.52,
  nn: 0.42,
  aa: 0.74,
  E: 0.70,
  I: 0.64,
  O: 0.70,
  U: 0.64,
};

const MIN_HOLD_MS: Record<Viseme, number> = {
  sil: 28,
  PP: 42,
  FF: 42,
  DD: 34,
  kk: 36,
  SS: 44,
  nn: 38,
  aa: 50,
  E: 48,
  I: 46,
  O: 50,
  U: 46,
};

type Frame = { viseme: Viseme; start: number; end: number };
type Unit = { viseme: Viseme; weight: number };

function buildTimeline(text: string, duration: number): Frame[] {
  const clean = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const units: Unit[] = [];

  const push = (viseme: Viseme, weight = WEIGHT[viseme]) => {
    if (weight <= 0) return;
    const last = units[units.length - 1];

    // Repeticoes iguais viram um gesto um pouco mais longo, em vez de duas
    // trocas invisiveis. Silencios adjacentes tambem sao somados.
    if (last?.viseme === viseme) {
      last.weight += weight * (viseme === 'sil' ? 1 : 0.72);
      return;
    }
    units.push({ viseme, weight });
  };

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1] || '';
    const pair = char + next;

    if (pair === 'ch' || pair === 'sh' || pair === 'ss') {
      push('SS'); i++; continue;
    }
    if (pair === 'nh' || pair === 'lh') {
      push('nn'); i++; continue;
    }
    if (pair === 'rr') {
      push('DD'); i++; continue;
    }
    if (pair === 'qu' || pair === 'gu') {
      push('kk'); i++; continue;
    }
    if ((char === 'c' || char === 'g') && (next === 'e' || next === 'é' || next === 'ê' || next === 'i' || next === 'í')) {
      push('SS');
      continue;
    }

    const vowel = VOWEL[char];
    if (vowel) {
      push(vowel);
      continue;
    }

    const consonant = CONSONANT[char];
    if (consonant) {
      // H isolado nao deve criar um quadro de boca fechada no meio da palavra.
      if (consonant !== 'sil') push(consonant);
      continue;
    }

    if (char === ' ') {
      // Espaco e apenas uma micro-pausa; o gate de audio decide se ela chega a
      // ficar visivel ou se a palavra seguinte emenda naturalmente.
      push('sil', 0.16);
      continue;
    }

    if (/[,;:]/.test(char)) {
      push('sil', char === ',' ? 0.48 : 0.64);
      continue;
    }

    if (/[.!?…]/.test(char)) {
      push('sil', 1.25);
      continue;
    }

    if (/[—-]/.test(char)) push('sil', 0.70);
  }

  push('sil', 0.68);

  const span = Math.max(0.2, duration);
  const guard = Math.min(0.055, span * 0.018);
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
    analyser.smoothingTimeConstant = 0.52;
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
  if (level < 0.050) return 'sil';

  const low = band(spectrum, 2, 18);
  const mid = band(spectrum, 18, 70);
  const high = band(spectrum, 90, 200);

  if (high > low * 1.14 && high > 0.14) return 'SS';
  if (low > 0.27 && mid < low * 0.78) return level > 0.46 ? 'O' : 'U';
  if (mid > low * 1.10) return level > 0.34 ? 'E' : 'I';
  if (level > 0.50) return 'aa';
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
  return Math.max(0, Math.min(1, (rms - 0.0105) * 8.6));
}

/**
 * A forma textual diz QUAL fonema estamos tentando mostrar. A energia diz QUANTO
 * a boca deve abrir. Como os assets sao discretos, usamos uma forma menos aberta
 * quando a voz esta fraca. Isso evita o "aa" enorme em quase toda silaba.
 */
function softenByEnergy(viseme: Viseme, level: number): Viseme {
  if (!VOWELS.has(viseme)) return viseme;

  if (viseme === 'aa') {
    if (level < 0.16) return 'I';
    if (level < 0.31) return 'E';
    return 'aa';
  }
  if (viseme === 'E') return level < 0.15 ? 'I' : 'E';
  if (viseme === 'O') return level < 0.20 ? 'U' : 'O';
  return viseme;
}

function textVisemeWithEnergy(viseme: Viseme, level: number): Viseme {
  return softenByEnergy(viseme, level);
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
    if (!audio) return;

    const embeddedText =
      (audio as FuncionarIATimedAudio).__funcionariaSpeechText?.trim() || '';
    const resolvedText = String(speechText || embeddedText || '').trim();
    if (!resolvedText) return;

    const build = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0) timelineRef.current = buildTimeline(resolvedText, duration);
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

    if (!audio) {
      const pool: Viseme[] = ['E', 'DD', 'aa', 'PP', 'I', 'SS', 'O', 'nn', 'E', 'U', 'sil'];
      let index = 0;
      const timer = window.setInterval(() => {
        index = (index + 1) % pool.length;
        const viseme = pool[index];
        setState({
          viseme,
          level: viseme === 'sil' ? 0.02 : 0.22 + Math.random() * 0.32,
        });
      }, 88 + Math.floor(Math.random() * 26));
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
        smooth = smooth * 0.48 + level * 0.52;

        graph.analyser.getByteFrequencyData(spectrum);
        detected = fromSpectrum(spectrum, smooth);
      } else {
        smooth = 0.28;
        detected = 'E';
      }

      const timeline = timelineRef.current;
      let next = detected;

      if (smooth < 0.036) {
        next = 'sil';
      } else if (timeline.length) {
        // O texto agora e a fonte primaria de QUAL boca usar. A energia do
        // audio decide apenas o quanto uma vogal deve abrir e se ha silencio.
        // Isso elimina o O/U prolongado observado na gravacao V3.
        const visualTime = audio.currentTime + 0.018;
        const textViseme = visemeAt(timeline, visualTime);

        if (textViseme === 'sil') {
          // Espacos curtos entre palavras nao devem escolher um novo fonema
          // aleatorio pelo espectro. Mantemos a forma anterior enquanto existe
          // voz; pausas reais ainda fecham pelo gate acima.
          next = active !== 'sil'
            ? active
            : (detected === 'sil' ? 'E' : softenByEnergy(detected, smooth));
        } else {
          next = textVisemeWithEnergy(textViseme, smooth);
        }
      } else {
        // Compatibilidade para qualquer audio externo que nao tenha o texto
        // anexado pelo useFuncionarIATTS.
        next = softenByEnergy(detected, smooth);
      }

      // Silencio real sempre ganha. Fora dele, uma forma fica no minimo alguns
      // milissegundos para a boca nao vibrar entre assets em fronteiras.
      if (next === 'sil') {
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
