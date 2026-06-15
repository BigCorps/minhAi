// lib/arte/prepareUpload.ts
import { createClient } from '@/lib/supabase-browser';

export interface ArteUpload {
  previewDataUrl: string; // baixa-res: fica no client (preview + PDF de baixa)
  uploadPath: string;     // original em alta no Storage privado (nunca no client)
  width: number;          // dimensões reais do original (p/ checagem de DPI depois)
  height: number;
}

const PREVIEW_MAX = 200; // px no maior lado — bom p/ ver, inútil p/ imprimir

export async function prepareArteUpload(file: File, companyId: string): Promise<ArteUpload> {
  // 1. dimensões reais do original
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // 2. preview reduzido no canvas — ÚNICA coisa que fica no client
  const scale = PREVIEW_MAX / Math.max(width, height);
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = pw; canvas.height = ph;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, pw, ph);
  bitmap.close?.();
  const previewDataUrl = canvas.toDataURL('image/jpeg', 0.7);

  // 3. original em alta direto pro bucket privado — não passa pelo DOM
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const uploadPath = `${companyId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('arte-uploads')
    .upload(uploadPath, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  return { previewDataUrl, uploadPath, width, height };
}