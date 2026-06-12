'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAssistant } from '@/contexts/AssistantContext';

// ── Todas as funções MCP — paridade com o mcp-whatsapp-handler ────────────
// needsInput: true  → o carrossel exibe prompt antes de executar
// needsInput: false → executa diretamente ao clicar
const MCP_FUNCTIONS = [
  // Pagamentos
  { key: 'pix',        label: 'Gerar PIX',           cat: '💰', color: '#3B82F6', needsInput: true,  autoMsg: '',               prompt: '💰 *Gerar PIX*\n\nQual o valor da cobrança?', placeholder: 'Ex: 50,00' },
  { key: 'venda',      label: 'Registrar Venda',      cat: '💰', color: '#3B82F6', needsInput: true,  autoMsg: '',               prompt: '💰 *Registrar Venda*\n\nValor e forma de pagamento:', placeholder: 'Ex: 100 pix' },
  { key: 'caixa',      label: 'Fechar Caixa',         cat: '💰', color: '#3B82F6', needsInput: false, autoMsg: 'fechar caixa',    prompt: '', placeholder: '' },
  // Produtos & Estoque
  { key: 'produtos',   label: 'Ver Produtos',         cat: '🛍️', color: '#8B5CF6', needsInput: false, autoMsg: 'ver produtos',   prompt: '', placeholder: '' },
  { key: 'estoque',    label: 'Estoque',               cat: '🛍️', color: '#8B5CF6', needsInput: true,  autoMsg: '',              prompt: '📦 *Consultar Estoque*\n\nQual produto? (Enter para todos)', placeholder: 'Ex: camiseta' },
  // Pedidos
  { key: 'pedidos',    label: 'Ver Pedidos',           cat: '📊', color: '#06B6D4', needsInput: false, autoMsg: 'ver pedidos',    prompt: '', placeholder: '' },
  // Agenda
  { key: 'agenda',     label: 'Ver Agenda',            cat: '📅', color: '#10B981', needsInput: false, autoMsg: 'ver agenda',     prompt: '', placeholder: '' },
  { key: 'agendar',    label: 'Agendar',               cat: '📅', color: '#10B981', needsInput: true,  autoMsg: '',              prompt: '📅 *Novo Agendamento*\n\nDescreva o evento com data e hora:', placeholder: 'Ex: reunião amanhã às 14h' },
  { key: 'horarios',   label: 'Horários Livres',       cat: '📅', color: '#10B981', needsInput: false, autoMsg: 'horários disponíveis', prompt: '', placeholder: '' },
  // Notas
  { key: 'nota',       label: 'Criar Nota',            cat: '📝', color: '#F59E0B', needsInput: true,  autoMsg: '',              prompt: '📝 *Criar Nota*\n\nO que deseja anotar?', placeholder: 'Ex: reunião com fornecedor amanhã às 10h' },
  { key: 'ver_notas',  label: 'Ver Notas',             cat: '📝', color: '#F59E0B', needsInput: false, autoMsg: 'ver notas',      prompt: '', placeholder: '' },
  // Lista de Compras
  { key: 'lista',      label: 'Lista Compras',         cat: '🛒', color: '#EC4899', needsInput: false, autoMsg: 'ver lista de compras', prompt: '', placeholder: '' },
  { key: 'add_lista',  label: 'Add na Lista',          cat: '🛒', color: '#EC4899', needsInput: true,  autoMsg: '',              prompt: '🛒 *Adicionar na Lista*\n\nQual item deseja adicionar?', placeholder: 'Ex: pão de forma' },
  { key: 'rm_lista',   label: 'Remover da Lista',      cat: '🛒', color: '#EC4899', needsInput: true,  autoMsg: '',              prompt: '🛒 *Remover da Lista*\n\nQual item deseja remover?', placeholder: 'Ex: pão de forma' },
  // Consultas gratuitas
  { key: 'cnpj',       label: 'Consultar CNPJ',        cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '🏢 *Consultar CNPJ*\n\nInforme o CNPJ (14 dígitos):', placeholder: 'Ex: 14282244000119' },
  { key: 'cpf',        label: 'Consultar CPF',         cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '👤 *Consultar CPF*\n\nInforme o CPF (11 dígitos):', placeholder: 'Ex: 12345678900' },
  { key: 'cep',        label: 'Consultar CEP',         cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '📍 *Consultar CEP*\n\nInforme o CEP (8 dígitos):', placeholder: 'Ex: 01310100' },
  { key: 'placa',      label: 'Consultar Placa',       cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '🚗 *Consultar Placa*\n\nInforme a placa do veículo:', placeholder: 'Ex: ABC1234' },
  { key: 'dolar',      label: 'Câmbio',                cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '💱 *Cotação de Câmbio*\n\nQual moeda?', placeholder: 'Ex: dólar, euro, bitcoin' },
  { key: 'rastreio',   label: 'Rastreio Correios',     cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '📦 *Rastreio Correios*\n\nInforme o código de rastreamento:', placeholder: 'Ex: AA123456789BR' },
  { key: 'ddd',        label: 'Consultar DDD',         cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '📱 *Consultar DDD*\n\nInforme o DDD (2 dígitos):', placeholder: 'Ex: 11' },
  { key: 'feriados',   label: 'Feriados',              cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '📅 *Feriados Nacionais*\n\nQual ano?', placeholder: `Ex: ${new Date().getFullYear()}` },
  { key: 'clima',      label: 'Clima',                 cat: '🔍', color: '#6366F1', needsInput: true,  autoMsg: '',              prompt: '☀️ *Clima*\n\nQual cidade?', placeholder: 'Ex: São Paulo' },
  // Consultas pagas
  { key: 'rest_cpf',   label: 'Restrições CPF',        cat: '🔒', color: '#EF4444', needsInput: true,  autoMsg: '',              prompt: '🔒 *Restrições CPF* (consulta paga)\n\nInforme o CPF (11 dígitos):', placeholder: 'Ex: 12345678900' },
  { key: 'rest_cnpj',  label: 'Restrições CNPJ',       cat: '🔒', color: '#EF4444', needsInput: true,  autoMsg: '',              prompt: '🔒 *Restrições CNPJ* (consulta paga)\n\nInforme o CNPJ (14 dígitos):', placeholder: 'Ex: 14282244000119' },
  { key: 'protestos',  label: 'Protestos CPF',         cat: '🔒', color: '#EF4444', needsInput: true,  autoMsg: '',              prompt: '🔒 *Protestos CPF* (consulta paga)\n\nInforme o CPF (11 dígitos):', placeholder: 'Ex: 12345678900' },
  // Ferramentas
  { key: 'fraude',     label: 'Anti-fraude',           cat: '🛠️', color: '#F97316', needsInput: true,  autoMsg: '',              prompt: '🔍 *Anti-fraude*\n\nInforme a URL ou linha digitável do boleto:', placeholder: 'Ex: https://site.com' },
  { key: 'traduzir',   label: 'Traduzir Texto',        cat: '🛠️', color: '#F97316', needsInput: true,  autoMsg: '',              prompt: '🌎 *Traduzir Texto*\n\nInforme o texto e o idioma destino:', placeholder: 'Ex: olá para inglês' },
  { key: 'email',      label: 'Ver E-mails',           cat: '🛠️', color: '#F97316', needsInput: false, autoMsg: 'ver emails',     prompt: '', placeholder: '' },
  // Geral
  { key: 'ajuda',      label: 'Ajuda',                 cat: '❓', color: '#64748B', needsInput: false, autoMsg: 'ajuda',          prompt: '', placeholder: '' },
] as const;

type McpFn = typeof MCP_FUNCTIONS[number];

// Monta a mensagem completa para o MCP a partir do input do usuário
function buildMessage(fn: McpFn, input: string): string {
  const t = input.trim();
  switch (fn.key) {
    case 'pix':      return `pix de ${t}`;
    case 'venda':    return `venda ${t}`;
    case 'estoque':  return t ? `estoque ${t}` : 'consultar estoque';
    case 'agendar':  return `agendar ${t}`;
    case 'nota':     return `anotar ${t}`;
    case 'add_lista':  return `adicionar ${t} na lista`;
    case 'rm_lista':   return `remover ${t} da lista`;
    case 'cnpj':     return `cnpj ${t.replace(/\D/g, '')}`;
    case 'cpf':      return `cpf ${t.replace(/\D/g, '')}`;
    case 'cep':      return `cep ${t.replace(/\D/g, '')}`;
    case 'placa':    return `placa ${t}`;
    case 'dolar':    return `cotação ${t}`;
    case 'rastreio': return `rastrear ${t}`;
    case 'ddd':      return `ddd ${t.replace(/\D/g, '')}`;
    case 'feriados': return `feriados ${t}`;
    case 'clima':    return `clima ${t}`;
    case 'rest_cpf':  return `restrições cpf ${t.replace(/\D/g, '')}`;
    case 'rest_cnpj': return `restrições cnpj ${t.replace(/\D/g, '')}`;
    case 'protestos': return `protestos ${t.replace(/\D/g, '')}`;
    case 'fraude':   return `fraude ${t}`;
    case 'traduzir': return `traduzir ${t}`;
    default:         return t || (fn as any).autoMsg || fn.key;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  label?: string;
  timestamp: Date;
}

// ── Carrossel contínuo de botões ──────────────────────────────────────────
function FunctionCarousel({ onSelect, isDark }: { onSelect: (fn: McpFn) => void; isDark: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items    = [...MCP_FUNCTIONS, ...MCP_FUNCTIONS];
  const count    = MCP_FUNCTIONS.length;

  const pause  = useCallback(() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }, []);
  const resume = useCallback(() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }, []);

  return (
    <>
      <div className="w-full overflow-hidden py-2" onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={resume} onTouchCancel={resume}>
        <div ref={trackRef} className="flex gap-2 w-max" style={{ animation: `mcp-scroll ${count * 2.2}s linear infinite`, willChange: 'transform' }}>
          {items.map((fn, idx) => (
            <button
              key={`${fn.key}-${idx}`}
              onClick={() => onSelect(fn)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm'}`}
              style={{ borderLeft: `3px solid ${fn.color}` }}
            >
              {fn.cat} {fn.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes mcp-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
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
  const [isOpen,    setIsOpen]    = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [pendingFn, setPendingFn] = useState<McpFn | null>(null);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { selectedAssistantId, availableAssistants } = useAssistant();
  const currentAssistant = availableAssistants.find(a => a.id === selectedAssistantId);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (pendingFn) setTimeout(() => inputRef.current?.focus(), 100); }, [pendingFn]);

  // ── Envio para a API ────────────────────────────────────────────────────
  const send = useCallback(async (text: string, label?: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput('');
    setPendingFn(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg, label, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res  = await fetch('/api/dashboard/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, assistantId: selectedAssistantId ?? null, assistantName: currentAssistant?.name ?? null }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.reply ?? '❌ Sem resposta.', timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: '❌ Erro de conexão. Tente novamente.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, selectedAssistantId, currentAssistant]);

  // ── Clique no carrossel ─────────────────────────────────────────────────
  const handleCarouselSelect = useCallback((fn: McpFn) => {
    if (!fn.needsInput) {
      send((fn as any).autoMsg, fn.label);
      return;
    }
    setPendingFn(fn);
    setMessages(prev => [...prev, { id: `prompt-${Date.now()}`, role: 'assistant', content: fn.prompt, timestamp: new Date() }]);
  }, [send]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const txt = input.trim();
    if (pendingFn) {
      // Estoque sem texto = consultar tudo
      if (!txt && pendingFn.key !== 'estoque') return;
      send(buildMessage(pendingFn, txt), pendingFn.label);
    } else {
      if (!txt) return;
      send(txt);
    }
  }, [input, pendingFn, send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape' && pendingFn)  { setPendingFn(null); setInput(''); }
  };

  if (!mounted) return null;

  const inputPlaceholder = pendingFn
    ? (pendingFn.placeholder || 'Digite a informação...')
    : 'Digite... Ex: pix de 50, cnpj 14282...';

  // ── Botão flutuante ─────────────────────────────────────────────────────
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

  // ── Painel de chat ──────────────────────────────────────────────────────
  const panel = isOpen && (
    <div
      className="fixed bottom-20 right-6 z-[9997] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: '420px', height: '640px',
        background: isDark ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))' : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Assistente minhAi</p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              {currentAssistant ? `▶ ${currentAssistant.name}` : '30 funções disponíveis'}
            </p>
          </div>
        </div>
        <button onClick={() => { setIsOpen(false); setPendingFn(null); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="mcp-messages flex-1 overflow-x-hidden px-4 py-2 space-y-3 min-h-0" style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Como posso te ajudar hoje?<br />
              <span className="text-xs opacity-70">Use o carrossel ou digite um comando</span>
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
      <div className="flex-shrink-0 px-3 py-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        {/* Badge da função pendente */}
        {pendingFn && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: pendingFn.color }}>
              <span>{pendingFn.cat} {pendingFn.label}</span>
              <button onClick={() => { setPendingFn(null); setInput(''); }} className="opacity-70 hover:opacity-100 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>ESC para cancelar</span>
          </div>
        )}

        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${pendingFn ? pendingFn.color : isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
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
            style={{ color: isDark ? '#e2e8f0' : '#1e293b', maxHeight: '80px', overflowY: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && !(pendingFn?.key === 'estoque')) || loading}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Enter para enviar · Shift+Enter para nova linha{pendingFn ? ' · ESC para cancelar' : ''}
        </p>
      </div>

      {/* Carrossel */}
      <div className="flex-shrink-0 px-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <FunctionCarousel onSelect={handleCarouselSelect} isDark={isDark} />
      </div>
    </div>
  );

  return createPortal(<>{button}{panel}</>, document.body);
}