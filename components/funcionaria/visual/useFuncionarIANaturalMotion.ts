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
 * O corpo continua deliberadamente mais calmo que a cabeça.
 * Nesta fase B1 o ganho principal vem de intenção e timing, não de amplitude.
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

function normalizeWord(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function pushCue(cues: SpeechCue[], at: number, kind: GestureKind) {
  const t = clamp01(at);
  const last = cues[cues.length - 1];
  if (last && Math.abs(last.at - t) < 0.11) return;
  cues.push({ at: t, kind });
}

/**
 * B1: timing semântico melhor.
 *
 * Em vez de usar proporção de caracteres, esta versão usa progressão por palavra
 * e identifica alguns sinais simples do português coloquial: confirmações no
 * começo da fala, perguntas e pontos de fechamento. Assim a cabeça reage de
 * maneira mais "intencional", inspirada na filosofia do Lanshu/Duix, mas ainda
 * 100% leve e determinística.
 */
function buildSpeechCues(text: string): SpeechCue[] {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const tokens = Array.from(clean.matchAll(/[A-Za-zÀ-ÿ0-9]+|[?!.,;:…]/g)).map(match => match[0]);
  const words = tokens.filter(token => /[A-Za-zÀ-ÿ0-9]/.test(token));
  const totalWords = Math.max(1, words.length);
  const cues: SpeechCue[] = [];

  const lead = words.slice(0, 4).map(normalizeWord);
  const joinedLead = lead.join(' ');
  const affirmative = new Set([
    'sim', 'claro', 'perfeito', 'certo', 'ok', 'okay', 'otimo', 'ótimo',
    'combinado', 'isso', 'pronto', 'beleza', 'exato'
  ]);
  const reflectiveStart = [
    'vou verificar', 'deixe me', 'deixa eu', 'vamos ver', 'um momento', 'aguarde'
  ];

  if (lead.some(word => affirmative.has(word))) pushCue(cues, 0.14, 'nod');
  else if (reflectiveStart.some(pattern => joinedLead.startsWith(pattern))) pushCue(cues, 0.18, 'tilt');

  let wordIndex = 0;
  for (const token of tokens) {
    if (/[A-Za-zÀ-ÿ0-9]/.test(token)) {
      wordIndex += 1;
      continue;
    }

    // Usa a quantidade de palavras consumidas como relógio aproximado.
    const ratio = (wordIndex + 0.15) / totalWords;
    if (token === '?') pushCue(cues, ratio, 'tilt');
    else if (token === '!') pushCue(cues, ratio, 'emphasis');
    else if (token === '.' || token === '…') pushCue(cues, ratio, 'nod');
    else if (token === ',' || token === ';' || token === ':') pushCue(cues, ratio, 'settle');
  }

  if (!cues.length) {
    if (totalWords >= 12) {
      pushCue(cues, 0.36, 'emphasis');
      pushCue(cues, 0.76, 'nod');
    } else if (totalWords >= 6) {
      pushCue(cues, 0.68, 'nod');
    }
  }

  cues.sort((a, b) => a.at - b.at);
  return cues.slice(0, 5);
}

/**
 * FuncionarIA Natural Motion V9 — Fase B1.
 *
 * Melhorias desta rodada:
 * - timing de gestos por palavra/pontuação, não por caracteres;
 * - entrada de fala mais natural (aproximação + primeiro gesto cedo);
 * - corpo mais calmo e cabeça mais "intencional";
 * - pequenos desvios atentos em repouso, sem parecer loop mecânico.
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
        ? 620 + Math.random() * 240
        : speakingNow
          ? 1500 + Math.random() * 1200
          : 2700 + Math.random() * 3200;
      bodyHoldUntil = bodyTransitionAt + bodyTransitionDuration + (
        speakingNow
          ? 1100 + Math.random() * 1800
          : 2500 + Math.random() * 4500
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
        y: speakingNow ? -0.023 : 0,
        rotate: 0,
        zoom: speakingNow ? 1.0007 : 1,
      }, 430 + Math.random() * 170);
      glanceDirection = 0;
    };

    const enterSpeakingPose = (now: number) => {
      setHeadBase(now, {
        x: 0,
        y: -0.030,
        rotate: 0,
        zoom: 1.0010,
      }, 320 + Math.random() * 120);
      glanceDirection = 0;
    };

    const startIdleGlance = (now: number) => {
      const direction = Math.random() < 0.5 ? -1 : 1;
      glanceDirection = direction;
      const down = Math.random() < 0.28;
      setHeadBase(now, {
        x: 0.060 * direction,
        y: down ? 0.012 : -0.008,
        rotate: 0.18 * direction,
        zoom: 1.0002,
      }, 360 + Math.random() * 160);
      glanceReturnAt = now + 420 + Math.random() * 680;
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
      gestureStrength = Math.max(0.70, Math.min(1.20, strength));
      gestureDuration = kind === 'tilt'
        ? 760 + Math.random() * 180
        : kind === 'settle'
          ? 440 + Math.random() * 120
          : 520 + Math.random() * 170;
      gestureCooldownUntil = now + (kind === 'settle' ? 520 : 1080);
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
    let scheduledEntryGestureAt = -Infinity;
    let scheduledEntryGestureDone = true;

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
        if (speakingNow) {
          enterSpeakingPose(now);
          resetSpeechPlan();
          scheduledEntryGestureAt = now + 260 + Math.random() * 260;
          scheduledEntryGestureDone = false;
          gestureCooldownUntil = now + 220;
        } else {
          centerHead(now, false);
          startGesture(now, 'settle', 0.9);
          nextIdleGlanceAt = now + 3000 + Math.random() * 3200;
          glanceReturnAt = -Infinity;
        }
      }

      if (now >= bodyHoldUntil) scheduleBody(now, speakingNow);

      const currentText = readSpeechText(audioRef.current, textRef.current);
      if (speakingNow && currentText && currentText !== lastText) {
        lastText = currentText;
        cues = buildSpeechCues(currentText);
        cueIndex = 0;
      }

      if (!speakingNow) {
        if (!glanceDirection && now >= nextIdleGlanceAt) startIdleGlance(now);
        if (glanceDirection && now >= glanceReturnAt) {
          centerHead(now, false);
          nextIdleGlanceAt = now + 4300 + Math.random() * 3900;
        }
      }

      const currentAudio = audioRef.current;
      if (speakingNow && currentAudio && Number.isFinite(currentAudio.duration) && currentAudio.duration > 0) {
        const ratio = clamp01(currentAudio.currentTime / currentAudio.duration);

        if (!scheduledEntryGestureDone && now >= scheduledEntryGestureAt) {
          scheduledEntryGestureDone = true;
          // Se a fala começa com confirmação, tende a um aceno; caso contrário,
          // uma ênfase muito leve de entrada.
          const firstCue = cues[0]?.kind;
          if (firstCue === 'tilt') startGesture(now, 'tilt', 0.80);
          else startGesture(now, 'nod', 0.82);
        }

        while (cueIndex < cues.length && ratio >= cues[cueIndex].at) {
          const cue = cues[cueIndex++];
          if (cue.kind === 'settle') {
            centerHead(now, true);
            startGesture(now, 'settle', 0.84);
          } else if (cue.kind === 'tilt') {
            startGesture(now, 'tilt', 0.96);
          } else if (cue.kind === 'emphasis') {
            startGesture(now, 'emphasis', 1.04);
          } else {
            startGesture(now, 'nod', 0.92);
          }
        }
      }

      const targetEnergy = speakingNow ? clamp01(levelRef.current) : 0;
      previousEnergy = energy;
      energy += (targetEnergy - energy) * (speakingNow ? 0.050 : 0.022);

      if (
        speakingNow &&
        energy > 0.52 &&
        energy - previousEnergy > 0.010 &&
        now - lastEnergyGestureAt > 1600 &&
        now >= gestureCooldownUntil
      ) {
        startGesture(now, 'emphasis', 0.80 + energy * 0.28);
        lastEnergyGestureAt = now;
      }

      const bodyPose = bodyPoseAt(now);
      const headPose = headBaseAt(now);
      const seconds = (now - startedAt) / 1000;

      const breathAmp = speakingNow ? 0.00125 : 0.00205;
      const breath = 1
        + breathAmp * (1 - Math.cos((2 * Math.PI * seconds) / 5.7)) * 0.5
        + 0.00050 * (1 - Math.cos((2 * Math.PI * seconds) / 9.8 + 1.1)) * 0.5;

      const voiceLift = speakingNow ? -energy * 0.034 : 0;
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
          headGestureY = 0.132 * gestureStrength * arc;
          headGestureRotate = 0.050 * gestureDirection * gestureStrength * arc;
          bodyGestureY = 0.032 * gestureStrength * arc;
        } else if (gestureKind === 'tilt') {
          headGestureX = 0.082 * gestureDirection * gestureStrength * arc;
          headGestureRotate = 0.34 * gestureDirection * gestureStrength * arc;
          headGestureY = -0.020 * gestureStrength * arc;
          bodyGestureRotate = 0.038 * gestureDirection * gestureStrength * arc;
        } else if (gestureKind === 'emphasis') {
          headGestureY = 0.088 * gestureStrength * arc;
          headGestureRotate = 0.080 * gestureDirection * gestureStrength * arc;
          headGestureZoom = 0.00095 * gestureStrength * arc;
          bodyGestureX = 0.040 * gestureDirection * gestureStrength * arc;
          bodyGestureY = 0.020 * gestureStrength * arc;
        } else {
          headGestureY = 0.040 * gestureStrength * arc;
          headGestureRotate = -headPose.rotate * 0.42 * arc;
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
