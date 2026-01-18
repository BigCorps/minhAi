'use client';

import { useEffect, useState, useMemo, useRef } from 'react';

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
  
  const = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [particles, setParticles] = useState<Array<{x: number, y: number, size: number, speed: number}>>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blinkIntervalRef = useRef<any>(null);
  const mouthIntervalRef = useRef<any>(null);

  // Cores semióticas sincronizadas com o status
  const statusColors = useMemo(() => ({
    idle: { p: '#A2D9F7', s: '#B0CB1F', glow: 'rgba(162, 217, 247, 0.4)', ring: '#60A5FA' },
    listening: { p: '#3b82f6', s: '#A2D9F7', glow: 'rgba(59, 130, 246, 0.6)', ring: '#2563EB' },
    processing: { p: '#fbbf24', s: '#f59e0b', glow: 'rgba(251, 191, 36, 0.6)', ring: '#F59E0B' },
    speaking: { p: '#B0CB1F', s: '#34d399', glow: 'rgba(176, 203, 31, 0.6)', ring: '#10B981' },
  }),);

  const colors = useMemo(() => {
    if (isSpeaking) return statusColors.speaking;
    if (isProcessing) return statusColors.processing;
    if (isListening) return statusColors.listening;
    return statusColors.idle;
  },);

  // Lógica da Piscada (Traço Original)
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    const schedule = () => {
      blinkIntervalRef.current = setTimeout(() => {
        blink();
        schedule();
      }, 2000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(blinkIntervalRef.current);
  },);

  // Animação da Boca (Visemas Naturais)
  useEffect(() => {
    if (isSpeaking) {
      mouthIntervalRef.current = setInterval(() => {
        setMouthFrame(Math.floor(Math.random() * 4));
      }, 100);
    } else {
      setMouthFrame(0);
      clearInterval(mouthIntervalRef.current);
    }
    return () => clearInterval(mouthIntervalRef.current);
  },);

  // Background Canvas: Ondas Harmônicas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas ||!ctx) return;
    let frame: number;
    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, 500, 500);
      t += 0.02;
      const count = isSpeaking? 6 : 3;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(250, 250, 80 + i * 40 + Math.sin(t + i) * 10, 0, Math.PI * 2);
        ctx.strokeStyle = colors.p;
        ctx.globalAlpha = (0.2 - i * 0.04);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      frame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frame);
  },);

  const isDark = theme === 'dark';
  const showFace =!isProcessing &&!isSpeaking;

  return (
    <div className={`flex items-center justify-center h-full w-full transition-colors duration-1000 ${isDark? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="relative w-full h-full max-w-[500px] flex items-center justify-center">
        
        {/* Camada 0: Ondas de Fundo */}
        <canvas ref={canvasRef} width={500} height={500} className="absolute inset-0 pointer-events-none opacity-40" />

        {/* Camada 1: HUD Rings Futuristas */}
        <div className="absolute w-[90%] h-[90%] rounded-full border-2 border-dashed opacity-10 animate-[spin_30s_linear_infinite]" style={{ borderColor: colors.ring }} />
        <div className="absolute w-[80%] h-[80%] rounded-full border border-dotted opacity-10 animate-[spin_20s_linear_reverse_infinite]" style={{ borderColor: colors.ring }} />

        {/* Camada 2: Aura de Glow */}
        <div 
          className="absolute w-[75%] h-[75%] rounded-full blur-[90px] transition-all duration-1000 opacity-40"
          style={{ background: `radial-gradient(circle, ${colors.glow}, transparent)` }}
        />

        {/* Camada 3: Container do Avatar/Orbe */}
        <div className={`relative w-[65%] h-[65%] flex items-center justify-center rounded-full border shadow-2xl transition-all duration-700 ${isDark? 'border-white/5' : 'border-black/5'} ${isSpeaking? 'scale-110' : 'scale-100'}`}>
          
          {/* SVG ÚNICO: Alterna entre Face Pixel e Orbe Líquido */}
          <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20">
            <defs>
              <filter id="pixelGlow"><feGaussianBlur stdDeviation="1.5" /><feComposite in="SourceGraphic" operator="over" /></filter>
              <filter id="gooey"><feGaussianBlur stdDeviation="10" /><feColorMatrix mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" /></filter>
            </defs>

            {/* MODO FACE: Proporções exatas aprovadas anteriormente */}
            {showFace && (
              <g style={{ transform: 'scale(1.5)', transformOrigin: '100px 100px' }} filter="url(#pixelGlow)">
                {/* Olho Esquerdo (7x11 ou 7x2 no blink) */}
                <g transform={`translate(86, 85)`}>
                  {isBlinking? (
                    <rect x="0" y="5" width="7" height="2" fill={colors.p} rx="1" />
                  ) : (
                    <>
                      <path d="M1,0 H6 V1 H7 V10 H6 V11 H1 V10 H0 V1 H1 Z" fill={colors.p} />
                      <rect x="1" y="1" width="2" height="3" fill="white" />
                      <rect x="5" y="8" width="1" height="1" fill="white" />
                    </>
                  )}
                </g>
                {/* Olho Direito (7x11 ou 7x2 no blink) */}
                <g transform={`translate(108, 85)`}>
                  {isBlinking? (
                    <rect x="0" y="5" width="7" height="2" fill={colors.p} rx="1" />
                  ) : (
                    <>
                      <path d="M1,0 H6 V1 H7 V10 H6 V11 H1 V10 H0 V1 H1 Z" fill={colors.p} />
                      <rect x="1" y="1" width="2" height="3" fill="white" />
                      <rect x="5" y="8" width="1" height="1" fill="white" />
                    </>
                  )}
                </g>
                {/* Boca Sorriso (Posição Y=118 no SVG 200x200 para manter proporção 38 do grid 64) */}
                <g transform="translate(84, 118)">
                  <path d="M0,0 H4 V2 H8 V4 H24 V2 H28 V0 H32 V4 H28 V6 H24 V8 H8 V6 H4 V4 H0 Z" fill={colors.p} />
                </g>
              </g>
            )}

            {/* MODO ORBE: Líquido e Partículas (Speaking/Processing) */}
            {!showFace && (
              <g filter="url(#gooey)">
                <circle cx="100" cy="100" r={isSpeaking? "55" : "45"} fill={colors.p} className="transition-all duration-500" />
                <circle cx="100" cy="100" r="30" fill={colors.s} opacity="0.8">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 20,10; -15,20; 0,0" dur="3s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>

          {/* Overlay de Vidro e Brilho Lente */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 to-transparent border border-white/20 backdrop-blur-[1px]" />
          <div className="absolute top-[15%] left-[20%] w-24 h-8 bg-white/10 blur-xl rounded-full rotate-[-30deg]" />
        </div>

        {/* Legenda Tecnológica */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
          <div className={`px-6 py-2 rounded-full backdrop-blur-2xl border transition-all ${isDark? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/40'} text-[9px] font-black tracking-[0.3em] uppercase flex items-center gap-2`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking? 'animate-ping' : ''}`} style={{ backgroundColor: colors.p }} />
            {isSpeaking? 'Sintetizando' : isProcessing? 'Analisando' : isListening? 'Escutando' : 'Sincronizado'}
          </div>
        </div>
      </div>
    </div>
  );
}
