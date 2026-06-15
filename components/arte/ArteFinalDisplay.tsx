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

const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444',
  primary: '#3b82f6', accent: '#ea580c', warn: '#f59e0b',
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626',
  primary: '#2563eb', accent: '#ea580c', warn: '#d97706',
};

const OPENING_TEXT = 'Envie a arte. Depois informe a medida final e a sangria, e eu gero o arquivo pronto para a gráfica.';
const CREDITS = 5;
const DPI_MIN = 96;
const SAFE_MM = 5; // margem de segurança visual no preview
const AUTO_CLOSE = 90;

const mmToPt = (v: number) => (v * 72) / 25.4;

// ── Ícones SVG inline (sem lucide dentro de modal) ──
const IconX = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconCheck = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>);
const IconDownload = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
const IconRefresh = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>);
const IconUpload = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>);
const IconLoader = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'af-spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>);

export default function ArteFinalDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [upload, setUpload] = useState<ArteUpload | null>(null);
  const [trimW, setTrimW] = useState<number>(90);
  const [trimH, setTrimH] = useState<number>(50);
  const [bleed, setBleed] = useState<number>(3);
  const [nome, setNome] = useState<string>('arte-final');

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
    const id = setInterval(() => setTimeLeft((p) => { if (p <= 1) { onClose(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  // ── DPI estimado no client (espelha a conta da edge: overscan-cover) ──
  const mediaW = trimW + 2 * bleed;
  const mediaH = trimH + 2 * bleed;
  let estDpi = 0;
  if (upload && trimW > 0 && trimH > 0) {
    const boxW = mmToPt(mediaW), boxH = mmToPt(mediaH);
    const imgAspect = upload.width / upload.height;
    const boxAspect = boxW / boxH;
    const drawW = imgAspect > boxAspect ? boxH * imgAspect : boxW;
    estDpi = Math.round(upload.width / (drawW / 72));
  }
  const dpiBaixo = upload != null && estDpi > 0 && estDpi < DPI_MIN;
  const medidaInvalida = !(trimW > 0) || !(trimH > 0);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('Envie uma imagem (PNG ou JPEG).'); setStage('error'); return; }
    setStage('processing'); setProgress('Enviando arte...');
    try {
      const up = await prepareArteUpload(file, data.companyId);
      setUpload(up);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-arte-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          companyId: data.companyId,
          uploadPath: upload.uploadPath,
          spec: { trim_w_mm: trimW, trim_h_mm: trimH, bleed_mm: bleed, nome, dpi_min: DPI_MIN },
        }),
      });
      const out = await res.json();

      if (!res.ok || !out.success) {
        // 402 = sem créditos ; 422 = DPI/formato ; outros = erro genérico
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
      playText('Arquivo pronto! Já está no padrão da gráfica.').catch(() => {});
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Erro de conexão ao gerar.'); setStage('error');
    }
  }, [upload, medidaInvalida, dpiBaixo, supabase, data.companyId, trimW, trimH, bleed, nome, playText]);

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
  }, []);

  // ── estilos util ──
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none',
  };

  // proporções para o overlay de preview (em % do MediaBox)
  const bleedPctX = mediaW > 0 ? (bleed / mediaW) * 100 : 0;
  const bleedPctY = mediaH > 0 ? (bleed / mediaH) * 100 : 0;
  const safePctX = mediaW > 0 ? ((bleed + SAFE_MM) / mediaW) * 100 : 0;
  const safePctY = mediaH > 0 ? ((bleed + SAFE_MM) / mediaH) * 100 : 0;

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
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🖨️ Arte Final</h2>
          <button onClick={onClose} style={{ padding: 6, border: 'none', background: 'transparent', color: c.textMuted, cursor: 'pointer' }}><IconX /></button>
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
              <div style={{ color: c.accent, display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconUpload /></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste sua arte</div>
              <div style={{ fontSize: 12 }}>PNG ou JPEG (RGB). A alta resolução fica protegida no servidor.</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && upload && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview com sangria/corte */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                position: 'relative', width: 'min(100%, 360px)',
                aspectRatio: `${mediaW} / ${mediaH}`,
                backgroundImage: `url(${upload.previewDataUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: `1px solid ${c.border}`, borderRadius: 4, overflow: 'hidden',
              }}>
                {/* linha de corte (trim) */}
                <div style={{
                  position: 'absolute', left: `${bleedPctX}%`, top: `${bleedPctY}%`,
                  right: `${bleedPctX}%`, bottom: `${bleedPctY}%`,
                  border: '1px solid rgba(220,38,38,0.95)', boxSizing: 'border-box',
                }} />
                {/* área de segurança */}
                <div style={{
                  position: 'absolute', left: `${safePctX}%`, top: `${safePctY}%`,
                  right: `${safePctX}%`, bottom: `${safePctY}%`,
                  border: '1px dashed rgba(16,185,129,0.9)', boxSizing: 'border-box',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 11, color: c.textMuted }}>
              <span><span style={{ color: '#dc2626' }}>—</span> corte</span>
              <span><span style={{ color: '#10b981' }}>┄</span> área segura</span>
              <span>sangria {bleed}mm</span>
            </div>

            {/* Campos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={label}>Largura (mm)</label><input type="number" min={1} value={trimW} onChange={(e) => setTrimW(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Altura (mm)</label><input type="number" min={1} value={trimH} onChange={(e) => setTrimH(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
              <div><label style={label}>Sangria (mm)</label><input type="number" min={0} max={10} step={0.5} value={bleed} onChange={(e) => setBleed(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>
            </div>
            <div><label style={label}>Nome do arquivo</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value.replace(/[^\w\-]+/g, '-').slice(0, 40))} style={inputStyle} /></div>

            {/* DPI + custo */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13,
            }}>
              <span style={{ color: dpiBaixo ? c.warn : c.textMuted }}>
                Resolução: <strong style={{ color: dpiBaixo ? c.warn : c.text }}>{estDpi || '—'} DPI</strong>
                {dpiBaixo ? ` (mínimo ${DPI_MIN})` : ''}
              </span>
              <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS} créditos</strong></span>
            </div>

            {dpiBaixo && (
              <div style={{ fontSize: 12, color: c.warn, lineHeight: 1.4 }}>
                A arte é pequena para essa medida — sairia borrada na impressão. Reduza a medida final ou envie um arquivo maior. (Não cobramos enquanto estiver abaixo do mínimo.)
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={medidaInvalida || dpiBaixo}
              style={{
                padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: (medidaInvalida || dpiBaixo) ? 'not-allowed' : 'pointer',
                background: (medidaInvalida || dpiBaixo) ? c.border : c.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IconDownload /> Liberar PDF de produção ({CREDITS} créditos)
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>
              Trocar arte
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ color: c.primary }}><IconLoader /></div>
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
              <IconCheck /><span>PDF de produção pronto!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{(resultBlob.size / 1024).toFixed(0)} KB</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }} className="af-result">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Arquivo: <strong style={{ color: c.text }}>{resultName}</strong></p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                    {trimW}×{trimH}mm · sangria {bleed}mm{saldo != null ? ` · saldo: ${saldo} créditos` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconDownload /> Baixar PDF
                  </button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconRefresh /> Nova arte
                  </button>
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
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
              {errorMsg}
            </div>
            <button onClick={handleReset} style={{ padding: 12, borderRadius: 8, border: 'none', background: c.error, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IconRefresh /> Tentar novamente
            </button>
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
