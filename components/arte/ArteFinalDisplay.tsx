'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { prepareArteUpload, type ArteUpload } from '@/lib/arte/prepareUpload';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'configuring' | 'processing' | 'result' | 'error';

interface Props {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ── Paleta CMYK (mesma do app /arte) ─────────────────────────────────────
const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };

const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444',
  primary: CMYK.cyan, accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626',
  primary: CMYK.cyan, accent: CMYK.cyan, warn: '#d97706',
};

const OPENING_TEXT = 'Envie a arte. Informe a medida final do arquivo e a sangria, posicione, e eu gero o arquivo pronto para a gráfica.';
const CREDITS = 5;
const DPI_MIN = 96;
const SAFE_MM = 5; // margem de segurança visual (a partir do corte)
const AUTO_CLOSE = 90;

const mmToPt = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function ArteFinalDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [upload, setUpload] = useState<ArteUpload | null>(null);

  // medida digitada = TAMANHO FINAL do arquivo (sangria já inclusa por dentro)
  const [finalW, setFinalW] = useState<number>(90);
  const [finalH, setFinalH] = useState<number>(50);
  const [bleed, setBleed] = useState<number>(3);
  const [nome, setNome] = useState<string>('arte-final');

  // transform de posicionamento da arte dentro do arquivo
  const [zoom, setZoom] = useState<number>(1);            // 1 = preenche (cover)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // fração, centro-base

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBase64, setResultBase64] = useState<string>('');
  const [resultName, setResultName] = useState<string>('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [dpiTarget, setDpiTarget] = useState<number>(300);

  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

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
    const id = setInterval(() => setTimeLeft((p) => { if (p <= 1) { onClose(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  // ── Geometria de posicionamento (mesma conta da edge) ──
  // ratioX/ratioY = "cover": a arte preenche o eixo limitante e transborda no outro.
  const imgAspect = upload ? upload.width / upload.height : 1;
  const boxAspect = finalH > 0 ? finalW / finalH : 1;
  const ratioX = imgAspect > boxAspect ? imgAspect / boxAspect : 1;
  const ratioY = imgAspect > boxAspect ? 1 : boxAspect / imgAspect;
  const rx = ratioX * zoom;
  const ry = ratioY * zoom;
  const maxOffX = Math.max(0, (rx - 1) / 2);
  const maxOffY = Math.max(0, (ry - 1) / 2);
  const offX = clamp(offset.x, -maxOffX, maxOffX);
  const offY = clamp(offset.y, -maxOffY, maxOffY);

  // mantém o offset dentro dos limites quando zoom/medida/sangria mudam
  useEffect(() => {
    setOffset((o) => ({ x: clamp(o.x, -maxOffX, maxOffX), y: clamp(o.y, -maxOffY, maxOffY) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, finalW, finalH, bleed]);

  // DPI real considerando o zoom
  let estDpi = 0;
  if (upload && finalW > 0 && finalH > 0) {
    const drawWpt = mmToPt(finalW) * rx;
    estDpi = Math.round(upload.width / (drawWpt / 72));
  }
  const dpiBaixo = upload != null && estDpi > 0 && estDpi < DPI_MIN;
  const sangriaInvalida = finalW - 2 * bleed <= 0 || finalH - 2 * bleed <= 0;
  const medidaInvalida = !(finalW > 0) || !(finalH > 0) || sangriaInvalida;

  // ── Drag para posicionar ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!boxRef.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offX, oy: offY };
  }, [offX, offY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const dx = (e.clientX - d.px) / r.width;   // fração da largura
    const dy = (e.clientY - d.py) / r.height;  // fração da altura
    setOffset({ x: clamp(d.ox + dx, -maxOffX, maxOffX), y: clamp(d.oy + dy, -maxOffY, maxOffY) });
  }, [maxOffX, maxOffY]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const resetPos = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('Envie uma imagem (PNG ou JPEG).'); setStage('error'); return; }
    setStage('processing'); setProgress('Enviando arte...');
    try {
      const up = await prepareArteUpload(file, data.companyId);
      setUpload(up);
      setZoom(1); setOffset({ x: 0, y: 0 });
      setNome((file.name.replace(/\.[^.]+$/, '') || 'arte-final').replace(/[^\w\-]+/g, '-').slice(0, 40));
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao enviar a arte.'); setStage('error');
    }
  }, [data.companyId]);

  const handleGenerate = useCallback(async () => {
    if (!upload || medidaInvalida || dpiBaixo) return;
    setStage('processing'); setProgress('Gerando PDF de produção...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/arte/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          companyId: data.companyId,
          uploadPath: upload.uploadPath,
          spec: {
            final_w_mm: finalW, final_h_mm: finalH, bleed_mm: bleed,
            zoom, offset_x: offX, offset_y: offY,
            nome, dpi_min: DPI_MIN,
            dpi_target: dpiTarget,
          },
        }),
      });
      const out = await res.json();

      if (!res.ok || !out.success) {
        if (res.status === 402) {
          setErrorMsg(`Créditos insuficientes. Esta arte custa ${CREDITS} créditos e seu saldo é ${out.saldo ?? 0}.`);
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
      setResultName(out.file_name ?? `${nome}.pdf`);
      setSaldo(typeof out.saldo === 'number' ? out.saldo : null);
      setStage('result');
      playText('Arquivo pronto! Já está no tamanho final.').catch(() => {});
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Erro de conexão ao gerar.'); setStage('error');
    }
  }, [upload, medidaInvalida, dpiBaixo, supabase, data.companyId, finalW, finalH, bleed, zoom, offX, offY, nome, playText]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url; a.download = resultName; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultName]);

  const handleReset = useCallback(() => {
    setStage('input'); setUpload(null); setResultBlob(null);
    setResultBase64(''); setErrorMsg(''); setNome('arte-final');
    setZoom(1); setOffset({ x: 0, y: 0 });
  }, []);

  // ── estilos util ──
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none',
  };

  // overlays do preview (% do MediaBox = medida final)
  const bleedPctX = finalW > 0 ? (bleed / finalW) * 100 : 0;
  const bleedPctY = finalH > 0 ? (bleed / finalH) * 100 : 0;
  const safePctX = finalW > 0 ? ((bleed + SAFE_MM) / finalW) * 100 : 0;
  const safePctY = finalH > 0 ? ((bleed + SAFE_MM) / finalH) * 100 : 0;

  // posição/tamanho da arte no preview (%, espelha a edge)
  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${rx * 100}%`, height: `${ry * 100}%`,
    left: `${(0.5 - rx / 2 + offX) * 100}%`,
    top: `${(0.5 - ry / 2 + offY) * 100}%`,
    userSelect: 'none', pointerEvents: 'none', display: 'block',
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
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Arte Final</h2>
          <button onClick={onClose} style={{
            padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8,
            background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{
                border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px',
                textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste sua arte</div>
              <div style={{ fontSize: 12 }}>PNG ou JPEG (RGB).</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && upload && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview interativo */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                ref={boxRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  position: 'relative', width: 'min(100%, 360px)',
                  aspectRatio: `${finalW} / ${finalH}`,
                  background: c.bgSecondary,
                  border: `1px solid ${c.border}`, borderRadius: 4, overflow: 'hidden',
                  cursor: 'grab', touchAction: 'none',
                }}
              >
                <img src={upload.previewDataUrl} alt="" style={imgStyle} draggable={false} />
                {/* linha de corte (trim) — recuada pela sangria */}
                <div style={{
                  position: 'absolute', left: `${bleedPctX}%`, top: `${bleedPctY}%`,
                  right: `${bleedPctX}%`, bottom: `${bleedPctY}%`,
                  border: '1px solid rgba(220,38,38,0.95)', boxSizing: 'border-box', pointerEvents: 'none',
                }} />
                {/* área de segurança */}
                <div style={{
                  position: 'absolute', left: `${safePctX}%`, top: `${safePctY}%`,
                  right: `${safePctX}%`, bottom: `${safePctY}%`,
                  border: '1px dashed rgba(16,185,129,0.9)', boxSizing: 'border-box', pointerEvents: 'none',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11, color: c.textMuted }}>
              <span><span style={{ color: '#dc2626' }}>—</span> corte</span>
              <span><span style={{ color: '#10b981' }}>┄</span> área segura</span>
              <span>arraste para posicionar</span>
            </div>

            {/* Zoom */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: c.textMuted }}>Zoom: {Math.round(zoom * 100)}%</label>
                <button onClick={resetPos} style={{ fontSize: 11, color: c.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Centralizar</button>
              </div>
              <input type="range" min={1} max={5} step={0.01} value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: c.accent }} />
            </div>

            {/* Medidas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={label}>Largura final (mm)</label><input type="number" min={1} value={finalW} onChange={(e) => setFinalW(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Altura final (mm)</label><input type="number" min={1} value={finalH} onChange={(e) => setFinalH(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Sangria (mm)</label><input type="number" min={0} max={20} step={0.5} value={bleed} onChange={(e) => setBleed(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
            </div>
            <p style={{ margin: '-6px 0 0', fontSize: 11, color: c.textMuted }}>
              A medida é o tamanho final do arquivo entregue à gráfica. A sangria fica por dentro: o corte (linha vermelha) recua {bleed}mm das bordas.
            </p>
            <div><label style={label}>Nome do arquivo</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value.replace(/[^\w\-]+/g, '-').slice(0, 40))} style={inputStyle} /></div>

            {/* DPI + custo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13, gap: 12 }}>
              <span style={{ color: dpiBaixo ? c.warn : c.textMuted, whiteSpace: 'nowrap' }}>
                DPI atual: <strong style={{ color: dpiBaixo ? c.warn : c.text }}>{estDpi || '—'}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.textMuted }}>
                alvo
                <input type="number" min={72} max={300} value={dpiTarget}
                  onChange={(e) => setDpiTarget(clamp(parseInt(e.target.value) || 0, 72, 300))}
                  style={{ width: 64, padding: '6px 8px', borderRadius: 6, background: c.bg,
                    border: `1px solid ${c.border}`, color: c.text, fontSize: 13 }} />
              </span>
              <span style={{ color: c.textMuted, whiteSpace: 'nowrap' }}>Custo: <strong style={{ color: c.text }}>{CREDITS}</strong></span>
            </div>

            {sangriaInvalida && (
              <div style={{ fontSize: 12, color: c.error, lineHeight: 1.4 }}>
                A sangria é maior que a medida. Reduza a sangria ou aumente a medida final.
              </div>
            )}
            {dpiBaixo && !sangriaInvalida && (
              <div style={{ fontSize: 12, color: c.warn, lineHeight: 1.4 }}>
                Resolução baixa para essa medida/zoom — sairia borrado na impressão. Reduza o zoom ou envie uma arte maior. (Não cobramos enquanto estiver abaixo do mínimo.)
              </div>
            )}

            <button onClick={handleGenerate} disabled={medidaInvalida || dpiBaixo}
              style={{
                padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: (medidaInvalida || dpiBaixo) ? 'not-allowed' : 'pointer',
                background: (medidaInvalida || dpiBaixo) ? c.border : c.accent,
              }}>
              Liberar PDF de produção ({CREDITS} créditos)
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>
              Trocar arte
            </button>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8,
              background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600,
            }}>
              <span>PDF de produção pronto!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{(resultBlob.size / 1024).toFixed(0)} KB</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }} className="af-result">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Arquivo: <strong style={{ color: c.text }}>{resultName}</strong></p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                    {finalW}×{finalH}mm · sangria {bleed}mm{saldo != null ? ` · saldo: ${saldo} créditos` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Baixar PDF</button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Nova arte</button>
                </div>
              </div>
              <div className="af-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={data.companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>
            <div className="af-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={data.companyId} fileName={resultName} fileType="application/pdf" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>Fecha automaticamente em {timeLeft}s</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>{errorMsg}</div>
            <button onClick={handleReset} style={{ padding: 12, borderRadius: 8, border: 'none', background: c.error, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Tentar novamente</button>
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
