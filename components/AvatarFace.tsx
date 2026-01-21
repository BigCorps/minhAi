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

  const orbSize = isSpeaking ? 'scale-[1.2]' : isProcessing ? 'scale-110' : 'scale-95';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">
      
      {/* 🌊 ANÉIS EXTERNOS (Padrão Original) */}
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

      {/* 🌟 HALOS DE LUZ */}
      <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
        <div 
          className="rounded-full" 
          style={{ 
            width: '85%',
            aspectRatio: '1 / 1',
            boxShadow: `0 0 50px ${colors.halo}50, inset 0 0 30px ${colors.halo}20`,
            filter: 'blur(15px)'
          }} 
        />
      </div>

      {/* 🔮 CONTAINER DO ORBE PRINCIPAL */}
      <div 
        className={`absolute inset-0 m-auto w-[75%] flex items-center justify-center rounded-full overflow-visible ${orbSize} transition-all duration-700 ease-out`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.5)',
          boxShadow: `0 0 60px ${colors.glow}`,
          backdropFilter: 'blur(12px)',
          aspectRatio: '1 / 1' 
        }}
      >
        
        {/* MODO ROSTO (Perfeito) */}
        {showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20" style={{ overflow: 'visible' }}>
            <defs>
              <radialGradient id="eyeGradient">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.3" />
              </radialGradient>
              <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <g filter="url(#softGlow)">
              <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" />
              <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" />
            </g>
            <path d="M 68 136 Q 100 150 132 136" stroke={colors.primary} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8">
               <animate attributeName="d" values="M 68 136 Q 100 150 132 136;M 68 136 Q 100 155 132 136;M 68 136 Q 100 150 132 136" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>
        )}

        {/* 🛠️ NOVO MODO ORBE DINÂMICO (Várias Formas Fluidas) */}
        {!showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              {/* Filtro Gooey Potencializado */}
              <filter id="gooey-intense">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
              </filter>
              <radialGradient id="liquidGradient">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="70%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
              </radialGradient>
            </defs>
            
            <g filter="url(#gooey-intense)">
              {/* Criamos 6 orbes independentes que se fundem */}
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r={isSpeaking ? 45 : 35}
                  fill="url(#liquidGradient)"
                  opacity="0.9"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    // Movimento circular/errático mais intenso
                    values={`
                      0,0; 
                      ${Math.cos(i * 60) * (isSpeaking ? 50 : 30)},${Math.sin(i * 60) * (isSpeaking ? 50 : 30)}; 
                      ${Math.cos(i * 60 + 120) * (isSpeaking ? 45 : 25)},${Math.sin(i * 60 + 120) * (isSpeaking ? 45 : 25)}; 
                      0,0
                    `}
                    dur={`${1.5 + i * 0.3}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values={isSpeaking ? "40;55;40" : "30;42;30"}
                    dur={`${2 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Núcleo central de "cola" para garantir unidade */}
              <circle cx="100" cy="100" r={isSpeaking ? 50 : 40} fill="url(#liquidGradient)">
                <animate attributeName="r" values="40;55;40" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        )}

        {/* Camada de Brilho de Vidro (Refração) */}
        <div className="absolute inset-0 rounded-full pointer-events-none border border-white/20 bg-gradient-to-tr from-white/10 to-transparent" />
      </div>

      {/* Partículas flutuantes externas */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div key={i} className="absolute rounded-full blur-[1px] animate-float"
            style={{
              left: `${(p.x / 500) * 100}%`, top: `${(p.y / 500) * 100}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              backgroundColor: colors.primary, boxShadow: `0 0 10px ${colors.primary}`,
              animationDuration: `${2 + p.speed * 2}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -20px); }
        }
        .animate-float { animation: float ease-in-out infinite; }
      `}</style>
    </div>
  );
}
