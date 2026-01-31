'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  
  // ✨ NOVOS PROPS PARA QR CODES
  qrCodeData?: {
    type: 'whatsapp' | 'instagram' | 'pix';
    qrCodeUrl: string;
    qrContent: string;
    displayText: string;
    amount?: string;
    companyName?: string;
  } | null;
  
  // ✨ NOVOS PROPS PARA PIX CONFIRMATION
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

export function AvatarFace({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  theme = 'dark',
  qrCodeData,
  pixConfirmationData,
  onCloseQRCode,
  onCopyQRCode,
  onConfirmPix,
  onCancelPix,
}: AvatarFaceProps) {
  
  const isDark = theme === 'dark';

  // 🎯 CORES ORIGINAIS PRESERVADAS
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showFace = !isProcessing && !isSpeaking;

  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  // 👁️ SISTEMA DE PISCADAS ALEATÓRIAS E NATURAIS
  useEffect(() => {
    const scheduleNextBlink = () => {
      const nextBlinkDelay = Math.random() * 4000 + 2000;
      
      blinkTimeoutRef.current = setTimeout(() => {
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

    if (showFace) {
      scheduleNextBlink();
    }

    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [showFace]);

  useEffect(() => {
    const particleCount = isSpeaking ? 25 : isProcessing ? 15 : isListening ? 10 : 8;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 500,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.8 + 0.3
    }));
    setParticles(newParticles);
  }, [isSpeaking, isProcessing, isListening]);

  // 🎵 SIMULAR AUDIOLEVELS
  useEffect(() => {
    if (isSpeaking) {
      audioIntervalRef.current = setInterval(() => {
        setAudioLevels(prev => {
          const newLevels = prev.map((_, i) => {
            const base = Math.random() * 0.8;
            const wave = Math.sin(Date.now() / 200 + i * 0.5) * 0.3;
            return Math.max(0, Math.min(1, base + wave));
          });
          return newLevels;
        });
      }, 50);
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      setAudioLevels(Array(10).fill(0));
    }
    
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
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

  const orbSize = isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-100' : isListening ? 'scale-95' : 'scale-90';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">
      
      {/* ✨ QR CODE DISPLAY OVERLAY */}
      {qrCodeData && !pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <QRCodeDisplay
            type={qrCodeData.type}
            qrCodeUrl={qrCodeData.qrCodeUrl}
            qrContent={qrCodeData.qrContent}
            displayText={qrCodeData.displayText}
            amount={qrCodeData.amount}
            companyName={qrCodeData.companyName}
            onClose={onCloseQRCode || (() => {})}
            onCopy={onCopyQRCode}
            autoCloseSeconds={qrCodeData.type === 'pix' ? 0 : 15} // PIX não fecha automaticamente
          />
        </div>
      )}

      {/* ✨ PIX CONFIRMATION MODAL OVERLAY */}
      {pixConfirmationData && (
        <div className="absolute inset-0 z-[100]">
          <PIXConfirmationModal
            transactionId={pixConfirmationData.transactionId}
            amount={pixConfirmationData.amount}
            qrCodeUrl={pixConfirmationData.qrCodeUrl}
            pixCode={pixConfirmationData.pixCode}
            onConfirm={onConfirmPix || (async () => {})}
            onCancel={onCancelPix || (async () => {})}
          />
        </div>
      )}
      
      {/* 🌊 ONDAS DE FUNDO (Anéis de Borda) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2].map((ring) => (
          <div
            key={`wave-${ring}`}
            className="absolute rounded-full border-2"
            style={{
              width: `${60 + ring * 15}%`,
              aspectRatio: '1 / 1',
              borderColor: colors.ring,
              opacity: isSpeaking ? 0.4 : 0.2,
              animation: `pulse ${isSpeaking ? 1 : 2 + ring * 0.5}s ease-in-out infinite`,
              animationDelay: `${ring * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* 🌟 HALOS DINÂMICOS (Camadas de Luz) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 20s linear infinite' }}>
        <div 
          className="rounded-full opacity-20" 
          style={{ 
            width: '95%',
            aspectRatio: '1 / 1',
            background: `conic-gradient(from 0deg, transparent 0%, ${colors.halo} 25%, transparent 50%, ${colors.halo} 75%, transparent 100%)`, 
            filter: 'blur(20px)' 
          }} 
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 15s linear infinite reverse' }}>
        <div 
          className="rounded-full opacity-30" 
          style={{ 
            width: '90%',
            aspectRatio: '1 / 1',
            background: `conic-gradient(from 45deg, transparent 0%, ${colors.halo} 20%, transparent 40%, ${colors.halo} 60%, transparent 80%, ${colors.halo} 100%)`, 
            filter: 'blur(15px)' 
          }} 
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 10s linear infinite' }}>
        <div 
          className="rounded-full opacity-40" 
          style={{ 
            width: '85%',
            aspectRatio: '1 / 1',
            background: `radial-gradient(circle at center, transparent 60%, ${colors.halo}40 70%, ${colors.halo}20 80%, transparent 90%)`, 
            filter: 'blur(10px)' 
          }} 
        />
      </div>

      {/* 🌟 PULSO DO HALO */}
      <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
        <div 
          className="rounded-full" 
          style={{ 
            width: '80%',
            aspectRatio: '1 / 1',
            boxShadow: `0 0 40px ${colors.halo}40, 0 0 80px ${colors.halo}20, 0 0 120px ${colors.halo}10` 
          }} 
        />
      </div>

      {/* Canvas e Partículas decorativas */}
      <canvas ref={canvasRef} width={500} height={500} className="absolute w-full h-full opacity-60 pointer-events-none" />
      
      <div className="absolute w-full h-full overflow-visible pointer-events-none">
        {particles.map((particle, i) => (
          <div key={i} className="absolute rounded-full opacity-70 animate-float blur-[1px]"
            style={{
              left: `${(particle.x / 500) * 100}%`,
              top: `${(particle.y / 500) * 100}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
              animationDuration: `${2 + particle.speed * 2}s`,
              animationDelay: `${i * 0.1}s`,
              boxShadow: `0 0 ${particle.size * 2}px ${i % 2 === 0 ? colors.primary : colors.secondary}`
            }}
          />
        ))}
      </div>

      {/* 🔮 ORB PRINCIPAL */}
      <div 
        className={`absolute inset-0 m-auto w-[70%] flex items-center justify-center rounded-full overflow-visible ${orbSize} transition-all duration-500 ease-out`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          boxShadow: `0 0 40px ${colors.glow}`,
          backdropFilter: 'blur(8px)',
          aspectRatio: '1 / 1' 
        }}
      >
        
        {/* FACE (Com Piscadas) */}
        {showFace && (
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
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="mouthDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                <stop offset="50%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
              </linearGradient>
              <filter id="mouthDepthShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <g filter="url(#softGlow)" className="transition-opacity duration-700">
              {/* Olho Esquerdo */}
              {!isBlinking ? (
                <>
                  <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
                  <ellipse cx="73" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
                  <circle cx="74" cy="81" r="3.2" fill="white" opacity="0.7" />
                </>
              ) : (
                <path 
                  d="M 62 85 Q 76 87 90 85" 
                  stroke={colors.primary} 
                  strokeWidth="3.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  opacity="0.85"
                />
              )}
              
              {/* Olho Direito */}
              {!isBlinking ? (
                <>
                  <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
                  <ellipse cx="121" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
                  <circle cx="122" cy="81" r="3.2" fill="white" opacity="0.7" />
                </>
              ) : (
                <path 
                  d="M 110 85 Q 124 87 138 85" 
                  stroke={colors.primary} 
                  strokeWidth="3.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  opacity="0.85"
                />
              )}
            </g>

            <g className="transition-opacity duration-700">
              <path d="M 66 137 Q 100 152 134 137" stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d="M 68 136 Q 100 150 132 136" stroke="url(#mouthDepth)" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#mouthDepthShadow)">
                <animate attributeName="d" values="M 68 136 Q 100 150 132 136;M 68 136 Q 100 153 132 136;M 68 136 Q 100 150 132 136" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 70 135 Q 100 147 130 135" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6">
                <animate attributeName="opacity" values="0.5;0.7;0.5" dur="3s" repeatCount="indefinite" />
              </path>
            </g>

            {[...Array(3)].map((_, i) => (
              <circle key={`ambient-${i}`} cx={50 + i * 50} cy={60} r="2" fill={colors.primary} opacity="0.4">
                <animate attributeName="cy" values="60;50;60" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        )}

        {/* 🌊💫 MÚLTIPLOS ORBS FLUIDOS */}
        {!showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl transition-opacity duration-700">
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
                const cx = 100 + Math.cos(angle) * radius;
                const cy = 100 + Math.sin(angle) * radius;
                
                return (
                  <circle
                    key={`small-orb-${i}`}
                    cx={cx}
                    cy={cy}
                    r={isSpeaking ? "20" : "16"}
                    fill={i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.ring}
                    opacity="0.75"
                  >
                    <animate attributeName="r" values={isSpeaking ? "15;28;15" : "13;23;13"} dur={`${0.8 + (i * 0.08)}s`} repeatCount="indefinite" />
                    <animateTransform attributeName="transform" type="translate" values={`0,0; ${Math.cos(angle) * 18},${Math.sin(angle) * 18}; 0,0`} dur={`${1.2 + (i * 0.07)}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;1;0.4" dur={`${0.9 + (i * 0.06)}s`} repeatCount="indefinite" />
                  </circle>
                );
              })}

              {isSpeaking && [...Array(12)].map((_, i) => {
                const angle = (i * Math.PI * 2) / 12 + Math.PI / 12;
                const radius = 35;
                const cx = 100 + Math.cos(angle) * radius;
                const cy = 100 + Math.sin(angle) * radius;
                
                return (
                  <circle
                    key={`extra-orb-${i}`}
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill={i % 2 === 0 ? colors.primary : colors.secondary}
                    opacity="0.7"
                  >
                    <animate attributeName="r" values="10;18;10" dur={`${0.7 + (i * 0.05)}s`} repeatCount="indefinite" />
                    <animateTransform attributeName="transform" type="translate" values={`0,0; ${Math.cos(angle + Math.PI) * 12},${Math.sin(angle + Math.PI) * 12}; 0,0`} dur={`${1 + (i * 0.06)}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur={`${0.8 + (i * 0.05)}s`} repeatCount="indefinite" />
                  </circle>
                );
              })}
            </g>
          </svg>
        )}

        {/* Anéis de Status Internos (Ping) */}
        <div className="absolute inset-0 rounded-full" style={{ aspectRatio: '1/1' }}>
          {[1, 2, 3].map(ring => (
            <div key={ring} className="absolute inset-0 rounded-full border-2 animate-ping"
              style={{ borderColor: colors.ring, animationDuration: `${1.5 * ring}s`, animationDelay: `${ring * 0.2}s`, opacity: 0.3 / ring }} />
          ))}
        </div>

        {/* 🎵 GRÁFICO DE ÁUDIO */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full z-50">
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
                    filter: `blur(${0.3}px)`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(-10px) translateX(-10px); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-float { animation: float ease-in-out infinite; }
      `}</style>
    </div>
  );
}