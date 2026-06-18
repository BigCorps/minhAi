'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { makeImagePreview, openPdf, rasterizePdfPage, uploadArteSource, isPdfFile, type ArtePreview } from '@/lib/arte/prepareUpload';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'page-select' | 'configuring' | 'processing' | 'login' | 'result' | 'error';
type SideKey = 'frente' | 'verso';

interface Side {
  art: ArtePreview | null;
  zoom: number;
  offset: { x: number; y: number };
  rotation: number; // 0, 90, 180, 270
}

interface Props {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onRequireLogin?: () => void;
}

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.cyan, warn: '#d97706',
};

const OPENING_TEXT = 'Envie a arte. Informe a medida final e a sangria, posicione, e eu gero o arquivo pronto para a gráfica.';
const CREDITS = 5;
const DPI_MIN = 96;
const SAFE_MM = 5;
const AUTO_CLOSE = 90;

const mmToPt = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const emptySide = (): Side => ({ art: null, zoom: 1, offset: { x: 0, y: 0 }, rotation: 0 });
const cleanName = (s: string) => s.replace(/[^\w\-]+/g, '-').slice(0, 40);

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function rotateDataUrl(src: string, deg: number): Promise<string> {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return src;
  const img = await loadImg(src);
  const swap = d % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((d * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL('image/jpeg', 0.85);
}

const fileOk = (f: File) => f.type.startsWith('image/') || isPdfFile(f);

export default function ArteFinalDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [frente, setFrente] = useState<Side>(emptySide());
  const [verso, setVerso] = useState<Side | null>(null);
  const [active, setActive] = useState<SideKey>('frente');
  const [rotPreview, setRotPreview] = useState<string>('');

  // seletor de página de PDF multipágina
  const [pdfPending, setPdfPending] = useState<{ file: File; pages: number; side: SideKey } | null>(null);
  const [pageChoice, setPageChoice] = useState<number>(1);

  const [finalW, setFinalW] = useState<number>(90);
  const [finalH, setFinalH] = useState<number>(50);
  const [bleed, setBleed] = useState<number>(3);
  const [dpiTarget, setDpiTarget] = useState<number>(300);
  const [nome, setNome] = useState<string>('arte-final');

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
  const versoFileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const cur: Side = active === 'verso' && verso ? verso : frente;
  const setCur = useCallback((patch: Partial<Side>) => {
    if (active === 'verso' && verso) setVerso((s) => ({ ...(s as Side), ...patch }));
    else setFrente((s) => ({ ...s, ...patch }));
  }, [active, verso]);

  useEffect(() => {
    if (spoke.current) return;
    spoke.current = true;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((p) => { if (p <= 1) { onClose(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  useEffect(() => {
    let cancelled = false;
    if (!cur.art) { setRotPreview(''); return; }
    rotateDataUrl(cur.art.previewDataUrl, cur.rotation).then((u) => { if (!cancelled) setRotPreview(u); });
    return () => { cancelled = true; };
  }, [cur.art, cur.rotation]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user));
  }, [supabase]);

  // ── Geometria da face ativa (espelha a rota) ──
  const swap = cur.rotation % 180 !== 0;
  const effW = cur.art ? (swap ? cur.art.height : cur.art.width) : 1;
  const effH = cur.art ? (swap ? cur.art.width : cur.art.height) : 1;
  const imgAspect = effW / effH;
  const boxAspect = finalH > 0 ? finalW / finalH : 1;
  const ratioX = imgAspect > boxAspect ? imgAspect / boxAspect : 1;
  const ratioY = imgAspect > boxAspect ? 1 : boxAspect / imgAspect;
  const rx = ratioX * cur.zoom;
  const ry = ratioY * cur.zoom;
  const maxOffX = Math.max(0, (rx - 1) / 2);
  const maxOffY = Math.max(0, (ry - 1) / 2);
  const offX = clamp(cur.offset.x, -maxOffX, maxOffX);
  const offY = clamp(cur.offset.y, -maxOffY, maxOffY);

  useEffect(() => {
    setCur({ offset: { x: clamp(cur.offset.x, -maxOffX, maxOffX), y: clamp(cur.offset.y, -maxOffY, maxOffY) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.zoom, cur.rotation, finalW, finalH, active]);

  const sideDpi = useCallback((s: Side): number => {
    if (!s.art || !(finalW > 0) || !(finalH > 0)) return 0;
    const sw = s.rotation % 180 !== 0;
    const ew = sw ? s.art.height : s.art.width;
    const eh = sw ? s.art.width : s.art.height;
    const ia = ew / eh, ba = finalW / finalH;
    const rX = (ia > ba ? ia / ba : 1) * s.zoom;
    return Math.round(ew / ((mmToPt(finalW) * rX) / 72));
  }, [finalW, finalH]);

  const estDpi = sideDpi(cur);
  const dpiBaixoAtiva = !!cur.art && estDpi > 0 && estDpi < DPI_MIN;
  const dpiBaixoAny = (frente.art && sideDpi(frente) < DPI_MIN) || (verso?.art && sideDpi(verso) < DPI_MIN);
  const sangriaInvalida = finalW - 2 * bleed <= 0 || finalH - 2 * bleed <= 0;
  const medidaInvalida = !(finalW > 0) || !(finalH > 0) || sangriaInvalida;
  const bloqueado = medidaInvalida || !!dpiBaixoAny || !frente.art;

  // ── Drag ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!boxRef.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offX, oy: offY };
  }, [offX, offY]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const dx = (e.clientX - d.px) / r.width;
    const dy = (e.clientY - d.py) / r.height;
    setCur({ offset: { x: clamp(d.ox + dx, -maxOffX, maxOffX), y: clamp(d.oy + dy, -maxOffY, maxOffY) } });
  }, [maxOffX, maxOffY, setCur]);
  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const rotate = useCallback((dir: 1 | -1) => {
    setCur({ rotation: (((cur.rotation + dir * 90) % 360) + 360) % 360 });
  }, [cur.rotation, setCur]);
  const resetPos = useCallback(() => { setCur({ zoom: 1, offset: { x: 0, y: 0 } }); }, [setCur]);

  // aplica a arte preparada na face certa (sem upload — só preview)
  const applyArt = useCallback((art: ArtePreview, side: SideKey, fileName: string) => {
    if (side === 'frente') {
      setFrente((s) => ({ ...s, art }));
      setNome((prev) => (!prev || prev === 'arte-final' ? (cleanName(fileName.replace(/\.[^.]+$/, '')) || 'arte-final') : prev));
    } else {
      setVerso({ ...emptySide(), art });
      setActive('verso');
    }
  }, []);

  // Seleção de arquivo: SÓ preview no client. Imagem → direto. PDF → conta páginas.
  const handleFile = useCallback(async (file: File, side: SideKey) => {
    if (!fileOk(file)) { setErrorMsg('Envie uma imagem (PNG/JPEG) ou um PDF.'); setStage('error'); return; }
    setStage('processing'); setProgress('Preparando preview...');
    try {
      if (isPdfFile(file)) {
        const h = await openPdf(file);
        if (h.pages >= 2) {
          setPdfPending({ file, pages: h.pages, side });
          setPageChoice(side === 'verso' ? Math.min(2, h.pages) : 1);
          setStage('page-select');
          return;
        }
        applyArt(await rasterizePdfPage(file, 1), side, file.name);
      } else {
        applyArt(await makeImagePreview(file), side, file.name);
      }
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao preparar a arte.'); setStage(frente.art ? 'configuring' : 'error');
    }
  }, [applyArt, frente.art]);

  // confirma a página escolhida no PDF multipágina
  const confirmPage = useCallback(async () => {
    if (!pdfPending) return;
    const { file, side } = pdfPending;
    setStage('processing'); setProgress(`Importando página ${pageChoice}...`);
    try {
      applyArt(await rasterizePdfPage(file, pageChoice), side, file.name);
      setPdfPending(null);
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao importar a página.'); setStage('error');
    }
  }, [pdfPending, pageChoice, applyArt]);

  const removerVerso = useCallback(() => { setVerso(null); setActive('frente'); }, []);

  // "Liberar": aqui sim exige login. Sem sessão → tela de cadastro (20 créditos).
  const handleRelease = useCallback(async () => {
    if (bloqueado) return;
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

      const sidesArr: { upload_path: string; zoom: number; offset_x: number; offset_y: number; rotation: number }[] = [];
      for (const s of [frente, ...(verso ? [verso] : [])]) {
        if (!s.art) continue;
        const uploadPath = await uploadArteSource(s.art, cid);
        sidesArr.push({ upload_path: uploadPath, zoom: s.zoom, offset_x: clamp(s.offset.x, -9, 9), offset_y: clamp(s.offset.y, -9, 9), rotation: s.rotation });
      }

      setProgress(verso ? 'Gerando PDF (frente e verso)...' : 'Gerando PDF de produção...');
      const res = await fetch(`/api/arte/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId: cid, spec: { final_w_mm: finalW, final_h_mm: finalH, bleed_mm: bleed, dpi_target: dpiTarget, nome, sides: sidesArr } }),
      });
      const out = await res.json();
      if (!res.ok || !out.success) {
        setErrorMsg(res.status === 402
          ? `Créditos insuficientes. Esta arte custa ${CREDITS} créditos e seu saldo é ${out.saldo ?? 0}.`
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
      playText('Arquivo pronto! Já está no tamanho final.').catch(() => {});
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Erro de conexão ao gerar.'); setStage('error');
    }
  }, [bloqueado, supabase, companyId, frente, verso, finalW, finalH, bleed, dpiTarget, nome, playText]);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a'); a.href = url; a.download = resultName; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultName]);

  const handleReset = useCallback(() => {
    setStage('input'); setFrente(emptySide()); setVerso(null); setActive('frente');
    setPdfPending(null); setResultBlob(null); setResultBase64(''); setErrorMsg(''); setNome('arte-final');
  }, []);

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14, background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none' };
  const tabStyle = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? c.accent : c.border}`, background: on ? c.accent : 'transparent', color: on ? '#fff' : c.textMuted });

  const bleedPctX = finalW > 0 ? (bleed / finalW) * 100 : 0;
  const bleedPctY = finalH > 0 ? (bleed / finalH) * 100 : 0;
  const safePctX = finalW > 0 ? ((bleed + SAFE_MM) / finalW) * 100 : 0;
  const safePctY = finalH > 0 ? ((bleed + SAFE_MM) / finalH) * 100 : 0;

  const imgStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center',
    transform: `translate(${offX * 100}%, ${offY * 100}%) scale(${cur.zoom})`,
    transformOrigin: 'center', userSelect: 'none', pointerEvents: 'none', display: 'block',
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'result' ? 880 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Arte Final</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f, 'frente'); }}
            style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px', textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste sua arte</div>
            <div style={{ fontSize: 12 }}>PNG, JPEG ou PDF.</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 'frente'); e.currentTarget.value = ''; }} />
          </div>
        )}

        {/* PAGE-SELECT (PDF com 2+ páginas) */}
        {stage === 'page-select' && pdfPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Esse PDF tem {pdfPending.pages} páginas</div>
            <p style={{ margin: 0, fontSize: 13, color: c.textMuted, lineHeight: 1.5 }}>
              Qual página usar {pdfPending.side === 'verso' ? 'no verso' : 'na frente'}?
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPageChoice((p) => clamp(p - 1, 1, pdfPending.pages))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>‹</button>
              <input type="number" min={1} max={pdfPending.pages} value={pageChoice}
                onChange={(e) => setPageChoice(clamp(parseInt(e.target.value) || 1, 1, pdfPending.pages))}
                style={{ ...inputStyle, textAlign: 'center', width: 90, flex: 'none' }} />
              <span style={{ fontSize: 13, color: c.textMuted }}>de {pdfPending.pages}</span>
              <button onClick={() => setPageChoice((p) => clamp(p + 1, 1, pdfPending.pages))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>›</button>
            </div>
            <button onClick={confirmPage} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Usar página {pageChoice}
            </button>
            <button onClick={() => { setPdfPending(null); setStage(frente.art ? 'configuring' : 'input'); }} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && frente.art && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setActive('frente')} style={tabStyle(active === 'frente')}>Frente</button>
              {verso ? (
                <button onClick={() => setActive('verso')} style={tabStyle(active === 'verso')}>Verso</button>
              ) : (
                <button onClick={() => versoFileRef.current?.click()} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px dashed ${c.border}`, background: 'transparent', color: c.textMuted }}>+ Adicionar verso</button>
              )}
              <input ref={versoFileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 'verso'); e.currentTarget.value = ''; }} />
            </div>
            {verso && active === 'verso' && (
              <button onClick={removerVerso} style={{ alignSelf: 'flex-start', fontSize: 11, color: c.error, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: -6 }}>Remover verso</button>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div ref={boxRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                style={{ position: 'relative', width: 'min(100%, 360px)', aspectRatio: `${finalW} / ${finalH}`, background: c.bgSecondary, border: `1px solid ${c.border}`, borderRadius: 4, overflow: 'hidden', cursor: 'grab', touchAction: 'none' }}>
                {rotPreview && <img src={rotPreview} alt="" style={imgStyle} draggable={false} />}
                <div style={{ position: 'absolute', left: `${bleedPctX}%`, top: `${bleedPctY}%`, right: `${bleedPctX}%`, bottom: `${bleedPctY}%`, border: '1px solid rgba(220,38,38,0.95)', boxSizing: 'border-box', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: `${safePctX}%`, top: `${safePctY}%`, right: `${safePctX}%`, bottom: `${safePctY}%`, border: '1px dashed rgba(16,185,129,0.9)', boxSizing: 'border-box', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11, color: c.textMuted }}>
              <span><span style={{ color: '#dc2626' }}>—</span> corte</span>
              <span><span style={{ color: '#10b981' }}>┄</span> segurança</span>
              <span>arraste para posicionar</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: c.textMuted }}>Zoom: {Math.round(cur.zoom * 100)}%</label>
                  <button onClick={resetPos} style={{ fontSize: 11, color: c.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Centralizar</button>
                </div>
                <input type="range" min={1} max={5} step={0.01} value={cur.zoom} onChange={(e) => setCur({ zoom: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: c.accent }} />
              </div>
              <button onClick={() => rotate(-1)} title="Girar -90°" style={{ width: 38, height: 38, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 16 }}>↺</button>
              <button onClick={() => rotate(1)} title="Girar +90°" style={{ width: 38, height: 38, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 16 }}>↻</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={label}>Largura final (mm)</label><input type="number" min={1} value={finalW} onChange={(e) => setFinalW(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Altura final (mm)</label><input type="number" min={1} value={finalH} onChange={(e) => setFinalH(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Sangria (mm)</label><input type="number" min={0} max={20} step={0.5} value={bleed} onChange={(e) => setBleed(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
            </div>
            <p style={{ margin: '-4px 0 0', fontSize: 11, color: c.textMuted }}>Tamanho final do arquivo (sangria por dentro). Vale para frente e verso.</p>
            <div><label style={label}>Nome do arquivo</label><input type="text" value={nome} onChange={(e) => setNome(cleanName(e.target.value))} style={inputStyle} /></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13, gap: 12 }}>
              <span style={{ color: dpiBaixoAtiva ? c.warn : c.textMuted, whiteSpace: 'nowrap' }}>DPI atual: <strong style={{ color: dpiBaixoAtiva ? c.warn : c.text }}>{estDpi || '—'}</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.textMuted }}>alvo
                <input type="number" min={72} max={300} value={dpiTarget} onChange={(e) => setDpiTarget(clamp(parseInt(e.target.value) || 0, 72, 300))} style={{ width: 64, padding: '6px 8px', borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 13 }} />
              </span>
              {logado && (
                <span style={{ color: c.textMuted, whiteSpace: 'nowrap' }}>Custo: <strong style={{ color: c.text }}>{CREDITS}</strong></span>
              )}
            </div>

            {sangriaInvalida && <div style={{ fontSize: 12, color: c.error }}>A sangria é maior que a medida. Reduza a sangria ou aumente a medida.</div>}
            {dpiBaixoAny && !sangriaInvalida && <div style={{ fontSize: 12, color: c.warn, lineHeight: 1.4 }}>Uma das faces está com resolução baixa para essa medida/zoom. Reduza o zoom ou envie arte maior. (Não cobramos enquanto estiver abaixo do mínimo.)</div>}

            <button onClick={handleRelease} disabled={bloqueado} style={{ padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: bloqueado ? 'not-allowed' : 'pointer', background: bloqueado ? c.border : c.accent }}>
              Liberar PDF de produção ({CREDITS} créditos){verso ? ' · frente e verso' : ''}
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>Recomeçar</button>
          </div>
        )}

        {/* LOGIN (não logado tentou liberar) */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para liberar o arquivo</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview é livre. Para baixar o PDF de produção pronto pra gráfica, entre na sua conta — e ao se <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong> para gerar suas primeiras artes.
            </p>
            <button onClick={irParaLogin} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('configuring')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Voltar ao preview</button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'af-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>{progress}</p>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <span>PDF de produção pronto!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{(resultBlob.size / 1024).toFixed(0)} KB</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }} className="af-result">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Arquivo: <strong style={{ color: c.text }}>{resultName}</strong></p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>{finalW}×{finalH}mm · sangria {bleed}mm · {verso ? 'frente e verso' : 'só frente'}{saldo != null ? ` · saldo: ${saldo}` : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Baixar PDF</button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Nova arte</button>
                </div>
              </div>
              <div className="af-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>
            <div className="af-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>Fecha automaticamente em {timeLeft}s</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>{errorMsg}</div>
            <button onClick={() => setStage(frente.art ? 'configuring' : 'input')} style={{ padding: 12, borderRadius: 8, border: 'none', background: c.error, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Voltar</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes af-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .af-result { flex-direction: column !important; } .af-qr-desktop { display: none !important; } .af-qr-mobile { display: block !important; } }
        @media (min-width: 641px) { .af-qr-desktop { display: flex !important; flex-direction: column; } .af-qr-mobile { display: none !important; } }
      `}</style>
    </div>,
    document.body
  );
}
