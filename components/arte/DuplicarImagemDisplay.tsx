'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import {
  makeImagePreview,
  openPdf,
  rasterizePdfPage,
  uploadArteSource,
  isPdfFile,
  type ArtePreview,
} from '@/lib/arte/prepareUpload';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'page-select' | 'configuring' | 'processing' | 'login' | 'result' | 'error';
type Preset = 'grid_3x3' | 'grid_4x4' | 'a4_completo' | 'custom';
type PageMode = 'a4' | 'custom_page';

interface Props {
  data: { companyId: string; slug?: string }; // companyId pode ser '' (anônimo)
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onRequireLogin?: () => void;
}

// ── Paleta CMYK (mesma do ArteFinal) ─────────────────────────────────────
const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };

const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444',
  primary: CMYK.cyan, accent: CMYK.cyan,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626',
  primary: CMYK.cyan, accent: CMYK.cyan,
};

// ── SVG inline (proibido lucide dentro de modal) ──────────────────────────
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const OPENING_TEXT = 'Envie a imagem para duplicar. Configure o grid e eu gero o PDF para impressão.';
const CREDITS = 2;
const AUTO_CLOSE = 90;
const PAGE_MAX_CM = 200;   // limite de largura da página personalizada
const PAGE_MAX_H_CM = 120; // limite de altura da página personalizada
const MARGIN_CM = 1;       // margem de cada lado, igual ao A4

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fileOk = (f: File) => f.type.startsWith('image/') || isPdfFile(f);

// ── Presets de layout (sem 2×2) ─────────────────────────────────────────
const PRESETS: Record<Preset, { name: string; desc: string; size: number; spacing: number }> = {
  grid_3x3:    { name: 'Grid 3×3',    desc: '9 imagens',       size: 5.5, spacing: 0.8 },
  grid_4x4:    { name: 'Grid 4×4',    desc: '16 imagens',      size: 4,   spacing: 0.5 },
  a4_completo: { name: 'A4 Completo', desc: 'Máximo possível', size: 3,   spacing: 0.5 },
  custom:      { name: 'Avançado',    desc: 'Personalizado',   size: 5,   spacing: 1 },
};

interface LayoutInfo {
  finalWidth: number; finalHeight: number;
  perRow: number; perColumn: number;
  totalImages: number; usedArea: number;
}

export default function DuplicarImagemDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  onRequireLogin,
}: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  // ArtePreview guarda a alta em memória (source: Blob) — sem upload até o liberar
  const [art, setArt] = useState<ArtePreview | null>(null);

  // seletor de página de PDF multipágina (mesmo padrão do ArteFinalDisplay)
  const [pdfPending, setPdfPending] = useState<{ file: File; pages: number } | null>(null);
  const [pageChoice, setPageChoice] = useState<number>(1);

  const [selectedPreset, setSelectedPreset] = useState<Preset>('grid_3x3');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pageMode, setPageMode] = useState<PageMode>('a4');
  const [customPageW, setCustomPageW] = useState<number>(96);
  const [customPageH, setCustomPageH] = useState<number>(52);
  const [maxSize, setMaxSize] = useState(5.5);
  const [spacing, setSpacing] = useState(0.8);
  const [layoutInfo, setLayoutInfo] = useState<LayoutInfo>({
    finalWidth: 0, finalHeight: 0, perRow: 0, perColumn: 0, totalImages: 0, usedArea: 0,
  });

  const [companyId, setCompanyId] = useState<string>(data.companyId || '');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBase64, setResultBase64] = useState<string>('');
  const [resultName, setResultName] = useState<string>('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [logado, setLogado] = useState<boolean>(false);

  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // TTS de abertura — só no mount
  useEffect(() => {
    if (spoke.current) return;
    spoke.current = true;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  // Auto-close no resultado
  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((p) => {
      if (p <= 1) { onClose(); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user));
  }, [supabase]);

  // ── Cálculo de layout (espelha a rota no servidor) ────────────────────
  const pageWValid = clamp(customPageW || 0, 1, PAGE_MAX_CM);
  const pageHValid = clamp(customPageH || 0, 1, PAGE_MAX_H_CM);
  const pageDimsInvalid = pageMode === 'custom_page' && (
    !(customPageW > 0) || !(customPageH > 0) ||
    customPageW > PAGE_MAX_CM || customPageH > PAGE_MAX_H_CM
  );

  useEffect(() => {
    if (!art) return;
    const aspect = art.width / art.height;
    const finalH = maxSize;
    const finalW = maxSize * aspect;
    const spacingCm = spacing / 10;

    // Página: A4 fixo, ou personalizada (com limite 200×120cm)
    const pageW = pageMode === 'a4' ? 21 : pageWValid;
    const pageH = pageMode === 'a4' ? 29.7 : pageHValid;
    const availableW = pageW - 2 * MARGIN_CM;
    const availableH = pageH - 2 * MARGIN_CM;

    // O tamanho da célula (finalW/finalH) é sempre fixo e definido pelo usuário —
    // colunas/linhas são SEMPRE a consequência de quantas células cabem na página,
    // nunca um valor imposto manualmente (senão a proporção/tamanho real quebra).
    // Isso vale tanto para os grids fixos quanto para o preset "Avançado".
    const perRow    = Math.max(0, Math.floor((availableW + spacingCm) / (finalW + spacingCm)));
    const perColumn = Math.max(0, Math.floor((availableH + spacingCm) / (finalH + spacingCm)));
    const totalImages = perRow * perColumn;
    const usedW = perRow * finalW + (perRow - 1) * spacingCm;
    const usedH = perColumn * finalH + (perColumn - 1) * spacingCm;
    const usedArea = availableW > 0 && availableH > 0
      ? (usedW * usedH) / (availableW * availableH) * 100
      : 0;
    setLayoutInfo({ finalWidth: finalW, finalHeight: finalH, perRow, perColumn, totalImages, usedArea });
  }, [art, maxSize, spacing, pageMode, pageWValid, pageHValid]);

  // Teto do "Tamanho máximo (cm)": no A4 mantém 15cm fixo (não há razão para célula maior
  // que isso numa folha A4). No modo Personalizado NÃO há trava arbitrária — o teto é o menor
  // lado da própria página que o usuário definiu (célula não pode ser maior que a página).
  const A4_MAX_SIZE_CM = 15;
  const maxSizeCeiling = pageMode === 'a4' ? A4_MAX_SIZE_CM : Math.max(0.5, Math.min(pageWValid, pageHValid));

  // Se o teto mudar (ex: trocou de A4 para Personalizado com página pequena) e o valor
  // atual ultrapassar o novo teto, reclampa automaticamente — sem isso o cálculo de layout
  // usaria um maxSize maior que a própria página e travaria o grid em 0×0.
  useEffect(() => {
    setMaxSize((v) => clamp(v, 0.5, maxSizeCeiling));
  }, [maxSizeCeiling]);

  const handleSelectPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowAdvanced(true);
    } else {
      setShowAdvanced(false);
      const cfg = PRESETS[preset];
      setMaxSize(cfg.size);
      setSpacing(cfg.spacing);
    }
  }, []);

  const handleSelectPageMode = useCallback((mode: PageMode) => {
    setPageMode(mode);
    if (mode === 'custom_page') {
      // ao entrar em personalizado, já abre as configurações avançadas (mesmos controles reaproveitados)
      setSelectedPreset('custom');
      setShowAdvanced(true);
    }
  }, []);

  // ── Seleção de arquivo: SÓ preview no client. Imagem → direto. PDF → conta páginas ──
  const handleFile = useCallback(async (file: File) => {
    if (!fileOk(file)) {
      setErrorMsg('Envie uma imagem (PNG/JPEG) ou um PDF.'); setStage('error'); return;
    }
    setStage('processing'); setProgress('Preparando preview…');
    try {
      if (isPdfFile(file)) {
        const h = await openPdf(file);
        if (h.pages >= 2) {
          setPdfPending({ file, pages: h.pages });
          setPageChoice(1);
          setStage('page-select');
          return;
        }
        setArt(await rasterizePdfPage(file, 1));
      } else {
        setArt(await makeImagePreview(file));
      }
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao preparar a imagem.'); setStage('error');
    }
  }, []);

  // confirma a página escolhida no PDF multipágina
  const confirmPage = useCallback(async () => {
    if (!pdfPending) return;
    const { file } = pdfPending;
    setStage('processing'); setProgress(`Importando página ${pageChoice}…`);
    try {
      setArt(await rasterizePdfPage(file, pageChoice));
      setPdfPending(null);
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao importar a página.'); setStage('error');
    }
  }, [pdfPending, pageChoice]);

  // ── Liberar: gate de login → upload da alta → rota → cobrar ──────────
  const handleRelease = useCallback(async () => {
    if (!art || layoutInfo.totalImages === 0 || pageDimsInvalid) return;

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setStage('login'); return; }

    setStage('processing'); setProgress('Enviando imagem…');
    try {
      let cid = companyId;
      if (!cid) {
        const { data: comp } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        cid = comp?.id ?? '';
      }
      if (!cid) {
        setErrorMsg('Não encontrei uma empresa nesta conta.'); setStage('error'); return;
      }
      setCompanyId(cid);

      const uploadPath = await uploadArteSource(art, cid);

      setProgress('Gerando PDF de impressão…');
      const res = await fetch('/api/arte/duplicar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companyId: cid,
          uploadPath,
          spec: {
            maxSize,
            spacing,
            preset: selectedPreset,
            pageMode,
            pageWidthCm: pageMode === 'custom_page' ? pageWValid : undefined,
            pageHeightCm: pageMode === 'custom_page' ? pageHValid : undefined,
          },
        }),
      });
      const out = await res.json();

      if (!res.ok || !out.success) {
        if (res.status === 402) {
          setErrorMsg(`Créditos insuficientes. Esta função custa ${CREDITS} créditos e seu saldo é ${out.saldo ?? 0}.`);
        } else {
          setErrorMsg(out.error ?? 'Não foi possível gerar o arquivo.');
        }
        setStage('error');
        return;
      }

      const bin = atob(out.pdf_base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/pdf' });

      setResultBlob(blob);
      setResultBase64(out.pdf_base64);
      setResultName(out.file_name ?? 'duplicar-imagem.pdf');
      setSaldo(typeof out.saldo === 'number' ? out.saldo : null);
      setStage('result');
      playText('PDF pronto para impressão!').catch(() => {});
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Erro de conexão ao gerar.'); setStage('error');
    }
  }, [art, layoutInfo, pageDimsInvalid, supabase, companyId, maxSize, spacing, selectedPreset, pageMode, pageWValid, pageHValid, playText]);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url; a.download = resultName; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultName]);

  const handleReset = useCallback(() => {
    setStage('input'); setArt(null); setPdfPending(null);
    setResultBlob(null); setResultBase64(''); setErrorMsg('');
    setSelectedPreset('grid_3x3'); setShowAdvanced(false); setPageMode('a4');
  }, []);

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
    background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none',
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: stage === 'result' ? 880 : 640,
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
        padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Duplicar Imagem</h2>
          <button onClick={onClose} style={{
            padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8,
            background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <>
            <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Envie a imagem e escolha o layout: um grid pronto ou um tamanho personalizado. O sistema
                calcula quantas cópias cabem na página mantendo a proporção e o tamanho exatos, e gera
                um PDF de página única pronto para imprimir.
              </p>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{
                border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px',
                textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste a imagem</div>
              <div style={{ fontSize: 12 }}>PNG, JPEG ou PDF — será duplicada em grid.</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </div>
          </>
        )}

        {/* PAGE-SELECT (PDF com 2+ páginas) */}
        {stage === 'page-select' && pdfPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Esse PDF tem {pdfPending.pages} páginas</div>
            <p style={{ margin: 0, fontSize: 13, color: c.textMuted, lineHeight: 1.5 }}>
              Qual página você quer duplicar?
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPageChoice((p) => clamp(p - 1, 1, pdfPending.pages))} style={{
                width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18,
              }}>‹</button>
              <input type="number" min={1} max={pdfPending.pages} value={pageChoice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPageChoice(clamp(parseInt(e.target.value) || 1, 1, pdfPending.pages))}
                style={{ ...inputStyle, textAlign: 'center', width: 90, flex: 'none' }} />
              <span style={{ fontSize: 13, color: c.textMuted }}>de {pdfPending.pages}</span>
              <button onClick={() => setPageChoice((p) => clamp(p + 1, 1, pdfPending.pages))} style={{
                width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18,
              }}>›</button>
            </div>
            <button onClick={confirmPage} style={{
              padding: 14, borderRadius: 10, border: 'none', background: c.accent,
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              Usar página {pageChoice}
            </button>
            <button onClick={() => { setPdfPending(null); setStage(art ? 'configuring' : 'input'); }} style={{
              padding: 10, borderRadius: 8, border: `1px solid ${c.border}`,
              background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13,
            }}>
              Cancelar
            </button>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && art && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview da imagem enviada */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 180, height: 140, borderRadius: 8,
                border: `1px solid ${c.border}`, overflow: 'hidden', flexShrink: 0,
              }}>
                <img
                  src={art.previewDataUrl}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

            {/* Modo de página: A4 ou Personalizado */}
            <div>
              <label style={{ ...label, marginBottom: 8 }}>Tamanho da página:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => handleSelectPageMode('a4')}
                  style={{
                    padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    fontSize: 13, fontWeight: 600,
                    border: pageMode === 'a4' ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: pageMode === 'a4' ? 'rgba(0,174,239,0.1)' : c.bgSecondary,
                    color: c.text,
                  }}
                >
                  Tamanho A4
                </button>
                <button
                  onClick={() => handleSelectPageMode('custom_page')}
                  style={{
                    padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    fontSize: 13, fontWeight: 600,
                    border: pageMode === 'custom_page' ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: pageMode === 'custom_page' ? 'rgba(0,174,239,0.1)' : c.bgSecondary,
                    color: c.text,
                  }}
                >
                  Tamanho Personalizado
                </button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textMuted }}>
                {pageMode === 'a4'
                  ? 'Folha A4 (21×29,7cm) — ideal para impressão doméstica.'
                  : `Página única no tamanho que você definir (até ${PAGE_MAX_CM}×${PAGE_MAX_H_CM}cm) — ideal para rolos de adesivo.`}
              </p>
            </div>

            {/* Dimensões da página personalizada */}
            {pageMode === 'custom_page' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Largura da página (cm)</label>
                  <input type="number" min={1} max={PAGE_MAX_CM} step={0.5} value={customPageW}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustomPageW(parseFloat(e.target.value) || 0)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={label}>Altura da página (cm)</label>
                  <input type="number" min={1} max={PAGE_MAX_H_CM} step={0.5} value={customPageH}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustomPageH(parseFloat(e.target.value) || 0)}
                    style={inputStyle} />
                </div>
                {pageDimsInvalid && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 12, color: c.error }}>
                    Use largura até {PAGE_MAX_CM}cm e altura até {PAGE_MAX_H_CM}cm.
                  </div>
                )}
              </div>
            )}

            {/* Presets — só no modo A4 (sem 2×2) */}
            {pageMode === 'a4' && (
              <div>
                <label style={{ ...label, marginBottom: 8 }}>Escolha o layout:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  {(Object.keys(PRESETS) as Preset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        fontSize: 13, fontWeight: 500,
                        border: selectedPreset === preset ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                        background: selectedPreset === preset ? 'rgba(0,174,239,0.1)' : c.bgSecondary,
                        color: c.text,
                      }}
                    >
                      {PRESETS[preset].name}
                      <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>{PRESETS[preset].desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview do grid — SEMPRE visível quando há layout válido, independente do preset/página */}
            {layoutInfo.totalImages > 0 && !pageDimsInvalid && (() => {
              const pageWmm = (pageMode === 'a4' ? 21 : pageWValid) * 10;
              const pageHmm = (pageMode === 'a4' ? 29.7 : pageHValid) * 10;
              const marginMm = MARGIN_CM * 10;
              const gapMm = spacing; // spacing já é mm
              // Tamanho da célula é SEMPRE o real e fixo (igual ao que será impresso),
              // nunca esticado para preencher a área disponível — senão a imagem
              // distorce/corta visualmente quando há poucas colunas/linhas (ex: 1 coluna).
              const cellWmm = layoutInfo.finalWidth  * 10;
              const cellHmm = layoutInfo.finalHeight * 10;
              const mPctW = (marginMm / pageWmm) * 100;
              const mPctH = (marginMm / pageHmm) * 100;
              const cWpct = (cellWmm / pageWmm) * 100;
              const cHpct = (cellHmm / pageHmm) * 100;
              const gWpct = (gapMm   / pageWmm) * 100;
              const gHpct = (gapMm   / pageHmm) * 100;
              return (
                <div style={{ padding: 14, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 10 }}>
                    Preview do layout {pageMode === 'a4' ? '(A4)' : `(${pageWValid}×${pageHValid}cm)`}
                  </div>
                  <div style={{
                    position: 'relative', width: '100%', maxWidth: 300, margin: '0 auto',
                    aspectRatio: `${pageWmm} / ${pageHmm}`, background: '#fff',
                    border: '1px solid #d0d0d0', borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', overflow: 'hidden',
                  }}>
                    {Array.from({ length: layoutInfo.perColumn }).flatMap((_, row) =>
                      Array.from({ length: layoutInfo.perRow }).map((__, col) => (
                        <div key={`${row}-${col}`} style={{
                          position: 'absolute',
                          left:   `${mPctW + col * (cWpct + gWpct)}%`,
                          top:    `${mPctH + row * (cHpct + gHpct)}%`,
                          width:  `${cWpct}%`,
                          height: `${cHpct}%`,
                          background: art?.previewDataUrl
                            ? `url(${art.previewDataUrl}) center/cover no-repeat`
                            : c.accent,
                          borderRadius: 1,
                          border: '0.5px solid rgba(0,0,0,0.1)',
                        }} />
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Configurações avançadas — SÓ quando showAdvanced (preset "Avançado" OU modo Personalizado) */}
            {showAdvanced && (
              <div style={{ padding: 14, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Configurações avançadas</div>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: c.textMuted, lineHeight: 1.4 }}>
                  O tamanho definido aqui é mantido sempre. Colunas e linhas são calculadas automaticamente
                  para preencher a página sem distorcer a proporção.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>
                      Tamanho máximo (cm){pageMode === 'custom_page' ? ` — até ${maxSizeCeiling.toFixed(1)}cm` : ''}
                    </label>
                    <input
                      type="number" min={0.5} max={maxSizeCeiling} step={0.1} value={maxSize}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setMaxSize(clamp(parseFloat(e.target.value) || 0.5, 0.5, maxSizeCeiling))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={label}>Espaçamento entre imagens (mm)</label>
                    <input
                      type="number" min={0} max={5} step={0.5} value={spacing}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setSpacing(clamp(parseFloat(e.target.value) || 0, 0, 5))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Info do layout calculado — SEMPRE visível */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
              padding: '10px 12px', borderRadius: 8, background: c.bgSecondary,
              border: `1px solid ${c.border}`, fontSize: 13,
            }}>
              {[
                { l: 'Tamanho', v: `${layoutInfo.finalWidth.toFixed(1)}×${layoutInfo.finalHeight.toFixed(1)}cm` },
                { l: 'Grid',    v: `${layoutInfo.perRow}×${layoutInfo.perColumn}` },
                { l: 'Total',   v: String(layoutInfo.totalImages) },
                { l: 'Área',    v: `${layoutInfo.usedArea.toFixed(1)}%` },
              ].map(({ l, v }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ color: c.textMuted, fontSize: 11 }}>{l}</div>
                  <div style={{ fontWeight: 600, color: c.text, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Custo — SEMPRE visível (só quando logado) */}
            {logado && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '8px 12px', borderRadius: 8, background: c.bgSecondary,
                border: `1px solid ${c.border}`, fontSize: 13,
              }}>
                <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS} créditos</strong></span>
              </div>
            )}

            {layoutInfo.totalImages === 0 && !pageDimsInvalid && (
              <div style={{ fontSize: 12, color: c.error }}>
                A imagem é grande demais para caber na página com este tamanho. Reduza o tamanho em cm.
              </div>
            )}

            <button
              onClick={handleRelease}
              disabled={layoutInfo.totalImages === 0 || pageDimsInvalid}
              style={{
                padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: (layoutInfo.totalImages === 0 || pageDimsInvalid) ? 'not-allowed' : 'pointer',
                background: (layoutInfo.totalImages === 0 || pageDimsInvalid) ? c.border : c.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IconDownload /> Gerar PDF para impressão{logado ? ` (${CREDITS} créditos)` : ''}
            </button>
            <button onClick={handleReset} style={{
              padding: 10, borderRadius: 8, border: `1px solid ${c.border}`,
              background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13,
            }}>
              Trocar imagem
            </button>
          </div>
        )}

        {/* LOGIN (não logado tentou liberar) */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para liberar o arquivo</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview é livre. Para baixar o PDF, entre na sua conta — e ao se{' '}
              <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para gerar seus primeiros arquivos.
            </p>
            <button onClick={irParaLogin} style={{
              padding: 14, borderRadius: 10, border: 'none', background: c.accent,
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('configuring')} style={{
              padding: 10, borderRadius: 8, border: `1px solid ${c.border}`,
              background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13,
            }}>
              Voltar ao preview
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `3px solid ${c.border}`, borderTopColor: c.accent,
              animation: 'di-spin 0.8s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>{progress}</p>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8,
              background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`,
              color: c.success, fontSize: 14, fontWeight: 600,
            }}>
              <span>PDF para impressão pronto!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>
                {(resultBlob.size / 1024).toFixed(0)} KB
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16 }} className="di-result">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
                    Arquivo: <strong style={{ color: c.text }}>{resultName}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                    {layoutInfo.totalImages} imagens em grid {layoutInfo.perRow}×{layoutInfo.perColumn}
                    {saldo != null ? ` · saldo: ${saldo} créditos` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{
                    flex: 1, padding: 10, borderRadius: 8, border: 'none',
                    background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <IconDownload /> Baixar PDF
                  </button>
                  <button onClick={handleReset} style={{
                    flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`,
                    background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <IconRefresh /> Nova imagem
                  </button>
                </div>
              </div>
              <div className="di-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR
                  companyId={companyId} fileName={resultName}
                  fileType="application/pdf" fileBase64={resultBase64}
                  isDark={isDark} enabled={stage === 'result' && !!resultBase64}
                />
              </div>
            </div>
            <div className="di-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR
                companyId={companyId} fileName={resultName}
                fileType="application/pdf" fileBase64={resultBase64}
                isDark={isDark} enabled={stage === 'result' && !!resultBase64}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>
              Fecha automaticamente em {timeLeft}s
            </p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)',
              border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4,
            }}>
              {errorMsg}
            </div>
            <button onClick={() => setStage(art ? 'configuring' : 'input')} style={{
              padding: 12, borderRadius: 8, border: 'none',
              background: c.error, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}>
              Voltar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes di-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .di-result { flex-direction: column !important; }
          .di-qr-desktop { display: none !important; }
          .di-qr-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .di-qr-desktop { display: flex !important; flex-direction: column; }
          .di-qr-mobile { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
