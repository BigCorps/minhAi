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

  // 🎯 CORES: Verde claro (aguardando), Verde escuro (processando), Azul (respondendo)
  const statusColors = useMemo(() => ({
    idle: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(34, 197, 94, 0.4)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'  // 🌟 HALO verde
    },
    listening: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.6)',
      ring: isDark ? '#4ade80' : '#22c55e',
      halo: isDark ? '#4ade80' : '#22c55e'  // 🌟 HALO verde claro
    },
    processing: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: 'rgba(22, 163, 74, 0.6)',
      ring: '#16a34a',
      halo: '#16a34a'  // 🌟 HALO verde escuro
    },
    speaking: { 
      primary: '#3b82f6',
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(37, 99, 235, 0.6)',
      ring: isDark ? '#3b82f6' : '#2563eb',
      halo: isDark ? '#3b82f6' : '#2563eb'  // 🌟 HALO azul
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

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [particles, colors]);

  const orbSize = isSpeaking 
    ? 'scale-[1.15]' // 🎯 15% MAIOR quando fala (bem visível!)
    : isProcessing 
    ? 'scale-100' 
    : isListening 
    ? 'scale-95'
    : 'scale-90';

  const orbTransition = 'transition-all duration-500 ease-out'; // 🎯 Transição suave

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-visible ${
      isDark ? 'bg-slate-900' : 'bg-gray-100'
    }`}>
      
      {/* 🌊 ONDAS DE FUNDO - APENAS 2 RINGS INTERNOS */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2].map((ring) => (
          <div
            key={`wave-${ring}`}
            className="absolute rounded-full border-2"
            style={{
              width: `${60 + ring * 15}%`,
              height: `${60 + ring * 15}%`,
              borderColor: colors.ring,
              opacity: isSpeaking ? 0.4 : 0.2, // 🎯 Mais visível quando fala
              animation: `pulse ${isSpeaking ? 1 : 2 + ring * 0.5}s ease-in-out infinite`, // 🎯 Mais rápido quando fala
              animationDelay: `${ring * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* 🌟 HALO DINÂMICO - LAYER 1 (Externa) */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: 'spin 20s linear infinite',
        }}
      >
        <div 
          className="w-[95%] h-[95%] rounded-full opacity-20"
          style={{
            background: `conic-gradient(
              from 0deg,
              transparent 0%,
              ${colors.halo} 25%,
              transparent 50%,
              ${colors.halo} 75%,
              transparent 100%
            )`,
            filter: 'blur(20px)',
          }}
        />
      </div>

      {/* 🌟 HALO DINÂMICO - LAYER 2 (Média) */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: 'spin 15s linear infinite reverse',
        }}
      >
        <div 
          className="w-[90%] h-[90%] rounded-full opacity-30"
          style={{
            background: `conic-gradient(
              from 45deg,
              transparent 0%,
              ${colors.halo} 20%,
              transparent 40%,
              ${colors.halo} 60%,
              transparent 80%,
              ${colors.halo} 100%
            )`,
            filter: 'blur(15px)',
          }}
        />
      </div>

      {/* 🌟 HALO DINÂMICO - LAYER 3 (Interna) */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: 'spin 10s linear infinite',
        }}
      >
        <div 
          className="w-[85%] h-[85%] rounded-full opacity-40"
          style={{
            background: `radial-gradient(
              circle at center,
              transparent 60%,
              ${colors.halo}40 70%,
              ${colors.halo}20 80%,
              transparent 90%
            )`,
            filter: 'blur(10px)',
          }}
        />
      </div>

      {/* 🌟 PULSO DO HALO */}
      <div 
        className="absolute inset-0 flex items-center justify-center animate-pulse"
      >
        <div 
          className="w-[80%] h-[80%] rounded-full"
          style={{
            boxShadow: `
              0 0 40px ${colors.halo}40,
              0 0 80px ${colors.halo}20,
              0 0 120px ${colors.halo}10
            `,
          }}
        />
      </div>

      {/* Canvas de partículas */}
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="absolute w-full h-full opacity-60 pointer-events-none"
      />

      {/* Partículas decorativas */}
      <div className="absolute w-full h-full overflow-visible">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-70 animate-float blur-[1px]"
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

      {/* ORB PRINCIPAL */}
      <div 
        className={`relative w-[70%] aspect-square flex items-center justify-center rounded-full overflow-visible ${orbSize} ${orbTransition}`}
        style={{
          background: 'transparent', // 🎯 TRANSPARENTE - sem degradê!
          boxShadow: `0 0 40px ${colors.glow}` // Só o glow externo
        }}
      >
        
        {/* FACE (olhos e boca) */}
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
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Olho esquerdo */}
            <g filter="url(#softGlow)" opacity={showFace ? 1 : 0} className="transition-opacity duration-700">
              <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
              <ellipse cx="73" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
              <circle cx="74" cy="81" r="3.2" fill="white" opacity="0.7" />
            </g>

            {/* Olho direito */}
            <g filter="url(#softGlow)" opacity={showFace ? 1 : 0} className="transition-opacity duration-700">
              <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
              <ellipse cx="121" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
              <circle cx="122" cy="81" r="3.2" fill="white" opacity="0.7" />
            </g>

            {/* Boca */}
            <g opacity={showFace ? 1 : 0} className="transition-opacity duration-700">
              <defs>
                <linearGradient id="mouthDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                  <stop offset="50%" stopColor={colors.primary} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
                </linearGradient>
                <filter id="mouthDepthShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <path d="M 66 137 Q 100 152 134 137" stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d="M 68 136 Q 100 150 132 136" stroke="url(#mouthDepth)" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#mouthDepthShadow)">
                <animate attributeName="d" values="M 68 136 Q 100 150 132 136;M 68 136 Q 100 153 132 136;M 68 136 Q 100 150 132 136" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 70 135 Q 100 147 130 135" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6">
                <animate attributeName="opacity" values="0.5;0.7;0.5" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 72 138 Q 100 151 128 138" stroke={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
            </g>

            {/* Partículas ambientes */}
            {[...Array(3)].map((_, i) => (
              <circle key={`ambient-${i}`} cx={50 + i * 50} cy={60} r="2" fill={colors.primary} opacity="0.4">
                <animate attributeName="cy" values="60;50;60" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        )}

        {/* ORB LÍQUIDO (quando processando/falando) */}
        {!showFace && (
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl transition-opacity duration-700">
            <defs>
              <filter id="gooey">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -12" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
              <radialGradient id="coreGradient">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4">
                  <animate attributeName="offset" values="100%;70%;100%" dur="2s" repeatCount="indefinite" />
                </stop>
              </radialGradient>
            </defs>
            
            <g filter="url(#gooey)">
              <circle cx="100" cy="100" r="45" fill="url(#coreGradient)">
                <animate attributeName="r" values="45;50;45" dur="2s" repeatCount="indefinite" />
              </circle>
              {[...Array(isSpeaking ? 8 : 5)].map((_, i) => (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r={isSpeaking ? "25" : "20"}
                  fill={i % 2 === 0 ? colors.primary : colors.secondary}
                  opacity="0.7"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`0,0; ${Math.cos(i * Math.PI / 4) * 30},${Math.sin(i * Math.PI / 4) * 30}; 0,0`}
                    dur={`${1.5 + i * 0.2}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values={isSpeaking ? "25;35;25" : "20;28;20"}
                    dur={`${1.5 + i * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          </svg>
        )}

        {/* Anel de status (rings) */}
        <div className="absolute inset-0 rounded-full overflow-visible">
          {[1, 2, 3].map(ring => (
            <div
              key={ring}
              className="absolute inset-0 rounded-full border-2 animate-ping"
              style={{
                borderColor: colors.ring,
                animationDuration: `${1.5 * ring}s`,
                animationDelay: `${ring * 0.2}s`,
                opacity: 0.3 / ring,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS personalizado para animações */}
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
        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
