'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, ChevronDown, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAssistant } from '@/contexts/AssistantContext';
import { createClient } from '@/lib/supabase-browser';
import { ActionModals } from '@/components/VoiceAssistant/ActionModals';
import { AssistantSelectorHeader } from '@/components/layout/AssistantSelectorHeader';

// ============================================================================
// Função do catálogo (assistant_functions) — só os campos que usamos aqui
// ============================================================================
interface AssistantFunction {
  function_key: string;
  function_name: string;
  function_category: string | null;
  icon: string | null;
  color: string | null;
  ui_component: string | null;
  example_phrases: string[] | null;
}

// ============================================================================
// Funções que navegam pra fora do widget (catálogo completo, fila, link na bio)
// — espelha WIDGET_NAVIGATION_BLOCKED do VoiceAssistantWithWakeWord.tsx
// ============================================================================
const WIDGET_NAVIGATION_BLOCKED = new Set(['modo_venda', 'modo_fila', 'link_na_bio']);

// ============================================================================
// Mapa de funções confirmadas como seguras pra abrir modal só com { companyId }.
// Copiado literalmente do `modalOnlyFunctions` em handleFunctionClickSilent
// (VoiceAssistantWithWakeWord.tsx) — removendo as que já estão em
// WIDGET_BLOCKED_FUNCTIONS do ActionModals (câmera/mic/localização/mídia),
// já que essas são bloqueadas automaticamente pelo widgetMode de qualquer forma.
//
// IMPORTANTE: se o mapa `modalOnlyFunctions` mudar no VoiceAssistant, este
// aqui não atualiza sozinho — é uma cópia, não uma referência compartilhada.
// Vale extrair pra um arquivo único (ex: lib/assistant/modalOnlyFunctions.ts)
// numa próxima passada, mas não tocamos no VoiceAssistant agora.
//
// Tudo que NÃO está aqui (PIX/NFC/TEF, QR de contato, vendas/caixa, e o que
// mais estiver só no functions-registry.ts que não vimos) cai no fallback de
// texto — mais seguro que abrir um modal que pode esperar dados que não temos.
// ============================================================================
const WIDGET_SAFE_MODALS: Record<string, { type: string; extraData?: Record<string, any> }> = {
  meu_sistema:                    { type: 'MeuSistemaDisplay' },
  consultar_cambio:               { type: 'CotacaoMoedasDisplay' },
  consultar_cep:                  { type: 'ConsultarCEPDisplay' },
  dados_cnpj:                     { type: 'ConsultarCnpjModal' },
  dados_cpf:                      { type: 'ConsultarCpfModal' },
  restricoes_cpf:                 { type: 'RestricoesCPFDisplay' },
  restricoes_cnpj:                { type: 'RestricoesCNPJDisplay' },
  consultar_feriados:             { type: 'FeriadosNacionaisDisplay' },
  consultar_ddd:                  { type: 'ConsultarDDDDisplay' },
  consultar_placa:                { type: 'ConsultarPlacaModal' },
  consultar_protestos:            { type: 'ConsultarProtestosModal' },
  enviar_arquivo:                 { type: 'EnviarArquivoDisplay' },
  gerar_qrcode:                   { type: 'GerarQRCodeDisplay' },
  gerar_codigo_barras:            { type: 'GerarCodigoBarrasDisplay' },
  confirmar_presenca:             { type: 'ConfirmPresenceModal' },
  reagendar_compromisso:          { type: 'RescheduleModal' },
  cancelar_agendamento:           { type: 'CancelAppointmentModal' },
  meu_cupom:                      { type: 'MeuCupomDisplay', extraData: { prefillName: '' } },
  traduzir_texto:                 { type: 'TranslateTextModal' },
  ver_noticias:                   { type: 'VerNoticiasDisplay' },
  procurar_produto:               { type: 'ProcurarProdutoDisplay' },
  segunda_via_boleto:             { type: 'SegundaViaBoletoDisplay' },
  cadastrar_produto:              { type: 'CadastrarProdutoDisplay' },
  enviar_email:                   { type: 'SendEmailModal' },
  agendar_compromisso:            { type: 'CreateEventModal', extraData: { prefilledData: {} } },
  ver_agenda:                     { type: 'ViewAgendaModal', extraData: { initialView: 'month' } },
  relogio_mundial:                { type: 'RelogioMundialDisplay' },
  rastreio_correios:              { type: 'RastreioCorreiosDisplay' },
  fichas_producao_conversacional: { type: 'FichaProducaoConversacionalDisplay', extraData: { fichaType: 'produto' } },
  criar_nota:                     { type: 'CriarNotaDisplay' },
  lembrete_remedios:              { type: 'LembreteRemediosDisplay' },
  converter_arquivo:              { type: 'ConverterArquivoDisplay' },
  editar_imagem:                  { type: 'EditarImagemDisplay' },
  remover_fundo:                  { type: 'RemoverFundoDisplay' },
  duplicar_imagem:                { type: 'DuplicarImagemDisplay' },
  lista_compras:                  { type: 'ListaComprasDisplay' },
  orcamento:                      { type: 'OrcamentoDisplay', extraData: { transcriptInicial: '' } },
  analisar_planilha:              { type: 'AnalisarPlanilhaDisplay' },
  texto_em_audio:                 { type: 'TextoEmAudioDisplay' },
  transcrever_video:              { type: 'TranscreverVideoDisplay' },
  criar_midia:                    { type: 'CriarMidiaDisplay' },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  label?: string;
  timestamp: Date;
}

type ActiveModalState = { type: string; data: any } | null;

// ── Categorias do carrossel — mesmo mapa do CategoryCarousel.tsx ──────────
const CAROUSEL_CATEGORIES = [
  { key: 'ai_assistant', name: 'Conhecimento' },
  { key: 'products', name: 'Comercial' },
  { key: 'payment', name: 'Financeiro' },
  { key: 'information', name: 'Informação' },
  { key: 'video', name: 'Multimídia' },
  { key: 'schedule', name: 'Agendamento' },
  { key: 'contact', name: 'Contato' },
  { key: 'configuration', name: 'Localização' },
  { key: 'knowledge', name: 'Consultas' },
  { key: 'biometry', name: 'Identificação' },
  { key: 'images', name: 'Arquivos' },
  { key: 'utylities', name: 'Utilitários' },
  { key: 'codes', name: 'Câmera' },
  { key: 'services', name: 'Serviços' },
];
const getChipColor = (index: number) => (index % 2 === 0 ? '#3B82F6' : '#10B981');

// ── Carrossel contínuo por categoria — mesmo padrão visual do assistente ──
function FunctionCarousel({
  items,
  onSelect,
  isDark,
}: {
  items: AssistantFunction[];
  onSelect: (fn: AssistantFunction) => void;
  isDark: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [chipRect, setChipRect] = useState<DOMRect | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setIsModalOpen(true);
    const onClose = () => setIsModalOpen(false);
    window.addEventListener('eai:modalOpen', onOpen);
    window.addEventListener('eai:modalClose', onClose);
    return () => {
      window.removeEventListener('eai:modalOpen', onOpen);
      window.removeEventListener('eai:modalClose', onClose);
    };
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      const outsidePanel = panelRef.current && !panelRef.current.contains(t);
      const outsideTrack  = trackRef.current && !trackRef.current.contains(t);
      if (outsidePanel && outsideTrack) { setActiveCategory(null); setChipRect(null); }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [activeCategory]);

  const categories = CAROUSEL_CATEGORIES
    .map(cat => ({ ...cat, functions: items.filter(fn => fn.function_category === cat.key) }))
    .filter(cat => cat.functions.length > 0);

  const COPIES = 8;
  const duplicated = Array.from({ length: COPIES }, () => categories).flat();

  const pause  = useCallback(() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }, []);
  const resume = useCallback(() => { if (trackRef.current && !activeCategory) trackRef.current.style.animationPlayState = 'running'; }, [activeCategory]);

  function getPanelPosition(): React.CSSProperties {
    if (!chipRect) return {};
    const panelWidth = 280;
    let left = chipRect.left + chipRect.width / 2 - panelWidth / 2;
    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) left = window.innerWidth - panelWidth - 10;
    return { position: 'fixed', left: `${left}px`, bottom: `${window.innerHeight - chipRect.top + 8}px` };
  }

  if (categories.length === 0) return null;

  return (
    <div className={`relative w-full transition-all duration-500 ${isModalOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
      {activeCategory && createPortal(
        <div ref={panelRef} className="z-[10000]" style={getPanelPosition()}>
          <div
            className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
            style={{
              width: 280, maxHeight: 350,
              background: isDark ? 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))' : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
              borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
            }}
          >
            <div className="px-3 py-1.5 font-semibold border-b text-xs" style={{ borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)', color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)' }}>
              {CAROUSEL_CATEGORIES.find(c => c.key === activeCategory)?.name}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 310 }}>
              {categories.find(c => c.key === activeCategory)?.functions.map(fn => (
                <div
                  key={fn.function_key}
                  className="px-3 py-1.5 cursor-pointer transition-all border-b border-white/5 hover:bg-blue-500/10"
                  style={{ background: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,0.8)', color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)' }}
                  onClick={() => { onSelect(fn); setActiveCategory(null); setChipRect(null); }}
                >
                  <span className="font-medium text-[11px] leading-tight block">{fn.function_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full overflow-hidden py-2" onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={resume} onTouchCancel={resume}>
        <div
          ref={trackRef}
          className="flex gap-2 w-max"
          style={{ animation: `mcp-scroll ${categories.length * 2.2}s linear infinite`, animationPlayState: activeCategory ? 'paused' : 'running', willChange: 'transform' }}
        >
          {duplicated.map((cat, idx) => (
            <button
              key={`${cat.key}-${idx}`}
              onClick={(e) => {
                if (activeCategory === cat.key) { setActiveCategory(null); setChipRect(null); }
                else { setActiveCategory(cat.key); setChipRect(e.currentTarget.getBoundingClientRect()); }
              }}
              className={`flex-shrink-0 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm'}`}
              style={{ borderLeft: `3px solid ${getChipColor(idx)}` }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes mcp-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-${(100 / COPIES).toFixed(4)}%); } }
        .mcp-messages::-webkit-scrollbar { width: 4px; }
        .mcp-messages::-webkit-scrollbar-track { background: transparent; }
        .mcp-messages::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        .mcp-messages:hover::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); }
      `}</style>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function DashboardMcpWidget() {
  const [isOpen,   setIsOpen]   = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const [allFunctions,    setAllFunctions]    = useState<AssistantFunction[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModalState>(null);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = useRef(createClient()).current;

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { selectedAssistantId, availableAssistants } = useAssistant();
  const currentAssistant = availableAssistants.find(a => a.id === selectedAssistantId);

  // playText no-op — o widget do dashboard não tem TTS, mas os modais esperam a prop
  const playText = useCallback(async (_text: string) => {}, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Carrega TODAS as funções do catálogo, sem filtrar por habilitada ─────
  // (bypass intencional — este é o painel do dono, não o assistente do cliente final)
  useEffect(() => {
    setLoadingFunctions(true);
    supabase
      .from('assistant_functions')
      .select('function_key, function_name, function_category, icon, color, ui_component, example_phrases')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setAllFunctions(data ?? []);
        setLoadingFunctions(false);
      });
  }, [supabase]);

  // ── Envio de texto livre para o fluxo conversacional existente ──────────
  const send = useCallback(async (text: string, label?: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg, label, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await fetch('/api/dashboard/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, assistantId: selectedAssistantId ?? null, assistantName: currentAssistant?.name ?? null }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.reply ?? 'Sem resposta.', timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Erro de conexão. Tente novamente.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, selectedAssistantId, currentAssistant]);

  // ── Clique num card de função ────────────────────────────────────────────
  const handleFunctionSelect = useCallback((fn: AssistantFunction) => {
    if (!selectedAssistantId) return;

    // 1) Navega pra fora do widget — mostra o aviso padrão do ActionModals
    if (WIDGET_NAVIGATION_BLOCKED.has(fn.function_key)) {
      setActiveModal({ type: '__widget_blocked_navigation__', data: {} });
      return;
    }

    // 2) Confirmado como seguro — abre o modal de verdade, igual a página de funções
    const safe = WIDGET_SAFE_MODALS[fn.function_key];
    if (safe) {
      setActiveModal({
        type: safe.type,
        data: { companyId: selectedAssistantId, slug: currentAssistant?.slug, ...(safe.extraData ?? {}) },
      });
      return;
    }

    // 3) Não confirmado (PIX/NFC/TEF, QR de contato, vendas/caixa, etc.) —
    // preenche o texto com o exemplo do catálogo e deixa o usuário completar/enviar
    const starter = fn.example_phrases?.[0] ?? fn.function_name;
    setInput(starter + (starter.endsWith(' ') ? '' : ' '));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectedAssistantId, currentAssistant]);

  // ── Submit do campo de texto livre ───────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const txt = input.trim();
    if (!txt) return;
    send(txt);
  }, [input, send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  if (!mounted) return null;

  // ── Botão flutuante ─────────────────────────────────────────────────────
  const button = (
    <button
      onClick={() => setIsOpen(o => !o)}
      className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-[9998] flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
      style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
    >
      <Sparkles className="w-4 h-4" />
      <span>min.IA</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  // ── Painel de chat ──────────────────────────────────────────────────────
  const panel = isOpen && (
    <div
      className="fixed bottom-20 right-3 sm:right-6 z-[9997] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: 'min(420px, calc(100vw - 24px))',
        height: 'min(640px, calc(100dvh - 120px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 120px)',
        background: isDark ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))' : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Assistente minhAi</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mesma lógica do seletor do header do dashboard — ícone no mobile, seletor completo no desktop */}
          <AssistantSelectorHeader />
          <button onClick={() => setIsOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="mcp-messages flex-1 overflow-x-hidden px-4 py-2 space-y-3 min-h-0" style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Como posso te ajudar hoje?<br />
              <span className="text-xs opacity-70">Toque numa função abaixo ou digite um comando</span>
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
              style={{
                wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', minWidth: 0,
                ...(msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #3B82F6, #10B981)', color: '#fff' }
                  : { background: isDark ? 'rgba(51,65,85,0.8)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#1e293b' }),
              }}
            >
              {msg.role === 'user' && msg.label ? (
                <>
                  <span className="font-bold">{msg.label}</span>
                  <span className="block text-[11px] mt-0.5 opacity-75">{msg.content}</span>
                </>
              ) : msg.content}
              <div className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-white/60' : isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 shadow" style={{ background: isDark ? 'rgba(51,65,85,0.8)' : 'rgba(255,255,255,0.9)' }}>
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-2 sm:px-3 py-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite... Ex: ver agenda, traduzir texto, cep 01310100"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm"
            style={{ color: isDark ? '#e2e8f0' : '#1e293b', maxHeight: '80px', overflowY: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>

      {/* Carrossel — alimentado pelo catálogo real (todas as funções, sem filtro de habilitada) */}
      <div className="flex-shrink-0 px-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        {loadingFunctions ? (
          <div className="py-3 flex justify-center">
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
          </div>
        ) : (
          <FunctionCarousel items={allFunctions} onSelect={handleFunctionSelect} isDark={isDark} />
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {button}
      {panel}
      <ActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        theme={isDark ? 'dark' : 'light'}
        playText={playText}
        widgetMode
        slug={currentAssistant?.slug}
      />
    </>,
    document.body
  );
}
