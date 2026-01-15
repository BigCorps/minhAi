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

  // --- LÓGICA DO OLHAR PARA CIMA (MANTIDA) ---
  const eyeOffsetY = isProcessing ? -5 : 0;

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
          shapeRendering="crispEdges" // Essencial para o visual pixel perfect
        >
          {/* NOVAS PROPORÇÕES BASEADAS NA REFERÊNCIA (Print 1):
             Olhos menores (8x12) e Boca mais larga (36 de largura)
          */}

          {/* OLHO ESQUERDO - Diminuído para 8x12 */}
          <g 
            transform={`translate(18, ${18 + eyeOffsetY})`} 
            className="transition-transform duration-500 ease-in-out"
          >
            {isBlinking ? (
              <rect x="0" y="5" width="8" height="2" fill={featureColor} />
            ) : (
              <>
                {/* Base do olho 8x12 */}
                <path d="M2,0 H6 V2 H8 V10 H6 V12 H2 V12 H0 V10 V2 H2 Z" fill={featureColor} />
                {/* Brilhos ajustados para o tamanho menor */}
                <rect x="1" y="1" width="3" height="3" fill="white" />
                <rect x="5" y="8" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* OLHO DIREITO - Diminuído para 8x12 */}
          <g 
            transform={`translate(38, ${18 + eyeOffsetY})`}
            className="transition-transform duration-500 ease-in-out"
          >
            {isBlinking ? (
               <rect x="0" y="5" width="8" height="2" fill={featureColor} />
            ) : (
              <>
                 {/* Base do olho 8x12 */}
                <path d="M2,0 H6 V2 H8 V10 H6 V12 H2 V12 H0 V10 V2 H2 Z" fill={featureColor} />
                 {/* Brilhos ajustados */}
                <rect x="1" y="1" width="3" height="3" fill="white" />
                <rect x="5" y="8" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* GRUPO DA BOCA - Centralizado e posicionado mais acima */}
          <g transform="translate(14, 34)">
            {isSpeaking && mouthOpen ? (
              // Boca Falando (Quadrado largo)
              <rect x="8" y="0" width="20" height="10" fill={featureColor} rx="2" />
            ) : isProcessing ? (
              // Boca Pensando (Biquinho pequeno)
              <rect x="16" y="2" width="4" height="4" fill={featureColor} />
            ) : (
              // SORRISO PADRÃO - REDESENHADO PARA SER EXATAMENTE IGUAL AO PRINT 1
              // Largura total: 36 pixels. Altura: 8 pixels.
              <path 
                d="M0,0 H4 V2 H8 V4 H28 V2 H32 V0 H36 V4 H32 V6 H28 V8 H8 V6 H4 V4 H0 Z" 
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