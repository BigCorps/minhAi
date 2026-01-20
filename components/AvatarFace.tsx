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

  // 🎯 CORES CORRIGIDAS: Verde claro (aguardando), Verde escuro (processando), Azul (respondendo)
  const statusColors = useMemo(() => ({
    idle: { 
      primary: '#3b82f6',    // 🔵 AZUL para olhos/boca
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(34, 197, 94, 0.4)',
      ring: isDark ? '#4ade80' : '#22c55e'  // Verde para rings
    },
    listening: { 
      primary: '#3b82f6',    // 🔵 AZUL para olhos/boca (aguardando)
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.6)',
      ring: isDark ? '#4ade80' : '#22c55e'  // 🟢 Verde claro para rings
    },
    processing: { 
      primary: '#3b82f6',    // 🔵 AZUL para olhos/boca (processando)
      secondary: '#60a5fa',
      glow: 'rgba(22, 163, 74, 0.6)',
      ring: '#16a34a'  // 🟢 Verde escuro para rings
    },
    speaking: { 
      primary: '#3b82f6',    // 🔵 AZUL para olhos/boca (respondendo)
      secondary: '#60a5fa',
      glow: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(37, 99, 235, 0.6)',
      ring: isDark ? '#3b82f6' : '#2563eb'  // 🔵 Azul para rings
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
      ctx.clearRect(0, 0, 500, 500);
      time += 0.02;

      const waveCount = isSpeaking ? 8 : isProcessing ? 5 : isListening ? 4 : 3;
      for (let i = 0; i < waveCount; i++) {
        const radius = 60 + i * 35 + Math.sin(time + i) * 12;
        const alpha = 0.25 - (i * 0.03);
        
        ctx.beginPath();
        ctx.arc(250, 250, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [colors, isSpeaking, isProcessing, isListening]);
  
  const orbSize = isSpeaking ? 'scale-150' : isProcessing ? 'scale-125' : isListening ? 'scale-110' : 'scale-100';

  return (
    <div className="flex items-center justify-center h-full w-full overflow-visible">
      <div className="relative w-full h-full max-w-[500px] max-h-[500px] flex items-center justify-center overflow-visible">
        
        <canvas 
          ref={canvasRef}
          width={500}
          height={500}
          className="absolute inset-0 opacity-40"
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="absolute w-[90%] h-[90%] rounded-full border-2 opacity-20 animate-spin-slow"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dashed',
              animationDuration: '20s'
            }}
          />
          <div 
            className="absolute w-[80%] h-[80%] rounded-full border-2 opacity-15 animate-spin-reverse"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dotted',
              animationDuration: '25s'
            }}
          />
        </div>

        <div 
          className={`absolute w-[85%] h-[85%] rounded-full blur-[80px] transition-all duration-1000 ${
            isSpeaking ? 'animate-pulse-fast' : 'animate-pulse-slow'
          }`}
          style={{ 
            background: `radial-gradient(circle, ${colors.glow}, transparent)`,
          }}
        />

        <div className="absolute inset-0 pointer-events-none">
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

        <div 
          className={`relative w-[70%] aspect-square flex items-center justify-center rounded-full border shadow-2xl overflow-visible transition-all duration-700 ease-out ${
            isDark ? 'border-white/5' : 'border-black/5'
          } ${orbSize}`}
        >
          
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

              <g filter="url(#softGlow)" opacity={showFace ? 1 : 0} className="transition-opacity duration-700">
                <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
                <ellipse cx="73" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
                <circle cx="74" cy="81" r="3.2" fill="white" opacity="0.7" />
              </g>

              <g filter="url(#softGlow)" opacity={showFace ? 1 : 0} className="transition-opacity duration-700">
                <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#eyeGradient)" opacity="0.85" />
                <ellipse cx="121" cy="79" rx="6.4" ry="8" fill="url(#glowGradient)" opacity="0.6" />
                <circle cx="122" cy="81" r="3.2" fill="white" opacity="0.7" />
              </g>

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

              {[...Array(3)].map((_, i) => (
                <circle key={`ambient-${i}`} cx={50 + i * 50} cy={60} r="2" fill={colors.primary} opacity="0.4">
                  <animate attributeName="cy" values="60;50;60" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
          )}

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
                <circle cx="100" cy="100" r={isSpeaking ? "70" : isProcessing ? "58" : "50"} fill="url(#coreGradient)" className="transition-all duration-500">
                  {isSpeaking && <animate attributeName="r" values="65;75;65" dur="0.5s" repeatCount="indefinite" />}
                </circle>
                {[...Array(4)].map((_, i) => (
                  <circle key={i} cx="100" cy="100" r={38 - i * 6} fill={i % 2 === 0 ? colors.secondary : colors.primary} opacity={0.8 - i * 0.1}>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values={isSpeaking ? `0,0; ${30 + i * 8},${25 + i * 6}; ${-25 - i * 6},${30 + i * 8}; 0,0` : isProcessing ? `0,0; ${20 + i * 5},${18 + i * 4}; ${-18 - i * 4},${20 + i * 5}; 0,0` : `0,0; ${15 + i * 3},${15 + i * 3}; ${-15 - i * 3},${15 + i * 3}; 0,0`}
                      dur={`${2.5 - i * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
              </g>
            </svg>
          )}

          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-br from-white/20 to-transparent border border-white/30 backdrop-blur-[1px]" />
          
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-2xl opacity-50 animate-pulse pointer-events-none" style={{ backgroundColor: colors.primary }} />
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 rounded-full blur-2xl opacity-40 animate-pulse pointer-events-none" style={{ backgroundColor: colors.secondary, animationDelay: '0.5s' }} />
        </div>

        {(isProcessing || isSpeaking) && (
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-30 pointer-events-none">
            <div className="absolute w-full h-2 bg-gradient-to-r from-transparent via-white to-transparent animate-scan" style={{ top: 0 }} />
          </div>
        )}

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
          <div className={`px-8 py-3 rounded-full backdrop-blur-xl border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.primary, boxShadow: `0 0 10px ${colors.primary}` }} />
              <span className={`text-xs font-bold tracking-[0.3em] uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                {isSpeaking ? 'Sintetizando' : isProcessing ? 'Processando' : isListening ? 'Aguardando Palavra' : 'Aguardando Ativação'}
              </span>
            </div>
          </div>
        </div>

        {isSpeaking && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-2 rounded-full transition-all" style={{ height: '30px', backgroundColor: colors.primary, boxShadow: `0 0 8px ${colors.primary}`, animation: `wave 0.5s ease-in-out infinite`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
        @keyframes pulse-fast { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.15); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-30px); } }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        @keyframes wave { 0%, 100% { height: 12px; } 50% { height: 36px; } }
        .animate-spin-slow { animation: spin-slow linear infinite; }
        .animate-spin-reverse { animation: spin-reverse linear infinite; }
        .animate-pulse-slow { animation: pulse-slow ease-in-out 3s infinite; }
        .animate-pulse-fast { animation: pulse-fast ease-in-out 1s infinite; }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-scan { animation: scan 2s linear infinite; }
      `}</style>
    </div>
  );
}