'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Editor Avançado — função GRATUITA.
 *
 * Dois editores, um modal. O usuário escolhe:
 *   - Editor de Imagem  → Photopea   (PSD, JPG, PNG...)  → exporta PNG
 *   - Editor de Vetor   → Vectorpea  (AI, SVG, PDF)      → exporta SVG
 *
 * Ambos rodam no navegador do usuário (iframe, modo free com a marca deles).
 * Custo zero => sem créditos, sem route, sem login, sem companyId.
 * É ISCA: traz a arte pra dentro; o PDF de produção (pago) sai nas outras skills.
 *
 * NOMES: NÃO usar "Photoshop"/"Illustrator" nos rótulos — são marcas da Adobe.
 *
 * COMUNICAÇÃO (Live Messaging):
 *   iframe abre vazio -> editor manda "done"
 *   postMessage(ArrayBuffer) -> abre o arquivo (ArrayBuffer, não data-URI: PSD/AI estouram a hash)
 *   postMessage('app.activeDocument.saveToOE("png"|"svg");') -> devolve ArrayBuffer do arquivo
 *
 * ATENÇÃO: o handshake do Photopea está confirmado (doc + issues oficiais).
 * O do Vectorpea NÃO está documentado publicamente — é o mesmo autor e a mesma
 * linhagem de código, mas se ele não responder "done" o modal cai no fallback
 * (usuário baixa pelo próprio editor). Ver READY_TIMEOUT_MS abaixo.
 */

interface Props {
  data: { companyId?: string; prefillFile?: File };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  /** Opcional: entrega a arte editada para outra skill (ex.: Arte Final). */
  onUseInSkill?: (file: File) => void;
}

type EditorKey = 'imagem' | 'vetor';
type Stage = 'choose' | 'input' | 'editing' | 'result';

interface EditorCfg {
  key: EditorKey;
  label: string;
  desc: string;
  formats: string;
  origin: string;
  accept: string;
  exportType: 'png' | 'svg';
  mime: string;
  ext: string;
}

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C' };

const EDITORS: Record<EditorKey, EditorCfg> = {
  imagem: {
    key: 'imagem',
    label: 'Editor de Imagem',
    desc: 'Camadas, retoque, máscara e seleção',
    formats: 'PSD · JPG · PNG · WebP',
    origin: 'https://www.photopea.com',
    accept: '.psd,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,.pdf,.xcf',
    exportType: 'png',
    mime: 'image/png',
    ext: 'png',
  },
  vetor: {
    key: 'vetor',
    label: 'Editor de Vetor',
    desc: 'Curvas, nós e texto em curvas',
    formats: 'AI · SVG · PDF',
    origin: 'https://www.vectorpea.com',
    accept: '.ai,.svg,.pdf,.eps',
    exportType: 'svg',
    mime: 'image/svg+xml',
    ext: 'svg',
  },
};

// Se o editor não disser "done" nesse tempo, avisamos e oferecemos o plano B.
const READY_TIMEOUT_MS = 20000;

const DARK = { bg: '#1e293b', bar: '#0f172a', border: 'rgba(255,255,255,0.08)', text: '#e2e8f0', muted: '#94a3b8', accent: CMYK.magenta, success: '#10b981', warn: '#FFD500' };
const LIGHT = { bg: '#ffffff', bar: '#f8fafc', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', accent: CMYK.magenta, success: '#059669', warn: '#d97706' };

const OPENING_TEXT = 'Escolha o editor: imagem, para PSD e fotos, ou vetor, para arquivos AI e SVG.';

/** Sugere o editor pela extensão do arquivo. null = ambíguo (deixa o usuário escolher). */
function suggestEditor(file?: File): EditorKey | null {
  if (!file) return null;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (['psd', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'tif', 'tiff', 'xcf'].includes(ext)) return 'imagem';
  if (['ai', 'svg', 'eps'].includes(ext)) return 'vetor';
  return null; // pdf abre nos dois → pergunta
}

export default function PhotopeaEditorDisplay({ data, onClose, theme = 'dark', playText, onUseInSkill }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [editor, setEditor] = useState<EditorCfg | null>(null);
  const [stage, setStage] = useState<Stage>('choose');
  const [fileName, setFileName] = useState('arte');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false); // editor não respondeu no tempo
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingBuf = useRef<ArrayBuffer | null>(null);
  const editorReady = useRef(false);
  const waitingExport = useRef(false);
  const originRef = useRef<string>('');
  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  useEffect(() => { if (spoke.current) return; spoke.current = true; playText(OPENING_TEXT).catch(() => {}); }, [playText]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  // ── ponte com o editor ──────────────────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!originRef.current || e.origin !== originRef.current) return;

      if (e.data instanceof ArrayBuffer) {
        if (!waitingExport.current) return;
        waitingExport.current = false;
        const cfg = editor!;
        const blob = new Blob([e.data], { type: cfg.mime });
        setResultBlob(blob);
        setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setBusy(false);
        setStage('result');
        playText('Arte pronta! Agora é só usar nas outras funções ou baixar.').catch(() => {});
        return;
      }

      if (e.data === 'done' && !editorReady.current) {
        editorReady.current = true;
        setSlow(false);
        const buf = pendingBuf.current;
        if (buf) {
          pendingBuf.current = null;
          iframeRef.current?.contentWindow?.postMessage(buf, originRef.current);
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [editor, playText]);

  // Timeout: se o editor não responder, avisa e oferece o plano B.
  useEffect(() => {
    if (stage !== 'editing') return;
    const t = setTimeout(() => { if (!editorReady.current) setSlow(true); }, READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const abrirEditor = useCallback(async (cfg: EditorCfg, file?: File) => {
    setEditor(cfg);
    originRef.current = cfg.origin;
    editorReady.current = false;
    waitingExport.current = false;
    setSlow(false);

    if (file) {
      setFileName(file.name.replace(/\.[^.]+$/, '') || 'arte');
      pendingBuf.current = await file.arrayBuffer(); // enviado no "done"
      setStage('editing');
    } else {
      setStage('input');
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!editor) return;
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'arte');
    editorReady.current = false;
    pendingBuf.current = await file.arrayBuffer();
    setStage('editing');
  }, [editor]);

  // arquivo já veio do page (clipe / drag-and-drop)
  useEffect(() => {
    if (prefilled.current || !data.prefillFile) return;
    prefilled.current = true;
    const sug = suggestEditor(data.prefillFile);
    if (sug) abrirEditor(EDITORS[sug], data.prefillFile); // extensão decide
    // se ambíguo (PDF), fica na tela de escolha e o arquivo é usado ao escolher
  }, [data.prefillFile, abrirEditor]);

  const escolher = useCallback((key: EditorKey) => {
    abrirEditor(EDITORS[key], data.prefillFile);
  }, [abrirEditor, data.prefillFile]);

  const trazerDeVolta = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !editor) return;
    setBusy(true);
    waitingExport.current = true;
    win.postMessage(`app.activeDocument.saveToOE("${editor.exportType}");`, editor.origin);
  }, [editor]);

  const baixar = useCallback(() => {
    if (!resultBlob || !editor) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${fileName}-editado.${editor.ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [resultBlob, fileName, editor]);

  const usarNaSkill = useCallback(() => {
    if (!resultBlob || !onUseInSkill || !editor) return;
    onUseInSkill(new File([resultBlob], `${fileName}-editado.${editor.ext}`, { type: editor.mime }));
    onClose();
  }, [resultBlob, fileName, editor, onUseInSkill, onClose]);

  const voltarEscolha = useCallback(() => {
    editorReady.current = false; pendingBuf.current = null; waitingExport.current = false;
    originRef.current = ''; setEditor(null); setResultBlob(null); setResultUrl(''); setSlow(false);
    setStage('choose');
  }, []);

  const btn: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
  const wide = stage === 'editing';

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{
        width: '100%', height: wide ? '100%' : 'auto',
        maxWidth: wide ? 1400 : 640, maxHeight: '92vh',
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', color: c.text,
      }}>

        {/* barra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: c.bar, borderBottom: `1px solid ${c.border}` }}>
          <strong style={{ fontSize: 15 }}>Editor Avançado</strong>
          <span style={{ fontSize: 11, color: c.muted }}>
            {editor ? `${editor.label} · grátis` : 'grátis'}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {stage === 'editing' && (
              <button onClick={trazerDeVolta} disabled={busy}
                style={{ ...btn, border: 'none', background: c.accent, color: '#fff', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Trazendo...' : 'Usar esta arte'}
              </button>
            )}
            {stage !== 'choose' && (
              <button onClick={voltarEscolha} style={{ ...btn, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted }}>
                Trocar editor
              </button>
            )}
            <button onClick={onClose} style={{ ...btn, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted }}>
              Fechar
            </button>
          </div>
        </div>

        {/* CHOOSE */}
        {stage === 'choose' && (
          <div style={{ padding: 20 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: c.muted, textAlign: 'center' }}>
              {data.prefillFile
                ? <>Arquivo <strong style={{ color: c.text }}>{data.prefillFile.name}</strong> — qual editor você quer usar?</>
                : 'Qual editor você quer abrir?'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(['imagem', 'vetor'] as EditorKey[]).map((k) => {
                const cfg = EDITORS[k];
                const isVetor = k === 'vetor';
                return (
                  <button key={k} onClick={() => escolher(k)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '22px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      background: c.bar, border: `1px solid ${c.border}`, color: c.text,
                    }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isVetor ? `${CMYK.magenta}1A` : `${CMYK.cyan}1A`,
                    }}>
                      {isVetor ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CMYK.magenta} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 17c6 0 6-10 12-10" />
                          <rect x="1" y="15" width="4" height="4" rx="1" />
                          <rect x="19" y="5" width="4" height="4" rx="1" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CMYK.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, color: c.muted, lineHeight: 1.4 }}>{cfg.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isVetor ? CMYK.magenta : CMYK.cyan, letterSpacing: 0.3 }}>{cfg.formats}</span>
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '16px 0 0', fontSize: 11, color: c.muted, textAlign: 'center', lineHeight: 1.5 }}>
              Edição gratuita e ilimitada. Você só usa créditos ao gerar o PDF de produção.
            </p>
          </div>
        )}

        {/* INPUT */}
        {stage === 'input' && editor && (
          <div style={{ padding: 20 }}>
            <div onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '48px 20px', textAlign: 'center', background: c.bar, cursor: 'pointer' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Clique ou arraste sua arte</div>
              <div style={{ fontSize: 12, color: c.muted }}>
                {editor.label} — abre <strong style={{ color: c.text }}>{editor.formats}</strong>
              </div>
              <input ref={fileRef} type="file" accept={editor.accept} style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </div>
          </div>
        )}

        {/* EDITING */}
        {stage === 'editing' && editor && (
          <>
            {slow && (
              <div style={{ padding: '10px 16px', background: 'rgba(217,119,6,0.08)', borderBottom: `1px solid ${c.warn}`, fontSize: 12, color: c.warn, lineHeight: 1.4 }}>
                O editor demorou a responder. Se o botão <strong>Usar esta arte</strong> não funcionar, exporte pelo menu do próprio editor
                (Arquivo → Exportar) e envie o arquivo de volta nas outras funções.
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={`${editor.origin}#${encodeURIComponent(JSON.stringify({ environment: { theme: isDark ? 2 : 1 } }))}`}
              title={editor.label}
              style={{ flex: 1, width: '100%', border: 'none', background: '#1b1b1b' }}
              allow="clipboard-read; clipboard-write"
            />
            <div style={{ padding: '8px 16px', background: c.bar, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.muted }}>
              Ao terminar, clique em <strong style={{ color: c.text }}>Usar esta arte</strong> — o resultado volta pro ArteFinal.
            </div>
          </>
        )}

        {/* RESULT */}
        {stage === 'result' && resultUrl && editor && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              Arte editada com sucesso · {editor.ext.toUpperCase()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', background: c.bar, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
              <img src={resultUrl} alt="Arte editada" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onUseInSkill && (
                <button onClick={usarNaSkill}
                  style={{ ...btn, padding: 14, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700 }}>
                  Usar nas funções de produção
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={baixar} style={{ ...btn, flex: 1, border: `1px solid ${c.border}`, background: c.bar, color: c.text }}>
                  Baixar {editor.ext.toUpperCase()}
                </button>
                <button onClick={voltarEscolha} style={{ ...btn, flex: 1, border: `1px solid ${c.border}`, background: c.bar, color: c.text }}>
                  Nova arte
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}