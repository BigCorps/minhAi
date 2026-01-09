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
      const delay = 3000 + Math.random() * 2000;
      blinkIntervalRef.current = setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkIntervalRef.current) {
        clearTimeout(blinkIntervalRef.current);
      }
    };
  }, []);

  // Boca mexendo quando está falando (simples)
  useEffect(() => {
    if (isSpeaking) {
      // Alternar boca aberta/fechada rapidamente
      mouthIntervalRef.current = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 150);
    } else {
      setMouthOpen(false);
      if (mouthIntervalRef.current) {
        clearInterval(mouthIntervalRef.current);
      }
    }

    return () => {
      if (mouthIntervalRef.current) {
        clearInterval(mouthIntervalRef.current);
      }
    };
  }, [isSpeaking]);

  // Cor de fundo baseada no estado
  const getBackgroundColor = () => {
    if (isSpeaking) return '#10b981'; // Verde
    if (isProcessing) return '#f59e0b'; // Amarelo
    if (isListening) return '#3b82f6'; // Azul
    return '#6b7280'; // Cinza
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div 
        className="w-64 h-64 rounded-3xl flex items-center justify-center transition-colors duration-500"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 100 100"
          className="transition-all duration-300"
        >
          {/* Olho esquerdo */}
          <rect
            x="25"
            y={isBlinking ? "40" : "35"}
            width="15"
            height={isBlinking ? "5" : "15"}
            fill="#000000"
            className="transition-all duration-150"
          />

          {/* Olho direito */}
          <rect
            x="60"
            y={isBlinking ? "40" : "35"}
            width="15"
            height={isBlinking ? "5" : "15"}
            fill="#000000"
            className="transition-all duration-150"
          />

          {/* Boca - muda quando está falando */}
          {isSpeaking && mouthOpen ? (
            // Boca aberta (quadrado)
            <rect
              x="35"
              y="65"
              width="30"
              height="20"
              fill="#000000"
              className="transition-all duration-100"
            />
          ) : isProcessing ? (
            // Boca pensativa (linha menor)
            <rect
              x="40"
              y="70"
              width="20"
              height="5"
              fill="#000000"
            />
          ) : (
            // Boca sorrindo (retângulo horizontal)
            <rect
              x="30"
              y="70"
              width="40"
              height="8"
              fill="#000000"
            />
          )}
        </svg>
      </div>

      {/* Label do estado */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <span className="px-3 py-1 bg-black/70 text-white text-xs rounded-full font-medium">
          {isSpeaking && '🗣️ Falando'}
          {isProcessing && '🤔 Pensando'}
          {isListening && '👂 Ouvindo'}
          {!isSpeaking && !isProcessing && !isListening && '😊 Pronto'}
        </span>
      </div>
    </div>
  );
}
