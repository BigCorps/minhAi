// app/api/arte/adesivo/route.ts
//
// Adesivo com recorte (die-cut). 2 páginas: pág 1 = arte CMYK; pág 2 = linha de corte.
// Formas: square | rounded | circle (tamanho exato + sangria por cobertura) | auto (silhueta do alfa).
// Cor correta no Corel via drawImageCmyk (CMYK cru, sem inversão). Sela X-1a. Cobra 5 (fail-closed).

export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { traceContour } from '@/lib/arte/contour';
import { rectPoints, ellipsePoints, type CutShape } from '@/lib/arte/cutShapes';
import { drawImageCmyk } from '@/lib/arte/cmykImage';

const FUNCTION_KEY = 'gerar_adesivo_contorno';
const CREDITS = 5;
const SIMPLIFY_MM = 0.3;
const HANDLE_MM = 5;      // folga de papel ao redor
const DPI = 300;
const mm = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ICC_PATH = path.join(process.cwd(), 'lib/arte/profiles/ISOcoated_v2_300_eci.icc');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s });

// cores CMYK simples p/ a linha de corte (0..1)
const CUT_RGB: Record<string, [number, number, number]> = {
  magenta: [0.925, 0, 0.55], cyan: [0, 0.68, 0.94], yellow: [1, 0.835, 0], black: [0.1, 0.1, 0.1],
};

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PDFREST_API_KEY) {
      return json({ error: 'Configuração do servidor incompleta' }, 500);
    }

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Não autenticado' }, 401);
    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401);

    const { companyId, uploadPath, spec } = await req.json();
    if (!companyId || !uploadPath || !spec) return json({ error: 'Parâmetros faltando' }, 400);

    const shape: CutShape = ['square', 'rounded', 'circle', 'auto'].includes(spec.shape) ? spec.shape : 'auto';
    const cutColorName = String(spec.cut_color ?? 'magenta');
    const [cr, cg, cb] = CUT_RGB[cutColorName] ?? CUT_RGB.magenta;
    const nome = spec.nome ? String(spec.nome).replace(/[^\w\-]+/g, '_') : 'adesivo';

    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: company } = await admin.from('companies').select('user_id').eq('id', companyId).single();
    if (!company || company.user_id !== user.id) return json({ error: 'Sem permissão' }, 403);
    if (!String(uploadPath).startsWith(`${companyId}/`)) return json({ error: 'Caminho inválido' }, 403);
    if (!fs.existsSync(ICC_PATH)) return json({ error: 'Perfil ICC ausente no servidor' }, 500);

    const { data: blob, error: dlErr } = await admin.storage.from('arte-uploads').download(uploadPath);
    if (dlErr || !blob) return json({ error: 'Arquivo não encontrado' }, 404);
    const srcBuf = Buffer.from(await blob.arrayBuffer());
    const meta = await sharp(srcBuf).metadata();
    const imgW = meta.width ?? 0, imgH = meta.height ?? 0;
    if (!imgW || !imgH) return json({ error: 'Imagem inválida' }, 422);
    const artAspect = imgW / imgH;

    const doc = await PDFDocument.create();

    // cmyk p/ a linha de corte (converte a cor escolhida via Sharp p/ casar com a arte)
    const cutCmykRaw = await sharp(Buffer.from([Math.round(cr * 255), Math.round(cg * 255), Math.round(cb * 255)]), { raw: { width: 1, height: 1, channels: 3 } })
      .toColourspace('cmyk').raw().toBuffer();
    const cutCmyk = { c: cutCmykRaw[0] / 255, m: cutCmykRaw[1] / 255, y: cutCmykRaw[2] / 255, k: cutCmykRaw[3] / 255 };

    let pageWmm: number, pageHmm: number, cutPts: [number, number][], reportW: number, reportH: number, hasAlpha = true;

    if (shape === 'auto') {
      // ── silhueta + recuo (borda branca) ──
      const artWmm = Number(spec.cut_w_mm ?? spec.art_w_mm);
      const offsetMm = clamp(Number(spec.offset_mm ?? 3), 0, 10);
      if (!(artWmm > 0)) return json({ error: 'Medida inválida' }, 400);
      const cut = await traceContour(srcBuf, { offsetMm, simplifyMm: SIMPLIFY_MM, artWmm });
      hasAlpha = cut.hasAlpha;
      const artHmm = cut.artHmm;
      const margem = offsetMm + HANDLE_MM;
      pageWmm = artWmm + 2 * margem; pageHmm = artHmm + 2 * margem;
      cutPts = cut.outPx.map(([x, y]) => [margem + x * cut.mmPerPxX, margem + (cut.th - y) * cut.mmPerPxY] as [number, number]);
      reportW = artWmm; reportH = artHmm;

const alignXpct = clamp(Number(spec.align_x_pct ?? 0), -50, 50) / 100;
const alignYpct = clamp(Number(spec.align_y_pct ?? 0), -50, 50) / 100;
// desloca o excesso de área da arte (drawW - coverW) na direção do alinhamento escolhido
const slackX = (drawW - coverW) * alignXpct;
const slackY = (drawH - coverH) * alignYpct; // nota: eixo Y do PDF é invertido (cresce pra cima)
const p1 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
const targetPx = Math.round((drawW / 25.4) * DPI);
await drawImageCmyk(doc, p1, artBuf, { x: mm(cx - drawW / 2 - slackX), y: mm(cy - drawH / 2 + slackY), width: mm(drawW), height: mm(drawH), resizeWidth: targetPx });
A lógica: drawW - coverW é a "sobra" de imagem que existe além da área visível (por causa
    } else {
      // ── forma geométrica: tamanho exato + sangria controlável ──
      const typedW = Number(spec.cut_w_mm), typedH = Number(spec.cut_h_mm);
      if (!(typedW > 0) || !(typedH > 0)) return json({ error: 'Medida inválida' }, 400);
      const sangria = clamp(Number(spec.sangria_mm ?? 3), 0, 15);
      const mode: 'externa' | 'interna' = spec.bleed_mode === 'interna' ? 'interna' : 'externa';

      // externa: a medida digitada é o CORTE; a arte cobre corte+sangria e transborda
      // interna: a medida digitada é a ARTE/papel; o corte entra 'sangria' pra dentro
      let cutWmm: number, cutHmm: number, coverW: number, coverH: number;
      if (mode === 'interna') {
        coverW = typedW; coverH = typedH;
        cutWmm = Math.max(5, typedW - 2 * sangria); cutHmm = Math.max(5, typedH - 2 * sangria);
      } else {
        cutWmm = typedW; cutHmm = typedH;
        coverW = typedW + 2 * sangria; coverH = typedH + 2 * sangria;
      }
      const radius = clamp(Number(spec.radius_mm ?? 0), 0, Math.min(cutWmm, cutHmm) / 2);

      // arte cobre coverW×coverH (cover, centrada)
const docWmm = Number(spec.doc_w_mm ?? coverW);
const docHmm = Number(spec.doc_h_mm ?? coverH);

let drawW: number, drawH: number;
if (artAspect > coverW / coverH) { drawH = coverH; drawW = coverH * artAspect; }
else { drawW = coverW; drawH = coverW / artAspect; }

// se a arte não transborda além do coverW/coverH (sem sangria nativa),
// gera a sangria expandindo com fundo branco via Sharp
const needsBleedExpansion = mode === 'externa' && Math.abs(drawW - coverW) < 0.5 && Math.abs(drawH - coverH) < 0.5;

      pageWmm = Math.max(coverW, drawW, cutWmm) + 2 * HANDLE_MM;
      pageHmm = Math.max(coverH, drawH, cutHmm) + 2 * HANDLE_MM;
      const cx = pageWmm / 2, cy = pageHmm / 2;
      cutPts = shape === 'circle' ? ellipsePoints(cutWmm, cutHmm, cx, cy) : rectPoints(cutWmm, cutHmm, cx, cy, shape === 'rounded' ? radius : 0);
      reportW = cutWmm; reportH = cutHmm;

      const p1 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
let artBuf = srcBuf;
if (needsBleedExpansion) {
  const sangriaPx = Math.round((sangria / 25.4) * DPI);
  const artPxW = Math.round((cutWmm / 25.4) * DPI);
  const artPxH = Math.round((cutHmm / 25.4) * DPI);
  const totalPxW = artPxW + 2 * sangriaPx;
  const totalPxH = artPxH + 2 * sangriaPx;
  // redimensiona a arte para o tamanho do corte e coloca num canvas maior (sangria = branco)
const resized = await sharp(srcBuf).resize(artPxW, artPxH, { fit: 'cover' }).toBuffer();
const edgeColor = await sharp(resized)
  .extract({ left: 0, top: 0, width: artPxW, height: 1 })   // faixa do topo
  .resize(1, 1)                                               // média de cor
  .raw()
  .toBuffer();
const bg = { r: edgeColor[0], g: edgeColor[1], b: edgeColor[2], alpha: 1 };

artBuf = await sharp(resized)
  .extend({ top: sangriaPx, bottom: sangriaPx, left: sangriaPx, right: sangriaPx, background: bg })
  .toBuffer();
  drawW = coverW; drawH = coverH;
}
const targetPx = Math.round((drawW / 25.4) * DPI);
await drawImageCmyk(doc, p1, artBuf, { x: mm(cx - drawW / 2), y: mm(cy - drawH / 2), width: mm(drawW), height: mm(drawH), resizeWidth: targetPx });
    }

    // boxes + página de corte
    const xs = cutPts.map((p) => p[0]), ys = cutPts.map((p) => p[1]);
    const bb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    const p1 = doc.getPage(0);
    p1.setTrimBox(mm(bb.x), mm(bb.y), mm(bb.w), mm(bb.h));

    const p2 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
    p2.setTrimBox(mm(bb.x), mm(bb.y), mm(bb.w), mm(bb.h));
    const { cmyk } = await import('pdf-lib');
    const col = cmyk(cutCmyk.c, cutCmyk.m, cutCmyk.y, cutCmyk.k);
    for (let i = 0; i < cutPts.length - 1; i++) {
      p2.drawLine({ start: { x: mm(cutPts[i][0]), y: mm(cutPts[i][1]) }, end: { x: mm(cutPts[i + 1][0]), y: mm(cutPts[i + 1][1]) }, thickness: 0.75, color: col });
    }

    const rgbPdf = await doc.save();

    // sela X-1a
    const form = new FormData();
    form.append('file', new Blob([rgbPdf], { type: 'application/pdf' }), 'adesivo.pdf');
    form.append('output_type', 'PDF/X-1a');
    form.append('output', 'adesivo-x1a');
    const pdfxRes = await fetch('https://api.pdfrest.com/pdfx', { method: 'POST', headers: { 'Api-Key': process.env.PDFREST_API_KEY!, 'Accept': 'application/json' }, body: form });
    const pdfxData = await pdfxRes.json();
    if (!pdfxRes.ok || !pdfxData.outputUrl) return json({ error: `Falha ao selar X-1a: ${pdfxData.error ?? pdfxRes.status}` }, 502);
    const x1aRes = await fetch(pdfxData.outputUrl, { headers: { 'Api-Key': process.env.PDFREST_API_KEY! } });
    if (!x1aRes.ok) return json({ error: 'Falha ao baixar X-1a' }, 502);
    const b64 = Buffer.from(await x1aRes.arrayBuffer()).toString('base64');
    const fileName = `${nome}_${Math.round(reportW)}x${Math.round(reportH)}mm_recorte_x1a.pdf`;

    // cobra por último — RPC retorna TABLE → [0]
    const { data: chargeRaw, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId, p_function_key: FUNCTION_KEY, p_credits: CREDITS,
      p_metadata: { shape, size: `${Math.round(reportW)}x${Math.round(reportH)}`, sangria_mm: spec.sangria_mm ?? null, bleed_mode: spec.bleed_mode ?? null, has_alpha: hasAlpha, pdfx_id: pdfxData.outputId },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
    if (!charge?.sucesso) return json({ error: 'Créditos insuficientes', saldo: charge?.saldo_anterior ?? 0, custo: CREDITS }, 402);

    return json({ success: true, pdf_base64: b64, file_name: fileName, saldo: charge.saldo_novo, has_alpha: hasAlpha });

  } catch (e) {
    console.error('[api/arte/adesivo]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}
