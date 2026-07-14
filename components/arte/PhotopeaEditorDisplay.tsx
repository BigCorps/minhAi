'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Editor Avançado — função GRATUITA (sem créditos, sem route, sem login).
 *
 * Dois editores, um modal:
 *   - Editor de Imagem → Photopea   (PSD, JPG, PNG...)
 *   - Editor de Vetor  → Vectorpea  (AI, SVG, PDF)
 *
 * NOMES: não usar "Photoshop"/"Illustrator" (marcas da Adobe).
 *
 * ── COMO O ARQUIVO ENTRA (dois caminhos, porque nem todo editor fala a API) ──
 *  A) HASH (data-URI na URL): #{"files":["data:...;base64,..."]}
 *     Caminho documentado e mais antigo. Funciona MESMO se o editor não
 *     responder postMessage. Limitado pelo tamanho da URL → só até HASH_MAX_BYTES.
 *  B) postMessage(ArrayBuffer): sem limite de tamanho, mas SÓ funciona se o editor
 *     responder "done" (Live Messaging). Usado para arquivos grandes.
 *
 * ── COMO O ARQUIVO VOLTA ──
 *  Só é possível se o editor falar a API ("done" + saveToOE devolvendo ArrayBuffer).
 *  Por isso SONDAMOS: se o "done" não chegar em PROBE_MS, consideramos que o editor
 *  NÃO tem API, escondemos o botão "Usar esta arte" (botão que não funciona é pior
 *  que botão nenhum) e instruímos o usuário a exportar por dentro do próprio editor.
 *
 *  Estado: apiOk === null (sondando) | true (tem API) | false (não tem)
 */

interface Props {
  data: { companyId?: string; prefillFile?: File };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
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
  /** Caminho do menu do editor, mostrado no fallback manual. */
  exportHint: string;
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
    exportHint: 'Arquivo → Exportar como → PNG',
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
    exportHint: 'Arquivo → Exportar como → SVG (ou PDF)',
  },
};

/** Acima disso, a data-URI não cabe na URL → tenta postMessage (precisa de API). */
const HASH_MAX_BYTES = 1.5 * 1024 * 1024;
/** Tempo de espera pelo "done" antes de concluir que o editor não tem API. */
const PROBE_MS = 8000;

const DARK = { bg: '#1e293b', bar: '#0f172a', border: 'rgba(255,255,255,0.08)', text: '#e2e8f0', muted: '#94a3b8', accent: CMYK.magenta, success: '#10b981', warn: '#FFD500' };
const LIGHT = { bg: '#ffffff', bar: '#f8fafc', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', accent: CMYK.magenta, success: '#059669', warn: '#d97706' };

const OPENING_TEXT = 'Escolha o editor: imagem, para PSD e fotos, ou vetor, para arquivos AI e SVG.';

function suggestEditor(file?: File): EditorKey | null {
  if (!file) return null;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (['psd', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'tif', 'tiff', 'xcf'].includes(ext)) return 'imagem';
  if (['ai', 'svg', 'eps'].includes(ext)) return 'vetor';
  return null; // PDF abre nos dois → pergunta
}

const readAsDataUrl = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(new Error('Falha ao ler o arquivo'));
  r.readAsDataURL(file);
});

export default function PhotopeaEditorDisplay({ data, onClose, theme = 'dark', playText, onUseInSkill }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [editor, setEditor] = useState<EditorCfg | null>(null);
  const [stage, setStage] = useState<Stage>('choose');
  const [iframeSrc, setIframeSrc] = useState('');
  const [fileName, setFileName] = useState('arte');
  const [fileTooBig, setFileTooBig] = useState(false); // não coube na hash
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingBuf = useRef<ArrayBuffer | null>(null); // só p/ arquivo grande (via API)
  const originRef = useRef('');
  const waitingExport = useRef(false);
  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  useEffect(() => { if (spoke.current) return; spoke.current = true; playText(OPENING_TEXT).catch(() => {}); }, [playText]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  // ── ponte com o editor ──────────────────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!originRef.current || e.origin !== originRef.current) return;

      // bytes exportados
      if (e.data instanceof ArrayBuffer) {
        if (!waitingExport.current || !editor) return;
        waitingExport.current = false;
        const blob = new Blob([e.data], { type: editor.mime });
        setResultBlob(blob);
        setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setBusy(false);
        setStage('result');
        playText('Arte pronta! Agora é só usar nas funções de produção ou baixar.').catch(() => {});
        return;
      }

      // "done" => o editor fala a API
      if (e.data === 'done') {
        setApiOk((prev) => (prev === null ? true : prev));
        const buf = pendingBuf.current;
        if (buf) { // arquivo grande, ainda não carregado
          pendingBuf.current = null;
          iframeRef.current?.contentWindow?.postMessage(buf, originRef.current);
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [editor, playText]);

  // sonda: sem "done" em PROBE_MS => editor sem API
  useEffect(() => {
    if (stage !== 'editing') return;
    const t = setTimeout(() => setApiOk((prev) => (prev === null ? false : prev)), PROBE_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const abrirComArquivo = useCallback(async (cfg: EditorCfg, file: File) => {
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'arte');
    setApiOk(null);
    waitingExport.current = false;
    pendingBuf.current = null;
    originRef.current = cfg.origin;

    const env = { environment: { theme: isDark ? 2 : 1 } };
    let cfgObj: Record<string, unknown> = env;

    if (file.size <= HASH_MAX_BYTES) {
      // Caminho A: entra pela URL — funciona mesmo sem API
      const dataUrl = await readAsDataUrl(file);
      cfgObj = { ...env, files: [dataUrl] };
      setFileTooBig(false);
    } else {
      // Caminho B: grande demais p/ URL — depende da API responder "done"
      pendingBuf.current = await file.arrayBuffer();
      setFileTooBig(true);
    }

    setIframeSrc(`${cfg.origin}#${encodeURIComponent(JSON.stringify(cfgObj))}`);
    setEditor(cfg);
    setStage('editing');
  }, [isDark]);

  const escolher = useCallback((key: EditorKey) => {
    const cfg = EDITORS[key];
    if (data.prefillFile) { abrirComArquivo(cfg, data.prefillFile); return; }
    setEditor(cfg);
    originRef.current = cfg.origin;
    setStage('input');
  }, [data.prefillFile, abrirComArquivo]);

  // arquivo já veio da página (clipe / drag-and-drop)
  useEffect(() => {
    if (prefilled.current || !data.prefillFile) return;
    prefilled.current = true;
    const sug = suggestEditor(data.prefillFile);
    if (sug) abrirComArquivo(EDITORS[sug], data.prefillFile);
    // ambíguo (PDF) → fica na escolha; o arquivo é usado ao escolher
  }, [data.prefillFile, abrirComArquivo]);

  const trazerDeVolta = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !editor) return;
    setBusy(true);
    waitingExport.current = true;
    win.postMessage(`app.activeDocument.saveToOE("${editor.exportType}");`, editor.origin);
    // se não voltar em 15s, desiste e cai no manual
    setTimeout(() => {
      if (waitingExport.current) { waitingExport.current = false; setBusy(false); setApiOk(false); }
    }, 15000);
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
    pendingBuf.current = null; waitingExport.current = false; originRef.current = '';
    setEditor(null); setIframeSrc(''); setApiOk(null); setFileTooBig(false);
    setResultBlob(null); setResultUrl(''); setStage('choose');
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
          <span style={{ fontSize: 11, color: c.muted }}>{editor ? `${editor.label} · grátis` : 'grátis'}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {/* só mostra o botão se o editor REALMENTE responde a API */}
            {stage === 'editing' && apiOk === true && (
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
            <button onClick={onClose} style={{ ...btn, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted }}>Fechar</button>
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
                const cor = isVetor ? CMYK.magenta : CMYK.cyan;
                return (
                  <button key={k} onClick={() => escolher(k)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '22px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', background: c.bar, border: `1px solid ${c.border}`, color: c.text }}>
                    <span style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cor}1A` }}>
                      {isVetor ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 17c6 0 6-10 12-10" /><rect x="1" y="15" width="4" height="4" rx="1" /><rect x="19" y="5" width="4" height="4" rx="1" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, color: c.muted, lineHeight: 1.4 }}>{cfg.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: cor, letterSpacing: 0.3 }}>{cfg.formats}</span>
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
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) abrirComArquivo(editor, f); }}
              style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '48px 20px', textAlign: 'center', background: c.bar, cursor: 'pointer' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Clique ou arraste sua arte</div>
              <div style={{ fontSize: 12, color: c.muted }}>
                {editor.label} — abre <strong style={{ color: c.text }}>{editor.formats}</strong>
              </div>
              <input ref={fileRef} type="file" accept={editor.accept} style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) abrirComArquivo(editor, f); e.currentTarget.value = ''; }} />
            </div>
          </div>
        )}

        {/* EDITING */}
        {stage === 'editing' && editor && (
          <>
            {/* editor sem API => instrui exportar por dentro dele */}
            {apiOk === false && (
              <div style={{ padding: '10px 16px', background: 'rgba(217,119,6,0.08)', borderBottom: `1px solid ${c.warn}`, fontSize: 12, color: c.warn, lineHeight: 1.5 }}>
                Este editor não devolve o arquivo automaticamente. Ao terminar, exporte por dentro dele:{' '}
                <strong>{editor.exportHint}</strong>. Depois envie o arquivo salvo nas funções de produção.
                {fileTooBig && <> <br />Seu arquivo é grande demais para abrir sozinho — use <strong>Arquivo → Abrir</strong> dentro do editor.</>}
              </div>
            )}
            {apiOk === null && (
              <div style={{ padding: '8px 16px', background: c.bar, borderBottom: `1px solid ${c.border}`, fontSize: 11, color: c.muted }}>
                Carregando o editor…
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title={editor.label}
              style={{ flex: 1, width: '100%', border: 'none', background: '#1b1b1b' }}
              allow="clipboard-read; clipboard-write"
            />

            {apiOk === true && (
              <div style={{ padding: '8px 16px', background: c.bar, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.muted }}>
                Ao terminar, clique em <strong style={{ color: c.text }}>Usar esta arte</strong> — o resultado volta pro ArteFinal.
              </div>
            )}
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
                <button onClick={usarNaSkill} style={{ ...btn, padding: 14, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700 }}>
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