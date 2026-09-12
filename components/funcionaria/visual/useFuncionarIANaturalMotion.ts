'use client';

import { useEffect, useRef, type RefObject } from 'react';

type Pose = {
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
};

const ZERO: Pose = { x: 0, y: 0, rotate: 0, scaleX: 1 };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function interpolate(from: Pose, to: Pose, t: number): Pose {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    rotate: lerp(from.rotate, to.rotate, t),
    scaleX: lerp(from.scaleX, to.scaleX, t),
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Poses pequenas de corpo inteiro.
 *
 * Nenhuma delas move braco/cabeca separadamente: o recorte inteiro se move
 * junto. Isso preserva cabelo, headset, ombros e uniforme sem criar emendas.
 * Os valores sao deliberadamente pequenos; a diferenca vem da variacao de
 * postura e das pausas, nao de amplitude alta.
 */
const IDLE_POSES: readonly Pose[] = [
  { x: 0.00, y: 0.00, rotate: 0.00, scaleX: 1.0000 },
  { x: -0.10, y: 0.01, rotate: -0.19, scaleX: 0.9998 },
  { x: 0.12, y: -0.01, rotate: 0.21, scaleX: 1.0001 },
  { x: -0.04, y: -0.045, rotate: -0.08, scaleX: 1.0003 },
  { x: 0.05, y: -0.035, rotate: 0.10, scaleX: 1.0002 },
];

const SPEAKING_POSES: readonly Pose[] = [
  { x: 0.00, y: -0.050, rotate: 0.00, scaleX: 1.0003 },
  { x: -0.055, y: -0.045, rotate: -0.11, scaleX: 1.0002 },
  { x: 0.065, y: -0.040, rotate: 0.13, scaleX: 1.0002 },
  { x: -0.025, y: -0.075, rotate: 0.05, scaleX: 1.0004 },
  { x: 0.030, y: -0.070, rotate: -0.04, scaleX: 1.0004 },
];

/**
 * Movimento natural V2 da FuncionarIA.
 *
 * O V1 somava senoides continuamente. Tecnicamente suave, mas o corpo nunca
 * parava de oscilar e, depois de algum tempo, podia parecer uma foto pendurada.
 *
 * O V2 trabalha em eventos:
 * - respira o tempo todo, quase imperceptivelmente;
 * - fica realmente parada por alguns segundos;
 * - muda de apoio devagar para uma nova micro-postura;
 * - durante a fala, faz raros micro-acenos e aproxima ligeiramente a postura;
 * - a energia do audio so colore o movimento, nunca faz o corpo "bater" por
 *   silaba.
 *
 * Tudo e um unico transform no elemento da figura. Nao ha canvas, video, IA,
 * modelo neural ou layout/re-render React a cada frame.
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
    let transitionDuration = 1500;
    let holdUntil = startedAt + 2600;

    let lastSpeaking = speakingRef.current;
    let energy = 0;

    let gestureStartedAt = -Infinity;
    let gestureDuration = 620;
    let gestureDirection = 1;
    let nextGestureAt = startedAt + 2800 + Math.random() * 2600;

    const schedulePose = (now: number, speakingNow: boolean, immediate = false) => {
      fromPose = toPose;
      toPose = pick(speakingNow ? SPEAKING_POSES : IDLE_POSES);
      transitionStartedAt = now;
      transitionDuration = immediate
        ? 900 + Math.random() * 350
        : speakingNow
          ? 1250 + Math.random() * 1350
          : 1800 + Math.random() * 2300;

      const hold = speakingNow
        ? 900 + Math.random() * 2100
        : 1800 + Math.random() * 4300;
      holdUntil = transitionStartedAt + transitionDuration + hold;
    };

    schedulePose(startedAt, lastSpeaking, true);

    const tick = (now: number) => {
      const speakingNow = speakingRef.current;

      // Trocar de estado nao reinicia o RAF nem zera a postura. Apenas agenda
      // um destino compativel e chega nele suavemente.
      if (speakingNow !== lastSpeaking) {
        const elapsed = Math.max(0, now - transitionStartedAt);
        const progress = easeInOut(elapsed / Math.max(1, transitionDuration));
        fromPose = interpolate(fromPose, toPose, progress);
        toPose = fromPose;
        lastSpeaking = speakingNow;
        schedulePose(now, speakingNow, true);
        nextGestureAt = now + 1500 + Math.random() * 2200;
      } else if (now >= holdUntil) {
        schedulePose(now, speakingNow);
      }

      const transitionElapsed = Math.max(0, now - transitionStartedAt);
      const transitionProgress = easeInOut(transitionElapsed / Math.max(1, transitionDuration));
      const pose = interpolate(fromPose, toPose, transitionProgress);

      const seconds = (now - startedAt) / 1000;

      // Respiracao: dois periodos longos e quase imperceptiveis. A soma impede
      // que o peito pareca um loop perfeito de GIF.
      const breathAmp = speakingNow ? 0.00165 : 0.00215;
      const breath = 1
        + breathAmp * (1 - Math.cos((2 * Math.PI * seconds) / 5.8)) * 0.5
        + 0.00065 * (1 - Math.cos((2 * Math.PI * seconds) / 9.7 + 1.1)) * 0.5;

      // Energia e suavizada de forma pesada. Assim a voz influencia a presenca
      // corporal sem fazer a figura subir/descer a cada fonema.
      const targetEnergy = speakingNow ? clamp01(levelRef.current) : 0;
      energy += (targetEnergy - energy) * (speakingNow ? 0.035 : 0.018);
      const voiceLift = speakingNow ? -energy * 0.020 : 0;
      const voiceScale = speakingNow ? energy * 0.00045 : 0;

      // Micro-aceno ocasional durante fala. Um arco unico, com inicio e fim no
      // mesmo lugar. Nao acontece em toda frase e nunca acompanha silabas.
      if (speakingNow && now >= nextGestureAt) {
        gestureStartedAt = now;
        gestureDuration = 520 + Math.random() * 300;
        gestureDirection = Math.random() < 0.5 ? -1 : 1;
        nextGestureAt = now + 2600 + Math.random() * 3400;
      }

      let gestureY = 0;
      let gestureRotate = 0;
      const gestureProgress = (now - gestureStartedAt) / gestureDuration;
      if (gestureProgress >= 0 && gestureProgress <= 1) {
        const arc = Math.sin(Math.PI * gestureProgress);
        gestureY = 0.055 * arc;
        gestureRotate = 0.055 * gestureDirection * arc;
      }

      const x = pose.x;
      const y = pose.y + voiceLift + gestureY;
      const rotate = pose.rotate + gestureRotate;
      const scaleX = pose.scaleX;
      const scaleY = breath + voiceScale;

      element.style.transform =
        `translate(${x.toFixed(4)}%, ${y.toFixed(4)}%) ` +
        `rotate(${rotate.toFixed(4)}deg) ` +
        `scaleX(${scaleX.toFixed(5)}) scaleY(${scaleY.toFixed(5)})`;

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      element.style.transform = '';
    };
  }, [target]);
}
