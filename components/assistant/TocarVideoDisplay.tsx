'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface TocarVideoDisplayProps {
  data: {
    companyId: string;
    query: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

interface VideoResult {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  embed_url: string;
}

export default function TocarVideoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: TocarVideoDisplayProps) {
  const { companyId, query } = data;

  const [video, setVideo] = useState<VideoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [searchInput, setSearchInput] = useState(query || '');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasClosedRef = useRef(false);

  // Cleanup
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // Buscar vídeo
  const fetchVideo = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setVideo(null);
    setVideoEnded(false);
    hasClosedRef.current = false;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tocar-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ query: searchQuery, max_results: 1 }),
        }
      );

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Erro ao buscar vídeo');
      }

      if (!json.videos || json.videos.length === 0) {
        throw new Error(`Nenhum vídeo encontrado para "${searchQuery}"`);
      }

      setVideo(json.videos[0]);
      playText(`Reproduzindo: ${json.videos[0].title}`).catch(() => {});

    } catch (err: any) {
      setError(err.message);
      playText('Não encontrei nenhum vídeo. Tente outro assunto.').catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  // Busca inicial
  useEffect(() => {
    if (query) fetchVideo(query);
  }, []);

  // Listener para fim do vídeo YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (hasClosedRef.current) return;
      if (event.data && typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'infoDelivery' && msg.info?.playerState === 0) {
            handleVideoEnd();
          }
        } catch (e) {}
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Habilitar eventos YouTube
  useEffect(() => {
    if (!video || !iframeRef.current) return;
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1 }), '*'
      );
    }, 1000);
  }, [video]);

  const handleClose = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleClose);

  const handleVideoEnd = () => {
    if (hasClosedRef.current) return;
    setVideoEnded(true);
    hasClosedRef.current = true;
    setTimeout(() => {
      window.speechSynthesis.cancel();
      onClose();
    }, 2000);
  };

  const handleSearch = () => {
    if (searchInput.trim()) fetchVideo(searchInput.trim());
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900' : 'bg-white'
      }`}>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between gap-3">
            {/* Busca */}
            <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
              <Search className="w-4 h-4 text-white/60 flex-shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar outro vídeo..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full disabled:opacity-50 transition"
              >
                Buscar
              </button>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 transition-all flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Título do vídeo */}
          {video && (
            <div className="mt-2 px-1">
              <p className="text-white text-sm font-medium truncate">{video.title}</p>
              <p className="text-white/50 text-xs">{video.channel}</p>
            </div>
          )}
        </div>

        {/* Player */}
        <div className="relative aspect-video bg-black">

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <p className="text-white/60 text-sm">Buscando vídeo...</p>
            </div>
          )}

          {/* Erro */}
          {!loading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
              <p className="text-4xl">😕</p>
              <p className="text-white text-center text-sm">{error}</p>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Vídeo */}
          {!loading && video && (
            <iframe
              ref={iframeRef}
              src={video.embed_url}
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
                ✓ Vídeo finalizado — fechando em 2s...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
