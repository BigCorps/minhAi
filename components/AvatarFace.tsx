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

  // Piscadas automáticas
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

  // Animação da boca MELHORADA - mais rápida e sincronizada
  useEffect(() => {
    if (isSpeaking) {
      // Alternar mais rápido para parecer mais natural
      mouthIntervalRef.current = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 120); // MAIS RÁPIDO (era 200ms)
    } else {
      setMouthOpen(false);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    }
    return () => {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, [isSpeaking]);

  // Cores do avatar
  const getBackgroundColor = () => {
    if (isSpeaking) return '#34d399'; // Verde
    if (isProcessing) return '#fbbf24'; // Amarelo
    if (isListening) return '#60a5fa'; // Azul
    return '#e5e7eb'; // Cinza claro
  };

  const featureColor = '#000000';

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div 
        className="relative w-64 h-64 rounded-3xl flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 64 64"
          className="transition-all duration-100"
          shapeRendering="crispEdges"
        >
          {/* OLHO ESQUERDO */}
          <g transform="translate(14, 20)">
            {isBlinking ? (
              <rect x="0" y="6" width="14" height="2" fill={featureColor} />
            ) : (
              <>
                <path 
                  d="M2,0 H12 V2 H14 V12 H12 V14 H2 V12 H0 V2 H2 Z" 
                  fill={featureColor} 
                />
                <rect x="2" y="2" width="4" height="4" fill="white" />
                <rect x="9" y="8" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* OLHO DIREITO */}
          <g transform="translate(36, 20)">
            {isBlinking ? (
               <rect x="0" y="6" width="14" height="2" fill={featureColor} />
            ) : (
              <>
                <path 
                  d="M2,0 H12 V2 H14 V12 H12 V14 H2 V12 H0 V2 H2 Z" 
                  fill={featureColor} 
                />
                <rect x="2" y="2" width="4" height="4" fill="white" />
                <rect x="9" y="8" width="2" height="2" fill="white" />
              </>
            )}
          </g>

          {/* BOCA */}
          <g transform="translate(22, 40)">
            {isSpeaking && mouthOpen ? (
              // Boca aberta quando falando
              <path 
                d="M4,0 H16 V2 H18 V10 H16 V12 H4 V10 H2 V2 H4 Z" 
                fill={featureColor} 
              />
            ) : isProcessing ? (
              // Boca pensando
              <rect x="6" y="4" width="8" height="2" fill={featureColor} />
            ) : (
              // Sorriso padrão
              <path 
                d="M0,0 H4 V2 H16 V0 H20 V4 H18 V6 H16 V8 H4 V6 H2 V4 H0 Z" 
                fill={featureColor} 
              />
            )}
          </g>
        </svg>

        {/* Label do estado */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
           {(isListening || isSpeaking || isProcessing) && (
            <span className="px-3 py-1 bg-black/20 text-white text-xs rounded-full font-bold backdrop-blur-sm">
              {isSpeaking && 'FALANDO'}
              {isProcessing && 'PENSANDO'}
              {isListening && 'A DISPOSIÇÃO'}
            </span>
           )}
        </div>
      </div>
    </div>
  );
}
