// lib/arte/prepareUpload.ts
import { createClient } from '@/lib/supabase-browser';

export interface ArtePreview {
  previewDataUrl: string;
  width: number;
  height: number;
  source: Blob;
  contentType: string;
  ext: string;
  hasAlpha: boolean; // true = tem transparência (silhueta p/ recorte); PDF/JPEG = false
}

export interface PdfHandle { file: File; pages: number; }

const PREVIEW_MAX = 200;
const PDF_TARGET_DPI = 300;
const PDF_MAX_SIDE = 4000;

let pdfjsCache: any = null;
async function getPdfjs(): Promise<any> {
  if (pdfjsCache) return pdfjsCache;
  const pdfjs: any = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const v = pdfjs.version || '4.0.379';
    const ext = Number(v.split('.')[0]) >= 4 ? 'mjs' : 'js';
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.${ext}`;
  }
  pdfjsCache = pdfjs;
  return pdfjs;
}

function previewFromCanvas(src: HTMLCanvasElement): string {
  const s = PREVIEW_MAX / Math.max(src.width, src.height);
  const pc = document.createElement('canvas');
  pc.width = Math.max(1, Math.round(src.width * s));
  pc.height = Math.max(1, Math.round(src.height * s));
  pc.getContext('2d')!.drawImage(src, 0, 0, pc.width, pc.height);
  return pc.toDataURL('image/jpeg', 0.7);
}

export const isPdfFile = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export async function openPdf(file: File): Promise<PdfHandle> {
  const pdfjs = await getPdfjs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  return { file, pages: pdf.numPages };
}

export async function rasterizePdfPage(file: File, pageNum: number): Promise<ArtePreview> {
  const pdfjs = await getPdfjs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const n = Math.min(Math.max(1, pageNum), pdf.numPages);
  const page = await pdf.getPage(n);

  const base = page.getViewport({ scale: 1 });
  let scale = PDF_TARGET_DPI / 72;
  const longest = Math.max(base.width, base.height) * scale;
  if (longest > PDF_MAX_SIDE) scale *= PDF_MAX_SIDE / longest;

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'));
  return {
    previewDataUrl: previewFromCanvas(canvas),
    width: canvas.width, height: canvas.height,
    source: blob, contentType: 'image/png', ext: 'png', hasAlpha: false, // rasterizado em branco
  };
}

export async function makeImagePreview(file: File): Promise<ArtePreview> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width, height = bitmap.height;
  const s = PREVIEW_MAX / Math.max(width, height);
  const pw = Math.max(1, Math.round(width * s));
  const ph = Math.max(1, Math.round(height * s));
  const pc = document.createElement('canvas');
  pc.width = pw; pc.height = ph;
  const ctx = pc.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, pw, ph); // canvas transparente por padrão → alfa preservado
  bitmap.close?.();

  // detecta transparência amostrando o canal alfa do preview
  let hasAlpha = false;
  try {
    const px = ctx.getImageData(0, 0, pw, ph).data;
    for (let i = 3; i < px.length; i += 4) { if (px[i] < 128) { hasAlpha = true; break; } }
  } catch { /* canvas tainted (raro p/ arquivo local) — assume sem alfa */ }

  return {
    previewDataUrl: pc.toDataURL('image/jpeg', 0.7),
    width, height, source: file, contentType: file.type,
    ext: (file.name.split('.').pop() || 'bin').toLowerCase(), hasAlpha,
  };
}

export async function uploadArteSource(p: ArtePreview, companyId: string): Promise<string> {
  const supabase = createClient();
  const uploadPath = `${companyId}/${crypto.randomUUID()}.${p.ext}`;
  const { error } = await supabase.storage.from('arte-uploads').upload(uploadPath, p.source, { contentType: p.contentType, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return uploadPath;
}