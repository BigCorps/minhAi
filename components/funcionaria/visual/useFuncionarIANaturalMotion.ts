'use client';

import { useEffect, useRef, type RefObject } from 'react';

type Pose = {
  x: number;
  y: number;
  rotate: number;
  zoom: number;
};

type GestureKind = 'nod' | 'tilt' | 'emphasis' | 'settle';
type SpeechCue = { at: number; kind: GestureKind };

type FuncionarIAAudio = HTMLAudioElement & {
  __funcionariaSpeechText?: string;
};

const ZERO: Pose = { x: 0, y: 0, rotate: 0, zoom: 1 };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const smootherstep = (value: number) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function interpolate(from: Pose, to: Pose, t: number): Pose {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    rotate: lerp(from.rotate, to.rotate, t),
    zoom: lerp(from.zoom, to.zoom, t),
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * O corpo fica deliberadamente mais calmo que na V4. A V7 adiciona uma camada
 * independente de cabeça, então o tronco não precisa "balançar" para transmitir
 * vida. O ganho vem da combinação de pequenos apoios + cabeça + respiração.
 */
const IDLE_POSES: readonly Pose[] = [
  { x: 0.00, y: 0.000, rotate: 0.00, zoom: 1.0000 },
  { x: -0.22, y: 0.000, rotate: -0.28, zoom: 1.0003 },
  { x: 0.23, y: -0.005, rotate: 0.30, zoom: 1.0004 },
  { x: -0.10, y: -0.060, rotate: -0.12, zoom: 1.0008 },
  { x: 0.11, y: -0.055, rotate: 0.13, zoom: 1.0008 },
];

const SPEAKING_POSES: readonly Pose[] = [
  { x: 0.00, y: -0.080, rotate: 0.00, zoom: 1.0012 },
  { x: -0.12, y: -0.075, rotate: -0.16, zoom: 1.0011 },
  { x: 0.13, y: -0.070, rotate: 0.17, zoom: 1.0011 },
  { x: -0.05, y: -0.105, rotate: 0.07, zoom: 1.0014 },
  { x: 0.06, y: -0.100, rotate: -0.06, zoom: 1.0014 },
];

function readSpeechText(audio: HTMLAudioElement | null, explicit?: string | null): string {
  const direct = String(explicit || '').trim();
  if (direct) return direct;
  return String((audio as FuncionarIAAudio | null)?.__funcionariaSpeechText || '').trim();
}

/**
 * Texto -> pontos de comportamento, não de lip-sync.
 *
 * A duração real continua sendo o relógio mestre: guardamos cada marcador como
 * fração do texto e comparamos com currentTime/duration. Não tenta adivinhar cada
 * palavra; só cria poucos "beats" semânticos, como o Lanshu recomenda para
 * gestos controlados que acontecem e depois assentam.
 */
function buildSpeechCues(text: string): SpeechCue[] {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const cues: SpeechCue[] = [];
  const length = Math.max(1, clean.length);
  let lastAt = -1;

  const add = (index: number, kind: GestureKind) => {
    const at = clamp01(index / length);
    // Evita uma coreografia em toda vírgula. Gestos precisam ser raros.
    if (lastAt >= 0 && at - lastAt < 0.13) return;
    cues.push({ at, kind });
    lastAt = at;
  };

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '?') add(i, 'tilt');
    else if (char === '!') add(i, 'emphasis');
    else if (char === '.' || char === '…') add(i, 'nod');
    else if (char === ',' || char === ';' || char === ':') add(i, 'settle');
  }

  // Frases sem pontuação ainda recebem no máximo um gesto perto do fechamento.
  if (!cues.length && clean.length > 26) cues.push({ at: 0.72, kind: 'nod' });
  return cues.slice(0, 4);
}

/**
 * FuncionarIA Natural Motion V7.
 *
 * Três princípios:
 * 1. corpo e cabeça têm escalas de movimento diferentes;
 * 2. áudio é o relógio mestre durante a fala;
 * 3. movimento acontece, assenta e volta ao repouso — nunca vira um loop de
 *    "boneco balançando".
 *
 * O `headTarget` deve ser um overlay fotográfico do mesmo rosto. Ele recebe
 * transformações mínimas ao redor do pescoço; boca e piscada vivem dentro desse
 * mesmo grupo e acompanham a cabeça sem desalinhamento.
 */
export function useFuncionarIANaturalMotion(
  bodyTarget: RefObject<HTMLDivElement | null>,
  headTarget: RefObject<HTMLDivElement | null>,
  speaking: boolean,
  level: number,
  audio: HTMLAudioElement | null,
  speechText?: string | null,
) {
  const speakingRef = useRef(speaking);
  const levelRef = useRef(level);
  const audioRef = useRef(audio);
  const textRef = useRef(readSpeechText(audio, speechText));

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => {
    audioRef.current = audio;
    textRef.current = readSpeechText(audio, speechText);
  }, [audio, speechText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const body = bodyTarget.current;
    const head = headTarget.current;
    if (!body || !head) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      body.style.transform = '';
      head.style.transform = '';
      return;
    }

    const startedAt = performance.now();
    let raf = 0;

    // ---------------------------------------------------------------------
    // Corpo: mudança lenta de apoio
    // ---------------------------------------------------------------------
    let bodyFrom: Pose = ZERO;
    let bodyTo: Pose = ZERO;
    let bodyTransitionAt = startedAt;
    let bodyTransitionDuration = 1100;
    let bodyHoldUntil = startedAt + 2400;

    const bodyPoseAt = (now: number) => {
      const p = smootherstep((now - bodyTransitionAt) / Math.max(1, bodyTransitionDuration));
      return interpolate(bodyFrom, bodyTo, p);
    };

    const scheduleBody = (now: number, speakingNow: boolean, quicker = false) => {
      bodyFrom = bodyPoseAt(now);
      bodyTo = pick(speakingNow ? SPEAKING_POSES : IDLE_POSES);
      bodyTransitionAt = now;
      bodyTransitionDuration = quicker
        ? 620 + Math.random() * 260
        : speakingNow
          ? 1450 + Math.random() * 1300
          : 2600 + Math.random() * 3200;
      bodyHoldUntil = bodyTransitionAt + bodyTransitionDuration + (
        speakingNow
          ? 900 + Math.random() * 1900
          : 2200 + Math.random() * 4600
      );
    };

    // ---------------------------------------------------------------------
    // Cabeça: orientação, "olhar" por pose e gestos semânticos
    // ---------------------------------------------------------------------
    let headBaseFrom: Pose = ZERO;
    let headBaseTo: Pose = ZERO;
    let headTransitionAt = startedAt;
    let headTransitionDuration = 500;
    let nextIdleGlanceAt = startedAt + 3800 + Math.random() * 2800;
    let glanceReturnAt = -Infinity;
    let glanceDirection = 0;

    const headBaseAt = (now: number) => {
      const p = smootherstep((now - headTransitionAt) / Math.max(1, headTransitionDuration));
      return interpolate(headBaseFrom, headBaseTo, p);
    };

    const setHeadBase = (now: number, target: Pose, duration: number) => {
      headBaseFrom = headBaseAt(now);
      headBaseTo = target;
      headTransitionAt = now;
      headTransitionDuration = duration;
    };

    const centerHead = (now: number, speakingNow: boolean) => {
      setHeadBase(now, {
        x: 0,
        y: speakingNow ? -0.025 : 0,
        rotate: 0,
        zoom: speakingNow ? 1.0006 : 1,
      }, 420 + Math.random() * 180);
      glanceDirection = 0;
    };

    const startIdleGlance = (now: number) => {
      const direction = Math.random() < 0.5 ? -1 : 1;
      glanceDirection = direction;
      setHeadBase(now, {
        x: 0.070 * direction,
        y: -0.010,
        rotate: 0.20 * direction,
        zoom: 1.0003,
      }, 380 + Math.random() * 190);
      glanceReturnAt = now + 420 + Math.random() * 620;
    };

    let gestureKind: GestureKind = 'nod';
    let gestureStartedAt = -Infinity;
    let gestureDuration = 620;
    let gestureDirection = 1;
    let gestureStrength = 1;
    let gestureCooldownUntil = startedAt;

    const startGesture = (now: number, kind: GestureKind, strength = 1) => {
      if (now < gestureCooldownUntil && kind !== 'settle') return;
      gestureKind = kind;
      gestureStartedAt = now;
      gestureDirection = Math.random() < 0.5 ? -1 : 1;
      gestureStrength = Math.max(0.72, Math.min(1.18, strength));
      gestureDuration = kind === 'tilt'
        ? 760 + Math.random() * 180
        : kind === 'settle'
          ? 430 + Math.random() * 120
          : 520 + Math.random() * 180;
      gestureCooldownUntil = now + (kind === 'settle' ? 500 : 1150);
    };

    // ---------------------------------------------------------------------
    // Cues da fala e detecção de energia
    // ---------------------------------------------------------------------
    let lastSpeaking = speakingRef.current;
    let lastText = textRef.current;
    let cues = buildSpeechCues(lastText);
    let cueIndex = 0;
    let energy = 0;
    let previousEnergy = 0;
    let lastEnergyGestureAt = -Infinity;

    const resetSpeechPlan = () => {
      lastText = readSpeechText(audioRef.current, textRef.current);
      cues = buildSpeechCues(lastText);
      cueIndex = 0;
    };

    bodyFrom = ZERO;
    bodyTo = pick(lastSpeaking ? SPEAKING_POSES : IDLE_POSES);
    bodyTransitionAt = startedAt;
    bodyTransitionDuration = 850 + Math.random() * 350;
    bodyHoldUntil = startedAt + bodyTransitionDuration + 1400 + Math.random() * 1800;
    centerHead(startedAt, lastSpeaking);

    const tick = (now: number) => {
      const speakingNow = speakingRef.current;

      if (speakingNow !== lastSpeaking) {
        lastSpeaking = speakingNow;
        scheduleBody(now, speakingNow, true);
        centerHead(now, speakingNow);
        if (speakingNow) {
          resetSpeechPlan();
          // Um início discreto dá sensação de "entrar na conversa" sem gesto teatral.
          gestureCooldownUntil = now + 260;
        } else {
          nextIdleGlanceAt = now + 3100 + Math.random() * 3100;
          glanceReturnAt = -Infinity;
        }
      }

      if (now >= bodyHoldUntil) scheduleBody(now, speakingNow);

      // Se o texto foi associado ao audio depois do play, atualiza o plano uma vez.
      const currentText = readSpeechText(audioRef.current, textRef.current);
      if (speakingNow && currentText && currentText !== lastText) {
        lastText = currentText;
        cues = buildSpeechCues(currentText);
        cueIndex = 0;
      }

      // Idle: raros desvios de cabeça e retorno ao contato visual.
      if (!speakingNow) {
        if (!glanceDirection && now >= nextIdleGlanceAt) startIdleGlance(now);
        if (glanceDirection && now >= glanceReturnAt) {
          centerHead(now, false);
          nextIdleGlanceAt = now + 4300 + Math.random() * 3900;
        }
      }

      // Fala: os pontos de pontuação usam a duração real do audio como master clock.
      const currentAudio = audioRef.current;
      if (speakingNow && currentAudio && Number.isFinite(currentAudio.duration) && currentAudio.duration > 0) {
        const ratio = clamp01(currentAudio.currentTime / currentAudio.duration);
        while (cueIndex < cues.length && ratio >= cues[cueIndex].at) {
          const cue = cues[cueIndex++];
          if (cue.kind === 'settle') {
            centerHead(now, true);
            startGesture(now, 'settle', 0.82);
          } else if (cue.kind === 'tilt') {
            startGesture(now, 'tilt', 0.95);
          } else if (cue.kind === 'emphasis') {
            startGesture(now, 'emphasis', 1.05);
          } else {
            startGesture(now, 'nod', 0.92);
          }
        }
      }

      const targetEnergy = speakingNow ? clamp01(levelRef.current) : 0;
      previousEnergy = energy;
      energy += (targetEnergy - energy) * (speakingNow ? 0.050 : 0.022);

      // Pico de voz pode criar uma ênfase, mas no máximo uma a cada ~1.5 s.
      const rising = energy - previousEnergy;
      if (
        speakingNow &&
        energy > 0.50 &&
        rising > 0.010 &&
        now - lastEnergyGestureAt > 1500 &&
        now >= gestureCooldownUntil
      ) {
        startGesture(now, 'emphasis', 0.80 + energy * 0.30);
        lastEnergyGestureAt = now;
      }

      const bodyPose = bodyPoseAt(now);
      const headPose = headBaseAt(now);
      const seconds = (now - startedAt) / 1000;

      // Respiração fica no corpo; cabeça não "respira" separadamente.
      const breathAmp = speakingNow ? 0.00125 : 0.00210;
      const breath = 1
        + breathAmp * (1 - Math.cos((2 * Math.PI * seconds) / 5.7)) * 0.5
        + 0.00055 * (1 - Math.cos((2 * Math.PI * seconds) / 9.8 + 1.1)) * 0.5;

      const voiceLift = speakingNow ? -energy * 0.035 : 0;
      const voiceZoom = speakingNow ? energy * 0.00070 : 0;

      let headGestureX = 0;
      let headGestureY = 0;
      let headGestureRotate = 0;
      let headGestureZoom = 0;
      let bodyGestureX = 0;
      let bodyGestureY = 0;
      let bodyGestureRotate = 0;

      const gp = (now - gestureStartedAt) / gestureDuration;
      if (gp >= 0 && gp <= 1) {
        const p = smoothstep(gp);
        const arc = Math.sin(Math.PI * p);

        if (gestureKind === 'nod') {
          headGestureY = 0.125 * gestureStrength * arc;
          headGestureRotate = 0.045 * gestureDirection * gestureStrength * arc;
          bodyGestureY = 0.030 * gestureStrength * arc;
        } else if (gestureKind === 'tilt') {
          headGestureX = 0.075 * gestureDirection * gestureStrength * arc;
          headGestureRotate = 0.30 * gestureDirection * gestureStrength * arc;
          headGestureY = -0.018 * gestureStrength * arc;
          bodyGestureRotate = 0.035 * gestureDirection * gestureStrength * arc;
        } else if (gestureKind === 'emphasis') {
          headGestureY = 0.085 * gestureStrength * arc;
          headGestureRotate = 0.075 * gestureDirection * gestureStrength * arc;
          headGestureZoom = 0.00085 * gestureStrength * arc;
          bodyGestureX = 0.035 * gestureDirection * gestureStrength * arc;
          bodyGestureY = 0.018 * gestureStrength * arc;
        } else {
          // "settle": um pequeno assentamento e retorno ao centro.
          headGestureY = 0.035 * gestureStrength * arc;
          headGestureRotate = -headPose.rotate * 0.45 * arc;
        }
      }

      const bodyX = bodyPose.x + bodyGestureX;
      const bodyY = bodyPose.y + voiceLift + bodyGestureY;
      const bodyRotate = bodyPose.rotate + bodyGestureRotate;
      const bodyScale = bodyPose.zoom + voiceZoom;
      const bodyScaleY = bodyScale * breath;

      body.style.transform =
        `translate(${bodyX.toFixed(4)}%, ${bodyY.toFixed(4)}%) ` +
        `rotate(${bodyRotate.toFixed(4)}deg) ` +
        `scaleX(${bodyScale.toFixed(5)}) scaleY(${bodyScaleY.toFixed(5)})`;

      const headX = headPose.x + headGestureX;
      const headY = headPose.y + headGestureY;
      const headRotate = headPose.rotate + headGestureRotate;
      const headScale = headPose.zoom + headGestureZoom;

      head.style.transform =
        `translate(${headX.toFixed(4)}%, ${headY.toFixed(4)}%) ` +
        `rotate(${headRotate.toFixed(4)}deg) ` +
        `scale(${headScale.toFixed(5)})`;

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      body.style.transform = '';
      head.style.transform = '';
    };
  }, [bodyTarget, headTarget]);
}
