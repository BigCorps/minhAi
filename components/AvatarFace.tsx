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
  
  // Mostrar rosto: idle OU listening (aguardando wake word)
  // Orbe: processing (pensando) OU speaking (falando)
  const showFace = !isProcessing && !isSpeaking;

  // Atualizar cores
  useEffect(() => {
    if (isSpeaking) setColors(statusColors.speaking);
    else if (isProcessing) setColors(statusColors.processing);
    else if (isListening) setColors(statusColors.listening);
    else setColors(statusColors.idle);
  }, [isSpeaking, isProcessing, isListening, statusColors]);

  // Criar partículas flutuantes
  useEffect(() => {
    const particleCount = isSpeaking ? 25 : isProcessing ? 15 : isListening ? 10 : 8;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 500,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.8 + 0.3
    }));
    setParticles(newParticles);
  }, [isSpeaking, isProcessing, isListening]);

  // Canvas animation para ondas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, 500, 500);
      time += 0.02;

      // Desenhar ondas circulares
      const waveCount = isSpeaking ? 8 : isProcessing ? 5 : isListening ? 4 : 3;
      for (let i = 0; i < waveCount; i++) {
        const radius = 60 + i * 35 + Math.sin(time + i) * 12;
        const alpha = 0.25 - (i * 0.03);
        
        ctx.beginPath();
        ctx.arc(250, 250, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [colors, isSpeaking, isProcessing, isListening]);

  const isDark = theme === 'dark';
  
  // Tamanho do orbe muda com estado
  const orbSize = isSpeaking ? 'scale-150' : isProcessing ? 'scale-125' : isListening ? 'scale-110' : 'scale-100';

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="relative w-full h-full max-w-[500px] max-h-[500px] flex items-center justify-center">
        
        {/* Camada 0: Canvas de ondas (background) */}
        <canvas 
          ref={canvasRef}
          width={500}
          height={500}
          className="absolute inset-0 opacity-40"
        />

        {/* Camada 1: Rings rotativos externos */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="absolute w-[90%] h-[90%] rounded-full border-2 opacity-20 animate-spin-slow"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dashed',
              animationDuration: '20s'
            }}
          />
          <div 
            className="absolute w-[80%] h-[80%] rounded-full border-2 opacity-15 animate-spin-reverse"
            style={{ 
              borderColor: colors.ring,
              borderStyle: 'dotted',
              animationDuration: '25s'
            }}
          />
        </div>

        {/* Camada 2: Aura pulsante */}
        <div 
          className={`absolute w-[85%] h-[85%] rounded-full blur-[80px] transition-all duration-1000 ${
            isSpeaking ? 'animate-pulse-fast' : 'animate-pulse-slow'
          }`}
          style={{ 
            background: `radial-gradient(circle, ${colors.glow}, transparent)`,
          }}
        />

        {/* Camada 3: Partículas flutuantes */}
        <div className="absolute inset-0">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-70 animate-float blur-[1px]"
              style={{
                left: `${(particle.x / 500) * 100}%`,
                top: `${(particle.y / 500) * 100}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
                animationDuration: `${2 + particle.speed * 2}s`,
                animationDelay: `${i * 0.1}s`,
                boxShadow: `0 0 ${particle.size * 2}px ${i % 2 === 0 ? colors.primary : colors.secondary}`
              }}
            />
          ))}
        </div>

        {/* Camada 4: Container do orbe com transformação */}
        <div 
          className={`relative w-[70%] h-[70%] flex items-center justify-center rounded-full border shadow-2xl overflow-visible transition-all duration-700 ease-out ${
            isDark ? 'border-white/5' : 'border-black/5'
          } ${orbSize}`}
        >
          
          {/* MODO ROSTO (Idle - Aguardando) - MINIMALISTA */}
          {showFace && (
            <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20">
              <defs>
                <radialGradient id="eyeGradient">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="0.2" />
                </radialGradient>
                <filter id="pixelGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="mouthGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Olho esquerdo - PIXEL ART 16-bit */}
              <g opacity="0.85" filter="url(#pixelGlow)">
                {/* Estrutura do olho em blocos */}
                {/* Linha 1 - topo */}
                <rect x="55" y="70" width="8" height="8" fill={colors.primary} opacity="0.6" />
                <rect x="63" y="70" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="71" y="70" width="8" height="8" fill={colors.primary} opacity="0.6" />
                
                {/* Linha 2 */}
                <rect x="47" y="78" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="55" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="63" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="71" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="79" y="78" width="8" height="8" fill={colors.primary} opacity="0.7" />
                
                {/* Linha 3 - centro */}
                <rect x="47" y="86" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="55" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="63" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="71" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="79" y="86" width="8" height="8" fill={colors.primary} opacity="0.9" />
                
                {/* Linha 4 */}
                <rect x="47" y="94" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="55" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="63" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="71" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="79" y="94" width="8" height="8" fill={colors.primary} opacity="0.7" />
                
                {/* Linha 5 - base */}
                <rect x="55" y="102" width="8" height="8" fill={colors.primary} opacity="0.6" />
                <rect x="63" y="102" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="71" y="102" width="8" height="8" fill={colors.primary} opacity="0.6" />
                
                {/* Piscar - retângulo que cobre */}
                <rect x="47" y="70" width="40" height="40" fill={isDark ? '#1e293b' : '#f8fafc'} opacity="0">
                  <animate attributeName="opacity" values="0;0;0.9;0;0" dur="4s" repeatCount="indefinite" />
                </rect>
              </g>

              {/* Olho direito - PIXEL ART 16-bit */}
              <g opacity="0.85" filter="url(#pixelGlow)">
                {/* Linha 1 - topo */}
                <rect x="113" y="70" width="8" height="8" fill={colors.primary} opacity="0.6" />
                <rect x="121" y="70" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="129" y="70" width="8" height="8" fill={colors.primary} opacity="0.6" />
                
                {/* Linha 2 */}
                <rect x="105" y="78" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="113" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="121" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="129" y="78" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="137" y="78" width="8" height="8" fill={colors.primary} opacity="0.7" />
                
                {/* Linha 3 - centro */}
                <rect x="105" y="86" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="113" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="121" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="129" y="86" width="8" height="8" fill={colors.primary} opacity="0.95" />
                <rect x="137" y="86" width="8" height="8" fill={colors.primary} opacity="0.9" />
                
                {/* Linha 4 */}
                <rect x="105" y="94" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="113" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="121" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="129" y="94" width="8" height="8" fill={colors.primary} opacity="0.9" />
                <rect x="137" y="94" width="8" height="8" fill={colors.primary} opacity="0.7" />
                
                {/* Linha 5 - base */}
                <rect x="113" y="102" width="8" height="8" fill={colors.primary} opacity="0.6" />
                <rect x="121" y="102" width="8" height="8" fill={colors.primary} opacity="0.7" />
                <rect x="129" y="102" width="8" height="8" fill={colors.primary} opacity="0.6" />
                
                {/* Piscar */}
                <rect x="105" y="70" width="40" height="40" fill={isDark ? '#1e293b' : '#f8fafc'} opacity="0">
                  <animate attributeName="opacity" values="0;0;0.9;0;0" dur="4s" begin="0.1s" repeatCount="indefinite" />
                </rect>
              </g>

              {/* Boca - PIXEL ART 16-bit sorriso */}
              <g opacity="0.8" filter="url(#mouthGlow)">
                {/* Pontas do sorriso */}
                <rect x="60" y="132" width="8" height="8" fill={colors.secondary} opacity="0.7" />
                <rect x="124" y="132" width="8" height="8" fill={colors.secondary} opacity="0.7" />
                
                {/* Segunda linha */}
                <rect x="68" y="140" width="8" height="8" fill={colors.secondary} opacity="0.8" />
                <rect x="116" y="140" width="8" height="8" fill={colors.secondary} opacity="0.8" />
                
                {/* Linha do meio - base do sorriso */}
                <rect x="76" y="148" width="8" height="8" fill={colors.secondary} opacity="0.85" />
                <rect x="84" y="148" width="8" height="8" fill={colors.secondary} opacity="0.9" />
                <rect x="92" y="148" width="8" height="8" fill={colors.secondary} opacity="0.9" />
                <rect x="100" y="148" width="8" height="8" fill={colors.secondary} opacity="0.9" />
                <rect x="108" y="148" width="8" height="8" fill={colors.secondary} opacity="0.85" />
                
                {/* Animação sutil */}
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 0,2; 0,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </g>

              {/* Partículas de ambiente ao redor do rosto */}
              {[...Array(3)].map((_, i) => (
                <circle
                  key={`ambient-${i}`}
                  cx={50 + i * 50}
                  cy={60}
                  r="2"
                  fill={colors.primary}
                  opacity="0.4"
                >
                  <animate 
                    attributeName="cy" 
                    values="60;50;60" 
                    dur={`${2 + i * 0.5}s`} 
                    repeatCount="indefinite" 
                  />
                  <animate 
                    attributeName="opacity" 
                    values="0.2;0.6;0.2" 
                    dur={`${2 + i * 0.5}s`} 
                    repeatCount="indefinite" 
                  />
                </circle>
              ))}
            </svg>
          )}

          {/* MODO ORBE (Ativo - Listening/Processing/Speaking) */}
          {!showFace && (
            <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 filter drop-shadow-2xl">
              <defs>
                {/* Filtro Gooey */}
                <filter id="gooey">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -12" result="goo" />
                  <feBlend in="SourceGraphic" in2="goo" />
                </filter>

                {/* Gradiente animado */}
                <radialGradient id="coreGradient">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                  <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4">
                    <animate attributeName="offset" values="100%;70%;100%" dur="2s" repeatCount="indefinite" />
                  </stop>
                </radialGradient>
              </defs>

              <g filter="url(#gooey)">
                {/* Núcleo central GIGANTE pulsante */}
                <circle 
                  cx="100" 
                  cy="100" 
                  r={isSpeaking ? "70" : isProcessing ? "58" : "50"} 
                  fill="url(#coreGradient)"
                  className="transition-all duration-500"
                >
                  {isSpeaking && (
                    <animate attributeName="r" values="65;75;65" dur="0.5s" repeatCount="indefinite" />
                  )}
                </circle>
                
                {/* Satélites orbitando MAIORES */}
                {[...Array(4)].map((_, i) => (
                  <circle 
                    key={i}
                    cx="100" 
                    cy="100" 
                    r={38 - i * 6} 
                    fill={i % 2 === 0 ? colors.secondary : colors.primary} 
                    opacity={0.8 - i * 0.1}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values={
                        isSpeaking 
                          ? `0,0; ${30 + i * 8},${25 + i * 6}; ${-25 - i * 6},${30 + i * 8}; 0,0`
                          : isProcessing
                          ? `0,0; ${20 + i * 5},${18 + i * 4}; ${-18 - i * 4},${20 + i * 5}; 0,0`
                          : `0,0; ${15 + i * 3},${15 + i * 3}; ${-15 - i * 3},${15 + i * 3}; 0,0`
                      }
                      dur={`${2.5 - i * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}

                {/* Energia explosiva quando falando */}
                {isSpeaking && [...Array(8)].map((_, i) => (
                  <circle
                    key={`energy-${i}`}
                    cx="100"
                    cy="100"
                    r="5"
                    fill={colors.primary}
                    opacity="0.6"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values={`0,0; ${Math.cos(i * Math.PI / 4) * 45},${Math.sin(i * Math.PI / 4) * 45}; 0,0`}
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
              </g>
            </svg>
          )}

          {/* Camada 6: Glass refraction overlay */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-br from-white/20 to-transparent border border-white/30 backdrop-blur-[1px]" />
          
          {/* Camada 7: Light flares MAIORES */}
          <div 
            className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-2xl opacity-50 animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
          <div 
            className="absolute bottom-1/3 right-1/3 w-24 h-24 rounded-full blur-2xl opacity-40 animate-pulse"
            style={{ 
              backgroundColor: colors.secondary,
              animationDelay: '0.5s'
            }}
          />
        </div>

        {/* Camada 8: Scan line effect */}
        {(isProcessing || isSpeaking) && (
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-30">
            <div 
              className="absolute w-full h-2 bg-gradient-to-r from-transparent via-white to-transparent animate-scan"
              style={{ top: 0 }}
            />
          </div>
        )}

        {/* Camada 9: Status badge */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className={`px-8 py-3 rounded-full backdrop-blur-xl border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <div className="flex items-center gap-3">
              {/* Status dot animado MAIOR */}
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ 
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 10px ${colors.primary}`
                }}
              />
              <span className={`text-xs font-bold tracking-[0.3em] uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                {isSpeaking ? 'Sintetizando' : isProcessing ? 'Processando' : isListening ? 'Aguardando Palavra' : 'Aguardando Ativação'}
              </span>
            </div>
          </div>
        </div>

        {/* Camada 10: Waveform GIGANTE quando falando */}
        {isSpeaking && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all"
                style={{
                  height: '30px',
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 8px ${colors.primary}`,
                  animation: `wave 0.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.08}s`
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
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes wave {
          0%, 100% { height: 12px; }
          50% { height: 36px; }
        }
        @keyframes blink {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0.3; }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow ease-in-out 3s infinite;
        }
        .animate-pulse-fast {
          animation: pulse-fast ease-in-out 1s infinite;
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        .animate-blink {
          animation: blink 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
