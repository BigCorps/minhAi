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

interface PainelOfertasDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

function buildQrUrl(content: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(content)}&margin=6&bgcolor=ffffff`;
}

function buildWhatsAppUrl(number: string): string {
  const digits = number.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export default function PainelOfertasDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: PainelOfertasDisplayProps) {
  const { companyId } = data;

  const [images, setImages] = useState<DriveImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(8);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<string>('');

  const hasClosedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const goNext = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
      setFadeIn(true);
    }, 400);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
      setFadeIn(true);
    }, 400);
  }, [images.length]);

  useEffect(() => {
    async function init() {
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'painel_ofertas')
        .maybeSingle();

      const cfg = settings?.config || {};
      setIntervalSeconds(cfg.seconds_per_image || 8);

      // Montar QR Code
      if (cfg.qr_type && cfg.qr_type !== 'none') {
        const { data: company } = await supabase
          .from('companies')
          .select('website, whatsapp_number, instagram_username')
          .eq('id', companyId)
          .single();

        let content = '';
        let label = '';

        if (cfg.qr_type === 'website' && company?.website) {
          content = company.website.startsWith('http') ? company.website : `https://${company.website}`;
          label = 'Acesse nosso site';
        } else if (cfg.qr_type === 'whatsapp' && company?.whatsapp_number) {
          content = buildWhatsAppUrl(company.whatsapp_number);
          label = 'Fale no WhatsApp';
        } else if (cfg.qr_type === 'instagram' && company?.instagram_username) {
          const user = company.instagram_username.replace('@', '');
          content = `https://instagram.com/${user}`;
          label = 'Siga no Instagram';
        } else if (cfg.qr_type === 'custom' && cfg.qr_custom_link) {
          content = cfg.qr_custom_link;
          label = cfg.qr_custom_label || 'Saiba mais';
        }

        if (content) { setQrContent(content); setQrLabel(label); }
      }

      // ✅ Fix: montar imagens direto do config, sem chamar a edge function
      // Os IDs e nomes já foram salvos pelo Picker — thumbnails do Drive
      // funcionam publicamente para arquivos compartilhados "com o link"
      const rawFileIds: any[] = cfg.file_ids || [];

      if (rawFileIds.length === 0) {
        setError('Nenhuma imagem configurada. Configure no painel.');
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
      playText('Não consegui carregar as ofertas.').catch(() => {});
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
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-white/60 text-sm">Carregando ofertas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-5xl">📢</p>
          <p className="text-white text-lg">{error}</p>
          <button onClick={handleClose} className="px-6 py-2 bg-orange-600 text-white rounded-full text-sm">Fechar</button>
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

      {/* QR Code fixo — canto inferior esquerdo */}
      {qrContent && !loading && (
        <div className="absolute bottom-6 left-6 flex flex-col items-center gap-1.5 z-20">
          <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <img src={buildQrUrl(qrContent)} alt="QR Code" width={96} height={96} className="block" />
          </div>
          {qrLabel && (
            <span className="text-white/80 text-xs font-medium px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-center">
              {qrLabel}
            </span>
          )}
        </div>
      )}

      {!loading && currentImage && controlsVisible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white/70 text-sm truncate max-w-xs">
          {currentImage.name.replace(/\.[^/.]+$/, '')}
        </div>
      )}

      {!loading && images.length > 0 && (
        <div className={`absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 to-transparent transition-all duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <div className="flex items-center justify-center gap-4 ml-28">
            <button onClick={goPrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={() => setIsPlaying(p => !p)} className="p-4 rounded-full bg-orange-600 hover:bg-orange-700 text-white transition shadow-xl">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <span className="text-white/60 text-sm">{currentIndex + 1} / {images.length}</span>
            <button onClick={goNext} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 h-0.5 bg-white/20 rounded-full mx-auto overflow-hidden" style={{ marginLeft: '120px' }}>
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${((currentIndex + 1) / images.length) * 100}%`, transition: 'width 0.5s ease' }} />
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
