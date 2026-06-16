// lib/arte/prepareUpload.ts
import { createClient } from '@/lib/supabase-browser';

export interface ArtePreview {
  previewDataUrl: string;  // 200px — único pixel que fica visível no client
  width: number;
  height: number;
  source: Blob;            // ALTA em memória (PNG rasterizado p/ PDF, ou o próprio arquivo)
  contentType: string;
  ext: string;
}

const PREVIEW_MAX = 200;
const PDF_TARGET_DPI = 300;
const PDF_MAX_SIDE = 4000;

function previewFromCanvas(src: HTMLCanvasElement): string {
  const s = PREVIEW_MAX / Math.max(src.width, src.height);
  const pc = document.createElement('canvas');
  pc.width = Math.max(1, Math.round(src.width * s));
  pc.height = Math.max(1, Math.round(src.height * s));
  pc.getContext('2d')!.drawImage(src, 0, 0, pc.width, pc.height);
  return pc.toDataURL('image/jpeg', 0.7);
}

// Rasteriza a 1ª página do PDF em alta (PNG). Vetor/fonte viram pixel — elimina curvas.
async function rasterizePdfFirstPage(file: File): Promise<{ blob: Blob; width: number; height: number; previewDataUrl: string }> {
  const pdfjs: any = await import('pdfjs-dist');
  // Se o projeto já configura o worker do pdf.js em outro lugar, pode remover este if.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      // @ts-ignore
      const w = await import('pdfjs-dist/build/pdf.worker.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = (w as any).default ?? '';
    } catch { /* usa o worker já setado pelo projeto */ }
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);

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
  return { blob, width: canvas.width, height: canvas.height, previewDataUrl: previewFromCanvas(canvas) };
}

// PREVIEW: roda só no navegador. Sem upload, sem login. Guarda a alta em memória (source).
export async function makeArtePreview(file: File): Promise<ArtePreview> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  if (isPdf) {
    const r = await rasterizePdfFirstPage(file);
    return { previewDataUrl: r.previewDataUrl, width: r.width, height: r.height, source: r.blob, contentType: 'image/png', ext: 'png' };
  }

  const bitmap = await createImageBitmap(file);
  const width = bitmap.width, height = bitmap.height;
  const s = PREVIEW_MAX / Math.max(width, height);
  const pc = document.createElement('canvas');
  pc.width = Math.max(1, Math.round(width * s));
  pc.height = Math.max(1, Math.round(height * s));
  pc.getContext('2d')!.drawImage(bitmap, 0, 0, pc.width, pc.height);
  bitmap.close?.();

  return {
    previewDataUrl: pc.toDataURL('image/jpeg', 0.7),
    width, height, source: file, contentType: file.type,
    ext: (file.name.split('.').pop() || 'bin').toLowerCase(),
  };
}

// UPLOAD: só no "Liberar", com usuário logado. Sobe a alta e devolve o caminho.
export async function uploadArteSource(p: ArtePreview, companyId: string): Promise<string> {
  const supabase = createClient();
  const uploadPath = `${companyId}/${crypto.randomUUID()}.${p.ext}`;
  const { error } = await supabase.storage.from('arte-uploads').upload(uploadPath, p.source, { contentType: p.contentType, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return uploadPath;
}
