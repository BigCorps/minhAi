'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Loader2, Pause, Play, SkipForward, SkipBack, Shuffle } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';

interface Photo {
  id: string;
  url: string;
  thumb: string;
  description: string;
}

interface PortaRetratoDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

export default function PortaRetratoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: PortaRetratoDisplayProps) {
  const { companyId } = data;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [transition, setTransition] = useState<'fade' | 'slide'>('fade');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [fadeIn, setFadeIn] = useState(true);

  const hasClosedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const goNext = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
      setFadeIn(true);
    }, 300);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
      setFadeIn(true);
    }, 300);
  }, [photos.length]);

  // Buscar fotos e config
  useEffect(() => {
    async function init() {
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'porta_retrato')
        .maybeSingle();

      const cfg = settings?.config || {};
      setIntervalSeconds(cfg.seconds_per_photo || 5);
      setTransition(cfg.transition || 'fade');

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-drive-images`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              company_id: companyId,
              album_id: cfg.album_id || null,
            }),
          }
        );
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Erro ao carregar fotos');
        if (!json.photos || json.photos.length === 0) throw new Error('Nenhuma foto encontrada no álbum.');

        let photoList = json.photos;
        if (cfg.shuffle) {
          for (let i = photoList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [photoList[i], photoList[j]] = [photoList[j], photoList[i]];
          }
        }
        setPhotos(photoList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;
    timerRef.current = setInterval(goNext, intervalSeconds * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, photos.length, goNext, intervalSeconds]);

  // Auto-hide controls
  useEffect(() => {
    if (photos.length === 0) return;
    hideControlsRef.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => { if (hideControlsRef.current) clearTimeout(hideControlsRef.current); };
  }, [photos]);

  const showControls = () => {
    setControlsVisible(true);
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    hideControlsRef.current = setTimeout(() => setControlsVisible(false), 3000);
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
      if (['pausar', 'pausa', 'parar'].some(c => t.includes(c))) { setIsPlaying(false); return; }
      if (['continuar', 'play', 'reproduzir', 'retomar'].some(c => t.includes(c))) { setIsPlaying(true); return; }
      if (['proximo', 'próximo', 'avancar'].some(c => t.includes(c))) { goNext(); return; }
      if (['anterior', 'voltar'].some(c => t.includes(c))) { goPrev(); return; }
    },
  });

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-none"
      onClick={showControls}
      onMouseMove={showControls}
    >
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
          <p className="text-white/60 text-sm">Carregando fotos...</p>
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-5xl">🖼️</p>
          <p className="text-white text-lg">{error}</p>
          <button onClick={handleClose} className="px-6 py-2 bg-pink-600 text-white rounded-full text-sm">
            Fechar
          </button>
        </div>
      )}

      {/* Foto */}
      {!loading && currentPhoto && (
        <img
          key={currentPhoto.id}
          src={currentPhoto.url}
          alt={currentPhoto.description}
          className="w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: fadeIn ? 1 : 0 }}
        />
      )}

      {/* Controles */}
      {!loading && photos.length > 0 && (
        <div className={`absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-all duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <button onClick={goPrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <SkipBack className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="p-4 rounded-full bg-pink-600 hover:bg-pink-700 text-white transition shadow-xl"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <span className="text-white/60 text-sm">{currentIndex + 1} / {photos.length}</span>
            </div>
            <button onClick={goNext} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4 h-0.5 bg-white/20 rounded-full max-w-2xl mx-auto overflow-hidden">
            <div
              className="h-full bg-pink-500 rounded-full"
              style={{
                width: `${((currentIndex + 1) / photos.length) * 100}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Botão fechar */}
      <button
        onClick={handleClose}
        className={`absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Dica de voz */}
      {controlsVisible && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white/50 text-xs">
          🎤 "pausar" · "próximo" · "fechar"
        </div>
      )}
    </div>
  );
}
