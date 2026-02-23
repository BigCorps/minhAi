// ========================================
// ARQUIVO: components/assistant/VideoInstrucoesDisplay.tsx
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';

// Importação dinâmica do ReactPlayer
const ReactPlayer = dynamic(() => import('react-player/lazy'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
    </div>
  ),
});

interface VideoInstrucoesDisplayProps {
  data: {
    companyId: string;
    videoUrl: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function VideoInstrucoesDisplay({
  data,
  onClose,
  theme = 'dark',
}: VideoInstrucoesDisplayProps) {
  const AUTO_CLOSE_SECONDS = 120; // 2 minutos como fallback (se vídeo não carregar)
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const [useAutoClose, setUseAutoClose] = useState(true); // Controla se usa timer ou não
  
  // Estados do player
  const [playing, setPlaying] = useState(true); // ✅ Começa tocando automaticamente
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // ── Regra 3: cleanup ao desmontar ───────────────────
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // ── Regra 1: auto-close chamando onClose() ───────────
  // ✅ ATUALIZADO: Timer só funciona se vídeo não carregar (fallback)
  useEffect(() => {
    // Se vídeo está pronto, não usa timer (fecha quando vídeo terminar)
    if (isReady) {
      setUseAutoClose(false);
      return;
    }

    // Se vídeo não carregar em 2min, fecha por segurança
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && useAutoClose) {
          window.speechSynthesis.cancel();
          onClose(); // ← obrigatório
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose, useAutoClose, isReady]);

  // ── Regra 2: fechar manual para o áudio ─────────────
  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose(); // ← obrigatório
  };

  // ✅ NOVO: Fechar modal quando vídeo terminar
  const handleVideoEnd = () => {
    console.log('🎬 Vídeo terminou - fechando modal automaticamente');
    window.speechSynthesis.cancel();
    onClose();
  };

  // Handlers do player
  const handlePlayPause = () => setPlaying(!playing);
  const handleMuteToggle = () => setMuted(!muted);
  
  const handleSeek = (value: number) => {
    setPlayed(value);
    // O seek real será feito no onSeekChange do ReactPlayer
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-purple-500/20 backdrop-blur-xl rounded-full border border-purple-500/30">
                <span className="text-white text-sm font-medium">
                  🎓 Tutorial
                </span>
              </div>
              {isReady && (
                <span className="text-white/60 text-sm">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* ✅ Mostra tempo restante do vídeo se estiver pronto, senão mostra timer de fallback */}
              {isReady ? (
                <span className="text-white/60 text-sm">
                  Fecha ao terminar
                </span>
              ) : (
                <span className="text-white/60 text-sm">{timeLeft}s</span>
              )}
              <button
                onClick={handleManualClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Player de Vídeo */}
        <div className="relative aspect-video bg-black">
          <ReactPlayer
            url={data.videoUrl}
            playing={playing}
            volume={volume}
            muted={muted}
            width="100%"
            height="100%"
            onReady={() => {
              console.log('🎬 Vídeo pronto - iniciando reprodução automática');
              setIsReady(true);
            }}
            onProgress={({ played }) => setPlayed(played)}
            onDuration={setDuration}
            onEnded={handleVideoEnd} // ✅ Fecha quando terminar
            controls={false} // Usamos controles customizados
            config={{
              youtube: {
                playerVars: {
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  autoplay: 1, // ✅ Auto-play no YouTube
                }
              }
            }}
          />

          {/* Overlay de loading */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4" />
                <p className="text-lg">Carregando vídeo...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controles customizados */}
        {isReady && (
          <div className={`p-4 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
          }`}>
            {/* Barra de progresso */}
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={played}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-purple-500"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 ${played * 100}%, #4B5563 ${played * 100}%)`
                }}
              />
            </div>

            {/* Botões de controle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className={`p-3 rounded-full transition-all ${
                    theme === 'dark'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {playing ? (
                    <Pause className="w-6 h-6 text-white" fill="white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" fill="white" />
                  )}
                </button>

                {/* Volume */}
                <button
                  onClick={handleMuteToggle}
                  className={`p-2 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'hover:bg-white/10'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`} />
                  ) : (
                    <Volume2 className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`} />
                  )}
                </button>

                {/* Slider de volume */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (parseFloat(e.target.value) > 0) setMuted(false);
                  }}
                  className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Tempo */}
              <div className={`text-sm font-mono ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                {formatTime(played * duration)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}

        {/* Barra de progresso do auto-close */}
        {/* ✅ Mostra progresso do vídeo quando estiver pronto, senão mostra timer */}
        <div className={`h-1 ${
          theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
        }`}>
          <div
            className="h-full bg-purple-500 transition-all duration-300 ease-linear"
            style={{ 
              width: isReady 
                ? `${played * 100}%` // Progresso do vídeo
                : `${(timeLeft / AUTO_CLOSE_SECONDS) * 100}%` // Timer de fallback
            }}
          />
        </div>
      </div>
    </div>
  );
}
