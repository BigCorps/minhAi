'use client';

/**
 * CodigoBarrasDisplay.tsx — ArteFinal
 *
 * Migrado para o padrão visual dos demais modais (Adesivo, Folha de Recorte,
 * Margem e Sangria, Duplicar Imagem, Vetorizar Imagem, QR Code):
 *  - Paleta CMYK padrão (DARK/LIGHT com bg/bgSecondary/border/text/textMuted/
 *    success/error/accent/warn), accent = CMYK.cyan (mesma do QR Code/Duplicar).
 *  - Card com a mesma largura dos outros (640 normal / 760 no resultado).
 *  - Botão "Fechar" em texto no header, igual aos demais.
 *  - Bloco "Como funciona" na tela inicial.
 *
 * Corrigido: handleReset chamava setEmailSent(false), mas o estado 'emailSent'
 * nunca era declarado em lugar nenhum do arquivo — resíduo de cópia de outro
 * componente que quebraria o build. Removido (não há funcionalidade de email aqui).
 *
 * Convenções do guia v2 ainda aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de ações autenticadas
 *  - Custo escondido para anônimos
 *  - Anônimo → stage 'login' ao tentar gerar
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0]
 *  - Geração client-side via jsbarcode (sem API extra)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

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
const IconRefresh = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
  </svg>
);

// ─── Paleta CMYK padrão (mesma dos demais modais) ────────────────────────────

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.cyan, warn: '#d97706',
};

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Stage  = 'input' | 'generating' | 'result' | 'login' | 'error';
type Format = 'CODE128' | 'EAN13' | 'CODE39';

const CREDITS = 1;
const OPENING_TEXT = 'Gerar código de barras. Digite o conteúdo e escolha o formato.';

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
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
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

  const transcriptRef = useRef('');
  const spoke = useRef(false);

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogado(!!session);
    });

    if (!spoke.current) {
      spoke.current = true;
      playText?.(OPENING_TEXT).catch(() => {});
    }

    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ensure_my_arte_company lazy ─────────────────────────────────────────

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

      // Cobrança fail-closed: depois de gerar, antes de mostrar
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_codigo_barras',
          p_credits:      CREDITS,
          p_metadata:     { conteudo: text, formato: fmt },
        }
      );
      // RPC retorna TABLE → sempre array
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

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setFormat('CODE128');
    setBarcodeUrl(null);
    setErrorMsg(null);
    setSaldo(null);
    transcriptRef.current = '';
  }, []);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  // ─── Estilos derivados da paleta (mesma convenção dos demais modais) ──────────

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14, background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none' };

  const btnPrimary: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'result' ? 760 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Código de Barras</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* Stage: input */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Escolha o formato, digite o conteúdo e gere o código de barras na hora. O resultado já
                sai pronto para baixar em PNG, com o valor impresso abaixo das barras.
              </p>
            </div>

            {/* Seletor de formato */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={label}>Formato</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                      border: format === opt.value ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                      background: format === opt.value ? c.accent : c.bgSecondary,
                      color: format === opt.value ? '#fff' : c.textMuted,
                      fontSize: 11, fontWeight: 600,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: 9, opacity: 0.85, marginTop: 2, textAlign: 'center', lineHeight: 1.3 }}>{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input de conteúdo */}
            <div>
              <label style={label}>
                Conteúdo
                {format === 'EAN13'  && <span style={{ color: c.warn, marginLeft: 6 }}>— 12 dígitos numéricos</span>}
                {format === 'CODE39' && <span style={{ color: c.warn, marginLeft: 6 }}>— maiúsculas e números</span>}
              </label>
              <input
                value={inputText}
                onChange={e => { setInputText(e.target.value); transcriptRef.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter') handleGenerate(inputText, format); }}
                placeholder={
                  format === 'EAN13'  ? 'Ex: 789012345678' :
                  format === 'CODE39' ? 'Ex: PRODUTO-001' :
                  'Ex: 7890123456789 ou PRODUTO-ABC'
                }
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => handleGenerate(inputText, format)}
              disabled={!inputText.trim()}
              style={{
                ...btnPrimary,
                background: inputText.trim() ? c.accent : c.border,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconBarcode s={icon('#fff', 16)} />
              Gerar Código de Barras
            </button>

            {/* Custo — oculto para anônimos */}
            {logado && (
              <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
                Custo: <strong style={{ color: c.text }}>{CREDITS}</strong> crédito
              </p>
            )}
          </div>
        )}

        {/* Stage: generating */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'cb-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Gerando código de barras...</p>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && barcodeUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: '#ffffff', border: `1px solid ${c.border}`, boxSizing: 'border-box' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barcodeUrl} alt="Código de barras gerado" style={{ maxWidth: '100%', maxHeight: 120, display: 'block' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', background: c.bgSecondary, color: c.accent, border: `1px solid ${c.border}` }}>
                {FORMAT_OPTIONS.find(f => f.value === format)?.label}
              </span>
              {inputText && (
                <span style={{ fontSize: 11, color: c.textMuted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inputText}
                </span>
              )}
            </div>

            {saldo !== null && (
              <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
                Saldo restante: <strong style={{ color: c.text }}>{saldo}</strong> créditos
              </p>
            )}

            <button onClick={handleDownload} style={btnPrimary}>
              <IconDownload s={icon('#fff', 16)} />
              Baixar PNG
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconRefresh s={icon(c.textMuted, 14)} />
              Gerar novo código
            </button>
          </div>
        )}

        {/* Stage: login (anônimo tentou gerar) */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Entre para gerar o código</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              Ao se <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para usar as ferramentas do ArteFinal.
            </p>
            <button onClick={irParaLogin} style={btnPrimary}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('input')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>
              Voltar
            </button>
          </div>
        )}

        {/* Stage: error */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
              {errorMsg ?? 'Ocorreu um erro inesperado.'}
            </div>
            <button onClick={handleReset} style={btnPrimary}>
              <IconRefresh s={icon('#fff', 15)} />
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cb-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}
