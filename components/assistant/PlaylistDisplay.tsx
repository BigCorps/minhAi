'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Loader2, SkipBack, SkipForward, Shuffle, List } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';

interface PlaylistConfig {
  id: string;
  name: string;
  type: 'video' | 'music';
}

interface PlaylistItem {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  embed_url: string;
}

interface PlaylistDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

export default function PlaylistDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: PlaylistDisplayProps) {
  const { companyId } = data;

  const [playlists, setPlaylists] = useState<PlaylistConfig[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistConfig | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasClosedRef = useRef(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Buscar playlists configuradas
  useEffect(() => {
    async function fetchConfig() {
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'playlist')
        .maybeSingle();

      const cfg = settings?.config?.playlists || [];
      setPlaylists(cfg);

      if (cfg.length > 0) {
        setSelectedPlaylist(cfg[0]);
        await fetchItems(cfg[0].id);
      } else {
        setError('Nenhuma playlist configurada. Configure no painel.');
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const fetchItems = async (playlistId: string) => {
    setLoadingItems(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/playlist-items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ playlist_id: playlistId }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro ao buscar playlist');
      setItems(json.items || []);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingItems(false);
    }
  };

  // Auto-hide header
  useEffect(() => {
    if (items.length === 0) return;
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 3000);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [items]);

  // Listener YouTube ended
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (hasClosedRef.current) return;
      if (event.data && typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'infoDelivery' && msg.info?.playerState === 0) {
            goNext();
          }
        } catch (e) {}
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [items, currentIndex]);

  // Enable YouTube events
  useEffect(() => {
    if (!items.length || !iframeRef.current) return;
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1 }), '*'
      );
    }, 1000);
  }, [currentIndex, items]);

  const goNext = () => {
    setCurrentIndex(prev => (prev + 1) % items.length);
    setHeaderVisible(true);
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 2000);
  };

  const goPrev = () => {
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
    setHeaderVisible(true);
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 2000);
  };

  const toggleShuffle = () => {
    if (!shuffled) {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setItems(arr);
      setCurrentIndex(0);
    }
    setShuffled(p => !p);
  };

  const showHeader = () => {
    setHeaderVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };
  const hideHeader = () => {
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 2000);
  };

  const handleClose = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleClose);

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');

      if (['fechar', 'cancelar', 'sair'].some(c => t.includes(c))) { handleClose(); return; }
      if (['proximo', 'próximo', 'avancar', 'avançar', 'seguinte'].some(c => t.includes(c))) { goNext(); return; }
      if (['anterior', 'voltar', 'retroceder'].some(c => t.includes(c))) { goPrev(); return; }
      if (['shuffle', 'embaralhar', 'aleatório', 'aleatorio'].some(c => t.includes(c))) { toggleShuffle(); return; }
    },
  });

  const currentItem = items[currentIndex];
  const embedUrl = currentItem
    ? `${currentItem.embed_url.split('?')[0]}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden bg-slate-900">

        {/* Header auto-hide */}
        <div
          className="absolute top-0 left-0 right-0 z-10"
          onMouseEnter={showHeader}
          onMouseLeave={hideHeader}
          onClick={showHeader}
        >
          <div className="h-20 w-full absolute top-0" />
          <div className={`p-4 bg-gradient-to-b from-black/90 to-transparent transition-all duration-300 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Playlist selector */}
                {playlists.length > 1 && (
                  <select
                    value={selectedPlaylist?.id || ''}
                    onChange={e => {
                      const pl = playlists.find(p => p.id === e.target.value);
                      if (pl) { setSelectedPlaylist(pl); fetchItems(pl.id); }
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-full border border-white/20 outline-none"
                  >
                    {playlists.map(pl => (
                      <option key={pl.id} value={pl.id} className="bg-slate-900">{pl.name}</option>
                    ))}
                  </select>
                )}
                {currentItem && (
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{currentItem.title}</p>
                    <p className="text-white/50 text-xs">{currentItem.channel} · {currentIndex + 1}/{items.length}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={toggleShuffle} className={`p-2 rounded-full transition ${shuffled ? 'bg-yellow-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={() => setShowList(p => !p)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 transition">
                  <List className="w-4 h-4" />
                </button>
                <button onClick={handleClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Player */}
        <div className="relative aspect-video bg-black">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <p className="text-white/60 text-sm">Carregando playlist...</p>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
              <p className="text-4xl">📭</p>
              <p className="text-white text-center text-sm">{error}</p>
            </div>
          )}
          {!loading && currentItem && (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )}

          {/* Controles prev/next */}
          {!loading && items.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Lista de itens (sidebar) */}
        {showList && items.length > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-black/90 overflow-y-auto z-20">
            <div className="p-3 border-b border-white/10">
              <p className="text-white text-sm font-semibold">Playlist ({items.length})</p>
            </div>
            {items.map((item, idx) => (
              <button
                key={item.video_id}
                onClick={() => { setCurrentIndex(idx); setShowList(false); }}
                className={`w-full flex items-center gap-3 p-3 text-left transition hover:bg-white/10 ${
                  idx === currentIndex ? 'bg-white/20' : ''
                }`}
              >
                <img src={item.thumbnail} alt="" className="w-16 h-10 object-cover rounded flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{item.title}</p>
                  <p className="text-white/40 text-xs truncate">{item.channel}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
