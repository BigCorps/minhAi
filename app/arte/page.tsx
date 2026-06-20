'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, LogOut, Sparkles, X, ChevronRight,
  Layers, Image as ImageIcon, Images, Copy, Scissors,
  Wand2, Grid3x3, QrCode, Barcode, Receipt, RefreshCw, Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import ArteFinalDisplay from '@/components/arte/ArteFinalDisplay';
import DuplicarImagemDisplay from '@/components/arte/DuplicarImagemDisplay';
import AdesivoContornoDisplay from '@/components/arte/AdesivoContornoDisplay';
import VetorizarImagemDisplay from '@/components/arte/VetorizarImagemDisplay';
import FolhaRecorteDisplay from '@/components/arte/FolhaRecorteDisplay';
import QRCodeDisplay from '@/components/arte/QRCodeDisplay';
import CodigoBarrasDisplay from '@/components/arte/CodigoBarrasDisplay';
import OrcamentoPdfDisplay from '@/components/arte/OrcamentoPdfDisplay';
import FotoDocumentoDisplay from '@/components/arte/FotoDocumentoDisplay';
import PolaroidDisplay from '@/components/arte/PolaroidDisplay';
import EditarImagemDisplay from '@/components/arte/EditarImagemDisplay';
import ConversorArquivoDisplay from '@/components/arte/ConversorArquivoDisplay';

// ── Paleta CMYK (baseada no logo ArteFinal) ──────────────────────────────
const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const BRAND_GRADIENT = `linear-gradient(135deg, ${CMYK.cyan} 0%, ${CMYK.magenta} 55%, ${CMYK.yellow} 100%)`;
const LOGIN_URL = '/arte/login';

// ── Registry local do ArteFinal ──────────────────────────────────────────
interface Skill { key: string; label: string; color: string; desc: string; credits: number; triggers: string[]; modal: string }

const SKILLS: Skill[] = [
  {
    key: 'arte_final',
    label: 'Margem e Sangria',
    color: CMYK.cyan,
    desc: 'PDF pronto pra gráfica (medida + sangria)',
    credits: 5,
    triggers: ['arte final', 'arquivo pra grafica', 'arquivo para grafica', 'sangria', 'corte', 'cartões', 'folhetos', 'fechar arquivo', 'gerar pdf', 'pdf de producao'],
    modal: 'ArteFinalDisplay',
  },
{
  key:      'foto_documento',
  label:    'Foto para Documento',
  color: CMYK.cyan,
  desc:     'Gera fotos 2x2, 3x4 ou 5x7 em PDF com remoção de fundo automática',
  credits:  0,   // gratuito
  triggers: [
    'foto documento', 'foto para documento', 'foto 3x4', '3x4', 'foto 2x2', '2x2',
    'foto 5x7', '5x7', 'foto passaporte', 'remover fundo foto', 'foto identidade',
    'foto cnh', 'foto rg', 'foto carteira', 'fotos documento',
  ],
  modal: 'foto_documento',
},
{
  key:      'polaroid',
  label:    'Polaroids para A4',
  color: CMYK.cyan,
  desc:     'Monta grid de polaroids (Padrão ou Mini) em PDF pronto para imprimir e cortar',
  credits:  0,   // gratuito
  triggers: [
    'polaroid', 'polaroids', 'foto polaroid', 'montagem de fotos',
    'grid de fotos', 'colagem de fotos', 'mural de fotos', 'fotos a4',
  ],
  modal: 'polaroid',
},
  {
    key: 'duplicar_imagem',
    label: 'Duplicar Imagem',
    color: CMYK.cyan,
    desc: 'Grid de cópias da imagem em PDF A4 para impressão',
    credits: 2,
    triggers: ['duplicar', 'duplicar imagem', 'copiar imagem', 'grid de imagem', 'multiplas copias', 'varias copias', 'repetir imagem', 'imagem em grade'],
    modal: 'DuplicarImagemDisplay',
  },
  {
    key: 'adesivo_contorno',
    label: 'Adesivo com Recorte',
    color: CMYK.cyan,
    desc: 'PDF com arte + linha de corte (die-cut)',
    credits: 5,
    triggers: ['adesivo', 'sticker', 'recorte', 'corte de contorno', 'die cut', 'die-cut'],
    modal: 'AdesivoContornoDisplay',
  },
  {
    key: 'vetorizar_imagem',
    label: 'Vetorizar em SVG/PDF',
    color: CMYK.cyan, // mesma cor de todas as skills, conforme o próprio comentário do componente
    desc: 'Transforma imagem em SVG (silhueta ou contorno)',
    credits: 1,
    triggers: ['vetorizar', 'vetorizar imagem', 'vetor', 'svg', 'transformar em vetor', 'contorno vetorial', 'silhueta'],
    modal: 'VetorizarImagemDisplay',
  },
{
  key: 'folha_recorte',
  label: 'Folha de Recorte',
  color: CMYK.cyan,
  desc: 'Várias cópias com arte + corte em uma folha (A4 ou personalizada)',
  credits: 10,
  triggers: ['folha de recorte', 'folha recorte', 'grade de adesivo', 'grade de corte', 'varios adesivos', 'varias pecas', 'multiplos adesivos', 'repetir adesivo', 'repetir corte', 'folha completa de adesivo'],
  modal: 'FolhaRecorteDisplay',
},
{
  key:      'gerar_qr_code',
  label:    'Gerar QR Code',
  color:     CMYK.cyan,  
  desc:     'Gera QR Code com cor, tamanho e logo personalizados',
  credits:  1,                  // utilitário gratuito; ajuste se quiser cobrar
  triggers: [
    'qr', 'qr code', 'qrcode', 'gerar qr', 'criar qr',
    'link qr', 'código qr', 'código de barras 2d',
  ],
  modal: 'gerar_qr_code',
},
{
  key:      'codigo_barras',
  label:    'Código de Barras',
  color:     CMYK.cyan,  
  desc:     'Gera código de barras Code 128, EAN-13 ou Code 39',
  credits:  1,
  triggers: [
    'codigo de barras', 'código de barras', 'barcode', 'ean', 'ean13', 'ean-13',
    'code 128', 'code128', 'code 39', 'code39', 'gerar codigo', 'gerar código',
  ],
  modal: 'codigo_barras',
},
{
  key:      'orcamento_pdf',
  label:    'Orçamento em PDF',
  color:     CMYK.cyan,  
  desc:     'Cria orçamento profissional em PDF com logo, itens e totais',
  credits:  2,
  triggers: [
    'orcamento', 'orçamento', 'gerar orcamento', 'gerar orçamento',
    'proposta', 'proposta comercial', 'pdf orcamento', 'cotacao', 'cotação',
    'nota de servico', 'nota de serviço', 'precificacao', 'precificação',
  ],
  modal: 'orcamento_pdf',
},
  {
    key: 'converter_arquivo',
    label: 'Converter Arquivos',
    color: CMYK.cyan,
    desc: 'Converte imagem/PDF entre JPG, PNG, WebP e PDF',
    credits: 0,
    triggers: [
      'converter arquivo', 'converter imagem', 'mudar formato',
      'converter pdf', 'transformar em pdf', 'transformar em imagem',
      'jpg para pdf', 'pdf para jpg', 'png para jpg',
    ],
    modal: 'ConversorArquivoDisplay',
  },
  {
    key: 'editar_imagem',
    label: 'Editar Imagem',
    color: CMYK.cyan,
    desc: 'Cortar, rotacionar e ajustar brilho/contraste/saturação',
    credits: 1,
    triggers: [
      'editar imagem', 'editar foto', 'cortar imagem', 'cortar foto',
      'recortar imagem', 'recortar foto', 'rotacionar imagem',
      'ajustar imagem', 'brilho e contraste', 'girar imagem', 'crop',
    ],
    modal: 'EditarImagemDisplay',
  },
];

// ── Ícones por skill, usados na sidebar ───────────────────────────────────
const SKILL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  arte_final: Layers,
  foto_documento: ImageIcon,
  polaroid: Images,
  duplicar_imagem: Copy,
  adesivo_contorno: Scissors,
  vetorizar_imagem: Wand2,
  folha_recorte: Grid3x3,
  gerar_qr_code: QrCode,
  codigo_barras: Barcode,
  orcamento_pdf: Receipt,
  converter_arquivo: RefreshCw,
  editar_imagem: Pencil,
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
function detectSkill(text: string): Skill | null {
  const t = norm(text);
  let best: Skill | null = null, bestLen = 0;
  for (const sk of SKILLS) for (const trig of sk.triggers) if (t.includes(trig) && trig.length > bestLen) { best = sk; bestLen = trig.length; }
  return best;
}

// ── Carrossel infinito de habilidades ─────────────────────────────────────
// Mesma técnica do CategoryCarousel do assistente: duplica a lista N vezes e
// anima um translateX contínuo até -(1/N)*100%, criando um loop sem costura
// (a Nª cópia termina exatamente onde a 1ª cópia começou). Pausa em
// hover/touch — sem isso o usuário não consegue ler nem clicar com calma.
const CAROUSEL_MIN_COPIES = 8;
function calcScrollDuration(count: number, isMobile: boolean): number {
  const perItem = isMobile ? 3.5 : 2.5;
  return Math.max(8, Math.min(60, count * perItem));
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string }
type ActiveModal = { type: string; data: { companyId: string } } | null;

export default function ArtePage() {
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const playText = useCallback(async (_text: string) => {}, []);

  const refreshSaldo = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_credits').select('available_credits').eq('user_id', userId).maybeSingle();
    setSaldo(data?.available_credits ?? 0);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setHasUser(false); setReady(true); return; }
      setHasUser(true);
      const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      setCompanyId(company?.id ?? null);
      await refreshSaldo(user.id);
      setReady(true);
    })();
  }, [supabase, refreshSaldo]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // detecta mobile pra ajustar a velocidade do carrossel (igual ao CategoryCarousel)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Esc fecha a sidebar + trava o scroll do body enquanto ela está aberta
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Abre o modal mesmo sem login — o preview é livre; o gate de login fica no "Liberar".
  const openSkill = useCallback((sk: Skill) => {
    setSidebarOpen(false);
    setActiveModal({ type: sk.modal, data: { companyId: companyId ?? '' } });
  }, [companyId]);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    const sk = detectSkill(text);
    if (sk) {
      openSkill(sk);
    } else {
      const disponiveis = SKILLS.map((s) => s.label).join(', ');
      setMessages((p) => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `Essa ferramenta ainda não está disponível. Por enquanto eu faço: ${disponiveis}. Toque na habilidade abaixo para começar.` }]);
    }
  }, [input, openSkill]);

  const closeModal = useCallback(async () => {
    setActiveModal(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshSaldo(session.user.id);
  }, [supabase, refreshSaldo]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ── Mecânica do scroll infinito (igual ao CategoryCarousel) ─────────────
  const scrollDuration = calcScrollDuration(SKILLS.length, isMobile);
  const copies = CAROUSEL_MIN_COPIES;
  const duplicatedSkills = Array.from({ length: copies }, () => SKILLS).flat();
  const resetPercent = (1 / copies) * 100; // ex.: 1/8 = 12.5% — onde a animação reinicia sem costura

  const pauseCarousel = useCallback(() => {
    if (carouselRef.current) carouselRef.current.style.animationPlayState = 'paused';
  }, []);
  const resumeCarousel = useCallback(() => {
    if (carouselRef.current) carouselRef.current.style.animationPlayState = 'running';
  }, []);
  // stopPropagation evita que um swipe global da página capture o gesto do carrossel
  const onTouchStartCarousel = useCallback((e: React.TouchEvent) => { e.stopPropagation(); pauseCarousel(); }, [pauseCarousel]);
  const onTouchEndCarousel = useCallback((e: React.TouchEvent) => { e.stopPropagation(); resumeCarousel(); }, [resumeCarousel]);
  const onTouchCancelCarousel = useCallback((e: React.TouchEvent) => { e.stopPropagation(); resumeCarousel(); }, [resumeCarousel]);

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))' }}>
      {/* Header */}
      <header className="flex justify-center px-4 sm:px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between w-full max-w-2xl">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              aria-label="Abrir menu de funções"
            >
              <img src="/arte/arte.png" alt="ArteFinal" className="w-full h-full object-cover" />
            </button>
            <div>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>ArteFinal</p>
              <p className="text-[11px]" style={{ color: '#64748b' }}>Seu arte-finalista com IA.</p>
            </div>
          </div>
          {hasUser ? (
            <div className="flex items-center gap-2">
              <a
                href="/arte/perfil"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-75 active:scale-95"
                style={{ background: 'rgba(0,174,239,0.1)', color: CMYK.cyan }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {saldo ?? '—'} créditos
              </a>
              <button onClick={handleLogout} className="flex items-center justify-center p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95" title="Sair da conta">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a href={LOGIN_URL} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: `linear-gradient(135deg, ${CMYK.cyan} 0%, ${CMYK.magenta} 100%)` }}>
              <Sparkles className="w-3.5 h-3.5" />
              Entrar
            </a>
          )}
        </div>
      </header>

      {/* Conteúdo / mensagens */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Carregando…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 max-w-md mx-auto">
            <div className="w-24 h-24 overflow-hidden mb-1">
              <img src="/arte/arte.png" alt="ArteFinal.app" className="w-full h-full object-cover" />
            </div>
            <p className="af-empty-title text-base font-semibold">O que você precisa preparar?</p>
            <p className="af-empty-desc text-sm">
              Envie sua arte e veja o preview na hora: medida exata, CMYK, margem, sangria e corte prontos para sua gráfica.
              Clique em uma função abaixo ou digite o que precisa.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
                  style={m.role === 'user' ? { background: BRAND_GRADIENT, color: '#fff' } : { background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <style>{`
        .af-empty-title { color: #0f172a !important; }
        .af-empty-desc { color: #64748b !important; }
      `}</style>

      {/* Carrossel de habilidades — scroll infinito, pausa em hover/touch */}
      {ready && (
        <div className="flex-shrink-0 px-3 sm:px-6 pt-2 border-t overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div
            className="w-full overflow-x-auto md:overflow-hidden"
            style={{ scrollbarWidth: 'none' }}
            onMouseEnter={pauseCarousel}
            onMouseLeave={resumeCarousel}
            onTouchStart={onTouchStartCarousel}
            onTouchEnd={onTouchEndCarousel}
            onTouchCancel={onTouchCancelCarousel}
          >
            <div
              ref={carouselRef}
              className="flex gap-2 pb-2 w-max"
              style={{
                animation: `af-skills-scroll ${scrollDuration}s linear infinite`,
                animationPlayState: 'running',
                willChange: 'transform',
              }}
            >
              {duplicatedSkills.map((sk, i) => (
                <button
                  key={`${sk.key}-${i}`}
                  onClick={() => openSkill(sk)}
                  className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 text-white shadow-sm"
                  style={{ background: sk.color }}
                >
                  {sk.label}
                  {hasUser && (
                    <span className="block text-[10px] font-normal mt-0.5 text-white/70">
                      {sk.credits === 0 ? 'Grátis' : `${sk.credits} ${sk.credits === 1 ? 'crédito' : 'créditos'}`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input (livre, inclusive anônimo) */}
      {ready && (
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2 max-w-2xl mx-auto" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ex: cartões e folhetos, converter, corte…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#1e293b' }}
            />
            <button onClick={handleSubmit} disabled={!input.trim()} className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95" style={{ background: BRAND_GRADIENT }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: '#94a3b8' }}>
            Powered by{' '}
            <a href="https://minhai.app" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: CMYK.cyan, fontWeight: 600 }}>minhAi.app</a>
          </p>
        </div>
      )}

      {/* Sidebar de funções */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!sidebarOpen}
      >
        <div onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        <aside
          className={`absolute top-0 left-0 h-full w-[85vw] max-w-sm sm:w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                <img src="/arte/arte.png" alt="ArteFinal" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Funções</p>
                <p className="text-[11px]" style={{ color: '#64748b' }}>Toque para abrir</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors active:scale-95"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {SKILLS.map((sk) => {
              const Icon = SKILL_ICONS[sk.key] ?? Sparkles;
              return (
                <button
                  key={sk.key}
                  onClick={() => openSkill(sk)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-slate-50 active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${sk.color}1A` }}>
                    <Icon className="w-5 h-5" style={{ color: sk.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{sk.label}</p>
                    <p className="text-xs truncate" style={{ color: '#64748b' }}>{sk.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: `${sk.color}1A`, color: sk.color }}>
                      {sk.credits === 0 ? 'Grátis' : `${sk.credits} cr.`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <p className="text-center text-[10px]" style={{ color: '#94a3b8' }}>
              Powered by{' '}
              <a href="https://minhai.app" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: CMYK.cyan, fontWeight: 600 }}>minhAi.app</a>
            </p>
          </div>
        </aside>
      </div>

      {/* Modais */}
      {activeModal?.type === 'ArteFinalDisplay' && (
        <ArteFinalDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
      {activeModal?.type === 'DuplicarImagemDisplay' && (
        <DuplicarImagemDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
      {activeModal?.type === 'AdesivoContornoDisplay' && (
        <AdesivoContornoDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
      {activeModal?.type === 'VetorizarImagemDisplay' && (
        <VetorizarImagemDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
{activeModal?.type === 'FolhaRecorteDisplay' && (
  <FolhaRecorteDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
    onRequireLogin={() => { window.location.href = LOGIN_URL; }}
  />
)}
{activeModal?.type === 'gerar_qr_code' && (
  <QRCodeDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
    onRequireLogin={() => { window.location.href = LOGIN_URL; }}
  />
)}
{activeModal?.type === 'codigo_barras' && (
  <CodigoBarrasDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
    onRequireLogin={() => { window.location.href = LOGIN_URL; }}
  />
)}
{activeModal?.type === 'orcamento_pdf' && (
  <OrcamentoPdfDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
    onRequireLogin={() => { window.location.href = LOGIN_URL; }}
  />
)}
{activeModal?.type === 'foto_documento' && (
  <FotoDocumentoDisplay
    onClose={closeModal}
    theme="light"
    playText={playText}
  />
)}
{activeModal?.type === 'polaroid' && (
  <PolaroidDisplay
    onClose={closeModal}
    theme="light"
    playText={playText}
  />
)}
{activeModal?.type === 'ConversorArquivoDisplay' && (
  <ConversorArquivoDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
  />
)}
{activeModal?.type === 'EditarImagemDisplay' && (
  <EditarImagemDisplay
    data={activeModal.data}
    onClose={closeModal}
    theme="light"
    playText={playText}
    onRequireLogin={() => { window.location.href = LOGIN_URL; }}
  />
)}
      
      <style jsx>{`
        @keyframes af-skills-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${resetPercent}%); }
        }
      `}</style>
    </div>
  );
}