'use client';

/**
 * QRCodeDisplay.tsx — ArteFinal
 *
 * Convenções do guia v2 aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT (sem Tailwind dinâmico)
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de qualquer ação autenticada
 *  - Custo escondido para anônimo
 *  - Sem cobrança de crédito (QR = ferramenta utilitária); adicione
 *    cobrar_credito_se_suficiente se quiser monetizar (§2 do guia).
 *  - Sem useModalVoiceCommand (ArteFinal usa registry próprio, não VoiceAssistant)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

const IconX = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconQr = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="5" y="5" width="3" height="3" />
    <rect x="16" y="5" width="3" height="3" /><rect x="5" y="16" width="3" height="3" />
    <path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" /><path d="M21 14v3" />
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
const IconSettings = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconChevronDown = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconChevronUp = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

// Helper para passar cor+tamanho pro ícone sem prop-drilling verboso
type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

// ─── Paletas DARK / LIGHT (CMYK-friendly naming) ──────────────────────────────

const DARK = {
  bg:           '#1a1a2e',
  surface:      '#16213e',
  surfaceHover: '#0f3460',
  border:       'rgba(255,255,255,0.08)',
  borderHover:  'rgba(255,255,255,0.18)',
  text:         '#e2e8f0',
  sub:          '#94a3b8',
  muted:        '#475569',
  accent:       '#e94560',
  accentHover:  '#c73652',
  blue:         '#3b82f6',
  blueHover:    '#2563eb',
  blueDim:      '#1e3a5f',
  blueMuted:    '#60a5fa',
  green:        '#22c55e',
  greenDim:     '#166534',
  greenMuted:   '#86efac',
  red:          '#fca5a5',
  redDim:       'rgba(127,29,29,0.3)',
  redBorder:    '#b91c1c',
  input:        '#0f172a',
  inputBorder:  '#334155',
  optBg:        'rgba(15,23,42,0.7)',
  overlay:      'rgba(0,0,0,0.75)',
};

const LIGHT = {
  bg:           '#ffffff',
  surface:      '#f8fafc',
  surfaceHover: '#f1f5f9',
  border:       '#e5e7eb',
  borderHover:  '#d1d5db',
  text:         '#111827',
  sub:          '#6b7280',
  muted:        '#9ca3af',
  accent:       '#e94560',
  accentHover:  '#c73652',
  blue:         '#2563eb',
  blueHover:    '#1d4ed8',
  blueDim:      '#dbeafe',
  blueMuted:    '#1d4ed8',
  green:        '#16a34a',
  greenDim:     '#dcfce7',
  greenMuted:   '#166534',
  red:          '#dc2626',
  redDim:       '#fef2f2',
  redBorder:    '#fecaca',
  input:        '#f9fafb',
  inputBorder:  '#d1d5db',
  optBg:        '#f8fafc',
  overlay:      'rgba(0,0,0,0.6)',
};

// ─── Constantes de opções ─────────────────────────────────────────────────────

const QR_COLORS = [
  { label: 'Navy',     value: '#000080' },
  { label: 'Preto',    value: '#000000' },
  { label: 'Roxo',     value: '#6d28d9' },
  { label: 'Verde',    value: '#065f46' },
  { label: 'Vermelho', value: '#991b1b' },
];

const BG_COLORS = [
  { label: 'Branco', value: '#ffffff' },
  { label: 'Creme',  value: '#fef9ef' },
  { label: 'Preto',  value: '#000000' },
  { label: 'Cinza',  value: '#f3f4f6' },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'input' | 'generating' | 'result' | 'login' | 'error';

interface QROpts {
  size:     200 | 300 | 400;
  color:    string;
  bgColor:  string;
  showLogo: boolean;
}

const DEFAULT_OPTS: QROpts = { size: 300, color: '#000080', bgColor: '#ffffff', showLogo: true };

const CREDITS = 1;

export interface QRCodeDisplayProps {
  data: {
    companyId?: string;   // pode vir vazio em contas novas (lazy)
    prefill?:   string;   // conteúdo pré-preenchido (registry pode passar)
  };
  onClose:      () => void;
  onRequireLogin?: () => void;  // registry chama isso p/ redirecionar ao /arte/login
  theme?:       'dark' | 'light';
  playText?:    (text: string) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function QRCodeDisplay({
  data,
  onClose,
  onRequireLogin,
  theme = 'dark',
  playText,
}: QRCodeDisplayProps) {
  const C      = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [companyId,    setCompanyId]    = useState(data.companyId ?? '');
  const [logado,       setLogado]       = useState(false);
  const [stage,        setStage]        = useState<Stage>('input');
  const [inputText,    setInputText]    = useState(data.prefill ?? '');
  const [qrUrl,        setQrUrl]        = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [saldo,        setSaldo]        = useState<number | null>(null);
  const [emailSent,    setEmailSent]    = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showOpts,     setShowOpts]     = useState(false);
  const [opts,         setOpts]         = useState<QROpts>(DEFAULT_OPTS);
  const [customQr,     setCustomQr]     = useState('#000080');
  const [customBg,     setCustomBg]     = useState('#ffffff');

  // ── Mount: sinaliza modal aberto + TTS de boas-vindas (§5: só no useEffect) ──

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));

    // Verifica sessão para mostrar/ocultar custo (§6 "custo escondido para anônimo")
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogado(!!session);
    });

    // TTS de abertura — só aqui, nunca em handler de registry (§5)
    playText?.('Gerar QR Code. Digite o texto ou link que deseja converter.').catch(() => {});

    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Prefill auto-gera ────────────────────────────────────────────────────────

  useEffect(() => {
    if (data.prefill) handleGenerate(data.prefill, DEFAULT_OPTS, companyId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ensure_my_arte_company lazy (§7) ─────────────────────────────────────────

  const ensureCompany = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      onRequireLogin?.();
      return null;
    }

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

  // ── Montar URL do QR ─────────────────────────────────────────────────────────

  const buildUrl = useCallback((text: string, o: QROpts, cid: string) => {
    const p = new URLSearchParams({
      data:       text,
      size:       String(o.size),
      color:      o.color,
      bg:         o.bgColor,
      company_id: cid,
    });
    if (!o.showLogo) p.set('no_logo', '1');
    return `/api/qrcode?${p.toString()}`;
  }, []);

  // ── Gerar (requer login + crédito) ───────────────────────────────────────────

  const handleGenerate = useCallback(async (
    text: string,
    o: QROpts = opts,
    cid: string = companyId,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) {
      playText?.('Digite o texto para gerar o QR Code.').catch(() => {});
      return;
    }

    // Checa sessão — anônimo vai para tela de login (igual ao ArteFinalDisplay)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStage('login'); return; }

    setStage('generating');
    setErrorMsg(null);

    try {
      // ensure_my_arte_company lazy (§7)
      let resolvedCid = cid;
      if (!resolvedCid) {
        const found = await ensureCompany();
        if (!found) return; // ensureCompany já setou o erro
        resolvedCid = found;
      }

      // Monta a URL (a rota /api/qrcode não cobra — cobramos aqui, fail-closed)
      const url = buildUrl(trimmed, o, resolvedCid);

      // Cobrança após montar, antes de mostrar o resultado (§5 fail-closed)
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_qr_code',
          p_credits:      CREDITS,
          p_metadata:     { conteudo: trimmed },
        }
      );
      // RPC retorna TABLE → sempre array (§10: bug 402-com-saldo)
      const resultado = Array.isArray(raw) ? raw[0] : raw;
      if (errCobranca || !resultado?.sucesso) {
        const saldoAtual = resultado?.saldo_atual ?? 0;
        setErrorMsg(`Créditos insuficientes. Este QR Code custa ${CREDITS} crédito e seu saldo é ${saldoAtual}.`);
        setStage('error');
        return;
      }

      setSaldo(typeof resultado.saldo_atual === 'number' ? resultado.saldo_atual : null);
      setQrUrl(url);
      setStage('result');
      playText?.('QR Code gerado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao gerar QR Code.');
      setStage('error');
      playText?.('Erro ao gerar o QR Code.').catch(() => {});
    }
  }, [opts, companyId, supabase, ensureCompany, buildUrl, playText]);

  // ── Atualizar opção + regenerar preview se já há resultado ───────────────────

  const applyOpt = useCallback((next: QROpts) => {
    setOpts(next);
    if (stage === 'result' && inputText.trim()) {
      setQrUrl(buildUrl(inputText.trim(), next, companyId));
    }
  }, [stage, inputText, companyId, buildUrl]);

  // ── Download ──────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (!qrUrl) return;
    try {
      const res  = await fetch(qrUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `qrcode_${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
      playText?.('QR Code baixado.').catch(() => {});
    } catch {
      playText?.('Erro ao baixar.').catch(() => {});
    }
  }, [qrUrl, playText]);

  // ── Enviar email ──────────────────────────────────────────────────────────────

  const handleSendEmail = useCallback(async () => {
    if (!qrUrl || sendingEmail) return;

    // Requer login para enviar email
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onRequireLogin?.(); return; }

    const cid = await ensureCompany();
    if (!cid) return;

    setSendingEmail(true);
    setEmailSent(false);
    try {
      const email = session.user.email;
      if (!email) throw new Error('Usuário sem email.');

      const blob   = await (await fetch(qrUrl)).blob();
      const base64 = await new Promise<string>(res => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.readAsDataURL(blob);
      });

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id:  cid,
          to:          email,
          subject:     'Seu QR Code — ArteFinal',
          body:        `<p>QR Code gerado pelo ArteFinal.</p><p><strong>Conteúdo:</strong> ${inputText}</p><br><img src="${qrUrl}" width="250" />`,
          attachments: [{ filename: 'qrcode.png', content: base64, encoding: 'base64', contentType: 'image/png' }],
        },
      });
      if (error) throw new Error(error.message);

      setEmailSent(true);
      playText?.('QR Code enviado para o seu email.').catch(() => {});
    } catch {
      playText?.('Não foi possível enviar o email.').catch(() => {});
    } finally {
      setSendingEmail(false);
    }
  }, [qrUrl, sendingEmail, supabase, ensureCompany, inputText, onRequireLogin, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setQrUrl(null);
    setErrorMsg(null);
    setSaldo(null);
    setEmailSent(false);
    setShowOpts(false);
  }, []);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  // ─── Estilos derivados da paleta (inline, §5) ─────────────────────────────────

  const card: React.CSSProperties = {
    position:        'relative',
    width:           '100%',
    maxWidth:        360,
    maxHeight:       '92dvh',
    overflowY:       'auto',
    borderRadius:    20,
    padding:         24,
    background:      C.bg,
    border:          `1px solid ${C.border}`,
    boxShadow:       '0 25px 60px rgba(0,0,0,0.4)',
    display:         'flex',
    flexDirection:   'column',
    gap:             0,
  };

  const btnPrimary: React.CSSProperties = {
    width:          '100%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    padding:        '10px 0',
    borderRadius:   12,
    border:         'none',
    background:     C.blue,
    color:          '#fff',
    fontSize:       14,
    fontWeight:     600,
    cursor:         'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    flex:           1,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    padding:        '10px 0',
    borderRadius:   12,
    border:         'none',
    background:     C.blueDim,
    color:          C.blueMuted,
    fontSize:       13,
    fontWeight:     500,
    cursor:         'pointer',
  };

  const btnGhost: React.CSSProperties = {
    width:          '100%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    padding:        '8px 0',
    borderRadius:   12,
    border:         'none',
    background:     theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
    color:          C.sub,
    fontSize:       12,
    fontWeight:     500,
    cursor:         'pointer',
  };

  const divider: React.CSSProperties = {
    borderTop:  `1px solid ${C.border}`,
    marginTop:  12,
    paddingTop: 14,
  };

  // ─── Painel de opções ─────────────────────────────────────────────────────────

  const renderOptions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, ...divider }}>

      {/* Tamanho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Tamanho</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { label: 'P', sub: '200px', val: 200 },
            { label: 'M', sub: '300px', val: 300 },
            { label: 'G', sub: '400px', val: 400 },
          ] as const).map(s => (
            <button
              key={s.val}
              onClick={() => applyOpt({ ...opts, size: s.val })}
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            2,
                padding:        '8px 0',
                borderRadius:   10,
                border:         opts.size === s.val ? 'none' : `1px solid ${C.border}`,
                background:     opts.size === s.val ? C.blue : C.surface,
                color:          opts.size === s.val ? '#fff' : C.sub,
                fontSize:       12,
                fontWeight:     600,
                cursor:         'pointer',
              }}
            >
              <span>{s.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{s.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cor do QR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Cor do QR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {QR_COLORS.map(c => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => applyOpt({ ...opts, color: c.value })}
              style={{
                width:       28,
                height:      28,
                borderRadius: 8,
                background:  c.value,
                border:      `2px solid ${opts.color === c.value ? C.blue : C.border}`,
                boxShadow:   opts.color === c.value ? `0 0 0 2px ${C.blue}40` : 'none',
                cursor:      'pointer',
              }}
            />
          ))}
          {/* Color picker nativo */}
          <input
            type="color"
            value={customQr}
            title="Cor personalizada"
            onChange={e => { setCustomQr(e.target.value); applyOpt({ ...opts, color: e.target.value }); }}
            style={{
              width: 28, height: 28, borderRadius: 8, padding: 2, cursor: 'pointer',
              border: `2px solid ${!QR_COLORS.some(c => c.value === opts.color) ? C.blue : C.border}`,
              background: theme === 'dark' ? C.surface : '#fff',
            }}
          />
        </div>
      </div>

      {/* Cor do fundo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Cor do fundo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {BG_COLORS.map(c => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => applyOpt({ ...opts, bgColor: c.value })}
              style={{
                width:       28,
                height:      28,
                borderRadius: 8,
                background:  c.value,
                border:      `2px solid ${opts.bgColor === c.value ? C.blue : C.border}`,
                boxShadow:   opts.bgColor === c.value ? `0 0 0 2px ${C.blue}40` : 'none',
                cursor:      'pointer',
              }}
            />
          ))}
          <input
            type="color"
            value={customBg}
            title="Fundo personalizado"
            onChange={e => { setCustomBg(e.target.value); applyOpt({ ...opts, bgColor: e.target.value }); }}
            style={{
              width: 28, height: 28, borderRadius: 8, padding: 2, cursor: 'pointer',
              border: `2px solid ${!BG_COLORS.some(c => c.value === opts.bgColor) ? C.blue : C.border}`,
              background: theme === 'dark' ? C.surface : '#fff',
            }}
          />
        </div>
      </div>

      {/* Logo toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Incluir logo</span>
          <span style={{ fontSize: 11, color: C.muted }}>Logo da empresa no centro</span>
        </div>
        <button
          onClick={() => applyOpt({ ...opts, showLogo: !opts.showLogo })}
          style={{
            position:    'relative',
            width:       40,
            height:      22,
            borderRadius: 11,
            border:      'none',
            background:  opts.showLogo ? C.blue : C.muted,
            cursor:      'pointer',
            transition:  'background 0.2s',
          }}
        >
          <span style={{
            position:   'absolute',
            top:        3,
            left:       opts.showLogo ? 21 : 3,
            width:      16,
            height:     16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow:  '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    </div>
  );

  // ─── Botão "Opções" (toggle colapsável) ───────────────────────────────────────

  const renderOptsToggle = (compact = false) => (
    <button
      onClick={() => setShowOpts(v => !v)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        width:          compact ? 'auto' : '100%',
        alignSelf:      compact ? 'center' : undefined,
        padding:        compact ? '6px 12px' : '8px 12px',
        borderRadius:   10,
        border:         `1px solid ${C.border}`,
        background:     C.optBg,
        color:          C.sub,
        fontSize:       compact ? 12 : 13,
        cursor:         'pointer',
        gap:            6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconSettings s={icon(C.sub, 14)} />
        <span>{compact ? 'Ajustar' : 'Opções avançadas'}</span>
        {!compact && (
          <span style={{
            padding:    '1px 6px',
            borderRadius: 6,
            background: C.blueDim,
            color:      C.blueMuted,
            fontSize:   10,
            fontWeight: 600,
          }}>
            {opts.size}px
          </span>
        )}
      </div>
      {showOpts
        ? <IconChevronUp s={icon(C.sub, 14)} />
        : <IconChevronDown s={icon(C.sub, 14)} />
      }
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         9999,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     C.overlay,
      padding:        16,
    }}>
      <div style={card}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconQr s={icon(C.accent, 20)} />
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Gerar QR Code</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}
          >
            <IconX s={icon(C.sub, 18)} />
          </button>
        </div>

        {/* ── Stage: input ── */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
              Digite o texto, URL ou qualquer conteúdo para gerar o QR Code.
            </p>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ex: https://artefinal.com.br"
              style={{
                width:       '100%',
                minHeight:   88,
                borderRadius: 12,
                padding:     '10px 12px',
                fontSize:    13,
                resize:      'none',
                outline:     'none',
                background:  C.input,
                border:      `1px solid ${C.inputBorder}`,
                color:       C.text,
                boxSizing:   'border-box',
              }}
            />

            {/* Opções avançadas */}
            {renderOptsToggle()}
            {showOpts && renderOptions()}

            <button
              onClick={() => handleGenerate(inputText)}
              disabled={!inputText.trim()}
              style={{
                ...btnPrimary,
                background: inputText.trim() ? C.blue : C.blueDim,
                color:      inputText.trim() ? '#fff' : C.blueMuted,
                cursor:     inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconQr s={icon('#fff', 16)} />
              Gerar QR Code
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
              width:  44, height: 44,
              border: `3px solid ${C.blue}`,
              borderTopColor: 'transparent',
              borderRadius:   '50%',
              animation:      'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Gerando QR Code…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && qrUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

            {/* Preview */}
            <div style={{
              padding:      12,
              borderRadius: 16,
              background:   '#ffffff',
              border:       `1px solid ${C.border}`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={qrUrl}
                src={qrUrl}
                alt="QR Code gerado"
                width={220}
                height={220}
                style={{ display: 'block', borderRadius: 8 }}
              />
            </div>

            {inputText && (
              <p style={{
                fontSize:  11,
                color:     C.sub,
                textAlign: 'center',
                maxWidth:  '100%',
                overflow:  'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin:    0,
              }}>
                {inputText.length > 55 ? inputText.slice(0, 55) + '…' : inputText}
              </p>
            )}

            {/* Saldo restante após cobrança */}
            {saldo !== null && (
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
                Saldo restante: <strong style={{ color: C.text }}>{saldo}</strong> créditos
              </p>
            )}

            {/* Ajuste rápido de opções */}
            {renderOptsToggle(true)}
            {showOpts && (
              <div style={{
                width:        '100%',
                borderRadius: 12,
                padding:      12,
                background:   C.optBg,
                border:       `1px solid ${C.border}`,
              }}>
                {renderOptions()}
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={handleDownload} style={{ ...btnSecondary, flex: 1, background: C.blue, color: '#fff' }}>
                <IconDownload s={icon('#fff', 15)} />
                Baixar PNG
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || emailSent}
                style={{
                  ...btnSecondary,
                  background: emailSent ? C.greenDim : C.blueDim,
                  color:      emailSent ? C.greenMuted : C.blueMuted,
                  cursor:     sendingEmail || emailSent ? 'default' : 'pointer',
                  opacity:    sendingEmail ? 0.7 : 1,
                }}
              >
                {sendingEmail
                  ? <div style={{ width: 14, height: 14, border: `2px solid ${C.blueMuted}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <IconMail s={icon(emailSent ? C.greenMuted : C.blueMuted, 15)} />
                }
                {emailSent ? 'Enviado!' : 'E-mail'}
              </button>
            </div>

            <button onClick={handleReset} style={btnGhost}>
              <IconRefresh s={icon(C.sub, 14)} />
              Gerar novo QR Code
            </button>
          </div>
        )}

        {/* ── Stage: login (anônimo tentou gerar) ── */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Entre para gerar o QR Code</div>
            <p style={{ margin: 0, fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
              Ao se <strong style={{ color: C.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para usar as ferramentas do ArteFinal.
            </p>
            <button
              onClick={irParaLogin}
              style={{ padding: 14, borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Entrar / Cadastrar e ganhar 20 créditos
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
              padding:      '10px 12px',
              borderRadius: 10,
              background:   C.redDim,
              border:       `1px solid ${C.redBorder}`,
              color:        C.red,
              fontSize:     13,
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
