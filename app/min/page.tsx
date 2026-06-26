'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Send, LogOut, Loader2, Sparkles, CreditCard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AssistantProvider, useAssistant } from '@/contexts/AssistantContext';
import { AssistantSelectorHeader } from '@/components/layout/AssistantSelectorHeader';
import { ActionModals } from '@/components/VoiceAssistant/ActionModals';
import { FUNCTIONS_REGISTRY } from '@/lib/functions-registry';

const LOGIN_URL = '/min/login';

interface AssistantFunction {
  function_key: string;
  function_name: string;
  function_category: string | null;
  icon: string | null;
  color: string | null;
  ui_component: string | null;
  example_phrases: string[] | null;
}

// Só estas 3 continuam pelo fluxo de texto/MCP — todo o resto abre modal real
// via FUNCTIONS_REGISTRY.
const LEGACY_MCP_KEYS = new Set(['pix_generate', 'faq', 'chatgpt']);

// Modo Venda, Modo Fila e Link na Bio navegam pra páginas do assistente do
// cliente final (catálogo, painel de fila, link na bio) — o Min.IA não tem
// acesso a essas páginas aqui, então força o bloqueio do próprio handler em
// vez de deixar o `window.location.href` levar pra um lugar sem sentido.
const ALWAYS_BLOCKED_NAV = new Set(['modo_venda', 'modo_fila', 'link_na_bio']);

interface Msg {
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

// ── Carrossel contínuo por categoria ─────────────────────────────────────
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);
  const trackRef  = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

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
      if (outsidePanel && outsideTrack) { setActiveCategory(null); activeBtnRef.current = null; }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [activeCategory]);

  const categories = CAROUSEL_CATEGORIES
    .map(cat => ({ ...cat, functions: items.filter(fn => fn.function_category === cat.key) }))
    .filter(cat => cat.functions.length > 0);

  const COPIES = 8;
  const duplicated = Array.from({ length: COPIES }, () => categories).flat();

  const pauseAnim  = useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
  }, []);
  const resumeAnim = useCallback(() => {
    if (trackRef.current && !activeCategory) trackRef.current.style.animationPlayState = 'running';
  }, [activeCategory]);

  function getPanelStyle(): React.CSSProperties {
    const btn = activeBtnRef.current;
    if (!btn) return { display: 'none' };
    const rect = btn.getBoundingClientRect();
    const panelWidth = 280;
    let left = rect.left + rect.width / 2 - panelWidth / 2;
    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) left = window.innerWidth - panelWidth - 10;
    return {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${window.innerHeight - rect.top + 6}px`,
      width: panelWidth,
      zIndex: 10000,
    };
  }

  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    baseOffset: number;
    loopWidth: number;
    currentOffset: number;
  }>({ dragging: false, startX: 0, baseOffset: 0, loopWidth: 0, currentOffset: 0 });

  function getCurrentTranslateX(): number {
    if (!trackRef.current) return 0;
    const style = window.getComputedStyle(trackRef.current);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return matrix.m41;
  }

  function normalizeOffset(offset: number, loopWidth: number): number {
    if (loopWidth <= 0) return offset;
    let o = offset % loopWidth;
    if (o > 0) o -= loopWidth;
    return o;
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!trackRef.current) return;
    pauseAnim();
    const loopWidth = trackRef.current.scrollWidth / COPIES;
    const baseOffset = getCurrentTranslateX();
    trackRef.current.style.animation = 'none';
    trackRef.current.style.transform = `translateX(${baseOffset}px)`;
    dragState.current = {
      dragging: true,
      startX: e.touches[0].clientX,
      baseOffset: normalizeOffset(baseOffset, loopWidth),
      loopWidth,
      currentOffset: baseOffset,
    };
  }, [pauseAnim]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    if (!ds.dragging || !trackRef.current) return;
    const delta = e.touches[0].clientX - ds.startX;
    const newOffset = normalizeOffset(ds.baseOffset + delta, ds.loopWidth);
    ds.currentOffset = newOffset;
    trackRef.current.style.transform = `translateX(${newOffset}px)`;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const ds = dragState.current;
    if (!ds.dragging || !trackRef.current) return;
    ds.dragging = false;
    const totalDuration = categories.length * 2.2;
    const loopPct = ds.loopWidth > 0 ? Math.abs(ds.currentOffset) / ds.loopWidth : 0;
    const delay = -(loopPct * totalDuration);
    trackRef.current.style.transform = '';
    trackRef.current.style.animation =
      `mcp-scroll ${totalDuration}s linear ${delay}s infinite`;
    trackRef.current.style.animationPlayState =
      activeCategory ? 'paused' : 'running';
  }, [activeCategory, categories.length]);

  if (categories.length === 0) return null;

  return (
    <div className={`relative w-full transition-all duration-500 ${isModalOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>

      {mounted && activeCategory && createPortal(
        <div ref={panelRef} style={getPanelStyle()}>
          <div
            className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
            style={{
              maxHeight: 350,
              background: isDark
                ? 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
              borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div
              className="px-3 py-1.5 font-semibold border-b text-xs"
              style={{
                borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
                color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)',
              }}
            >
              {CAROUSEL_CATEGORIES.find(c => c.key === activeCategory)?.name}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 310 }}>
              {categories.find(c => c.key === activeCategory)?.functions.map(fn => (
                <div
                  key={fn.function_key}
                  className="px-3 py-1.5 cursor-pointer transition-all border-b border-white/5 hover:bg-blue-500/10"
                  style={{
                    background: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,0.8)',
                    color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)',
                  }}
                  onClick={() => {
                    onSelect(fn);
                    setActiveCategory(null);
                    activeBtnRef.current = null;
                  }}
                >
                  <span className="font-medium text-[11px] leading-tight block">{fn.function_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div
        ref={wrapRef}
        className="w-full overflow-hidden py-2"
        onMouseEnter={pauseAnim}
        onMouseLeave={resumeAnim}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          ref={trackRef}
          className="flex gap-2 w-max"
          style={{
            animation: `mcp-scroll ${categories.length * 2.2}s linear infinite`,
            animationPlayState: activeCategory ? 'paused' : 'running',
            willChange: 'transform',
          }}
        >
          {duplicated.map((cat, idx) => (
            <button
              key={`${cat.key}-${idx}`}
              onClick={(e) => {
                if (Math.abs(dragState.current.currentOffset - dragState.current.baseOffset) > 6) return;
                if (activeCategory === cat.key) {
                  setActiveCategory(null);
                  activeBtnRef.current = null;
                } else {
                  setActiveCategory(cat.key);
                  activeBtnRef.current = e.currentTarget;
                }
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

// ── Modal "faça login" — dispara em qualquer interação sem sessão ─────────
function LoginRequiredModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(241,245,249,0.85)', backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: isDark ? 'rgb(15,23,42)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'}`,
          borderRadius: 16, padding: '32px 24px', maxWidth: 320, width: '100%', textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: isDark ? 'rgb(226,232,240)' : 'rgb(15,23,42)' }}>
          Entre para usar essa função
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20, color: isDark ? 'rgb(148,163,184)' : 'rgb(100,116,139)' }}>
          Faça login (ou crie sua conta em segundos) e já ganhe <strong>20 créditos grátis</strong> para testar todas as funções do Min.IA.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={LOGIN_URL}
            style={{ display: 'block', background: 'linear-gradient(135deg, rgb(59,130,246), rgb(16,185,129))', color: '#fff', borderRadius: 50, padding: '12px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            Entrar ou criar conta
          </a>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)'}`, borderRadius: 50, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: isDark ? 'rgb(148,163,184)' : 'rgb(100,116,139)' }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conteúdo — fica dentro do AssistantProvider local desta página ────────
function MinPageContent() {
  const [themeMounted, setThemeMounted] = useState(false);

  const [ready,    setReady]    = useState(false);
  const [hasUser,  setHasUser]  = useState(false);
  const [saldo,    setSaldo]    = useState<number | null>(null);
  const [userObj,      setUserObj]      = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [imageError,   setImageError]   = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const [allFunctions,     setAllFunctions]     = useState<AssistantFunction[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(true);
  const [activeModal,      setActiveModal]      = useState<ActiveModalState>(null);
  const [showLoginPrompt,  setShowLoginPrompt]  = useState(false);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = useRef(createClient()).current;

  const { resolvedTheme } = useTheme();
  const isDark = themeMounted ? resolvedTheme === 'dark' : false;

  const { selectedAssistantId, availableAssistants } = useAssistant();
  const currentAssistant = availableAssistants.find(a => a.id === selectedAssistantId);

  useEffect(() => { setThemeMounted(true); }, []);

  const refreshSaldo = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_credits').select('available_credits').eq('user_id', userId).maybeSingle();
    setSaldo(data?.available_credits ?? 0);
  }, [supabase]);

  // Substitui o playText de voz — empurra uma bolha de chat
  const pushAssistantMessage = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { id: `a-${Date.now()}-${Math.random()}`, role: 'assistant', content: text, timestamp: new Date() }]);
  }, []);

  // ── Sessão ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setHasUser(!!user);
      setUserObj(user);
      if (user) await refreshSaldo(user.id);
      setReady(true);
    })();
  }, [supabase, refreshSaldo]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Catálogo — todas as funções ativas, sem filtrar por habilitada ─────
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ── Texto livre → fluxo conversacional existente ────────────────────────
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

  const fallbackToText = useCallback((fn: AssistantFunction) => {
    const starter = fn.example_phrases?.[0] ?? fn.function_name;
    setInput(starter + (starter.endsWith(' ') ? '' : ' '));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Clique num card — login bloqueia tudo antes de avaliar a função ─────
  const handleFunctionSelect = useCallback(async (fn: AssistantFunction) => {
    if (!hasUser) { setShowLoginPrompt(true); return; }
    if (!selectedAssistantId) return;

    if (LEGACY_MCP_KEYS.has(fn.function_key)) { fallbackToText(fn); return; }

    const def = FUNCTIONS_REGISTRY[fn.function_key];
    if (!def) { fallbackToText(fn); return; }

    try {
      if (!def.handler) {
        if (!def.edgeFunction || !def.uiComponent) { fallbackToText(fn); return; }
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${def.edgeFunction}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
            body: JSON.stringify({ company_id: selectedAssistantId, function_key: fn.function_key }),
          }
        );
        const result = await res.json();
        if (!res.ok) { pushAssistantMessage(`Não consegui abrir "${fn.function_name}".`); return; }
        setActiveModal({ type: def.uiComponent, data: { companyId: selectedAssistantId, ...result } });
        return;
      }

      // Modo Venda/Fila/Link na Bio: força widgetMode=true pra esses 3 — o
      // próprio handler bloqueia e mostra o aviso, em vez de navegar pra uma
      // página do assistente do cliente final que o Min.IA não tem acesso aqui.
      const success = await def.handler({
        transcript: '',
        companyId: selectedAssistantId,
        functionSettings: {},
        playText: pushAssistantMessage,
        setIsProcessing: setLoading,
        setActiveModal,
        sessionId: null,
        widgetMode: ALWAYS_BLOCKED_NAV.has(fn.function_key) ? true : false,
        slug: currentAssistant?.slug,
      });

      if (success && def.creditsPerUse) {
        supabase.rpc('register_function_usage', {
          p_company_id: selectedAssistantId,
          p_function_key: fn.function_key,
          p_credits_consumed: def.creditsPerUse,
        }).then(({ error }) => { if (error) console.error('register_function_usage:', error); });
      }
    } catch (err) {
      console.error(`Erro ao executar ${fn.function_key}:`, err);
      pushAssistantMessage(`Não consegui abrir "${fn.function_name}". Tente novamente.`);
    }
  }, [hasUser, selectedAssistantId, currentAssistant, supabase, pushAssistantMessage, fallbackToText]);

  const handleSubmit = useCallback(() => {
    if (!hasUser) { setShowLoginPrompt(true); return; }
    const txt = input.trim();
    if (!txt) return;
    send(txt);
  }, [hasUser, input, send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  if (!themeMounted) {
    return (
      <div className="flex h-[100dvh] items-center justify-center" style={{ background: 'rgb(248,250,252)' }}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: isDark ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))' : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#fff' : '#0f172a' }}>Min.IA</p>
            <p className="text-[11px] truncate" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>A versão mini, nossa e sua IA!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasUser && <AssistantSelectorHeader />}
          <ThemeToggle />
          {ready && (
            hasUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center p-1 rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  {userObj?.user_metadata?.avatar_url && !imageError ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-lime-500">
                      <Image
                        src={userObj.user_metadata.avatar_url}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                      {(userObj?.user_metadata?.name || userObj?.user_metadata?.full_name || userObj?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg border py-2 z-50"
                      style={{
                        background: isDark ? 'rgb(15,23,42)' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      }}
                    >
                      <div className="px-4 py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        <p className="text-[11px] mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>Créditos disponíveis</p>
                        <p className="text-sm font-bold" style={{ color: isDark ? '#93c5fd' : '#185fa5' }}>
                          {saldo ?? '—'} créditos
                        </p>
                      </div>
                      <a
                        href="/min/credits"
                        className="flex items-center gap-3 px-4 py-2 text-sm transition hover:bg-blue-500/10"
                        style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CreditCard className="w-4 h-4 flex-shrink-0" />
                        <span>Comprar créditos</span>
                      </a>
                      <hr style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm transition hover:bg-red-500/10"
                        style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>Sair da conta</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <a
                href={LOGIN_URL}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
              >
                Entrar
              </a>
            )
          )}
        </div>
      </header>

      {/* Conteúdo / mensagens */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-1" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <p className="text-base font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>Como posso te ajudar hoje?</p>
            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
              {hasUser
                ? 'Toque numa função abaixo ou digite o que precisa.'
                : 'Veja as funções disponíveis abaixo — faça login pra usar qualquer uma delas e ganhe 20 créditos grátis.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
                  style={{
                    wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', minWidth: 0,
                    ...(m.role === 'user'
                      ? { background: 'linear-gradient(135deg, #3B82F6, #10B981)', color: '#fff' }
                      : { background: isDark ? 'rgba(51,65,85,0.8)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#1e293b' }),
                  }}
                >
                  {m.role === 'user' && m.label ? (
                    <>
                      <span className="font-bold">{m.label}</span>
                      <span className="block text-[11px] mt-0.5 opacity-75">{m.content}</span>
                    </>
                  ) : m.content}
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
        )}
      </main>

      {/* ── INPUT — acima do carrossel ─────────────────────────────────────── */}
      {ready && (
        <div className="flex-shrink-0 px-3 sm:px-6 pt-3 pb-1 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 max-w-3xl mx-auto"
            style={{ background: isDark ? 'rgba(30,41,59,0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}` }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={hasUser ? 'Digite... Ex: ver agenda, traduzir texto, cep 01310100' : 'Faça login pra usar o Min.IA'}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm"
              style={{ color: isDark ? '#e2e8f0' : '#1e293b', maxHeight: '80px', overflowY: 'auto', appearance: 'none', WebkitAppearance: 'none' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={(!input.trim() && hasUser) || loading}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* ── CARROSSEL — abaixo do input ────────────────────────────────────── */}
      {ready && (
        <div className="flex-shrink-0 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          {loadingFunctions ? (
            <div className="py-3 flex justify-center">
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
            </div>
          ) : (
            <FunctionCarousel items={allFunctions} onSelect={handleFunctionSelect} isDark={isDark} />
          )}
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      {ready && (
        <p className="flex-shrink-0 text-center text-[10px] pb-2" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }}>
          <a href="https://min.ia.br" target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#3B82F6' }}>
            min.IA.br
          </a>
        </p>
      )}

      {showLoginPrompt && <LoginRequiredModal onClose={() => setShowLoginPrompt(false)} isDark={isDark} />}

      <ActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        theme={isDark ? 'dark' : 'light'}
        playText={pushAssistantMessage}
        slug={currentAssistant?.slug}
      />
    </div>
  );
}

export default function MinPage() {
  return (
    <AssistantProvider>
      <MinPageContent />
    </AssistantProvider>
  );
}
