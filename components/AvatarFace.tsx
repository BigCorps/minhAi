'use client';

import { useEffect, useState, useRef } from 'react';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

export function AvatarFace({ isListening, isSpeaking, isProcessing }: AvatarFaceProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const blinkIntervalRef = useRef<any>(null);
  const mouthIntervalRef = useRef<any>(null);

  // --- LÓGICA DE PISCAR (MANTIDA) ---
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 3000;
      blinkIntervalRef.current = setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, delay);
    };
    scheduleNextBlink();
    return () => {
      if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current);
    };
  }, []);

  // --- LÓGICA DE FALAR (MANTIDA) ---
  useEffect(() => {
    if (isSpeaking) {
      mouthIntervalRef.current = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 120);
    } else {
      setMouthOpen(false);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    }
    return () => {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, [isSpeaking]);

  const getBackgroundColor = () => {
    if (isSpeaking) return '#34d399'; // Verde
    if (isProcessing) return '#fbbf24'; // Amarelo
    if (isListening) return '#60a5fa'; // Azul
    return '#e5e7eb'; // Cinza claro (Default)
  };

  const featureColor = '#000000';

  // --- LÓGICA DO OLHAR PARA CIMA ---
  // Se estiver pensando, sobe 6 pixels (-6). Se não, fica na posição 0.
  const eyeOffsetY = isProcessing ? -6 : 0;

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div 
        className="relative w-64 h-64 rounded-3xl flex items-center justify-center transition-colors duration-500 shadow-lg"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 64 64"
          className="transition-all duration-300"
          shapeRendering="crispEdges" // Garante o visual pixelado perfeito
        >
          {/* GRUPO DOS OLHOS - Mover ambos juntos facilita o alinhamento */}
          {/* Aplicamos a transição Y aqui para o efeito de "olhar para cima" */}
          
          {/* OLHO ESQUERDO */}
          <g 
            transform={`translate(16, ${20 + eyeOffsetY})`} 
            className="transition-transform duration-500 ease-in-out"
          >
            {isBlinking ? (
              <rect x="0" y="7" width="10" height="2" fill={featureColor} />
            ) : (
              <>
                {/* Base do olho (Oval Vertical 10x14) */}
                <path 
                  d="M2,0 H8 V2 H10 V12 H8 V14 H2 V12 H0 V2 H2 Z" 
                  fill={featureColor} 
                />
                {/* Brilho Grande (Canto Top-Esq) */}
                <rect x="2" y="2" width="3" height="3" fill="white" />
                {/* Brilho Pequeno (Meio-Dir) */}
                <rect x="6" y="7" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* OLHO DIREITO */}
          <g 
            transform={`translate(38, ${20 + eyeOffsetY})`}
            className="transition-transform duration-500 ease-in-out"
          >
            {isBlinking ? (
               <rect x="0" y="7" width="10" height="2" fill={featureColor} />
            ) : (
              <>
                <path 
                  d="M2,0 H8 V2 H10 V12 H8 V14 H2 V12 H0 V2 H2 Z" 
                  fill={featureColor} 
                />
                <rect x="2" y="2" width="3" height="3" fill="white" />
                <rect x="6" y="7" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* BOCA - Fica parada, ou se quiser que ela suba junto, use eyeOffsetY aqui também */}
          <g transform="translate(22, 42)">
            {isSpeaking && mouthOpen ? (
              // Boca Falando (Quadrado)
              <path 
                d="M4,0 H16 V2 H18 V8 H16 V10 H4 V8 H2 V2 H4 Z" 
                fill={featureColor} 
              />
            ) : isProcessing ? (
              // Boca Pensando (Pequena bolinha ou linha)
              <rect x="8" y="2" width="4" height="4" fill={featureColor} />
            ) : (
              // Sorriso (Estilo Imagem de Referência)
              // Pixel art exato do sorriso largo
              <path 
                d="M0,0 H4 V2 H6 V4 H14 V2 H16 V0 H20 V4 H16 V6 H14 V8 H6 V6 H4 V4 H0 Z" 
                fill={featureColor} 
              />
            )}
          </g>
        </svg>

        {/* Label do estado */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
           {(isListening || isSpeaking || isProcessing) && (
            <span className="px-3 py-1 bg-black/10 text-black/60 text-xs rounded-full font-bold backdrop-blur-sm">
              {isSpeaking && 'FALANDO'}
              {isProcessing && 'PENSANDO'}
              {isListening && 'OUVINDO'}
            </span>
           )}
        </div>
      </div>
    </div>
  );
}