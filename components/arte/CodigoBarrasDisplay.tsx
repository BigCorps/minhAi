'use client';

/**
 * CodigoBarrasDisplay.tsx — ArteFinal
 *
 * Adaptado de GerarCodigoBarrasDisplay (minhAi).
 * Convenções do guia v2:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de ações autenticadas
 *  - Custo escondido para anônimos
 *  - Anônimo → stage 'login' ao tentar gerar
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0] (§10)
 *  - Geração client-side via jsbarcode (sem API extra)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

const IconX = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconBarcode = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v3M7 5v3M11 5v3M15 5v3M19 5v3M21 5v3" />
    <path d="M3 9v7M7 9v7M11 9v7M15 9v7M19 9v7M21 9v7" />
    <path d="M3 16v3M7 16v3M11 16v3M15 16v3M19 16v3M21 16v3" />
  </svg>
);
const IconDownload = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconMail = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconRefresh = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
  </svg>
);
const IconSparkles = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z" /><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" />
  </svg>
);

// ─── Paletas ──────────────────────────────────────────────────────────────────

const DARK = {
  bg:          '#1a1a2e',
  surface:     '#16213e',
  border:      'rgba(255,255,255,0.08)',
  text:        '#e2e8f0',
  sub:         '#94a3b8',
  muted:       '#475569',
  accent:      '#e94560',
  blue:        '#3b82f6',
  blueDim:     '#1e3a5f',
  blueMuted:   '#60a5fa',
  green:       '#22c55e',
  greenDim:    '#166534',
  greenMuted:  '#86efac',
  red:         '#fca5a5',
  redDim:      'rgba(127,29,29,0.3)',
  redBorder:   '#b91c1c',
  input:       '#0f172a',
  inputBorder: '#334155',
  warn:        '#fbbf24',
  overlay:     'rgba(0,0,0,0.75)',
};

const LIGHT = {
  bg:          '#ffffff',
  surface:     '#f8fafc',
  border:      '#e5e7eb',
  text:        '#111827',
  sub:         '#6b7280',
  muted:       '#9ca3af',
  accent:      '#e94560',
  blue:        '#2563eb',
  blueDim:     '#eff6ff',
  blueMuted:   '#1d4ed8',
  green:       '#16a34a',
  greenDim:    '#dcfce7',
  greenMuted:  '#166534',
  red:         '#dc2626',
  redDim:      '#fef2f2',
  redBorder:   '#fecaca',
  input:       '#f9fafb',
  inputBorder: '#d1d5db',
  warn:        '#d97706',
  overlay:     'rgba(0,0,0,0.6)',
};

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Stage  = 'input' | 'generating' | 'result' | 'login' | 'error';
type Format = 'CODE128' | 'EAN13' | 'CODE39';

const CREDITS = 1;

const FORMAT_OPTIONS: { value: Format; label: string; hint: string }[] = [
  { value: 'CODE128', label: 'Code 128', hint: 'Texto e números — uso geral' },
  { value: 'EAN13',   label: 'EAN-13',   hint: 'Apenas 12 dígitos numéricos' },
  { value: 'CODE39',  label: 'Code 39',  hint: 'Maiúsculas e números' },
];

export interface CodigoBarrasDisplayProps {
  data: {
    companyId?: string;
  };
  onClose:         () => void;
  onRequireLogin?: () => void;
  theme?:          'dark' | 'light';
  playText?:       (text: string) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CodigoBarrasDisplay({
  data,
  onClose,
  onRequireLogin,
  theme = 'dark',
  playText,
}: CodigoBarrasDisplayProps) {
  const C      = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [companyId,    setCompanyId]    = useState(data.companyId ?? '');
  const [logado,       setLogado]       = useState(false);
  const [stage,        setStage]        = useState<Stage>('input');
  const [inputText,    setInputText]    = useState('');
  const [format,       setFormat]       = useState<Format>('CODE128');
  const [barcodeUrl,   setBarcodeUrl]   = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [saldo,        setSaldo]        = useState<number | null>(null);
  const [emailSent,    setEmailSent]    = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const transcriptRef = useRef('');

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogado(!!session);
    });

    playText?.('Gerar código de barras. Digite o conteúdo e escolha o formato.').catch(() => {});

    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ensure_my_arte_company lazy (§7) ─────────────────────────────────────────

  const ensureCompany = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onRequireLogin?.(); return null; }

    const { data: ensured, error } = await supabase.rpc('ensure_my_arte_company');
    if (error || !ensured) {
      setErrorMsg('Não foi possível inicializar sua conta. Tente novamente.');
      setStage('error');
      return null;
    }

    const cid = ensured as string;
    setCompanyId(cid);
    return cid;
  }, [companyId, supabase, onRequireLogin]);

  // ── Validação ────────────────────────────────────────────────────────────────

  const validate = (text: string, fmt: Format): string | null => {
    if (!text.trim()) return 'Digite o conteúdo do código de barras.';
    if (fmt === 'EAN13') {
      const digits = text.replace(/\D/g, '');
      if (digits.length !== 12 && digits.length !== 13)
        return 'EAN-13 requer exatamente 12 dígitos numéricos.';
    }
    if (fmt === 'CODE39') {
      if (!/^[A-Z0-9 \-\.\$\/\+%]+$/i.test(text))
        return 'Code 39 aceita apenas letras maiúsculas, números e os caracteres: - . $ / + %';
    }
    return null;
  };

  // ── Gerar (requer login + crédito) ───────────────────────────────────────────

  const handleGenerate = useCallback(async (text: string, fmt: Format) => {
    const validationError = validate(text, fmt);
    if (validationError) {
      setErrorMsg(validationError);
      setStage('error');
      playText?.(validationError).catch(() => {});
      return;
    }

    // Checa sessão — anônimo vai para login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStage('login'); return; }

    setStage('generating');
    setErrorMsg(null);

    try {
      // ensure_my_arte_company lazy
      let resolvedCid = companyId;
      if (!resolvedCid) {
        const found = await ensureCompany();
        if (!found) return;
        resolvedCid = found;
      }

      // Gera o barcode client-side via jsbarcode
      const JsBarcode = (await import('jsbarcode')).default;
      const canvas    = document.createElement('canvas');
      const value     = fmt === 'EAN13'
        ? text.replace(/\D/g, '').padStart(12, '0')
        : text.toUpperCase();

      JsBarcode(canvas, value, {
        format:       fmt,
        width:        2,
        height:       100,
        displayValue: true,
        fontSize:     14,
        margin:       16,
        background:   '#ffffff',
        lineColor:    '#000000',
        font:         'monospace',
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Cobrança fail-closed: depois de gerar, antes de mostrar (§5)
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_codigo_barras',
          p_credits:      CREDITS,
          p_metadata:     { conteudo: text, formato: fmt },
        }
      );
      // RPC retorna TABLE → sempre array (§10)
      const resultado = Array.isArray(raw) ? raw[0] : raw;
      if (errCobranca || !resultado?.sucesso) {
        const saldoAtual = resultado?.saldo_atual ?? 0;
        setErrorMsg(`Créditos insuficientes. Este código de barras custa ${CREDITS} crédito e seu saldo é ${saldoAtual}.`);
        setStage('error');
        return;
      }

      setSaldo(typeof resultado.saldo_atual === 'number' ? resultado.saldo_atual : null);
      setBarcodeUrl(dataUrl);
      setStage('result');
      playText?.('Código de barras gerado!').catch(() => {});
    } catch (err: any) {
      const msg = err.message?.includes('is not a valid') || err.message?.includes('invalid')
        ? `Valor inválido para o formato ${fmt}. Verifique o conteúdo.`
        : (err.message ?? 'Erro ao gerar código de barras.');
      setErrorMsg(msg);
      setStage('error');
      playText?.('Erro ao gerar o código de barras.').catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, supabase, ensureCompany, playText]);

  // ── Download ──────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!barcodeUrl) return;
    const a = document.createElement('a');
    a.href     = barcodeUrl;
    a.download = `barcode_${format}_${Date.now()}.png`;
    a.click();
    playText?.('Código de barras baixado.').catch(() => {});
  }, [barcodeUrl, format, playText]);

  // ── Email ─────────────────────────────────────────────────────────────────────

  const handleSendEmail = useCallback(async () => {
    if (!barcodeUrl || sendingEmail) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onRequireLogin?.(); return; }

    const cid = await ensureCompany();
    if (!cid) return;

    setSendingEmail(true);
    setEmailSent(false);
    try {
      const email = session.user.email;
      if (!email) throw new Error('Usuário sem email.');

      const base64 = barcodeUrl.split(',')[1];

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id:  cid,
          to:          email,
          subject:     'Seu Código de Barras — ArteFinal',
          body:        `<p>Código de barras gerado pelo ArteFinal.</p><p><strong>Formato:</strong> ${format}</p><p><strong>Conteúdo:</strong> ${inputText}</p><br><img src="${barcodeUrl}" alt="Código de barras" />`,
          attachments: [{ filename: `barcode_${format}.png`, content: base64, encoding: 'base64', contentType: 'image/png' }],
        },
      });
      if (error) throw new Error(error.message);

      setEmailSent(true);
      playText?.('Código de barras enviado para o seu email.').catch(() => {});
    } catch {
      playText?.('Não foi possível enviar o email.').catch(() => {});
    } finally {
      setSendingEmail(false);
    }
  }, [barcodeUrl, sendingEmail, supabase, ensureCompany, format, inputText, onRequireLogin, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setFormat('CODE128');
    setBarcodeUrl(null);
    setErrorMsg(null);
    setSaldo(null);
    setEmailSent(false);
    transcriptRef.current = '';
  }, []);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  // ─── Estilos base ─────────────────────────────────────────────────────────────

  const btnPrimary: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '10px 0', borderRadius: 12, border: 'none',
    background: C.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };

  const btnGhost: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '8px 0', borderRadius: 12, border: 'none',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
    color: C.sub, fontSize: 12, fontWeight: 500, cursor: 'pointer',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.overlay, padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, maxHeight: '92dvh', overflowY: 'auto',
        borderRadius: 20, padding: 24,
        background: C.bg, border: `1px solid ${C.border}`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconBarcode s={icon(C.accent, 20)} />
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Código de Barras</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
            <IconX s={icon(C.sub, 18)} />
          </button>
        </div>

        {/* ── Stage: input ── */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Seletor de formato */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Formato</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${format === opt.value ? C.blue : C.border}`,
                      background: format === opt.value ? C.blue : C.surface,
                      color: format === opt.value ? '#fff' : C.sub,
                      fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: 9, opacity: 0.75, marginTop: 2, textAlign: 'center', lineHeight: 1.3 }}>{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input de conteúdo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>
                Conteúdo
                {format === 'EAN13'  && <span style={{ color: C.warn, marginLeft: 6 }}>— 12 dígitos numéricos</span>}
                {format === 'CODE39' && <span style={{ color: C.warn, marginLeft: 6 }}>— maiúsculas e números</span>}
              </span>
              <input
                value={inputText}
                onChange={e => { setInputText(e.target.value); transcriptRef.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter') handleGenerate(inputText, format); }}
                placeholder={
                  format === 'EAN13'  ? 'Ex: 789012345678' :
                  format === 'CODE39' ? 'Ex: PRODUTO-001' :
                  'Ex: 7890123456789 ou PRODUTO-ABC'
                }
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, outline: 'none',
                  background: C.input, border: `1px solid ${C.inputBorder}`,
                  color: C.text, fontSize: 13, boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={() => handleGenerate(inputText, format)}
              disabled={!inputText.trim()}
              style={{
                ...btnPrimary,
                background: inputText.trim() ? C.blue : C.blueDim,
                color:      inputText.trim() ? '#fff' : C.blueMuted,
                cursor:     inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconBarcode s={icon(inputText.trim() ? '#fff' : C.blueMuted, 16)} />
              Gerar Código de Barras
            </button>

            {/* Custo — oculto para anônimos (§6) */}
            {logado && (
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
                Custo: <strong style={{ color: C.text }}>{CREDITS}</strong> crédito
              </p>
            )}
          </div>
        )}

        {/* ── Stage: generating ── */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `3px solid ${C.blue}`, borderTopColor: 'transparent',
              animation: 'cb-spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Gerando código de barras…</p>
            <style>{`@keyframes cb-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && barcodeUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

            {/* Preview */}
            <div style={{
              width: '100%', borderRadius: 14, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 12, background: '#ffffff', border: `1px solid ${C.border}`,
              boxSizing: 'border-box',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barcodeUrl} alt="Código de barras gerado" style={{ maxWidth: '100%', maxHeight: 120, display: 'block' }} />
            </div>

            {/* Badges de info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                background: C.blueDim, color: C.blueMuted,
              }}>
                {FORMAT_OPTIONS.find(f => f.value === format)?.label}
              </span>
              {inputText && (
                <span style={{ fontSize: 11, color: C.sub, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inputText}
                </span>
              )}
            </div>

            {/* Saldo restante */}
            {saldo !== null && (
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
                Saldo restante: <strong style={{ color: C.text }}>{saldo}</strong> créditos
              </p>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={handleDownload}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: 'none', background: C.blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <IconDownload s={icon('#fff', 15)} />
                Baixar PNG
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || emailSent}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600,
                  background: emailSent ? C.greenDim : C.blueDim,
                  color:      emailSent ? C.greenMuted : C.blueMuted,
                  cursor:     sendingEmail || emailSent ? 'default' : 'pointer',
                  opacity:    sendingEmail ? 0.7 : 1,
                }}
              >
                {sendingEmail
                  ? <div style={{ width: 14, height: 14, border: `2px solid ${C.blueMuted}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'cb-spin 0.8s linear infinite' }} />
                  : <IconMail s={icon(emailSent ? C.greenMuted : C.blueMuted, 15)} />
                }
                {emailSent ? 'Enviado!' : 'E-mail'}
              </button>
            </div>

            <button onClick={handleReset} style={btnGhost}>
              <IconRefresh s={icon(C.sub, 14)} />
              Gerar novo código
            </button>
          </div>
        )}

        {/* ── Stage: login (anônimo tentou gerar) ── */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Entre para gerar o código</div>
            <p style={{ margin: 0, fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
              Ao se <strong style={{ color: C.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para usar as ferramentas do ArteFinal.
            </p>
            <button
              onClick={irParaLogin}
              style={{ padding: 14, borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              <IconSparkles s={icon('#fff', 14)} />
              {' '}Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button
              onClick={() => setStage('input')}
              style={{ padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, cursor: 'pointer', fontSize: 13 }}
            >
              Voltar
            </button>
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.4,
              background: C.redDim, border: `1px solid ${C.redBorder}`, color: C.red,
            }}>
              {errorMsg ?? 'Ocorreu um erro inesperado.'}
            </div>
            <button onClick={handleReset} style={btnPrimary}>
              <IconRefresh s={icon('#fff', 15)} />
              Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
