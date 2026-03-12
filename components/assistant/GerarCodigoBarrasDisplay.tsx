'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// ─── Ícones inline (sem lucide-react) ────────────────────────────────────────

function SvgX({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SvgMic({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function SvgDownload({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function SvgMail({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function SvgRefresh({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}
function SvgBarcode({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v3M7 5v3M11 5v3M15 5v3M19 5v3M21 5v3" />
      <path d="M3 9v7M7 9v7M11 9v7M15 9v7M19 9v7M21 9v7" />
      <path d="M3 16v3M7 16v3M11 16v3M15 16v3M19 16v3M21 16v3" />
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage  = 'input' | 'generating' | 'result' | 'error';
type Format = 'CODE128' | 'EAN13' | 'CODE39';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPENING_TEXT = 'Gerar código de barras. Diga ou digite o texto ou número. Você pode escolher o formato: Code 128, EAN 13 ou Code 39.';

const FORMAT_OPTIONS: { value: Format; label: string; hint: string }[] = [
  { value: 'CODE128', label: 'Code 128', hint: 'Texto e números — uso geral' },
  { value: 'EAN13',   label: 'EAN-13',   hint: 'Apenas 12 dígitos numéricos' },
  { value: 'CODE39',  label: 'Code 39',  hint: 'Letras maiúsculas e números' },
];

const FORMAT_VOICE_MAP: Record<string, Format> = {
  'code 128': 'CODE128', 'code128': 'CODE128', 'cento e vinte oito': 'CODE128', 'geral': 'CODE128',
  'ean': 'EAN13', 'ean 13': 'EAN13', 'ean13': 'EAN13', 'ean treze': 'EAN13',
  'code 39': 'CODE39', 'code39': 'CODE39', 'trinta e nove': 'CODE39',
};

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// ─── VoiceHint ────────────────────────────────────────────────────────────────

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: isDark ? 'rgba(51,65,85,0.5)' : '#f9fafb', color: isDark ? '#94a3b8' : '#6b7280' }}
    >
      <SvgMic className="w-3.5 h-3.5 shrink-0" />
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

export default function GerarCodigoBarrasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage,        setStage]        = useState<Stage>('input');
  const [inputText,    setInputText]    = useState('');
  const [format,       setFormat]       = useState<Format>('CODE128');
  const [barcodeUrl,   setBarcodeUrl]   = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [emailSent,    setEmailSent]    = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const transcriptRef = useRef('');

  // ── Falar ao abrir ──────────────────────────────────────────────────────────

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Validação ───────────────────────────────────────────────────────────────

  const validateForFormat = (text: string, fmt: Format): string | null => {
    if (!text.trim()) return 'Digite o conteúdo do código de barras.';
    if (fmt === 'EAN13') {
      const digits = text.replace(/\D/g, '');
      if (digits.length !== 12 && digits.length !== 13)
        return 'EAN-13 requer exatamente 12 dígitos numéricos.';
    }
    if (fmt === 'CODE39') {
      if (!/^[A-Z0-9 \-\.$/+%]+$/i.test(text))
        return 'Code 39 aceita apenas letras maiúsculas, números e os caracteres: - . $ / + %';
    }
    return null;
  };

  // ── Gerar ───────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (text: string, fmt: Format) => {
    const validationError = validateForFormat(text, fmt);
    if (validationError) {
      setErrorMsg(validationError);
      setStage('error');
      playText(validationError).catch(() => {});
      return;
    }

    setStage('generating');
    setErrorMsg(null);

    try {
      const JsBarcode = (await import('jsbarcode')).default;
      const canvas = document.createElement('canvas');
      const value  = fmt === 'EAN13' ? text.replace(/\D/g, '').padStart(12, '0') : text.toUpperCase();

      JsBarcode(canvas, value, {
        format: fmt,
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        margin: 16,
        background: '#ffffff',
        lineColor: '#000000',
        font: 'monospace',
      });

      setBarcodeUrl(canvas.toDataURL('image/png'));
      setStage('result');
      playText('Código de barras gerado! Diga "baixar" para salvar ou "email" para enviar.').catch(() => {});
    } catch (err: any) {
      const msg = err.message?.includes('is not a valid') || err.message?.includes('invalid')
        ? `Valor inválido para o formato ${fmt}. Verifique o conteúdo.`
        : (err.message ?? 'Erro ao gerar código de barras.');
      setErrorMsg(msg);
      setStage('error');
      playText('Erro ao gerar o código de barras. Verifique o conteúdo.').catch(() => {});
    }
  }, [playText]); // eslint-disable-line

  // ── Download ────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!barcodeUrl) return;
    const link = document.createElement('a');
    link.href = barcodeUrl;
    link.download = `barcode_${format}_${Date.now()}.png`;
    link.click();
    playText('Código de barras baixado.').catch(() => {});
  }, [barcodeUrl, format, playText]);

  // ── Email ───────────────────────────────────────────────────────────────────

  const handleSendEmail = useCallback(async () => {
    if (!barcodeUrl || sendingEmail) return;
    setSendingEmail(true);
    setEmailSent(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) throw new Error('Usuário sem email cadastrado.');

      const base64 = barcodeUrl.split(',')[1];

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: data.companyId,
          to: email,
          subject: 'Seu Código de Barras — eAi',
          body: `<p>Segue o código de barras gerado pelo assistente eAi.</p><p><strong>Formato:</strong> ${format}</p><p><strong>Conteúdo:</strong> ${inputText}</p><br><img src="${barcodeUrl}" alt="Código de barras" />`,
          attachments: [
            { filename: `barcode_${format}.png`, content: base64, encoding: 'base64', contentType: 'image/png' },
          ],
        },
      });
      if (error) throw new Error(error.message);

      setEmailSent(true);
      playText('Código de barras enviado para o seu email.').catch(() => {});
    } catch {
      playText('Não foi possível enviar o email. Tente novamente.').catch(() => {});
    } finally {
      setSendingEmail(false);
    }
  }, [barcodeUrl, sendingEmail, supabase, data.companyId, format, inputText, playText]);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setFormat('CODE128');
    setBarcodeUrl(null);
    setErrorMsg(null);
    setEmailSent(false);
    transcriptRef.current = '';
    playText('Digite ou diga o novo conteúdo para o código de barras.').catch(() => {});
  }, [playText]);

  // ── Voz ─────────────────────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) { onClose(); return; }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {}); return;
      }

      for (const [trigger, fmt] of Object.entries(FORMAT_VOICE_MAP)) {
        if (t.includes(trigger)) {
          setFormat(fmt);
          const label = FORMAT_OPTIONS.find(f => f.value === fmt)?.label ?? fmt;
          playText(`Formato ${label} selecionado.`).catch(() => {}); return;
        }
      }

      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) { handleDownload(); return; }
        if (['email', 'enviar email', 'manda email'].some(c => t.includes(c))) { handleSendEmail(); return; }
        if (['novo', 'gerar outro', 'tentar novamente'].some(c => t.includes(c))) { handleReset(); return; }
        return;
      }

      if (stage === 'error') {
        if (['tentar', 'novamente'].some(c => t.includes(c))) { handleReset(); return; }
        return;
      }

      if (stage === 'input') {
        if (['gerar', 'criar', 'confirmar', 'ok'].some(c => t.includes(c))) {
          if (inputText.trim()) { handleGenerate(inputText, format); return; }
          playText('Primeiro diga o conteúdo para o código de barras.').catch(() => {}); return;
        }
        if (['limpar', 'apagar'].some(c => t.includes(c))) {
          setInputText(''); transcriptRef.current = '';
          playText('Texto apagado.').catch(() => {}); return;
        }

        const END_TRIGGERS = ['pronto', 'fim', 'acabou', 'terminou', 'concluir'];
        const isEnd = END_TRIGGERS.some(e => t === e || t.endsWith(e));
        if (isEnd) {
          let final = transcriptRef.current;
          END_TRIGGERS.forEach(e => { final = final.replace(new RegExp(`\\s*${e}\\s*$`, 'gi'), ''); });
          final = final.trim();
          transcriptRef.current = final;
          setInputText(final);
          if (final) playText('Conteúdo registrado. Diga "gerar" para criar o código de barras.').catch(() => {});
          return;
        }

        transcriptRef.current = (transcriptRef.current + ' ' + transcript).trim();
        setInputText(transcriptRef.current);
      }
    },
  });

  // ─── Cores ───────────────────────────────────────────────────────────────────

  const BG           = isDark ? '#1e293b' : '#ffffff';
  const BORDER       = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb';
  const TEXT         = isDark ? '#f1f5f9' : '#111827';
  const SUB          = isDark ? '#94a3b8' : '#6b7280';
  const INPUT_BG     = isDark ? '#0f172a' : '#f9fafb';
  const INPUT_BORDER = isDark ? '#334155' : '#d1d5db';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: BG, border: BORDER }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <SvgBarcode className="w-5 h-5" style={{ color: '#3b82f6' } as React.CSSProperties} />
            <h2 className="text-lg font-bold" style={{ color: TEXT }}>Gerar Código de Barras</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: SUB }}>
            <SvgX className="w-5 h-5" />
          </button>
        </div>

        {/* ── input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium" style={{ color: SUB }}>Formato</p>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className="flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: format === opt.value ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'),
                      color: format === opt.value ? '#ffffff' : SUB,
                      border: `1px solid ${format === opt.value ? '#2563eb' : (isDark ? '#334155' : '#e5e7eb')}`,
                    }}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className="text-[10px] opacity-70 mt-0.5 leading-tight text-center">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium" style={{ color: SUB }}>
                Conteúdo
                {format === 'EAN13'  && <span style={{ color: '#f59e0b' }}> — 12 dígitos numéricos</span>}
                {format === 'CODE39' && <span style={{ color: '#f59e0b' }}> — maiúsculas e números</span>}
              </p>
              <input
                className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
                style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}
                placeholder={
                  format === 'EAN13'  ? 'Ex: 789012345678' :
                  format === 'CODE39' ? 'Ex: PRODUTO-001' :
                  'Ex: 7890123456789 ou PRODUTO-ABC'
                }
                value={inputText}
                onChange={e => { setInputText(e.target.value); transcriptRef.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter') handleGenerate(inputText, format); }}
              />
            </div>

            <button
              onClick={() => handleGenerate(inputText, format)}
              disabled={!inputText.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: inputText.trim() ? '#2563eb' : (isDark ? '#1e3a5f' : '#bfdbfe'),
                color: inputText.trim() ? '#ffffff' : (isDark ? '#60a5fa' : '#3b82f6'),
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <SvgBarcode className="w-4 h-4" />
              Gerar Código de Barras
            </button>

            <VoiceHint commands={['"gerar"', '"code 128"', '"ean 13"', '"code 39"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── generating ── */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: SUB }}>Gerando código de barras...</p>
          </div>
        )}

        {/* ── result ── */}
        {stage === 'result' && barcodeUrl && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-full rounded-2xl overflow-hidden flex items-center justify-center p-3"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barcodeUrl} alt="Código de barras gerado" className="max-w-full" style={{ maxHeight: 120 }} />
            </div>

            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium"
                style={{ background: isDark ? '#1e3a5f' : '#eff6ff', color: isDark ? '#60a5fa' : '#2563eb' }}
              >
                {FORMAT_OPTIONS.find(f => f.value === format)?.label}
              </span>
              {inputText && (
                <span className="text-xs truncate max-w-[200px]" style={{ color: SUB }}>{inputText}</span>
              )}
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#2563eb', color: '#ffffff' }}
              >
                <SvgDownload className="w-4 h-4" />Baixar PNG
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
                  : <SvgMail className="w-4 h-4" />}
                {emailSent ? 'Enviado!' : 'Enviar email'}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium"
              style={{ color: SUB, background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
            >
              <SvgRefresh className="w-3.5 h-3.5" />Gerar novo código
            </button>

            <VoiceHint commands={['"baixar"', '"email"', '"novo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div
              className="px-3 py-3 rounded-xl text-sm"
              style={{
                background: isDark ? 'rgba(127,29,29,0.3)' : '#fef2f2',
                border: `1px solid ${isDark ? '#b91c1c' : '#fecaca'}`,
                color: isDark ? '#fca5a5' : '#dc2626',
              }}
            >
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#2563eb', color: '#ffffff' }}
            >
              <SvgRefresh className="w-4 h-4" />Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
