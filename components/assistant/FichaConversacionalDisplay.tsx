// =========================================================
// FASE H - CONVERSAÇÃO IA FULL (v2 - Integrado)
// Arquivo: components/assistant/FichaConversacionalDisplay.tsx
// =========================================================
// Reutiliza infraestrutura existente:
// - GoogleSpeechWebSocket (mesmo que VoiceAssistant)
// - /api/voice/tts (TTS existente)
// - GOOGLE_API_KEY configurado
// =========================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Send, Mic, X, Plus, Trash2 } from 'lucide-react';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket'; // ✅ REUTILIZAR

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
  playText: (text: string) => Promise<void>; // ✅ REUTILIZAR TTS existente
}

export default function FichaConversacionalDisplay({
  data,
  onClose,
  theme = 'dark',
  playText, // ✅ TTS vem do VoiceAssistant
}: FichaConversacionalDisplayProps) {
  const { companyId, fichaType = 'produto' } = data;
  const isFichaPreparo = fichaType === 'preparo';
  const isDark = theme === 'dark';
  const supabase = createClient();

  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fichaPreview, setFichaPreview] = useState<FichaPreview>({
    nome: '',
    categoria: '',
    rendimento_qtd: 1,
    rendimento_unid: 'unidades',
    itens: [],
  });
  
  // Estados de voz (Google Speech WebSocket)
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const isActiveRef = useRef(true);

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
  // MENSAGEM INICIAL DA IA
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const mensagemInicial = isFichaPreparo
      ? 'Olá! Vamos criar uma ficha de preparo. Me diga o nome do ingrediente que você quer produzir e os ingredientes necessários. Por exemplo: "Frango desfiado usando 1kg de frango inteiro"'
      : 'Olá! Vamos criar uma ficha de produção. Me diga o nome do produto e os ingredientes. Por exemplo: "Coxinha de frango com 200g de frango desfiado, 300g de farinha e 2 ovos"';

    const msg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: mensagemInicial,
      timestamp: new Date(),
    };

    setMessages([msg]);
    playText(mensagemInicial).catch(() => {});

    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ══════════════════════════════════════════════════════
  // GOOGLE SPEECH WEBSOCKET (100% IGUAL AO VOICEASSISTANT)
  // ══════════════════════════════════════════════════════
  async function iniciarGravacao() {
    if (!isActiveRef.current) return;

    try {
      // ✅ Configuração IDÊNTICA ao VoiceAssistantWithWakeWord
      const vadConfig = {
        volumeThreshold: 0.015,
        silenceThreshold: 120,
      };

      console.log('🎤 [Modal Conversacional] Iniciando Google Speech...');

      if (googleSpeechRef.current) {
        googleSpeechRef.current.stopRecording();
        googleSpeechRef.current.disconnect();
      }

      googleSpeechRef.current = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          console.log(`📝 [Modal] Transcrição: "${text}" (final: ${isFinal})`);
          
          if (isFinal && text.trim()) {
            // ✅ Quando finalizar a transcrição, enviar automaticamente
            pararGravacao();
            processarMensagem(text.trim());
          }
        },
        onError: (err) => {
          console.error('❌ [Modal] Erro Google Speech:', err);
          setIsRecording(false);
        },
        onStatusChange: (status) => {
          setIsRecording(status === 'recording');
          if (status !== 'recording') {
            setAudioLevel(0);
          }
        },
        onVolumeChange: (level) => {
          setAudioLevel(level);
        },
        ...vadConfig,
      });

      await googleSpeechRef.current.connect();
      await googleSpeechRef.current.startRecording();
      setIsRecording(true);
      console.log('✅ [Modal] Google Speech iniciado (VAD Ativo)');
    } catch (err) {
      console.error('❌ [Modal] Erro ao iniciar gravação:', err);
      alert('Erro ao acessar microfone. Verifique as permissões.');
      setIsRecording(false);
    }
  }

  function pararGravacao() {
    if (googleSpeechRef.current && isRecording) {
      googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
      setIsRecording(false);
      setAudioLevel(0);
      console.log('🛑 [Modal] Gravação parada');
    }
  }

  function cleanup() {
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }
  }

  // ══════════════════════════════════════════════════════
  // PROCESSAMENTO DE MENSAGEM VIA GPT-4o
  // ══════════════════════════════════════════════════════
  const processarMensagem = async (textoUsuario: string) => {
    // Adicionar mensagem do usuário
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textoUsuario,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Montar contexto
      const conversaAtual = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      const fichaAtual = JSON.stringify(fichaPreview, null, 2);

      // Prompt para o GPT
      const prompt = `Você é um assistente especializado em criar fichas de produção para restaurantes e lanchonetes no Brasil.

CONTEXTO DA CONVERSA:
${conversaAtual}

FICHA ATUAL:
${fichaAtual}

TIPO DE FICHA: ${isFichaPreparo ? 'Ficha de Preparo (produz um ingrediente)' : 'Produto Final (será vendido)'}

INSTRUÇÕES:
1. Extraia informações do que o usuário disse
2. Atualize a ficha com as novas informações
3. Estime preços de ingredientes brasileiros se necessário (em R$/kg ou R$/L)
4. Normalize unidades (kg, g, L, ml, unidade, dúzia)
5. Responda de forma natural e amigável
6. Se algo não estiver claro, pergunte

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`):
{
  "ficha": {
    "nome": "string",
    "categoria": "string",
    "rendimento_qtd": number,
    "rendimento_unid": "string",
    "preco_venda": number ou null,
    "itens": [
      {
        "id": "temp-timestamp",
        "nome": "string",
        "quantidade": number,
        "unidade": "kg|g|L|ml|unidade|dúzia",
        "preco_unitario": number,
        "perda_percentual": number,
        "preco_estimado": boolean
      }
    ]
  },
  "resposta": "string - mensagem amigável ao usuário",
  "completo": boolean - true se a ficha está pronta para salvar
}

IMPORTANTE: Sempre estime preços brasileiros realistas. Exemplos:
- Farinha de trigo: R$ 5,00/kg
- Frango: R$ 15,00/kg
- Açúcar: R$ 3,50/kg
- Leite: R$ 4,00/L
- Ovos: R$ 0,50/unidade`;

      // Chamar API da Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      const conteudo = data.content[0].text;

      // Limpar possíveis backticks
      const jsonLimpo = conteudo.replace(/```json\n?|\n?```/g, '').trim();
      const resultado = JSON.parse(jsonLimpo);

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

      // Falar a resposta usando TTS existente
      playText(resultado.resposta).catch(() => {});

      // Se completo, oferecer salvar
      if (resultado.completo && fichaPreview.nome && fichaPreview.itens.length > 0) {
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
  // SALVAR FICHA
  // ══════════════════════════════════════════════════════
  const salvarFicha = async () => {
    if (!fichaPreview.nome || fichaPreview.itens.length === 0) {
      alert('A ficha precisa ter nome e pelo menos um ingrediente');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Criar a ficha
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

      // 2. Cadastrar ingredientes novos
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

      // 3. Adicionar itens da ficha
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

      // 4. Aguardar trigger recalcular
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Buscar ficha completa
      const { data: fichaCompleta } = await supabase
        .from('producao_fichas')
        .select('custo_total, preco_venda_sugerido')
        .eq('id', fichaData.id)
        .single();

      // Mensagem de sucesso
      const msgSucesso: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Ficha "${fichaPreview.nome}" salva com sucesso! Custo total: R$ ${fichaCompleta?.custo_total.toFixed(2)}. ${isFichaPreparo ? 'O ingrediente foi criado automaticamente.' : `Preço sugerido: R$ ${fichaCompleta?.preco_venda_sugerido.toFixed(2)}.`} Quer criar outra ficha?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msgSucesso]);
      
      playText(msgSucesso.content).catch(() => {});

      // Reset preview
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

  // ══════════════════════════════════════════════════════
  // REMOVER INGREDIENTE
  // ══════════════════════════════════════════════════════
  const removerIngrediente = (id: string) => {
    setFichaPreview(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== id),
    }));
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        background: C.bg,
        borderRadius: '16px',
        border: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: C.text, marginBottom: '4px' }}>
              {isFichaPreparo ? '⚗️ Nova Ficha de Preparo' : '📋 Nova Ficha de Produção'}
            </h2>
            <p style={{ fontSize: '13px', color: C.textMuted }}>
              Converse comigo para criar sua ficha
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: C.textMuted,
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo - 2 colunas */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '1px',
          background: C.border,
          overflow: 'hidden',
        }}>
          
          {/* COLUNA ESQUERDA - CHAT */}
          <div style={{
            background: C.bgChat,
            display: 'flex',
            flexDirection: 'column',
          }}>
            
            {/* Mensagens */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                    color: msg.role === 'user' ? 'white' : C.text,
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: C.assistantBubble,
                    color: C.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '16px',
              borderTop: `1px solid ${C.border}`,
              background: C.bg,
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                
                {/* Botão de Microfone */}
                {!inputText.trim() && (
                  <button
                    onMouseDown={iniciarGravacao}
                    onMouseUp={pararGravacao}
                    onMouseLeave={pararGravacao}
                    onTouchStart={iniciarGravacao}
                    onTouchEnd={pararGravacao}
                    disabled={isProcessing}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isRecording 
                        ? `rgba(239, 68, 68, ${0.2 + audioLevel * 0.8})` 
                        : C.accent,
                      border: 'none',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'all 0.1s ease',
                      transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                )}

                {/* Input */}
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
                  placeholder="Digite sua mensagem ou segure o microfone..."
                  disabled={isProcessing || isRecording}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: C.bgSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: '24px',
                    color: C.text,
                    fontSize: '14px',
                  }}
                />

                {/* Botão Enviar */}
                {inputText.trim() && (
                  <button
                    onClick={enviarMensagem}
                    disabled={isProcessing}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: C.accent,
                      border: 'none',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      opacity: isProcessing ? 0.5 : 1,
                    }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>

              {isRecording && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#ef4444',
                  textAlign: 'center',
                }}>
                  🔴 Gravando... Solte para enviar
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - PREVIEW */}
          <div style={{
            background: C.bg,
            overflowY: 'auto',
            padding: '20px',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: C.text,
              marginBottom: '16px',
            }}>
              Preview da Ficha
            </h3>

            {/* Campos da ficha */}
            {fichaPreview.nome && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Nome</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>{fichaPreview.nome}</div>
              </div>
            )}

            {fichaPreview.categoria && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Categoria</div>
                <div style={{ fontSize: '14px', color: C.text }}>{fichaPreview.categoria}</div>
              </div>
            )}

            {fichaPreview.rendimento_qtd > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Rendimento</div>
                <div style={{ fontSize: '14px', color: C.text }}>
                  {fichaPreview.rendimento_qtd} {fichaPreview.rendimento_unid}
                </div>
              </div>
            )}

            {/* Ingredientes */}
            {fichaPreview.itens.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>
                  Ingredientes ({fichaPreview.itens.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fichaPreview.itens.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        background: C.bgSecondary,
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: C.text }}>
                          {item.nome}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
                          {item.quantidade}{item.unidade} • R$ {item.preco_unitario?.toFixed(2)}/{item.unidade}
                          {item.preco_estimado && (
                            <span style={{ color: C.accent, marginLeft: '4px' }}>
                              (estimado)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removerIngrediente(item.id)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: C.textMuted,
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isFichaPreparo && fichaPreview.preco_venda && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Preço de Venda</div>
                <div style={{ fontSize: '14px', color: C.text, fontFamily: 'monospace' }}>
                  R$ {fichaPreview.preco_venda.toFixed(2)}
                </div>
              </div>
            )}

            {/* Botão Salvar */}
            {fichaPreview.nome && fichaPreview.itens.length > 0 && (
              <button
                onClick={salvarFicha}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: C.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '20px',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Salvar Ficha
                  </>
                )}
              </button>
            )}

            {/* Placeholder */}
            {!fichaPreview.nome && fichaPreview.itens.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: C.textMuted,
                fontSize: '14px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
                  💬
                </div>
                <p>
                  A ficha vai aparecer aqui conforme você conversa com o assistente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
