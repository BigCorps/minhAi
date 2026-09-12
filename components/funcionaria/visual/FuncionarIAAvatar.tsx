'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import FuncionarIABackground from './FuncionarIABackground';
import { useFuncionarIANaturalMotion } from './useFuncionarIANaturalMotion';
import { useFuncionarIAViseme } from './useFuncionarIAViseme';
import {
  BLINK_TIMING,
  EXPRESSION_CAROUSEL,
  EXPRESSION_POOL,
  EXPRESSIONS,
  FUNCIONARIA_AVATAR,
  VISEMES,
  counterPath,
  expressionAssets,
  eyeHalfPath,
  getLogoPlacement,
  getUniformColor,
  layerPath,
  mouthPath,
  type Expression,
} from '@/lib/funcionaria-avatar';

type Props = {
  primaryColor?: string;
  secondaryColor?: string;
  /** Id da paleta. Ignorado quando shirtColor vem preenchido. */
  uniformColorId?: string | null;
  /** Hex livre, para a cor exata da marca. */
  shirtColor?: string | null;
  trimColor?: string | null;
  companyLogoUrl?: string | null;
  /** Onde o logo aparece. Ver LOGO_PLACEMENTS. */
  logoPlacement?: string | null;
  backgroundPreset?: string;
  backgroundUrl?: string | null;
  speaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  speechText?: string | null;
  /** Balcao na frente da atendente. Ver COUNTERS. */
  counter?: string | null;
  compact?: boolean;
  className?: string;
};

const SWAP_MS = 160;
type EyeRegistry = Map<string, HTMLImageElement | null>;

function useLayersReady(sources: string[]): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let pending = sources.length;
    if (!pending) {
      setReady(true);
      return;
    }

    const done = () => {
      pending -= 1;
      if (pending <= 0 && alive) setReady(true);
    };

    const images = sources.map(src => {
      const image = new Image();
      image.onload = done;
      image.onerror = done;
      image.src = src;
      return image;
    });

    return () => {
      alive = false;
      for (const image of images) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [sources.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return ready;
}

function useWarmCache(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const wanted: Expression[] = EXPRESSION_CAROUSEL ? [...EXPRESSIONS] : ['neutra'];
    for (const src of wanted.flatMap(expressionAssets)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    }

    // A boca e pequena, mas todas as formas devem estar decodificadas antes da
    // primeira fala. Isso evita o flash da primeira troca de visema.
    for (const key of VISEMES) {
      if (key === 'sil') continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = mouthPath(key);
    }
  }, [active]);
}

const COUNTER_HEIGHT = 0.26;
const COUNTER_WIDTH = 1.08;

export default function FuncionarIAAvatar({
  primaryColor = '#6D28D9',
  secondaryColor = '#A3E635',
  uniformColorId,
  shirtColor,
  trimColor,
  companyLogoUrl,
  logoPlacement,
  backgroundPreset = 'escritorio',
  backgroundUrl,
  speaking = false,
  audioElement = null,
  speechText = null,
  counter = 'nenhum',
  compact = false,
  className = '',
}: Props) {
  const preset = getUniformColor(uniformColorId);
  const shirt = shirtColor || preset.shirt;
  const trim = trimColor || preset.trim;

  const { viseme, level } = useFuncionarIAViseme(audioElement, speaking, speechText);

  const figure = useRef<HTMLDivElement | null>(null);
  useFuncionarIANaturalMotion(figure, speaking, level);

  const registry = useRef<EyeRegistry>(new Map());
  const { current, incoming, fade, swapPending, onClosed } = useExpression(speaking);
  useBlink(speaking, swapPending, onClosed, registry);

  const ready = useLayersReady([
    layerPath('neutra', 'base'),
    layerPath('neutra', 'shirt-mask'),
    layerPath('neutra', 'trim-mask'),
  ]);
  useWarmCache(ready);

  const { canvas, mouthRect, badgeRect, logoChestRect, logoCenterRect } = FUNCIONARIA_AVATAR;
  const placement = getLogoPlacement(logoPlacement);
  const counterAsset = counterPath(counter || 'nenhum');
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  const slots: Array<{ key: string; expression: Expression; opacity: number }> = [
    { key: 'a', expression: current, opacity: 1 },
  ];
  if (incoming) slots.push({ key: 'b', expression: incoming, opacity: fade });

  return (
    <div
      data-avatar-engine="v12"
      className={`relative isolate overflow-hidden rounded-[28px] bg-white ${
        compact ? 'min-h-[300px]' : 'min-h-[440px]'
      } ${className}`}
    >
      <FuncionarIABackground
        preset={backgroundPreset}
        backgroundUrl={backgroundUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/[.08] via-transparent to-white/[.10]" />

      <div className="absolute inset-0 flex items-end justify-center">
        <div
          ref={figure}
          className="funcionaria-figure relative h-full max-w-full"
          style={{
            opacity: ready ? 1 : 0,
            transition: 'opacity 240ms ease-out',
          }}
        >
          {/*
            Elemento de fluxo invisivel: ele define exatamente o tamanho da
            figura renderizada. Todos os recortes usam porcentagem desse mesmo
            retangulo, entao olhos/boca nao derivam em telas estreitas.
          */}
          <img
            src={layerPath('neutra', 'base')}
            alt=""
            aria-hidden
            className="pointer-events-none block h-full w-auto max-w-full select-none opacity-0"
            draggable={false}
          />

          {slots.map(slot => (
            <div
              key={slot.key}
              className="absolute inset-0"
              style={{
                opacity: slot.opacity,
                transition: slot.key === 'b' ? `opacity ${SWAP_MS}ms ease-in-out` : 'none',
              }}
            >
              <img
                src={layerPath(slot.expression, 'base')}
                alt={slot.key === 'a' ? 'Atendente virtual FuncionarIA' : ''}
                aria-hidden={slot.key !== 'a'}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
                draggable={false}
              />

              <FabricLayer color={shirt} expression={slot.expression} prefix="shirt" />
              <FabricLayer color={trim} expression={slot.expression} prefix="trim" />

              <EyeFrames
                expression={slot.expression}
                slotKey={slot.key}
                registry={registry}
              />
            </div>
          ))}

          {/*
            Visemas continuam montados para nunca decodificar uma boca no meio
            da fala. Na V4 o crossfade visual ficou em 12ms: a timeline textual
            ja decide o fonema e a troca precisa parecer articulacao, nao morph
            durante a maior parte de um fonema curto.
          */}
          {VISEMES.filter(key => key !== 'sil').map(key => (
            <img
              key={key}
              src={mouthPath(key)}
              alt=""
              aria-hidden
              className="pointer-events-none absolute select-none"
              style={{
                left: pct(mouthRect.left, canvas.width),
                top: pct(mouthRect.top, canvas.height),
                width: pct(mouthRect.width, canvas.width),
                height: pct(mouthRect.height, canvas.height),
                opacity: speaking && viseme === key ? 1 : 0,
                transition: 'opacity 12ms linear',
                willChange: 'opacity',
              }}
              draggable={false}
            />
          ))}

          {placement === 'cracha' && (
            <Badge logo={companyLogoUrl} rect={badgeRect} canvas={canvas} />
          )}

          {companyLogoUrl && (placement === 'peito' || placement === 'centro') && (
            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                left: pct((placement === 'peito' ? logoChestRect : logoCenterRect).left, canvas.width),
                top: pct((placement === 'peito' ? logoChestRect : logoCenterRect).top, canvas.height),
                width: pct((placement === 'peito' ? logoChestRect : logoCenterRect).width, canvas.width),
                height: pct((placement === 'peito' ? logoChestRect : logoCenterRect).height, canvas.height),
                mixBlendMode: 'multiply',
                opacity: 0.92,
              }}
            >
              <img
                src={companyLogoUrl}
                alt="Logo da empresa"
                className="h-full w-full select-none object-contain"
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {counterAsset && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: `${COUNTER_HEIGHT * 100}%` }}
        >
          <img
            src={counterAsset}
            alt=""
            aria-hidden
            className="absolute left-1/2 top-0 max-w-none -translate-x-1/2 select-none"
            style={{ width: `${COUNTER_WIDTH * 100}%`, height: 'auto' }}
            draggable={false}
          />
        </div>
      )}

      {speaking && (
        <div className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center gap-[3px] rounded-full bg-white/95 shadow-lg backdrop-blur">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="w-[4px] rounded-full"
              style={{
                backgroundColor: primaryColor,
                height: `${8 + Math.max(0.12, level) * (12 + i * 3)}px`,
                opacity: 0.72 + i * 0.06,
                transition: 'height 70ms linear',
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .funcionaria-figure {
          transform-origin: 50% 100%;
          will-change: transform;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piscada V12 — um unico asset visualmente fechado, sem alternancia falsa
// ---------------------------------------------------------------------------

function EyeFrames({
  expression,
  slotKey,
  registry,
}: {
  expression: Expression;
  slotKey: string;
  registry: MutableRefObject<EyeRegistry>;
}) {
  const { canvas, eyesRect } = FUNCIONARIA_AVATAR;

  useEffect(() => {
    const map = registry.current;
    return () => { map.delete(slotKey); };
  }, [registry, slotKey]);

  /*
    Importante: no pack atual o arquivo historicamente chamado `eyes-half`
    e o que visualmente representa a palpebra fechada. O arquivo `eyes-closed`
    parece aberto na gravacao real. Usar os dois em sequencia produzia:
      fechado -> aberto -> fechado -> aberto
    em quatro frames consecutivos de uma tela de ~30 Hz.

    Enquanto os assets de olhos nao forem regenerados, usar somente o estado
    que de fato parece fechado e mais anatomico do que confiar nos nomes.
  */
  return (
    <img
      ref={(element: HTMLImageElement | null) => {
        registry.current.set(slotKey, element);
      }}
      src={eyeHalfPath(expression)}
      alt=""
      aria-hidden
      decoding="async"
      className="pointer-events-none absolute select-none"
      style={{
        left: `${(eyesRect.left / canvas.width) * 100}%`,
        top: `${(eyesRect.top / canvas.height) * 100}%`,
        width: `${(eyesRect.width / canvas.width) * 100}%`,
        height: `${(eyesRect.height / canvas.height) * 100}%`,
        opacity: 0,
        willChange: 'opacity',
      }}
      draggable={false}
    />
  );
}

function useBlink(
  speaking: boolean,
  swapPending: MutableRefObject<boolean>,
  onClosed: MutableRefObject<() => void>,
  registry: MutableRefObject<EyeRegistry>,
) {
  const speakingRef = useRef(speaking);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    if (!FUNCIONARIA_AVATAR.blinkEnabled) return;
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const {
      shutMs,
      shutJitterMs,
      shutSwapMs,
      gapSpeakingMs,
      gapIdleMs,
      doubleChance,
      doubleGapMs,
      firstBlinkMinMs,
    } = BLINK_TIMING;

    const nextGap = () => {
      const [min, max] = speakingRef.current ? gapSpeakingMs : gapIdleMs;
      return min + Math.random() * (max - min);
    };

    let visible = false;
    let paintedRegistrySize = -1;

    const paint = (closed: boolean) => {
      const size = registry.current.size;
      if (closed === visible && size === paintedRegistrySize) return;
      visible = closed;
      paintedRegistrySize = size;

      for (const element of registry.current.values()) {
        if (!element) continue;
        element.style.opacity = closed ? '1' : '0';
      }
    };

    type Phase = 'wait' | 'shut';
    let phase: Phase = 'wait';
    let since = performance.now();
    let gap = Math.max(firstBlinkMinMs, nextGap());
    let shutDuration = shutMs;
    let secondOfPair = false;
    let announced = false;
    let raf = 0;

    const jitter = (base: number, amount: number) =>
      Math.max(20, base + (Math.random() * 2 - 1) * amount);

    const finishBlink = (now: number) => {
      paint(false);
      phase = 'wait';
      since = now;

      if (!secondOfPair && Math.random() < doubleChance) {
        secondOfPair = true;
        const [min, max] = doubleGapMs;
        gap = min + Math.random() * (max - min);
      } else {
        secondOfPair = false;
        gap = nextGap();
      }
    };

    const tick = (now: number) => {
      const elapsed = now - since;

      if (phase === 'wait') {
        paint(false);
        if (elapsed >= gap) {
          shutDuration = swapPending.current
            ? shutSwapMs
            : jitter(shutMs, shutJitterMs);
          announced = false;
          paint(true);
          phase = 'shut';
          since = now;
        }
      } else {
        paint(true);
        if (!announced) {
          announced = true;
          onClosed.current();
        }
        if (elapsed >= shutDuration) finishBlink(now);
      }

      raf = window.requestAnimationFrame(tick);
    };

    paint(false);
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      visible = true; // força a escrita final mesmo se ja estava aberto
      paintedRegistrySize = -1;
      paint(false);
    };
  }, [swapPending, onClosed, registry]);
}

// ---------------------------------------------------------------------------
// Expressao
// ---------------------------------------------------------------------------

function useExpression(speaking: boolean) {
  const [current, setCurrent] = useState<Expression>('neutra');
  const [incoming, setIncoming] = useState<Expression | null>(null);
  const [fade, setFade] = useState(0);

  const currentRef = useRef<Expression>('neutra');
  const pending = useRef<Expression | null>(null);
  const swapPending = useRef(false);
  const onClosed = useRef<() => void>(() => {});

  currentRef.current = current;

  onClosed.current = () => {
    const next = pending.current;
    if (!next || incoming) return;
    pending.current = null;
    swapPending.current = false;
    setIncoming(next);
  };

  useEffect(() => {
    if (!EXPRESSION_CAROUSEL) return;
    if (speaking) {
      pending.current = null;
      swapPending.current = false;
      return;
    }

    let alive = true;
    let timer = 0;
    const pool = EXPRESSION_POOL;

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        const options = pool.filter(item => item !== currentRef.current);
        pending.current = options[Math.floor(Math.random() * options.length)] || null;
        swapPending.current = pending.current !== null;
        schedule();
      }, 6000 + Math.random() * 9000);
    };

    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [speaking]);

  useEffect(() => {
    if (!speaking) return;
    if (currentRef.current === 'neutra' || incoming === 'neutra') return;
    pending.current = null;
    swapPending.current = false;
    setIncoming('neutra');
  }, [speaking, incoming]);

  useEffect(() => {
    if (!incoming) return;

    setFade(0);
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setFade(1));
    });

    const commit = window.setTimeout(() => {
      setCurrent(incoming);
      setIncoming(null);
      setFade(0);
    }, SWAP_MS + 40);

    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
      window.clearTimeout(commit);
    };
  }, [incoming]);

  return { current, incoming, fade, swapPending, onClosed };
}

// ---------------------------------------------------------------------------
// Camadas de uniforme e cracha
// ---------------------------------------------------------------------------

function FabricLayer({
  color,
  expression,
  prefix,
}: {
  color: string;
  expression: Expression;
  prefix: 'shirt' | 'trim';
}) {
  const mask = layerPath(expression, `${prefix}-mask`);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${mask})`,
        maskImage: `url(${mask})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    >
      <img
        src={layerPath(expression, `${prefix}-shadow`)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
      <img
        src={layerPath(expression, `${prefix}-light`)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
    </div>
  );
}

function Badge({
  logo,
  rect,
  canvas,
}: {
  logo?: string | null;
  rect: { left: number; top: number; width: number; height: number };
  canvas: { width: number; height: number };
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${(rect.left / canvas.width) * 100}%`,
        top: `${(rect.top / canvas.height) * 100}%`,
        width: `${(rect.width / canvas.width) * 100}%`,
        height: `${(rect.height / canvas.height) * 100}%`,
        transform: 'rotate(-1.2deg)',
        transformOrigin: '50% 0%',
        filter: 'drop-shadow(0 2px 5px rgba(15,23,42,.3))',
      }}
    >
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[2px]"
        style={{
          width: '15%',
          height: '17%',
          background: 'linear-gradient(180deg,#e8eaed 0%,#9aa0a6 55%,#c8ccd0 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center overflow-hidden rounded-[5%/8%]"
        style={{
          top: '12%',
          background: 'linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%)',
          border: '1px solid rgba(15,23,42,.16)',
        }}
      >
        {logo ? (
          <img src={logo} alt="Logo da empresa" className="h-[64%] w-[82%] object-contain" />
        ) : (
          <div className="h-[46%] w-[62%] rounded-sm bg-slate-200/70" />
        )}
      </div>
    </div>
  );
}
