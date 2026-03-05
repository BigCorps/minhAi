
'use client';

/**
 * AvatarFace Enhanced
 * 
 * Versão estendida do AvatarFace que adiciona suporte ao estado de wake word.
 * 
 * Quando a wake word é detectada:
 * - Avatar muda para roxo/violeta
 * - Orbe pulsa mais intensamente
 * - Glow muda para roxo
 * 
 * Mantém compatibilidade total com a versão anterior.
 * Basta passar o novo prop `isWakeWordDetected`.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PixConfirmationModal from '@/components/assistant/PixConfirmationModal';

interface AvatarFaceEnhancedProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isWakeWordDetected?: boolean; // ✅ NOVO
  theme?: 'dark' | 'light';
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

type EyeExpression = 'idle' | 'sleeping' | 'surprised' | 'attentive' | 'flirt' | 'sad' | 'angry' | 'lookLeft' | 'lookRight' | 'lookDown' | 'happy';

export function AvatarFaceEnhanced({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  isWakeWordDetected = false, // ✅ NOVO: default false
  theme = 'dark',
  qrCodeData,
  pixConfirmationData,
  onCloseQRCode,
  onCopyQRCode,
  onConfirmPix,
  onCancelPix,
}: AvatarFaceEnhancedProps) {
  
  const isDark = theme === 'dark';

  // ✅ NOVO: Cores para wake word (roxo/violeta)
  const wakeWordColors = useMemo(() => ({
    primary: '#a855f7',      // purple-600
    secondary: '#d8b4fe',    // purple-300
    glow: isDark ? 'rgba(168, 85, 247, 0.6)' : 'rgba(147, 51, 234, 0.6)',
    ring: isDark ? '#a855f7' : '#9333ea',
    halo: isDark ? '#a855f7' : '#9333ea'
  }), [isDark]);

  const statusColors = useMemo(() => ({
    idle: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(34, 197, 94, 0.4)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'
    },
    listening: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.6)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'
    },
    processing: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: 'rgba(22, 163, 74, 0.6)',
      ring: '#16a34a',
      halo: '#16a34a'
    },
    speaking: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(37, 99, 235, 0.6)',
      ring: isDark ? '#3b82f6' : '#2563eb',
      halo: isDark ? '#3b82f6' : '#2563eb'
    },
  }), [isDark]);

  const [colors, setColors] = useState(statusColors.idle);
  const [particles, setParticles] = useState<Array<{x: number, y: number, size: number, speed: number}>>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(10).fill(0));
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeExpr, setEyeExpr] = useState<EyeExpression>('idle');
  const [stars, setStars] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exprTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showFace = !isProcessing && !isSpeaking;

  // ✅ NOVO: Atualizar cores quando wake word é detectada
  useEffect(() => {
    if (isWakeWordDetected) {
      setColors(wakeWordColors);
    } else if (isSpeaking) {
      setColors(statusColors.speaking);
    } else if (isProcessing) {
      setColors(statusColors.processing);
    } else if (isListening) {
      setColors(statusColors.listening);
    } else {
      setColors(statusColors.idle);
    }
  }, [isSpeaking, isProcessing, isListening, isWakeWordDetected, statusColors, wakeWordColors]);

  useEffect(() => {
    const generateStars = () => {
      const newStars = Array.from({ length: 6 }, (_, i) => ({
        id: Math.random(),
        x: 40 + Math.random() * 120,
        y: 40 + Math.random() * 120,
        delay: Math.random() * 5
      }));
      setStars(newStars);
    };
    generateStars();
    const interval = setInterval(generateStars, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const scheduleNextBlink = () => {
      const nextBlinkDelay = Math.random() * 4000 + 2000;
      blinkTimeoutRef.current = setTimeout(() => {
        if (eyeExpr === 'flirt' || eyeExpr === 'sleeping' || eyeExpr === 'happy' || isBlinking) {
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
    
    if (!shouldAnimate) {
      setEyeExpr('idle');
      return;
    }

    const expressions: EyeExpression[] = [
      'idle', 'sleeping', 'surprised', 'attentive', 'flirt', 'sad', 'angry', 'lookLeft', 'lookRight', 'lookDown', 'happy'
    ];

    const changeExpression = () => {
      const nonIdleExpressions = expressions.filter(e => e !== 'idle');
      const randomExpr = nonIdleExpressions[Math.floor(Math.random() * nonIdleExpressions.length)];
      setEyeExpr(randomExpr);

      exprTimeoutRef.current = setTimeout(() => {
        setEyeExpr('idle');
      }, 2000 + Math.random() * 1000);
    };

    const interval = setInterval(() => {
      changeExpression();
    }, 10000 + Math.random() * 5000);

    const initialTimeout = setTimeout(() => {
      changeExpression();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (exprTimeoutRef.current) clearTimeout(exprTimeoutRef.current);
    };
  }, [isSpeaking, isProcessing]);

  // ✅ NOVO: Mais partículas quando wake word está ativa
  useEffect(() => {
    const particleCount = isWakeWordDetected ? 20 : isSpeaking ? 25 : isProcessing ? 15 : isListening ? 10 : 8;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 500,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.8 + 0.3
    }));
    setParticles(newParticles);
  }, [isSpeaking, isProcessing, isListening, isWakeWordDetected]);

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
    let animationId: number;
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
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [particles, colors]);

  // ✅ NOVO: Orbe maior e mais intenso quando wake word está ativa
  const orbSize = isWakeWordDetected ? 'scale-[1.25]' : isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-100' : isListening ? 'scale-95' : 'scale-90';
  const orbPulse = isWakeWordDetected ? 'animate-pulse' : '';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">
      {qrCodeData && !pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <QRCodeDisplay type={qrCodeData.type} qrCodeUrl={qrCodeData.qrCodeUrl} qrContent={qrCodeData.qrContent} displayText={qrCodeData.displayText} amount={qrCodeData.amount} companyName={qrCodeData.companyName} onClose={onCloseQRCode || (() => {})} onCopy={onCopyQRCode} autoCloseSeconds={qrCodeData.type === 'pix' ? 0 : 15} theme={theme} />
        </div>
      )}
      {pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <PixConfirmationModal transactionId={pixConfirmationData.transactionId} amount={pixConfirmationData.amount} qrCodeUrl={pixConfirmationData.qrCodeUrl} pixCode={pixConfirmationData.pixCode} onConfirm={onConfirmPix || (async () => {})} onCancel={onCancelPix || (async () => {})} theme={theme} />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2].map((ring) => (
          <div key={`wave-${ring}`} className="absolute rounded-full border-2" style={{ width: `${60 + ring * 15}%`, aspectRatio: '1 / 1', borderColor: colors.ring, opacity: isWakeWordDetected ? 0.6 : isSpeaking ? 0.4 : 0.2, animation: `pulse ${isWakeWordDetected ? 0.8 : isSpeaking ? 1 : 2 + ring * 0.5}s ease-in-out infinite`, animationDelay: `${ring * 0.3}s` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 20s linear infinite' }}>
        <div className="rounded-full opacity-20" style={{ width: '95%', aspectRatio: '1 / 1', background: `conic-gradient(from 0deg, transparent 0%, ${colors.halo} 25%, transparent 50%, ${colors.halo} 75%, transparent 100%)`, filter: 'blur(20px)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 15s linear infinite reverse' }}>
        <div className="rounded-full opacity-30" style={{ width: '90%', aspectRatio: '1 / 1', background: `conic-gradient(from 45deg, transparent 0%, ${colors.halo} 20%, transparent 40%, ${colors.halo} 60%, transparent 80%, ${colors.halo} 100%)`, filter: 'blur(15px)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 10s linear infinite' }}>
        <div className="rounded-full opacity-40" style={{ width: '85%', aspectRatio: '1 / 1', background: `radial-gradient(circle at center, transparent 60%, ${colors.halo}40 70%, ${colors.halo}20 80%, transparent 90%)`, filter: 'blur(10px)' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
        <div className="rounded-full" style={{ width: '75%', aspectRatio: '1 / 1', background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`, filter: 'blur(30px)', opacity: isWakeWordDetected ? 0.8 : 0.4 }} />
      </div>
      <canvas ref={canvasRef} width={500} height={500} className="absolute inset-0 pointer-events-none" />
      <div className={`relative ${orbSize} transition-transform duration-300 ${orbPulse}`}>
        <div className="w-32 h-32 rounded-full flex items-center justify-center relative" style={{ background: `radial-gradient(circle at 30% 30%, ${colors.primary}, ${colors.secondary})`, boxShadow: `0 0 40px ${colors.primary}80, inset -2px -2px 8px rgba(0,0,0,0.3)` }}>
          {showFace && (
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Olhos */}
                <circle cx="35" cy="35" r="8" fill="white" opacity="0.9" />
                <circle cx="65" cy="35" r="8" fill="white" opacity="0.9" />
                <circle cx="35" cy="35" r="5" fill="black" />
                <circle cx="65" cy="35" r="5" fill="black" />
                {/* Boca */}
                <path d="M 30 60 Q 50 75 70 60" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          )}
          {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center">
              {audioLevels.map((level, i) => (
                <div key={i} className="absolute rounded-full" style={{ width: `${20 + level * 40}px`, height: `${20 + level * 40}px`, border: `2px solid ${colors.primary}`, opacity: 0.3 + level * 0.4, animation: 'pulse 0.5s ease-in-out infinite', animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
      {stars.map(star => (
        <div key={star.id} className="absolute w-1 h-1 rounded-full" style={{ left: `${star.x}%`, top: `${star.y}%`, background: colors.primary, opacity: 0.6, animation: `twinkle 3s ease-in-out infinite`, animationDelay: `${star.delay}s` }} />
      ))}
    </div>
  );
}
