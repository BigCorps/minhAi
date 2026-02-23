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
  const FALLBACK_CLOSE_SECONDS = 300; // 5 minutos como fallback máximo
  const [timeLeft, setTimeLeft] = useState(FALLBACK_CLOSE_SECONDS);
  const [videoEnded, setVideoEnded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cleanup
  useEffect(() => {
    console.log('🎬 Vídeo montado - URL:', data.videoUrl);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [data.videoUrl]);

  // Listener para eventos do YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
      
      // Vimeo postMessage
      if (event.data && typeof event.data === 'object') {
        if (event.data.event === 'ended') {
          console.log('🏁 Vimeo vídeo terminou');
          handleVideoEnd();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  // Habilitar API do YouTube
  useEffect(() => {
    if (iframeRef.current && embedUrl.includes('youtube.com')) {
      // Enviar comando para habilitar eventos
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          '{"event":"listening","id":1,"channel":"widget"}',
          '*'
        );
      }, 1000);
    }
  }, []);

  // Timer de fallback (só fecha se passar MUITO tempo)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          console.log('⏰ Fallback timer expirou (vídeo muito longo)');
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  const handleClose = () => {
    console.log('❌ Fechamento manual');
    window.speechSynthesis.cancel();
    onClose();
  };

  const handleVideoEnd = () => {
    console.log('🎬 Vídeo terminou - fechando automaticamente');
    setVideoEnded(true);
    
    // Pequeno delay para dar tempo do usuário perceber que terminou
    setTimeout(() => {
      window.speechSynthesis.cancel();
      onClose();
    }, 2000); // 2 segundos de delay
  };

  // Converter URL para embed
  const getEmbedUrl = (url: string): string => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      
      if (videoId) {
        // enablejsapi=1 permite receber eventos
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
      }
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        // api=1 permite receber eventos
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&api=1`;
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
                  Vídeo
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
            // Vídeo direto (MP4, WebM, etc) - usa evento onEnded nativo
            <video
              src={embedUrl}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
              onEnded={handleVideoEnd}
            />
          ) : (
            // YouTube ou Vimeo (iframe) - usa postMessage API
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )}
        </div>

        {/* Indicador de status */}
        {videoEnded && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-4 py-2 bg-green-500/90 backdrop-blur-sm rounded-full">
              <span className="text-white text-sm font-medium">
                ✓ Vídeo finalizado - fechando em 2s...
              </span>
            </div>
          </div>
        )}

        {/* Barra de progresso (apenas indicativa) */}
        <div className={`h-1 ${
          theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
        }`}>
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              videoEnded ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ 
              width: videoEnded 
                ? '100%'
                : `${((FALLBACK_CLOSE_SECONDS - timeLeft) / FALLBACK_CLOSE_SECONDS) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}