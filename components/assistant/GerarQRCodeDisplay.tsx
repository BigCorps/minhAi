'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// ─── Ícones inline (sem lucide-react) ────────────────────────────────────────

function IconX({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconMic({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function IconDownload({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconMail({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconRefresh({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}
function IconQr({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="5" y="5" width="3" height="3" />
      <rect x="16" y="5" width="3" height="3" /><rect x="5" y="16" width="3" height="3" />
      <path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" /><path d="M21 14v3" />
    </svg>
  );
}
function IconSend({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'input' | 'generating' | 'result' | 'sending_email' | 'error';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPENING_TEXT = 'Gerar QR Code. Diga ou digite o texto ou link que deseja converter em QR Code.';

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// ─── Sub-componente VoiceHint ─────────────────────────────────────────────────

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: isDark ? 'rgba(51,65,85,0.5)' : '#f9fafb', color: isDark ? '#94a3b8' : '#6b7280' }}
    >
      <IconMic className="w-3.5 h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {commands.map(cmd => (
          <span
            key={cmd}
            className="px-1.5 py-0.5 rounded font-mono text-[11px]"
            style={{ background: isDark ? '#475569' : '#e5e7eb', color: isDark ? '#93c5fd' : '#1d4ed8' }}
          >
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GerarQRCodeDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage,      setStage]      = useState<Stage>('input');
  const [inputText,  setInputText]  = useState('');
  const [qrDataUrl,  setQrDataUrl]  = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [emailSent,  setEmailSent]  = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Ref para ditado por voz acumulado
  const dictatingRef  = useRef(false);
  const transcriptRef = useRef('');

  // ── Falar ao abrir ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Gerar QR ────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      playText('Digite ou diga o texto para gerar o QR Code.').catch(() => {});
      return;
    }
    setStage('generating');
    setErrorMsg(null);

    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(trimmed, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
      setStage('result');
      playText('QR Code gerado! Diga "baixar" para salvar ou "email" para enviar.').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar QR Code.');
      setStage('error');
      playText('Erro ao gerar o QR Code. Tente novamente.').catch(() => {});
    }
  }, [playText]);

  // ── Download PNG ────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${Date.now()}.png`;
    link.click();
    playText('QR Code baixado.').catch(() => {});
  }, [qrDataUrl, playText]);

  // ── Enviar email ────────────────────────────────────────────────────────────

  const handleSendEmail = useCallback(async () => {
    if (!qrDataUrl || sendingEmail) return;
    setSendingEmail(true);
    setEmailSent(false);

    try {
      // Buscar email do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) throw new Error('Usuário sem email cadastrado.');

      // Converter dataUrl em base64 puro
      const base64 = qrDataUrl.split(',')[1];

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: data.companyId,
          to: email,
          subject: 'Seu QR Code — eAi',
          body: `<p>Segue o QR Code gerado pelo assistente eAi.</p><p><strong>Conteúdo:</strong> ${inputText}</p><br><img src="${qrDataUrl}" alt="QR Code" width="250" />`,
          attachments: [
            { filename: 'qrcode.png', content: base64, encoding: 'base64', contentType: 'image/png' },
          ],
        },
      });
      if (error) throw new Error(error.message);

      setEmailSent(true);
      playText('QR Code enviado para o seu email.').catch(() => {});
    } catch (err: any) {
      playText('Não foi possível enviar o email. Tente novamente.').catch(() => {});
    } finally {
      setSendingEmail(false);
    }
  }, [qrDataUrl, sendingEmail, supabase, data.companyId, inputText, playText]);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setQrDataUrl(null);
    setErrorMsg(null);
    setEmailSent(false);
    transcriptRef.current = '';
    dictatingRef.current = false;
    playText('Digite ou diga o novo texto para o QR Code.').catch(() => {});
  }, [playText]);

  // ── Voz ─────────────────────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      // Universais
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {}); return;
      }

      // Resultado
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar', 'baixar qr', 'baixar qrcode'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['email', 'enviar email', 'manda email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendEmail(); return;
        }
        if (['novo', 'gerar outro', 'outro qr', 'nova consulta', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        return;
      }

      // Erro
      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        return;
      }

      // Input — comandos especiais
      if (stage === 'input') {
        if (['gerar', 'criar qr', 'criar qrcode', 'gerar qr', 'confirmar', 'confirma', 'ok'].some(c => t.includes(c))) {
          if (inputText.trim()) { handleGenerate(inputText); return; }
          playText('Primeiro diga o texto para o QR Code.').catch(() => {}); return;
        }
        if (['limpar', 'apagar', 'limpa'].some(c => t.includes(c))) {
          setInputText('');
          transcriptRef.current = '';
          playText('Texto apagado.').catch(() => {}); return;
        }

        // Ditado: acumula o transcript como texto
        const END_TRIGGERS = ['pronto', 'fim', 'acabou', 'terminou', 'concluir'];
        const isEnd = END_TRIGGERS.some(e => t === e || t.endsWith(e));
        if (isEnd) {
          let final = transcriptRef.current;
          END_TRIGGERS.forEach(e => {
            final = final.replace(new RegExp(`\\s*${e}\\s*$`, 'gi'), '');
          });
          final = final.trim();
          transcriptRef.current = final;
          setInputText(final);
          if (final) {
            playText('Texto registrado. Diga "gerar" para criar o QR Code.').catch(() => {});
          }
          return;
        }

        // Acumular texto ditado
        transcriptRef.current = (transcriptRef.current + ' ' + transcript).trim();
        setInputText(transcriptRef.current);
      }
    },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  const BG    = isDark ? '#1e293b' : '#ffffff';
  const BORDER = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb';
  const TEXT  = isDark ? '#f1f5f9' : '#111827';
  const SUB   = isDark ? '#94a3b8' : '#6b7280';
  const INPUT_BG = isDark ? '#0f172a' : '#f9fafb';
  const INPUT_BORDER = isDark ? '#334155' : '#d1d5db';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: BG, border: BORDER }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <IconQr className="w-5 h-5" style={{ color: '#3b82f6' } as React.CSSProperties} />
            <h2 className="text-lg font-bold" style={{ color: TEXT }}>Gerar QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: SUB }}
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stage: input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: SUB }}>
              Digite ou dite o texto, URL ou qualquer conteúdo para gerar o QR Code.
            </p>
            <textarea
              className="w-full rounded-xl px-3 py-3 text-sm resize-none outline-none transition-colors"
              style={{
                background: INPUT_BG,
                border: `1px solid ${INPUT_BORDER}`,
                color: TEXT,
                minHeight: 90,
              }}
              placeholder="Ex: https://meusite.com.br"
              value={inputText}
              onChange={e => { setInputText(e.target.value); transcriptRef.current = e.target.value; }}
            />
            <button
              onClick={() => handleGenerate(inputText)}
              disabled={!inputText.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: inputText.trim() ? '#2563eb' : (isDark ? '#1e3a5f' : '#bfdbfe'),
                color: inputText.trim() ? '#ffffff' : (isDark ? '#60a5fa' : '#3b82f6'),
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconQr className="w-4 h-4" />
              Gerar QR Code
            </button>
            <VoiceHint commands={['"gerar"', '"limpar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Stage: generating ── */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: SUB }}>Gerando QR Code...</p>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && qrDataUrl && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="p-3 rounded-2xl"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code gerado" width={220} height={220} className="rounded-lg" />
            </div>

            {inputText && (
              <p
                className="text-xs text-center truncate max-w-full px-2"
                style={{ color: SUB }}
              >
                {inputText.length > 60 ? inputText.slice(0, 60) + '…' : inputText}
              </p>
            )}

            <div className="flex gap-2 w-full">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#2563eb', color: '#ffffff' }}
              >
                <IconDownload className="w-4 h-4" />
                Baixar PNG
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || emailSent}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: emailSent ? (isDark ? '#166534' : '#dcfce7') : (isDark ? '#1e3a5f' : '#eff6ff'),
                  color: emailSent ? (isDark ? '#86efac' : '#166534') : (isDark ? '#60a5fa' : '#2563eb'),
                  cursor: sendingEmail || emailSent ? 'default' : 'pointer',
                  opacity: sendingEmail ? 0.7 : 1,
                }}
              >
                {sendingEmail
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <IconMail className="w-4 h-4" />}
                {emailSent ? 'Enviado!' : 'Enviar email'}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ color: SUB, background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
            >
              <IconRefresh className="w-3.5 h-3.5" />
              Gerar novo QR Code
            </button>

            <VoiceHint commands={['"baixar"', '"email"', '"novo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div
              className="px-3 py-3 rounded-xl text-sm"
              style={{ background: isDark ? 'rgba(127,29,29,0.3)' : '#fef2f2', border: `1px solid ${isDark ? '#b91c1c' : '#fecaca'}`, color: isDark ? '#fca5a5' : '#dc2626' }}
            >
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#2563eb', color: '#ffffff' }}
            >
              <IconRefresh className="w-4 h-4" />
              Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
