'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

// ✅ SUPER DEBUG VERSION
console.log('🔷 VideoInstrucoesDisplay.tsx carregado');

const ReactPlayerDynamic = dynamic(() => {
  console.log('🔷 Dynamic import iniciado');
  return import('react-player').then(mod => {
    console.log('🔷 react-player importado com sucesso:', mod);
    return mod;
  });
}, {
  ssr: false,
  loading: () => {
    console.log('🔷 Loading component renderizado');
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Carregando player...</p>
        </div>
      </div>
    );
  },
});

const ReactPlayer = (props: any) => {
  console.log('🔷 ReactPlayer wrapper chamado com props:', { url: props.url, playing: props.playing });
  return <ReactPlayerDynamic {...props} />;
};

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
  console.log('🎬 VideoInstrucoesDisplay renderizado com data:', data);
  
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
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  const playerRef = useRef<any>(null);

  useEffect(() => {
    console.log('🎬 VideoInstrucoesDisplay montado');
    console.log('URL do vídeo:', data.videoUrl);
    console.log('Theme:', theme);
    
    // Teste de ambiente
    console.log('Window disponível:', typeof window !== 'undefined');
    console.log('Document disponível:', typeof document !== 'undefined');
    
    return () => {
      console.log('🎬 VideoInstrucoesDisplay desmontado');
      window.speechSynthesis.cancel();
    };
  }, [data.videoUrl, theme]);

  // Log de mudanças de estado
  useEffect(() => {
    console.log('📊 Estado atual:', {
      isReady,
      playing,
      error,
      duration,
      played: played.toFixed(2),
      timeLeft,
      loadAttempts,
    });
  }, [isReady, playing, error, duration, played, timeLeft, loadAttempts]);

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

  const handlePlayPause = () => {
    console.log('▶️ Play/Pause toggleado:', !playing);
    setPlaying(!playing);
  };
  
  const handleMuteToggle = () => {
    console.log('🔇 Mute toggleado:', !muted);
    setMuted(!muted);
  };
  
  const handleSeek = (value: number) => {
    console.log('⏩ Seek para:', value);
    if (playerRef.current) {
      playerRef.current.seekTo(value);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReady = () => {
    console.log('✅✅✅ Player PRONTO! ✅✅✅');
    console.log('Player ref:', playerRef.current);
    setIsReady(true);
    setError(null);
    setLoadAttempts(prev => prev + 1);
  };

  const handleError = (err: any) => {
    console.error('❌❌❌ ERRO no player:', err);
    console.error('Tipo do erro:', typeof err);
    console.error('Erro stringificado:', JSON.stringify(err, null, 2));
    setError('Não foi possível carregar o vídeo. Verifique se a URL é válida.');
    setLoadAttempts(prev => prev + 1);
  };

  const handleBuffer = () => {
    console.log('⏳ Player bufferizando...');
  };

  const handleBufferEnd = () => {
    console.log('✅ Buffer finalizado');
  };

  const handlePlay = () => {
    console.log('▶️ Vídeo começou a tocar');
  };

  const handlePause = () => {
    console.log('⏸️ Vídeo pausado');
  };

  const handleProgress = (state: any) => {
    if (state && typeof state.played === 'number') {
      // Log apenas a cada 10% para não poluir
      const progressPercent = Math.floor(state.played * 100);
      if (progressPercent % 10 === 0 && progressPercent !== Math.floor(played * 100)) {
        console.log(`📊 Progresso: ${progressPercent}%`);
      }
      setPlayed(state.played);
    }
  };

  const handleDuration = (dur: number) => {
    console.log('⏱️ Duração detectada:', dur, 'segundos');
    setDuration(dur);
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
                  Vídeo {loadAttempts > 0 && `(tentativa ${loadAttempts})`}
                </span>
              </div>
              {isReady && duration > 0 && (
                <span className="text-white/60 text-sm">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </span>
              )}
              {!isReady && !error && (
                <span className="text-white/60 text-sm">
                  Carregando... {timeLeft}s
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
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
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white p-8 max-w-lg">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-bold mb-2">Erro ao Carregar Vídeo</h3>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <p className="text-xs text-gray-400 mb-2">URL: {data.videoUrl}</p>
                <p className="text-xs text-gray-500">Tentativas: {loadAttempts}</p>
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
                onProgress={handleProgress}
                onDuration={handleDuration}
                onEnded={handleVideoEnd}
                onError={handleError}
                onBuffer={handleBuffer}
                onBufferEnd={handleBufferEnd}
                onPlay={handlePlay}
                onPause={handlePause}
                controls={false}
                config={{
                  youtube: {
                    playerVars: {
                      autoplay: 1,
                      modestbranding: 1,
                    }
                  },
                  vimeo: {
                    playerOptions: {
                      autoplay: true,
                    }
                  }
                }}
              />

              {!isReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4" />
                    <p className="text-lg mb-2">Carregando vídeo...</p>
                    <p className="text-sm text-gray-400">Aguarde {timeLeft}s</p>
                    <p className="text-xs text-gray-500 mt-2">Tentativas: {loadAttempts}</p>
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
                    const newVolume = parseFloat(e.target.value);
                    console.log('🔊 Volume mudou para:', newVolume);
                    setVolume(newVolume);
                    if (newVolume > 0) setMuted(false);
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