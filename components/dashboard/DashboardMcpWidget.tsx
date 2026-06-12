'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAssistant } from '@/contexts/AssistantContext';

// ── Funções MCP disponíveis no widget ─────────────────────────────────────
// `prompt` = mensagem que o assistente exibe pedindo as informações necessárias
// `needsInput` = true quando a função PRECISA de dados do usuário antes de executar
// `autoMsg`   = mensagem enviada automaticamente quando NÃO precisa de input extra
const MCP_FUNCTIONS = [
  {
    key: 'pix',
    label: 'Gerar PIX',
    color: '#3B82F6',
    needsInput: true,
    prompt: '💰 *Gerar PIX*\n\nQual o valor da cobrança?\nEx: *50*, *150,00*',
    placeholder: 'Ex: 50,00',
  },
  {
    key: 'produtos',
    label: 'Ver Produtos',
    color: '#10B981',
    needsInput: false,
    autoMsg: 'ver produtos',
  },
  {
    key: 'estoque',
    label: 'Estoque',
    color: '#3B82F6',
    needsInput: true,
    prompt: '📦 *Consultar Estoque*\n\nQual produto deseja verificar?\n(deixe vazio para ver todos)',
    placeholder: 'Ex: camiseta ou pressione Enter para todos',
  },
  {
    key: 'agenda',
    label: 'Ver Agenda',
    color: '#10B981',
    needsInput: false,
    autoMsg: 'ver agenda',
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    color: '#3B82F6',
    needsInput: false,
    autoMsg: 'ver pedidos',
  },
  {
    key: 'caixa',
    label: 'Fechar Caixa',
    color: '#10B981',
    needsInput: false,
    autoMsg: 'fechar caixa',
  },
  {
    key: 'venda',
    label: 'Registrar Venda',
    color: '#3B82F6',
    needsInput: true,
    prompt: '💰 *Registrar Venda*\n\nInforme o valor e o meio de pagamento:\nEx: *100 pix*, *50 crédito*, *200 dinheiro*',
    placeholder: 'Ex: 100 pix',
  },
  {
    key: 'nota',
    label: 'Criar Nota',
    color: '#10B981',
    needsInput: true,
    prompt: '📝 *Criar Nota*\n\nO que deseja anotar?',
    placeholder: 'Ex: reunião com fornecedor amanhã às 10h',
  },
  {
    key: 'lista',
    label: 'Lista Compras',
    color: '#3B82F6',
    needsInput: false,
    autoMsg: 'ver lista de compras',
  },
  {
    key: 'cnpj',
    label: 'Consultar CNPJ',
    color: '#10B981',
    needsInput: true,
    prompt: '🏢 *Consultar CNPJ*\n\nInforme o número do CNPJ (14 dígitos):',
    placeholder: 'Ex: 14282244000119',
  },
  {
    key: 'cep',
    label: 'Consultar CEP',
    color: '#3B82F6',
    needsInput: true,
    prompt: '📍 *Consultar CEP*\n\nInforme o CEP (8 dígitos):',
    placeholder: 'Ex: 01310100',
  },
  {
    key: 'placa',
    label: 'Consultar Placa',
    color: '#10B981',
    needsInput: true,
    prompt: '🚗 *Consultar Placa*\n\nInforme a placa do veículo:',
    placeholder: 'Ex: ABC1234',
  },
  {
    key: 'dolar',
    label: 'Câmbio',
    color: '#3B82F6',
    needsInput: true,
    prompt: '💱 *Cotação de Câmbio*\n\nQual moeda deseja consultar?',
    placeholder: 'Ex: dólar, euro, bitcoin',
  },
  {
    key: 'correios',
    label: 'Rastreio',
    color: '#10B981',
    needsInput: true,
    prompt: '📦 *Rastreio Correios*\n\nInforme o código de rastreamento:',
    placeholder: 'Ex: AA123456789BR',
  },
  {
    key: 'fraude',
    label: 'Anti-fraude',
    color: '#3B82F6',
    needsInput: true,
    prompt: '🔍 *Análise Anti-fraude*\n\nInforme a URL ou linha digitável do boleto:',
    placeholder: 'Ex: https://site.com ou código do boleto',
  },
  {
    key: 'ajuda',
    label: 'Ajuda',
    color: '#10B981',
    needsInput: false,
    autoMsg: 'ajuda',
  },
] as const;

type McpFunction = typeof MCP_FUNCTIONS[number];

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
  onSelect: (fn: McpFunction) => void;
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
              onClick={() => onSelect(fn)}
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
        .mcp-messages::-webkit-scrollbar { width: 4px; }
        .mcp-messages::-webkit-scrollbar-track { background: transparent; }
        .mcp-messages::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        .mcp-messages:hover::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); }
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

  // Função pendente: quando o usuário clica no carrossel e precisa informar algo
  const [pendingFn, setPendingFn] = useState<McpFunction | null>(null);

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

  // Foca o input quando o pendingFn muda
  useEffect(() => {
    if (pendingFn) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [pendingFn]);

  // ── Envio de mensagem à API ─────────────────────────────────────────────
  const send = useCallback(async (text?: string, label?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setPendingFn(null);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      label,
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

  // ── Clique no carrossel ────────────────────────────────────────────────
  // Se a função NÃO precisa de input → executa direto
  // Se PRECISA de input → exibe prompt do assistente e aguarda o usuário digitar
  const handleCarouselSelect = useCallback((fn: McpFunction) => {
    if (!fn.needsInput) {
      // Executa direto, sem pedir informação
      send(fn.autoMsg as string, fn.label);
      return;
    }

    // Mostra o prompt do assistente pedindo a informação
    setPendingFn(fn);
    setMessages(prev => [...prev, {
      id:        `prompt-${Date.now()}`,
      role:      'assistant',
      content:   fn.prompt,
      timestamp: new Date(),
    }]);
  }, [send]);

  // ── Tecla Enter no input ────────────────────────────────────────────────
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // ESC cancela função pendente
    if (e.key === 'Escape' && pendingFn) {
      setPendingFn(null);
    }
  };

  // ── Submit: monta a mensagem correta dependendo se há pendingFn ─────────
  const handleSubmit = useCallback(() => {
    const txt = input.trim();
    if (!txt && !pendingFn) return;

    if (pendingFn) {
      // Monta a mensagem completa para o MCP com base na função pendente
      let fullMsg = '';
      switch (pendingFn.key) {
        case 'pix':      fullMsg = `pix de ${txt}`;             break;
        case 'estoque':  fullMsg = txt ? `estoque ${txt}` : 'consultar estoque'; break;
        case 'venda':    fullMsg = `venda ${txt}`;              break;
        case 'nota':     fullMsg = `anotar ${txt}`;             break;
        case 'cnpj':     fullMsg = `cnpj ${txt.replace(/\D/g, '')}`; break;
        case 'cep':      fullMsg = `cep ${txt.replace(/\D/g, '')}`; break;
        case 'placa':    fullMsg = `placa ${txt}`;              break;
        case 'dolar':    fullMsg = `cotação ${txt}`;            break;
        case 'correios': fullMsg = `rastrear ${txt}`;           break;
        case 'fraude':   fullMsg = `fraude ${txt}`;             break;
        default:         fullMsg = txt;
      }
      send(fullMsg, pendingFn.label);
    } else {
      send();
    }
  }, [input, pendingFn, send]);

  if (!mounted) return null;

  // Placeholder dinâmico: se há função pendente, mostra o hint dela
  const inputPlaceholder = pendingFn
    ? (pendingFn.placeholder ?? 'Digite a informação...')
    : 'Digite... Ex: gerar pix de 50,00';

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
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              {currentAssistant
                ? `▶ ${currentAssistant.name}`
                : 'Gerencie seu negócio'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setIsOpen(false); setPendingFn(null); }}
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
      <div
        className="mcp-messages flex-1 overflow-x-hidden px-4 py-2 space-y-3 min-h-0"
        style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}
      >
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Como posso te ajudar hoje?
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
              {/* Mensagem do carrossel: label em destaque + conteúdo como hint */}
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
        {/* Badge da função pendente */}
        {pendingFn && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${pendingFn.color}, #10B981)` }}
            >
              <span>{pendingFn.label}</span>
              <button
                onClick={() => { setPendingFn(null); setInput(''); }}
                className="opacity-70 hover:opacity-100 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              ESC para cancelar
            </span>
          </div>
        )}

        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${
              pendingFn
                ? pendingFn.color
                : isDark
                ? 'rgba(59,130,246,0.3)'
                : 'rgba(59,130,246,0.2)'
            }`,
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={inputPlaceholder}
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
            onClick={handleSubmit}
            disabled={(!input.trim() && !pendingFn?.key) || loading}
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
          Enter para enviar · Shift+Enter para nova linha{pendingFn ? ' · ESC para cancelar' : ''}
        </p>
      </div>

      {/* ── Carrossel (abaixo do input) ──────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-2 border-t"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <FunctionCarousel onSelect={handleCarouselSelect} isDark={isDark} />
      </div>
    </div>
  );

  return createPortal(
    <>{button}{panel}</>,
    document.body,
  );
}