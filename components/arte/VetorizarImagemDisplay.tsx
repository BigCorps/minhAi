'use client';

/**
 * Modal "Vetorizar Imagem" — ArteFinal.
 *
 * FUNÇÃO NOVA (regra do §8): o destino final é um SVG/PDF vetorial (silhueta
 * ou contorno), não a página retangular CMYK sangrada do gerar_arte_final.
 * Decisões confirmadas: cobra 1 crédito; PDF de saída fica RGB simples (sem
 * CMYK/ICC, sem selagem PDF/X-1a) — a vetorização (potrace-plus) e o PDF
 * (jsPDF + svg2pdf.js) rodam inteiros no navegador, igual ao HTML original.
 *
 * Reescrito depois de ver o ArteFinalDisplay.tsx/prepareUpload.ts/route.ts
 * reais — principais correções em relação ao primeiro rascunho:
 *   - Client Supabase: `createClient()` de '@/lib/supabase-browser' (não um
 *     singleton 'supabase' exportado).
 *   - Paleta: objeto local DARK/LIGHT no formato real do projeto
 *     ({ bg, bgSecondary, border, text, textMuted, success, error, accent,
 *     warn }, com cores tiradas do CMYK), não a paleta inventada na v1.
 *     Usei `accent: CMYK.magenta` pra esta função — o cyan já é do
 *     gerar_arte_final; o guia usa magenta como exemplo hipotético pra
 *     'adesivo_contorno' (ainda não construída), então não há conflito real
 *     hoje. Se vocês já tiverem um plano de cores por função, troquem aqui.
 *   - Sem SVG/lucide decorativo: o componente real não usa ícones, só texto e
 *     um spinner via CSS (div com border-top colorido), então segui o mesmo
 *     caminho em vez do conjunto de ícones que eu tinha desenhado na v1.
 *   - Entrada por imagem OU PDF, reaproveitando makeImagePreview / openPdf /
 *     rasterizePdfPage / isPdfFile de '@/lib/arte/prepareUpload' em vez de
 *     reimplementar leitura de arquivo — ganha suporte a PDF "de graça" e
 *     fica consistente com o resto da superfície (§11 menciona isso como
 *     padrão esperado).
 *   - Atenção: como agora a entrada pode não ter alfa (PDF rasterizado em
 *     fundo branco, ou JPEG), adicionei um segundo modo de limiarização por
 *     LUMINÂNCIA quando `art.hasAlpha` é false. Sem isso, o algoritmo do HTML
 *     original (que só olha o canal alfa) sairia totalmente preto ou
 *     totalmente branco em qualquer entrada sem transparência — o threshold
 *     por alfa só faz sentido pra PNG com fundo recortado.
 *   - Resolução de empresa, mount de playText (com guarda 'spoke'), aviso de
 *     "Custo" só quando logado, e auto-close em 90s na tela de resultado:
 *     copiados do padrão do ArteFinalDisplay.tsx.
 *
 * NÃO copiei: o componente ResultDownloadQR (QR pra baixar no celular) que o
 * gerar_arte_final usa — ele assume um único arquivo de resultado, e aqui o
 * usuário pode querer SVG ou PDF. Se vocês quiserem o QR mesmo assim (ex.:
 * só pro PDF), me avisem que eu encaixo.
 *
 * Dependências novas: npm install potrace-plus jspdf svg2pdf.js
 * 'potrace-plus' não publica @types — o import dinâmico usa // @ts-ignore.
 *
 * CORREÇÃO (preview do SVG estourando o modal): o wrapper que recebe o
 * dangerouslySetInnerHTML do svgMarkup só limitava o tamanho via
 * maxWidth/maxHeight no DIV — mas o <svg> injetado tem width/height em
 * pixels (vêm de pathData.width/height, ex. 928x961), e atributo de
 * width/height em px não encolhe por causa de maxWidth/maxHeight do pai.
 * Resultado: na tela de "configuring" ficava só cortado (porque o painel
 * tem overflow:hidden), e na tela de "result" não tinha overflow:hidden
 * nenhum, então o SVG vazava pra fora do modal inteiro.
 * Fix: classe `.vet-svg-frame` força `width:100%; height:100%` no <svg>
 * filho via CSS (CSS tem precedência sobre atributo de apresentação), e o
 * viewBox + preserveAspectRatio padrão ("xMidYMid meet") cuidam de encaixar
 * a arte proporcionalmente dentro da caixa, sem distorcer. Adicionei
 * overflow:hidden nos contêineres como rede de segurança.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { makeImagePreview, openPdf, rasterizePdfPage, isPdfFile, type ArtePreview } from '@/lib/arte/prepareUpload';

type Stage = 'input' | 'page-select' | 'configuring' | 'processing' | 'login' | 'result' | 'error';
type Mode = 'fill' | 'stroke';

interface Props {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onRequireLogin?: () => void;
}

interface PathData { d: string; width: number; height: number }

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.magenta, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.magenta, warn: '#d97706',
};

const OPENING_TEXT = 'Vetorize uma imagem em SVG. Ajuste o resultado livremente e libere o arquivo final com 1 crédito.';
const READY_TEXT = 'Arquivo liberado! Já pode baixar o SVG ou o PDF.';
const FUNCTION_KEY = 'vetorizar_imagem';
const CREDITS = 1;
const MAX_TRACE_DIM = 1200;
const AUTO_CLOSE = 90;

const fileOk = (f: File) => f.type.startsWith('image/') || isPdfFile(f);

export default function VetorizarImagemDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [art, setArt] = useState<ArtePreview | null>(null);
  const [pdfPending, setPdfPending] = useState<{ file: File; pages: number } | null>(null);
  const [pageChoice, setPageChoice] = useState<number>(1);

  const [threshold, setThreshold] = useState(128);
  const [smooth, setSmooth] = useState(1.0);
  const [noise, setNoise] = useState(2);
  const [mode, setMode] = useState<Mode>('fill');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState('#000000');

  const [pathData, setPathData] = useState<PathData | null>(null);
  const [tracing, setTracing] = useState(false);
  const [traceFailed, setTraceFailed] = useState(false);

  const [companyId, setCompanyId] = useState<string>(data.companyId || '');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [logado, setLogado] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const spoke = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (spoke.current) return;
    spoke.current = true;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user));
  }, [supabase]);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((t) => { if (t <= 1) { onClose(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  /* ---------- pré-processamento: canvas preto/branco a partir do limiar ----------
   * Com alfa (PNG transparente): limiariza o canal alfa — traça a silhueta.
   * Sem alfa (PDF rasterizado, JPEG): limiariza por luminância — traça o
   * contraste claro/escuro, senão (alfa sempre 255) o resultado sai vazio. */
  const buildBitmapCanvas = useCallback(async (source: ArtePreview) => {
    const bitmap = await createImageBitmap(source.source);
    let w = bitmap.width, h = bitmap.height;
    const scale = Math.min(1, MAX_TRACE_DIM / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const imageData = ctx.getImageData(0, 0, w, h);
    const px = imageData.data;
    if (source.hasAlpha) {
      for (let i = 0; i < px.length; i += 4) {
        const on = px[i + 3] >= threshold;
        if (on) { px[i] = px[i + 1] = px[i + 2] = 0; px[i + 3] = 255; }
        else { px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = 255; }
      }
    } else {
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const on = lum <= threshold;
        if (on) { px[i] = px[i + 1] = px[i + 2] = 0; px[i + 3] = 255; }
        else { px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = 255; }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }, [threshold]);

  /* ---------- vetorização (parte pesada): só refaz com imagem/limiar/suavização/ruído ---------- */
  useEffect(() => {
    if (!art) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setTracing(true);
      setTraceFailed(false);
      try {
        // @ts-ignore — potrace-plus não publica tipos
        const { PotracePlus } = await import('potrace-plus');
        const canvas = await buildBitmapCanvas(art);
        const traced = await PotracePlus(canvas, {
          turdsize: noise,
          opttolerance: smooth,
          optcurve: true,
          alphamax: 1,
          crop: true,
          optimize: true,
          addDimensions: false,
        });
        const d = traced.getD ? traced.getD() : traced.d;
        setPathData({ d, width: traced.width, height: traced.height });
      } catch (err) {
        console.error('vetorização falhou', err);
        setTraceFailed(true);
        setPathData(null);
      } finally {
        setTracing(false);
      }
    }, 280);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [art, threshold, smooth, noise, buildBitmapCanvas]);

  /* ---------- montagem do SVG final: barata, não refaz o trace ---------- */
  const svgMarkup = useMemo(() => {
    if (!pathData) return null;
    const inner = mode === 'fill'
      ? `<path d="${pathData.d}" fill="${color}"/>`
      : `<path d="${pathData.d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pathData.width} ${pathData.height}" width="${pathData.width}" height="${pathData.height}">${inner}</svg>`;
  }, [pathData, mode, color, strokeWidth]);

  /* ---------- entrada: imagem direto, PDF conta páginas (mesmo padrão do ArteFinalDisplay) ---------- */
  const handleFile = useCallback(async (file: File) => {
    if (!fileOk(file)) { setErrorMsg('Envie uma imagem (PNG/JPEG/WebP) ou um PDF.'); setStage('error'); return; }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Arquivo muito grande (máx. 10MB).'); setStage('error'); return; }
    setStage('processing'); setProgress('Preparando preview...');
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
      setErrorMsg((e as Error).message ?? 'Falha ao preparar a imagem.');
      setStage('error');
    }
  }, []);

  const confirmPage = useCallback(async () => {
    if (!pdfPending) return;
    setStage('processing'); setProgress(`Importando página ${pageChoice}...`);
    try {
      setArt(await rasterizePdfPage(pdfPending.file, pageChoice));
      setPdfPending(null);
      setStage('configuring');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Falha ao importar a página.');
      setStage('error');
    }
  }, [pdfPending, pageChoice]);

  /* ---------- liberar: exige login; cobra 1 crédito server-side ---------- */
  const bloqueado = !pathData || tracing;

  const handleRelease = useCallback(async () => {
    if (bloqueado) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setStage('login'); return; }

    setStage('processing'); setProgress('Confirmando liberação...');
    try {
      let cid = data.companyId || companyId;
if (!cid) {
  const { data: ensured } = await supabase.rpc('ensure_my_arte_company');
  cid = (ensured as string) ?? '';
}
if (!cid) { setErrorMsg('Não foi possível preparar sua conta. Recarregue e tente de novo.'); setStage('error'); return; }
setCompanyId(cid);

      const res = await fetch('/api/arte/vetorizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId: cid, mode, width: pathData!.width, height: pathData!.height }),
      });
      const out = await res.json();
      if (!res.ok || !out.success) {
        setErrorMsg(res.status === 402
          ? `Créditos insuficientes. Esta função custa ${CREDITS} crédito e seu saldo é ${out.saldo ?? 0}.`
          : (out.error ?? 'Não foi possível liberar o arquivo.'));
        setStage('error'); return;
      }
      setSaldo(typeof out.saldo === 'number' ? out.saldo : null);
      setStage('result');
      playText(READY_TEXT).catch(() => {});
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Erro de conexão ao liberar.'); setStage('error');
    }
  }, [bloqueado, supabase, companyId, mode, pathData, playText]);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  /* ---------- downloads (só depois de liberar) ---------- */
  const handleDownloadSVG = useCallback(() => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vetor_${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
  }, [svgMarkup]);

  const handleDownloadPDF = useCallback(async () => {
    if (!svgMarkup || !pathData) return;
    setPdfBusy(true);
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-99999px;top:0';
    holder.innerHTML = svgMarkup;
    document.body.appendChild(holder);
    try {
      const { jsPDF } = await import('jspdf');
      await import('svg2pdf.js'); // estende o protótipo do jsPDF com .svg()
      const svgEl = holder.querySelector('svg') as SVGSVGElement;
      const doc = new jsPDF(pathData.width > pathData.height ? 'l' : 'p', 'pt', [pathData.width, pathData.height]);
      // @ts-ignore — .svg() vem do svg2pdf.js, não do typing base do jsPDF
      await doc.svg(svgEl, { x: 0, y: 0, width: pathData.width, height: pathData.height });
      doc.save(`vetor_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF vetorial falhou', err);
      setErrorMsg('Não foi possível gerar o PDF vetorial.');
      setStage('error');
    } finally {
      holder.remove();
      setPdfBusy(false);
    }
  }, [svgMarkup, pathData]);

  const handleCopy = useCallback(async () => {
    if (!svgMarkup) return;
    try {
      await navigator.clipboard.writeText(svgMarkup);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* sem permissão de clipboard — "Baixar .SVG" cobre o caso */ }
  }, [svgMarkup]);

  const handleReset = useCallback(() => {
    setStage('input'); setArt(null); setPathData(null); setPdfPending(null);
    setErrorMsg(''); setSaldo(null);
  }, []);

  const handleEditAgain = useCallback(() => {
    // Resultado pago foi consumido — editar de novo é um job novo: pra
    // baixar de novo vai precisar liberar (e cobrar) outra vez.
    setStage('configuring');
  }, []);

  /* ---------- estilos compartilhados (mesmos tokens do ArteFinalDisplay) ---------- */
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14, background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none' };
  const segStyle = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? c.accent : c.border}`, background: on ? c.accent : 'transparent', color: on ? '#fff' : c.textMuted });

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'configuring' || stage === 'result' ? 760 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Vetorizar Imagem</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            style={{ border: `2px dashed ${c.border}`, borderRadius: 12, padding: '46px 20px', textAlign: 'center', background: c.bgSecondary, cursor: 'pointer', color: c.textMuted }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Clique ou arraste sua imagem</div>
            <div style={{ fontSize: 12 }}>PNG, JPEG, WebP ou PDF. Ideal: PNG com fundo transparente.</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
          </div>
        )}

        {/* PAGE-SELECT (PDF com 2+ páginas) */}
        {stage === 'page-select' && pdfPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Esse PDF tem {pdfPending.pages} páginas</div>
            <p style={{ margin: 0, fontSize: 13, color: c.textMuted, lineHeight: 1.5 }}>Qual página você quer vetorizar?</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPageChoice((p) => Math.max(1, p - 1))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>‹</button>
              <input type="number" min={1} max={pdfPending.pages} value={pageChoice}
                onChange={(e) => setPageChoice(Math.min(pdfPending.pages, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{ ...inputStyle, textAlign: 'center', width: 90, flex: 'none' }} />
              <span style={{ fontSize: 13, color: c.textMuted }}>de {pdfPending.pages}</span>
              <button onClick={() => setPageChoice((p) => Math.min(pdfPending.pages, p + 1))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 18 }}>›</button>
            </div>
            <button onClick={confirmPage} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Usar página {pageChoice}</button>
            <button onClick={() => { setPdfPending(null); setStage(art ? 'configuring' : 'input'); }} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          </div>
        )}

        {/* CONFIGURING */}
        {stage === 'configuring' && art && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleReset} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Nova imagem</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: c.textMuted, background: c.bgSecondary, borderBottom: `1px solid ${c.border}` }}>Original</div>
                <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: c.bgSecondary }}>
                  <img src={art.previewDataUrl} alt="" style={{ maxWidth: '100%', maxHeight: 220, display: 'block' }} />
                </div>
              </div>
              <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: c.textMuted, background: c.bgSecondary, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Resultado</span><span>{pathData ? `${pathData.width}×${pathData.height}` : ''}</span>
                </div>
                <div style={{
                  minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
                  backgroundImage: `linear-gradient(45deg, ${c.border} 25%, transparent 25%), linear-gradient(-45deg, ${c.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${c.border} 75%), linear-gradient(-45deg, transparent 75%, ${c.border} 75%)`,
                  backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0', backgroundColor: c.bgSecondary, opacity: tracing ? 0.6 : 1,
                }}>
                  {tracing ? (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'vet-spin 0.8s linear infinite' }} />
                  ) : traceFailed ? (
                    <span style={{ fontSize: 12, color: c.warn, textAlign: 'center' }}>Não foi possível vetorizar. Ajuste o limiar.</span>
                  ) : svgMarkup ? (
                    <div className="vet-svg-frame" style={{ height: 220 }} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
                  ) : (
                    <span style={{ fontSize: 12, color: c.textMuted }}>Ajuste as opções para gerar</span>
                  )}
                </div>
              </div>
            </div>

            {!art.hasAlpha && (
              <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.4 }}>
                Essa imagem não tem transparência — vetorizando por contraste (claro/escuro) em vez de silhueta.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <label style={label}>{art.hasAlpha ? 'Limiar de transparência' : 'Limiar de contraste'}: {threshold}</label>
                <input type="range" min={1} max={254} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: c.accent }} />
              </div>
              <div>
                <label style={label}>Suavização: {smooth.toFixed(1)}</label>
                <input type="range" min={0} max={1.5} step={0.1} value={smooth} onChange={(e) => setSmooth(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
              </div>
              <div>
                <label style={label}>Remover ruído: {noise}</label>
                <input type="range" min={0} max={20} step={1} value={noise} onChange={(e) => setNoise(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: c.accent }} />
              </div>
              <div>
                <label style={label}>Modo</label>
                <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <button onClick={() => setMode('fill')} style={segStyle(mode === 'fill')}>Preenchido</button>
                  <button onClick={() => setMode('stroke')} style={segStyle(mode === 'stroke')}>Contorno</button>
                </div>
              </div>
              {mode === 'stroke' && (
                <div>
                  <label style={label}>Espessura: {strokeWidth}</label>
                  <input type="range" min={0.5} max={8} step={0.5} value={strokeWidth} onChange={(e) => setStrokeWidth(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                </div>
              )}
              <div>
                <label style={label}>Cor</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '100%', height: 38, border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13, gap: 12 }}>
              <span style={{ color: c.textMuted }}>Resultado: <strong style={{ color: c.text }}>{pathData ? `${pathData.width}×${pathData.height}` : '—'}</strong></span>
              {logado && <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS}</strong></span>}
            </div>

            <button onClick={handleRelease} disabled={bloqueado} style={{ padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: bloqueado ? 'not-allowed' : 'pointer', background: bloqueado ? c.border : c.accent }}>
              Liberar arquivo{logado ? ` (${CREDITS} crédito)` : ''}
            </button>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13 }}>Recomeçar</button>
          </div>
        )}

        {/* LOGIN */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para liberar o arquivo</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview é livre. Para baixar o SVG/PDF, entre na sua conta — e ao se <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong>.
            </p>
            <button onClick={irParaLogin} style={{ padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Entrar / Cadastrar e ganhar 20 créditos</button>
            <button onClick={() => setStage('configuring')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Voltar ao preview</button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'vet-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>{progress}</p>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && pathData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <span>Arquivo liberado!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{pathData.width}×{pathData.height}{saldo !== null ? ` · saldo: ${saldo}` : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
              <div className="vet-svg-frame" style={{ width: 260, height: 260 }} dangerouslySetInnerHTML={{ __html: svgMarkup ?? '' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleCopy} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{copied ? 'Copiado!' : 'Copiar código'}</button>
              <button onClick={handleDownloadPDF} disabled={pdfBusy} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: pdfBusy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: pdfBusy ? 0.6 : 1 }}>{pdfBusy ? 'Gerando...' : 'Baixar PDF'}</button>
              <button onClick={handleDownloadSVG} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Baixar .SVG</button>
            </div>
            <button onClick={handleEditAgain} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>Editar de novo (gera um novo job)</button>
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
        @keyframes vet-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .vet-svg-frame { width: 100%; height: 100%; }
        .vet-svg-frame svg { display: block; width: 100%; height: 100%; }
      `}</style>
    </div>,
    document.body
  );
}
