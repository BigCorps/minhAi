// SUBSTITUIR TODA A SEÇÃO DO COMPONENTE VIDEOINSTRUCOESDISPLAY

'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import do ReactPlayer com loading detalhado
const ReactPlayerDynamic = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p>Carregando player...</p>
      </div>
    </div>
  ),
});

const ReactPlayer = (props: any) => <ReactPlayerDynamic {...props} />;

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
  const AUTO_CLOSE_SECONDS = 120;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const [useAutoClose, setUseAutoClose] = useState(true);
  
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<any>(null);

  // ✅ Log para debug
  useEffect(() => {
    console.log('🎬 VideoInstrucoesDisplay montado');
    console.log('URL do vídeo:', data.videoUrl);
    return () => {
      console.log('🎬 VideoInstrucoesDisplay desmontado');
      window.speechSynthesis.cancel();
    };
  }, [data.videoUrl]);

  // Timer de fallback
  useEffect(() => {
    if (isReady) {
      setUseAutoClose(false);
      console.log('✅ Vídeo pronto - timer desativado');
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && useAutoClose) {
          console.log('⏰ Timer expirado - fechando');
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose, useAutoClose, isReady]);

  const handleVideoEnd = () => {
    console.log('🏁 Vídeo terminou');
    window.speechSynthesis.cancel();
    onClose();
  };

  const handleManualClose = () => {
    console.log('❌ Fechamento manual');
    window.speechSynthesis.cancel();
    onClose();
  };

  const handlePlayPause = () => setPlaying(!playing);
  const handleMuteToggle = () => setMuted(!muted);
  
  const handleSeek = (value: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(value);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ Handlers com logs
  const handleReady = () => {
    console.log('✅ Player pronto!');
    setIsReady(true);
    setError(null);
  };

  const handleError = (err: any) => {
    console.error('❌ Erro no player:', err);
    setError('Não foi possível carregar o vídeo. Verifique se a URL é válida.');
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
                  Vídeo
                </span>
              </div>
              {isReady && duration > 0 && (
                <span className="text-white/60 text-sm">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
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

        {/* Player */}
        <div className="relative aspect-video bg-black">
          {error ? (
            // Erro
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white p-8">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-bold mb-2">Erro ao Carregar Vídeo</h3>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <p className="text-xs text-gray-400">URL: {data.videoUrl}</p>
                <button
                  onClick={handleManualClose}
                  className="mt-4 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              <ReactPlayer
                ref={playerRef}
                url={data.videoUrl}
                playing={playing}
                volume={volume}
                muted={muted}
                width="100%"
                height="100%"
                onReady={handleReady}
                onProgress={(state: any) => {
                  if (state && typeof state.played === 'number') {
                    setPlayed(state.played);
                  }
                }}
                onDuration={(dur: number) => setDuration(dur)}
                onEnded={handleVideoEnd}
                onError={handleError}
                controls={false}
              />

              {/* Loading overlay */}
              {!isReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4" />
                    <p className="text-lg mb-2">Carregando vídeo...</p>
                    <p className="text-sm text-gray-400">Aguarde {timeLeft}s</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controles */}
        {isReady && !error && (
          <div className={`p-4 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
          }`}>
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={0.999999}
                step={0.001}
                value={played}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 ${played * 100}%, #4B5563 ${played * 100}%)`
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="p-3 rounded-full bg-purple-600 hover:bg-purple-700"
                >
                  {playing ? (
                    <Pause className="w-6 h-6 text-white" fill="white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" fill="white" />
                  )}
                </button>

                <button
                  onClick={handleMuteToggle}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

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
                  className="w-24 h-1 bg-gray-600 rounded-lg"
                />
              </div>

              <div className="text-sm font-mono text-white/60">
                {formatTime(played * duration)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ 
              width: isReady 
                ? `${played * 100}%`
                : `${(timeLeft / AUTO_CLOSE_SECONDS) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}