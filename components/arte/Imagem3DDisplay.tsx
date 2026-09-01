'use client';

/**
 * Imagem3DDisplay.tsx — ArteFinal
 *
 * Converte uma imagem PNG em modelo 3D (.STL / .3MF) para impressão 3D.
 * Dois modos, detectados automaticamente a partir da imagem:
 *  - Extrusão: PNG com fundo transparente (logo/recorte) → sólido extrudado
 *    a partir do contorno (Potrace traça o contorno, three.js extrude).
 *  - Relevo (lithophane): imagem opaca (foto) → relevo de profundidade
 *    variável conforme a luminância de cada pixel.
 *
 * Migrado de um HTML de referência (three.js + OrbitControls + SVGLoader +
 * STLExporter via CDN/importmap) para React, com import dinâmico das libs —
 * mesma convenção já usada nos demais modais (jspdf, cropperjs,
 * @imgly/background-removal): await import(...) só quando necessário, em vez
 * de import estático no topo do arquivo.
 *
 * Preview 3D interativo (girar, zoom) é livre, sem login — mesmo padrão dos
 * demais modais pagos. Login + cobrança de 2 créditos só são exigidos no
 * clique de baixar o arquivo (.STL ou .3MF); os botões de download só
 * existem dentro do bloco JSX do estágio 'result', estruturalmente
 * inacessíveis antes da cobrança ser confirmada (mesmo padrão de proteção
 * usado no RemoverFundoDisplay).
 *
 * Ciclo de vida do three.js em React: toda a cena/câmera/renderer/controles
 * vive em refs (não state, para não re-renderizar a cada frame). O setup é
 * feito em um useEffect que monta o canvas dentro do container assim que o
 * estágio 'workspace' é alcançado, e o cleanup para o loop de animação e
 * dispõe geometria/renderer ao desmontar ou trocar de imagem.
 *
 * function_key: 'imagem_3d' · 2 créditos.
 *
 * Convenções do guia v2 aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta CMYK DARK/LIGHT (accent = CMYK.cyan)
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - ensure_my_arte_company lazy antes de qualquer ação autenticada
 *  - cobrar_credito_se_suficiente fail-closed, Array.isArray(raw)[0]
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'workspace' | 'login' | 'processing' | 'result' | 'error';
type Mode = 'extrusao' | 'relevo';

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

const OPENING_TEXT = 'Transforme uma imagem em modelo 3D para impressão. Envie um logo recortado ou uma foto.';
const CREDITS = 2;
const AUTO_CLOSE = 90;

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

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

const fileOk = (f: File) => f.type.startsWith('image/');

export default function Imagem3DDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [mode, setMode] = useState<Mode>('extrusao');
  const [detectedLabel, setDetectedLabel] = useState('');
  const [building, setBuilding] = useState(false);
  const [resultMeta, setResultMeta] = useState('');
  const [hasModel, setHasModel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Parâmetros (mesmos do HTML de referência)
  const [sizeMM, setSizeMM] = useState(60);
  const [thickness, setThickness] = useState(3);
  const [threshold, setThreshold] = useState(128);
  const [smooth, setSmooth] = useState(1.0);
  const [noise, setNoise] = useState(2);
  const [baseOn, setBaseOn] = useState(false);
  const [baseThickness, setBaseThickness] = useState(0.8);
  const [depth, setDepth] = useState(3);
  const [reliefBase, setReliefBase] = useState(0.8);
  const [resolution, setResolution] = useState(180);
  const [invert, setInvert] = useState(false);

  const [companyId, setCompanyId] = useState<string>(data.companyId || '');
  const [resultBase64, setResultBase64] = useState('');
  const [resultFileName, setResultFileName] = useState('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [logado, setLogado] = useState(false);

  const spoke = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Tudo relacionado ao three.js vive em refs — não causa re-render por frame.
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const threeRef = useRef<any>(null);     // módulo THREE importado
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const materialRef = useRef<any>(null);
  const currentGroupRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalBlobRef = useRef<Blob | null>(null); // último STL gerado (para o download)

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogado(!!session?.user));
  }, [supabase]);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const id = setInterval(() => setTimeLeft((t) => { if (t <= 1) { onClose(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [stage, onClose]);

  // ── Inicialização do three.js — só quando o workspace é montado ──────────────

  useEffect(() => {
    if (stage !== 'workspace' || !viewerRef.current) return;
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      if (cancelled || !viewerRef.current) return;

      threeRef.current = THREE;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(isDark ? 0x0f172a : 0xeef1f4);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      viewerRef.current.innerHTML = '';
      viewerRef.current.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
      const dir = new THREE.DirectionalLight(0xffffff, 1.4);
      dir.position.set(1, 1.2, 2);
      scene.add(dir);
      const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
      dir2.position.set(-1, -0.5, -1);
      scene.add(dir2);

      const material = new THREE.MeshStandardMaterial({ color: 0x00aeef, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide });

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;
      materialRef.current = material;

      const resize = () => {
        if (!viewerRef.current) return;
        const w = viewerRef.current.clientWidth, h = viewerRef.current.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(viewerRef.current);
      resizeObsRef.current = ro;

      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      // monta o primeiro modelo, já com o modo detectado
      await rebuild(true);
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObsRef.current?.disconnect();
      if (currentGroupRef.current) disposeGroup(currentGroupRef.current);
      rendererRef.current?.dispose();
      if (viewerRef.current) viewerRef.current.innerHTML = '';
      sceneRef.current = null; cameraRef.current = null; rendererRef.current = null;
      controlsRef.current = null; materialRef.current = null; currentGroupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function disposeGroup(g: any) {
    g.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  }

  function frameObject(group: any) {
    const THREE = threeRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!THREE || !camera || !controls) return;
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.6;
    camera.position.set(center.x, center.y, center.z + dist);
    camera.near = dist / 100; camera.far = dist * 10;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
  }

  // ── Detecção automática de modo (% de pixels transparentes) ──────────────────

  function detectMode(img: HTMLImageElement): Mode {
    const m = Math.max(img.naturalWidth, img.naturalHeight);
    const s = Math.min(220, m);
    const w = Math.max(1, Math.round(img.naturalWidth * s / m));
    const h = Math.max(1, Math.round(img.naturalHeight * s / m));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let transp = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 200) transp++;
    return (transp / (w * h) > 0.05) ? 'extrusao' : 'relevo';
  }

  // ── Bitmap de alpha (limiarizado), para a extrusão ───────────────────────────

  const buildAlphaBitmap = useCallback(() => {
    const img = sourceImgRef.current!;
    const maxDim = 1200;
    let w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h), d = id.data, t = threshold;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] >= t) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; }
      else { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; }
    }
    ctx.putImageData(id, 0, 0);
    return canvas;
  }, [threshold]);

  // ── Construção: extrusão ──────────────────────────────────────────────────────

  const buildExtrusion = useCallback(async () => {
    const THREE = threeRef.current;
    const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');
    // @ts-ignore — potrace-plus não publica tipos
    const { PotracePlus } = await import('potrace-plus');

    const bmp = buildAlphaBitmap();
    const traced = await PotracePlus(bmp, { turdsize: noise, opttolerance: smooth, optcurve: true, alphamax: 1, crop: true, optimize: true, addDimensions: false, workerUrl: '/potrace-plus.workers.js' });
    const d = traced.getD ? traced.getD() : traced.d;
    const tw = traced.width, th = traced.height;
    if (!d) throw new Error('Contorno vazio — ajuste o limiar.');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tw} ${th}"><path d="${d}" fill="black"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes: any[] = [];
    data.paths.forEach((p: any) => SVGLoader.createShapes(p).forEach((sh: any) => shapes.push(sh)));
    if (!shapes.length) throw new Error('Nenhuma forma detectada nesta imagem.');

    const widthMM = sizeMM;
    const scale = widthMM / tw;
    const depthPx = thickness / scale;

    const geo = new THREE.ExtrudeGeometry(shapes, { depth: depthPx, bevelEnabled: false, curveSegments: 24 });
    geo.rotateX(Math.PI);
    geo.scale(scale, scale, scale);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
    geo.computeVertexNormals();

    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, materialRef.current));

    if (baseOn) {
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      const margin = widthMM * 0.05;
      const bw = (b.max.x - b.min.x) + margin, bh = (b.max.y - b.min.y) + margin;
      const baseGeo = new THREE.BoxGeometry(bw, bh, baseThickness);
      baseGeo.translate(0, 0, -baseThickness / 2);
      group.add(new THREE.Mesh(baseGeo, materialRef.current));
    }

    const b2 = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    setResultMeta(`Extrusão · ${b2.x.toFixed(1)} × ${b2.y.toFixed(1)} × ${b2.z.toFixed(1)} mm`);
    return group;
  }, [sizeMM, thickness, threshold, smooth, noise, baseOn, baseThickness, buildAlphaBitmap]);

  // ── Construção: relevo / lithophane ───────────────────────────────────────────

  const sampleLuminance = useCallback((nx: number, ny: number) => {
    const img = sourceImgRef.current!;
    const canvas = document.createElement('canvas');
    canvas.width = nx; canvas.height = ny;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, nx, ny);
    ctx.drawImage(img, 0, 0, nx, ny);
    const d = ctx.getImageData(0, 0, nx, ny).data;
    const g = new Float32Array(nx * ny);
    for (let k = 0; k < nx * ny; k++) g[k] = (0.299 * d[k * 4] + 0.587 * d[k * 4 + 1] + 0.114 * d[k * 4 + 2]) / 255;
    return g;
  }, []);

  const buildRelief = useCallback(() => {
    const THREE = threeRef.current;
    const img = sourceImgRef.current!;
    const widthMM = sizeMM;
    const depthMM = depth;
    const baseMM = reliefBase;
    const resMax = resolution;

    const ar = img.naturalHeight / img.naturalWidth;
    let nx: number, ny: number;
    if (ar <= 1) { nx = resMax; ny = Math.max(2, Math.round(resMax * ar)); }
    else { ny = resMax; nx = Math.max(2, Math.round(resMax / ar)); }

    const lum = sampleLuminance(nx, ny);
    const heightMM = widthMM * (ny - 1) / (nx - 1);
    const dx = widthMM / (nx - 1), dy = heightMM / (ny - 1);

    const pos: number[] = [];
    const idx: number[] = [];
    const V = nx * ny;
    const top = (i: number, j: number) => j * nx + i;
    const bot = (i: number, j: number) => V + j * nx + i;

    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const L = lum[j * nx + i];
      const t = baseMM + (invert ? L : (1 - L)) * depthMM;
      pos.push(-widthMM / 2 + i * dx, heightMM / 2 - j * dy, t);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      pos.push(-widthMM / 2 + i * dx, heightMM / 2 - j * dy, 0);
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = top(i, j), b = top(i + 1, j), cc = top(i + 1, j + 1), d2 = top(i, j + 1);
      idx.push(a, d2, cc, a, cc, b);
      const A = bot(i, j), B = bot(i + 1, j), C = bot(i + 1, j + 1), D = bot(i, j + 1);
      idx.push(A, C, D, A, B, C);
    }
    const wall = (t0: number, t1: number, b0: number, b1: number) => { idx.push(t0, t1, b1, t0, b1, b0); };
    for (let i = 0; i < nx - 1; i++) wall(top(i, 0), top(i + 1, 0), bot(i, 0), bot(i + 1, 0));
    for (let i = 0; i < nx - 1; i++) wall(top(i + 1, ny - 1), top(i, ny - 1), bot(i + 1, ny - 1), bot(i, ny - 1));
    for (let j = 0; j < ny - 1; j++) wall(top(0, j + 1), top(0, j), bot(0, j + 1), bot(0, j));
    for (let j = 0; j < ny - 1; j++) wall(top(nx - 1, j), top(nx - 1, j + 1), bot(nx - 1, j), bot(nx - 1, j + 1));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, materialRef.current));
    setResultMeta(`Relevo · ${widthMM.toFixed(1)} × ${heightMM.toFixed(1)} × ${(baseMM + depthMM).toFixed(1)} mm · ${nx}×${ny}`);
    return group;
  }, [sizeMM, depth, reliefBase, resolution, invert, sampleLuminance]);

  // ── Rebuild (com debounce ao mexer nos sliders) ───────────────────────────────

  const rebuild = useCallback(async (refit: boolean) => {
    if (!sourceImgRef.current || !sceneRef.current) return;
    setErrorMsg('');
    setBuilding(true);
    setHasModel(false);
    try {
      const group = mode === 'extrusao' ? await buildExtrusion() : buildRelief();
      if (currentGroupRef.current) { sceneRef.current.remove(currentGroupRef.current); disposeGroup(currentGroupRef.current); }
      currentGroupRef.current = group;
      sceneRef.current.add(group);
      if (refit) frameObject(group);
      setHasModel(true);
    } catch (err: any) {
      setErrorMsg('Não foi possível gerar o 3D para esta imagem. Ajuste o limiar/resolução ou troque o modo.');
    } finally {
      setBuilding(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, buildExtrusion, buildRelief]);

  const scheduleRebuild = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => rebuild(false), 300);
  }, [rebuild]);

  // Reconstrói sempre que um parâmetro relevante muda (debounced)
  useEffect(() => {
    if (stage !== 'workspace') return;
    scheduleRebuild();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, sizeMM, thickness, threshold, smooth, noise, baseOn, baseThickness, depth, reliefBase, resolution, invert, mode]);

  // ── Upload ─────────────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!fileOk(file)) { setErrorMsg('Selecione uma imagem.'); setStage('error'); return; }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Máx. 10MB.'); setStage('error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sourceImgRef.current = img;
        const detected = detectMode(img);
        setMode(detected);
        setDetectedLabel(detected === 'extrusao' ? 'logo/recorte (extrusão)' : 'imagem (relevo)');
        setStage('workspace');
      };
      img.onerror = () => { setErrorMsg('Não foi possível carregar essa imagem.'); setStage('error'); };
      img.src = e.target!.result as string;
    };
    reader.onerror = () => { setErrorMsg('Não foi possível ler o arquivo.'); setStage('error'); };
    reader.readAsDataURL(file);
  }, []);

  // ── Exportação STL / 3MF (em memória; liberadas só após cobrança) ────────────

  const exportStlBlob = useCallback(async (): Promise<Blob> => {
    const { STLExporter } = await import('three/addons/exporters/STLExporter.js');
    const result = new STLExporter().parse(currentGroupRef.current, { binary: true });
    return new Blob([result], { type: 'application/octet-stream' });
  }, []);

  const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>';
  const RELS = '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';

  function groupToMeshData(group: any) {
    const THREE = threeRef.current;
    group.updateMatrixWorld(true);
    const verts: number[] = [], tris: number[] = [];
    let offset = 0;
    const v = new THREE.Vector3();
    group.traverse((o: any) => {
      if (!o.isMesh) return;
      const g = o.geometry, pos = g.attributes.position, m = o.matrixWorld, base = offset;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        verts.push(v.x, v.y, v.z);
      }
      if (g.index) {
        const ix = g.index.array;
        for (let i = 0; i < ix.length; i += 3) tris.push(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
      } else {
        for (let i = 0; i < pos.count; i += 3) tris.push(base + i, base + i + 1, base + i + 2);
      }
      offset += pos.count;
    });
    return { verts, tris };
  }

  function buildModelXML(verts: number[], tris: number[]) {
    const r = (n: number) => Math.round(n * 1000) / 1000;
    const p: string[] = [];
    p.push('<?xml version="1.0" encoding="UTF-8"?>\n');
    p.push('<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">');
    p.push('<resources><object id="1" type="model"><mesh><vertices>');
    for (let i = 0; i < verts.length; i += 3) p.push(`<vertex x="${r(verts[i])}" y="${r(verts[i + 1])}" z="${r(verts[i + 2])}"/>`);
    p.push('</vertices><triangles>');
    for (let i = 0; i < tris.length; i += 3) p.push(`<triangle v1="${tris[i]}" v2="${tris[i + 1]}" v3="${tris[i + 2]}"/>`);
    p.push('</triangles></mesh></object></resources><build><item objectid="1"/></build></model>');
    return p.join('');
  }

  const exportThreeMfBlob = useCallback(async (): Promise<Blob> => {
    const JSZip = (await import('jszip')).default;
    const { verts, tris } = groupToMeshData(currentGroupRef.current);
    const zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES);
    zip.folder('_rels')!.file('.rels', RELS);
    zip.folder('3D')!.file('3dmodel.model', buildModelXML(verts, tris));
    return zip.generateAsync({ type: 'blob', mimeType: 'model/3mf', compression: 'DEFLATE' });
  }, []);

  // ── Liberar: exige login + cobrança; formato escolhido no momento do clique ──

  const ensureCompany = useCallback(async (): Promise<string | null> => {
    if (companyId) return companyId;
    const { data: ensured } = await supabase.rpc('ensure_my_arte_company');
    const cid = (ensured as string) ?? '';
    if (!cid) return null;
    setCompanyId(cid);
    return cid;
  }, [companyId, supabase]);

  const handleRelease = useCallback(async (format: 'stl' | '3mf') => {
    if (!hasModel || !currentGroupRef.current) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setStage('login'); return; }

    setStage('processing');
    try {
      const cid = await ensureCompany();
      if (!cid) { setErrorMsg('Não foi possível preparar sua conta. Recarregue e tente de novo.'); setStage('error'); return; }

      const blob = format === 'stl' ? await exportStlBlob() : await exportThreeMfBlob();
      finalBlobRef.current = blob;
      const fileName = `modelo_${mode}_${Date.now()}.${format}`;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Falha ao preparar o arquivo.'));
        reader.readAsDataURL(blob);
      });

      const { data: raw, error: rpcError } = await supabase.rpc('cobrar_credito_se_suficiente', {
        p_company_id: cid,
        p_function_key: 'imagem_3d',
        p_credits: CREDITS,
        p_metadata: { fileName, mode },
      });
      if (rpcError) throw new Error(rpcError.message);

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
      playText('Modelo 3D liberado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar o arquivo.');
      setStage('error');
    }
  }, [hasModel, mode, supabase, ensureCompany, exportStlBlob, exportThreeMfBlob, playText]);

  const irParaLogin = useCallback(() => {
    if (onRequireLogin) onRequireLogin();
    else window.location.href = '/login';
  }, [onRequireLogin]);

  const handleDownload = useCallback(() => {
    if (!finalBlobRef.current || !resultFileName) return;
    const url = URL.createObjectURL(finalBlobRef.current);
    const a = document.createElement('a');
    a.href = url; a.download = resultFileName; a.click();
    URL.revokeObjectURL(url);
  }, [resultFileName]);

  const handleReset = useCallback(() => {
    sourceImgRef.current = null;
    finalBlobRef.current = null;
    setHasModel(false);
    setResultMeta('');
    setResultBase64('');
    setResultFileName('');
    setSaldo(null);
    setErrorMsg('');
    setMode('extrusao');
    setSizeMM(60); setThickness(3); setThreshold(128); setSmooth(1.0); setNoise(2);
    setBaseOn(false); setBaseThickness(0.8); setDepth(3); setReliefBase(0.8); setResolution(180); setInvert(false);
    setStage('input');
  }, []);

  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: c.textMuted, marginBottom: 4 };
  const btnPrimary: React.CSSProperties = { padding: 14, borderRadius: 10, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' };
  const segBtn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: active ? `2px solid ${c.accent}` : `1px solid ${c.border}`, background: active ? c.accent : c.bgSecondary, color: active ? '#fff' : c.textMuted });

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'workspace' || stage === 'result' ? 900 : 640, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Imagem para 3D</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Envie um logo com fundo transparente (vira um sólido extrudado) ou uma foto comum
                (vira um relevo de profundidade, tipo lithophane). O preview 3D é livre — gire e dê
                zoom para conferir antes de baixar o arquivo .STL ou .3MF.
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
              <span style={{ fontSize: 12 }}>PNG transparente vira extrusão · foto opaca vira relevo — máx. 10MB</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
          </div>
        )}

        {/* WORKSPACE */}
        {stage === 'workspace' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: c.textMuted }}>Detectado: <strong style={{ color: c.accent }}>{detectedLabel}</strong></span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setMode('extrusao')} style={segBtn(mode === 'extrusao')}>Extrusão</button>
                  <button onClick={() => setMode('relevo')} style={segBtn(mode === 'relevo')}>Relevo</button>
                </div>
                <button onClick={handleReset} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconRefresh s={icon(c.textMuted, 13)} /> Nova
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.bgSecondary, height: 380 }}>
              <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
              {building && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'i3d-spin 0.8s linear infinite' }} />
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: c.textMuted, pointerEvents: 'none' }}>
                Arraste para girar · scroll para zoom
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
                <div>
                  <label style={label}>Largura alvo: {sizeMM} mm</label>
                  <input type="range" min={20} max={200} step={5} value={sizeMM} onChange={(e) => setSizeMM(parseInt(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                </div>

                {mode === 'extrusao' && (
                  <>
                    <div>
                      <label style={label}>Espessura: {thickness} mm</label>
                      <input type="range" min={1} max={20} step={0.5} value={thickness} onChange={(e) => setThickness(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Limiar (alpha): {threshold}</label>
                      <input type="range" min={1} max={254} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Suavização: {smooth.toFixed(1)}</label>
                      <input type="range" min={0} max={1.5} step={0.1} value={smooth} onChange={(e) => setSmooth(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Remover ruído: {noise}</label>
                      <input type="range" min={0} max={20} step={1} value={noise} onChange={(e) => setNoise(parseInt(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Placa de base</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={baseOn} onChange={(e) => setBaseOn(e.target.checked)} style={{ width: 16, height: 16, accentColor: c.accent }} />
                        <span style={{ fontSize: 12, color: c.text }}>Adicionar base</span>
                      </div>
                      {baseOn && (
                        <input type="number" min={0.2} max={5} step={0.2} value={baseThickness}
                          onChange={(e) => setBaseThickness(parseFloat(e.target.value) || 0.2)}
                          style={{ marginTop: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, outline: 'none' }} />
                      )}
                    </div>
                  </>
                )}

                {mode === 'relevo' && (
                  <>
                    <div>
                      <label style={label}>Profundidade do relevo: {depth} mm</label>
                      <input type="range" min={0.5} max={10} step={0.5} value={depth} onChange={(e) => setDepth(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Espessura da base: {reliefBase.toFixed(1)} mm</label>
                      <input type="range" min={0.4} max={3} step={0.1} value={reliefBase} onChange={(e) => setReliefBase(parseFloat(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Resolução: {resolution}</label>
                      <input type="range" min={80} max={300} step={10} value={resolution} onChange={(e) => setResolution(parseInt(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Inverter relevo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} style={{ width: 16, height: 16, accentColor: c.accent }} />
                        <span style={{ fontSize: 12, color: c.text }}>Claro = alto (deixe desmarcado para lithophane)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 12, lineHeight: 1.4 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 13 }}>
              <span style={{ color: c.textMuted }}>{resultMeta || '—'}</span>
              {logado && <span style={{ color: c.textMuted }}>Custo: <strong style={{ color: c.text }}>{CREDITS}</strong></span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => handleRelease('3mf')} disabled={!hasModel} style={{ ...btnPrimary, padding: 12, fontSize: 13, background: hasModel ? c.bgSecondary : c.border, color: hasModel ? c.text : c.textMuted, border: `1px solid ${c.border}`, cursor: hasModel ? 'pointer' : 'not-allowed' }}>
                <IconDownload s={icon(hasModel ? c.text : c.textMuted, 14)} /> Baixar .3MF
              </button>
              <button onClick={() => handleRelease('stl')} disabled={!hasModel} style={{ ...btnPrimary, background: hasModel ? c.accent : c.border, cursor: hasModel ? 'pointer' : 'not-allowed' }}>
                <IconDownload s={icon('#fff', 15)} /> Baixar .STL
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'i3d-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Preparando o arquivo...</p>
          </div>
        )}

        {/* LOGIN */}
        {stage === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Crie sua conta para baixar o modelo 3D</div>
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>
              O preview 3D é livre. Para baixar o arquivo, entre na sua conta — e ao se{' '}
              <strong style={{ color: c.accent }}>cadastrar você ganha 20 créditos iniciais</strong>.
            </p>
            <button onClick={irParaLogin} style={{ ...btnPrimary, background: c.accent }}>
              Entrar / Cadastrar e ganhar 20 créditos
            </button>
            <button onClick={() => setStage('workspace')} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13 }}>
              Voltar ao preview
            </button>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <IconCheck s={icon(c.success, 16)} />
              <span>Modelo liberado!</span>
            </div>

            <div className="i3d-result-row" style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
                    Arquivo: <strong style={{ color: c.text }}>{resultFileName}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                    {resultMeta}{saldo != null ? ` · saldo: ${saldo} créditos` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{ ...btnPrimary, flex: 1, padding: 10, fontSize: 14 }}>
                    <IconDownload s={icon('#fff', 15)} /> Baixar
                  </button>
                  <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconRefresh s={icon(c.textMuted, 14)} /> Nova imagem
                  </button>
                </div>
              </div>
              <div className="i3d-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={companyId} fileName={resultFileName} fileType="application/octet-stream" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>
            <div className="i3d-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={companyId} fileName={resultFileName} fileType="application/octet-stream" fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
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
            <button onClick={() => setStage(sourceImgRef.current ? 'workspace' : 'input')} style={{ ...btnPrimary, background: c.error }}>
              <IconRefresh s={icon('#fff', 15)} /> Voltar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes i3d-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .i3d-result-row { flex-direction: column !important; }
          .i3d-qr-desktop { display: none !important; }
          .i3d-qr-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .i3d-qr-desktop { display: flex !important; flex-direction: column; }
          .i3d-qr-mobile { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}