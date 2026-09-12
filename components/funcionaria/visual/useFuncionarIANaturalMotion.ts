'use client';

import { useEffect, useRef, type RefObject } from 'react';

type Pose = {
  x: number;
  y: number;
  rotate: number;
  zoom: number;
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
 * V3: amplitudes ainda pequenas, mas agora perceptiveis na tela real.
 *
 * No video de validacao do V2 o cabelo se deslocava somente 3-4 px durante
 * varios segundos. Isso e tecnicamente movimento, mas visualmente parece uma
 * foto parada. Os destinos abaixo foram ampliados com cuidado: a cabeca anda
 * poucos pixels e a rotacao continua abaixo de 0,6 grau.
 */
const IDLE_POSES: readonly Pose[] = [
  { x: 0.00, y: 0.00, rotate: 0.00, zoom: 1.0000 },
  { x: -0.22, y: 0.00, rotate: -0.36, zoom: 1.0003 },
  { x: 0.24, y: -0.01, rotate: 0.39, zoom: 1.0004 },
  { x: -0.10, y: -0.075, rotate: -0.15, zoom: 1.0010 },
  { x: 0.12, y: -0.065, rotate: 0.17, zoom: 1.0009 },
  { x: -0.26, y: -0.025, rotate: -0.48, zoom: 1.0002 },
  { x: 0.27, y: -0.020, rotate: 0.50, zoom: 1.0002 },
];

const SPEAKING_POSES: readonly Pose[] = [
  { x: 0.00, y: -0.085, rotate: 0.00, zoom: 1.0012 },
  { x: -0.14, y: -0.080, rotate: -0.22, zoom: 1.0011 },
  { x: 0.15, y: -0.075, rotate: 0.24, zoom: 1.0011 },
  { x: -0.06, y: -0.115, rotate: 0.10, zoom: 1.0015 },
  { x: 0.07, y: -0.110, rotate: -0.09, zoom: 1.0015 },
];

/**
 * Movimento corporal natural e leve da FuncionarIA.
 *
 * - nada de video/canvas/modelo neural;
 * - um unico requestAnimationFrame;
 * - longos periodos de quase repouso;
 * - mudanca lenta de apoio;
 * - durante fala, raros micro-acenos e pequenas enfases;
 * - audio influencia presenca, nao cada silaba.
 */
export function useFuncionarIANaturalMotion(
  target: RefObject<HTMLDivElement | null>,
  speaking: boolean,
  level: number,
) {
  const speakingRef = useRef(speaking);
  const levelRef = useRef(level);

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const element = target.current;
    if (!element) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.style.transform = '';
      return;
    }

    const startedAt = performance.now();
    let raf = 0;

    let fromPose: Pose = ZERO;
    let toPose: Pose = ZERO;
    let transitionStartedAt = startedAt;
    let transitionDuration = 1100;
    let holdUntil = startedAt + 2400;

    let lastSpeaking = speakingRef.current;
    let energy = 0;

    type GestureKind = 'nod' | 'emphasis';
    let gestureKind: GestureKind = 'nod';
    let gestureStartedAt = -Infinity;
    let gestureDuration = 600;
    let gestureDirection = 1;
    let gestureStrength = 1;
    let nextGestureAt = startedAt + 1900 + Math.random() * 1800;

    const currentPose = (now: number) => {
      const elapsed = Math.max(0, now - transitionStartedAt);
      const progress = smootherstep(elapsed / Math.max(1, transitionDuration));
      return interpolate(fromPose, toPose, progress);
    };

    const schedulePose = (now: number, speakingNow: boolean, quicker = false) => {
      fromPose = currentPose(now);
      toPose = pick(speakingNow ? SPEAKING_POSES : IDLE_POSES);
      transitionStartedAt = now;

      transitionDuration = quicker
        ? 650 + Math.random() * 300
        : speakingNow
          ? 1050 + Math.random() * 1150
          : 1900 + Math.random() * 2400;

      const hold = speakingNow
        ? 650 + Math.random() * 1500
        : 1500 + Math.random() * 3900;
      holdUntil = transitionStartedAt + transitionDuration + hold;
    };

    // Primeiro destino parte exatamente da pose neutra.
    fromPose = ZERO;
    toPose = pick(lastSpeaking ? SPEAKING_POSES : IDLE_POSES);
    transitionStartedAt = startedAt;
    transitionDuration = 900 + Math.random() * 350;
    holdUntil = startedAt + transitionDuration + 1500 + Math.random() * 1800;

    const scheduleGesture = (now: number) => {
      gestureKind = Math.random() < 0.70 ? 'nod' : 'emphasis';
      gestureStartedAt = now;
      gestureDuration = gestureKind === 'nod'
        ? 500 + Math.random() * 240
        : 650 + Math.random() * 320;
      gestureDirection = Math.random() < 0.5 ? -1 : 1;
      gestureStrength = 0.82 + Math.random() * 0.36;
      nextGestureAt = now + 1900 + Math.random() * 2800;
    };

    const tick = (now: number) => {
      const speakingNow = speakingRef.current;

      if (speakingNow !== lastSpeaking) {
        lastSpeaking = speakingNow;
        schedulePose(now, speakingNow, true);
        nextGestureAt = now + 1100 + Math.random() * 1500;
      } else if (now >= holdUntil) {
        schedulePose(now, speakingNow);
      }

      const pose = currentPose(now);
      const seconds = (now - startedAt) / 1000;

      // Respiracao muito pequena e ancorada no rodape. Dois periodos evitam
      // que o usuario reconheca um loop perfeito.
      const breathAmp = speakingNow ? 0.00145 : 0.00225;
      const breath = 1
        + breathAmp * (1 - Math.cos((2 * Math.PI * seconds) / 5.6)) * 0.5
        + 0.00070 * (1 - Math.cos((2 * Math.PI * seconds) / 9.3 + 1.2)) * 0.5;

      // Suavizacao forte da energia: fala mais presente aproxima minimamente o
      // corpo, mas nao existe "quique" por fonema.
      const targetEnergy = speakingNow ? clamp01(levelRef.current) : 0;
      energy += (targetEnergy - energy) * (speakingNow ? 0.045 : 0.020);
      const voiceLift = speakingNow ? -energy * 0.035 : 0;
      const voiceZoom = speakingNow ? energy * 0.00075 : 0;

      if (speakingNow && now >= nextGestureAt) scheduleGesture(now);

      let gestureX = 0;
      let gestureY = 0;
      let gestureRotate = 0;
      let gestureZoom = 0;
      const gp = (now - gestureStartedAt) / gestureDuration;

      if (gp >= 0 && gp <= 1) {
        // Um arco sobe e volta ao mesmo ponto; portanto nenhum gesto deixa
        // drift acumulado na pose.
        const arc = Math.sin(Math.PI * smoothstep(gp));
        if (gestureKind === 'nod') {
          gestureY = 0.105 * gestureStrength * arc;
          gestureRotate = 0.060 * gestureDirection * gestureStrength * arc;
          gestureZoom = 0.00055 * gestureStrength * arc;
        } else {
          gestureX = 0.085 * gestureDirection * gestureStrength * arc;
          gestureRotate = 0.115 * gestureDirection * gestureStrength * arc;
          gestureZoom = 0.00040 * gestureStrength * arc;
        }
      }

      const x = pose.x + gestureX;
      const y = pose.y + voiceLift + gestureY;
      const rotate = pose.rotate + gestureRotate;
      const scale = pose.zoom + voiceZoom + gestureZoom;
      const scaleY = scale * breath;

      element.style.transform =
        `translate(${x.toFixed(4)}%, ${y.toFixed(4)}%) ` +
        `rotate(${rotate.toFixed(4)}deg) ` +
        `scaleX(${scale.toFixed(5)}) scaleY(${scaleY.toFixed(5)})`;

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      element.style.transform = '';
    };
  }, [target]);
}
