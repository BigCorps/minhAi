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
  
  // Mapeamento semiótico de cores baseado no status 
  const statusColors = useMemo(() => ({
    idle: { p: '#A2D9F7', s: '#B0CB1F', glow: 'rgba(162, 217, 247, 0.2)' },
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
    <div className={`flex items-center justify-center h-full w-full transition-all duration-1000 ${isDark? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center scale-75 md:scale-100">
        
        {/* CAMADA 1: ONDAS DE ENERGIA (Ripples) - Estilo Siri/Apple Intelligence  */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {.[1, 3, 4]map((i) => (
            <div
              key={i}
              className="absolute rounded-full border transition-all duration-1000"
              style={{
                width: `${100 + (i * 35)}%`,
                height: `${100 + (i * 35)}%`,
                borderColor: colors.glow,
                opacity: isListening |

| isSpeaking? 0.3 / i : 0.05,
                transform: `scale(${isSpeaking? 1.1 + (0.05 * i) : 1})`,
                boxShadow: isProcessing? `0 0 50px ${colors.glow} inset` : 'none',
              }}
            />
          ))}
        </div>

        {/* CAMADA 2: O NÚCLEO LÍQUIDO (SVG Advanced Gooey)  */}
        <div className={`relative w-80 h-80 flex items-center justify-center rounded-full border ${isDark? 'border-white/10' : 'border-black/5'} shadow-2xl overflow-hidden`}>
          
          {/* Glow Atmosférico Dinâmico */}
          <div 
            className="absolute w-full h-full rounded-full blur-[80px] transition-all duration-1000 opacity-50"
            style={{ background: `radial-gradient(circle, ${colors.p}, ${colors.s}, transparent)` }}
          />

          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
            <defs>
              {/* Filtro de Dinâmica de Fluidos (Gooey Effect)  */}
              <filter id="liquid-fusion">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
              
              <linearGradient id="fusionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.p} />
                <stop offset="100%" stopColor={colors.s} />
              </linearGradient>
            </defs>

            <g filter="url(#liquid-fusion)">
              {/* Núcleo de Plasma Pulsante */}
              <circle 
                cx="100" cy="100" 
                r={isSpeaking? "52" : isListening? "44" : "38"} 
                fill="url(#fusionGradient)"
                className="transition-all duration-500"
              />
              
              {/* Satélites de Fluxo (Flowmaster Style)  */}
              <circle cx="100" cy="100" r="32" fill={colors.s} opacity="0.8">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; 25,10; -20,25; 0,0" : isProcessing? "0,0; 15,15; -15,15; 0,0" : "0,0; 5,5; -5,5; 0,0"}
                  dur={isSpeaking? "0.8s" : "4.5s"}
                  repeatCount="indefinite"
                />
              </circle>

              <circle cx="100" cy="100" r="28" fill={colors.p} opacity="0.6">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={isSpeaking? "0,0; -30,-15; 20,-20; 0,0" : isProcessing? "0,0; -10,-10; 10,-10; 0,0" : "0,0; -5,-5; 5,-5; 0,0"}
                  dur={isSpeaking? "0.6s" : "6.5s"}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>

          {/* CAMADA 3: REFLEXO LIQUID GLASS (Efeito Lente Futurista)  */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-white/20 via-transparent to-white/5 border border-white/30 backdrop-blur-[1px]" />
          <div className="absolute top-[12%] left-[18%] w-24 h-12 bg-white/20 blur-xl rounded-full rotate-[-35deg]" />
        </div>

        {/* HUD: Anel Tecnológico de Processamento  */}
        <div className={`absolute w-[340px] h-[340px] rounded-full border border-dashed transition-all duration-1000 ${isProcessing? 'animate-[spin_12s_linear_infinite]' : ''}`}
          style={{ borderColor: colors.glow, opacity: isProcessing? 0.5 : 0.15 }}
        />
      </div>

      {/* Legenda com Design de Vidro Fosco */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20">
        <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full backdrop-blur-3xl border transition-all ${isDark? 'bg-white/5 border-white/10 text-white/70' : 'bg-black/5 border-black/10 text-black/60'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isListening |

| isSpeaking? 'animate-ping' : ''}`} style={{ backgroundColor: colors.p }} />
          <span className="text-[9px] font-black tracking-[0.4em] uppercase leading-none">
            {isSpeaking? 'Sintetizando' : isProcessing? 'Analisando' : isListening? 'Escutando' : 'Standby'}
          </span>
        </div>
      </div>
    </div>
  );
}
