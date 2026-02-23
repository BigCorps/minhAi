'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

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
  const [videoEnded, setVideoEnded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasClosedRef = useRef(false);

  // Cleanup
  useEffect(() => {
    console.log('🎬 Vídeo montado - URL:', data.videoUrl);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [data.videoUrl]);

  // Listener para eventos do YouTube e Vimeo
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ignorar se já fechou
      if (hasClosedRef.current) return;

      // YouTube postMessage
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          
          // YouTube Player State: 0 = ended
          if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
            console.log('🏁 YouTube vídeo terminou');
            handleVideoEnd();
          }
        } catch (e) {
          // Não é JSON, ignorar
        }
      }
      
      // Vimeo postMessage - formato correto
      if (event.origin === 'https://player.vimeo.com') {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          
          if (data.event === 'finish' || data.event === 'ended') {
            console.log('🏁 Vimeo vídeo terminou');
            handleVideoEnd();
          }
        } catch (e) {
          // Ignorar erros de parse
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Habilitar APIs de eventos
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const embedUrl = iframe.src;

    // YouTube - habilitar eventos
    if (embedUrl.includes('youtube.com')) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening', id: 1 }),
          '*'
        );
      }, 1000);
    }

    // Vimeo - habilitar eventos
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
  }, []);

  const handleClose = () => {
    if (hasClosedRef.current) return;
    
    console.log('❌ Fechamento manual');
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  const handleVideoEnd = () => {
    if (hasClosedRef.current) return;
    
    console.log('🎬 Vídeo terminou - fechando automaticamente');
    setVideoEnded(true);
    hasClosedRef.current = true;
    
    // Delay de 2 segundos
    setTimeout(() => {
      window.speechSynthesis.cancel();
      onClose();
    }, 2000);
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

    // Vimeo - formato correto
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        // player_id necessário para eventos funcionarem
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&player_id=vimeo-player`;
      }
    }

    // Direto (mp4, webm, etc)
    return url;
  };

  const embedUrl = getEmbedUrl(data.videoUrl);
  const isDirect = embedUrl === data.videoUrl;

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
                  Vídeo de Instruções
                </span>
              </div>
              <span className="text-white/60 text-sm">
                {videoEnded ? 'Vídeo finalizado' : 'Fecha ao terminar'}
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
            // Vídeo direto (MP4, WebM, etc)
            <video
              src={embedUrl}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
              onEnded={handleVideoEnd}
            />
          ) : (
            // YouTube ou Vimeo (iframe)
            <iframe
              ref={iframeRef}
              id={embedUrl.includes('vimeo.com') ? 'vimeo-player' : undefined}
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )}
        </div>

        {/* Indicador de finalização */}
        {videoEnded && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-6 py-3 bg-green-500/90 backdrop-blur-sm rounded-full shadow-lg">
              <span className="text-white text-sm font-medium">
                ✓ Vídeo finalizado - fechando em 2s...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}