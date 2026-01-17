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
  
  // Mapeamento semiótico de cores baseado no status [3, 4]
  const statusColors = useMemo(() => ({
    idle: { p: '#A2D9F7', s: '#B0CB1F' },       // Cores da Marca
    listening: { p: '#3b82f6', s: '#A2D9F7' },  // Azul vibrante (foco)
    processing: { p: '#fbbf24', s: '#f59e0b' }, // Amarelo (alerta/pensando)
    speaking: { p: '#B0CB1F', s: '#34d399' },    // Lime/Verde (síntese ativa)
  }), []);

  const [colors, setColors] = useState(statusColors.idle);

  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center justify-center h-full w-full transition-colors duration-1000 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`relative w-80 h-80 flex items-center justify-center rounded-full border ${isDark ? 'border-white/5' : 'border-black/5'} shadow-2xl overflow-hidden`}>
        
        {/* Camada 1: Aura de Glow de Fundo  */}
        <div 
          className="absolute w-full h-full rounded-full blur-[60px] transition-all duration-1000 opacity-40"
          style={{ background: `radial-gradient(circle, ${colors.p}, transparent)` }}
        />

        {/* Camada 2: O Orbe de Partículas Fluidas (SVG Gooey)  */}
        <svg viewBox="0 0 200 200" className="w-64 h-64 relative z-10 filter drop-shadow-lg">
          <defs>
            <filter id="gooey">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>

          <g filter="url(#gooey)">
            {/* Núcleo Central: Pulsação reativa [1, 5] */}
            <circle 
              cx="100" cy="100" r={isSpeaking ? "48" : "38"} 
              fill={colors.p}
              className={`transition-all duration-500 ${isProcessing ? 'animate-pulse' : ''}`}
            />
            
            {/* Satélite 1: Fluidez inspirada no Flowmaster 3 [6, 7] */}
            <circle cx="100" cy="100" r="32" fill={colors.s}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values={isSpeaking ? "0,0; 20,15; -15,20; 0,0" : "0,0; 8,8; -8,8; 0,0"}
                dur={isProcessing ? "1.2s" : "5s"}
                repeatCount="indefinite"
              />
            </circle>

            {/* Satélite 2: Complexidade de Superelipse  */}
            <circle cx="100" cy="100" r="28" fill={colors.p} opacity="0.7">
              <animateTransform
                attributeName="transform"
                type="translate"
                values={isSpeaking ? "0,0; -25,-15; 20,-20; 0,0" : "0,0; -8,-8; 8,-8; 0,0"}
                dur={isProcessing ? "0.9s" : "7s"}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>

        {/* Camada 3: Efeito de Vidro (Refração)  */}
        <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-br from-white/15 to-transparent border border-white/20 backdrop-blur-[2px]" />
      </div>

      {/* Legenda Tecnológica Minimalista  */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className={`px-5 py-2 rounded-full backdrop-blur-xl border ${isDark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-black/5 border-black/10 text-black/40'} text-[9px] font-bold tracking-[0.3em] uppercase transition-all`}>
          {isSpeaking ? 'Sintetizando' : isProcessing ? 'Processando' : isListening ? 'Escutando' : 'Standby'}
        </div>
      </div>
    </div>
  );
}
