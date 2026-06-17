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
type Preset = 'grid_2x2' | 'grid_3x3' | 'grid_4x4' | 'a4_completo' | 'custom';

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fileOk = (f: File) => f.type.startsWith('image/') || isPdfFile(f);

// ── Presets de layout ─────────────────────────────────────────────────────
const PRESETS: Record<Preset, { name: string; desc: string; size: number; spacing: number; cols: number; rows: number }> = {
  grid_2x2:    { name: 'Grid 2×2',    desc: '4 imagens',       size: 8,   spacing: 1,   cols: 2, rows: 2 },
  grid_3x3:    { name: 'Grid 3×3',    desc: '9 imagens',       size: 5.5, spacing: 0.8, cols: 3, rows: 3 },
  grid_4x4:    { name: 'Grid 4×4',    desc: '16 imagens',      size: 4,   spacing: 0.5, cols: 4, rows: 4 },
  a4_completo: { name: 'A4 Completo', desc: 'Máximo possível', size: 3,   spacing: 0.5, cols: 0, rows: 0 },
  custom:      { name: 'Avançado',    desc: 'Personalizado',   size: 5,   spacing: 1,   cols: 3, rows: 3 },
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
  const [maxSize, setMaxSize] = useState(5.5);
  const [spacing, setSpacing] = useState(0.8);
  const [manualCols, setManualCols] = useState(3);
  const [manualRows, setManualRows] = useState(3);
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

  // ── Cálculo de layout (espelha a rota no servidor) ────────────────────
  useEffect(() => {
    if (!art) return;
    const aspect = art.width / art.height;
    const finalH = maxSize;
    const finalW = maxSize * aspect;
    const spacingCm = spacing / 10;
    const availableW = 19;   // A4 21cm − 2×1cm margem
    const availableH = 27.7; // A4 29.7cm − 2×1cm margem

    let perRow: number, perColumn: number;
    if (selectedPreset === 'custom' && showAdvanced) {
      const maxCols = Math.floor((availableW + spacingCm) / (finalW + spacingCm));
      const maxRows = Math.floor((availableH + spacingCm) / (finalH + spacingCm));
      perRow    = Math.min(manualCols, maxCols);
      perColumn = Math.min(manualRows, maxRows);
    } else {
      perRow    = Math.floor((availableW + spacingCm) / (finalW + spacingCm));
      perColumn = Math.floor((availableH + spacingCm) / (finalH + spacingCm));
    }
    const totalImages = perRow * perColumn;
    const usedW = perRow * finalW + (perRow - 1) * spacingCm;
    const usedH = perColumn * finalH + (perColumn - 1) * spacingCm;
    const usedArea = (usedW * usedH) / (availableW * availableH) * 100;
    setLayoutInfo({ finalWidth: finalW, finalHeight: finalH, perRow, perColumn, totalImages, usedArea });
  }, [art, maxSize, spacing, selectedPreset, showAdvanced, manualCols, manualRows]);

  const handleSelectPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowAdvanced(true);
    } else {
      setShowAdvanced(false);
      const cfg = PRESETS[preset];
      setMaxSize(cfg.size);
      setSpacing(cfg.spacing);
      setManualCols(cfg.cols || 3);
      setManualRows(cfg.rows || 3);
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
    if (!art || layoutInfo.totalImages === 0) return;

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
            manualCols: selectedPreset === 'custom' ? manualCols : undefined,
            manualRows: selectedPreset === 'custom' ? manualRows : undefined,
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
  }, [art, layoutInfo, supabase, companyId, maxSize, spacing, selectedPreset, manualCols, manualRows, playText]);

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
    setSelectedPreset('grid_3x3'); setShowAdvanced(false);
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
            <div style={{ fontSize: 12 }}>PNG, JPEG ou PDF — será duplicada em grid no A4.</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
          </div>
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

            {/* Presets */}
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

            {/* Configurações avançadas */}
            {showAdvanced && (
              <div style={{ padding: 14, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Configurações avançadas</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Tamanho (cm): {maxSize.toFixed(1)}</label>
                    <input type="range" min={2} max={15} step={0.5} value={maxSize}
                      onChange={(e) => setMaxSize(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: c.accent }} />
                  </div>
                  <div>
                    <label style={label}>Espaçamento (mm): {spacing.toFixed(1)}</label>
                    <input type="range" min={0} max={5} step={0.5} value={spacing}
                      onChange={(e) => setSpacing(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: c.accent }} />
                  </div>
                  <div>
                    <label style={label}>Colunas: {manualCols}</label>
                    <input type="range" min={1} max={10} step={1} value={manualCols}
                      onChange={(e) => setManualCols(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: c.accent }} />
                  </div>
                  <div>
                    <label style={label}>Linhas: {manualRows}</label>
                    <input type="range" min={1} max={15} step={1} value={manualRows}
                      onChange={(e) => setManualRows(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: c.accent }} />
                  </div>
                </div>
              </div>
            )}

            {/* Info do layout calculado */}
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

            {/* Custo */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '8px 12px', borderRadius: 8, background: c.bgSecondary,
              border: `1px solid ${c.border}`, fontSize: 13,
            }}>
              <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS} créditos</strong></span>
            </div>

            {layoutInfo.totalImages === 0 && (
              <div style={{ fontSize: 12, color: c.error }}>
                A imagem é grande demais para caber no A4 com este tamanho. Reduza o tamanho em cm.
              </div>
            )}

            <button
              onClick={handleRelease}
              disabled={layoutInfo.totalImages === 0}
              style={{
                padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: layoutInfo.totalImages === 0 ? 'not-allowed' : 'pointer',
                background: layoutInfo.totalImages === 0 ? c.border : c.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IconDownload /> Gerar PDF para impressão ({CREDITS} créditos)
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
