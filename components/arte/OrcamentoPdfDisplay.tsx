'use client';

/**
 * OrcamentoPdfDisplay.tsx — ArteFinal
 *
 * Gerador de orçamento em PDF, baseado no HTML da minhAi.
 * Geração 100% client-side via jsPDF (sem rota de API).
 *
 * Convenções do guia v2:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy (§7)
 *  - Custo escondido para anônimos (§6)
 *  - Anônimo → stage 'login' ao tentar gerar
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0] (§10)
 *  - Sem rota de API extra (jsPDF puro, sem PDFRest)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ─── Cache de logo em memória (módulo) ─────────────────────────────────────────
// Sem Supabase Storage/tabela. Vive enquanto a aba/SPA estiver aberta — reabrir
// o modal na mesma sessão de navegação reaproveita o logo; recarregar a página
// limpa o cache (comportamento esperado para um cache "leve", não persistente).
let _sessionLogo: string | null = null;
const sessionLogoCache = {
  get:   () => _sessionLogo,
  set:   (v: string) => { _sessionLogo = v; },
  clear: () => { _sessionLogo = null; },
};

// Mesma lógica para a cor de destaque (títulos do PDF) — cache só em memória
let _sessionAccentColor: string | null = null;
const sessionColorCache = {
  get:   () => _sessionAccentColor,
  set:   (v: string) => { _sessionAccentColor = v; },
  clear: () => { _sessionAccentColor = null; },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.slice(0, 2), 16) || 0,
    g: parseInt(m.slice(2, 4), 16) || 0,
    b: parseInt(m.slice(4, 6), 16) || 0,
  };
}

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

const IconX = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconDoc = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconPlus = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconTrash = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
const IconUpload = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

// ─── Paletas ──────────────────────────────────────────────────────────────────

const DARK = {
  bg:          '#1a1a2e', surface:     '#16213e', surfaceAlt:  '#0f172a',
  border:      'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.15)',
  text:        '#e2e8f0', sub:         '#94a3b8', muted:       '#475569',
  accent:      '#e94560', blue:        '#3b82f6', blueDim:     '#1e3a5f', blueMuted: '#60a5fa',
  green:       '#22c55e', greenDim:    '#166534', greenMuted:  '#86efac',
  red:         '#fca5a5', redDim:      'rgba(127,29,29,0.3)', redBorder: '#b91c1c',
  input:       '#0f172a', inputBorder: '#334155',
  overlay:     'rgba(0,0,0,0.75)',
};
const LIGHT = {
  bg:          '#ffffff', surface:     '#f8fafc', surfaceAlt:  '#f1f5f9',
  border:      '#e5e7eb', borderStrong: '#d1d5db',
  text:        '#111827', sub:         '#6b7280', muted:       '#9ca3af',
  accent:      '#e94560', blue:        '#2563eb', blueDim:     '#eff6ff', blueMuted: '#1d4ed8',
  green:       '#16a34a', greenDim:    '#dcfce7', greenMuted:  '#166534',
  red:         '#dc2626', redDim:      '#fef2f2', redBorder:   '#fecaca',
  input:       '#f9fafb', inputBorder: '#d1d5db',
  overlay:     'rgba(0,0,0,0.6)',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'form' | 'generating' | 'result' | 'login' | 'error';

interface OrcamentoItem {
  id:        number;
  descricao: string;
  quantidade: number;
  valorUnit: number;
}

interface EmpresaData {
  nome:    string;
  doc:     string;
  tel:     string;
  email:   string;
  cidade:  string;
  estado:  string;
  end:     string;
}

interface ClienteData {
  nome:  string;
  email: string;
  tel:   string;
  end:   string;
}

const CREDITS = 2;

export interface OrcamentoPdfDisplayProps {
  data:            { companyId?: string };
  onClose:         () => void;
  onRequireLogin?: () => void;
  theme?:          'dark' | 'light';
  playText?:       (text: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

let _itemCounter = 0;
const nextId = () => ++_itemCounter;

function resizeImage(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function maskTel(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskDoc(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '').replace(/\.+$/, '');
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '').replace(/\/+$/, '');
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OrcamentoPdfDisplay({
  data, onClose, onRequireLogin, theme = 'dark', playText,
}: OrcamentoPdfDisplayProps) {
  const C      = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [companyId,   setCompanyId]   = useState(data.companyId ?? '');
  const [logado,      setLogado]      = useState(false);
  const [stage,       setStage]       = useState<Stage>('form');
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [saldo,       setSaldo]       = useState<number | null>(null);
  const [resultName,  setResultName]  = useState('');

  const [logoBase64,  setLogoBase64]  = useState<string | null>(() => sessionLogoCache.get() ?? null);
  const [pdfAccentColor, setPdfAccentColor] = useState<string>(() => sessionColorCache.get() ?? '#e94560');
  const [empresa,     setEmpresa]     = useState<EmpresaData>({ nome: '', doc: '', tel: '', email: '', cidade: '', estado: '', end: '' });
  const [cliente,     setCliente]     = useState<ClienteData>({ nome: '', email: '', tel: '', end: '' });
  const [itens,       setItens]       = useState<OrcamentoItem[]>([{ id: nextId(), descricao: '', quantidade: 1, valorUnit: 0 }]);
  const [desconto,    setDesconto]    = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Seção expandida no mobile
  const [secao, setSecao] = useState<'empresa' | 'cliente' | 'itens' | 'resumo'>('empresa');

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Mount ────────────────────────────────────────────────────────────────────
  // Logo: cache só em memória (módulo) para esta sessão de navegação — sem
  // Supabase Storage nem tabela. Some ao recarregar a página (comportamento
  // esperado para um cache "leve"; ver sessionLogoCache no topo do arquivo).

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session));
    playText?.('Gerador de orçamento. Preencha os dados da empresa e do cliente para gerar o PDF.').catch(() => {});
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ensure_my_arte_company lazy ───────────────────────────────────────────────

  const ensureCompany = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onRequireLogin?.(); return null; }
    const { data: ensured, error } = await supabase.rpc('ensure_my_arte_company');
    if (error || !ensured) { setErrorMsg('Não foi possível inicializar sua conta.'); setStage('error'); return null; }
    const cid = ensured as string;
    setCompanyId(cid);
    return cid;
  }, [companyId, supabase, onRequireLogin]);

  // ── Itens helpers ─────────────────────────────────────────────────────────────

  const addItem   = () => setItens(prev => [...prev, { id: nextId(), descricao: '', quantidade: 1, valorUnit: 0 }]);
  const removeItem = (id: number) => setItens(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: number, field: keyof OrcamentoItem, value: string | number) =>
    setItens(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  // ── Totais ────────────────────────────────────────────────────────────────────

  const subtotal = itens.reduce((acc, i) => acc + i.quantidade * i.valorUnit, 0);
  const total    = Math.max(0, subtotal - desconto);

  // ── Logo upload — cache só em memória, nesta sessão (sem Supabase) ───────────

  const handleLogo = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const b64 = await resizeImage(file, 400);
      setLogoBase64(b64);
      sessionLogoCache.set(b64); // persiste em memória enquanto a aba estiver aberta
    } catch { /* ignore */ }
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setLogoBase64(null);
    sessionLogoCache.clear();
  }, []);

  // ── Gerar PDF (requer login + crédito) ────────────────────────────────────────

  const handleGerar = useCallback(async () => {
    if (!empresa.nome.trim() || !cliente.nome.trim()) {
      setErrorMsg('Nome da empresa e nome do cliente são obrigatórios.');
      setStage('error');
      return;
    }

    // Checa sessão
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

      // Importa jsPDF dinamicamente
      const { jsPDF } = await import('jspdf') as any;
      const doc = new jsPDF();
      const PW  = doc.internal.pageSize.width;   // 210
      const PH  = doc.internal.pageSize.height;  // 297
      let y     = 20;

      // ── Logo (canto superior direito) ──────────────────────────────────────
      if (logoBase64) {
        const tempImg = new Image();
        tempImg.src = logoBase64;
        await new Promise<void>(res => { if (tempImg.complete) res(); else tempImg.onload = () => res(); });

        const maxW = 35, maxH = 35;
        let lw = tempImg.naturalWidth || tempImg.width;
        let lh = tempImg.naturalHeight || tempImg.height;
        const ar = lw / lh;
        if (lw / lh >= 1) { lw = Math.min(lw, maxW); lh = lw / ar; }
        else               { lh = Math.min(lh, maxH); lw = lh * ar; }
        if (lw > maxW)     { lw = maxW; lh = lw / ar; }
        if (lh > maxH)     { lh = maxH; lw = lh * ar; }

        doc.addImage(logoBase64, 'JPEG', PW - lw - 15, 15, lw, lh);
      }

      // ── Dados da empresa ──────────────────────────────────────────────────
      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text(empresa.nome, 15, 25);

      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      let ey = 32;
      if (empresa.end)   { doc.text(empresa.end,              15, ey); ey += 5; }
      if (empresa.doc)   { doc.text(`CNPJ/CPF: ${empresa.doc}`, 15, ey); ey += 5; }
      if (empresa.tel)   { doc.text(`Tel: ${empresa.tel}`,    15, ey); ey += 5; }
      if (empresa.email) { doc.text(`E-mail: ${empresa.email}`, 15, ey); ey += 5; }
      if (empresa.cidade || empresa.estado) {
        doc.text(`${empresa.cidade}${empresa.cidade && empresa.estado ? ' — ' : ''}${empresa.estado}`, 15, ey);
        ey += 5;
      }

      y = Math.max(68, ey + 8);

      // Linha divisória
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, PW - 15, y);
      y += 8;

      // ── Título e data ─────────────────────────────────────────────────────
      doc.setFontSize(18); doc.setFont(undefined, 'bold');
      doc.setTextColor(233, 69, 96); // accent
      doc.text('ORÇAMENTO', 15, y);
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, PW - 15, y, { align: 'right' });
      y += 12;

      // ── Dados do cliente ──────────────────────────────────────────────────
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('CLIENTE', 15, y);
      doc.setTextColor(0, 0, 0);
      y += 6;

      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.text(`Nome: ${cliente.nome}`, 15, y);
      if (cliente.email) doc.text(`E-mail: ${cliente.email}`, PW / 2, y);
      y += 5;
      if (cliente.tel) doc.text(`Tel: ${cliente.tel}`, 15, y);
      if (cliente.end) doc.text(`End: ${cliente.end}`, PW / 2, y);
      y += 10;

      // ── Tabela de itens ───────────────────────────────────────────────────
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('ITENS', 15, y);
      doc.setTextColor(0, 0, 0);
      y += 6;

      // Cabeçalho
      doc.setFillColor(248, 248, 248);
      doc.rect(15, y - 4, PW - 30, 8, 'F');
      doc.setFontSize(8); doc.setFont(undefined, 'bold');
      doc.text('Descrição',   17, y);
      doc.text('Qtd',        130, y);
      doc.text('Valor Unit.', 148, y);
      doc.text('Subtotal',    175, y);
      y += 5;

      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, PW - 15, y);
      y += 4;

      // Linhas de itens
      doc.setFont(undefined, 'normal'); doc.setFontSize(8);
      let sub = 0;
      for (const item of itens) {
        if (!item.descricao.trim()) continue;
        const itemSub = item.quantidade * item.valorUnit;
        sub += itemSub;

        // Quebra de página se necessário
        if (y > PH - 50) { doc.addPage(); y = 20; }

        doc.text(item.descricao.substring(0, 48), 17, y);
        doc.text(String(item.quantidade),          130, y);
        doc.text(fmt(item.valorUnit),              148, y);
        doc.text(fmt(itemSub),                     175, y);
        y += 6;
      }

      y += 6;
      doc.setDrawColor(220, 220, 220);
      doc.line(130, y, PW - 15, y);
      y += 6;

      // ── Totais ────────────────────────────────────────────────────────────
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.text('Subtotal:',  140, y); doc.text(fmt(sub),     PW - 15, y, { align: 'right' }); y += 6;
      if (desconto > 0) {
        doc.text('Desconto:', 140, y); doc.text(fmt(desconto), PW - 15, y, { align: 'right' }); y += 6;
      }

      doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.setTextColor(233, 69, 96);
      doc.text('TOTAL:', 140, y);
      doc.text(fmt(total), PW - 15, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 12;

      // ── Observações ───────────────────────────────────────────────────────
      if (observacoes.trim()) {
        if (y > PH - 50) { doc.addPage(); y = 20; }
        doc.setFontSize(9); doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('OBSERVAÇÕES', 15, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(observacoes, PW - 30);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 6;
      }

      // ── Rodapé ────────────────────────────────────────────────────────────
      doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text('Orçamento válido por 30 dias a partir da data de emissão.', 15, PH - 15);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} via ArteFinal.app`, 15, PH - 10);

      // Salva localmente para download imediato
      const fileName = `Orcamento_${cliente.nome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      setResultName(fileName);

      // ── Cobrança fail-closed: após gerar (§5) ────────────────────────────
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_orcamento_pdf',
          p_credits:      CREDITS,
          p_metadata:     { cliente: cliente.nome, total },
        }
      );
      // RPC retorna TABLE → sempre array (§10)
      const resultado = Array.isArray(raw) ? raw[0] : raw;
      if (errCobranca || !resultado?.sucesso) {
        const saldoAtual = resultado?.saldo_atual ?? 0;
        setErrorMsg(`Créditos insuficientes. Este orçamento custa ${CREDITS} créditos e seu saldo é ${saldoAtual}.`);
        setStage('error');
        return;
      }

      setSaldo(typeof resultado.saldo_atual === 'number' ? resultado.saldo_atual : null);
      setStage('result');
      playText?.('PDF gerado e baixado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao gerar o orçamento.');
      setStage('error');
    }
  }, [empresa, cliente, itens, desconto, observacoes, logoBase64, total, companyId, supabase, ensureCompany, playText]);

  const handleReset = useCallback(() => {
    setStage('form');
    setErrorMsg(null);
    setSaldo(null);
    setResultName('');
  }, []);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  // ─── Estilos base ─────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: 8, outline: 'none', fontSize: 13,
    background: C.input, border: `1px solid ${C.inputBorder}`, color: C.text, boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4, display: 'block' };
  const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

  const secaoBtn = (key: typeof secao): React.CSSProperties => ({
    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: secao === key ? C.accent : C.surface,
    color:      secao === key ? '#fff'   : C.sub,
    transition: 'all 0.15s',
  });

  const btnPrimary: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '11px 0', borderRadius: 12, border: 'none',
    background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  const btnGhost: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '8px 0', borderRadius: 10, border: 'none',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
    color: C.sub, fontSize: 12, cursor: 'pointer',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.overlay, padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 500, maxHeight: '94dvh', overflowY: 'auto',
        borderRadius: 20, padding: 24, background: C.bg, border: `1px solid ${C.border}`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 0,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconDoc s={icon(C.accent, 20)} />
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Orçamento em PDF</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
            <IconX s={icon(C.sub, 18)} />
          </button>
        </div>

        {/* ── Stage: form ── */}
        {stage === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Navegação entre seções */}
            <div style={{ display: 'flex', gap: 4, background: C.surface, padding: 4, borderRadius: 10 }}>
              {(['empresa', 'cliente', 'itens', 'resumo'] as const).map(s => (
                <button key={s} onClick={() => setSecao(s)} style={secaoBtn(s)}>
                  {{ empresa: 'Empresa', cliente: 'Cliente', itens: 'Itens', resumo: 'Resumo' }[s]}
                </button>
              ))}
            </div>

            {/* ── Seção: Empresa ── */}
            {secao === 'empresa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Logo upload — cache só em memória nesta sessão (sem Supabase) */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      style={{
                        position: 'relative',
                        width: 80, height: 80, borderRadius: 12, cursor: 'pointer',
                        border: `2px dashed ${C.borderStrong}`, background: C.surface,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', transition: 'border-color 0.15s',
                      }}
                    >
                      {logoBase64 ? (
                        <img src={logoBase64} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: C.muted }}>
                          <IconUpload s={icon(C.muted, 20)} />
                          <div style={{ fontSize: 9, marginTop: 4 }}>Logo</div>
                        </div>
                      )}
                    </div>
                    {logoBase64 && (
                      <button
                        onClick={handleRemoveLogo}
                        style={{
                          fontSize: 9, textAlign: 'center', color: C.red, background: 'none',
                          border: 'none', cursor: 'pointer', padding: 2,
                        }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogo(f); e.currentTarget.value = ''; }} />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={row}>
                      <label style={lbl}>Nome da empresa *</label>
                      <input style={inp} placeholder="Sua Empresa LTDA" value={empresa.nome}
                        onChange={e => setEmpresa(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={row}>
                        <label style={lbl}>CNPJ / CPF</label>
                        <input style={inp} placeholder="00.000.000/0001-00" value={empresa.doc}
                          onChange={e => setEmpresa(p => ({ ...p, doc: maskDoc(e.target.value) }))} />
                      </div>
                      <div style={row}>
                        <label style={lbl}>Telefone</label>
                        <input style={inp} placeholder="(11) 99999-9999" value={empresa.tel}
                          onChange={e => setEmpresa(p => ({ ...p, tel: maskTel(e.target.value) }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={row}>
                  <label style={lbl}>E-mail</label>
                  <input style={inp} type="email" placeholder="contato@suaempresa.com" value={empresa.email}
                    onChange={e => setEmpresa(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <div style={row}>
                    <label style={lbl}>Cidade *</label>
                    <input style={inp} placeholder="São Paulo" value={empresa.cidade}
                      onChange={e => setEmpresa(p => ({ ...p, cidade: e.target.value }))} />
                  </div>
                  <div style={row}>
                    <label style={lbl}>UF *</label>
                    <input style={inp} placeholder="SP" maxLength={2} value={empresa.estado}
                      onChange={e => setEmpresa(p => ({ ...p, estado: e.target.value.toUpperCase() }))} />
                  </div>
                </div>
                <div style={row}>
                  <label style={lbl}>Endereço completo</label>
                  <input style={inp} placeholder="Rua Exemplo, 123, Bairro" value={empresa.end}
                    onChange={e => setEmpresa(p => ({ ...p, end: e.target.value }))} />
                </div>

                <button onClick={() => setSecao('cliente')} style={{ ...btnPrimary, background: C.blue }}>
                  Próximo: Cliente →
                </button>
              </div>
            )}

            {/* ── Seção: Cliente ── */}
            {secao === 'cliente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={row}>
                  <label style={lbl}>Nome completo *</label>
                  <input style={inp} placeholder="Nome do Cliente" value={cliente.nome}
                    onChange={e => setCliente(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={row}>
                    <label style={lbl}>E-mail</label>
                    <input style={inp} type="email" placeholder="email@cliente.com" value={cliente.email}
                      onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div style={row}>
                    <label style={lbl}>Telefone</label>
                    <input style={inp} placeholder="(21) 98888-8888" value={cliente.tel}
                      onChange={e => setCliente(p => ({ ...p, tel: maskTel(e.target.value) }))} />
                  </div>
                </div>
                <div style={row}>
                  <label style={lbl}>Endereço</label>
                  <input style={inp} placeholder="Endereço do cliente (opcional)" value={cliente.end}
                    onChange={e => setCliente(p => ({ ...p, end: e.target.value }))} />
                </div>

                <button onClick={() => setSecao('itens')} style={{ ...btnPrimary, background: C.blue }}>
                  Próximo: Itens →
                </button>
              </div>
            )}

            {/* ── Seção: Itens ── */}
            {secao === 'itens' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itens.map((item, idx) => (
                  <div key={item.id} style={{
                    padding: 12, borderRadius: 10, background: C.surface,
                    border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Item {idx + 1}</span>
                      <button onClick={() => removeItem(item.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6,
                        color: C.red, opacity: itens.length === 1 ? 0.3 : 1,
                      }} disabled={itens.length === 1}>
                        <IconTrash s={icon(C.red, 14)} />
                      </button>
                    </div>
                    <div style={row}>
                      <label style={lbl}>Descrição</label>
                      <input style={inp} placeholder="Descrição do produto/serviço" value={item.descricao}
                        onChange={e => updateItem(item.id, 'descricao', e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 }}>
                      <div style={row}>
                        <label style={lbl}>Qtd</label>
                        <input style={{ ...inp, textAlign: 'center' }} type="number" min="0" step="0.01"
                          value={item.quantidade}
                          onChange={e => updateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div style={row}>
                        <label style={lbl}>Valor unit.</label>
                        <input style={inp} type="number" min="0" step="0.01" placeholder="0,00"
                          value={item.valorUnit || ''}
                          onChange={e => updateItem(item.id, 'valorUnit', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div style={row}>
                        <label style={lbl}>Subtotal</label>
                        <input style={{ ...inp, background: C.surfaceAlt, color: C.sub, cursor: 'default' }}
                          readOnly value={fmt(item.quantidade * item.valorUnit)} />
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={addItem} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0', borderRadius: 10, border: `1px dashed ${C.borderStrong}`,
                  background: 'transparent', color: C.sub, fontSize: 13, cursor: 'pointer',
                }}>
                  <IconPlus s={icon(C.sub, 14)} /> Adicionar item
                </button>

                <button onClick={() => setSecao('resumo')} style={{ ...btnPrimary, background: C.blue }}>
                  Próximo: Resumo →
                </button>
              </div>
            )}

            {/* ── Seção: Resumo ── */}
            {secao === 'resumo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Totais */}
                <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.sub, marginBottom: 8 }}>
                    <span>Subtotal</span><span style={{ color: C.text }}>{fmt(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: C.sub, marginBottom: 12 }}>
                    <span>Desconto (R$)</span>
                    <input type="number" min="0" step="0.01" value={desconto || ''}
                      onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                      style={{ ...inp, width: 110, textAlign: 'right', fontSize: 13 }} placeholder="0,00" />
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>TOTAL</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{fmt(total)}</span>
                  </div>
                </div>

                {/* Observações */}
                <div style={row}>
                  <label style={lbl}>Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Ex: Validade 30 dias, condições de pagamento..."
                    rows={4}
                    style={{ ...inp, resize: 'vertical', minHeight: 80 }}
                  />
                </div>

                <button
                  onClick={handleGerar}
                  disabled={!empresa.nome.trim() || !cliente.nome.trim()}
                  style={{
                    ...btnPrimary,
                    background: empresa.nome.trim() && cliente.nome.trim() ? C.accent : C.border,
                    cursor:     empresa.nome.trim() && cliente.nome.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <IconDownload s={icon('#fff', 16)} />
                  Gerar PDF do Orçamento
                </button>

                {/* Custo — oculto para anônimos (§6) */}
                {logado && (
                  <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
                    Custo: <strong style={{ color: C.text }}>{CREDITS}</strong> créditos
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stage: generating ── */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'orc-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Gerando PDF…</p>
            <style>{`@keyframes orc-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconDownload s={icon(C.greenMuted, 24)} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>PDF gerado e baixado!</p>
              {resultName && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{resultName}</p>}
            </div>
            {saldo !== null && (
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                Saldo restante: <strong style={{ color: C.text }}>{saldo}</strong> créditos
              </p>
            )}
            <button onClick={handleReset} style={btnGhost}>
              <IconRefresh s={icon(C.sub, 14)} /> Gerar novo orçamento
            </button>
          </div>
        )}

        {/* ── Stage: login ── */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Entre para gerar o orçamento</div>
            <p style={{ margin: 0, fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
              Ao se <strong style={{ color: C.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para usar as ferramentas do ArteFinal.
            </p>
            <button onClick={irParaLogin} style={btnPrimary}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('form')} style={{ padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, cursor: 'pointer', fontSize: 13 }}>
              Voltar ao formulário
            </button>
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.4, background: C.redDim, border: `1px solid ${C.redBorder}`, color: C.red }}>
              {errorMsg ?? 'Ocorreu um erro inesperado.'}
            </div>
            <button onClick={handleReset} style={btnPrimary}>
              <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
