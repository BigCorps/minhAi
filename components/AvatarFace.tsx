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
  
  // Cores baseadas no status
  const statusColors = useMemo(() => ({
    idle: { 
      primary: '#A2D9F7', 
      secondary: '#B0CB1F',
      glow: 'rgba(162, 217, 247, 0.4)',
      ring: '#60A5FA'
    },
    listening: { 
      primary: '#3b82f6', 
      secondary: '#A2D9F7',
      glow: 'rgba(59, 130, 246, 0.6)',
      ring: '#2563EB'
    },
    processing: { 
      primary: '#fbbf24', 
      secondary: '#f59e0b',
      glow: 'rgba(251, 191, 36, 0.6)',
      ring: '#F59E0B'
    },
    speaking: { 
      primary: '#B0CB1F', 
      secondary: '#34d399',
      glow: 'rgba(176, 203, 31, 0.6)',
      ring: '#10B981'
    },
  }), []);

  const [colors, setColors] = useState(statusColors.idle);
  const [particles, setParticles] = useState<Array<{x: number, y: number, size: number, speed: number}>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Atualizar cores
  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  // Criar partículas flutuantes
  useEffect(() => {
    const particleCount = isSpeaking ? 15 : isProcessing ? 10 : 5;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 400,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2
    }));
    setParticles(newParticles);
  }, [isSpeaking, isProcessing]);

  // Canvas animation para ondas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, 400, 400);
      time += 0.02;

      // Desenhar ondas circulares
      const waveCount = isSpeaking ? 5 : isProcessing ? 3 : 2;
      for (let i = 0; i < waveCount; i++) {
        const radius = 50 + i * 30 + Math.sin(time + i) * 10;
        const alpha = 0.2 - (i * 0.03);
        
        ctx.beginPath();
        ctx.arc(200, 200, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [colors, isSpeaking, isProcessing]);

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center justify-center h-full w-full transition-colors duration-1000 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        
        {/* Camada 0: Canvas de ondas (background) */}
        <canvas 
          ref={canvasRef}
          width={400}
          height={400}
          className="absolute inset-0 opacity-30"
        />

        {/* Camada 1: Rings rotativos externos */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="absolute w-80 h-80 rounded-full border-2 opacity-20 animate-spin-slow"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dashed',
              animationDuration: '15s'
            }}
          />
          <div 
            className="absolute w-72 h-72 rounded-full border-2 opacity-15 animate-spin-reverse"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dotted',
              animationDuration: '20s'
            }}
          />
        </div>

        {/* Camada 2: Aura pulsante */}
        <div 
          className="absolute w-72 h-72 rounded-full blur-[80px] transition-all duration-1000 animate-pulse-slow"
          style={{ 
            background: `radial-gradient(circle, ${colors.glow}, transparent)`,
            animationDuration: isSpeaking ? '1s' : '3s'
          }}
        />

        {/* Camada 3: Partículas flutuantes */}
        <div className="absolute inset-0">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-60 animate-float"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
                animationDuration: `${3 + particle.speed * 2}s`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Camada 4: Container do orbe com glass effect */}
        <div className={`relative w-80 h-80 flex items-center justify-center rounded-full border shadow-2xl overflow-hidden ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          
          {/* Camada 5: Orbe principal com efeito gooey */}
          <svg viewBox="0 0 200 200" className="w-64 h-64 relative z-10 filter drop-shadow-2xl">
            <defs>
              {/* Filtro Gooey */}
              <filter id="gooey">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>

              {/* Gradiente animado */}
              <radialGradient id="coreGradient">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <stop offset="70%" stopColor={colors.secondary} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.3">
                  <animate attributeName="offset" values="100%;80%;100%" dur="2s" repeatCount="indefinite" />
                </stop>
              </radialGradient>
            </defs>

            <g filter="url(#gooey)">
              {/* Núcleo central pulsante */}
              <circle 
                cx="100" 
                cy="100" 
                r={isSpeaking ? "52" : isProcessing ? "42" : "38"} 
                fill="url(#coreGradient)"
                className="transition-all duration-500"
              >
                {isSpeaking && (
                  <animate attributeName="r" values="48;52;48" dur="0.6s" repeatCount="indefinite" />
                )}
              </circle>
              
              {/* Satélites orbitando */}
              {[...Array(3)].map((_, i) => (
                <circle 
                  key={i}
                  cx="100" 
                  cy="100" 
                  r={28 - i * 4} 
                  fill={i % 2 === 0 ? colors.secondary : colors.primary} 
                  opacity={0.7 - i * 0.1}
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={
                      isSpeaking 
                        ? `0,0; ${20 + i * 5},${15 + i * 3}; ${-15 - i * 3},${20 + i * 5}; 0,0`
                        : isProcessing
                        ? `0,0; ${12 + i * 3},${10 + i * 2}; ${-10 - i * 2},${12 + i * 3}; 0,0`
                        : `0,0; ${8 + i * 2},${8 + i * 2}; ${-8 - i * 2},${8 + i * 2}; 0,0`
                    }
                    dur={`${2 - i * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Micro-partículas internas */}
              {isSpeaking && [...Array(6)].map((_, i) => (
                <circle
                  key={`micro-${i}`}
                  cx="100"
                  cy="100"
                  r="3"
                  fill={colors.primary}
                  opacity="0.5"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`0,0; ${Math.cos(i * Math.PI / 3) * 30},${Math.sin(i * Math.PI / 3) * 30}; 0,0`}
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          </svg>

          {/* Camada 6: Glass refraction overlay */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-br from-white/20 to-transparent border border-white/30 backdrop-blur-[1px]" />
          
          {/* Camada 7: Light flares */}
          <div 
            className="absolute top-1/4 left-1/4 w-20 h-20 rounded-full blur-xl opacity-40 animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
          <div 
            className="absolute bottom-1/3 right-1/3 w-16 h-16 rounded-full blur-xl opacity-30 animate-pulse"
            style={{ 
              backgroundColor: colors.secondary,
              animationDelay: '0.5s'
            }}
          />
        </div>

        {/* Camada 8: Scan line effect */}
        {(isProcessing || isSpeaking) && (
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-20">
            <div 
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan"
              style={{ top: 0 }}
            />
          </div>
        )}

        {/* Camada 9: Status badge */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className={`px-6 py-2 rounded-full backdrop-blur-xl border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <div className="flex items-center gap-2">
              {/* Status dot animado */}
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.primary }}
              />
              <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                {isSpeaking ? 'Sintetizando' : isProcessing ? 'Processando' : isListening ? 'Escutando' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* Camada 10: Waveform quando falando */}
        {isSpeaking && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all"
                style={{
                  height: '20px',
                  backgroundColor: colors.primary,
                  animation: `wave 0.6s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Estilos CSS customizados */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow ease-in-out infinite;
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
