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
    if (isSpeaking) return '#34d399'; 
    if (isProcessing) return '#fbbf24'; 
    if (isListening) return '#60a5fa'; 
    return '#e5e7eb'; 
  };

  const featureColor = '#000000';
  const eyeOffsetY = isProcessing ? -4 : 0;

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div 
        className="relative w-64 h-64 rounded-3xl flex items-center justify-center transition-colors duration-500 shadow-sm"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 64 64"
          className="transition-all duration-300"
          shapeRendering="crispEdges"
        >
          {/* GRUPO PRINCIPAL COM ESCALA DE 150% (1.5)
             Agrupamos tudo e aplicamos a escala para aumentar o rosto inteiro
             mantendo a proporção exata. Usamos transformOrigin no centro (32px 32px)
             para que ele cresça a partir do meio.
          */}
          <g style={{ transform: 'scale(1.5)', transformOrigin: '32px 32px' }}>
            
            {/* Conteúdo original mantido intacto dentro do grupo escalado */}

            {/* OLHO ESQUERDO (8x12) */}
            <g 
              transform={`translate(21, ${22 + eyeOffsetY})`} 
              className="transition-transform duration-500 ease-in-out"
            >
              {isBlinking ? (
                <rect x="0" y="5" width="8" height="2" fill={featureColor} />
              ) : (
                <>
                  <path d="M1,0 H7 V1 H8 V11 H7 V12 H1 V11 H0 V1 H1 Z" fill={featureColor} />
                  <rect x="1" y="1" width="3" height="4" fill="white" />
                  <rect x="5" y="8" width="2" height="2" fill="white" />
                </>
              )}
            </g>

            {/* OLHO DIREITO (8x12) */}
            <g 
              transform={`translate(35, ${22 + eyeOffsetY})`}
              className="transition-transform duration-500 ease-in-out"
            >
              {isBlinking ? (
                 <rect x="0" y="5" width="8" height="2" fill={featureColor} />
              ) : (
                <>
                  <path d="M1,0 H7 V1 H8 V11 H7 V12 H1 V11 H0 V1 H1 Z" fill={featureColor} />
                  <rect x="1" y="1" width="3" height="4" fill="white" />
                  <rect x="5" y="8" width="2" height="2" fill="white" />
                </>
              )}
            </g>

            {/* GRUPO DA BOCA (Y=38, Largura=32) */}
            <g transform="translate(16, 38)">
              {isSpeaking && mouthOpen ? (
                <rect x="4" y="0" width="24" height="8" fill={featureColor} rx="1" />
              ) : isProcessing ? (
                <rect x="14" y="2" width="4" height="4" fill={featureColor} />
              ) : (
                <path 
                  d="M0,0 H4 V2 H8 V4 H24 V2 H28 V0 H32 V4 H28 V6 H24 V8 H8 V6 H4 V4 H0 Z" 
                  fill={featureColor} 
                />
              )}
            </g>
          </g> {/* Fim do grupo de escala */}
        </svg>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
           {(isListening || isSpeaking || isProcessing) && (
            <span className="px-3 py-1 bg-black/5 text-black/40 text-[10px] rounded-full font-bold tracking-widest">
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