'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Loader2, Pause, Play, SkipForward, SkipBack } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';

interface DriveImage {
  id: string;
  name: string;
  url: string;
  thumb: string;
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

  const [images, setImages] = useState<DriveImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  const hasClosedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const goNext = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
      setFadeIn(true);
    }, 300);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
      setFadeIn(true);
    }, 300);
  }, [images.length]);

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

      // ✅ Fix: montar imagens direto do config, sem chamar a edge function
      const rawFileIds: any[] = cfg.file_ids || [];

      if (rawFileIds.length === 0) {
        setError('Nenhuma foto configurada. Configure no painel.');
        setLoading(false);
        return;
      }

      const imageList: DriveImage[] = rawFileIds.map((f: any) => {
        const id = f.id || f;
        const name = f.name || id;
        return {
          id,
          name,
          url: `https://drive.google.com/thumbnail?id=${id}&sz=w1920-h1080`,
          thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w400-h300`,
        };
      });

      if (cfg.shuffle) {
        for (let i = imageList.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [imageList[i], imageList[j]] = [imageList[j], imageList[i]];
        }
      }

      setImages(imageList);
      setLoading(false);
    }

    init().catch((err) => {
      setError(err.message);
      playText('Não consegui carregar as fotos.').catch(() => {});
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    timerRef.current = setInterval(goNext, intervalSeconds * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, images.length, goNext, intervalSeconds]);

  useEffect(() => {
    if (images.length === 0) return;
    hideControlsRef.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => { if (hideControlsRef.current) clearTimeout(hideControlsRef.current); };
  }, [images]);

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
      if (['continuar', 'play', 'retomar'].some(c => t.includes(c))) { setIsPlaying(true); return; }
      if (['proximo', 'próximo', 'avancar'].some(c => t.includes(c))) { goNext(); return; }
      if (['anterior', 'voltar'].some(c => t.includes(c))) { goPrev(); return; }
    },
  });

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-none"
      onClick={showControls}
      onMouseMove={showControls}
    >
      {loading && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
          <p className="text-white/60 text-sm">Carregando fotos...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-5xl">🖼️</p>
          <p className="text-white text-lg">{error}</p>
          <button onClick={handleClose} className="px-6 py-2 bg-pink-600 text-white rounded-full text-sm">Fechar</button>
        </div>
      )}

      {!loading && currentImage && (
        <img
          key={currentImage.id}
          src={currentImage.url}
          alt={currentImage.name}
          className="w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: fadeIn ? 1 : 0 }}
          onError={e => { (e.target as HTMLImageElement).src = currentImage.thumb; }}
        />
      )}

      {!loading && images.length > 0 && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg transition-all duration-300 ${
          controlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <div className="bg-black/50 backdrop-blur-md p-6 rounded-3xl shadow-2xl mx-4">
            <div className="flex items-center justify-between">
              <button onClick={goPrev} className="p-3 rounded-full bg-white/10 hover:bg-white/30 text-white transition">
                <SkipBack className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-6">
                <button onClick={() => setIsPlaying(p => !p)} className="p-5 rounded-full bg-pink-600 hover:bg-pink-700 text-white transition shadow-xl">
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                <span className="text-white/80 font-medium text-sm">{currentIndex + 1} / {images.length}</span>
              </div>

              <button onClick={goNext} className="p-3 rounded-full bg-white/10 hover:bg-white/30 text-white transition">
                <SkipForward className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mt-6 h-1 bg-white/20 rounded-full w-full overflow-hidden">
              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${((currentIndex + 1) / images.length) * 100}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>
      )}

      <button onClick={handleClose} className={`absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <X className="w-5 h-5" />
      </button>

      {controlsVisible && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white/50 text-xs">
          🎤 "pausar" · "próximo" · "fechar"
        </div>
      )}
    </div>
  );
}
