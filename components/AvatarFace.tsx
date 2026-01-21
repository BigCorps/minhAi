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

  // 🎨 Definição de Cores (Unindo a vibração do inicial com a paleta do atual)
  const statusColors = useMemo(() => ({
    idle: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.4)',
      ring: isDark ? '#60a5fa' : '#2563eb',
      halo: '#3b82f6'
    },
    listening: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.6)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: '#4ade80'
    },
    processing: { 
      primary: '#fbbf24', // Amarelo do código inicial
      secondary: '#f59e0b',
      glow: 'rgba(251, 191, 36, 0.6)',
      ring: '#f59e0b',
      halo: '#fbbf24'
    },
    speaking: { 
      primary: isDark ? '#4ade80' : '#10b981', // Verde do código inicial
      secondary: isDark ? '#34d399' : '#059669',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(16, 185, 129, 0.6)',
      ring: isDark ? '#10b981' : '#059669',
      halo: '#4ade80'
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

  // Partículas flutuantes
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

  // Canvas para ondas de fundo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, 500, 500);
      time += 0.02;
      const waveCount = isSpeaking ? 6 : isProcessing ? 4 : 3;
      for (let i = 0; i < waveCount; i++) {
        const radius = 80 + i * 30 + Math.sin(time + i) * 10;
        const alpha = 0.2 - (i * 0.04);
        ctx.beginPath();
        ctx.arc(250, 250, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [colors, isSpeaking, isProcessing]);

  const orbScale = isSpeaking ? 'scale-[1.15]' : isProcessing ? 'scale-105' : 'scale-100';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-transparent">
      
      {/* 🌊 Camada 0: Canvas de Ondas */}
      <canvas ref={canvasRef} width={500} height={500} className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" />

      {/* 🔄 Camada 1: Anéis Rotativos (Pontilhado e Tracejado) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute w-[92%] h-[92%] rounded-full border-2 opacity-20 animate-spin-slow"
          style={{ borderColor: colors.ring, borderStyle: 'dashed', animationDuration: '20s', aspectRatio: '1/1' }}
        />
        <div
          className="absolute w-[82%] h-[82%] rounded-full border-2 opacity-15 animate-spin-reverse"
          style={{ borderColor: colors.ring, borderStyle: 'dotted', animationDuration: '25s', aspectRatio: '1/1' }}
        />
      </div>

      {/* 🌟 Camada 2: Aura Pulsante de Fundo */}
      <div
        className={`absolute w-[85%] h-[85%] rounded-full blur-[60px] transition-all duration-1000 ${isSpeaking ? 'animate-pulse-fast' : 'animate-pulse-slow'}`}
        style={{ background: `radial-gradient(circle, ${colors.glow}, transparent)`, aspectRatio: '1/1' }}
      />

      {/* ✨ Camada 3: Partículas Flutuantes */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div key={i} className="absolute rounded-full opacity-60 animate-float"
            style={{
              left: `${(p.x / 500) * 100}%`, top: `${(p.y / 500) * 100}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
              boxShadow: `0 0 10px ${colors.primary}`,
              animationDuration: `${2 + p.speed * 2}s`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>

      {/* 🔮 Camada 4: CONTAINER CENTRAL (Orbe/Rosto) */}
      <div 
        className={`relative w-[70%] flex items-center justify-center rounded-full transition-all duration-700 ease-out ${orbScale}`}
        style={{
          aspectRatio: '1 / 1',
          background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.6)',
          boxShadow: `0 0 50px ${colors.glow}`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
        }}
      >
        
        {/* MODO ROSTO */}
        {showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20 transition-opacity duration-700" style={{ overflow: 'visible' }}>
            <defs>
              <radialGradient id="eyeGradient">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.3" />
              </radialGradient>
              <filter id="softGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <g filter="url(#softGlow)">
              <ellipse cx="76" cy="85" rx="14" ry="17" fill="url(#eyeGradient)" />
              <ellipse cx="124" cy="85" rx="14" ry="17" fill="url(#eyeGradient)" />
            </g>
            <path d="M 68 136 Q 100 150 132 136" stroke={colors.primary} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8">
              <animate attributeName="d" values="M 68 136 Q 100 150 132 136;M 68 136 Q 100 155 132 136;M 68 136 Q 100 150 132 136" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>
        )}

        {/* MODO ORBE GOOEY (Rápido e Pulsante) */}
        {!showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              <filter id="gooey-main">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
              </filter>
              <radialGradient id="liquidGrad">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8" />
              </radialGradient>
            </defs>
            <g filter="url(#gooey-main)">
              {[...Array(6)].map((_, i) => (
                <circle key={i} cx="100" cy="100" r={isSpeaking ? 48 : 38} fill="url(#liquidGrad)">
                  <animateTransform
                    attributeName="transform" type="translate"
                    values={`0,0; ${Math.cos(i * 60) * (isSpeaking ? 55 : 30)},${Math.sin(i * 60) * (isSpeaking ? 55 : 30)}; 0,0`}
                    dur={isSpeaking ? "0.8s" : "2s"}
                    repeatCount="indefinite"
                    begin={`${i * 0.1}s`}
                  />
                  <animate attributeName="r" values={isSpeaking ? "40;55;40" : "35;42;35"} dur="1.5s" repeatCount="indefinite" />
                </circle>
              ))}
              <circle cx="100" cy="100" r={isSpeaking ? 60 : 50} fill="url(#liquidGrad)">
                <animate attributeName="r" values={isSpeaking ? "55;65;55" : "48;52;48"} dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        )}

        {/* 🔦 Camada 5: Scan Line (Apenas Processando/Falando) */}
        {(isProcessing || isSpeaking) && (
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-30 pointer-events-none">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan" style={{ top: 0 }} />
          </div>
        )}

        {/* 💎 Camada 6: Reflexo de Vidro */}
        <div className="absolute inset-0 rounded-full pointer-events-none border border-white/20 bg-gradient-to-tr from-white/10 to-transparent" />
      </div>

      {/* 🏷️ Camada 7: Badge de Status (Pílula inferior) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <div className={`px-6 py-2 rounded-full backdrop-blur-xl border transition-all duration-500 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.primary, boxShadow: `0 0 10px ${colors.primary}` }} />
            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              {isSpeaking ? 'Sintetizando' : isProcessing ? 'Processando' : isListening ? 'Ouvindo' : 'Pronto'}
            </span>
          </div>
        </div>
      </div>

      {/* 📊 Camada 8: Waveform de Áudio (Quando fala) */}
      {isSpeaking && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 h-8 items-center z-30">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 rounded-full"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 0 10px ${colors.primary}`,
                animation: `wave-bars 0.6s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
                height: '10px'
              }}
            />
          ))}
        </div>
      )}

      {/* 🎨 Estilos Globais */}
      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.05); } }
        @keyframes pulse-fast { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
        @keyframes float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(10px, -25px); } }
        @keyframes scan { 0% { top: -10%; } 100% { top: 110%; } }
        @keyframes wave-bars { 0%, 100% { height: 8px; } 50% { height: 28px; } }
        
        .animate-spin-slow { animation: spin-slow linear infinite; }
        .animate-spin-reverse { animation: spin-reverse linear infinite; }
        .animate-pulse-slow { animation: pulse-slow ease-in-out 4s infinite; }
        .animate-pulse-fast { animation: pulse-fast ease-in-out 1.5s infinite; }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-scan { animation: scan 2.5s linear infinite; }
      `}</style>
    </div>
  );
}
