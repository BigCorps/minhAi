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

interface OrcamentoDisplayProps {
  data: {
    companyId: string;
    transcriptInicial?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

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

const CONFIRMACAO_REGEX = /\b(sim|pode|confirma|salvar|gerar|quero|ok|claro|vai|bora|gera)\b/i;
const ORCAMENTO_VAZIO: OrcamentoContext = {
  cliente: { nome: '', contato: '' },
  itens: [],
  total: 0,
  condicoes: '',
};

export default function OrcamentoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: OrcamentoDisplayProps) {
  const { companyId, transcriptInicial } = data;
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
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo_url?: string; theme_color?: string } | null>(null);

  // PDF
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

  const playTextComMute = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    return playText(text);
  }, [playText]);

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
  }, [playTextComMute]);

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    bgChat: isDark ? '#0f172a' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#f97316',
    success: '#22c55e',
    userBubble: isDark ? '#f97316' : '#ea580c',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

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

    // Se veio com transcript inicial (ex: "quero um orçamento de X"), processa direto
    if (transcriptInicial && transcriptInicial.trim().length > 5) {
      setTimeout(() => processarMensagem(transcriptInicial), 800);
    }
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
    }
  }, [orcamentoContext, companyInfo]);

  const baixarPdf = () => {
    if (!pdfDataUrl) return;
    const a = document.createElement('a');
    a.href = pdfDataUrl;
    a.download = `orcamento-${companyInfo?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'empresa'}-${Date.now()}.pdf`;
    a.click();
  };

  // ── Gravação de voz ───────────────────────────────────────
  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        await transcreverAudio(audioBlob);
      } catch {}
      finally { setIsTranscribing(false); }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  const transcreverAudio = async (audioBlob: Blob) => {
    try {
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
    }
  };

  // ── Processar mensagem ────────────────────────────────────
  const processarMensagem = async (textoUsuario: string) => {
    // Se aguardando confirmação de PDF
    if (aguardandoConfirmacao) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: textoUsuario,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      if (CONFIRMACAO_REGEX.test(textoUsuario)) {
        const msgGerandoPdf: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Gerando seu PDF...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msgGerandoPdf]);
        playTextSafe('Gerando o PDF do orçamento!');
        setAguardandoConfirmacao(false);
        await gerarPdf();
        return;
      } else {
        // Não confirmou — volta a conversar
        setAguardandoConfirmacao(false);
        setCompleto(false);
        // Cai no fluxo normal abaixo
      }
    }

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

      // Salvar companyInfo na primeira resposta
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
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema. Pode repetir?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarMensagem(inputText.trim());
    setInputText('');
  };

  // ── Sub-componentes ───────────────────────────────────────
  const BotaoMutar = () => (
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

  const InputArea = () => (
    <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isTranscribing}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none', cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
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
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder={aguardandoConfirmacao ? 'Diga "sim" para gerar o PDF...' : 'Digite sua mensagem...'}
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{
            flex: 1, padding: '12px 16px', background: C.bgSecondary,
            border: `1px solid ${aguardandoConfirmacao ? C.accent : C.border}`,
            borderRadius: '24px', color: C.text, fontSize: '14px',
            transition: 'border-color 0.2s',
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
        <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent, textAlign: 'center' }}>Transcrevendo...</div>
      )}
    </div>
  );

  const PreviewOrcamento = () => (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <FileText style={{ width: '20px', height: '20px', color: C.accent }} />
        <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>Preview do Orçamento</span>
      </div>

      {/* PDF gerado */}
      {pdfDataUrl && (
        <div style={{ marginBottom: '16px' }}>
          <iframe
            src={pdfDataUrl}
            style={{
              width: '100%', height: '400px', border: `1px solid ${C.border}`,
              borderRadius: '8px', marginBottom: '8px',
            }}
            title="Preview do PDF"
          />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.accent, marginBottom: '16px' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span style={{ fontSize: '13px' }}>Gerando PDF...</span>
        </div>
      )}

      {/* Preview estruturado — só quando completo ou tem itens */}
      {!pdfDataUrl && orcamentoContext.itens.length > 0 && (
        <>
          {/* Cliente */}
          {(orcamentoContext.cliente.nome || orcamentoContext.cliente.contato) && (
            <div style={{
              padding: '12px', background: C.bgSecondary, borderRadius: '8px', marginBottom: '12px',
            }}>
              <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</div>
              {orcamentoContext.cliente.nome && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{orcamentoContext.cliente.nome}</div>
              )}
              {orcamentoContext.cliente.contato && (
                <div style={{ fontSize: '12px', color: C.textMuted }}>{orcamentoContext.cliente.contato}</div>
              )}
            </div>
          )}

          {/* Itens */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{item.descricao}</div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>
                    {item.qtd}x · R$ {Number(item.valor_unitario).toFixed(2)} cada
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.accent, whiteSpace: 'nowrap', marginLeft: '8px' }}>
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
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>TOTAL</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: C.accent }}>
              R$ {Number(orcamentoContext.total).toFixed(2)}
            </span>
          </div>

          {/* Botão gerar PDF (quando completo mas ainda não gerou) */}
          {completo && !pdfDataUrl && !isGerandoPdf && (
            <button
              onClick={gerarPdf}
              style={{
                width: '100%', padding: '12px', background: C.accent,
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <FileText className="w-4 h-4" />
              Gerar PDF
            </button>
          )}
        </>
      )}

      {/* Estado vazio */}
      {orcamentoContext.itens.length === 0 && !pdfDataUrl && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
          <FileText style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
          <p>O orçamento aparecerá aqui conforme você conversa</p>
        </div>
      )}
    </div>
  );

  const ChatArea = () => (
    <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0,
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
      <InputArea />
    </div>
  );

  // ── Render mobile ─────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '20px', height: '20px', color: C.accent }} />
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: C.text }}>Criar Orçamento</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <BotaoMutar />
            <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
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

        {/* Preview compacto mobile — só quando tem itens */}
        {orcamentoContext.itens.length > 0 && (
          <div style={{
            maxHeight: '35vh', overflowY: 'auto',
            padding: '12px 16px', background: C.bgSecondary,
            borderTop: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <PreviewOrcamento />
          </div>
        )}

        <InputArea />
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText style={{ width: '24px', height: '24px', color: C.accent }} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: C.text }}>Criar Orçamento</div>
              <div style={{ fontSize: '13px', color: C.textMuted }}>Converse para montar o orçamento</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <BotaoMutar />
            <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo 2 colunas */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px',
          gap: '1px', background: C.border, overflow: 'hidden',
        }}>
          <ChatArea />
          <div style={{ background: C.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PreviewOrcamento />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}