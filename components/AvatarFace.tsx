'use client';

import { useEffect, useState, useRef } from 'react';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

export function AvatarFace({ isListening, isSpeaking, isProcessing }: AvatarFaceProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0); // 0: fechada, 1: semi, 2: aberta, 3: "O"
  const blinkIntervalRef = useRef<any>(null);
  const mouthIntervalRef = useRef<any>(null);

  // Lógica do Piscado
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
    return () => { if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current); };
  }, []);

  // Lógica da Fala com múltiplos frames (Visemas)
  useEffect(() => {
    if (isSpeaking) {
      mouthIntervalRef.current = setInterval(() => {
        // Gera um frame aleatório entre 1 e 3 (abertas) para parecer fala natural
        // e ocasionalmente volta ao 0 (fechada)
        setMouthFrame(Math.floor(Math.random() * 4));
      }, 100);
    } else {
      setMouthFrame(0);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    }
    return () => { if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current); };
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
          <g style={{ transform: 'scale(1.5)', transformOrigin: '32px 32px' }}>
            
            {/* OLHO ESQUERDO (7x11) - Brilho 2x3 conforme solicitado */}
            <g transform={`translate(22, ${20 + eyeOffsetY})`} className="transition-transform duration-500">
              {isBlinking ? (
                <rect x="0" y="5" width="7" height="2" fill={featureColor} />
              ) : (
                <>
                  <path d="M1,0 H6 V1 H7 V10 H6 V11 H1 V10 H0 V1 H1 Z" fill={featureColor} />
                  <rect x="1" y="1" width="2" height="3" fill="white" />
                  <rect x="5" y="8" width="1" height="1" fill="white" />
                </>
              )}
            </g>

            {/* OLHO DIREITO (7x11) - Brilho 2x3 conforme solicitado */}
            <g transform={`translate(35, ${20 + eyeOffsetY})`} className="transition-transform duration-500">
              {isBlinking ? (
                 <rect x="0" y="5" width="7" height="2" fill={featureColor} />
              ) : (
                <>
                  <path d="M1,0 H6 V1 H7 V10 H6 V11 H1 V10 H0 V1 H1 Z" fill={featureColor} />
                  <rect x="1" y="1" width="2" height="3" fill="white" />
                  <rect x="5" y="8" width="1" height="1" fill="white" />
                </>
              )}
            </g>

            {/* BOCA DINÂMICA (Y=38) */}
            <g transform="translate(16, 38)">
              {isProcessing ? (
                <rect x="14" y="2" width="4" height="4" fill={featureColor} />
              ) : (
                <>
                  {/* FRAME 0: FECHADA (SORRISO ORIGINAL) */}
                  {mouthFrame === 0 && (
                    <path d="M0,0 H4 V2 H8 V4 H24 V2 H28 V0 H32 V4 H28 V6 H24 V8 H8 V6 H4 V4 H0 Z" fill={featureColor} />
                  )}
                  
                  {/* FRAME 1: SEMI-ABERTA (MANTÉM O CONTORNO DO SORRISO) */}
                  {mouthFrame === 1 && (
                    <path d="M0,0 H4 V2 H28 V0 H32 V4 H28 V6 H24 V8 H8 V8 H4 V6 H0 V4 Z" fill={featureColor} />
                  )}

                  {/* FRAME 2: TOTALMENTE ABERTA (MAIS LARGA E PROFUNDA) */}
                  {mouthFrame === 2 && (
                    <path d="M2,0 H6 V2 H26 V0 H30 V4 H28 V6 H24 V10 H8 V10 H4 V6 H2 V4 Z" fill={featureColor} />
                  )}

                  {/* FRAME 3: FORMATO "O" (PARA SONS DE VOGAIS) */}
                  {mouthFrame === 3 && (
                    <path d="M8,0 H24 V2 H26 V8 H24 V10 H8 V8 H6 V2 H8 Z" fill={featureColor} />
                  )}
                </>
              )}
            </g>
          </g>
        </svg>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
           {(isListening || isSpeaking || isProcessing) && (
            <span className="px-3 py-1 bg-black/5 text-black/40 text-[10px] rounded-full font-bold tracking-widest uppercase">
              {isSpeaking && 'Falando'}
              {isProcessing && 'Pensando'}
              {isListening && 'Ouvindo'}
            </span>
           )}
        </div>
      </div>
    </div>
  );
}