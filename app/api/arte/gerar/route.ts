// app/api/arte/gerar/route.ts
//
// Substitui a edge Supabase `gerar-arte-final`. Pipeline:
//   auth → baixa alta do Storage → Sharp (CMYK ISO Coated v2, 300dpi) →
//   pdf-lib (geometria + imagem CMYK) → PDFRest (selo X-1a) → cobra → entrega.
// A alta nunca toca o navegador. Gate de cobrança por último (fail-closed).
//
// ENV necessárias (Vercel):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, PDFREST_API_KEY

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
const DPI_TARGET = 300;
const mm = (v: number) => (v * 72) / 25.4;
const ICC_PATH = path.join(process.cwd(), 'lib/arte/profiles/ISOcoated_v2_300_eci.icc');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Autentica pelo token (não confia no companyId do body)
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Não autenticado' }, 401);

    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401);

    const { companyId, uploadPath, spec } = await req.json();
    if (!companyId || !uploadPath || !spec) return json({ error: 'Parâmetros faltando' }, 400);

    const finalW = Number(spec.final_w_mm), finalH = Number(spec.final_h_mm);
    const bleed = Number(spec.bleed_mm ?? 3);
    const zoom = Math.max(1, Number(spec.zoom ?? 1));
    const offX = Number(spec.offset_x ?? 0);
    const offY = Number(spec.offset_y ?? 0);
    if (!(finalW > 0) || !(finalH > 0)) return json({ error: 'Medida inválida' }, 400);
    if (finalW - 2 * bleed <= 0 || finalH - 2 * bleed <= 0) return json({ error: 'Sangria maior que a medida' }, 400);

    // 2. Confere dono da empresa e do caminho
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: company } = await admin.from('companies').select('user_id').eq('id', companyId).single();
    if (!company || company.user_id !== user.id) return json({ error: 'Sem permissão' }, 403);
    if (!String(uploadPath).startsWith(`${companyId}/`)) return json({ error: 'Caminho inválido' }, 403);

    // 3. Baixa a ALTA do Storage (service role; navegador nunca acessa)
    const { data: blob, error: dlErr } = await admin.storage.from('arte-uploads').download(uploadPath);
    if (dlErr || !blob) return json({ error: 'Arquivo não encontrado' }, 404);
    const srcBuf = Buffer.from(await blob.arrayBuffer());

    // 4. Geometria de posicionamento (mesma conta do preview)
    const meta = await sharp(srcBuf).metadata();
    const imgW = meta.width ?? 0, imgH = meta.height ?? 0;
    if (!imgW || !imgH) return json({ error: 'Imagem inválida' }, 422);

    const mediaWpt = mm(finalW), mediaHpt = mm(finalH);
    const imgAspect = imgW / imgH, boxAspect = finalW / finalH;
    const ratioX = imgAspect > boxAspect ? imgAspect / boxAspect : 1;
    const ratioY = imgAspect > boxAspect ? 1 : boxAspect / imgAspect;
    const drawWpt = mediaWpt * ratioX * zoom;
    const drawHpt = mediaHpt * ratioY * zoom;
    const x = mediaWpt * (0.5 + offX) - drawWpt / 2;
    const y = mediaHpt - mediaHpt * (0.5 + offY) - drawHpt / 2; // PDF: origem inferior-esquerda

    // 5. Guarda de DPI sobre o tamanho impresso real
    const dpi = imgW / (drawWpt / 72);
    if (dpi < 96) {
      return json({ error: `Resolução baixa: ${Math.round(dpi)} DPI. Reduza o zoom ou envie arte maior.`, dpi: Math.round(dpi) }, 422);
    }

    // 6. Pixels-alvo p/ 300dpi no tamanho desenhado (downsampling; nunca amplia)
    const targetPx = Math.min(imgW, Math.round((drawWpt / 72) * DPI_TARGET));

    // 7. RGB → CMYK (ISO Coated v2). flatten OBRIGATÓRIO antes do ICC CMYK (alpha quebra).
    if (!fs.existsSync(ICC_PATH)) return json({ error: 'Perfil ICC ausente no servidor' }, 500);
    const cmykBuf = await sharp(srcBuf)
      .resize({ width: targetPx, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .toColourspace('cmyk')
      .withMetadata({ icc: ICC_PATH })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // 8. pdf-lib: MediaBox = medida final (sangria inclusa); TrimBox recuado; imagem CMYK
    const doc = await PDFDocument.create();
    const page = doc.addPage([mediaWpt, mediaHpt]);
    page.setMediaBox(0, 0, mediaWpt, mediaHpt);
    page.setBleedBox(0, 0, mediaWpt, mediaHpt);
    page.setTrimBox(mm(bleed), mm(bleed), mm(finalW - 2 * bleed), mm(finalH - 2 * bleed));
    const img = await doc.embedJpg(cmykBuf);
    page.drawImage(img, { x, y, width: drawWpt, height: drawHpt });
    const rgbPdf = await doc.save();

    // 9. PDFRest: sela PDF/X-1a (insere output intent). Chave só no servidor.
    const form = new FormData();
    form.append('file', new Blob([rgbPdf], { type: 'application/pdf' }), 'arte.pdf');
    form.append('output_type', 'PDF/X-1a');
    form.append('output', 'arte-final-x1a');
    form.append('id', String(companyId).slice(0, 36)); // rótulo de rastreio (opcional)

    const pdfxRes = await fetch('https://api.pdfrest.com/pdfx', {
      method: 'POST',
      headers: { 'Api-Key': process.env.PDFREST_API_KEY!, 'Accept': 'application/json' },
      body: form,
    });
    const pdfxData = await pdfxRes.json();
    if (!pdfxRes.ok || !pdfxData.outputUrl) {
      return json({ error: `Falha ao selar X-1a: ${pdfxData.error ?? pdfxRes.status}` }, 502);
    }

    // baixa o X-1a do PDFRest (não expõe o link deles ao cliente)
    const x1aRes = await fetch(pdfxData.outputUrl, { headers: { 'Api-Key': process.env.PDFREST_API_KEY! } });
    if (!x1aRes.ok) return json({ error: 'Falha ao baixar X-1a' }, 502);
    const x1aBuf = Buffer.from(await x1aRes.arrayBuffer());

    // 10. Converte ANTES de cobrar — nada que possa falhar depois da cobrança.
    const b64 = x1aBuf.toString('base64');
    const nomeBase = (spec.nome ? String(spec.nome).replace(/[^\w\-]+/g, '_') : 'arte-final');
    const fileName = `${nomeBase}_${finalW}x${finalH}mm_x1a.pdf`;

    // 11. GATE fail-closed: cobra por último. Sem saldo, não entrega.
    const { data: charge, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: FUNCTION_KEY,
      p_credits: CREDITS,
      p_metadata: { final: `${finalW}x${finalH}`, bleed, zoom, dpi: Math.round(dpi), pdfx_id: pdfxData.outputId, upload_path: uploadPath },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const row = Array.isArray(charge) ? charge[0] : charge;
    if (!row?.sucesso) {
      return json({ error: 'Créditos insuficientes', saldo: row?.saldo_anterior ?? 0, custo: CREDITS }, 402);
    }

    // 12. Pago — entrega
    return json({ success: true, pdf_base64: b64, file_name: fileName, saldo: row.saldo_novo, dpi: Math.round(dpi) });

  } catch (e) {
    console.error('[api/arte/gerar]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}