'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Video {
  title: string;
  url: string;
}

interface SequenciaVideosDisplayProps {
  data: {
    companyId: string;
    videos: Video[];
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function SequenciaVideosDisplay({
  data,
  onClose,
  theme = 'dark',
}: SequenciaVideosDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasClosedRef = useRef(false);

  const currentVideo = data.videos[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === data.videos.length - 1;

  // Cleanup
  useEffect(() => {
    console.log('Sequência montada -', data.videos.length, 'vídeos');
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [data.videos.length]);

  // Log mudança de vídeo
  useEffect(() => {
    console.log(`Vídeo ${currentIndex + 1}/${data.videos.length}:`, currentVideo.title);
    setVideoEnded(false);
  }, [currentIndex, currentVideo.title, data.videos.length]);

  // Listener para eventos do YouTube e Vimeo
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (hasClosedRef.current) return;

      // YouTube
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
            console.log('YouTube vídeo terminou');
            handleVideoEnd();
          }
        } catch (e) {
          // Ignorar
        }
      }
      
      // Vimeo
      if (event.origin === 'https://player.vimeo.com') {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.event === 'finish' || data.event === 'ended') {
            console.log('Vimeo vídeo terminou');
            handleVideoEnd();
          }
        } catch (e) {
          // Ignorar
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentIndex, isLast]);

  // Habilitar APIs
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const embedUrl = iframe.src;

    if (embedUrl.includes('youtube.com')) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening', id: currentIndex }),
          '*'
        );
      }, 1000);
    }

    if (embedUrl.includes('vimeo.com')) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'finish' }),
          'https://player.vimeo.com'
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'ended' }),
          'https://player.vimeo.com'
        );
      }, 1000);
    }
  }, [currentIndex]);

  // Detecção de comandos de voz (simplificado - será integrado via voiceCommandDetector)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrevious();
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  const handleClose = () => {
    if (hasClosedRef.current) return;
    console.log('❌ Sequência fechada');
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  const handleVideoEnd = () => {
    if (hasClosedRef.current) return;
    
    console.log('🎬 Vídeo terminou');
    setVideoEnded(true);

    if (isLast) {
      // Último vídeo - fecha após delay
      console.log('✅ Era o último vídeo - fechando sequência');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } else {
      // Avança pro próximo
      console.log('▶️ Avançando para próximo vídeo');
      setTimeout(() => {
        goNext();
      }, 1500);
    }
  };

  const goNext = () => {
    if (currentIndex < data.videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setVideoEnded(false);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setVideoEnded(false);
    }
  };

  // Converter URL para embed
  const getEmbedUrl = (url: string): string => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
      }
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&player_id=vimeo-player-${currentIndex}`;
      }
    }

    return url;
  };

  const embedUrl = getEmbedUrl(currentVideo.url);
  const isDirect = embedUrl === currentVideo.url;

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
                  Vídeo {currentIndex + 1} de {data.videos.length}
                </span>
              </div>
              <span className="text-white/80 text-sm font-medium max-w-md truncate">
                {currentVideo.title}
              </span>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Player de Vídeo */}
        <div className="relative aspect-video bg-black">
          {isDirect ? (
            <video
              key={currentIndex}
              src={embedUrl}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
              onEnded={handleVideoEnd}
            />
          ) : (
            <iframe
              key={currentIndex}
              ref={iframeRef}
              id={embedUrl.includes('vimeo.com') ? `vimeo-player-${currentIndex}` : undefined}
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )}
        </div>

        {/* Controles de Navegação */}
        <div className={`p-4 ${
          theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            {/* Botão Anterior */}
            <button
              onClick={goPrevious}
              disabled={isFirst}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                isFirst
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Anterior</span>
            </button>

            {/* Indicador Central */}
            <div className="text-center">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {currentVideo.title}
              </p>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                {videoEnded && !isLast && 'Próximo em 1.5s...'}
                {videoEnded && isLast && 'Sequência finalizada'}
              </p>
            </div>

            {/* Botão Próximo */}
            <button
              onClick={goNext}
              disabled={isLast}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                isLast
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <span className="text-white font-medium">Próximo</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Indicador de finalização */}
        {videoEnded && isLast && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-6 py-3 bg-green-500/90 backdrop-blur-sm rounded-full shadow-lg">
              <span className="text-white text-sm font-medium">
                ✓ Sequência finalizada - fechando em 2s...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
