'use client';

// components/assistant/FazerPedidoDisplay.tsx
// Assistente de vendas guiado — padrão visual idêntico ao EmitirNotaModal
// Coluna esquerda: chat IA de vendas | Coluna direita: carrinho + busca visual

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { listarProdutos, formatarPreco } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { getContextualRoute } from '@/lib/routing-utils';
import CheckoutFlow from '@/components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow';
import { CartProvider, useCart } from '@/hooks/useCart';
import {
  ShoppingCart, X, ArrowRight, ArrowLeft, MessageSquare,
  Package, Plus, Minus, Trash2, Search, Send, Mic,
  Loader2, Volume2, VolumeX, CreditCard,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FazerPedidoDisplayProps {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'pedido' | 'entrega' | 'pagamento';
type AbaAtiva = 'chat' | 'carrinho';
type TipoEntrega = 'retirada' | 'delivery' | 'mesa';

interface MensagemChat {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  produto?: ProdutoVenda | null;
}

interface ItemCarrinhoLocal {
  produto: ProdutoVenda;
  quantidade: number;
}

// ─── Paleta de cores ──────────────────────────────────────────────────────────

function useCores(isDark: boolean) {
  return {
    bg:               isDark ? '#1e293b' : '#ffffff',
    bgSecondary:      isDark ? '#334155' : '#f8fafc',
    bgChat:           isDark ? '#0f172a' : '#f1f5f9',
    text:             isDark ? '#f1f5f9' : '#0f172a',
    textMuted:        isDark ? '#94a3b8' : '#64748b',
    border:           isDark ? '#475569' : '#e2e8f0',
    accent:           '#10b981',
    accentBlue:       '#3b82f6',
    userBubble:       isDark ? '#10b981' : '#059669',
    assistantBubble:  isDark ? '#334155' : '#e2e8f0',
  };
}

type Cores = ReturnType<typeof useCores>;

// ─── Chat de Vendas ───────────────────────────────────────────────────────────

function AssistenteVendasChat({
  companyId, C, playText, produtos, onAdicionarProduto, onFinalizarPedido, muteRef,
}: {
  companyId: string;
  C: Cores;
  playText?: (text: string) => Promise<void>;
  produtos: ProdutoVenda[];
  onAdicionarProduto: (produto: ProdutoVenda, quantidade: number) => void;
  onFinalizarPedido: () => void;
  muteRef?: React.MutableRefObject<{ toggle: () => void; muted: boolean } | null>;
}) {
  const voiceRecorder = useVoiceRecorder();
  const [mensagens, setMensagens] = useState<MensagemChat[]>([{
    id: 'init',
    role: 'assistant',
    content: 'Olá! Sou seu assistente de vendas. Me diga o que deseja comprar ou pesquise um produto no carrinho ao lado.',
  }]);
  const [input, setInput]               = useState('');
  const [carregando, setCarregando]     = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [audioMutado, setAudioMutado]   = useState(false);
  const audioMutadoRef  = useRef(false);
  const audioQueueRef   = useRef<string[]>([]);
  const isPlayingRef    = useRef(false);
  const chatRef         = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessaoRef       = useRef<{ messages: { role: string; content: string }[] }>({ messages: [] });
  const hasSpokenRef    = useRef(false);

  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      if (muteRef) muteRef.current = { toggle: toggleMute, muted: !prev };
      return !prev;
    });
  }, [muteRef]);

  useEffect(() => {
    if (muteRef) muteRef.current = { toggle: toggleMute, muted: audioMutado };
  }, [muteRef, toggleMute, audioMutado]);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current || !playText) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try { await playText(next); await new Promise(r => setTimeout(r, 300)); } catch {}
      }
    }
    isPlayingRef.current = false;
    // Restaura foco no input após TTS terminar
    inputRef.current?.focus({ preventScroll: true });
  }, [playText]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    playTextSafe('Olá! Sou seu assistente de vendas. Me diga o que deseja comprar.');
  }, [playTextSafe]);

  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return;

    // Detecta intenção explícita de finalizar ANTES de chamar a IA
    const lowerInput = texto.toLowerCase();
    if (['finalizar', 'prosseguir', 'continuar', 'pagar', 'checkout', 'concluir', 'fechar pedido'].some(x => lowerInput.includes(x))) {
      onFinalizarPedido();
      return;
    }
    const userMsg: MensagemChat = { id: `u-${Date.now()}`, role: 'user', content: texto };
    setMensagens(prev => [...prev, userMsg]);
    setInput('');
    setCarregando(true);
    sessaoRef.current.messages.push({ role: 'user', content: texto });

    try {
      const contextoProdutos = produtos
        .map(p => `- ${p.nome}: R$${p.preco_venda.toFixed(2)}${p.descricao ? ` (${p.descricao})` : ''}${p.controla_estoque && p.estoque_atual <= 0 ? ' [sem estoque]' : ''}`)
        .join('\n') || 'Nenhum produto cadastrado.';

      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('assistente-vendas-chat', {
        body: {
          company_id: companyId,
          messages: sessaoRef.current.messages,
          produtos_context: contextoProdutos,
        },
      });

      const respostaTexto = (!error && data?.message) ? data.message : 'Desculpe, não consegui processar. Pode repetir?';
      sessaoRef.current.messages.push({ role: 'assistant', content: respostaTexto });

      // Detecta produto mencionado
      const produtoMencionado = produtos.find(p =>
        respostaTexto.toLowerCase().includes(p.nome.toLowerCase())
      ) ?? null;

      setMensagens(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: respostaTexto,
        produto: produtoMencionado,
      }]);
      playTextSafe(respostaTexto);
      // Detecta se o USUÁRIO pediu explicitamente para finalizar
      const lowerInput = texto.toLowerCase();
      if (['finalizar', 'prosseguir', 'continuar', 'pagar', 'checkout', 'concluir'].some(x => lowerInput.includes(x))) {
        setTimeout(onFinalizarPedido, 800);
        return;
      }
    } catch {
      setMensagens(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setCarregando(false);
    }
  }, [carregando, produtos, companyId, playTextSafe, onFinalizarPedido]);

  // Gravação — igual ao AssistenteFiscalChat
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
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` },
        body: formData,
      });
      if (response.ok) {
        const { text } = await response.json();
        if (text?.trim()) {
          const lower = text.toLowerCase();
          if (['finalizar', 'pagar', 'concluir', 'checkout', 'fechar pedido'].some(x => lower.includes(x))) {
            onFinalizarPedido();
          } else {
            await enviarMensagem(text.trim());
          }
        }
      }
    } catch {} finally { setTranscrevendo(false); }
  }, [voiceRecorder, enviarMensagem, onFinalizarPedido]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bgChat }}>
      {/* Mensagens */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {mensagens.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] space-y-2">
              <div className="rounded-2xl px-4 py-2 text-sm"
                style={{ backgroundColor: msg.role === 'user' ? C.userBubble : C.assistantBubble, color: msg.role === 'user' ? '#ffffff' : C.text }}>
                {msg.content}
              </div>
              {/* Card do produto */}
              {msg.role === 'assistant' && msg.produto && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.border, backgroundColor: C.bg }}>
                  {msg.produto.imagem_url && (
                    <img src={msg.produto.imagem_url} alt={msg.produto.nome} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-3">
                    <p className="font-semibold text-sm" style={{ color: C.text }}>{msg.produto.nome}</p>
                    {msg.produto.descricao && (
                      <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{msg.produto.descricao}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm" style={{ color: C.accent }}>
                        {formatarPreco(msg.produto.preco_venda)}
                      </span>
                      <button onClick={() => onAdicionarProduto(msg.produto!, 1)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-xs font-semibold"
                        style={{ backgroundColor: C.accent }}>
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {carregando && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 flex items-center gap-2" style={{ backgroundColor: C.assistantBubble }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.accent }} />
              <span className="text-sm" style={{ color: C.textMuted }}>Processando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input — idêntico ao AssistenteFiscalChat */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.bg }}>
        <form onSubmit={e => { e.preventDefault(); enviarMensagem(input); }} className="flex items-end gap-2">
          <input ref={inputRef} type="text" value={input}
            onBlur={() => { if (!carregando && !transcrevendo && !voiceRecorder.isRecording) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50); }}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(input); } }}
            placeholder="Digite sua mensagem..."
            disabled={carregando || transcrevendo}
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: C.bgSecondary, borderColor: C.border, color: C.text }} />
          <button type="button"
            onClick={voiceRecorder.isRecording ? handleStopVoice : handleStartVoice}
            disabled={carregando || transcrevendo}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: voiceRecorder.isRecording ? '#ef4444' : C.accentBlue, color: '#ffffff' }}>
            {transcrevendo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
          </button>
          <button type="submit"
            disabled={!input.trim() || carregando || transcrevendo}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: C.accent, color: '#ffffff' }}>
            {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        {voiceRecorder.isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
              Gravando... {voiceRecorder.duration}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Painel Carrinho ──────────────────────────────────────────────────────────

function PainelCarrinho({
  C, itens, produtos, onAdicionar, onRemover, onAlterarQtd, onFinalizar,
}: {
  C: Cores;
  itens: ItemCarrinhoLocal[];
  produtos: ProdutoVenda[];
  onAdicionar: (produto: ProdutoVenda, quantidade: number) => void;
  onRemover: (produtoId: string) => void;
  onAlterarQtd: (produtoId: string, delta: number) => void;
  onFinalizar: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ProdutoVenda[]>([]);

  useEffect(() => {
    if (!busca.trim()) { setResultados([]); return; }
    const lower = busca.toLowerCase();
    setResultados(produtos.filter(p => p.nome.toLowerCase().includes(lower)).slice(0, 5));
  }, [busca, produtos]);

  const total     = itens.reduce((acc, i) => acc + i.produto.preco_venda * i.quantidade, 0);
  const totalItens = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const umProduto = itens.length === 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Busca */}
      <div className="px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.bg }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.textMuted }}>
          Adicionar produto
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textMuted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto pelo nome..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none"
            style={{ borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text }} />
        </div>
        {resultados.length > 0 && (
          <div className="mt-1 rounded-xl border overflow-hidden shadow-lg" style={{ borderColor: C.border, backgroundColor: C.bg }}>
            {resultados.map(p => (
              <button key={p.id}
                onClick={() => { onAdicionar(p, 1); setBusca(''); setResultados([]); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left border-b last:border-0 hover:opacity-70 transition-opacity"
                style={{ borderColor: C.border }}>
                <span style={{ color: C.text }}>{p.nome}</span>
                <span className="font-semibold text-xs" style={{ color: C.accent }}>{formatarPreco(p.preco_venda)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ backgroundColor: C.bgChat }}>
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: C.textMuted }}>
            <ShoppingCart className="w-10 h-10 opacity-20" />
            <p className="text-sm">Carrinho vazio</p>
            <p className="text-xs text-center">Use o chat ou a busca acima</p>
          </div>
        ) : umProduto ? (
          /* 1 produto — imagem grande */
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.border, backgroundColor: C.bg }}>
            {itens[0].produto.imagem_url ? (
              <img src={itens[0].produto.imagem_url} alt={itens[0].produto.nome} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 flex items-center justify-center" style={{ backgroundColor: C.bgSecondary }}>
                <Package className="w-16 h-16 opacity-20" style={{ color: C.textMuted }} />
              </div>
            )}
            <div className="p-4">
              <p className="font-bold text-base" style={{ color: C.text }}>{itens[0].produto.nome}</p>
              {itens[0].produto.descricao && (
                <p className="text-xs mt-1" style={{ color: C.textMuted }}>{itens[0].produto.descricao}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-base" style={{ color: C.accent }}>
                  {formatarPreco(itens[0].produto.preco_venda * itens[0].quantidade)}
                </span>
                <div className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ backgroundColor: C.bgSecondary }}>
                  <button onClick={() => onAlterarQtd(itens[0].produto.id, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70"
                    style={{ color: C.textMuted }}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-semibold w-5 text-center" style={{ color: C.text }}>
                    {itens[0].quantidade}
                  </span>
                  <button onClick={() => onAlterarQtd(itens[0].produto.id, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70"
                    style={{ color: C.textMuted }}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2+ produtos — lista */
          <div className="space-y-2">
            {itens.map(item => (
              <div key={item.produto.id} className="rounded-xl border p-3" style={{ borderColor: C.border, backgroundColor: C.bg }}>
                <div className="flex items-center gap-3">
                  {item.produto.imagem_url ? (
                    <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.bgSecondary }}>
                      <Package className="w-5 h-5 opacity-30" style={{ color: C.textMuted }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{item.produto.nome}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{formatarPreco(item.produto.preco_venda)} / un</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ backgroundColor: C.bgSecondary }}>
                      <button onClick={() => onAlterarQtd(item.produto.id, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70" style={{ color: C.textMuted }}>
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-semibold w-4 text-center" style={{ color: C.text }}>{item.quantidade}</span>
                      <button onClick={() => onAlterarQtd(item.produto.id, 1)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70" style={{ color: C.textMuted }}>
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <button onClick={() => onRemover(item.produto.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:opacity-70" style={{ color: C.textMuted }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-xs font-bold" style={{ color: C.accent }}>
                    {formatarPreco(item.produto.preco_venda * item.quantidade)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total + botão */}
      {itens.length > 0 && (
        <div className="px-4 py-3 border-t space-y-2 flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.bg }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: C.textMuted }}>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </span>
            <span className="font-bold text-base" style={{ color: C.text }}>{formatarPreco(total)}</span>
          </div>
          <button onClick={onFinalizar}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: C.accent }}>
            <CreditCard className="w-4 h-4" />
            Finalizar Venda
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Etapa de Entrega ─────────────────────────────────────────────────────────

function EtapaEntrega({ C, onAvancar, onVoltar }: {
  C: Cores;
  onAvancar: (tipo: TipoEntrega, obs: string) => void;
  onVoltar: () => void;
}) {
  const [tipo, setTipo]       = useState<TipoEntrega>('retirada');
  const [endereco, setEndereco] = useState('');
  const [mesa, setMesa]         = useState('');

  const podeAvancar =
    tipo === 'retirada' ||
    (tipo === 'delivery' && endereco.trim().length >= 5) ||
    (tipo === 'mesa' && mesa.trim().length >= 1);

  const getObs = () => {
    if (tipo === 'delivery') return `Delivery: ${endereco}`;
    if (tipo === 'mesa') return `Mesa/Comanda: ${mesa}`;
    return '';
  };

const opcoes: { key: TipoEntrega; label: string; desc: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: 'retirada', label: 'Retirada no local', desc: 'Cliente retira no balcão',   Icon: ({ className }) => <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg> },
    { key: 'delivery', label: 'Delivery', desc: 'Entrega no endereço do cliente',      Icon: ({ className }) => <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg> },
    { key: 'mesa',    label: 'Mesa / Comanda', desc: 'Consumo no estabelecimento',     Icon: ({ className }) => <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
  ];

  const inputStyle = { borderColor: C.border, backgroundColor: C.bgSecondary, color: C.text };

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm" style={{ color: C.textMuted }}>Como o pedido será entregue?</p>
      <div className="space-y-2">
        {opcoes.map(op => (
          <button key={op.key} onClick={() => setTipo(op.key)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-opacity hover:opacity-80"
            style={{ borderColor: tipo === op.key ? C.accent : C.border, backgroundColor: tipo === op.key ? 'rgba(16,185,129,0.08)' : C.bgSecondary }}>
            <op.Icon className="w-6 h-6 flex-shrink-0" style={{ color: C.accent } as any} />
            <div>
              <p className="font-semibold text-sm" style={{ color: C.text }}>{op.label}</p>
              <p className="text-xs" style={{ color: C.textMuted }}>{op.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {tipo === 'delivery' && (
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Endereço de entrega *</label>
          <textarea rows={2} value={endereco} onChange={e => setEndereco(e.target.value)}
            placeholder="Rua, número, bairro, cidade..."
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
            style={inputStyle} />
        </div>
      )}
      {tipo === 'mesa' && (
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Mesa / Comanda *</label>
          <input value={mesa} onChange={e => setMesa(e.target.value)}
            placeholder="Ex: Mesa 5, Comanda 12"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={inputStyle} />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onVoltar}
          className="flex-1 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          style={{ backgroundColor: C.bgSecondary, color: C.text }}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button onClick={() => podeAvancar && onAvancar(tipo, getObs())}
          disabled={!podeAvancar}
          className="flex-1 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          style={{
            backgroundColor: podeAvancar ? C.accent : C.border,
            color: podeAvancar ? '#ffffff' : C.textMuted,
            cursor: podeAvancar ? 'pointer' : 'not-allowed',
          }}>
          Ir para pagamento <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Componente interno ───────────────────────────────────────────────────────

function FazerPedidoInner({ data, onClose, theme = 'dark', playText }: FazerPedidoDisplayProps) {
  const { companyId, slug } = data;
  const isDark = theme === 'dark';
  const C = useCores(isDark);
  const isMobile = useIsMobile();
  const { addItem, clear } = useCart();

  const [step, setStep]                     = useState<Step>('pedido');
  const [abaAtiva, setAbaAtiva]             = useState<AbaAtiva>('chat');
  const [produtos, setProdutos]             = useState<ProdutoVenda[]>([]);
  const [itens, setItens]                   = useState<ItemCarrinhoLocal[]>([]);
  const [metodosAtivos, setMetodosAtivos]   = useState<string[]>(['pix_generate']);
  const [observacaoEntrega, setObservacaoEntrega] = useState<string | null>(null);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const muteRef = useRef<{ toggle: () => void; muted: boolean } | null>(null);
  const [, forceUpdate] = useState(0);

  const totalItens = itens.reduce((acc, i) => acc + i.quantidade, 0);

  useEffect(() => {
    async function load() {
      setCarregandoProdutos(true);
      try {
        const prods = await listarProdutos(companyId);
        setProdutos(prods);
        const supabase = createClient();
        const { data: settings } = await supabase
          .from('company_function_settings')
          .select('function_key, is_enabled')
          .eq('company_id', companyId)
          .in('function_key', [
            'pix_generate',
            'nfc_debito', 'nfc_credito',
            'tef_debito', 'tef_credito',
            'dinheiro',
          ]);
        const ativos: string[] = [];
        (settings ?? []).forEach((r: any) => {
          if (r.is_enabled) ativos.push(r.function_key);
        });
        setMetodosAtivos(ativos.length > 0 ? ativos : ['pix_generate']);
      } finally {
        setCarregandoProdutos(false);
      }
    }
    load();
  }, [companyId]);

  function adicionarProduto(produto: ProdutoVenda, quantidade: number) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.produto.id === produto.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + quantidade };
        return novo;
      }
      return [...prev, { produto, quantidade }];
    });
    addItem(produto, quantidade);
    if (isMobile) setAbaAtiva('carrinho');
  }

  function removerProduto(produtoId: string) {
    setItens(prev => prev.filter(i => i.produto.id !== produtoId));
  }

  function alterarQtd(produtoId: string, delta: number) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.produto.id === produtoId);
      if (idx < 0) return prev;
      const novaQtd = prev[idx].quantidade + delta;
      if (novaQtd <= 0) return prev.filter(i => i.produto.id !== produtoId);
      const novo = [...prev];
      novo[idx] = { ...novo[idx], quantidade: novaQtd };
      return novo;
    });
  }

  function irParaEntrega() {
    if (itens.length === 0) return;
    clear();
    itens.forEach(i => addItem(i.produto, i.quantidade));
    setStep('entrega');
  }

  const titulo = step === 'pedido' ? 'Assistente de Vendas'
    : step === 'entrega' ? 'Tipo de Entrega'
    : 'Pagamento';

  const subtitulo = step === 'pedido' ? 'Monte seu pedido com o assistente'
    : step === 'entrega' ? 'Como deseja receber seu pedido?'
    : 'Escolha a forma de pagamento';

  function renderConteudo() {
    if (step === 'entrega') {
      return (
        <EtapaEntrega
          C={C}
          onVoltar={() => setStep('pedido')}
          onAvancar={(tipo, obs) => { setObservacaoEntrega(obs || null); setStep('pagamento'); }}
        />
      );
    }

    if (step === 'pagamento') {
      return (
        <div style={{ height: 560, padding: '0 24px 24px' }}>
          <CheckoutFlow
            companyId={companyId}
            theme={theme}
            onClose={onClose}
            onVoltar={() => setStep('entrega')}
            playText={playText}
            metodosAtivos={metodosAtivos}
            observacaoEntrega={observacaoEntrega}
          />
        </div>
      );
    }

    // Step pedido — duas colunas igual EmitirNotaModal
    return (
      <div className="flex flex-col" style={{ height: 560 }}>
        {/* Tabs mobile */}
        {isMobile && (
          <div className="flex border-b flex-shrink-0" style={{ borderColor: C.border }}>
            {([
              { key: 'chat' as const, label: 'Assistente', Icon: MessageSquare },
              { key: 'carrinho' as const, label: totalItens > 0 ? `Carrinho (${totalItens})` : 'Carrinho', Icon: ShoppingCart },
            ] as const).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setAbaAtiva(key)}
                className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2"
                style={{ borderColor: abaAtiva === key ? C.accent : 'transparent', color: abaAtiva === key ? C.accent : C.textMuted }}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda — chat */}
          <div className={`flex-1 overflow-hidden ${!isMobile ? `border-r` : ''} ${isMobile && abaAtiva !== 'chat' ? 'hidden' : ''}`}
            style={{ borderColor: C.border }}>
            {carregandoProdutos ? (
              <div className="flex items-center justify-center h-full" style={{ backgroundColor: C.bgChat }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
              </div>
            ) : (
              <AssistenteVendasChat
                companyId={companyId}
                C={C}
                playText={playText}
                produtos={produtos}
                onAdicionarProduto={adicionarProduto}
                onFinalizarPedido={irParaEntrega}
                muteRef={muteRef}
              />
            )}
          </div>

          {/* Coluna direita — carrinho */}
          <div className={`overflow-hidden flex flex-col ${isMobile ? 'flex-1' : 'w-[380px]'} ${isMobile && abaAtiva !== 'carrinho' ? 'hidden' : ''}`}
            style={{ backgroundColor: C.bg }}>
            <PainelCarrinho
              C={C}
              itens={itens}
              produtos={produtos}
              onAdicionar={adicionarProduto}
              onRemover={removerProduto}
              onAlterarQtd={alterarQtd}
              onFinalizar={irParaEntrega}
            />
          </div>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg sm:max-w-5xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: C.bg, borderColor: C.border }}
      >
        {/* Header — idêntico ao EmitirNotaModal */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: C.border, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.accent }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: C.text }}>{titulo}</h2>
              <p className="text-xs" style={{ color: C.textMuted }}>{subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicador de progresso */}
            <div className="flex items-center gap-1 mr-2">
              {(['pedido', 'entrega', 'pagamento'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full transition-all"
                    style={{ backgroundColor: step === s || (s === 'entrega' && step === 'pagamento') || (s === 'pedido' && step !== 'pedido') ? C.accent : C.border }} />
                  {i < 2 && <div className="w-3 h-px" style={{ backgroundColor: C.border }} />}
                </div>
              ))}
            </div>
            {slug && (
              <a href={getContextualRoute('vendas', slug)}
                className="text-xs px-2 py-1 rounded-lg border hover:opacity-70 transition-opacity"
                style={{ borderColor: C.border, color: C.textMuted }}>
                Página de Vendas
              </a>
            )}
            {step === 'pedido' && (
              <button
                onClick={() => { muteRef.current?.toggle(); forceUpdate(n => n + 1); }}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: muteRef.current?.muted ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: muteRef.current?.muted ? '#ef4444' : C.accent }}>
                {muteRef.current?.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-full hover:opacity-70 transition-opacity"
              aria-label="Fechar">
              <X className="w-5 h-5" style={{ color: C.textMuted }} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="relative overflow-hidden" style={{ backgroundColor: C.bg }}>
          {renderConteudo()}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Export com CartProvider ──────────────────────────────────────────────────

export default function FazerPedidoDisplay(props: FazerPedidoDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <CartProvider>
      <FazerPedidoInner {...props} />
    </CartProvider>
  );
}
