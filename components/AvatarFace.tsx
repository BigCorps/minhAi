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
  
  // Mapeamento semiótico de cores e intensidades de glow
  const statusColors = useMemo(() => ({
    idle: { p: '#A2D9F7', s: '#B0CB1F', glow: 'rgba(162, 217, 247, 0.15)' },
    listening: { p: '#3b82f6', s: '#A2D9F7', glow: 'rgba(59, 130, 246, 0.45)' },
    processing: { p: '#fbbf24', s: '#f59e0b', glow: 'rgba(251, 191, 36, 0.35)' },
    speaking: { p: '#B0CB1F', s: '#34d399', glow: 'rgba(176, 203, 31, 0.55)' },
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
    <div className={`flex items-center justify-center h-full w-full transition-all duration-1000 ${isDark? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center scale-90 md:scale-100">
        
        {/* CAMADA 1: ONDAS HARMÔNICAS (Ripples) - Efeito de propagação de energia [1, 5] */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {.[1, 2, 3]map((i) => (
            <div
              key={i}
              className="absolute rounded-full border transition-all duration-1000"
              style={{
                width: `${100 + (i * 30)}%`,
                height: `${100 + (i * 30)}%`,
                borderColor: colors.glow,
                opacity: isListening |

| isSpeaking? 0.3 / i : 0.05,
                transform: `scale(${isSpeaking? 1.1 + (0.04 * i) : 1})`,
                boxShadow: isProcessing? `0 0 40px ${colors.glow} inset` : 'none',
              }}
            />
          ))}
        </div>

        {/* CAMADA 2: O NÚCLEO DE FUSÃO (SVG Advanced Gooey) - Estilo Flowmaster 3 [6, 7, 8] */}
        <div className={`relative w-80 h-80 flex items-center justify-center rounded-full border ${isDark? 'border-white/10' : 'border-black/5'} shadow-[0_0_100px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-[2px]`}>
          
          {/* Aura Atmosférica Dinâmica */}
          <div 
            className="absolute w-full h-full rounded-full blur-[80px] transition-all duration-1000 opacity-60"
            style={{ background: `radial-gradient(circle, ${colors.p}, ${colors.s}, transparent)` }}
          />

          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              <filter id="fusion-goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
              
              <linearGradient id="plasmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.p} />
                <stop offset="100%" stopColor={colors.s} />
              </linearGradient>
            </defs>

            <g filter="url(#fusion-goo)">
              {/* Núcleo Central: Expande com a fala */}
              <circle 
                cx="100" cy="100" 
                r={isSpeaking? "54" : isListening? "46" : "40"} 
                fill="url(#plasmaGrad)"
                className="transition-all duration-500"
              />
              
              {/* Fluxo de Partículas Satélites - Órbitas aleatórias simulando fluidez [9, 10, 11] */}
              <circle cx="100" cy="100" r="34" fill={colors.s} opacity="0.8">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; 25,12; -18,22; 0,0" : isProcessing? "0,0; 15,15; -15,15; 0,0" : "0,0; 5,5; -5,5; 0,0"}
                  dur={isSpeaking? "0.7s" : "4.2s"}
                  repeatCount="indefinite"
                />
              </circle>

              <circle cx="100" cy="100" r="30" fill={colors.p} opacity="0.6">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; -28,-18; 22,-12; 0,0" : isProcessing? "0,0; -12,-12; 12,-12; 0,0" : "0,0; -6,-6; 6,-6; 0,0"}
                  dur={isSpeaking? "0.9s" : "6.5s"}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>

          {/* CAMADA 3: LENTE DE VIDRO LÍQUIDO (Reflexos e Lente de Fresnel) [4, 12] */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-br from-white/25 via-transparent to-white/5 border border-white/30 backdrop-blur-[1px]" />
          <div className="absolute top-[10%] left-[15%] w-24 h-12 bg-white/20 blur-2xl rounded-full rotate-[-35deg]" />
        </div>

        {/* HUD DE PROCESSAMENTO: Anel tecnológico que ativa em 'Processing' */}
        <div className={`absolute w-[330px] h-[330px] rounded-full border-2 border-dashed transition-all duration-1000 ${isProcessing? 'animate-[spin_8s_linear_infinite]' : ''}`}
          style={{ borderColor: colors.glow, opacity: isProcessing? 0.5 : 0.1 }}
        />
      </div>

      {/* Legenda com Design de Transparência e Blur */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20">
        <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full backdrop-blur-3xl border transition-all ${isDark? 'bg-white/5 border-white/15 text-white/80' : 'bg-black/5 border-black/10 text-black/70'}`}>
          <div className={`w-2 h-2 rounded-full ${isListening |

| isSpeaking? 'animate-ping' : ''}`} style={{ backgroundColor: colors.p }} />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase leading-none opacity-80">
            {isSpeaking? 'Sintetizando' : isProcessing? 'Analisando' : isListening? 'Escutando' : 'Sincronizado'}
          </span>
        </div>
      </div>
    </div>
  );
}
