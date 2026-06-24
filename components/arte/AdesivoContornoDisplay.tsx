'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { makeImagePreview, openPdf, rasterizePdfPage, uploadArteSource, isPdfFile, type ArtePreview } from '@/lib/arte/prepareUpload';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'page-select' | 'configuring' | 'processing' | 'login' | 'result' | 'error';
type Shape = 'square' | 'rounded' | 'circle' | 'auto';

interface Props {
  data: { companyId: string; prefillFile?: File };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onRequireLogin: () => void;
}

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.magenta, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.magenta, warn: '#d97706',
};

const OPENING_TEXT = 'Envie a arte do adesivo. Escolha a forma do corte e o tamanho, e eu gero a arte e o corte.';
const CREDITS = 5;
const AUTO_CLOSE = 90;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cleanName = (s: string) => s.replace(/[^\w\-]+/g, '-').slice(0, 40);
const fileOk = (f: File) => f.type.startsWith('image/') || isPdfFile(f);

const SHAPES: { key: Shape; label: string }[] = [
  { key: 'square', label: 'Quadrado' },
  { key: 'rounded', label: 'Arredondado' },
  { key: 'circle', label: 'Redondo' },
  { key: 'auto', label: 'Automático' },
];
const CUT_OPTS = [
  { key: 'magenta', label: 'Magenta', swatch: CMYK.magenta },
  { key: 'cyan', label: 'Ciano', swatch: CMYK.cyan },
  { key: 'yellow', label: 'Amarelo', swatch: CMYK.yellow },
  { key: 'black', label: 'Preto', swatch: CMYK.key },
];

export default function AdesivoContornoDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [art, setArt] = useState<ArtePreview | null>(null);
  const [pdfPending, setPdfPending] = useState<{ file: File; pages: number } | null>(null);
  const [pageChoice, setPageChoice] = useState<number>(1);

  const [shape, setShape] = useState<Shape>('circle');
  const [cutW, setCutW] = useState<number>(50);
  const [cutH, setCutH] = useState<number>(50);
  const [radius, setRadius] = useState<number>(6);
const [offset, setOffset] = useState<number>(3);
const minSangria = (cutW < 30 || cutH < 30) ? 2 : 3;
const [sangria, setSangria] = useState<number>(minSangria);
const [alignX, setAlignX] = useState<number>(0);
const [alignY, setAlignY] = useState<number>(0);
const [zoom, setZoom] = useState<number>(100); // 50–300%, mantém o corte fixo e a imagem ajusta

useEffect(() => {
  if (sangria < minSangria) setSangria(minSangria);
}, [minSangria]);
  
  const [bleedMode, setBleedMode] = useState<'externa' | 'interna'>('externa');
  const [cutColor, setCutColor] = useState<string>('magenta');
  const [nome, setNome] = useState<string>('adesivo');

  const [logado, setLogado] = useState<boolean>(false);
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

useEffect(() => {
  if (spoke.current) return;
  spoke.current = true;
  window.speechSynthesis?.cancel();

  if (data.prefillFile) {
    handleFile(data.prefillFile); // confirme o nome real da função de upload desse modal
    playText('Arquivo recebido! ...').catch(() => {});
  } else {
    playText(OPENING_TEXT).catch(() => {});
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user)); }, [supabase]);
  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((p) => { if (p <= 1) { onClose(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  const isAuto = shape === 'auto';
  const autoH = art ? cutW * (art.height / art.width) : 0;
  const swatch = CUT_OPTS.find((o) => o.key === cutColor)?.swatch ?? CMYK.magenta;

  const handleFile = useCallback(async (file: File) => {
    if (!fileOk(file)) { setErrorMsg('Envie uma imagem (PNG/JPEG) ou um PDF.'); setStage('error'); return; }
    setStage('processing'); setProgress('Preparando preview...');
    try {
      if (isPdfFile(file)) {
        const h = await openPdf(file);
        if (h.pages >= 2) { setPdfPending({ file, pages: h.pages }); setPageChoice(1); setStage('page-select'); return; }
        setArt(await rasterizePdfPage(file, 1));
      } else {
        setArt(await makeImagePreview(file));
      }
      setNome((prev) => (!prev || prev === 'adesivo' ? (cleanName(file.name.replace(/\.[^.]+$/, '')) || 'adesivo') : prev));
      setStage('configuring');
    } catch (e) { setErrorMsg((e as Error).message ?? 'Falha ao preparar a arte.'); setStage('error'); }
  }, []);

  const confirmPage = useCallback(async () => {
    if (!pdfPending) return;
    const { file } = pdfPending;
    setStage('processing'); setProgress(`Importando página ${pageChoice}...`);
    try {
      setArt(await rasterizePdfPage(file, pageChoice));
      setNome((prev) => (!prev || prev === 'adesivo' ? (cleanName(file.name.replace(/\.[^.]+$/, '')) || 'adesivo') : prev));
      setPdfPending(null); setStage('configuring');
    } catch (e) { setErrorMsg((e as Error).message ?? 'Falha ao importar a página.'); setStage('error'); }
  }, [pdfPending, pageChoice]);

const handleRelease = useCallback(async () => {
  if (!art) return;
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) { setStage('login'); return; }

  setStage('processing'); setProgress('Enviando arte...');
  try {
    let cid = data.companyId || companyId;
    if (!cid) {
      const { data: ensured } = await supabase.rpc('ensure_my_arte_company');
      cid = (ensured as string) ?? '';
    }
    if (!cid) { setErrorMsg('Não foi possível preparar sua conta. Recarregue e tente de novo.'); setStage('error'); return; }
    setCompanyId(cid);

    const uploadPath = await uploadArteSource(art, cid);

const spec: any = isAuto
  ? { shape: 'auto', cut_w_mm: cutW, offset_mm: offset, cut_color: cutColor, nome }
  : { shape, cut_w_mm: cutW, cut_h_mm: cutH, radius_mm: radius, sangria_mm: sangria, bleed_mode: bleedMode, cut_color: cutColor, nome, align_x_pct: alignX, align_y_pct: alignY, zoom_pct: zoom };

    setProgress('Gerando arte e corte...');
    const res = await fetch('/api/arte/adesivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ companyId: cid, uploadPath, spec }),
    });
    const out = await res.json();
    if (!res.ok || !out.success) {
      setErrorMsg(res.status === 402
        ? `Créditos insuficientes. Este adesivo custa ${CREDITS} créditos e seu saldo é ${out.saldo ?? 0}.`
        : (out.error ?? 'Não foi possível gerar o arquivo.'));
      setStage('error'); return;
    }
    const bin = atob(out.pdf_base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    setResultBlob(new Blob([arr], { type: 'application/pdf' }));
    setResultBase64(out.pdf_base64);
    setResultName(out.file_name ?? `${nome}.pdf`);
    setSaldo(typeof out.saldo === 'number' ? out.saldo : null);
    setStage('result');
    playText('Adesivo pronto! Página 1 com a arte, página 2 com o corte.').catch(() => {});
  } catch (e) { setErrorMsg((e as Error).message ?? 'Erro de conexão ao gerar.'); setStage('error'); }
}, [art, isAuto, shape, cutW, cutH, radius, offset, sangria, bleedMode, cutColor, nome, alignX, alignY, zoom, supabase, companyId, playText]);

  const irParaLogin = useCallback(() => { if (onRequireLogin) onRequireLogin(); else window.location.href = '/login'; }, [onRequireLogin]);
  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a'); a.href = url; a.download = resultName; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultName]);
  const handleReset = useCallback(() => {
    setStage('input'); setArt(null); setPdfPending(null);
    setResultBlob(null); setResultBase64(''); setErrorMsg(''); setNome('adesivo');
  }, []);

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14, background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none' };
  const semAlfa = isAuto && !!art && !art.hasAlpha;

  // ── Modelo final do preview — MESMA fórmula usada no backend (route.ts) ──
  // O BOX (canvas visível) é SEMPRE fixo na proporção da cobertura (coverWmm×coverHmm) —
  // nunca cresce com zoom. Zoom controla só o tamanho da <img> DENTRO do box (>100% corta
  // as bordas que excedem via overflow:hidden do container; <100% deixa o fundo do box
  // visível ao redor). O alinhamento desloca a <img> livremente, SEM TRAVA — pode levar a
  // imagem parcialmente fora do box se o usuário levar ao extremo, exatamente como no PDF.
  const coverWmm = bleedMode === 'interna' ? cutW : cutW + 2 * sangria;
  const coverHmm = bleedMode === 'interna' ? cutH : cutH + 2 * sangria;
  const docW = coverWmm, docH = coverHmm; // valor exibido ao usuário (cobertura mínima garantida)

  const artAspectPreview = art ? art.width / art.height : 1;
  let previewDrawWmm: number, previewDrawHmm: number;
  if (artAspectPreview > coverWmm / coverHmm) { previewDrawHmm = coverHmm; previewDrawWmm = coverHmm * artAspectPreview; }
  else { previewDrawWmm = coverWmm; previewDrawHmm = coverWmm / artAspectPreview; }
  previewDrawWmm *= zoom / 100;
  previewDrawHmm *= zoom / 100;

  const alignXfrac = alignX / 50; // -1..+1, sem clamp adicional de slack — desloca livremente
  const alignYfrac = alignY / 50;
  const offsetXmm = (coverWmm / 2) * alignXfrac;
  const offsetYmm = (coverHmm / 2) * alignYfrac; // "+": imagem desce na tela (mesma convenção do backend)

  // boxW/boxH = SEMPRE a proporção da cobertura fixa (nunca muda com zoom/alinhamento)
  const boxW = 220;
  const boxH = isAuto ? 220 : Math.round(220 * (coverHmm / Math.max(1, coverWmm)));
  const pxPerMm = boxW / Math.max(1, coverWmm);

  // posição/tamanho da <img> dentro do box, em px — pode exceder ou não cobrir o box
  // inteiro; o overflow:hidden do container corta o excesso, igual ao composite() no backend.
  const imgWpx = previewDrawWmm * pxPerMm;
  const imgHpx = previewDrawHmm * pxPerMm;
  const imgLeftPx = (boxW - imgWpx) / 2 + offsetXmm * pxPerMm; // X: tela e PDF crescem na mesma direção
  const imgTopPx = (boxH - imgHpx) / 2 + offsetYmm * pxPerMm;  // Y: tela cresce p/ baixo, PDF cresce p/ cima (convenção do slider preservada nos dois)

  const cutWpx = cutW * pxPerMm, cutHpx = cutH * pxPerMm;
  const cutLeftPx = (boxW - cutWpx) / 2, cutTopPx = (boxH - cutHpx) / 2;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'result' ? 880 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Adesivo com Recorte</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

{stage === 'input' && (
  <>
    <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
      <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
        Envie a arte e escolha a forma e o tamanho do corte. O sistema gera um PDF com 2 páginas:
        a primeira com a arte em CMYK, a segunda com a linha de corte — pronto para enviar à gráfica.
        A sangria é adicionada automaticamente conforme o padrão exigido.
      </p>
    </div>
    <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
      style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px', textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste a arte do adesivo</div>
      <div style={{ fontSize: 12 }}>PNG, JPEG ou PDF. O modo "Automático" recorta na forma do PNG transparente.</div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
    </div>
  </>
)}

        {/* PAGE-SELECT */}
        {stage === 'page-select' && pdfPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Esse PDF tem {pdfPending.pages} páginas</div>
            <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Qual página você quer usar?</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPageChoice((p) => clamp(p - 1, 1, pdfPending.pages))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>‹</button>
              <input type="number" min={1} max={pdfPending.pages} value={pageChoice} onChange={(e) => setPageChoice(clamp(parseInt(e.target.value) || 1, 1, pdfPending.pages))} style={{ ...inputStyle, textAlign: 'center', width: 90 }} />
              <span style={{ fontSize: 13, color: c.textMuted }}>de {pdfPending.pages}</span>
              <button onClick={() => setPageChoice((p) => clamp(p + 1, 1, pdfPending.pages))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>›</button>
            </div>
            <button onClick={confirmPage} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Usar página {pageChoice}</button>
            <button onClick={() => { setPdfPending(null); setStage(art ? 'configuring' : 'input'); }} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && art && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* preview com overlay do corte — posição/tamanho calculados manualmente (mesma
                fórmula do backend), garantindo que o preview bata exatamente com o PDF gerado */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: boxW, height: boxH, background: c.bgSecondary, border: `1px solid ${c.border}`, borderRadius: 4, overflow: 'hidden' }}>
                {isAuto ? (
                  <img src={art.previewDataUrl} alt="" style={{
                    position: 'absolute', display: 'block', inset: 0, width: '100%', height: '100%',
                    maxWidth: 'none', maxHeight: 'none',
                    objectFit: 'contain',
                  }} />
                ) : (
                  <img src={art.previewDataUrl} alt="" style={{
                    position: 'absolute', display: 'block',
                    left: imgLeftPx, top: imgTopPx, width: imgWpx, height: imgHpx,
                    maxWidth: 'none', maxHeight: 'none',
                  }} />
                )}
                {!isAuto && (
                  <svg width={boxW} height={boxH} viewBox={`0 0 ${boxW} ${boxH}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {/* linha de corte (real, vai pro PDF) */}
                    {shape === 'circle'
                      ? <ellipse cx={boxW / 2} cy={boxH / 2} rx={cutWpx / 2} ry={cutHpx / 2} fill="none" stroke={swatch} strokeWidth="1.5" />
                      : <rect x={cutLeftPx} y={cutTopPx} width={cutWpx} height={cutHpx} rx={radius * pxPerMm} ry={radius * pxPerMm} fill="none" stroke={swatch} strokeWidth="1.5" />}
                    {/* área de segurança (só visual — recuo de `sangria` pra dentro do corte; texto/elementos
                        importantes não devem passar dela, evitando risco de corte por oscilação da faca) */}
                    {shape === 'circle'
                      ? <ellipse cx={boxW / 2} cy={boxH / 2} rx={Math.max(0, cutWpx / 2 - sangria * pxPerMm)} ry={Math.max(0, cutHpx / 2 - sangria * pxPerMm)} fill="none" stroke={c.textMuted} strokeWidth="1" strokeDasharray="3 3" />
                      : <rect x={cutLeftPx + sangria * pxPerMm} y={cutTopPx + sangria * pxPerMm} width={Math.max(0, cutWpx - 2 * sangria * pxPerMm)} height={Math.max(0, cutHpx - 2 * sangria * pxPerMm)} rx={Math.max(0, radius - sangria) * pxPerMm} ry={Math.max(0, radius - sangria) * pxPerMm} fill="none" stroke={c.textMuted} strokeWidth="1" strokeDasharray="3 3" />}
                  </svg>
                )}
              </div>
            </div>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: c.textMuted }}>
              {isAuto
                ? `O corte segue a silhueta da arte (recuo ${offset}mm).`
                : bleedMode === 'externa'
                  ? `Corte ${cutW}×${cutH}mm · arquivo ${docW}×${docH}mm (sangria ${sangria}mm por lado). Linha pontilhada = área de segurança para texto.`
                  : `Arte ${cutW}×${cutH}mm · corte entra ${sangria}mm (adesivo fica ${Math.max(5, cutW - 2 * sangria)}×${Math.max(5, cutH - 2 * sangria)}mm). Linha pontilhada = área de segurança para texto.`}
            </p>

            {semAlfa && (
              <div style={{ fontSize: 12, color: c.warn, lineHeight: 1.4, padding: '8px 10px', borderRadius: 8, background: 'rgba(217,119,6,0.08)', border: `1px solid ${c.warn}` }}>
                Sem fundo transparente, o "Automático" vira um retângulo. Para recorte na forma, envie um PNG transparente — ou escolha uma forma acima.
              </div>
            )}

            {/* forma */}
            <div>
              <label style={label}>Forma do corte</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SHAPES.map((s) => (
                  <button key={s.key} onClick={() => setShape(s.key)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: c.bgSecondary, border: shape === s.key ? `2px solid ${c.accent}` : `1px solid ${c.border}`, color: c.text }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* tamanho */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={label}>{isAuto ? 'Largura (mm)' : bleedMode === 'externa' ? 'Largura do corte (mm)' : 'Largura da arte (mm)'}</label><input type="number" min={10} value={cutW} onChange={(e) => setCutW(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              {isAuto
                ? <div><label style={label}>Altura (auto)</label><input type="text" value={`${autoH.toFixed(0)} mm`} readOnly style={{ ...inputStyle, color: c.textMuted }} /></div>
                : <div><label style={label}>{bleedMode === 'externa' ? 'Altura do corte (mm)' : 'Altura da arte (mm)'}</label><input type="number" min={10} value={cutH} onChange={(e) => setCutH(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>}
            </div>

            {shape === 'rounded' && (
              <div><label style={label}>Raio dos cantos: {radius}mm</label><input type="range" min={1} max={Math.min(cutW, cutH) / 2} step={0.5} value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} /></div>
            )}

            {/* sangria + ajuste fino + modo (só formas geométricas) */}
            {!isAuto && (
              <>
              <div>
  <label style={label}>
    Sangria: {sangria}mm
    {sangria < minSangria && (
      <span style={{ color: c.error, marginLeft: 6 }}>
        mínimo {minSangria}mm exigido pela gráfica
      </span>
    )}
  </label>
  <input
    type="range"
    min={minSangria}
    max={10}
    step={0.5}
    value={sangria}
    onChange={(e) => setSangria(parseFloat(e.target.value))}
    style={{ width: '100%', accentColor: c.accent }}
  />
</div>

                {/* zoom + ajuste fino da posição da arte — junto da sangria, pois ajusta a mesma área */}
                <div>
                  <label style={label}>Zoom da imagem: {zoom}%</label>
                  <input
                    type="range" min={50} max={300} step={5}
                    value={zoom}
                    onChange={(e) => setZoom(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: c.accent }}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: c.textMuted, lineHeight: 1.4 }}>
                    O corte fica parado; o zoom move a imagem por dentro dele. Abaixo de 100% pode sobrar
                    espaço nas bordas — esse espaço sai preenchido com a cor da borda da própria imagem.
                  </p>
                </div>

                <div>
                  <label style={label}>Ajuste fino da posição da arte</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: c.textMuted }}>Horizontal: {alignX > 0 ? `+${alignX}` : alignX}</span>
                      <input
                        type="range" min={-50} max={50} step={1}
                        value={alignX}
                        onChange={(e) => setAlignX(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: c.accent }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: c.textMuted }}>Vertical: {alignY > 0 ? `+${alignY}` : alignY}</span>
                      <input
                        type="range" min={-50} max={50} step={1}
                        value={alignY}
                        onChange={(e) => setAlignY(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: c.accent }}
                      />
                    </div>
                  </div>
                  {(alignX !== 0 || alignY !== 0 || zoom !== 100) && (
                    <button onClick={() => { setAlignX(0); setAlignY(0); setZoom(100); }} style={{ marginTop: 6, fontSize: 11, color: c.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Centralizar e resetar zoom
                    </button>
                  )}
                </div>

                <div>
                  <label style={label}>Como aplicar a sangria</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setBleedMode('externa')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: c.bgSecondary, border: bleedMode === 'externa' ? `2px solid ${c.accent}` : `1px solid ${c.border}`, color: c.text }}>Por fora (transborda)</button>
                    <button onClick={() => setBleedMode('interna')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: c.bgSecondary, border: bleedMode === 'interna' ? `2px solid ${c.accent}` : `1px solid ${c.border}`, color: c.text }}>Por dentro (recorta)</button>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textMuted, lineHeight: 1.4 }}>
                    {bleedMode === 'externa'
                      ? 'A medida é o corte. A arte é ampliada e transborda. Ideal quando a arte tem fundo/moldura de sobra (ex.: foto, círculo cheio).'
                      : 'A medida é a arte inteira. O corte entra para dentro. Ideal quando a arte não pode ser cortada nas bordas (ex.: logo com texto na margem).'}
                  </p>
                </div>
              </>
            )}

            {isAuto && (
              <div><label style={label}>Recuo do corte: {offset}mm</label><input type="range" min={0} max={8} step={0.5} value={offset} onChange={(e) => setOffset(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} /></div>
            )}

{/* cor do corte */}
            <div>
              <label style={label}>Cor da linha de corte</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CUT_OPTS.map((o) => (
                  <button key={o.key} onClick={() => setCutColor(o.key)} title={o.label}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', background: c.bgSecondary, border: cutColor === o.key ? `2px solid ${c.accent}` : `1px solid ${c.border}`, color: c.text, fontSize: 11 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: o.swatch, border: '1px solid rgba(0,0,0,0.15)' }} />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div><label style={label}>Nome do arquivo</label><input type="text" value={nome} onChange={(e) => setNome(cleanName(e.target.value))} style={inputStyle} /></div>
            {logado && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13 }}>
                <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS} créditos</strong></span>
              </div>
            )}

            <button onClick={handleRelease} style={{ padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: c.accent }}>
              Liberar adesivo com corte{logado ? ` (${CREDITS} créditos)` : ''}
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>Trocar arte</button>
          </div>
        )}

        {/* LOGIN */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para liberar o arquivo</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview é livre. Para baixar o PDF com a arte e o corte, entre na sua conta — e ao se <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para gerar seus primeiros arquivos.
            </p>
            <button onClick={irParaLogin} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Entrar / Cadastrar e ganhar 20 créditos</button>
            <button onClick={() => setStage('configuring')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Voltar ao preview</button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'ad-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>{progress}</p>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <span>Adesivo pronto!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{(resultBlob.size / 1024).toFixed(0)} KB</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }} className="ad-result">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Arquivo: <strong style={{ color: c.text }}>{resultName}</strong></p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>Pág 1: arte · Pág 2: corte{saldo != null ? ` · saldo: ${saldo}` : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Baixar PDF</button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Novo adesivo</button>
                </div>
              </div>
              <div className="ad-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>
            <div className="ad-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>Fecha automaticamente em {timeLeft}s</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>{errorMsg}</div>
            <button onClick={() => setStage(art ? 'configuring' : 'input')} style={{ padding: 12, borderRadius: 8, border: 'none', background: c.error, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Voltar</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ad-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .ad-result { flex-direction: column !important; } .ad-qr-desktop { display: none !important; } .ad-qr-mobile { display: block !important; } }
        @media (min-width: 641px) { .ad-qr-desktop { display: flex !important; flex-direction: column; } .ad-qr-mobile { display: none !important; } }
      `}</style>
    </div>,
    document.body
  );
}
