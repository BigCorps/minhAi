'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAssistant } from '@/contexts/AssistantContext';

// ── Funções MCP disponíveis no widget ─────────────────────────────────────
const MCP_FUNCTIONS = [
  { key: 'pix',       label: 'Gerar PIX',         demo: 'gerar pix de 50,00',              color: '#3B82F6' },
  { key: 'produtos',  label: 'Ver Produtos',      demo: 'ver produtos',           color: '#10B981' },
  { key: 'estoque',   label: 'Estoque',           demo: 'consultar estoque',      color: '#3B82F6' },
  { key: 'agenda',    label: 'Ver Agenda',        demo: 'ver agenda',             color: '#10B981' },
  { key: 'pedidos',   label: 'Pedidos',           demo: 'ver pedidos',            color: '#3B82F6' },
  { key: 'caixa',     label: 'Fechar Caixa',      demo: 'fechar caixa',           color: '#10B981' },
  { key: 'venda',     label: 'Registrar Venda',   demo: 'venda de 10,00 no pix',          color: '#3B82F6' },
  { key: 'nota',      label: 'Criar Nota',        demo: 'anotar reunião amanhã',  color: '#10B981' },
  { key: 'lista',     label: 'Lista Compras',     demo: 'ver lista de compras',   color: '#3B82F6' },
  { key: 'cnpj',      label: 'Consultar CNPJ',    demo: 'cnpj 14282244000119',    color: '#10B981' },
  { key: 'cep',       label: 'Consultar CEP',     demo: 'cep 01310100',           color: '#3B82F6' },
  { key: 'placa',     label: 'Consultar Placa',   demo: 'placa ABC1234',          color: '#10B981' },
  { key: 'dolar',     label: 'Câmbio',            demo: 'cotação do dólar',       color: '#3B82F6' },
  { key: 'correios',  label: 'Rastreio',          demo: 'rastrear AA123456789BR', color: '#10B981' },
  { key: 'fraude',    label: 'Anti-fraude',       demo: 'analisar fraude no www.siteexemplo.com', color: '#3B82F6' },
  { key: 'ajuda',     label: 'Ajuda',             demo: 'ajuda',                  color: '#10B981' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  label?: string;   // label do botão do carrossel (ex: "Gerar PIX")
  timestamp: Date;
}

// ── Carousel de funções ────────────────────────────────────────────────────
function FunctionCarousel({
  onSelect,
  isDark,
}: {
  onSelect: (demo: string, label: string) => void;
  isDark: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items    = [...MCP_FUNCTIONS, ...MCP_FUNCTIONS];
  const count    = MCP_FUNCTIONS.length;

  const pause  = useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
  }, []);
  const resume = useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = 'running';
  }, []);

  return (
    <>
      <div
        className="w-full overflow-hidden py-2"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
      >
        <div
          ref={trackRef}
          className="flex gap-2 w-max"
          style={{
            animation: `mcp-scroll ${count * 2.5}s linear infinite`,
            willChange: 'transform',
          }}
        >
          {items.map((fn, idx) => (
            <button
              key={`${fn.key}-${idx}`}
              onClick={() => onSelect(fn.demo, fn.label)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm'
              }`}
              style={{ borderLeft: `4px solid ${fn.color}` }}
            >
              {fn.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes mcp-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function DashboardMcpWidget() {
  const [isOpen,  setIsOpen]  = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Tema sincronizado com o dashboard ─────────────────────────────────────
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // ── Assistente selecionado no seletor do header ────────────────────────────
  const { selectedAssistantId, availableAssistants } = useAssistant();
  const currentAssistant = availableAssistants.find(a => a.id === selectedAssistantId);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Envio de mensagem ──────────────────────────────────────────────────────
  const send = useCallback(async (text?: string, label?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      label,          // undefined quando digitado manualmente
      timestamp: new Date(),
    }]);
    setLoading(true);

    try {
      const res  = await fetch('/api/dashboard/mcp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:      msg,
          assistantId:  selectedAssistantId ?? null,
          assistantName: currentAssistant?.name ?? null,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id:        `a-${Date.now()}`,
        role:      'assistant',
        content:   data.reply ?? '❌ Sem resposta.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id:        `e-${Date.now()}`,
        role:      'assistant',
        content:   '❌ Erro de conexão. Tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, selectedAssistantId, currentAssistant]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!mounted) return null;

  // ── Botão flutuante ──────────────────────────────────────────────────────
  const button = (
    <button
      onClick={() => setIsOpen(o => !o)}
      className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
      style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
    >
      <Bot className="w-4 h-4" />
      <span>Assistente IA</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  // ── Painel de chat ───────────────────────────────────────────────────────
  const panel = isOpen && (
    <div
      className="fixed bottom-20 right-6 z-[9997] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width:      '420px',
        height:     '640px',
        background: isDark
          ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))'
          : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))',
        border: isDark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
          >
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Assistente minhAi
            </p>
            {/* Mostra o assistente ativo */}
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              {currentAssistant
                ? `▶ ${currentAssistant.name}`
                : 'Gerencie seu negócio'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/10 text-white/60'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Mensagens ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Como posso te ajudar hoje?<br />
              <span className="text-xs">
                Clique em uma função abaixo ou digite um comando
              </span>
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
              style={{
                wordBreak:    'break-word',
                overflowWrap: 'break-word',
                whiteSpace:   'pre-wrap',
                minWidth:     0,
                ...(msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #3B82F6, #10B981)',
                      color: '#fff',
                    }
                  : {
                      background: isDark
                        ? 'rgba(51,65,85,0.8)'
                        : 'rgba(255,255,255,0.9)',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                    }),
              }}
            >
              {/* Mensagem do carrossel: label em destaque + demo como hint */}
              {msg.role === 'user' && msg.label ? (
                <>
                  <span className="font-bold">{msg.label}</span>
                  <span
                    className="block text-[11px] mt-0.5"
                    style={{ opacity: 0.75 }}
                  >
                    {msg.content}
                  </span>
                </>
              ) : (
                msg.content
              )}
              <div
                className={`mt-1 text-[10px] ${
                  msg.role === 'user'
                    ? 'text-white/60'
                    : isDark
                    ? 'text-white/30'
                    : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('pt-BR', {
                  hour:   '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 shadow"
              style={{
                background: isDark
                  ? 'rgba(51,65,85,0.8)'
                  : 'rgba(255,255,255,0.9)',
              }}
            >
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(d => (
                  <div
                    key={d}
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-3 py-3 border-t"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${
              isDark
                ? 'rgba(59,130,246,0.3)'
                : 'rgba(59,130,246,0.2)'
            }`,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite... Ex: gerar pix de 50,00"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm"
            style={{
              color:     isDark ? '#e2e8f0' : '#1e293b',
              maxHeight: '80px',
              overflowY: 'auto',
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send    className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p
          className={`text-[10px] text-center mt-1.5 ${
            isDark ? 'text-white/20' : 'text-gray-300'
          }`}
        >
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>

      {/* ── Carrossel (abaixo do input) ──────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-2 border-t"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <FunctionCarousel onSelect={(demo, label) => send(demo, label)} isDark={isDark} />
      </div>
    </div>
  );

  return createPortal(
    <>{button}{panel}</>,
    document.body,
  );
}