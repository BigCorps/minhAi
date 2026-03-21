'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Music, Loader2, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface TocarMusicaDisplayProps {
  data: {
    companyId: string;
    query: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

interface MusicResult {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  embed_url: string;
}

export default function TocarMusicaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: TocarMusicaDisplayProps) {
  const { query } = data;

  const [musica, setMusica] = useState<MusicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query || '');
  const [showSearch, setShowSearch] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasClosedRef = useRef(false);

  // Cleanup
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // Listener de eventos do YouTube IFrame API
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (hasClosedRef.current) return;
      if (event.data && typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          // playerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering
          if (msg.event === 'infoDelivery' && msg.info?.playerState !== undefined) {
            const state = msg.info.playerState;
            if (state === 0) handleClose();           // terminou
            if (state === 1) setIsPlaying(true);      // tocando
            if (state === 2) setIsPlaying(false);     // pausado
          }
        } catch (e) {}
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Registrar listener assim que iframe carregar
  useEffect(() => {
    if (!musica || !iframeRef.current) return;
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1 }), '*'
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [musica]);

  const sendCommand = (command: string, args?: any) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: args ?? [] }),
      '*'
    );
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendCommand('playVideo');
      setIsPlaying(true);
    }
  };

  const fetchMusica = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setMusica(null);
    setIsPlaying(true);
    hasClosedRef.current = false;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tocar-musica`,
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

      if (!res.ok || json.error) throw new Error(json.error || 'Erro ao buscar música');
      if (!json.musicas || json.musicas.length === 0) throw new Error('Nenhuma música encontrada');

      // controls=0 — sem barra do YouTube, enablejsapi=1 — permite postMessage
      const m = json.musicas[0];
      m.embed_url = `https://www.youtube.com/embed/${m.video_id}?autoplay=1&controls=0&rel=0&modestbranding=1&enablejsapi=1`;
      setMusica(m);
      setShowSearch(false);
      playText('Música encontrada.').catch(() => {});

    } catch (err: any) {
      setError(err.message);
      playText('Não encontrei essa música. Tente outro estilo.').catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  // Busca inicial
  useEffect(() => {
    if (query) fetchMusica(query);
  }, []);

  const handleClose = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleClose);

  const handleSearch = () => {
    if (searchInput.trim()) fetchMusica(searchInput.trim());
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <div className={`rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
      } ${minimized ? 'w-64' : 'w-80'}`}>

        {/* Barra superior */}
        <div className={`flex items-center justify-between px-4 py-3 ${
          isDark ? 'bg-green-900/30 border-b border-white/5' : 'bg-green-50 border-b border-gray-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
              loading ? 'bg-green-500/20' : 'bg-green-500'
            }`}>
              {loading
                ? <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin" />
                : <Music className="w-3.5 h-3.5 text-white" />
              }
            </div>
            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {loading ? 'Buscando...' : error ? 'Erro' : 'Tocando agora'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(p => !p)}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleClose}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Conteúdo expandido */}
        {!minimized && (
          <div className="p-4 space-y-3">

            {/* Info + Play/Pause */}
            {musica && !loading && (
              <div className="flex items-center gap-3">
                {/* Botão Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center flex-shrink-0 transition shadow-lg"
                >
                  {isPlaying
                    ? <Pause className="w-4 h-4 text-white" />
                    : <Play className="w-4 h-4 text-white ml-0.5" />
                  }
                </button>

                {/* Título e canal */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {musica.title}
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                    {musica.channel}
                  </p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                </div>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                  Buscando música...
                </p>
              </div>
            )}

            {/* Erro */}
            {error && !loading && (
              <p className="text-xs text-red-400 text-center py-1">{error}</p>
            )}

            {/* iframe oculto — apenas para reprodução */}
            {musica && (
              <div className="hidden">
                <iframe
                  ref={iframeRef}
                  src={musica.embed_url}
                  allow="autoplay"
                  frameBorder="0"
                />
              </div>
            )}

            {/* Buscar outra música */}
            <button
              onClick={() => setShowSearch(p => !p)}
              className={`w-full text-xs py-1.5 rounded-lg transition ${
                isDark
                  ? 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {showSearch ? '▲ Fechar busca' : '🔍 Buscar outra música'}
            </button>

            {showSearch && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Artista ou estilo..."
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border outline-none ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white placeholder:text-white/30'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
                  }`}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 transition font-medium"
                >
                  OK
                </button>
              </div>
            )}

            {/* Dica de voz */}
            <p className={`text-xs text-center ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
              Diga "parar música" para encerrar
            </p>
          </div>
        )}

        {/* Versão minimizada */}
        {minimized && (
          <div className="px-4 py-2 flex items-center gap-2">
            {musica && !loading && (
              <button
                onClick={togglePlay}
                className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center flex-shrink-0 transition"
              >
                {isPlaying
                  ? <Pause className="w-2.5 h-2.5 text-white" />
                  : <Play className="w-2.5 h-2.5 text-white ml-0.5" />
                }
              </button>
            )}
            {loading
              ? <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Buscando...</p>
              : musica
                ? <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    {musica.title}
                  </p>
                : <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>Erro ao buscar</p>
            }
            {/* iframe continua rodando minimizado */}
            {musica && (
              <div className="hidden">
                <iframe
                  ref={iframeRef}
                  src={musica.embed_url}
                  allow="autoplay"
                  frameBorder="0"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
