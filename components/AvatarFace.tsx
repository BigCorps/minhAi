'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PixConfirmationModal from '@/components/assistant/PixConfirmationModal';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  isHidden?: boolean;
  qrCodeData?: {
    type: 'whatsapp' | 'instagram' | 'pix' | 'website' | 'facebook' | 'email' | 'linkedin' | 'tiktok' | 'twitter' | 'telefone';
    qrCodeUrl: string;
    qrContent: string;
    displayText: string;
    amount?: string;
    companyName?: string;
  } | null;
  pixConfirmationData?: {
    transactionId: string;
    amount: string;
    qrCodeUrl: string;
    pixCode: string;
  } | null;
  onCloseQRCode?: () => void;
  onCopyQRCode?: () => void;
  onConfirmPix?: () => Promise<void>;
  onCancelPix?: () => Promise<void>;
}

// ✅ Novas expressões adicionadas: wink, excited, confused, thinking, embarrassed, love, skeptical, starry, nervous, cool
type EyeExpression =
  | 'idle' | 'sleeping' | 'surprised' | 'attentive' | 'flirt' | 'sad' | 'angry'
  | 'lookLeft' | 'lookRight' | 'lookDown' | 'happy'
  | 'wink' | 'excited' | 'confused' | 'thinking' | 'embarrassed'
  | 'love' | 'skeptical' | 'starry' | 'nervous' | 'cool';

export function AvatarFace({
  isListening,
  isSpeaking,
  isProcessing,
  isHidden = false,
  theme = 'dark',
  qrCodeData,
  pixConfirmationData,
  onCloseQRCode,
  onCopyQRCode,
  onConfirmPix,
  onCancelPix,
}: AvatarFaceProps) {

  const isDark = theme === 'dark';

  const statusColors = useMemo(() => ({
    idle: {
      primary: '#3b82f6', secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(34, 197, 94, 0.4)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'
    },
    listening: {
      primary: '#3b82f6', secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.6)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'
    },
    processing: {
      primary: '#3b82f6', secondary: '#60a5fa',
      glow: 'rgba(22, 163, 74, 0.6)',
      ring: '#16a34a', halo: '#16a34a'
    },
    speaking: {
      primary: '#3b82f6', secondary: '#60a5fa',
      glow: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(37, 99, 235, 0.6)',
      ring: isDark ? '#3b82f6' : '#2563eb',
      halo: isDark ? '#3b82f6' : '#2563eb'
    },
  }), [isDark]);

  const [colors, setColors] = useState(statusColors.idle);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; speed: number }>>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(10).fill(0));
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeExpr, setEyeExpr] = useState<EyeExpression>('idle');
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exprTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFace = !isProcessing && !isSpeaking;
  const isActive = isSpeaking || isProcessing || isListening;

  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  useEffect(() => {
    const generateStars = () => {
      const newStars = Array.from({ length: 3 }, () => ({
        id: Math.random(),
        x: 40 + Math.random() * 120,
        y: 40 + Math.random() * 120,
        delay: Math.random() * 5
      }));
      setStars(newStars);
    };
    generateStars();
    const interval = setInterval(generateStars, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const scheduleNextBlink = () => {
      const nextBlinkDelay = Math.random() * 4000 + 2000;
      blinkTimeoutRef.current = setTimeout(() => {
        // Expressões que bloqueiam o piscar normal
        if (
          eyeExpr === 'flirt' || eyeExpr === 'sleeping' || eyeExpr === 'happy' ||
          eyeExpr === 'love' || eyeExpr === 'cool' || eyeExpr === 'starry' ||
          eyeExpr === 'wink' || isBlinking
        ) {
          scheduleNextBlink();
          return;
        }
        setIsBlinking(true);
        const blinkDuration = Math.random() * 60 + 120;
        setTimeout(() => {
          setIsBlinking(false);
          if (Math.random() < 0.15) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => {
                setIsBlinking(false);
                scheduleNextBlink();
              }, blinkDuration);
            }, 200);
          } else {
            scheduleNextBlink();
          }
        }, blinkDuration);
      }, nextBlinkDelay);
    };
    if (showFace) scheduleNextBlink();
    return () => { if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current); };
  }, [showFace, eyeExpr, isBlinking]);

  useEffect(() => {
    const shouldAnimate = !isSpeaking && !isProcessing;
    if (!shouldAnimate) { setEyeExpr('idle'); return; }

    // ✅ Lista completa com as novas expressões incluídas
    const expressions: EyeExpression[] = [
      'idle', 'sleeping', 'surprised', 'attentive', 'flirt', 'sad', 'angry',
      'lookLeft', 'lookRight', 'lookDown', 'happy',
      'wink', 'excited', 'confused', 'thinking', 'embarrassed',
      'love', 'skeptical', 'starry', 'nervous', 'cool'
    ];

    const changeExpression = () => {
      const nonIdleExpressions = expressions.filter(e => e !== 'idle');
      const randomExpr = nonIdleExpressions[Math.floor(Math.random() * nonIdleExpressions.length)];
      setEyeExpr(randomExpr);
      exprTimeoutRef.current = setTimeout(() => { setEyeExpr('idle'); }, 2000 + Math.random() * 1000);
    };

    const interval = setInterval(() => { changeExpression(); }, 10000 + Math.random() * 5000);
    const initialTimeout = setTimeout(() => { changeExpression(); }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (exprTimeoutRef.current) clearTimeout(exprTimeoutRef.current);
    };
  }, [isSpeaking, isProcessing]);

  useEffect(() => {
    const particleCount = isSpeaking ? 18 : isProcessing ? 10 : isListening ? 8 : 5;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 500,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.8 + 0.3
    }));
    setParticles(newParticles);
  }, [isSpeaking, isProcessing, isListening]);

  useEffect(() => {
    if (isSpeaking) {
      audioIntervalRef.current = setInterval(() => {
        setAudioLevels(prev => prev.map((_, i) => {
          const base = Math.random() * 0.8;
          const wave = Math.sin(Date.now() / 200 + i * 0.5) * 0.3;
          return Math.max(0, Math.min(1, base + wave));
        }));
      }, 50);
    } else {
      if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null; }
      setAudioLevels(Array(10).fill(0));
    }
    return () => { if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); };
  }, [isSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isActive || isHidden) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      return;
    }

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;
      particles.forEach((particle, i) => {
        const x = particle.x + Math.sin(time + i) * 40;
        const y = particle.y + Math.cos(time + i * 0.5) * 40;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 3);
        gradient.addColorStop(0, i % 2 === 0 ? colors.primary : colors.secondary);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [particles, colors, isActive, isHidden]);

  const orbSize = isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-100' : isListening ? 'scale-95' : 'scale-90';

  // ─────────────────────────────────────────────
  // Helpers de renderização de olhos
  // ─────────────────────────────────────────────

  /** Olho padrão com gradiente, brilho e ponto de luz */
  const renderEye = (cx: number, cy: number, rx = 14.4, ry = 17.6) => (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#eyeGradient)" opacity="0.85" />
      <ellipse cx={cx - 3} cy={cy - 6} rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
      <circle cx={cx - 2} cy={cy - 4} r="3.2" fill="white" opacity="0.7" />
    </>
  );

  /** Linha fechada (pálpebra) */
  const renderEyeLine = (d: string) => (
    <path d={d} stroke={colors.primary} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.85" />
  );

  /** Olho em forma de coração */
  const renderHeartEye = (cx: number, cy: number) => (
    <path
      d={`M ${cx} ${cy - 4} C ${cx - 10} ${cy - 14} ${cx - 20} ${cy - 6} ${cx} ${cy + 8} C ${cx + 20} ${cy - 6} ${cx + 10} ${cy - 14} ${cx} ${cy - 4} Z`}
      fill={colors.primary} opacity="0.9"
    />
  );

  /** Olho em forma de estrela */
  const renderStarEye = (cx: number, cy: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 === 0 ? 16 : 7;
      const a = (i * 36 - 90) * Math.PI / 180;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    return (
      <>
        <polygon points={pts} fill={colors.primary} opacity="0.88" />
        <circle cx={cx - 4} cy={cy - 5} r="3" fill="white" opacity="0.7" />
      </>
    );
  };

  /** Óculos escuros (expressão cool) */
  const renderSunglasses = () => (
    <>
      <rect x="60" y="76" width="32" height="20" rx="7" fill={colors.primary} opacity="0.92" />
      <rect x="108" y="76" width="32" height="20" rx="7" fill={colors.primary} opacity="0.92" />
      <line x1="92" y1="86" x2="108" y2="86" stroke={colors.primary} strokeWidth="3.5" opacity="0.92" />
      {/* hastes */}
      <line x1="60" y1="86" x2="48" y2="82" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="140" y1="86" x2="152" y2="82" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      {/* reflexo */}
      <ellipse cx="68" cy="82" rx="5" ry="3" fill="white" opacity="0.25" />
      <ellipse cx="116" cy="82" rx="5" ry="3" fill="white" opacity="0.25" />
    </>
  );

  // ─────────────────────────────────────────────
  // Renderização dos OLHOS conforme expressão
  // ─────────────────────────────────────────────
  const renderEyes = () => {
    // ── Expressões que sobrescrevem tudo ──
    if (eyeExpr === 'cool') return renderSunglasses();

    if (eyeExpr === 'love') return (
      <>
        {renderHeartEye(76, 85)}
        {renderHeartEye(124, 85)}
      </>
    );

    if (eyeExpr === 'starry') return (
      <>
        {renderStarEye(76, 85)}
        {renderStarEye(124, 85)}
      </>
    );

    // ── Sleeping: ambos fechados ──
    if (isBlinking || eyeExpr === 'sleeping') return (
      <>
        {renderEyeLine('M 62 85 Q 76 87 90 85')}
        {renderEyeLine('M 110 85 Q 124 87 138 85')}
      </>
    );

    // ── Happy: ambos em "^" ──
    if (eyeExpr === 'happy') return (
      <>
        <path d="M 66 90 L 76 80 L 86 90" stroke={colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M 114 90 L 124 80 L 134 90" stroke={colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
      </>
    );

    // ── Wink: olho esquerdo normal, direito fechado ──
    if (eyeExpr === 'wink') return (
      <>
        {renderEye(76, 85)}
        {renderEyeLine('M 110 88 Q 124 94 138 88')}
      </>
    );

    // ── Flirt: olho esquerdo normal, direito piscado ──
    if (eyeExpr === 'flirt') return (
      <>
        {renderEye(76, 85)}
        {renderEyeLine('M 110 85 Q 124 87 138 85')}
      </>
    );

    // ── Excited: olhos bem abertos com brilhinhos ──
    if (eyeExpr === 'excited') return (
      <>
        {renderEye(76, 82, 17, 21)}
        {renderEye(124, 82, 17, 21)}
        {/* faíscas canto esquerdo */}
        <path d="M 48 58 L 52 65 L 48 72" stroke={colors.secondary} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 44 65 L 56 65" stroke={colors.secondary} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* faíscas canto direito */}
        <path d="M 152 58 L 148 65 L 152 72" stroke={colors.secondary} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 144 65 L 156 65" stroke={colors.secondary} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      </>
    );

    // ── Confused: sobrancelha levantada esquerda + "?" ──
    if (eyeExpr === 'confused') return (
      <>
        {renderEye(76, 85)}
        {renderEye(124, 85)}
        {/* sobrancelha levantada no olho esquerdo */}
        <path d="M 62 66 Q 76 58 90 64" stroke={colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
        {/* "?" canto superior direito */}
        <path d="M 151 54 Q 160 46 151 40 Q 142 34 148 27" stroke={colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
        <circle cx="151" cy="61" r="3" fill={colors.primary} opacity="0.65" />
      </>
    );

    // ── Thinking: olho direito olhando para cima ──
    if (eyeExpr === 'thinking') return (
      <>
        {renderEye(76, 85)}
        {/* olho direito deslocado para cima */}
        <ellipse cx="124" cy="80" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
        <ellipse cx="129" cy="74" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
        <circle cx="130" cy="75" r="3.2" fill="white" opacity="0.7" />
        {/* três pontinhos "..." */}
        <circle cx="140" cy="50" r="2.8" fill={colors.primary} opacity="0.35" />
        <circle cx="152" cy="45" r="2.8" fill={colors.primary} opacity="0.55" />
        <circle cx="164" cy="40" r="2.8" fill={colors.primary} opacity="0.75" />
      </>
    );

    // ── Embarrassed: olhos levemente para baixo + rubor ──
    if (eyeExpr === 'embarrassed') return (
      <>
        {renderEye(76, 90, 13, 16)}
        {renderEye(124, 90, 13, 16)}
        {/* manchas de rubor */}
        <ellipse cx="52" cy="112" rx="16" ry="9" fill="#f87171" opacity="0.28" />
        <ellipse cx="148" cy="112" rx="16" ry="9" fill="#f87171" opacity="0.28" />
      </>
    );

    // ── Skeptical: olho esquerdo semicerrado + sobrancelha direita levantada ──
    if (eyeExpr === 'skeptical') return (
      <>
        {/* olho esquerdo ligeiramente apertado */}
        {renderEye(76, 87, 14.4, 13)}
        {renderEye(124, 85)}
        {/* sobrancelha levantada direita */}
        <path d="M 110 64 Q 124 57 138 63" stroke={colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
      </>
    );

    // ── Nervous: olhos menores + gota de suor ──
    if (eyeExpr === 'nervous') return (
      <>
        {renderEye(76, 85, 12, 15)}
        {renderEye(124, 85, 12, 15)}
        {/* gota de suor */}
        <path d="M 152 48 Q 158 58 152 67 Q 146 58 152 48 Z" fill={colors.secondary} opacity="0.55" />
      </>
    );

    // ── Surprised: olhos bem abertos ──
    if (eyeExpr === 'surprised') return (
      <>
        {renderEye(76, 85, 16, 20)}
        {renderEye(124, 85, 16, 20)}
      </>
    );

    // ── Attentive: olhos ligeiramente maiores ──
    if (eyeExpr === 'attentive') return (
      <>
        {renderEye(76, 85, 15.5, 19)}
        {renderEye(124, 85, 15.5, 19)}
      </>
    );

    // ── LookLeft / LookRight / LookDown ──
    if (eyeExpr === 'lookLeft') return (
      <>
        {renderEye(72, 85)}
        {renderEye(120, 85)}
      </>
    );
    if (eyeExpr === 'lookRight') return (
      <>
        {renderEye(80, 85)}
        {renderEye(128, 85)}
      </>
    );
    if (eyeExpr === 'lookDown') return (
      <>
        {renderEye(76, 90)}
        {renderEye(124, 90)}
      </>
    );

    // ── Sad: olhos normais (tristeza fica na boca) ──
    if (eyeExpr === 'sad') return (
      <>
        {renderEye(76, 85)}
        {renderEye(124, 85)}
        {/* sombra de sobrancelha triste */}
        {!isDark && (
          <>
            <path d="M 50 60 L 100 85 L 100 60 Z" fill="#f8fafc" />
            <path d="M 100 60 L 150 60 L 100 85 Z" fill="#f8fafc" />
          </>
        )}
      </>
    );

    // ── Angry ──
    if (eyeExpr === 'angry') return (
      <>
        {renderEye(76, 85)}
        {renderEye(124, 85)}
        {!isDark && (
          <>
            <path d="M 50 60 L 100 60 L 50 85 Z" fill="#f8fafc" />
            <path d="M 100 60 L 150 85 L 150 60 Z" fill="#f8fafc" />
          </>
        )}
      </>
    );

    // ── Idle (padrão) ──
    return (
      <>
        {renderEye(76, 85)}
        {renderEye(124, 85)}
      </>
    );
  };

  // ─────────────────────────────────────────────
  // Renderização da BOCA conforme expressão
  // ─────────────────────────────────────────────
  const getMouthPath = (): string => {
    switch (eyeExpr) {
      // Sorrisos largos
      case 'happy':
      case 'excited':
      case 'love':
      case 'starry':
        return 'M 65 130 Q 100 162 135 130';

      // Sorriso médio
      case 'cool':
      case 'wink':
        return 'M 70 136 Q 100 152 130 136';

      // Sorriso suave
      case 'attentive':
      case 'flirt':
        return 'M 68 136 Q 100 148 132 136';

      // Boca triste
      case 'sad':
      case 'nervous':
        return 'M 70 148 Q 100 136 130 148';

      // Boca levemente triste
      case 'embarrassed':
        return 'M 76 140 Q 100 148 124 140';

      // Boca reta / assimétrica
      case 'confused':
        return 'M 72 142 Q 100 140 130 142';
      case 'skeptical':
        return 'M 68 140 Q 96 136 128 143';
      case 'thinking':
        return 'M 68 138 Q 95 146 128 140';
      case 'angry':
        return 'M 70 148 Q 100 138 130 148';

      // Boca ondulada (nervoso)
      // já coberto em 'nervous' acima

      // Sleeping: boca normal
      case 'sleeping':
      case 'idle':
      default:
        return 'M 68 136 Q 100 150 132 136';
    }
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-visible bg-transparent transition-all duration-500 ease-in-out ${isHidden ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
      }`}>

      {qrCodeData && !pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <QRCodeDisplay
            type={qrCodeData.type}
            qrCodeUrl={qrCodeData.qrCodeUrl}
            qrContent={qrCodeData.qrContent}
            displayText={qrCodeData.displayText}
            amount={qrCodeData.amount}
            companyName={qrCodeData.companyName}
            onClose={onCloseQRCode || (() => { })}
            onCopy={onCopyQRCode}
            autoCloseSeconds={qrCodeData.type === 'pix' ? 0 : 15}
            theme={theme}
          />
        </div>
      )}

      {pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <PixConfirmationModal
            transactionId={pixConfirmationData.transactionId}
            amount={pixConfirmationData.amount}
            qrCodeUrl={pixConfirmationData.qrCodeUrl}
            pixCode={pixConfirmationData.pixCode}
            onConfirm={onConfirmPix || (async () => { })}
            onCancel={onCancelPix || (async () => { })}
            theme={theme}
          />
        </div>
      )}

      {/* Anéis de pulso */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2].map((ring) => (
          <div key={`wave-${ring}`} className="absolute rounded-full border-2" style={{
            width: `${60 + ring * 15}%`, aspectRatio: '1 / 1',
            borderColor: colors.ring,
            opacity: isSpeaking ? 0.4 : 0.2,
            animation: `pulse ${isSpeaking ? 1 : 2 + ring * 0.5}s ease-in-out infinite`,
            animationDelay: `${ring * 0.3}s`,
            willChange: 'transform, opacity',
          }} />
        ))}
      </div>

      {/* Halos rotativos */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 20s linear infinite', willChange: 'transform' }}>
        <div className="rounded-full opacity-20" style={{ width: '95%', aspectRatio: '1 / 1', background: `conic-gradient(from 0deg, transparent 0%, ${colors.halo} 25%, transparent 50%, ${colors.halo} 75%, transparent 100%)`, filter: 'blur(20px)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 15s linear infinite reverse', willChange: 'transform' }}>
        <div className="rounded-full opacity-30" style={{ width: '90%', aspectRatio: '1 / 1', background: `conic-gradient(from 45deg, transparent 0%, ${colors.halo} 20%, transparent 40%, ${colors.halo} 60%, transparent 80%, ${colors.halo} 100%)`, filter: 'blur(15px)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 10s linear infinite', willChange: 'transform' }}>
        <div className="rounded-full opacity-40" style={{ width: '85%', aspectRatio: '1 / 1', background: `radial-gradient(circle at center, transparent 60%, ${colors.halo}40 70%, ${colors.halo}20 80%, transparent 90%)`, filter: 'blur(10px)' }} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
        <div className="rounded-full" style={{ width: '80%', aspectRatio: '1 / 1', background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`, opacity: 0.5 }} />
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={500} height={500} className="absolute w-full h-full opacity-60 pointer-events-none" />

      {/* Partículas */}
      {isActive && !isHidden && (
        <div className="absolute w-full h-full overflow-visible pointer-events-none">
          {particles.map((particle, i) => (
            <div key={`particle-${i}`} className="absolute rounded-full animate-float" style={{
              left: particle.x, top: particle.y,
              width: particle.size, height: particle.size,
              backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
              opacity: 0.3,
              animationDuration: `${5 / particle.speed}s`,
              animationDelay: `${i * 0.2}s`,
              willChange: 'transform',
            }} />
          ))}
        </div>
      )}

      {/* Container Principal */}
      <div
        className={`absolute inset-0 m-auto w-[70%] flex items-center justify-center rounded-full overflow-visible ${orbSize} transition-all duration-700 ease-in-out`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          boxShadow: `0 0 40px ${colors.glow}`,
          backdropFilter: 'blur(8px)',
          aspectRatio: '1 / 1'
        }}
      >

        {/* ── ROSTO ── */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${showFace ? 'opacity-100' : 'opacity-0'}`}>
          <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20" style={{ overflow: 'visible' }}>
            <defs>
              <radialGradient id="eyeGradient">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id="glowGradient">
                <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="mouthDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                <stop offset="50%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
              </linearGradient>
              <filter id="mouthDepthShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Estrelinhas de fundo */}
            {stars.map((star) => (
              <circle key={star.id} cx={star.x} cy={star.y} r="1.5" fill={colors.primary} opacity="0.6">
                <animate attributeName="opacity" values="0;0.8;0" dur="3s" begin={`${star.delay}s`} repeatCount="indefinite" />
                <animate attributeName="r" values="1;2;1" dur="2s" begin={`${star.delay}s`} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0,0; 5,-5; 0,0" dur="4s" begin={`${star.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* ── OLHOS ── */}
            <g filter="url(#softGlow)" className="transition-all duration-500">
              {renderEyes()}
            </g>

            {/* ── BOCA ── */}
            <g className="transition-opacity duration-700">
              {/* sombra */}
              <path
                d={getMouthPath().replace(/Q (\d+) (\d+)/, (_, x, y) => `Q ${x} ${parseInt(y) + 4}`)}
                stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'}
                strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.5"
              />
              {/* boca principal com animação sutil de respiração */}
              <path d={getMouthPath()} stroke="url(#mouthDepth)" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#mouthDepthShadow)">
                {/* Só anima a boca quando não é uma expressão estática especial */}
                {(eyeExpr === 'idle' || eyeExpr === 'sleeping') && (
                  <animate
                    attributeName="d"
                    values={`${getMouthPath()};${getMouthPath().replace(/Q (\d+) (\d+)/, (_, x, y) => `Q ${x} ${parseInt(y) + 3}`)};${getMouthPath()}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
              {/* reflexo */}
              <path
                d={getMouthPath().replace(/Q (\d+) (\d+)/, (_, x, y) => `Q ${x} ${parseInt(y) - 4}`)}
                stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55"
              >
                <animate attributeName="opacity" values="0.4;0.65;0.4" dur="3s" repeatCount="indefinite" />
              </path>
            </g>

            {/* ZZZ para sleeping */}
            {eyeExpr === 'sleeping' && [...Array(3)].map((_, i) => (
              <text key={`zzz-${i}`} x={140 + i * 15} y={60 - i * 15} fill={colors.primary} fontSize="16" fontWeight="bold" opacity="0.6">
                Z
                <animate attributeName="opacity" values="0;0.8;0" dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
                <animate attributeName="y" values={`${60 - i * 15};${40 - i * 15}`} dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
              </text>
            ))}

            {/* Coraçõezinhos flutuantes para love */}
            {eyeExpr === 'love' && [
              { x: 155, y: 60, size: 10, delay: 0 },
              { x: 165, y: 40, size: 7, delay: 0.5 },
              { x: 145, y: 45, size: 6, delay: 1 },
            ].map((h, i) => (
              <path
                key={`heart-float-${i}`}
                d={`M ${h.x} ${h.y - h.size * 0.3} C ${h.x - h.size} ${h.y - h.size * 1.3} ${h.x - h.size * 2} ${h.y - h.size * 0.5} ${h.x} ${h.y + h.size * 0.8} C ${h.x + h.size * 2} ${h.y - h.size * 0.5} ${h.x + h.size} ${h.y - h.size * 1.3} ${h.x} ${h.y - h.size * 0.3} Z`}
                fill={colors.primary} opacity="0.5"
              >
                <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin={`${h.delay}s`} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values={`0,0; 4,${-h.size * 2}; 0,${-h.size * 4}`} dur="2s" begin={`${h.delay}s`} repeatCount="indefinite" />
              </path>
            ))}

            {/* Estrelinhas girando para starry */}
            {eyeExpr === 'starry' && [
              { x: 42, y: 70, delay: 0 },
              { x: 158, y: 65, delay: 0.4 },
              { x: 155, y: 125, delay: 0.8 },
            ].map((s, i) => (
              <circle key={`starry-ext-${i}`} cx={s.x} cy={s.y} r="3" fill={colors.secondary} opacity="0.7">
                <animate attributeName="opacity" values="0;0.9;0" dur="1.5s" begin={`${s.delay}s`} repeatCount="indefinite" />
                <animate attributeName="r" values="2;4;2" dur="1.5s" begin={`${s.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Gota de suor piscando para nervous */}
            {eyeExpr === 'nervous' && (
              <path d="M 152 48 Q 158 58 152 67 Q 146 58 152 48 Z" fill={colors.secondary} opacity="0.6">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
              </path>
            )}

          </svg>
        </div>

        {/* ── ORBE DE PROCESSAMENTO ── */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${!showFace ? 'opacity-100' : 'opacity-0'}`}>
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              <filter id="gooey">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -12" result="goo" />
              </filter>
              <radialGradient id="coreGradient1">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.6" />
              </radialGradient>
              <radialGradient id="coreGradient2">
                <stop offset="0%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
              </radialGradient>
              <radialGradient id="coreGradient3">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.4" />
              </radialGradient>
            </defs>
            <g filter="url(#gooey)">
              <circle cx="100" cy="100" r="45" fill="url(#coreGradient1)">
                <animate attributeName="r" values="40;55;40" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="cx" values="100;108;92;100" dur="3.5s" repeatCount="indefinite" />
                <animate attributeName="cy" values="100;92;108;100" dur="3.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="65" cy="100" r="35" fill="url(#coreGradient2)" opacity="0.95">
                <animate attributeName="r" values="32;42;32" dur="2s" repeatCount="indefinite" />
                <animate attributeName="cx" values="65;58;72;65" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="cy" values="100;108;92;100" dur="3.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="135" cy="100" r="35" fill="url(#coreGradient3)" opacity="0.95">
                <animate attributeName="r" values="33;43;33" dur="1.9s" repeatCount="indefinite" />
                <animate attributeName="cx" values="135;142;128;135" dur="3.2s" repeatCount="indefinite" />
                <animate attributeName="cy" values="100;92;108;100" dur="2.9s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="65" r="30" fill="url(#coreGradient1)" opacity="0.9">
                <animate attributeName="r" values="27;37;27" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="cx" values="100;108;92;100" dur="3.8s" repeatCount="indefinite" />
                <animate attributeName="cy" values="65;58;72;65" dur="2.7s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="135" r="30" fill="url(#coreGradient2)" opacity="0.9">
                <animate attributeName="r" values="28;38;28" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="cx" values="100;92;108;100" dur="3.1s" repeatCount="indefinite" />
                <animate attributeName="cy" values="135;142;128;135" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="72" cy="72" r="26" fill="url(#coreGradient3)" opacity="0.85">
                <animate attributeName="r" values="23;33;23" dur="2.1s" repeatCount="indefinite" />
                <animate attributeName="cx" values="72;65;79;72" dur="3.3s" repeatCount="indefinite" />
                <animate attributeName="cy" values="72;65;79;72" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="128" cy="72" r="26" fill="url(#coreGradient1)" opacity="0.85">
                <animate attributeName="r" values="24;34;24" dur="2.3s" repeatCount="indefinite" />
                <animate attributeName="cx" values="128;135;121;128" dur="3s" repeatCount="indefinite" />
                <animate attributeName="cy" values="72;65;79;72" dur="3.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="72" cy="128" r="26" fill="url(#coreGradient2)" opacity="0.85">
                <animate attributeName="r" values="22;32;22" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="cx" values="72;65;79;72" dur="2.9s" repeatCount="indefinite" />
                <animate attributeName="cy" values="128;135;121;128" dur="3.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="128" cy="128" r="26" fill="url(#coreGradient3)" opacity="0.85">
                <animate attributeName="r" values="23;33;23" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="cx" values="128;135;121;128" dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="cy" values="128;135;121;128" dur="2.6s" repeatCount="indefinite" />
              </circle>
              {[...Array(isSpeaking ? 16 : 8)].map((_, i) => {
                const angle = (i * Math.PI * 2) / (isSpeaking ? 16 : 8);
                const radius = isSpeaking ? 55 : 50;
                return (
                  <circle
                    key={`small-orb-${i}`}
                    cx={100 + Math.cos(angle) * radius}
                    cy={100 + Math.sin(angle) * radius}
                    r={isSpeaking ? '20' : '16'}
                    fill={i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.ring}
                    opacity="0.75"
                  >
                    <animate attributeName="r" values={isSpeaking ? '15;28;15' : '13;23;13'} dur={`${0.8 + i * 0.08}s`} repeatCount="indefinite" />
                    <animateTransform attributeName="transform" type="translate" values={`0,0; ${Math.cos(angle) * 18},${Math.sin(angle) * 18}; 0,0`} dur={`${1.2 + i * 0.07}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;1;0.4" dur={`${0.9 + i * 0.06}s`} repeatCount="indefinite" />
                  </circle>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Barras de Áudio */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full z-50 transition-opacity duration-700">
            <div className="flex items-end justify-center gap-[3px] h-[35%] w-[50%]">
              {audioLevels.map((level, i) => (
                <div
                  key={`audio-bar-${i}`}
                  className="flex-1 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${Math.max(5, level * 100)}%`,
                    backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
                    opacity: 0.7 + level * 0.3,
                    boxShadow: `0 0 ${level * 12}px ${i % 2 === 0 ? colors.primary : colors.secondary}`,
                    filter: 'blur(0.3px)'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Anéis ping */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{ aspectRatio: '1/1' }}>
        {[1, 2, 3].map(ring => (
          <div
            key={ring}
            className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{
              borderColor: colors.ring,
              animationDuration: `${1.5 * ring}s`,
              animationDelay: `${ring * 0.2}s`,
              opacity: 0.3 / ring,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(-10px) translateX(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float ease-in-out infinite; }
      `}</style>
    </div>
  );
}
