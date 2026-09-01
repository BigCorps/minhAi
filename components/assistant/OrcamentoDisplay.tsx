'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Loader2, Send, Mic, X, FileText, Download,
} from 'lucide-react';
import { generateOrcamentoPDF } from '@/lib/generateOrcamentoPDF';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ItemOrcamento {
  descricao: string;
  qtd: number;
  valor_unitario: number;
  subtotal: number;
}

interface OrcamentoContext {
  cliente: { nome: string; contato: string };
  itens: ItemOrcamento[];
  total: number;
  condicoes?: string;
}

interface CompanyInfo {
  name: string;
  slug?: string;
  logo_url?: string;
  theme_color?: string;
}

interface OrcamentoDisplayProps {
  data: {
    companyId: string;
    transcriptInicial?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

interface InputAreaProps {
  inputText: string;
  setInputText: (v: string) => void;
  isProcessing: boolean;
  isTranscribing: boolean;
  aguardandoConfirmacao: boolean;
  voiceRecorder: any;
  handleMicPress: () => void;
  enviarMensagem: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  C: Record<string, string>;
}

interface PreviewOrcamentoProps {
  orcamentoContext: OrcamentoContext;
  completo: boolean;
  pdfDataUrl: string | null;
  isGerandoPdf: boolean;
  gerarPdf: () => void;
  baixarPdf: () => void;
  C: Record<string, string>;
}

interface BotaoMutarProps {
  audioMutado: boolean;
  toggleMute: () => void;
  C: Record<string, string>;
}

const CONFIRMACAO_REGEX = /\b(sim|pode|confirma|salvar|gerar|quero|ok|claro|vai|bora|gera)\b/i;
const ORCAMENTO_VAZIO: OrcamentoContext = {
  cliente: { nome: '', contato: '' },
  itens: [],
  total: 0,
  condicoes: '',
};

function IconVolume() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function IconVolumeMute() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

// ── Componentes externos (evitam remount no keystroke) ────────

function BotaoMutar({ audioMutado, toggleMute, C }: BotaoMutarProps) {
  return (
    <button
      onClick={toggleMute}
      title={audioMutado ? 'Ativar áudio' : 'Desativar áudio'}
      style={{
        padding: '8px', background: 'transparent', border: 'none',
        cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent,
        opacity: audioMutado ? 0.5 : 1, transition: 'all 0.2s',
      }}
    >
      {audioMutado ? <IconVolumeMute /> : <IconVolume />}
    </button>
  );
}

function InputArea({
  inputText, setInputText, isProcessing, isTranscribing,
  aguardandoConfirmacao, voiceRecorder, handleMicPress,
  enviarMensagem, inputRef, C,
}: InputAreaProps) {
  return (
    <div style={{
      padding: '16px', borderTop: `1px solid ${C.border}`,
      background: C.bg, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isTranscribing}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none',
              cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.1s',
            }}
          >
            <Mic className={`w-5 h-5 ${voiceRecorder.isRecording ? 'animate-pulse' : ''}`} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviarMensagem();
            }
          }}
          placeholder={aguardandoConfirmacao ? 'Diga "sim" para gerar o PDF...' : 'Digite sua mensagem...'}
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{
            flex: 1, padding: '12px 16px', background: C.bgSecondary,
            border: `1px solid ${aguardandoConfirmacao ? C.accent : C.border}`,
            borderRadius: '24px', color: C.text, fontSize: '14px',
            transition: 'border-color 0.2s', outline: 'none',
          }}
        />
        {inputText.trim() && (
          <button
            onClick={enviarMensagem}
            disabled={isProcessing}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: C.accent, border: 'none',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', opacity: isProcessing ? 0.5 : 1,
            }}
          >
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
          Transcrevendo...
        </div>
      )}
    </div>
  );
}

function PreviewOrcamento({
  orcamentoContext, completo, pdfDataUrl, isGerandoPdf, gerarPdf, baixarPdf, C,
}: PreviewOrcamentoProps) {
  const temItens = orcamentoContext.itens.length > 0;

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <FileText style={{ width: '20px', height: '20px', color: C.accent }} />
        <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>Preview do Orçamento</span>
      </div>

      {/* PDF gerado — card + botão download */}
      {pdfDataUrl && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            padding: '16px', background: C.bgSecondary,
            borderRadius: '8px', marginBottom: '8px',
            display: 'flex', alignItems: 'center', gap: '12px',
            border: `1px solid ${C.accent}44`,
          }}>
            <FileText style={{ width: '32px', height: '32px', color: C.accent, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                PDF gerado com sucesso!
              </div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>
                Clique no botão abaixo para baixar
              </div>
            </div>
          </div>
          <button
            onClick={baixarPdf}
            style={{
              width: '100%', padding: '12px', background: C.success,
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      )}

      {/* Gerando PDF */}
      {isGerandoPdf && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: C.accent, marginBottom: '16px',
        }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span style={{ fontSize: '13px' }}>Gerando PDF...</span>
        </div>
      )}

      {/* Preview estruturado — só quando tem itens e PDF ainda não foi gerado */}
      {!pdfDataUrl && temItens && (
        <>
          {/* Cliente */}
          {(orcamentoContext.cliente.nome || orcamentoContext.cliente.contato) && (
            <div style={{
              padding: '12px', background: C.bgSecondary,
              borderRadius: '8px', marginBottom: '12px',
            }}>
              <div style={{
                fontSize: '10px', color: C.textMuted, marginBottom: '4px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Cliente
              </div>
              {orcamentoContext.cliente.nome && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>
                  {orcamentoContext.cliente.nome}
                </div>
              )}
              {orcamentoContext.cliente.contato && (
                <div style={{ fontSize: '12px', color: C.textMuted }}>
                  {orcamentoContext.cliente.contato}
                </div>
              )}
            </div>
          )}

          {/* Itens */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '10px', color: C.textMuted, marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Itens ({orcamentoContext.itens.length})
            </div>
            {orcamentoContext.itens.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px', background: C.bgSecondary,
                  borderRadius: '8px', marginBottom: '6px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>
                    {item.descricao}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>
                    {item.qtd}x · R$ {Number(item.valor_unitario).toFixed(2)} cada
                  </div>
                </div>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: C.accent,
                  whiteSpace: 'nowrap', marginLeft: '8px',
                }}>
                  R$ {Number(item.subtotal).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            padding: '12px 16px', background: C.accent + '22',
            borderRadius: '8px', border: `1px solid ${C.accent}44`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>TOTAL</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: C.accent }}>
              R$ {Number(orcamentoContext.total).toFixed(2)}
            </span>
          </div>
        </>
      )}

      {/* ── Botão Gerar PDF — sempre visível, estado muda conforme contexto ── */}
      {!pdfDataUrl && !isGerandoPdf && (
        <button
          onClick={completo && temItens ? gerarPdf : undefined}
          disabled={!completo || !temItens}
          title={!temItens ? 'Adicione itens ao orçamento' : !completo ? 'Conclua o orçamento para gerar o PDF' : 'Gerar PDF do orçamento'}
          style={{
            width: '100%', padding: '12px',
            background: completo && temItens ? C.accent : 'transparent',
            color: completo && temItens ? 'white' : C.textMuted,
            border: `2px solid ${completo && temItens ? C.accent : C.border}`,
            borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            cursor: completo && temItens ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: completo && temItens ? 1 : 0.45,
            transition: 'all 0.3s ease',
          }}
        >
          <FileText className="w-4 h-4" />
          {isGerandoPdf ? 'Gerando...' : 'Gerar PDF'}
        </button>
      )}

      {/* Estado vazio */}
      {!temItens && !pdfDataUrl && (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          color: C.textMuted, fontSize: '13px', marginTop: '8px',
        }}>
          <FileText style={{ width: '40px', height: '40px', margin: '0 auto 10px', opacity: 0.2 }} />
          <p>O orçamento aparecerá aqui conforme você conversa</p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function OrcamentoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: OrcamentoDisplayProps) {
  const { companyId } = data;
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const voiceRecorder = useVoiceRecorder();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const audioMutadoRef = useRef(false);

  const [orcamentoContext, setOrcamentoContext] = useState<OrcamentoContext>(ORCAMENTO_VAZIO);
  const [completo, setCompleto] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isGerandoPdf, setIsGerandoPdf] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSpokenInitialRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      return !prev;
    });
  }, []);

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

  const playTextComMute = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    return playText(text);
  }, [playText]);

  // ✅ playTextSafe com restauração de foco após TTS — igual ao FazerPedidoDisplay
  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          await playTextComMute(next);
          await new Promise(r => setTimeout(r, 300));
        } catch {}
      }
    }
    isPlayingRef.current = false;
    // ✅ Restaura foco no input após TTS terminar
    inputRef.current?.focus({ preventScroll: true });
  }, [playTextComMute]);

  // ── Mensagem inicial ──────────────────────────────────────
  useEffect(() => {
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;

    const msg = 'Olá! Vou montar seu orçamento. Me diga o que você precisa — pode incluir nome do cliente, itens e quantidades.';
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: msg,
      timestamp: new Date(),
    }]);
    playTextSafe(msg);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Gerar PDF ─────────────────────────────────────────────
  const gerarPdf = useCallback(async () => {
    if (!companyInfo) return;
    setIsGerandoPdf(true);
    try {
      const dataUrl = await generateOrcamentoPDF(orcamentoContext, companyInfo);
      setPdfDataUrl(dataUrl);
    } catch (err) {
      console.error('[ORCAMENTO PDF]', err);
    } finally {
      setIsGerandoPdf(false);
      // ✅ Restaura foco após gerar PDF
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [orcamentoContext, companyInfo]);

  const baixarPdf = useCallback(() => {
    if (!pdfDataUrl) return;
    const a = document.createElement('a');
    a.href = pdfDataUrl;
    a.download = `orcamento-${companyInfo?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'empresa'}-${Date.now()}.pdf`;
    a.click();
  }, [pdfDataUrl, companyInfo]);

  // ── Gravação de voz ───────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        const base64Audio = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        });
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (!response.ok) throw new Error();
        const { text } = await response.json();
        if (text?.trim()) processarMensagem(text.trim());
      } catch {
        alert('Erro ao transcrever. Tente digitar.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await voiceRecorder.startRecording();
    }
  }, [voiceRecorder]);

  // ── Processar mensagem ────────────────────────────────────
  const processarMensagem = useCallback(async (textoUsuario: string) => {
    // ── Bloco de confirmação de PDF — totalmente isolado ──
    if (aguardandoConfirmacao) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: textoUsuario,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      if (CONFIRMACAO_REGEX.test(textoUsuario)) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Gerando seu PDF...',
          timestamp: new Date(),
        }]);
        playTextSafe('Gerando o PDF do orçamento!');
        setAguardandoConfirmacao(false);
        await gerarPdf();
        return; // ← nunca cai no fluxo normal
      } else {
        // Negou — volta a conversar sem chamar a API
        setAguardandoConfirmacao(false);
        setCompleto(false);
        const msgVoltar: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Tudo bem! O que você gostaria de ajustar no orçamento?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msgVoltar]);
        playTextSafe(msgVoltar.content);
        return; // ← nunca cai no fluxo normal
      }
    }

    // ── Fluxo normal — chama a API ────────────────────────
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textoUsuario,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/orcamento/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          orcamento_context: orcamentoContext,
        }),
      });

      if (!response.ok) throw new Error();
      const resultado = await response.json();

      if (resultado.company && !companyInfo) {
        setCompanyInfo(resultado.company);
      }

      setOrcamentoContext(resultado.orcamento);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resultado.resposta,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      playTextSafe(resultado.resposta);

      if (resultado.completo) {
        setCompleto(true);
        setAguardandoConfirmacao(true);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema. Pode repetir?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [aguardandoConfirmacao, messages, orcamentoContext, companyId, companyInfo, gerarPdf, playTextSafe]);

  const enviarMensagem = useCallback(() => {
    if (!inputText.trim() || isProcessing) return;
    processarMensagem(inputText.trim());
    setInputText('');
  }, [inputText, isProcessing, processarMensagem]);

  // ── Render mobile ─────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: C.bg, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '20px', height: '20px', color: C.accent }} />
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: C.text }}>
              Criar Orçamento
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <BotaoMutar audioMutado={audioMutado} toggleMute={toggleMute} C={C} />
            <button
              onClick={onClose}
              style={{
                padding: '8px', background: 'transparent',
                border: 'none', cursor: 'pointer', color: C.textMuted,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0,
        }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
                background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                color: msg.role === 'user' ? 'white' : C.text,
                fontSize: '13px', lineHeight: 1.4,
              }}
            >
              {msg.content}
            </div>
          ))}
          {isProcessing && (
            <div style={{
              alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px',
              background: C.assistantBubble, color: C.text,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span style={{ fontSize: '13px' }}>Processando...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preview compacto mobile — sempre visível */}
        <div style={{
          maxHeight: '45vh', overflowY: 'auto',
          borderTop: `1px solid ${C.border}`, flexShrink: 0,
          background: C.bgSecondary,
        }}>
          <PreviewOrcamento
            orcamentoContext={orcamentoContext}
            completo={completo}
            pdfDataUrl={pdfDataUrl}
            isGerandoPdf={isGerandoPdf}
            gerarPdf={gerarPdf}
            baixarPdf={baixarPdf}
            C={C}
          />
        </div>

        <InputArea
          inputText={inputText}
          setInputText={setInputText}
          isProcessing={isProcessing}
          isTranscribing={isTranscribing}
          aguardandoConfirmacao={aguardandoConfirmacao}
          voiceRecorder={voiceRecorder}
          handleMicPress={handleMicPress}
          enviarMensagem={enviarMensagem}
          inputRef={inputRef}
          C={C}
        />
      </div>,
      document.body
    );
  }

  // ── Render desktop ────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '1200px', height: '90vh',
        background: C.bg, borderRadius: '16px',
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText style={{ width: '24px', height: '24px', color: C.accent }} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: C.text }}>
                Criar Orçamento
              </div>
              <div style={{ fontSize: '13px', color: C.textMuted }}>
                Converse para montar o orçamento
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <BotaoMutar audioMutado={audioMutado} toggleMute={toggleMute} C={C} />
            <button
              onClick={onClose}
              style={{
                padding: '8px', background: 'transparent',
                border: 'none', cursor: 'pointer', color: C.textMuted,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo 2 colunas */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px',
          gap: '1px', background: C.border, overflow: 'hidden',
        }}>
          {/* Chat */}
          <div style={{
            background: C.bgChat, display: 'flex',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0,
            }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '70%', padding: '12px 16px', borderRadius: '12px',
                    background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                    color: msg.role === 'user' ? 'white' : C.text,
                    fontSize: '14px', lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: C.assistantBubble, color: C.text,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span style={{ fontSize: '14px' }}>Processando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <InputArea
              inputText={inputText}
              setInputText={setInputText}
              isProcessing={isProcessing}
              isTranscribing={isTranscribing}
              aguardandoConfirmacao={aguardandoConfirmacao}
              voiceRecorder={voiceRecorder}
              handleMicPress={handleMicPress}
              enviarMensagem={enviarMensagem}
              inputRef={inputRef}
              C={C}
            />
          </div>

          {/* Preview — sempre visível */}
          <div style={{
            background: C.bg, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <PreviewOrcamento
              orcamentoContext={orcamentoContext}
              completo={completo}
              pdfDataUrl={pdfDataUrl}
              isGerandoPdf={isGerandoPdf}
              gerarPdf={gerarPdf}
              baixarPdf={baixarPdf}
              C={C}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
