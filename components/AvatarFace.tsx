'use client';

import { useEffect, useState, useMemo } from 'react';

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
  
  const statusColors = useMemo(() => ({
    idle: { p: '#A2D9F7', s: '#B0CB1F', glow: 'rgba(162, 217, 247, 0.3)' },
    listening: { p: '#3b82f6', s: '#A2D9F7', glow: 'rgba(59, 130, 246, 0.5)' },
    processing: { p: '#fbbf24', s: '#f59e0b', glow: 'rgba(251, 191, 36, 0.4)' },
    speaking: { p: '#B0CB1F', s: '#34d399', glow: 'rgba(176, 203, 31, 0.6)' },
  }),);

  const [colors, setColors] = useState(statusColors.idle);

  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  },);

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center justify-center h-full w-full transition-all duration-1000 ${isDark? 'bg-[#020617]' : 'bg-gray-50'}`}>
      <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
        
        {/* CAMADA 1: AURA DE ENERGIA (Ripples) - Efeito Siri/Apple Intelligence [4, 5] */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {.[6, 7, 8]map((i) => (
            <div
              key={i}
              className="absolute rounded-full border transition-all duration-1000"
              style={{
                width: `${100 + (i * 40)}%`,
                height: `${100 + (i * 40)}%`,
                borderColor: colors.glow,
                opacity: isListening |

| isSpeaking? 0.2 / i : 0.05,
                transform: `scale(${isSpeaking? 1.1 + (0.05 * i) : 1})`,
                boxShadow: isProcessing? `0 0 40px ${colors.glow} inset` : 'none',
              }}
            />
          ))}
        </div>

        {/* CAMADA 2: O NÚCLEO LÍQUIDO (SVG Advanced Gooey) [1, 9] */}
        <div className={`relative w-72 h-72 flex items-center justify-center rounded-full border ${isDark? 'border-white/10' : 'border-black/5'} shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[1px]`}>
          
          {/* Glow Interno Dinâmico */}
          <div 
            className="absolute w-full h-full rounded-full blur-[80px] transition-all duration-1000 opacity-60"
            style={{ background: `radial-gradient(circle, ${colors.p}, ${colors.s}, transparent)` }}
          />

          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
            <defs>
              <filter id="futuristic-goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
              
              <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.p} />
                <stop offset="100%" stopColor={colors.s} />
              </linearGradient>
            </defs>

            <g filter="url(#futuristic-goo)">
              {/* Esfera de Base: Pulsa conforme a voz  */}
              <circle 
                cx="100" cy="100" 
                r={isSpeaking? "55" : isListening? "45" : "40"} 
                fill="url(#coreGradient)"
                className="transition-all duration-500"
              />
              
              {/* Fluxo Master: Satélites com velocidades e órbitas variadas  */}
              <circle cx="100" cy="100" r="35" fill={colors.s} opacity="0.8">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; 25,10; -20,25; 0,0" : isProcessing? "0,0; 15,15; -15,15; 0,0" : "0,0; 5,5; -5,5; 0,0"}
                  dur={isSpeaking? "0.8s" : "4s"}
                  repeatCount="indefinite"
                />
              </circle>

              <circle cx="100" cy="100" r="30" fill={colors.p} opacity="0.6">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; -30,-20; 25,-15; 0,0" : "0,0; -10,-10; 10,-10; 0,0"}
                  dur={isSpeaking? "0.6s" : "6s"}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>

          {/* CAMADA 3: REFLEXO LIQUID GLASS (Efeito de Lente)  */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-white/20 via-transparent to-white/5 border border-white/30" />
          <div className="absolute top-[10%] left-[15%] w-20 h-10 bg-white/20 blur-xl rounded-full rotate-[-30deg]" />
        </div>

        {/* HUD DE STATUS (Anel Tecnológico) [2] */}
        <div className={`absolute w-[320px] h-[320px] rounded-full border-2 border-dashed transition-all duration-1000 ${isProcessing? 'animate-[spin_10s_linear_infinite]' : ''}`}
          style={{ borderColor: colors.glow, opacity: isProcessing? 0.4 : 0.1 }}
        />
      </div>

      {/* Legenda com Design de Transparência  */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <div className={`flex items-center gap-3 px-6 py-2 rounded-full backdrop-blur-2xl border transition-all ${isDark? 'bg-white/5 border-white/10 text-white/60' : 'bg-black/5 border-black/10 text-black/50'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isListening |

| isSpeaking? 'animate-ping' : ''}`} style={{ backgroundColor: colors.p }} />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase leading-none">
            {isSpeaking? 'Sintetizando' : isProcessing? 'Pensando' : isListening? 'Ouvindo' : 'Standby'}
          </span>
        </div>
      </div>
    </div>
  );
}
