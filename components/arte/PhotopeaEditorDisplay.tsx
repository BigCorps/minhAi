'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Editor Avançado (Photopea) — função GRATUITA.
 *
 * Por que é grátis: roda 100% no navegador do usuário (iframe do Photopea, modo free
 * com a marca deles). Não consome PDFRest, IA nem compute nosso => custo zero.
 * Ela é ISCA: traz a arte pra dentro, o usuário ajeita, e sai gerando o PDF de
 * produção nas funções pagas (Arte Final / Adesivo). Cobrar aqui empurraria o
 * usuário pro photopea.com de graça e mataria a conversão.
 *
 * Por isso NÃO tem: route, cobrança, login, companyId.
 *
 * COMUNICAÇÃO (Live Messaging — confirmado na doc e nos issues do Photopea):
 *  - iframe abre vazio -> Photopea manda "done" quando está pronto
 *  - postMessage(ArrayBuffer) -> abre o arquivo (PSD, AI, PNG, JPG...)
 *    (ArrayBuffer e NÃO data-URI na hash: PSD de gráfica estoura o limite da URL)
 *  - postMessage('app.activeDocument.saveToOE("png");') -> devolve o ArrayBuffer do PNG
 */

interface Props {
  /** prefillFile: arquivo já anexado na página (clipe ou drag-and-drop). */
  data: { companyId?: string; prefillFile?: File };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  /** Opcional: entrega a arte editada para outra skill (ex.: Arte Final). */
  onUseInSkill?: (file: File) => void;
}

type Stage = 'input' | 'editing' | 'result';

const PHOTOPEA_ORIGIN = 'https://www.photopea.com';
const EXPORT_SCRIPT = 'app.activeDocument.saveToOE("png");';

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C' };
const DARK = { bg: '#1e293b', bar: '#0f172a', border: 'rgba(255,255,255,0.08)', text: '#e2e8f0', muted: '#94a3b8', accent: CMYK.magenta, success: '#10b981' };
const LIGHT = { bg: '#ffffff', bar: '#f8fafc', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', accent: CMYK.magenta, success: '#059669' };

const OPENING_TEXT = 'Envie sua arte. Pode ser PSD, PDF, JPEG ou PNG. Edite à vontade e depois traga de volta.';
const ACCEPT = '.psd,.ai,.pdf,.png,.jpg,.jpeg,.webp,.svg,.xcf';

export default function PhotopeaEditorDisplay({ data, onClose, theme = 'dark', playText, onUseInSkill }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('input');
  const [fileName, setFileName] = useState('arte');
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingBuf = useRef<ArrayBuffer | null>(null);
  const ppReady = useRef(false);
  const waitingExport = useRef(false);
  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (spoke.current) return; spoke.current = true; playText(OPENING_TEXT).catch(() => {}); }, [playText]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  // ── ponte com o Photopea ───────────────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== PHOTOPEA_ORIGIN) return;

      // bytes do arquivo exportado
      if (e.data instanceof ArrayBuffer) {
        if (!waitingExport.current) return;
        waitingExport.current = false;
        const blob = new Blob([e.data], { type: 'image/png' });
        setResultBlob(blob);
        setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setBusy(false);
        setStage('result');
        playText('Arte pronta! Agora é só usar no Arte Final ou baixar.').catch(() => {});
        return;
      }

      // "done" = editor pronto / operação concluída
      if (e.data === 'done' && !ppReady.current) {
        ppReady.current = true;
        const buf = pendingBuf.current;
        if (buf) {
          pendingBuf.current = null;
          iframeRef.current?.contentWindow?.postMessage(buf, PHOTOPEA_ORIGIN);
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [playText]);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'arte');
    const buf = await file.arrayBuffer();
    ppReady.current = false;
    pendingBuf.current = buf; // enviado assim que o editor disser "done"
    setStage('editing');
  }, []);

  // Já veio arquivo do page (clipe / drag-and-drop) → abre direto no editor
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !data.prefillFile) return;
    prefilled.current = true;
    handleFile(data.prefillFile);
  }, [data.prefillFile, handleFile]);

  const trazerDeVolta = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    setBusy(true);
    waitingExport.current = true;
    win.postMessage(EXPORT_SCRIPT, PHOTOPEA_ORIGIN);
  }, []);

  const baixar = useCallback(() => {
    if (!resultBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${fileName}-editado.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [resultBlob, fileName]);

  const usarNoArteFinal = useCallback(() => {
    if (!resultBlob || !onUseInSkill) return;
    onUseInSkill(new File([resultBlob], `${fileName}-editado.png`, { type: 'image/png' }));
    onClose();
  }, [resultBlob, fileName, onUseInSkill, onClose]);

  const reset = useCallback(() => {
    ppReady.current = false; pendingBuf.current = null; waitingExport.current = false;
    setResultBlob(null); setResultUrl(''); setStage('input');
  }, []);

  const btn: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{
        width: '100%', height: stage === 'editing' ? '100%' : 'auto',
        maxWidth: stage === 'editing' ? 1400 : 620, maxHeight: '92vh',
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', color: c.text,
      }}>

        {/* barra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: c.bar, borderBottom: `1px solid ${c.border}` }}>
          <strong style={{ fontSize: 15 }}>Editor Avançado</strong>
          <span style={{ fontSize: 11, color: c.muted }}>Photopea · grátis</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {stage === 'editing' && (
              <button onClick={trazerDeVolta} disabled={busy}
                style={{ ...btn, border: 'none', background: c.accent, color: '#fff', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Trazendo...' : 'Usar esta arte'}
              </button>
            )}
            <button onClick={onClose}
              style={{ ...btn, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted }}>
              Fechar
            </button>
          </div>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div style={{ padding: 20 }}>
            <div onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '48px 20px', textAlign: 'center', background: c.bar, cursor: 'pointer' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Clique ou arraste sua arte</div>
              <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>
                Abre <strong style={{ color: c.text }}>PSD, AI, PDF, PNG, JPEG</strong> e mais.<br />
                Camadas, texto, máscara e seleção — como no Photoshop.
              </div>
              <input ref={fileRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 11, color: c.muted, textAlign: 'center', lineHeight: 1.5 }}>
              Edição gratuita e ilimitada. Você só usa créditos ao gerar o PDF de produção (Arte Final ou Adesivo).
            </p>
          </div>
        )}

        {/* EDITING */}
        {stage === 'editing' && (
          <>
            <iframe
              ref={iframeRef}
              src={`${PHOTOPEA_ORIGIN}#${encodeURIComponent(JSON.stringify({ environment: { theme: isDark ? 2 : 1 } }))}`}
              title="Photopea"
              style={{ flex: 1, width: '100%', border: 'none', background: '#1b1b1b' }}
              allow="clipboard-read; clipboard-write"
            />
            <div style={{ padding: '8px 16px', background: c.bar, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.muted }}>
              Ao terminar, clique em <strong style={{ color: c.text }}>Usar esta arte</strong> — o resultado volta pro ArteFinal.
            </div>
          </>
        )}

        {/* RESULT */}
        {stage === 'result' && resultUrl && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              Arte editada com sucesso
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', background: c.bar, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
              <img src={resultUrl} alt="Arte editada" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onUseInSkill && (
                <button onClick={usarNoArteFinal}
                  style={{ ...btn, padding: 14, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700 }}>
                  Usar no Arte Final (gerar PDF de produção)
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={baixar} style={{ ...btn, flex: 1, border: `1px solid ${c.border}`, background: c.bar, color: c.text }}>Baixar PNG</button>
                <button onClick={reset} style={{ ...btn, flex: 1, border: `1px solid ${c.border}`, background: c.bar, color: c.text }}>Nova arte</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}