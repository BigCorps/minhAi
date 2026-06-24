'use client';

/**
 * RemoverFundoDisplay.tsx — ArteFinal
 *
 * Remove o fundo de uma imagem (via @imgly/background-removal, 100%
 * client-side). Preview livre (original + resultado, em baixa resolução,
 * sem login) — o download em alta resolução (PNG transparente) só é
 * liberado após login + cobrança de 2 créditos.
 *
 * Reaproveita a mesma lógica de remoção de fundo já validada e funcionando
 * no FotoDocumentoDisplay (@imgly/background-removal, otimização prévia da
 * imagem de entrada para no máximo 1600px antes de processar).
 *
 * Decisão de performance: a remoção de fundo roda 1 ÚNICA VEZ, já em
 * resolução alta — o preview é apenas essa mesma imagem reduzida via canvas
 * (downscale, instantâneo), não um reprocessamento separado em baixa. O
 * resultado em alta fica em memória (highResUrl) desde o início, mas só é
 * exposto para download depois que a cobrança é confirmada — o preview em
 * tela usa sempre a versão reduzida (previewResultUrl).
 *
 * function_key: 'remover_fundo' · 2 créditos.
 *
 * Convenções do guia v2 aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta CMYK DARK/LIGHT (mesmo padrão dos demais
 *    modais já migrados — accent = CMYK.cyan)
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de qualquer ação autenticada
 *  - Custo escondido para anônimo; anônimo que tenta liberar → stage 'login'
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0] (bug
 *    402-com-saldo)
 *  - ResultDownloadQR no resultado, igual aos demais modais com cobrança
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'processing' | 'preview' | 'login' | 'result' | 'error';

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
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.cyan, warn: '#d97706',
};

const OPENING_TEXT = 'Removedor de fundo. Envie a imagem e veja o resultado antes de baixar em alta resolução.';
const CREDITS = 2;
const AUTO_CLOSE = 90;
const PREVIEW_MAX_DIM = 500; // px — tamanho do preview reduzido, só visual

const icon = (color: string, size = 20) => ({ c: color, sz: size });
type P = { c: string; sz: number };

const IconUpload = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
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
const IconCheck = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Reduz uma imagem (dataURL/blob URL) para no máximo PREVIEW_MAX_DIM px,
// preservando transparência — usado só para o preview em tela, nunca para
// o arquivo final (que sempre vem de highResUrl, em resolução completa).
function downscaleToPreview(src: string, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

const fileOk = (f: File) => f.type.startsWith('image/');

export default function RemoverFundoDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [progressMsg, setProgressMsg] = useState('');

  // originalPreviewUrl / resultPreviewUrl: SEMPRE em baixa resolução, só para
  // exibição em tela — nunca usados para o arquivo final.
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);

  // highResUrl: resultado em resolução completa, já pronto em memória desde
  // o processamento — só é de fato oferecido para download depois que a
  // cobrança é confirmada (handleDownload só lê isso após stage === 'result').
  const highResUrlRef = useRef<string | null>(null);
  const highResBlobRef = useRef<Blob | null>(null);

  const [companyId, setCompanyId] = useState<string>(data.companyId || '');
  const [resultBase64, setResultBase64] = useState<string>('');
  const [resultFileName, setResultFileName] = useState<string>('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [logado, setLogado] = useState(false);

  const spoke = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]); // todas as URLs criadas, para revogar no cleanup

useEffect(() => {
  if (hasSpoken.current) return;
  hasSpoken.current = true;
  window.speechSynthesis?.cancel();

  // Se o arquivo já vem anexado (input principal), pula a etapa de upload
  // e processa direto — mesma validação de tipo do handleFileSelected.
  if (data.prefillFile) {
    handleFileSelected(data.prefillFile);
    playText('Imagem recebida! Ajuste o corte, o brilho ou a rotação como preferir.').catch(() => {});
  } else {
    playText(OPENING_TEXT).catch(() => {});
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user));
  }, [supabase]);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((t) => { if (t <= 1) { onClose(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  useEffect(() => {
    return () => { objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  const ensureCompany = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onRequireLogin?.(); return null; }
    const { data: ensured, error } = await supabase.rpc('ensure_my_arte_company');
    if (error || !ensured) return null;
    const cid = ensured as string;
    setCompanyId(cid);
    return cid;
  }, [companyId, supabase, onRequireLogin]);

  // ── Upload + remoção de fundo (1x, em alta) ───────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!fileOk(file)) { setErrorMsg('Envie uma imagem (PNG, JPEG ou WebP).'); setStage('error'); return; }
    if (file.size > 12 * 1024 * 1024) { setErrorMsg('Arquivo muito grande (máx. 12MB).'); setStage('error'); return; }

    setStage('processing');
    setProgressMsg('Preparando a imagem...');
    setErrorMsg('');

    try {
      // Otimiza a entrada para no máximo 1600px — limite razoável para o
      // processamento WASM não ficar pesado demais, mantendo qualidade alta
      // o suficiente para a maioria dos usos (redes sociais, e-commerce).
      const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const max = 1600;
            let { width, height } = img;
            if (width > max || height > max) {
              if (width > height) { height = (height * max) / width; width = max; }
              else { width = (width * max) / height; height = max; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob falhou')), 'image/png', 0.95);
          };
          img.onerror = reject;
          img.src = e.target!.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const originalUrl = URL.createObjectURL(optimizedBlob);
      objectUrlsRef.current.push(originalUrl);
      setOriginalPreviewUrl(await downscaleToPreview(originalUrl, PREVIEW_MAX_DIM));

      setProgressMsg('Removendo o fundo... pode levar alguns segundos.');
      const { removeBackground } = await import('@imgly/background-removal');
      const resultBlob = await removeBackground(optimizedBlob);

      const resultUrl = URL.createObjectURL(resultBlob);
      objectUrlsRef.current.push(resultUrl);
      highResUrlRef.current = resultUrl;
      highResBlobRef.current = resultBlob;

      setResultPreviewUrl(await downscaleToPreview(resultUrl, PREVIEW_MAX_DIM));
      setStage('preview');
    } catch (err: any) {
      setErrorMsg('Não foi possível remover o fundo dessa imagem. Tente outra foto.');
      setStage('error');
    }
  }, []);

  // ── Liberar download em alta: exige login + cobrança ──────────────────────────

  const bloqueado = !highResUrlRef.current;

  const handleRelease = useCallback(async () => {
    if (bloqueado) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setStage('login'); return; }

    setStage('processing');
    setProgressMsg('Confirmando liberação...');

    try {
      const cid = await ensureCompany();
      if (!cid) {
        setErrorMsg('Não foi possível preparar sua conta. Recarregue e tente de novo.');
        setStage('error');
        return;
      }

      const blob = highResBlobRef.current!;
      const fileName = `fundo_removido_${Date.now()}.png`;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Falha ao ler imagem gerada.'));
        reader.readAsDataURL(blob);
      });

      // Cobrança por último, fail-closed — o arquivo em alta já existe em
      // memória; só liberamos a tela de resultado/download depois daqui.
      const { data: raw, error: rpcError } = await supabase.rpc('cobrar_credito_se_suficiente', {
        p_company_id: cid,
        p_function_key: 'remover_fundo',
        p_credits: CREDITS,
        p_metadata: { fileName },
      });
      if (rpcError) throw new Error(rpcError.message);

      // RPC retorna TABLE → sempre array (bug do 402-com-saldo)
      const cobranca = Array.isArray(raw) ? raw[0] : raw;
      if (!cobranca?.sucesso) {
        const saldoAtual = cobranca?.saldo_atual ?? 0;
        setErrorMsg(`Créditos insuficientes. Esta função custa ${CREDITS} créditos e seu saldo é ${saldoAtual}.`);
        setStage('error');
        return;
      }

      setSaldo(typeof cobranca.saldo_atual === 'number' ? cobranca.saldo_atual : null);
      setResultBase64(base64);
      setResultFileName(fileName);
      setStage('result');
      playText('Fundo removido! Já pode baixar em alta resolução.').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao liberar o arquivo.');
      setStage('error');
    }
  }, [bloqueado, supabase, ensureCompany, playText]);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  const handleDownload = useCallback(() => {
    if (!highResBlobRef.current || !resultFileName) return;
    const url = URL.createObjectURL(highResBlobRef.current);
    const a = document.createElement('a');
    a.href = url; a.download = resultFileName; a.click();
    URL.revokeObjectURL(url);
  }, [resultFileName]);

  const handleReset = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    highResUrlRef.current = null;
    highResBlobRef.current = null;
    setOriginalPreviewUrl(null);
    setResultPreviewUrl(null);
    setResultBase64('');
    setResultFileName('');
    setSaldo(null);
    setErrorMsg('');
    setStage('input');
  }, []);

  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const btnPrimary: React.CSSProperties = {
    padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
  };

  // fundo quadriculado para visualizar transparência
  const checkerBg: React.CSSProperties = {
    backgroundImage: `linear-gradient(45deg, ${c.border} 25%, transparent 25%), linear-gradient(-45deg, ${c.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${c.border} 75%), linear-gradient(-45deg, transparent 75%, ${c.border} 75%)`,
    backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0', backgroundColor: c.bgSecondary,
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'preview' || stage === 'result' ? 760 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Remover Fundo</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Envie a imagem e veja o resultado lado a lado antes de decidir. O preview é livre e
                em resolução reduzida — o download em alta resolução, com fundo totalmente
                transparente, é liberado depois de confirmar.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px', textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <IconUpload s={icon(c.accent, 28)} />
              <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>Clique ou arraste a imagem</span>
              <span style={{ fontSize: 12 }}>PNG, JPEG ou WebP — máx. 12MB</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'rf-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, textAlign: 'center' }}>{progressMsg}</p>
          </div>
        )}

        {/* PREVIEW (livre, sem login) */}
        {stage === 'preview' && originalPreviewUrl && resultPreviewUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="rf-preview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: c.textMuted, background: c.bgSecondary, borderBottom: `1px solid ${c.border}` }}>Original</div>
                <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: c.bgSecondary }}>
                  <img src={originalPreviewUrl} alt="" style={{ maxWidth: '100%', maxHeight: 220, display: 'block' }} />
                </div>
              </div>
              <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: c.textMuted, background: c.bgSecondary, borderBottom: `1px solid ${c.border}` }}>Sem fundo</div>
                <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, ...checkerBg }}>
                  <img src={resultPreviewUrl} alt="" style={{ maxWidth: '100%', maxHeight: 220, display: 'block' }} />
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: c.textMuted, textAlign: 'center' }}>
              Preview em resolução reduzida. O arquivo final sai em alta resolução, com fundo 100% transparente.
            </p>

            <button onClick={handleRelease} disabled={bloqueado} style={{ ...btnPrimary, background: bloqueado ? c.border : c.accent, cursor: bloqueado ? 'not-allowed' : 'pointer' }}>
              <IconDownload s={icon('#fff', 16)} />
              Baixar em alta resolução{logado ? ` (${CREDITS} créditos)` : ''}
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>
              Trocar imagem
            </button>
          </div>
        )}

        {/* LOGIN */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para liberar o download</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview é livre. Para baixar em alta resolução, entre na sua conta — e ao se{' '}
              <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong>.
            </p>
            <button onClick={irParaLogin} style={{ ...btnPrimary, background: c.accent }}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('preview')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>
              Voltar ao preview
            </button>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && resultPreviewUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <IconCheck s={icon(c.success, 16)} />
              <span>Arquivo liberado em alta resolução!</span>
            </div>

            <div className="rf-result-row" style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ borderRadius: 8, overflow: 'hidden', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...checkerBg }}>
                  <img src={resultPreviewUrl} alt="" style={{ maxWidth: '100%', maxHeight: 200, display: 'block' }} />
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
                    Arquivo: <strong style={{ color: c.text }}>{resultFileName}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                    Formato: PNG transparente{saldo != null ? ` · saldo: ${saldo} créditos` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ ...btnPrimary, flex: 1, padding: 10, fontSize: 14 }}>
                    <IconDownload s={icon('#fff', 15)} /> Baixar PNG
                  </button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconRefresh s={icon(c.textMuted, 14)} /> Nova imagem
                  </button>
                </div>
              </div>
              <div className="rf-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={companyId} fileName={resultFileName} fileType="image/png" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>
            <div className="rf-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={companyId} fileName={resultFileName} fileType="image/png" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>
              Fecha automaticamente em {timeLeft}s
            </p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
              {errorMsg}
            </div>
            <button onClick={() => setStage(resultPreviewUrl ? 'preview' : 'input')} style={{ ...btnPrimary, background: c.error }}>
              <IconRefresh s={icon('#fff', 15)} /> Voltar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rf-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .rf-preview-grid { grid-template-columns: 1fr !important; }
          .rf-result-row { flex-direction: column !important; }
          .rf-qr-desktop { display: none !important; }
          .rf-qr-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .rf-qr-desktop { display: flex !important; flex-direction: column; }
          .rf-qr-mobile { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}