'use client';

/**
 * QRCodeDisplay.tsx — ArteFinal
 *
 * Migrado para o padrão visual dos demais modais (Adesivo, Folha de Recorte,
 * Margem e Sangria, Duplicar Imagem, Vetorizar Imagem):
 *  - Paleta CMYK padrão (DARK/LIGHT com bg/bgSecondary/border/text/textMuted/
 *    success/error/accent/warn), accent = CMYK.cyan (mesma do Duplicar/Vetorizar).
 *  - Card com a mesma largura dos outros (640 normal / 760 no resultado).
 *  - Botão "Fechar" em texto no header, igual aos demais.
 *  - Bloco "Como funciona" na tela inicial.
 *  - Logo: SÓ upload local (a opção de URL externa foi removida — você confirmou
 *    que o upload já cobre o caso de uso).
 *
 * Arquitetura de cobrança MANTIDA como estava (RPC cobrar_credito_se_suficiente
 * chamada direto do client) — você pediu para não mudar isso, só o visual.
 *
 * Convenções do guia v2 ainda aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT (sem Tailwind dinâmico)
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de qualquer ação autenticada
 *  - Custo escondido para anônimo
 *  - RPC retorna TABLE → sempre array (bug 402-com-saldo)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

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
const OPENING_TEXT = 'Gerar QR Code. Digite o texto ou link que deseja converter.';

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
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [companyId,    setCompanyId]    = useState(data.companyId ?? '');
  const [logado,       setLogado]       = useState(false);
  const [stage,        setStage]        = useState<Stage>('input');
  const [inputText,    setInputText]    = useState(data.prefill ?? '');
  const [qrUrl,        setQrUrl]        = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [saldo,        setSaldo]        = useState<number | null>(null);
  const [showOpts,     setShowOpts]     = useState(false);
  const [opts,         setOpts]         = useState<QROpts>(DEFAULT_OPTS);
  const [customQr,     setCustomQr]     = useState('#000080');
  const [customBg,     setCustomBg]     = useState('#ffffff');
  const [logoFile,     setLogoFile]     = useState<string | null>(null); // base64 do upload — cache só nesta sessão (sem Supabase)
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const spoke = useRef(false);

  // ── Mount: sinaliza modal aberto + TTS de boas-vindas (só no useEffect) ──

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));

    // Verifica sessão para mostrar/ocultar custo (custo escondido para anônimo)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogado(!!session);
    });

    // TTS de abertura — só aqui, nunca em handler de registry
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

  // ── Prefill auto-gera ────────────────────────────────────────────────────────

  useEffect(() => {
    if (data.prefill) handleGenerate(data.prefill, DEFAULT_OPTS, companyId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ensure_my_arte_company lazy ─────────────────────────────────────────

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

  // Monta a URL do QR "puro". O logo, quando enviado (upload local em base64),
  // NÃO vai para a API via query string (imagens em base64 estouram o limite de
  // tamanho de URL) — em vez disso compomos o logo por cima no client via
  // <canvas> em composeLocalLogo().
  const buildUrl = useCallback((text: string, o: QROpts, cid: string) => {
    const p = new URLSearchParams({
      data:       text,
      size:       String(o.size),
      color:      o.color,
      bg:         o.bgColor,
      company_id: cid,
    });
    if (!o.showLogo || logoFile) {
      // Logo desligado OU logo local: pedimos o QR SEM logo da API e (se houver
      // logo local) compomos no client.
      p.set('no_logo', '1');
    }
    return `/api/qrcode?${p.toString()}`;
  }, [logoFile]);

  // Compõe o logo local (upload) por cima do QR puro, via canvas.
  const composeLocalLogo = useCallback((baseUrl: string, logoDataUrl: string, size: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(qrImg, 0, 0, size, size);

        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = Math.floor(size * 0.25);
          const padding = 6;
          const total = logoSize + padding * 2;
          const offset = Math.floor((size - total) / 2);

          // Fundo branco circular
          ctx.save();
          ctx.beginPath();
          ctx.arc(offset + total / 2, offset + total / 2, total / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.clip();

          // Logo centralizado dentro do círculo, mantendo proporção (contain)
          const ratio = Math.min(logoSize / logoImg.naturalWidth, logoSize / logoImg.naturalHeight);
          const lw = logoImg.naturalWidth * ratio;
          const lh = logoImg.naturalHeight * ratio;
          const lx = offset + padding + (logoSize - lw) / 2;
          const ly = offset + padding + (logoSize - lh) / 2;
          ctx.drawImage(logoImg, lx, ly, lw, lh);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = reject;
        logoImg.src = logoDataUrl;
      };
      qrImg.onerror = reject;
      qrImg.src = baseUrl;
    });
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

    // Checa sessão — anônimo vai para tela de login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStage('login'); return; }

    setStage('generating');
    setErrorMsg(null);

    try {
      // ensure_my_arte_company lazy
      let resolvedCid = cid;
      if (!resolvedCid) {
        const found = await ensureCompany();
        if (!found) return; // ensureCompany já setou o erro
        resolvedCid = found;
      }

      // Monta a URL (a rota /api/qrcode não cobra — cobramos aqui, fail-closed)
      let url = buildUrl(trimmed, o, resolvedCid);

      // Se houver logo local (upload), compõe no client via canvas
      // (não dá pra mandar base64 grande pela query string da API)
      if (o.showLogo && logoFile) {
        try {
          url = await composeLocalLogo(url, logoFile, o.size);
        } catch {
          // Se a composição falhar (ex: CORS na imagem do QR), segue sem logo
        }
      }

      // Cobrança após montar, antes de mostrar o resultado (fail-closed)
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_qr_code',
          p_credits:      CREDITS,
          p_metadata:     { conteudo: trimmed },
        }
      );
      // RPC retorna TABLE → sempre array (bug 402-com-saldo)
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
  }, [opts, companyId, supabase, ensureCompany, buildUrl, composeLocalLogo, logoFile, playText]);

  // ── Atualizar opção + regenerar preview se já há resultado ───────────────────

  const applyOpt = useCallback(async (next: QROpts) => {
    setOpts(next);
    if (stage === 'result' && inputText.trim()) {
      let url = buildUrl(inputText.trim(), next, companyId);
      if (next.showLogo && logoFile) {
        try { url = await composeLocalLogo(url, logoFile, next.size); } catch { /* segue sem logo */ }
      }
      setQrUrl(url);
    }
  }, [stage, inputText, companyId, buildUrl, composeLocalLogo, logoFile]);

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

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setQrUrl(null);
    setErrorMsg(null);
    setSaldo(null);
    setShowOpts(false);
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

  const divider: React.CSSProperties = {
    borderTop: `1px solid ${c.border}`,
    marginTop: 12,
    paddingTop: 14,
  };

  // ─── Painel de opções ─────────────────────────────────────────────────────────

  const renderOptions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, ...divider }}>

      {/* Tamanho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Tamanho</span>
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
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                border: opts.size === s.val ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                background: opts.size === s.val ? c.accent : c.bgSecondary,
                color: opts.size === s.val ? '#fff' : c.textMuted,
                fontSize: 12, fontWeight: 600,
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
        <span style={label}>Cor do QR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {QR_COLORS.map(opt => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => applyOpt({ ...opts, color: opt.value })}
              style={{
                width: 28, height: 28, borderRadius: 8, background: opt.value, cursor: 'pointer',
                border: `2px solid ${opts.color === opt.value ? c.accent : c.border}`,
                boxShadow: opts.color === opt.value ? `0 0 0 2px ${c.accent}40` : 'none',
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
              border: `2px solid ${!QR_COLORS.some(opt => opt.value === opts.color) ? c.accent : c.border}`,
              background: c.bgSecondary,
            }}
          />
        </div>
      </div>

      {/* Cor do fundo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Cor do fundo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {BG_COLORS.map(opt => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => applyOpt({ ...opts, bgColor: opt.value })}
              style={{
                width: 28, height: 28, borderRadius: 8, background: opt.value, cursor: 'pointer',
                border: `2px solid ${opts.bgColor === opt.value ? c.accent : c.border}`,
                boxShadow: opts.bgColor === opt.value ? `0 0 0 2px ${c.accent}40` : 'none',
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
              border: `2px solid ${!BG_COLORS.some(opt => opt.value === opts.bgColor) ? c.accent : c.border}`,
              background: c.bgSecondary,
            }}
          />
        </div>
      </div>

      {/* Logo toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>Incluir logo</span>
          <span style={{ fontSize: 11, color: c.textMuted }}>Logo da empresa no centro</span>
        </div>
        <button
          onClick={() => applyOpt({ ...opts, showLogo: !opts.showLogo })}
          style={{
            position: 'relative', width: 40, height: 22, borderRadius: 11, border: 'none',
            background: opts.showLogo ? c.accent : c.border, cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: opts.showLogo ? 21 : 3, width: 16, height: 16,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>

      {opts.showLogo && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Preview + upload local (cache só nesta sessão, sem Supabase) */}
          <div
            onClick={() => logoFileInputRef.current?.click()}
            title="Clique para enviar uma imagem"
            style={{
              width: 50, height: 50, borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${c.border}`, background: c.bgSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}
          >
            {logoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoFile} alt="Preview do logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <span style={label}>Logo personalizado</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => logoFileInputRef.current?.click()}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${c.border}`,
                  background: logoFile ? c.accent : c.bgSecondary,
                  color: logoFile ? '#fff' : c.textMuted,
                }}
              >
                {logoFile ? 'Trocar imagem' : 'Enviar imagem'}
              </button>
              {logoFile && (
                <button
                  onClick={async () => {
                    setLogoFile(null);
                    if (stage === 'result' && inputText.trim()) {
                      setQrUrl(buildUrl(inputText.trim(), opts, companyId));
                    }
                  }}
                  title="Remover"
                  style={{
                    padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${c.error}`, background: 'transparent', color: c.error,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  setLogoFile(dataUrl);
                  if (stage === 'result' && inputText.trim()) {
                    try {
                      const base = buildUrl(inputText.trim(), opts, companyId);
                      const composed = await composeLocalLogo(base, dataUrl, opts.size);
                      setQrUrl(composed);
                    } catch { /* mantém o preview anterior */ }
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ─── Botão "Opções" (toggle colapsável) ───────────────────────────────────────

  const renderOptsToggle = (compact = false) => (
    <button
      onClick={() => setShowOpts(v => !v)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: compact ? 'auto' : '100%', alignSelf: compact ? 'center' : undefined,
        padding: compact ? '6px 12px' : '8px 12px', borderRadius: 8,
        border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.textMuted,
        fontSize: compact ? 12 : 13, cursor: 'pointer', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconSettings s={icon(c.textMuted, 14)} />
        <span>{compact ? 'Ajustar' : 'Opções avançadas'}</span>
        {!compact && (
          <span style={{
            padding: '1px 6px', borderRadius: 6, background: c.bg,
            color: c.accent, fontSize: 10, fontWeight: 600,
          }}>
            {opts.size}px
          </span>
        )}
      </div>
      {showOpts ? <IconChevronUp s={icon(c.textMuted, 14)} /> : <IconChevronDown s={icon(c.textMuted, 14)} />}
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'result' ? 760 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Gerar QR Code</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* Stage: input */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ marginBottom: 0, padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Digite um texto, link ou qualquer conteúdo. Ajuste tamanho, cores e, se quiser, adicione
                um logo no centro. O QR Code é gerado na hora e fica pronto para baixar em PNG.
              </p>
            </div>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ex: https://artefinal.app"
              style={{ ...inputStyle, minHeight: 88, resize: 'none', boxSizing: 'border-box' }}
            />

            {/* Opções avançadas */}
            {renderOptsToggle()}
            {showOpts && renderOptions()}

            <button
              onClick={() => handleGenerate(inputText)}
              disabled={!inputText.trim()}
              style={{
                ...btnPrimary,
                background: inputText.trim() ? c.accent : c.border,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconQr s={icon('#fff', 16)} />
              Gerar QR Code
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
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'qr-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Gerando QR Code...</p>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && qrUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 8, background: '#ffffff', border: `1px solid ${c.border}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={qrUrl} src={qrUrl} alt="QR Code gerado" width={220} height={220} style={{ display: 'block', borderRadius: 4 }} />
            </div>

            {inputText && (
              <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {inputText.length > 55 ? inputText.slice(0, 55) + '…' : inputText}
              </p>
            )}

            {saldo !== null && (
              <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
                Saldo restante: <strong style={{ color: c.text }}>{saldo}</strong> créditos
              </p>
            )}

            {/* Ajuste rápido de opções */}
            {renderOptsToggle(true)}
            {showOpts && (
              <div style={{ width: '100%', borderRadius: 8, padding: 12, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                {renderOptions()}
              </div>
            )}

            <button onClick={handleDownload} style={btnPrimary}>
              <IconDownload s={icon('#fff', 16)} />
              Baixar PNG
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13, width: '100%' }}>
              Novo QR Code
            </button>
          </div>
        )}

        {/* Stage: login (anônimo tentou gerar) */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Entre para gerar o QR Code</div>
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
        @keyframes qr-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}
