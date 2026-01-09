'use client';

import { useEffect, useState, useRef } from 'react';

interface AvatarFaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioElement?: HTMLAudioElement | null;
}

export function AvatarFace({ isListening, isSpeaking, isProcessing, audioElement }: AvatarFaceProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0); // 0-1
  const blinkIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Expressão atual baseada no estado
  const getExpression = () => {
    if (isSpeaking) return 'speaking';
    if (isProcessing) return 'thinking';
    if (isListening) return 'listening';
    return 'neutral';
  };

  const expression = getExpression();

  // Piscadas automáticas
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };

    // Piscar a cada 3-5 segundos
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

  // Sincronização labial com áudio
  useEffect(() => {
    if (!audioElement || !isSpeaking) {
      setMouthOpenAmount(0);
      return;
    }

    const setupAudioAnalyzer = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;
        const source = audioContext.createMediaElementSource(audioElement);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMouth = () => {
          if (!analyserRef.current || !isSpeaking) return;

          analyser.getByteFrequencyData(dataArray);
          
          // Calcular amplitude média
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          // Normalizar para 0-1
          const normalized = Math.min(average / 100, 1);
          
          setMouthOpenAmount(normalized);
          
          animationFrameRef.current = requestAnimationFrame(updateMouth);
        };

        updateMouth();
      } catch (error) {
        console.error('Erro ao configurar análise de áudio:', error);
      }
    };

    setupAudioAnalyzer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, isSpeaking]);

  // Cores baseadas na expressão
  const getFaceColor = () => {
    switch (expression) {
      case 'speaking': return '#10b981'; // Verde
      case 'thinking': return '#f59e0b'; // Amarelo
      case 'listening': return '#3b82f6'; // Azul
      default: return '#6b7280'; // Cinza
    }
  };

  const faceColor = getFaceColor();

  // Formato dos olhos (normal ou piscando)
  const eyeHeight = isBlinking ? 2 : 20;

  // Formato da boca baseado no estado
  const getMouthPath = () => {
    if (isSpeaking) {
      // Boca abre/fecha com áudio
      const openAmount = mouthOpenAmount * 20;
      return `M 30 60 Q 50 ${60 + openAmount} 70 60`;
    }
    if (isProcessing) {
      // Boca pensativa
      return 'M 35 60 Q 50 55 65 60';
    }
    if (isListening) {
      // Sorriso leve
      return 'M 30 60 Q 50 65 70 60';
    }
    // Neutro
    return 'M 35 60 L 65 60';
  };

  // Sobrancelhas baseadas na expressão
  const getEyebrowY = () => {
    if (isProcessing) return 15; // Sobrancelhas levantadas
    return 18; // Normal
  };

  return (
    <div className="flex items-center justify-center h-full">
      <svg
        width="300"
        height="300"
        viewBox="0 0 100 100"
        className="transition-all duration-300"
      >
        {/* Cabeça */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={faceColor}
          className="transition-colors duration-500"
        />
        
        {/* Cabeça interna (tom de pele) */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="#fde68a"
        />

        {/* Sobrancelha esquerda */}
        <line
          x1="28"
          y1={getEyebrowY()}
          x2="38"
          y2={getEyebrowY()}
          stroke="#92400e"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Sobrancelha direita */}
        <line
          x1="62"
          y1={getEyebrowY()}
          x2="72"
          y2={getEyebrowY()}
          stroke="#92400e"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Olho esquerdo */}
        <ellipse
          cx="35"
          cy="35"
          rx="8"
          ry={eyeHeight}
          fill="#1f2937"
          className="transition-all duration-150"
        />
        
        {/* Pupila esquerda */}
        {!isBlinking && (
          <circle
            cx="35"
            cy="35"
            r="4"
            fill="#000"
          />
        )}

        {/* Olho direito */}
        <ellipse
          cx="65"
          cy="35"
          rx="8"
          ry={eyeHeight}
          fill="#1f2937"
          className="transition-all duration-150"
        />
        
        {/* Pupila direita */}
        {!isBlinking && (
          <circle
            cx="65"
            cy="35"
            r="4"
            fill="#000"
          />
        )}

        {/* Boca */}
        <path
          d={getMouthPath()}
          stroke="#92400e"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="transition-all duration-100"
        />

        {/* Bochechas (quando feliz/falando) */}
        {(expression === 'speaking' || expression === 'listening') && (
          <>
            <circle
              cx="25"
              cy="50"
              r="5"
              fill="#fca5a5"
              opacity="0.5"
            />
            <circle
              cx="75"
              cy="50"
              r="5"
              fill="#fca5a5"
              opacity="0.5"
            />
          </>
        )}
      </svg>

      {/* Label da expressão */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full">
          {expression === 'speaking' && '🗣️ Falando'}
          {expression === 'thinking' && '🤔 Pensando'}
          {expression === 'listening' && '👂 Ouvindo'}
          {expression === 'neutral' && '😊 Pronto'}
        </span>
      </div>
    </div>
  );
}
