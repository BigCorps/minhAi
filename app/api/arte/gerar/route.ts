// app/api/arte/gerar/route.ts
//
// Gera PDF de produção (1 ou 2 páginas: frente/verso). Pipeline por face:
//   Sharp (rotação + CMYK ISO Coated v2 + DPI alvo) → pdf-lib (página + geometria).
// Depois: PDFRest sela X-1a (multipágina) → cobra 5 créditos uma vez → entrega.
// A alta nunca toca o navegador. Gate fail-closed por último.

export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const FUNCTION_KEY = 'gerar_arte_final';
const CREDITS = 5;
const DPI_MIN = 96;
const mm = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ICC_PATH = path.join(process.cwd(), 'lib/arte/profiles/ISOcoated_v2_300_eci.icc');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s });

interface SideSpec { upload_path: string; zoom: number; offset_x: number; offset_y: number; rotation: number }

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PDFREST_API_KEY) {
      return json({ error: 'Configuração do servidor incompleta' }, 500);
    }

    // 1. Auth
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Não autenticado' }, 401);
    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401);

    const { companyId, spec } = await req.json();
    if (!companyId || !spec) return json({ error: 'Parâmetros faltando' }, 400);

    const finalW = Number(spec.final_w_mm), finalH = Number(spec.final_h_mm);
    const bleed = Number(spec.bleed_mm ?? 3);
    const dpiTarget = clamp(Number(spec.dpi_target ?? 300), 72, 300);
    const sides: SideSpec[] = Array.isArray(spec.sides) ? spec.sides.slice(0, 2) : [];
    if (!(finalW > 0) || !(finalH > 0)) return json({ error: 'Medida inválida' }, 400);
    if (finalW - 2 * bleed <= 0 || finalH - 2 * bleed <= 0) return json({ error: 'Sangria maior que a medida' }, 400);
    if (sides.length === 0) return json({ error: 'Nenhuma arte enviada' }, 400);

    // 2. Posse
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: company } = await admin.from('companies').select('user_id').eq('id', companyId).single();
    if (!company || company.user_id !== user.id) return json({ error: 'Sem permissão' }, 403);

    const mediaWpt = mm(finalW), mediaHpt = mm(finalH);
    if (!fs.existsSync(ICC_PATH)) return json({ error: 'Perfil ICC ausente no servidor' }, 500);
    const doc = await PDFDocument.create();

    // 3. Processa cada face → uma página
    for (let i = 0; i < sides.length; i++) {
      const sd = sides[i];
      const faceNome = i === 0 ? 'frente' : 'verso';
      if (!String(sd.upload_path).startsWith(`${companyId}/`)) return json({ error: 'Caminho inválido' }, 403);

      const { data: blob, error: dlErr } = await admin.storage.from('arte-uploads').download(sd.upload_path);
      if (dlErr || !blob) return json({ error: `Arquivo da ${faceNome} não encontrado` }, 404);
      const srcBuf = Buffer.from(await blob.arrayBuffer());

      const rotation = ((Number(sd.rotation) % 360) + 360) % 360;
      const meta = await sharp(srcBuf).metadata();
      const imgW = meta.width ?? 0, imgH = meta.height ?? 0;
      if (!imgW || !imgH) return json({ error: `Imagem inválida (${faceNome})` }, 422);

      // dimensões efetivas após rotação
      const sw = rotation % 180 !== 0;
      const effW = sw ? imgH : imgW;
      const effH = sw ? imgW : imgH;

      const imgAspect = effW / effH, boxAspect = finalW / finalH;
      const ratioX = imgAspect > boxAspect ? imgAspect / boxAspect : 1;
      const ratioY = imgAspect > boxAspect ? 1 : boxAspect / imgAspect;
      const zoom = Math.max(1, Number(sd.zoom ?? 1));
      const rx = ratioX * zoom, ry = ratioY * zoom;
      const maxOffX = Math.max(0, (rx - 1) / 2), maxOffY = Math.max(0, (ry - 1) / 2);
      const offX = clamp(Number(sd.offset_x ?? 0), -maxOffX, maxOffX);
      const offY = clamp(Number(sd.offset_y ?? 0), -maxOffY, maxOffY);

      const drawWpt = mediaWpt * rx, drawHpt = mediaHpt * ry;
      const x = mediaWpt * (0.5 + offX) - drawWpt / 2;
      const y = mediaHpt - mediaHpt * (0.5 + offY) - drawHpt / 2; // PDF: origem inferior-esquerda

      const dpi = effW / (drawWpt / 72);
      if (dpi < DPI_MIN) return json({ error: `Resolução baixa na ${faceNome}: ${Math.round(dpi)} DPI.`, dpi: Math.round(dpi) }, 422);

      const targetPx = Math.min(effW, Math.round((drawWpt / 72) * dpiTarget));

      // Sharp: rotação → resize → CMYK (flatten antes do ICC, senão alpha quebra)
      const cmykBuf = await sharp(srcBuf)
        .rotate(rotation)
        .resize({ width: targetPx, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .toColourspace('cmyk')
        .withMetadata({ icc: ICC_PATH })
        .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
        .toBuffer();

      const page = doc.addPage([mediaWpt, mediaHpt]);
      page.setMediaBox(0, 0, mediaWpt, mediaHpt);
      page.setBleedBox(0, 0, mediaWpt, mediaHpt);
      page.setTrimBox(mm(bleed), mm(bleed), mm(finalW - 2 * bleed), mm(finalH - 2 * bleed));
      const img = await doc.embedJpg(cmykBuf);
      page.drawImage(img, { x, y, width: drawWpt, height: drawHpt });
    }

    const rgbPdf = await doc.save();

    // 4. PDFRest: sela PDF/X-1a (multipágina). Só 'file' (nunca file+id juntos).
    const form = new FormData();
    form.append('file', new Blob([rgbPdf], { type: 'application/pdf' }), 'arte.pdf');
    form.append('output_type', 'PDF/X-1a');
    form.append('output', 'arte-final-x1a');

    const pdfxRes = await fetch('https://api.pdfrest.com/pdfx', {
      method: 'POST',
      headers: { 'Api-Key': process.env.PDFREST_API_KEY!, 'Accept': 'application/json' },
      body: form,
    });
    const pdfxData = await pdfxRes.json();
    if (!pdfxRes.ok || !pdfxData.outputUrl) return json({ error: `Falha ao selar X-1a: ${pdfxData.error ?? pdfxRes.status}` }, 502);

    const x1aRes = await fetch(pdfxData.outputUrl, { headers: { 'Api-Key': process.env.PDFREST_API_KEY! } });
    if (!x1aRes.ok) return json({ error: 'Falha ao baixar X-1a' }, 502);
    const x1aBuf = Buffer.from(await x1aRes.arrayBuffer());

    // 5. Converte ANTES de cobrar
    const b64 = x1aBuf.toString('base64');
    const nomeBase = (spec.nome ? String(spec.nome).replace(/[^\w\-]+/g, '_') : 'arte-final');
    const fileName = `${nomeBase}_${finalW}x${finalH}mm${sides.length > 1 ? '_fv' : ''}_x1a.pdf`;

    // 6. GATE fail-closed: cobra por último (5 créditos, frente+verso no mesmo job)
    const { data: charge, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: FUNCTION_KEY,
      p_credits: CREDITS,
      p_metadata: { final: `${finalW}x${finalH}`, bleed, paginas: sides.length, dpi_target: dpiTarget, pdfx_id: pdfxData.outputId },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const row = Array.isArray(charge) ? charge[0] : charge;
    if (!row?.sucesso) return json({ error: 'Créditos insuficientes', saldo: row?.saldo_anterior ?? 0, custo: CREDITS }, 402);

    // 7. Entrega
    return json({ success: true, pdf_base64: b64, file_name: fileName, saldo: row.saldo_novo });

  } catch (e) {
    console.error('[api/arte/gerar]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}