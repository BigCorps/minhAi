'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import FuncionarIABackground from './FuncionarIABackground';
import { useFuncionarIAAudioAmplitude } from './useFuncionarIAAudioAmplitude';
import { hexToRgb, mouthStageFromAmplitude, rgbaFromHex } from '@/lib/funcionaria-visual';

type Props = {
  primaryColor?: string;
  secondaryColor?: string;
  shirtColor?: string;
  shirtDetailColor?: string;
  uniformLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  backgroundPreset?: string | null;
  backgroundUrl?: string | null;
  speaking?: boolean;
  amplitude?: number;
  audioElement?: HTMLAudioElement | null;
  compact?: boolean;
  className?: string;
};

function mixHex(hex: string, target: '#000000' | '#FFFFFF', amount: number): string {
  const source = hexToRgb(hex);
  const end = target === '#FFFFFF' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const ratio = Math.max(0, Math.min(1, amount));
  const value = (start: number, finish: number) => Math.round(start + (finish - start) * ratio).toString(16).padStart(2, '0');
  return `#${value(source.r, end.r)}${value(source.g, end.g)}${value(source.b, end.b)}`.toUpperCase();
}

export default function FuncionarIACharacter({
  primaryColor = '#6D28D9',
  secondaryColor = '#A3E635',
  shirtColor = '#6D28D9',
  shirtDetailColor = '#A3E635',
  uniformLogoUrl,
  companyLogoUrl,
  backgroundPreset = 'office',
  backgroundUrl,
  speaking = false,
  amplitude = 0,
  audioElement = null,
  compact = false,
  className = '',
}: Props) {
  const [blink, setBlink] = useState(false);
  const measuredAmplitude = useFuncionarIAAudioAmplitude(audioElement, speaking && !!audioElement);
  const [syntheticAmplitude, setSyntheticAmplitude] = useState(0);
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    let alive = true;
    let timeout = 0;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        window.setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          schedule();
        }, 125);
      }, 2700 + Math.random() * 3600);
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!speaking || amplitude > 0 || audioElement) {
      setSyntheticAmplitude(0);
      return;
    }
    const timer = window.setInterval(() => {
      const rhythm = (Math.sin(Date.now() / 120) + 1) / 2;
      setSyntheticAmplitude(0.08 + Math.random() * 0.48 + rhythm * 0.22);
    }, 90);
    return () => window.clearInterval(timer);
  }, [speaking, amplitude, audioElement]);

  const effectiveAmplitude = speaking ? Math.max(amplitude, measuredAmplitude, syntheticAmplitude) : 0;
  const mouthStage = mouthStageFromAmplitude(effectiveAmplitude);
  const logo = uniformLogoUrl || companyLogoUrl || null;
  const shadow = useMemo(() => rgbaFromHex(primaryColor, 0.24), [primaryColor]);
  const shirtLight = useMemo(() => mixHex(shirtColor, '#FFFFFF', 0.22), [shirtColor]);
  const shirtDark = useMemo(() => mixHex(shirtColor, '#000000', 0.28), [shirtColor]);
  const detailLight = useMemo(() => mixHex(shirtDetailColor, '#FFFFFF', 0.22), [shirtDetailColor]);
  const detailDark = useMemo(() => mixHex(shirtDetailColor, '#000000', 0.24), [shirtDetailColor]);

  const id = (name: string) => `${name}-${uid}`;

  return (
    <div className={`relative isolate overflow-hidden rounded-[28px] bg-white ${compact ? 'min-h-[300px]' : 'min-h-[420px]'} ${className}`}>
      <FuncionarIABackground
        preset={backgroundPreset}
        backgroundUrl={backgroundUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/[.10] via-transparent to-white/[.18]" />

      <div className="absolute inset-0 flex items-end justify-center px-2 pt-3 sm:px-5">
        <svg
          viewBox="0 0 620 720"
          role="img"
          aria-label="Funcionária virtual 3D estilizada da empresa"
          className="h-[97%] w-auto max-w-full overflow-visible drop-shadow-[0_24px_38px_rgba(15,23,42,.20)]"
        >
          <defs>
            <radialGradient id={id('skinFace')} cx="37%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#FFE0C8" />
              <stop offset="45%" stopColor="#F4C1A2" />
              <stop offset="78%" stopColor="#E4A181" />
              <stop offset="100%" stopColor="#C97E62" />
            </radialGradient>
            <linearGradient id={id('skinNeck')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#F7C5A6" />
              <stop offset="60%" stopColor="#E9AB8C" />
              <stop offset="100%" stopColor="#C97E62" />
            </linearGradient>
            <linearGradient id={id('skinArm')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#F8C9AA" />
              <stop offset="55%" stopColor="#EFB392" />
              <stop offset="100%" stopColor="#CE8468" />
            </linearGradient>
            <radialGradient id={id('hairBase')} cx="40%" cy="20%" r="88%">
              <stop offset="0%" stopColor="#7A4D39" />
              <stop offset="42%" stopColor="#563326" />
              <stop offset="78%" stopColor="#362018" />
              <stop offset="100%" stopColor="#1F1411" />
            </radialGradient>
            <linearGradient id={id('hairShine')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#F2C9A5" stopOpacity="0.34" />
              <stop offset="30%" stopColor="#C78867" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2B1712" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id('shirt')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={shirtLight} />
              <stop offset="35%" stopColor={shirtColor} />
              <stop offset="100%" stopColor={shirtDark} />
            </linearGradient>
            <linearGradient id={id('shirtHighlight')} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
              <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
            </linearGradient>
            <linearGradient id={id('detail')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={detailLight} />
              <stop offset="55%" stopColor={shirtDetailColor} />
              <stop offset="100%" stopColor={detailDark} />
            </linearGradient>
            <linearGradient id={id('headset')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#DCE3EC" />
              <stop offset="70%" stopColor="#9AA7B9" />
              <stop offset="100%" stopColor="#667085" />
            </linearGradient>
            <linearGradient id={id('deskTop')} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="52%" stopColor="#EEF2F7" />
              <stop offset="100%" stopColor="#C9D2DE" />
            </linearGradient>
            <linearGradient id={id('deskFront')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#E8EDF3" />
              <stop offset="100%" stopColor="#B9C4D1" />
            </linearGradient>
            <linearGradient id={id('badge')} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EEF2F7" />
            </linearGradient>
            <filter id={id('softShadow')} x="-35%" y="-35%" width="170%" height="170%">
              <feDropShadow dx="0" dy="10" stdDeviation="11" floodColor={shadow} floodOpacity="0.72" />
            </filter>
            <filter id={id('faceDepth')} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#5C2D1F" floodOpacity="0.20" />
            </filter>
            <filter id={id('badgeShadow')} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.24" />
            </filter>
            <filter id={id('blur')}>
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <clipPath id={id('badgeLogoClip')}>
              <rect x="359" y="487" width="74" height="42" rx="8" />
            </clipPath>
          </defs>

          {/* profundidade de cena */}
          <ellipse cx="310" cy="652" rx="224" ry="27" fill="#0F172A" opacity="0.16" filter={`url(#${id('blur')})`} />
          <circle cx="310" cy="315" r="210" fill={primaryColor} opacity="0.038" />
          <circle cx="310" cy="315" r="178" fill="none" stroke={secondaryColor} strokeWidth="5" opacity="0.10" />

          {/* cadeira */}
          <path d="M218 430 C218 366 255 335 310 335 C365 335 402 366 402 430 L414 607 L206 607 Z" fill="#1F2937" opacity="0.94" />
          <path d="M235 421 C235 378 265 356 310 356 C355 356 385 378 385 421 L394 575 L226 575 Z" fill="#334155" />
          <path d="M247 409 C247 386 270 372 310 372 C350 372 373 386 373 409 L379 548 L241 548 Z" fill="#475569" opacity="0.56" />

          <g className="funcionaria-idle">
            {/* cabelo traseiro cria uma massa única atrás de cabeça e ombros */}
            <path
              d="M198 300 C181 209 215 126 289 105 C353 87 420 126 430 205 C438 269 427 360 389 431 C366 473 342 494 310 497 C276 494 250 471 228 430 C199 375 191 338 198 300 Z"
              fill={`url(#${id('hairBase')})`}
              filter={`url(#${id('softShadow')})`}
            />
            <path d="M221 185 C247 128 303 105 357 122 C316 126 285 151 261 196 C243 232 233 286 237 353 C214 304 207 231 221 185 Z" fill={`url(#${id('hairShine')})`} opacity="0.85" />

            {/* corpo/uniforme */}
            <path
              d="M147 604 C154 520 185 455 244 425 C259 417 281 412 310 412 C339 412 361 417 376 425 C435 455 466 520 473 604 C424 608 377 609 310 609 C243 609 196 608 147 604 Z"
              fill={`url(#${id('shirt')})`}
              filter={`url(#${id('softShadow')})`}
            />
            <path d="M150 604 C157 525 190 465 247 436 C213 486 207 545 208 604 Z" fill="#FFFFFF" opacity="0.075" />
            <path d="M470 604 C463 525 430 465 373 436 C407 486 413 545 412 604 Z" fill="#000000" opacity="0.11" />
            <path d="M157 604 C164 521 196 456 253 427 C299 405 350 414 371 427 C424 459 455 521 463 604 Z" fill={`url(#${id('shirtHighlight')})`} opacity="0.72" />

            {/* mangas arredondadas */}
            <path d="M160 509 C141 527 129 560 128 603 C151 607 183 608 214 603 C212 559 220 528 240 500 C208 484 181 487 160 509 Z" fill={`url(#${id('shirt')})`} />
            <path d="M460 509 C479 527 491 560 492 603 C469 607 437 608 406 603 C408 559 400 528 380 500 C412 484 439 487 460 509 Z" fill={`url(#${id('shirt')})`} />
            <path d="M129 570 C151 564 183 564 213 570 C213 581 212 592 210 600 C183 605 153 605 131 600 C129 590 128 580 129 570 Z" fill={`url(#${id('detail')})`} />
            <path d="M407 570 C437 564 469 564 491 570 C492 580 491 590 489 600 C467 605 437 605 410 600 C408 592 407 581 407 570 Z" fill={`url(#${id('detail')})`} />

            {/* pescoço conectado ao rosto, por trás da gola */}
            <path d="M273 346 C278 383 272 410 256 429 C273 451 294 462 310 462 C326 462 347 451 364 429 C348 410 342 383 347 346 Z" fill={`url(#${id('skinNeck')})`} />
            <path d="M274 383 C289 398 330 401 346 382 C343 403 347 416 354 427 C337 444 325 451 310 451 C295 451 283 444 266 427 C273 415 277 403 274 383 Z" fill="#B96E56" opacity="0.16" />

            {/* gola 3D curva, sem recortes angulares sobrepostos */}
            <path
              d="M247 424 C263 416 276 411 287 409 C292 423 300 435 310 444 C299 456 286 466 270 475 C258 461 250 443 247 424 Z"
              fill={`url(#${id('detail')})`}
            />
            <path
              d="M373 424 C357 416 344 411 333 409 C328 423 320 435 310 444 C321 456 334 466 350 475 C362 461 370 443 373 424 Z"
              fill={`url(#${id('detail')})`}
            />
            <path d="M287 410 C294 426 302 438 310 444 C318 438 326 426 333 410" fill="none" stroke={detailLight} strokeWidth="3" strokeLinecap="round" opacity="0.45" />

            {/* orelhas */}
            <ellipse cx="222" cy="268" rx="15" ry="27" fill="#E6A080" />
            <ellipse cx="398" cy="268" rx="15" ry="27" fill="#CC8166" />

            {/* rosto volumétrico */}
            <path
              d="M224 224 C229 158 262 123 310 123 C359 123 392 159 396 225 C400 284 382 342 350 374 C337 387 324 395 310 397 C296 395 283 387 270 374 C238 342 220 284 224 224 Z"
              fill={`url(#${id('skinFace')})`}
              filter={`url(#${id('faceDepth')})`}
            />
            {/* sombra lateral e luz facial ajudam a tirar o aspecto flat */}
            <path d="M354 139 C384 162 396 199 395 244 C394 302 373 352 343 379 C364 333 371 289 367 237 C364 194 360 166 354 139 Z" fill="#A95843" opacity="0.12" />
            <ellipse cx="276" cy="208" rx="39" ry="69" fill="#FFFFFF" opacity="0.10" transform="rotate(18 276 208)" />
            <ellipse cx="270" cy="298" rx="27" ry="18" fill="#E97F7D" opacity="0.11" />
            <ellipse cx="350" cy="298" rx="27" ry="18" fill="#D26868" opacity="0.08" />

            {/* cabelo frontal encaixado no couro cabeludo */}
            <path d="M221 229 C220 168 254 112 311 108 C363 105 398 139 401 205 C372 196 351 174 339 145 C313 179 275 207 221 229 Z" fill={`url(#${id('hairBase')})`} />
            <path d="M226 214 C207 255 207 329 236 389 C202 358 187 307 192 244 C197 180 225 127 270 110 C239 143 223 178 226 214 Z" fill="#2D1B16" />
            <path d="M394 207 C414 250 408 332 381 392 C414 359 429 307 424 242 C419 177 394 128 350 110 C380 143 397 178 394 207 Z" fill="#251713" />
            <path d="M246 154 C270 124 312 112 350 126 C314 132 284 151 258 188 Z" fill="#B27658" opacity="0.24" />

            {/* sobrancelhas */}
            <path d="M258 234 Q278 221 294 231" fill="none" stroke="#5B352A" strokeWidth="5" strokeLinecap="round" opacity="0.80" />
            <path d="M326 231 Q343 221 362 234" fill="none" stroke="#5B352A" strokeWidth="5" strokeLinecap="round" opacity="0.80" />

            {/* olhos com relevo */}
            {blink ? (
              <>
                <path d="M255 260 Q276 269 296 260" fill="none" stroke="#4A2C28" strokeWidth="4" strokeLinecap="round" />
                <path d="M324 260 Q344 269 365 260" fill="none" stroke="#4A2C28" strokeWidth="4" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="277" cy="258" rx="17" ry="11" fill="#FFFDFB" />
                <ellipse cx="344" cy="258" rx="17" ry="11" fill="#FFFDFB" />
                <ellipse cx="279" cy="259" rx="8" ry="8.5" fill="#65756D" />
                <ellipse cx="342" cy="259" rx="8" ry="8.5" fill="#65756D" />
                <circle cx="280" cy="260" r="4.3" fill="#24302D" />
                <circle cx="341" cy="260" r="4.3" fill="#24302D" />
                <circle cx="282" cy="256" r="2.5" fill="white" />
                <circle cx="343" cy="256" r="2.5" fill="white" />
                <path d="M259 252 Q277 243 296 252" fill="none" stroke="#4A2C28" strokeWidth="3" strokeLinecap="round" />
                <path d="M325 252 Q344 243 363 252" fill="none" stroke="#4A2C28" strokeWidth="3" strokeLinecap="round" />
              </>
            )}

            {/* nariz 2.5D limpo: sombra curta, sem linhas sobrepostas */}
            <path d="M312 282 C309 294 308 303 312 307 C316 310 322 308 326 305" fill="none" stroke="#B96F57" strokeWidth="2.6" strokeLinecap="round" opacity="0.58" />
            <ellipse cx="319" cy="308" rx="11" ry="4" fill="#9D5745" opacity="0.06" />

            {/* boca sincronizada */}
            <g aria-hidden="true">
              {mouthStage === 0 && (
                <>
                  <path d="M286 337 Q310 350 334 337" fill="none" stroke="#9B4A50" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M290 338 Q310 344 330 338" fill="none" stroke="#D57578" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                </>
              )}
              {mouthStage === 1 && (
                <>
                  <ellipse cx="310" cy="340" rx="16" ry="5.5" fill="#713039" />
                  <ellipse cx="310" cy="342" rx="9" ry="2.2" fill="#C55F66" opacity="0.45" />
                </>
              )}
              {mouthStage === 2 && (
                <>
                  <ellipse cx="310" cy="341" rx="18" ry="10" fill="#652A34" />
                  <ellipse cx="310" cy="346" rx="10" ry="3.5" fill="#D66D72" opacity="0.78" />
                </>
              )}
              {mouthStage === 3 && (
                <>
                  <ellipse cx="310" cy="342" rx="18" ry="15" fill="#54212B" />
                  <ellipse cx="310" cy="350" rx="10.5" ry="4.2" fill="#DD7579" opacity="0.84" />
                </>
              )}
            </g>

            {/* headset 3D integrado ao cabelo, sem traços de highlight soltos */}
            <path d="M223 258 C211 168 253 116 311 116 C367 116 407 166 397 258" fill="none" stroke="#7E899A" strokeWidth="17" strokeLinecap="round" opacity="0.30" />
            <path d="M223 258 C211 168 253 116 311 116 C367 116 407 166 397 258" fill="none" stroke={`url(#${id('headset')})`} strokeWidth="12" strokeLinecap="round" />
            <rect x="205" y="246" width="30" height="60" rx="14" fill={`url(#${id('headset')})`} />
            <rect x="385" y="246" width="30" height="60" rx="14" fill={`url(#${id('headset')})`} />
            <path d="M400 286 C399 313 378 326 350 329" fill="none" stroke="#707D90" strokeWidth="5.5" strokeLinecap="round" />
            <ellipse cx="344" cy="330" rx="12" ry="8.5" fill="#263244" />
            <ellipse cx="341" cy="327" rx="3.5" ry="2.2" fill="#FFFFFF" opacity="0.36" />

            {/* braços/mãos sobre o balcão, sem parecerem recortados */}
            <path d="M192 548 C219 535 247 540 272 559 C286 570 287 590 272 600 L190 600 Z" fill={`url(#${id('skinArm')})`} />
            <path d="M428 548 C401 535 373 540 348 559 C334 570 333 590 348 600 L430 600 Z" fill={`url(#${id('skinArm')})`} />
            <ellipse cx="268" cy="584" rx="31" ry="17" fill="#F0B392" transform="rotate(7 268 584)" />
            <ellipse cx="352" cy="584" rx="31" ry="17" fill="#DEA080" transform="rotate(-7 352 584)" />

            {/* crachá real com clip, sombra e logo */}
            <g filter={`url(#${id('badgeShadow')})`}>
              <path d="M374 452 C381 444 392 444 399 452" fill="none" stroke="#D5DCE6" strokeWidth="5" strokeLinecap="round" />
              <rect x="349" y="459" width="95" height="82" rx="15" fill={`url(#${id('badge')})`} stroke="#D6DEE8" strokeWidth="2" />
              <rect x="349" y="459" width="95" height="14" rx="12" fill={primaryColor} />
              <rect x="349" y="468" width="95" height="6" fill={primaryColor} />
              <circle cx="396.5" cy="467" r="4" fill={secondaryColor} />
              {logo ? (
                <g clipPath={`url(#${id('badgeLogoClip')})`}>
                  <rect x="359" y="487" width="74" height="42" rx="8" fill="#FFFFFF" />
                  <image href={logo} x="363" y="491" width="66" height="34" preserveAspectRatio="xMidYMid meet" />
                </g>
              ) : (
                <g transform="translate(374 489)">
                  <circle cx="22" cy="18" r="17" fill={secondaryColor} opacity="0.95" />
                  <path d="M14 18 L20 24 L31 11" fill="none" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
              <rect x="360" y="531" width="45" height="4" rx="2" fill="#94A3B8" opacity="0.72" />
              <rect x="409" y="531" width="23" height="4" rx="2" fill={secondaryColor} opacity="0.75" />
            </g>
          </g>

          {/* balcão com aparência mais volumétrica */}
          <g>
            <rect x="45" y="590" width="530" height="88" rx="30" fill={`url(#${id('deskTop')})`} filter={`url(#${id('softShadow')})`} />
            <path d="M52 619 H568 V667 C568 677 559 686 549 686 H71 C61 686 52 677 52 667 Z" fill={`url(#${id('deskFront')})`} />
            <rect x="67" y="600" width="496" height="9" rx="4.5" fill={primaryColor} opacity="0.12" />
            <path d="M70 593 H550" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
            <rect x="232" y="625" width="156" height="39" rx="14" fill="#FFFFFF" opacity="0.94" />
            <circle cx="259" cy="644" r="9" fill={secondaryColor} />
            <path d="M254 644 L258 648 L265 639" fill="none" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="278" y="636" width="82" height="6" rx="3" fill="#8E9BAB" opacity="0.72" />
            <rect x="278" y="648" width="60" height="5" rx="2.5" fill="#C6D0DB" />
          </g>

          {/* indicador discreto de fala */}
          {speaking && (
            <g transform="translate(526 526)">
              <circle cx="0" cy="0" r="31" fill="white" opacity="0.94" filter={`url(#${id('badgeShadow')})`} />
              {[0, 1, 2, 3].map(i => {
                const height = 8 + Math.max(0.12, effectiveAmplitude) * (11 + i * 3);
                return <rect key={i} x={-16 + i * 10} y={-height / 2} width="5.5" height={height} rx="2.75" fill={primaryColor} opacity={0.72 + i * 0.06} />;
              })}
            </g>
          )}
        </svg>
      </div>

      <style jsx>{`
        .funcionaria-idle {
          transform-origin: 310px 575px;
          animation: funcionaria-idle-motion 6.2s ease-in-out infinite;
        }
        @keyframes funcionaria-idle-motion {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.0015); }
        }
        @media (prefers-reduced-motion: reduce) {
          .funcionaria-idle { animation: none; }
        }
      `}</style>
    </div>
  );
}
