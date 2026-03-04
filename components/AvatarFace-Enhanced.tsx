'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PixConfirmationModal from '@/components/assistant/PixConfirmationModal';

interface AvatarFaceEnhancedProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isWakeWordDetected?: boolean;
  theme?: 'dark' | 'light';
  qrCodeData?: any;
  pixConfirmationData?: any;
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
  isWakeWordDetected = false,
  theme = 'dark',
  qrCodeData,
  pixConfirmationData,
  onCloseQRCode,
  onCopyQRCode,
  onConfirmPix,
  onCancelPix,
}: AvatarFaceEnhancedProps) {
  
  const isDark = theme === 'dark';

  const wakeWordColors = useMemo(() => ({
    primary: '#a855f7',
    secondary: '#d8b4fe',
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

  useEffect(() => {
    if (isWakeWordDetected) setColors(wakeWordColors);
    else if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
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
          scheduleNextBlink();
        }, blinkDuration);
      }, nextBlinkDelay);
    };
    if (showFace) scheduleNextBlink();
    return () => { if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current); };
  }, [showFace, eyeExpr, isBlinking]);

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

  const orbSize = isWakeWordDetected ? 'scale-[1.25]' : isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-100' : isListening ? 'scale-95' : 'scale-90';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2].map((ring) => (
          <div key={`wave-${ring}`} className="absolute rounded-full border-2" style={{ width: `${60 + ring * 15}%`, aspectRatio: '1 / 1', borderColor: colors.ring, opacity: isWakeWordDetected ? 0.6 : 0.2, animation: `pulse ${isWakeWordDetected ? 0.8 : 2}s ease-in-out infinite`, animationDelay: `${ring * 0.3}s` }} />
        ))}
      </div>
      <div className={`relative ${orbSize} transition-transform duration-300`}>
        <div className="w-32 h-32 rounded-full flex items-center justify-center relative" style={{ background: `radial-gradient(circle at 30% 30%, ${colors.primary}, ${colors.secondary})`, boxShadow: `0 0 40px ${colors.primary}80` }}>
          {showFace && (
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="35" cy="35" r="8" fill="white" opacity="0.9" />
                <circle cx="65" cy="35" r="8" fill="white" opacity="0.9" />
                <circle cx="35" cy="35" r="5" fill="black" />
                <circle cx="65" cy="35" r="5" fill="black" />
                <path d="M 30 60 Q 50 75 70 60" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
