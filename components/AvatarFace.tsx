'use client';

import { useEffect, useState, useMemo, useRef } from 'react';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
}

export function AvatarFace({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  theme = 'dark' 
}: AvatarFaceProps) {
  
  const isDark = theme === 'dark';

  // 🎯 CORES ORIGINAIS PRESERVADAS (Conforme seu código anterior)
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const showFace = !isProcessing && !isSpeaking;

  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  // Partículas
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

  // Animação do Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, 500, 500);
      time += 0.01;
      particles.forEach((p, i) => {
        const x = p.x + Math.sin(time + i) * 40;
        const y = p.y + Math.cos(time + i * 0.5) * 40;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
        grad.addColorStop(0, i % 2 === 0 ? colors.primary : colors.secondary);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [particles, colors]);

  const orbScale = isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-100' : isListening ? 'scale-95' : 'scale-90';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">
      
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

      {/* 🔄 ANÉIS PONTILHADOS/TRACEJADOS (Recuperados) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[92%] h-[92%] rounded-full border-2 opacity-20 animate-spin-slow"
          style={{ borderColor: colors.ring, borderStyle: 'dashed', animationDuration: '20s', aspectRatio: '1/1' }} />
        <div className="absolute w-[82%] h-[82%] rounded-full border-2 opacity-15 animate-spin-reverse"
          style={{ borderColor: colors.ring, borderStyle: 'dotted', animationDuration: '25s', aspectRatio: '1/1' }} />
      </div>

      {/* 🌟 HALOS DINÂMICOS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animation: 'spin 20s linear infinite' }}>
        <div className="rounded-full opacity-20" style={{ width: '95%', aspectRatio: '1/1', background: `conic-gradient(from 0deg, transparent 0%, ${colors.halo} 25%, transparent 50%, ${colors.halo} 75%, transparent 100%)`, filter: 'blur(20px)' }} />
      </div>

      {/* 🌟 PULSO DO HALO */}
      <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
        <div className="rounded-full" style={{ width: '80%', aspectRatio: '1/1', boxShadow: `0 0 40px ${colors.halo}40, 0 0 80px ${colors.halo}20, 0 0 120px ${colors.halo}10` }} />
      </div>

      {/* Canvas Decorativo */}
      <canvas ref={canvasRef} width={500} height={500} className="absolute w-full h-full opacity-60 pointer-events-none" />

      {/* 🔮 ORB PRINCIPAL (CONTAINER) */}
      <div 
        className={`absolute inset-0 m-auto w-[70%] flex items-center justify-center rounded-full overflow-hidden ${orbScale} transition-all duration-500 ease-out`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          boxShadow: `0 0 40px ${colors.glow}`,
          backdropFilter: 'blur(8px)',
          aspectRatio: '1 / 1' 
        }}
      >
        
        {/* FACE ORIGINAL REESTABELECIDA */}
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
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="mouthDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                <stop offset="50%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <g filter="url(#softGlow)" className="transition-opacity duration-700">
              <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
              <circle cx="74" cy="81" r="3.2" fill="white" opacity="0.7" />
              <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
              <circle cx="122" cy="81" r="3.2" fill="white" opacity="0.7" />
            </g>

            <path d="M 68 136 Q 100 150 132 136" stroke="url(#mouthDepth)" strokeWidth="8" fill="none" strokeLinecap="round">
              <animate attributeName="d" values="M 68 136 Q 100 150 132 136;M 68 136 Q 100 153 132 136;M 68 136 Q 100 150 132 136" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>
        )}

        {/* 🛠️ ORB LÍQUIDO (GOOEY) - MAIS RÁPIDO E PULSANTE */}
        {!showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              <filter id="gooey-orb">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
              </filter>
              <radialGradient id="gooeyGrad">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8" />
              </radialGradient>
            </defs>
            <g filter="url(#gooey-orb)">
              <circle cx="100" cy="100" r={isSpeaking ? "65" : "55"} fill="url(#gooeyGrad)">
                <animate attributeName="r" values={isSpeaking ? "60;70;60" : "53;57;53"} dur={isSpeaking ? "0.8s" : "2s"} repeatCount="indefinite" />
              </circle>
              {[...Array(6)].map((_, i) => (
                <circle key={i} cx="100" cy="100" r={isSpeaking ? "45" : "35"} fill="url(#gooeyGrad)">
                  <animateTransform
                    attributeName="transform" type="translate"
                    values={`0,0; ${Math.cos(i * 60) * (isSpeaking ? 50 : 30)},${Math.sin(i * 60) * (isSpeaking ? 50 : 30)}; 0,0`}
                    dur={isSpeaking ? "0.6s" : "1.5s"}
                    repeatCount="indefinite"
                    begin={`${i * 0.1}s`}
                  />
                </circle>
              ))}
            </g>
          </svg>
        )}

        {/* ⚡ EFEITO DE RAIO (Scan Line) */}
        {(isProcessing || isSpeaking) && (
          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-full">
            <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent animate-scan" />
          </div>
        )}
      </div>

      {/* 📊 WAVEFORM DE ÁUDIO (Recuperado) */}
      {isSpeaking && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1 h-6 items-center z-40">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-1 rounded-full bg-white animate-wave-bars" 
              style={{ animationDelay: `${i * 0.1}s`, height: '8px', boxShadow: `0 0 10px ${colors.primary}` }} />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes scan { 0% { top: -10%; } 100% { top: 110%; } }
        @keyframes wave-bars { 0%, 100% { height: 6px; } 50% { height: 20px; } }
        
        .animate-float { animation: float ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow linear infinite; }
        .animate-spin-reverse { animation: spin-reverse linear infinite; }
        .animate-scan { animation: scan 1.8s linear infinite; }
        .animate-wave-bars { animation: wave-bars 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
