'use client';

// components/assistant/CriarMidiaDisplay.tsx
// Criador de Posts com IA — padrão visual FazerPedidoDisplay
// Coluna esquerda: chat com assistente | Coluna direita: preview + configurações

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  X, Send, Mic, Loader2, Download, Copy, Share2,
  Image as ImageIcon, Check, AlertCircle, RefreshCw,
  Instagram, Facebook, ChevronDown, Sparkles, Volume2, VolumeX,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CriarMidiaDisplayProps {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Aba = 'chat' | 'preview';
type LogoPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'auto';
type ImageFormat = 'square' | 'portrait' | 'landscape';
type Etapa = 'conversa' | 'gerando' | 'preview' | 'descricao' | 'publicando';

interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CompanyContext {
  name: string;
  logo_url: string | null;
  website: string | null;
  facebook: string | null;
  instagram_username: string | null;
  whatsapp_number: string | null;
  telefone_fixo: string | null;
  email_contato: string | null;
  brand_description: string | null;
  business_address: string | null;
  system_prompt: string | null;
}

interface ArteGerada {
  image_url: string;
  storage_path: string;
  caption: string;
  hashtags: string[];
  prompt_used: string;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const INSTAGRAM_PURPLE = '#8B5CF6';
const INSTAGRAM_GRADIENT = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)';

function useCores(isDark: boolean) {
  return {
    bg:              isDark ? '#1e293b' : '#ffffff',
    bgSecondary:     isDark ? '#334155' : '#f8fafc',
    bgChat:          isDark ? '#0f172a' : '#f1f5f9',
    text:            isDark ? '#f1f5f9' : '#0f172a',
    textMuted:       isDark ? '#94a3b8' : '#64748b',
    border:          isDark ? '#475569' : '#e2e8f0',
    accent:          INSTAGRAM_PURPLE,
    userBubble:      INSTAGRAM_PURPLE,
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };
}

type Cores = ReturnType<typeof useCores>;

// ─── Seletor de formato ───────────────────────────────────────────────────────

const FORMATOS: { key: ImageFormat; label: string; desc: string; ratio: string }[] = [
  { key: 'square',    label: 'Quadrado',    desc: 'Feed Instagram / Facebook', ratio: '1:1'   },
  { key: 'portrait',  label: 'Vertical',    desc: 'Stories / Reels cover',     ratio: '4:5'   },
  { key: 'landscape', label: 'Horizontal',  desc: 'Banner / Facebook cover',   ratio: '16:9'  },
];

const POSICOES: { key: LogoPosition; label: string }[] = [
  { key: 'top_left',     label: 'Superior esquerdo' },
  { key: 'top_right',    label: 'Superior direito'  },
  { key: 'bottom_left',  label: 'Inferior esquerdo' },
  { key: 'bottom_right', label: 'Inferior direito'  },
  { key: 'auto',         label: 'Assistente decide' },
];

// ─── Painel direito — configurações e preview ─────────────────────────────────

function PainelDireito({
  C, etapa, arte, company, formato, setFormato,
  logoPosition, setLogoPosition, caption, setCaption,
  hashtags, copiado, onCopiarCaption, onBaixar, onPublicarFacebook,
  temConexaoFacebook, publicando,
}: {
  C: Cores;
  etapa: Etapa;
  arte: ArteGerada | null;
  company: CompanyContext | null;
  formato: ImageFormat;
  setFormato: (f: ImageFormat) => void;
  logoPosition: LogoPosition;
  setLogoPosition: (p: LogoPosition) => void;
  caption: string;
  setCaption: (v: string) => void;
  hashtags: string[];
  copiado: boolean;
  onCopiarCaption: () => void;
  onBaixar: () => void;
  onPublicarFacebook: () => void;
  temConexaoFacebook: boolean;
  publicando: boolean;
}) {
  const aspectClass = formato === 'square' ? 'aspect-square'
    : formato === 'portrait' ? 'aspect-[4/5]'
    : 'aspect-video';

  // Configurações — antes de gerar
  if (etapa === 'conversa') {
    return (
      <div className="flex flex-col h-full p-5 gap-5 overflow-y-auto" style={{ backgroundColor: C.bg }}>
        {/* Logo preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.textMuted }}>
            Logo da empresa
          </p>
          <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: C.border, backgroundColor: C.bgSecondary }}>
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.border }}>
                <ImageIcon className="w-6 h-6" style={{ color: C.textMuted }} />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold" style={{ color: C.text }}>{company?.name ?? '—'}</p>
              <p className="text-xs" style={{ color: C.textMuted }}>
                {company?.logo_url ? 'Logo carregado automaticamente' : 'Sem logo cadastrado'}
              </p>
            </div>
          </div>
        </div>

        {/* Formato */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.textMuted }}>
            Formato da arte
          </p>
          <div className="space-y-2">
            {FORMATOS.map(f => (
              <button key={f.key} onClick={() => setFormato(f.key)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: formato === f.key ? C.accent : C.border,
                  backgroundColor: formato === f.key ? `${C.accent}15` : C.bgSecondary,
                }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{f.label}</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{f.desc}</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: C.border, color: C.textMuted }}>
                  {f.ratio}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Posição do logo */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.textMuted }}>
            Posição do logo
          </p>
          <div className="relative">
            <select value={logoPosition} onChange={e => setLogoPosition(e.target.value as LogoPosition)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm appearance-none pr-8 focus:outline-none"
              style={{ borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text }}>
              {POSICOES.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.textMuted }} />
          </div>
        </div>

        {/* Dica */}
        <div className="rounded-xl p-4 mt-auto" style={{ backgroundColor: `${C.accent}12`, border: `1px solid ${C.accent}30` }}>
          <div className="flex gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.accent }} />
            <p className="text-xs leading-relaxed" style={{ color: C.text }}>
              Quanto mais detalhes você passar no chat — cores, estilo, promoção, público — melhor será a arte gerada. Os 15 créditos são cobrados apenas quando você confirmar a geração.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Gerando — spinner
  if (etapa === 'gerando') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ backgroundColor: C.bg }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: INSTAGRAM_GRADIENT }}>
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: C.text }}>Criando sua arte...</p>
          <p className="text-sm mt-1" style={{ color: C.textMuted }}>Isso pode levar até 30 segundos</p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  // Preview + ações
  if ((etapa === 'preview' || etapa === 'descricao' || etapa === 'publicando') && arte) {
    return (
      <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: C.bg }}>
        {/* Imagem */}
        <div className="p-4 flex-shrink-0">
          <div className={`w-full ${aspectClass} rounded-2xl overflow-hidden border relative`} style={{ borderColor: C.border }}>
            <img src={arte.image_url} alt="Arte gerada" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Caption editável */}
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.textMuted }}>
            Descrição
          </p>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border text-sm resize-none focus:outline-none"
            style={{ borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text }}
          />
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="px-4 pb-4 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.textMuted }}>
              Hashtags
            </p>
            <div className="flex flex-wrap gap-1">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${C.accent}20`, color: C.accent }}>
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="px-4 pb-4 space-y-2 mt-auto flex-shrink-0">
          {/* Copiar descrição + hashtags */}
          <button onClick={onCopiarCaption}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all"
            style={{ borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text }}>
            {copiado ? <Check className="w-4 h-4" style={{ color: C.accent }} /> : <Copy className="w-4 h-4" />}
            {copiado ? 'Copiado!' : 'Copiar descrição + hashtags'}
          </button>

          {/* Baixar arte */}
          <button onClick={onBaixar}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all"
            style={{ borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text }}>
            <Download className="w-4 h-4" />
            Baixar arte
          </button>

          {/* Publicar Facebook */}
          {temConexaoFacebook && (
            <button onClick={onPublicarFacebook} disabled={publicando}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#1877F2' }}>
              {publicando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Facebook className="w-4 h-4" />}
              {publicando ? 'Publicando...' : 'Publicar no Facebook'}
            </button>
          )}

          {/* Instagram — em breve */}
          <button disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white opacity-50 cursor-not-allowed"
            style={{ background: INSTAGRAM_GRADIENT }}>
            <Instagram className="w-4 h-4" />
            Publicar no Instagram (em breve)
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Chat do assistente ───────────────────────────────────────────────────────

function ChatMidia({
  C, companyId, company, formato, logoPosition, onArteGerada, playText,
}: {
  C: Cores;
  companyId: string;
  company: CompanyContext | null;
  formato: ImageFormat;
  logoPosition: LogoPosition;
  onArteGerada: (arte: ArteGerada, etapa: Etapa) => void;
  playText?: (text: string) => Promise<void>;
}) {
  const voiceRecorder = useVoiceRecorder();
  const [mensagens, setMensagens] = useState<Mensagem[]>([{
    id: 'init',
    role: 'assistant',
    content: `Olá! Sou o Criador de Posts da ${company?.name ?? 'sua empresa'}. Vamos criar uma arte incrível juntos!\n\nMe conte: qual é o objetivo do post? Uma promoção, lançamento, dica, evento? Quanto mais detalhes você der, melhor ficará a arte. Quando você confirmar que está tudo certo, gero a arte e cobro 15 créditos.`,
  }]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSpokenRef = useRef(false);
  const historicoRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (hasSpokenRef.current || !playText) return;
    hasSpokenRef.current = true;
    playText(`Olá! Sou o Criador de Posts. Me conte o que deseja criar.`);
  }, [playText]);

  const gerarArte = useCallback(async () => {
    const supabase = createClient();
    onArteGerada({ image_url: '', storage_path: '', caption: '', hashtags: [], prompt_used: '' }, 'gerando');

    try {
      const { data, error } = await supabase.functions.invoke('assistente-midia', {
        body: {
          company_id: companyId,
          historico: historicoRef.current,
          formato,
          logo_position: logoPosition,
          company_context: {
            name: company?.name,
            logo_url: company?.logo_url,
            website: company?.website,
            whatsapp: company?.whatsapp_number,
            telefone: company?.telefone_fixo,
            email: company?.email_contato,
            endereco: company?.business_address,
            descricao: company?.brand_description,
          },
        },
      });

      if (error || !data?.image_url) throw new Error('Falha na geração');

      onArteGerada({
        image_url: data.image_url,
        storage_path: data.storage_path ?? '',
        caption: data.caption ?? '',
        hashtags: data.hashtags ?? [],
        prompt_used: data.prompt_used ?? '',
      }, 'preview');

      playText?.('Sua arte está pronta! Confira o preview ao lado.');
    } catch {
      onArteGerada({ image_url: '', storage_path: '', caption: '', hashtags: [], prompt_used: '' }, 'conversa');
      setMensagens(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Ocorreu um erro ao gerar a arte. Tente novamente.',
      }]);
    }
  }, [companyId, formato, logoPosition, company, onArteGerada, playText]);

  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return;
    setInput('');
    setCarregando(true);

    const userMsg: Mensagem = { id: `u-${Date.now()}`, role: 'user', content: texto };
    setMensagens(prev => [...prev, userMsg]);
    historicoRef.current.push({ role: 'user', content: texto });

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('assistente-midia-chat', {
        body: {
          company_id: companyId,
          messages: historicoRef.current,
          company_context: {
            name: company?.name,
            brand_description: company?.brand_description,
            system_prompt: company?.system_prompt,
          },
        },
      });

      const resposta = (!error && data?.message) ? data.message : 'Desculpe, não consegui processar. Pode repetir?';
      const confirmar = (!error && data?.confirmar) === true;

      historicoRef.current.push({ role: 'assistant', content: resposta });
      setMensagens(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: resposta }]);
      playText?.(resposta);

      // Se a IA identificou confirmação do usuário, dispara geração
      if (confirmar) {
        setTimeout(() => gerarArte(), 800);
      }
    } catch {
      setMensagens(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Erro de conexão. Tente novamente.' }]);
    } finally {
      setCarregando(false);
    }
  }, [carregando, companyId, company, gerarArte, playText]);

  const handleStartVoice = useCallback(async () => {
    try { await voiceRecorder.startRecording(); } catch {}
  }, [voiceRecorder]);

  const handleStopVoice = useCallback(async () => {
    try {
      setTranscrevendo(true);
      const audioBlob = await voiceRecorder.stopRecording();
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` },
        body: formData,
      });
      if (res.ok) {
        const { text } = await res.json();
        if (text?.trim()) await enviarMensagem(text.trim());
      }
    } catch {} finally { setTranscrevendo(false); }
  }, [voiceRecorder, enviarMensagem]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bgChat }}>
      {/* Mensagens */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {mensagens.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
              style={{
                backgroundColor: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                color: msg.role === 'user' ? '#ffffff' : C.text,
              }}>
              {msg.content}
            </div>
          </div>
        ))}
        {carregando && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 flex items-center gap-2" style={{ backgroundColor: C.assistantBubble }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.accent }} />
              <span className="text-sm" style={{ color: C.textMuted }}>Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.bg }}>
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(input); } }}
            placeholder="Descreva sua arte ou confirme a geração..."
            disabled={carregando || transcrevendo}
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ backgroundColor: C.bgSecondary, borderColor: C.border, color: C.text }}
          />
          <button type="button"
            onClick={voiceRecorder.isRecording ? handleStopVoice : handleStartVoice}
            disabled={carregando || transcrevendo}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: voiceRecorder.isRecording ? '#ef4444' : '#3b82f6', color: '#ffffff' }}>
            {transcrevendo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => enviarMensagem(input)}
            disabled={!input.trim() || carregando || transcrevendo}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: C.accent, color: '#ffffff' }}>
            {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        {voiceRecorder.isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-red-500">Gravando... {voiceRecorder.duration}s</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CriarMidiaDisplay({ data, onClose, theme = 'dark', playText }: CriarMidiaDisplayProps) {
  const { companyId } = data;
  const isDark = theme === 'dark';
  const C = useCores(isDark);
  const isMobile = useIsMobile();

  const [mounted, setMounted] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('chat');
  const [etapa, setEtapa] = useState<Etapa>('conversa');
  const [formato, setFormato] = useState<ImageFormat>('square');
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom_right');
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [arte, setArte] = useState<ArteGerada | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [temConexaoFacebook, setTemConexaoFacebook] = useState(false);
  const [publicadoFacebook, setPublicadoFacebook] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const audioMutadoRef = useRef(false);

  const effectivePlayText = useCallback(async (text: string) => {
    if (audioMutadoRef.current || !playText) return;
    return playText(text);
  }, [playText]);

  useEffect(() => { setMounted(true); }, []);

  // Carrega contexto da empresa e verifica conexão Facebook
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: comp }, { data: meta }] = await Promise.all([
        supabase.from('companies').select(
          'name, logo_url, website, facebook, instagram_username, whatsapp_number, telefone_fixo, email_contato, brand_description, business_address, system_prompt'
        ).eq('id', companyId).single(),
        supabase.from('meta_connections').select('meta_page_id, encrypted_page_access_token, criar_midia_enabled')
          .eq('company_id', companyId).single(),
      ]);
      if (comp) setCompany(comp);
      if (meta?.meta_page_id && meta?.encrypted_page_access_token && meta?.criar_midia_enabled) {
        setTemConexaoFacebook(true);
      }
    }
    load();
  }, [companyId]);

  const handleArteGerada = useCallback(async (novaArte: ArteGerada, novaEtapa: Etapa) => {
    if (novaEtapa === 'gerando') {
      setEtapa('gerando');
      if (isMobile) setAbaAtiva('preview');
      return;
    }

    let imageUrlFinal = novaArte.image_url;

    if (novaArte.image_url && company?.logo_url) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const carregarImagem = (src: string): Promise<HTMLImageElement> =>
          new Promise((res, rej) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
          });

        const [arte, logo] = await Promise.all([
          carregarImagem(novaArte.image_url),
          carregarImagem(company.logo_url!),
        ]);

        canvas.width  = arte.naturalWidth  || arte.width;
        canvas.height = arte.naturalHeight || arte.height;

        ctx.drawImage(arte, 0, 0, canvas.width, canvas.height);

        const logoW = Math.round(canvas.width * 0.18);
        const ratio = logo.naturalHeight / logo.naturalWidth;
        const logoH = Math.round(logoW * ratio);
        const margin = Math.round(canvas.width * 0.03);

        const posMap: Record<LogoPosition, { x: number; y: number }> = {
          top_left:     { x: margin,                         y: margin },
          top_right:    { x: canvas.width  - logoW - margin, y: margin },
          bottom_left:  { x: margin,                         y: canvas.height - logoH - margin },
          bottom_right: { x: canvas.width  - logoW - margin, y: canvas.height - logoH - margin },
          auto:         { x: canvas.width  - logoW - margin, y: margin },
        };

        const pos = posMap[logoPosition] ?? posMap.bottom_right;
        ctx.drawImage(logo, pos.x, pos.y, logoW, logoH);

        imageUrlFinal = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('[CriarMidia] Logo compose falhou:', e);
      }
    }

    setArte({ ...novaArte, image_url: imageUrlFinal });
    setCaption(novaArte.caption);
    setHashtags(novaArte.hashtags);
    setEtapa(novaEtapa);
    if (isMobile) setAbaAtiva('preview');
  }, [isMobile, company, logoPosition]);

  const handleCopiarCaption = useCallback(() => {
    const texto = `${caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [caption, hashtags]);

  const handleBaixar = useCallback(async () => {
    if (!arte?.image_url) return;
    try {
      const res = await fetch(arte.image_url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `post-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(arte.image_url, '_blank');
    }
  }, [arte]);

  const handlePublicarFacebook = useCallback(async () => {
    if (!arte?.image_url || publicando) return;
    setPublicando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke('publicar-midia', {
        body: {
          company_id: companyId,
          image_url: arte.image_url,
          caption: `${caption}\n\n${hashtags.join(' ')}`,
          platform: 'facebook',
        },
      });
      if (!error) {
        setPublicadoFacebook(true);
        playText?.('Post publicado com sucesso no Facebook!');
      }
    } catch {} finally { setPublicando(false); }
  }, [arte, companyId, caption, hashtags, publicando, playText]);

  if (!mounted) return null;

  const temArte = etapa === 'preview' || etapa === 'descricao' || etapa === 'publicando';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg sm:max-w-5xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: C.bg, borderColor: C.border }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: C.border, backgroundColor: isDark ? `${INSTAGRAM_PURPLE}15` : '#faf5ff' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: INSTAGRAM_GRADIENT }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: C.text }}>Criador de Posts</h2>
              <p className="text-xs" style={{ color: C.textMuted }}>
                {etapa === 'conversa' && 'Descreva sua arte no chat'}
                {etapa === 'gerando' && 'Gerando sua arte com IA...'}
                {temArte && publicadoFacebook && '✓ Publicado no Facebook'}
                {temArte && !publicadoFacebook && 'Arte pronta — baixe ou publique'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAudioMutado(prev => {
                  audioMutadoRef.current = !prev;
                  return !prev;
                });
              }}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: audioMutado
                  ? 'rgba(239,68,68,0.1)'
                  : `${INSTAGRAM_PURPLE}20`,
                color: audioMutado ? '#ef4444' : INSTAGRAM_PURPLE,
              }}
            >
              {audioMutado
                ? <VolumeX className="w-5 h-5" />
                : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:opacity-70 transition-opacity">
              <X className="w-5 h-5" style={{ color: C.textMuted }} />
            </button>
          </div>
        </div>

        {/* Tabs mobile */}
        {isMobile && (
          <div className="flex border-b flex-shrink-0" style={{ borderColor: C.border }}>
            {([
              { key: 'chat' as Aba, label: 'Chat' },
              { key: 'preview' as Aba, label: etapa === 'gerando' ? 'Gerando...' : temArte ? 'Preview' : 'Configurar' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setAbaAtiva(key)}
                className="flex-1 py-2.5 text-sm font-medium border-b-2 transition"
                style={{ borderColor: abaAtiva === key ? C.accent : 'transparent', color: abaAtiva === key ? C.accent : C.textMuted }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Corpo — duas colunas */}
        <div className="flex overflow-hidden" style={{ height: 560 }}>
          {/* Coluna esquerda — chat */}
          <div
            className={`flex-1 overflow-hidden border-r ${isMobile && abaAtiva !== 'chat' ? 'hidden' : ''}`}
            style={{ borderColor: C.border }}>
            <ChatMidia
              C={C}
              companyId={companyId}
              company={company}
              formato={formato}
              logoPosition={logoPosition}
              onArteGerada={handleArteGerada}
              playText={effectivePlayText}
            />
          </div>

          {/* Coluna direita — preview/config */}
          <div
            className={`overflow-hidden flex flex-col ${isMobile ? 'flex-1' : 'w-[380px]'} ${isMobile && abaAtiva !== 'preview' ? 'hidden' : ''}`}
            style={{ backgroundColor: C.bg }}>
            <PainelDireito
              C={C}
              etapa={etapa}
              arte={arte}
              company={company}
              formato={formato}
              setFormato={setFormato}
              logoPosition={logoPosition}
              setLogoPosition={setLogoPosition}
              caption={caption}
              setCaption={setCaption}
              hashtags={hashtags}
              copiado={copiado}
              onCopiarCaption={handleCopiarCaption}
              onBaixar={handleBaixar}
              onPublicarFacebook={handlePublicarFacebook}
              temConexaoFacebook={temConexaoFacebook}
              publicando={publicando}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
