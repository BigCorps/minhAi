'use client';

/**
 * OrcamentoPdfDisplay.tsx — ArteFinal
 *
 * Gerador de orçamento em PDF, baseado no HTML da minhAi.
 * Geração 100% client-side via jsPDF (sem rota de API).
 *
 * Migrado para o padrão visual dos demais modais (Adesivo, Folha de Recorte,
 * Margem e Sangria, Duplicar Imagem, Vetorizar Imagem, QR Code, Código de Barras):
 *  - Paleta CMYK padrão (DARK/LIGHT com bg/bgSecondary/border/text/textMuted/
 *    success/error/accent/warn), accent = CMYK.cyan (cor da UI do modal).
 *  - Card com a mesma largura dos outros (640 normal).
 *  - Botão "Fechar" em texto no header.
 *  - Bloco "Como funciona" na tela inicial (etapa Empresa).
 *
 * NOVO: cor dos títulos do PDF agora é escolhível pelo usuário (seção Empresa).
 * O estado pdfAccentColor/sessionColorCache já existia no arquivo original mas
 * nunca era exposto na UI nem usado de fato no jsPDF — o PDF sempre saía com a
 * cor fixa #e94560 (rosa), hardcoded em doc.setTextColor(233, 69, 96). Agora os
 * 3 pontos do PDF que usavam essa cor fixa (título "ORÇAMENTO", "TOTAL", e o
 * acento do header) usam hexToRgb(pdfAccentColor) — a cor escolhida pelo usuário.
 * Importante: a cor dos TÍTULOS DO PDF é independente da cor de destaque da UI
 * do modal (accent = cyan) — são conceitos diferentes, não devem ser confundidos.
 *
 * Convenções do guia v2 ainda aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy
 *  - Custo escondido para anônimos
 *  - Anônimo → stage 'login' ao tentar gerar
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0]
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

// ─── Cores disponíveis para os títulos do PDF (mesmo padrão do QR Code) ──────

const PDF_TITLE_COLORS = [
  { label: 'Rosa',     value: '#e94560' }, // cor original/padrão
  { label: 'Navy',     value: '#000080' },
  { label: 'Preto',    value: '#000000' },
  { label: 'Roxo',     value: '#6d28d9' },
  { label: 'Verde',    value: '#065f46' },
  { label: 'Vermelho', value: '#991b1b' },
];

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
const OPENING_TEXT = 'Gerador de orçamento. Preencha os dados da empresa e do cliente para gerar o PDF.';

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
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
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
  const [customPdfColor, setCustomPdfColor] = useState('#e94560');
  const [empresa,     setEmpresa]     = useState<EmpresaData>({ nome: '', doc: '', tel: '', email: '', cidade: '', estado: '', end: '' });
  const [cliente,     setCliente]     = useState<ClienteData>({ nome: '', email: '', tel: '', end: '' });
  const [itens,       setItens]       = useState<OrcamentoItem[]>([{ id: nextId(), descricao: '', quantidade: 1, valorUnit: 0 }]);
  const [desconto,    setDesconto]    = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Seção expandida no mobile
  const [secao, setSecao] = useState<'empresa' | 'cliente' | 'itens' | 'resumo'>('empresa');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const spoke = useRef(false);

  // ── Mount ────────────────────────────────────────────────────────────────────
  // Logo: cache só em memória (módulo) para esta sessão de navegação — sem
  // Supabase Storage nem tabela. Some ao recarregar a página (comportamento
  // esperado para um cache "leve"; ver sessionLogoCache no topo do arquivo).

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session));
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

  // ── Cor dos títulos do PDF — persiste em memória, nesta sessão ───────────────

  const handleSetPdfColor = useCallback((hex: string) => {
    setPdfAccentColor(hex);
    sessionColorCache.set(hex);
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

      // Cor dos títulos escolhida pelo usuário (era fixa #e94560 antes)
      const titleColor = hexToRgb(pdfAccentColor);

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
      doc.setTextColor(titleColor.r, titleColor.g, titleColor.b);
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
      doc.setTextColor(titleColor.r, titleColor.g, titleColor.b);
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

      // ── Cobrança fail-closed: após gerar ────────────────────────────
      const { data: raw, error: errCobranca } = await supabase.rpc(
        'cobrar_credito_se_suficiente',
        {
          p_company_id:   resolvedCid,
          p_function_key: 'gerar_orcamento_pdf',
          p_credits:      CREDITS,
          p_metadata:     { cliente: cliente.nome, total },
        }
      );
      // RPC retorna TABLE → sempre array
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
  }, [empresa, cliente, itens, desconto, observacoes, logoBase64, pdfAccentColor, total, companyId, supabase, ensureCompany, playText]);

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

  // ─── Estilos derivados da paleta (mesma convenção dos demais modais) ──────────

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14, background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none', boxSizing: 'border-box' };

  const secaoBtn = (key: typeof secao): React.CSSProperties => ({
    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: secao === key ? c.accent : c.bgSecondary,
    color:      secao === key ? '#fff'   : c.textMuted,
  });

  const btnPrimary: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Orçamento em PDF</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* Stage: form */}
        {stage === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {secao === 'empresa' && (
              <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
                <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                  Preencha os dados da sua empresa, do cliente e os itens do orçamento. Você pode
                  adicionar seu logo e escolher a cor dos títulos do PDF. O arquivo é gerado e baixado
                  na hora, já formatado e pronto para enviar.
                </p>
              </div>
            )}

            {/* Navegação entre seções */}
            <div style={{ display: 'flex', gap: 4, background: c.bgSecondary, padding: 4, borderRadius: 8 }}>
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
                        width: 80, height: 80, borderRadius: 8, cursor: 'pointer',
                        border: `2px dashed ${c.border}`, background: c.bgSecondary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {logoBase64 ? (
                        <img src={logoBase64} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: c.textMuted }}>
                          <IconUpload s={icon(c.textMuted, 20)} />
                          <div style={{ fontSize: 9, marginTop: 4 }}>Logo</div>
                        </div>
                      )}
                    </div>
                    {logoBase64 && (
                      <button
                        onClick={handleRemoveLogo}
                        style={{ fontSize: 9, textAlign: 'center', color: c.error, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogo(f); e.currentTarget.value = ''; }} />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={label}>Nome da empresa *</label>
                      <input style={inputStyle} placeholder="Sua Empresa LTDA" value={empresa.nome}
                        onChange={e => setEmpresa(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={label}>CNPJ / CPF</label>
                        <input style={inputStyle} placeholder="00.000.000/0001-00" value={empresa.doc}
                          onChange={e => setEmpresa(p => ({ ...p, doc: maskDoc(e.target.value) }))} />
                      </div>
                      <div>
                        <label style={label}>Telefone</label>
                        <input style={inputStyle} placeholder="(11) 99999-9999" value={empresa.tel}
                          onChange={e => setEmpresa(p => ({ ...p, tel: maskTel(e.target.value) }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={label}>E-mail</label>
                  <input style={inputStyle} type="email" placeholder="contato@suaempresa.com" value={empresa.email}
                    onChange={e => setEmpresa(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <div>
                    <label style={label}>Cidade *</label>
                    <input style={inputStyle} placeholder="São Paulo" value={empresa.cidade}
                      onChange={e => setEmpresa(p => ({ ...p, cidade: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>UF *</label>
                    <input style={inputStyle} placeholder="SP" maxLength={2} value={empresa.estado}
                      onChange={e => setEmpresa(p => ({ ...p, estado: e.target.value.toUpperCase() }))} />
                  </div>
                </div>
                <div>
                  <label style={label}>Endereço completo</label>
                  <input style={inputStyle} placeholder="Rua Exemplo, 123, Bairro" value={empresa.end}
                    onChange={e => setEmpresa(p => ({ ...p, end: e.target.value }))} />
                </div>

                {/* Cor dos títulos do PDF — antes fixa em #e94560, agora escolhível */}
                <div>
                  <label style={label}>Cor dos títulos no PDF</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {PDF_TITLE_COLORS.map(opt => (
                      <button
                        key={opt.value}
                        title={opt.label}
                        onClick={() => handleSetPdfColor(opt.value)}
                        style={{
                          width: 28, height: 28, borderRadius: 8, background: opt.value, cursor: 'pointer',
                          border: `2px solid ${pdfAccentColor === opt.value ? c.accent : c.border}`,
                          boxShadow: pdfAccentColor === opt.value ? `0 0 0 2px ${c.accent}40` : 'none',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={customPdfColor}
                      title="Cor personalizada"
                      onChange={e => { setCustomPdfColor(e.target.value); handleSetPdfColor(e.target.value); }}
                      style={{
                        width: 28, height: 28, borderRadius: 8, padding: 2, cursor: 'pointer',
                        border: `2px solid ${!PDF_TITLE_COLORS.some(opt => opt.value === pdfAccentColor) ? c.accent : c.border}`,
                        background: c.bgSecondary,
                      }}
                    />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textMuted }}>
                    Aplica-se ao título "ORÇAMENTO" e ao valor "TOTAL" no PDF gerado.
                  </p>
                </div>

                <button onClick={() => setSecao('cliente')} style={btnPrimary}>
                  Próximo: Cliente →
                </button>
              </div>
            )}

            {/* ── Seção: Cliente ── */}
            {secao === 'cliente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={label}>Nome completo *</label>
                  <input style={inputStyle} placeholder="Nome do Cliente" value={cliente.nome}
                    onChange={e => setCliente(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={label}>E-mail</label>
                    <input style={inputStyle} type="email" placeholder="email@cliente.com" value={cliente.email}
                      onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>Telefone</label>
                    <input style={inputStyle} placeholder="(21) 98888-8888" value={cliente.tel}
                      onChange={e => setCliente(p => ({ ...p, tel: maskTel(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label style={label}>Endereço</label>
                  <input style={inputStyle} placeholder="Endereço do cliente (opcional)" value={cliente.end}
                    onChange={e => setCliente(p => ({ ...p, end: e.target.value }))} />
                </div>

                <button onClick={() => setSecao('itens')} style={btnPrimary}>
                  Próximo: Itens →
                </button>
              </div>
            )}

            {/* ── Seção: Itens ── */}
            {secao === 'itens' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itens.map((item, idx) => (
                  <div key={item.id} style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.textMuted }}>Item {idx + 1}</span>
                      <button onClick={() => removeItem(item.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6,
                        color: c.error, opacity: itens.length === 1 ? 0.3 : 1,
                      }} disabled={itens.length === 1}>
                        <IconTrash s={icon(c.error, 14)} />
                      </button>
                    </div>
                    <div>
                      <label style={label}>Descrição</label>
                      <input style={inputStyle} placeholder="Descrição do produto/serviço" value={item.descricao}
                        onChange={e => updateItem(item.id, 'descricao', e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={label}>Qtd</label>
                        <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min="0" step="0.01"
                          value={item.quantidade}
                          onChange={e => updateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={label}>Valor unit.</label>
                        <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0,00"
                          value={item.valorUnit || ''}
                          onChange={e => updateItem(item.id, 'valorUnit', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={label}>Subtotal</label>
                        <input style={{ ...inputStyle, background: c.bg, color: c.textMuted, cursor: 'default' }}
                          readOnly value={fmt(item.quantidade * item.valorUnit)} />
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={addItem} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0', borderRadius: 8, border: `1px dashed ${c.border}`,
                  background: 'transparent', color: c.textMuted, fontSize: 13, cursor: 'pointer',
                }}>
                  <IconPlus s={icon(c.textMuted, 14)} /> Adicionar item
                </button>

                <button onClick={() => setSecao('resumo')} style={btnPrimary}>
                  Próximo: Resumo →
                </button>
              </div>
            )}

            {/* ── Seção: Resumo ── */}
            {secao === 'resumo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Totais */}
                <div style={{ padding: 16, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.textMuted, marginBottom: 8 }}>
                    <span>Subtotal</span><span style={{ color: c.text }}>{fmt(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: c.textMuted, marginBottom: 12 }}>
                    <span>Desconto (R$)</span>
                    <input type="number" min="0" step="0.01" value={desconto || ''}
                      onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                      style={{ ...inputStyle, width: 110, textAlign: 'right', fontSize: 13 }} placeholder="0,00" />
                  </div>
                  <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>TOTAL</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: pdfAccentColor }}>{fmt(total)}</span>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label style={label}>Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Ex: Validade 30 dias, condições de pagamento..."
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  />
                </div>

                <button
                  onClick={handleGerar}
                  disabled={!empresa.nome.trim() || !cliente.nome.trim()}
                  style={{
                    ...btnPrimary,
                    background: empresa.nome.trim() && cliente.nome.trim() ? c.accent : c.border,
                    cursor:     empresa.nome.trim() && cliente.nome.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <IconDownload s={icon('#fff', 16)} />
                  Gerar PDF do Orçamento
                </button>

                {/* Custo — oculto para anônimos */}
                {logado && (
                  <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
                    Custo: <strong style={{ color: c.text }}>{CREDITS}</strong> créditos
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage: generating */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'orc-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Gerando PDF...</p>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <span>PDF gerado e baixado!</span>
            </div>
            {resultName && <p style={{ fontSize: 12, color: c.textMuted, margin: 0 }}>{resultName}</p>}
            {saldo !== null && (
              <p style={{ fontSize: 11, color: c.textMuted, margin: 0 }}>
                Saldo restante: <strong style={{ color: c.text }}>{saldo}</strong> créditos
              </p>
            )}
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconRefresh s={icon(c.textMuted, 14)} /> Gerar novo orçamento
            </button>
          </div>
        )}

        {/* Stage: login */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Entre para gerar o orçamento</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              Ao se <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para usar as ferramentas do ArteFinal.
            </p>
            <button onClick={irParaLogin} style={btnPrimary}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('form')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>
              Voltar ao formulário
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
              <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes orc-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}
