// =========================================================
// FASE H - CONVERSAÇÃO IA FULL (v4 - Corrigido)
// Arquivo: components/assistant/FichaConversacionalDisplay.tsx
// =========================================================
// ✅ CORREÇÕES v4:
// - Usa useVoiceRecorder (hook existente) ao invés de GoogleSpeechWebSocket
// - Corrigido áudio duplicado (removido playText extra)
// - Transcrição via API do Google Speech
// =========================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'; // ✅ Hook existente
import { 
  Loader2, Send, Mic, X, Plus, Trash2, 
  ChefHat, Beaker, MessageSquare, ClipboardList,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ItemFicha {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario?: number;
  perda_percentual: number;
  preco_estimado?: boolean;
}

interface FichaPreview {
  nome: string;
  categoria: string;
  rendimento_qtd: number;
  rendimento_unid: string;
  preco_venda?: number;
  itens: ItemFicha[];
}

interface FichaConversacionalDisplayProps {
  data: { 
    companyId: string;
    fichaType?: 'produto' | 'preparo';
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

export default function FichaConversacionalDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: FichaConversacionalDisplayProps) {
  const { companyId, fichaType: initialFichaType = 'produto' } = data;
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const supabase = createClient();

  // ✅ Usar hook de gravação existente
  const voiceRecorder = useVoiceRecorder();

  // Estados
  const [fichaType, setFichaType] = useState<'produto' | 'preparo'>(initialFichaType);
  const isFichaPreparo = fichaType === 'preparo';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [fichaPreview, setFichaPreview] = useState<FichaPreview>({
    nome: '',
    categoria: '',
    rendimento_qtd: 1,
    rendimento_unid: 'unidades',
    itens: [],
  });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActiveRef = useRef(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasSpokenInitialRef = useRef(false); // ✅ Evitar duplicação

  // Cores
  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    bgChat: isDark ? '#0f172a' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    success: '#22c55e',
    userBubble: isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  // ══════════════════════════════════════════════════════
  // MENSAGEM INICIAL (SEM DUPLICAÇÃO)
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    // ✅ Prevenir duplicação
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;

    const mensagemInicial = isFichaPreparo
      ? 'Olá! Vamos criar uma ficha de preparo. Me diga o nome do ingrediente que você quer produzir e os ingredientes necessários.'
      : 'Olá! Vamos criar uma ficha de produção. Me diga o nome do produto e os ingredientes.';

    const msg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: mensagemInicial,
      timestamp: new Date(),
    };

    setMessages([msg]);
    
    // ✅ Falar apenas uma vez
    playText(mensagemInicial).catch(() => {});

    return () => {
      isActiveRef.current = false;
    };
  }, []);

  // Atualizar mensagem ao trocar tipo (SEM falar de novo)
  useEffect(() => {
    if (!hasSpokenInitialRef.current) return; // Não rodar na primeira vez

    const novaMensagem = isFichaPreparo
      ? 'Agora vamos criar uma ficha de preparo. Me diga o ingrediente que você quer produzir.'
      : 'Agora vamos criar um produto final. Me diga o nome do produto.';
    
    const msg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: novaMensagem,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);
    // ✅ Não falar ao trocar de aba (opcional - você decide)
    // playText(novaMensagem).catch(() => {});
  }, [fichaType]);

  // Auto-scroll
  useEffect(() => {
    if (!isMobile) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMobile]);

  // ══════════════════════════════════════════════════════
  // GRAVAÇÃO DE VOZ (usando useVoiceRecorder)
  // ══════════════════════════════════════════════════════
  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      // Parar gravação e transcrever
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        await transcreverAudio(audioBlob);
      } catch (error) {
        console.error('Erro ao parar gravação:', error);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Iniciar gravação
      await voiceRecorder.startRecording();
    }
  };

  // ══════════════════════════════════════════════════════
  // TRANSCREVER ÁUDIO VIA GOOGLE SPEECH API
  // ══════════════════════════════════════════════════════
  const transcreverAudio = async (audioBlob: Blob) => {
    try {
      // Converter blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
      });

      // Chamar API de transcrição (você já deve ter uma rota para isso)
      // Se não tiver, podemos criar
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error('Erro na transcrição');

      const { text } = await response.json();
      
      if (text && text.trim()) {
        // Processar texto transcrito
        processarMensagem(text.trim());
      }
    } catch (error) {
      console.error('Erro ao transcrever:', error);
      alert('Erro ao transcrever áudio. Tente novamente ou digite.');
    }
  };

  // ══════════════════════════════════════════════════════
  // PROCESSAR MENSAGEM VIA CHATGPT
  // ══════════════════════════════════════════════════════
  const processarMensagem = async (textoUsuario: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textoUsuario,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/voice/process-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          fichaAtual: fichaPreview,
          isFichaPreparo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na API:', errorData);
        throw new Error(errorData.error || 'Erro ao processar');
      }

      const resultado = await response.json();

      // Atualizar ficha preview
      setFichaPreview(resultado.ficha);

      // Adicionar resposta do assistente
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resultado.resposta,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // ✅ Falar apenas uma vez
      playText(resultado.resposta).catch(() => {});

      // Se completo, oferecer salvar
      if (resultado.completo && resultado.ficha.nome && resultado.ficha.itens.length > 0) {
        setTimeout(() => {
          const msgSalvar: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: 'A ficha está pronta! Quer salvar agora ou fazer algum ajuste?',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msgSalvar]);
          playText('A ficha está pronta! Quer salvar agora?').catch(() => {});
        }, 1000);
      }

    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar. Pode repetir?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ══════════════════════════════════════════════════════
  // ENVIAR MENSAGEM
  // ══════════════════════════════════════════════════════
  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarMensagem(inputText);
    setInputText('');
  };

  // ══════════════════════════════════════════════════════
  // SALVAR FICHA (mesmo código anterior)
  // ══════════════════════════════════════════════════════
  const salvarFicha = async () => {
    if (!fichaPreview.nome || fichaPreview.itens.length === 0) {
      alert('A ficha precisa ter nome e pelo menos um ingrediente');
      return;
    }

    setIsSaving(true);

    try {
      const { data: fichaData, error: fichaError } = await supabase
        .from('producao_fichas')
        .insert({
          company_id: companyId,
          nome: fichaPreview.nome,
          categoria: fichaPreview.categoria || 'Geral',
          rendimento_qtd: fichaPreview.rendimento_qtd,
          rendimento_unid: fichaPreview.rendimento_unid,
          preco_venda: isFichaPreparo ? null : fichaPreview.preco_venda,
          is_ficha_preparo: isFichaPreparo,
        })
        .select()
        .single();

      if (fichaError) throw fichaError;

      const ingredientesNovos = fichaPreview.itens.filter(item => item.preco_estimado);
      
      for (const item of ingredientesNovos) {
        const { data: existente } = await supabase
          .from('producao_ingredientes')
          .select('id')
          .eq('company_id', companyId)
          .ilike('nome', item.nome)
          .single();

        if (!existente) {
          await supabase
            .from('producao_ingredientes')
            .insert({
              company_id: companyId,
              nome: item.nome,
              preco_por_unidade: item.preco_unitario,
              unidade: item.unidade === 'g' ? 'kg' : item.unidade === 'ml' ? 'L' : item.unidade,
              tipo: 'direto',
            });
        }
      }

      const itensParaInserir = await Promise.all(
        fichaPreview.itens.map(async (item) => {
          const { data: ing } = await supabase
            .from('producao_ingredientes')
            .select('id')
            .eq('company_id', companyId)
            .ilike('nome', item.nome)
            .single();

          return {
            ficha_id: fichaData.id,
            ingrediente_id: ing?.id || null,
            quantidade: item.quantidade,
            unidade: item.unidade,
            perda_percentual: item.perda_percentual || 0,
            preco_temp: ing ? null : item.preco_unitario,
          };
        })
      );

      const { error: itensError } = await supabase
        .from('producao_ficha_itens')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: fichaCompleta } = await supabase
        .from('producao_fichas')
        .select('custo_total, preco_venda_sugerido')
        .eq('id', fichaData.id)
        .single();

      const msgSucesso: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Ficha "${fichaPreview.nome}" salva com sucesso! Custo total: R$ ${fichaCompleta?.custo_total.toFixed(2)}. ${isFichaPreparo ? 'O ingrediente foi criado automaticamente.' : `Preço sugerido: R$ ${fichaCompleta?.preco_venda_sugerido.toFixed(2)}.`} Quer criar outra ficha?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msgSucesso]);
      
      playText(msgSucesso.content).catch(() => {});

      setFichaPreview({
        nome: '',
        categoria: '',
        rendimento_qtd: 1,
        rendimento_unid: 'unidades',
        itens: [],
      });

    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar ficha. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const removerIngrediente = (id: string) => {
    setFichaPreview(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== id),
    }));
  };

  // ══════════════════════════════════════════════════════
  // RENDER MOBILE
  // ══════════════════════════════════════════════════════
  if (isMobile) {
    const ultimaMensagemAssistente = [...messages].reverse().find(m => m.role === 'assistant');

    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        {/* Header Mobile */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isFichaPreparo ? <Beaker className="w-5 h-5" style={{ color: C.accent }} /> : <ChefHat className="w-5 h-5" style={{ color: C.accent }} />}
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: C.text }}>
              {isFichaPreparo ? 'Ficha de Preparo' : 'Ficha de Produção'}
            </h2>
          </div>
          <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Produto/Preparo */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => setFichaType('produto')}
            style={{
              flex: 1,
              padding: '8px',
              background: !isFichaPreparo ? C.accent : C.bgSecondary,
              color: !isFichaPreparo ? 'white' : C.textMuted,
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ChefHat className="w-4 h-4" />
            Produto
          </button>
          <button
            onClick={() => setFichaType('preparo')}
            style={{
              flex: 1,
              padding: '8px',
              background: isFichaPreparo ? C.accent : C.bgSecondary,
              color: isFichaPreparo ? 'white' : C.textMuted,
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Beaker className="w-4 h-4" />
            Preparo
          </button>
        </div>

        {/* Preview (Scrollable) */}
        <div ref={previewRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: C.bgSecondary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ClipboardList className="w-5 h-5" style={{ color: C.accent }} />
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>Preview da Ficha</h3>
          </div>

          {fichaPreview.nome && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Nome</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>{fichaPreview.nome}</div>
            </div>
          )}

          {fichaPreview.categoria && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Categoria</div>
              <div style={{ fontSize: '13px', color: C.text }}>{fichaPreview.categoria}</div>
            </div>
          )}

          {fichaPreview.rendimento_qtd > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Rendimento</div>
              <div style={{ fontSize: '13px', color: C.text }}>
                {fichaPreview.rendimento_qtd} {fichaPreview.rendimento_unid}
              </div>
            </div>
          )}

          {fichaPreview.itens.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '8px' }}>
                Ingredientes ({fichaPreview.itens.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fichaPreview.itens.map((item) => (
                  <div key={item.id} style={{ padding: '10px', background: C.bg, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{item.nome}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
                        {item.quantidade}{item.unidade} • R$ {item.preco_unitario?.toFixed(2)}/{item.unidade}
                        {item.preco_estimado && <span style={{ color: C.accent, marginLeft: '4px' }}>(estimado)</span>}
                      </div>
                    </div>
                    <button onClick={() => removerIngrediente(item.id)} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isFichaPreparo && fichaPreview.preco_venda && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Preço de Venda</div>
              <div style={{ fontSize: '13px', color: C.text, fontFamily: 'monospace' }}>R$ {fichaPreview.preco_venda.toFixed(2)}</div>
            </div>
          )}

          {fichaPreview.nome && fichaPreview.itens.length > 0 && (
            <button onClick={salvarFicha} disabled={isSaving} style={{ width: '100%', padding: '12px', background: C.success, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Plus className="w-4 h-4" />Salvar Ficha</>}
            </button>
          )}

          {!fichaPreview.nome && fichaPreview.itens.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>A ficha vai aparecer aqui conforme você conversa</p>
            </div>
          )}
        </div>

        {/* Última Resposta (Fixo) */}
        {ultimaMensagemAssistente && (
          <div style={{ padding: '12px 16px', background: C.assistantBubble, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
              <MessageSquare className="w-4 h-4 mt-0.5" style={{ color: C.accent, flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: C.text, lineHeight: '1.4' }}>
                {ultimaMensagemAssistente.content}
              </div>
            </div>
          </div>
        )}

        {/* Input (Fixo) */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!inputText.trim() && (
              <button
                onTouchStart={handleMicPress}
                onMouseDown={handleMicPress}
                disabled={isProcessing || isTranscribing}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
                  border: 'none',
                  cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  transition: 'all 0.1s ease',
                  transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <Mic className={`w-5 h-5 ${voiceRecorder.isRecording ? 'animate-pulse' : ''}`} />
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagem();
                }
              }}
              placeholder="Digite ou toque no microfone..."
              disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
              style={{ flex: 1, padding: '12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '22px', color: C.text, fontSize: '14px' }}
            />

            {inputText.trim() && (
              <button onClick={enviarMensagem} disabled={isProcessing} style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

          {voiceRecorder.isRecording && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>
              Gravando... Solte para enviar ({voiceRecorder.duration}s)
            </div>
          )}

          {isTranscribing && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: C.accent, textAlign: 'center' }}>
              Transcrevendo áudio...
            </div>
          )}

          {voiceRecorder.error && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>
              {voiceRecorder.error}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ══════════════════════════════════════════════════════
  // RENDER DESKTOP
  // ══════════════════════════════════════════════════════
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.7)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '1200px', height: '90vh', background: C.bg, borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header Desktop */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isFichaPreparo ? <Beaker className="w-6 h-6" style={{ color: C.accent }} /> : <ChefHat className="w-6 h-6" style={{ color: C.accent }} />}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: C.text, marginBottom: '4px' }}>
                {isFichaPreparo ? 'Nova Ficha de Preparo' : 'Nova Ficha de Produção'}
              </h2>
              <p style={{ fontSize: '13px', color: C.textMuted }}>Converse comigo para criar sua ficha</p>
            </div>
          </div>
          
          {/* Toggle Desktop */}
          <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
            <button onClick={() => setFichaType('produto')} style={{ padding: '8px 16px', background: !isFichaPreparo ? C.accent : C.bgSecondary, color: !isFichaPreparo ? 'white' : C.textMuted, border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChefHat className="w-4 h-4" />Produto
            </button>
            <button onClick={() => setFichaType('preparo')} style={{ padding: '8px 16px', background: isFichaPreparo ? C.accent : C.bgSecondary, color: isFichaPreparo ? 'white' : C.textMuted, border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Beaker className="w-4 h-4" />Preparo
            </button>
          </div>

          <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo - 2 colunas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1px', background: C.border, overflow: 'hidden' }}>
          
          {/* COLUNA ESQUERDA - CHAT */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', background: msg.role === 'user' ? C.userBubble : C.assistantBubble, color: msg.role === 'user' ? 'white' : C.text, fontSize: '14px', lineHeight: '1.5' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '12px', background: C.assistantBubble, color: C.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 className="w-4 h-4 animate-spin" /><span>Processando...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Desktop */}
            <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!inputText.trim() && (
                  <button
                    onClick={handleMicPress}
                    disabled={isProcessing || isTranscribing}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
                      border: 'none',
                      cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'all 0.1s ease',
                      transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <Mic className={`w-5 h-5 ${voiceRecorder.isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                )}

                <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }}} placeholder="Digite sua mensagem ou clique no microfone..." disabled={isProcessing || voiceRecorder.isRecording || isTranscribing} style={{ flex: 1, padding: '12px 16px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '24px', color: C.text, fontSize: '14px' }} />

                {inputText.trim() && (
                  <button onClick={enviarMensagem} disabled={isProcessing} style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>

              {voiceRecorder.isRecording && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>
                  Gravando... Clique novamente para enviar ({voiceRecorder.duration}s)
                </div>
              )}

              {isTranscribing && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent, textAlign: 'center' }}>
                  Transcrevendo áudio...
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - PREVIEW (mesmo código mobile) */}
          <div style={{ background: C.bg, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ClipboardList className="w-5 h-5" style={{ color: C.accent }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>Preview da Ficha</h3>
            </div>

            {fichaPreview.nome && (<div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Nome</div><div style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>{fichaPreview.nome}</div></div>)}
            {fichaPreview.categoria && (<div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Categoria</div><div style={{ fontSize: '14px', color: C.text }}>{fichaPreview.categoria}</div></div>)}
            {fichaPreview.rendimento_qtd > 0 && (<div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Rendimento</div><div style={{ fontSize: '14px', color: C.text }}>{fichaPreview.rendimento_qtd} {fichaPreview.rendimento_unid}</div></div>)}

            {fichaPreview.itens.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>Ingredientes ({fichaPreview.itens.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fichaPreview.itens.map((item) => (
                    <div key={item.id} style={{ padding: '12px', background: C.bgSecondary, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: '14px', fontWeight: '500', color: C.text }}>{item.nome}</div><div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>{item.quantidade}{item.unidade} • R$ {item.preco_unitario?.toFixed(2)}/{item.unidade}{item.preco_estimado && <span style={{ color: C.accent, marginLeft: '4px' }}>(estimado)</span>}</div></div>
                      <button onClick={() => removerIngrediente(item.id)} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isFichaPreparo && fichaPreview.preco_venda && (<div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Preço de Venda</div><div style={{ fontSize: '14px', color: C.text, fontFamily: 'monospace' }}>R$ {fichaPreview.preco_venda.toFixed(2)}</div></div>)}

            {fichaPreview.nome && fichaPreview.itens.length > 0 && (
              <button onClick={salvarFicha} disabled={isSaving} style={{ width: '100%', padding: '12px', background: C.success, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Plus className="w-4 h-4" />Salvar Ficha</>}
              </button>
            )}

            {!fichaPreview.nome && fichaPreview.itens.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '14px' }}>
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>A ficha vai aparecer aqui conforme você conversa com o assistente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
