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
      cutPts = cut.outPx.map(([x, y]: [number, number]) => [margem + x * cut.mmPerPxX, margem + (cut.th - y) * cut.mmPerPxY] as [number, number]);
      reportW = artWmm; reportH = artHmm;

      // Modo automático: a arte é desenhada no tamanho exato artWmm×artHmm — não há
      // "cobertura maior que a arte" aqui (isso só existe nas formas geométricas, onde a
      // sangria expande a cobertura). Por isso não há ajuste fino de alinhamento neste modo.
      const p1 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
      const targetPx = Math.round((artWmm / 25.4) * DPI);
      await drawImageCmyk(doc, p1, srcBuf, { x: mm(margem), y: mm(margem), width: mm(artWmm), height: mm(artHmm), resizeWidth: targetPx });
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

      // ── Modelo final (mesma fórmula usada no preview do frontend) ──
      // O CANVAS final (o que vai pro PDF) é SEMPRE coverW×coverH — fixo, nunca varia com
      // zoom ou alinhamento. Zoom controla o tamanho da imagem DENTRO desse canvas (>100%
      // corta as bordas que excedem; <100% deixa espaço vazio). O alinhamento desloca a
      // imagem livremente dentro do canvas, SEM TRAVA — pode até deixar uma faixa maior
      // exposta de um lado (preenchida pela cor de fundo) se o usuário levar ao extremo.
      let drawW: number, drawH: number;
      if (artAspect > coverW / coverH) { drawH = coverH; drawW = coverH * artAspect; }
      else { drawW = coverW; drawH = coverW / artAspect; }

      const zoomPct = clamp(Number(spec.zoom_pct ?? 100), 50, 300) / 100;
      drawW *= zoomPct; drawH *= zoomPct;

      const alignXfrac = clamp(Number(spec.align_x_pct ?? 0), -50, 50) / 50; // -1..+1
      const alignYfrac = clamp(Number(spec.align_y_pct ?? 0), -50, 50) / 50; // -1..+1
      const offsetX = (coverW / 2) * alignXfrac;
      const offsetY = (coverH / 2) * alignYfrac;

      pageWmm = Math.max(coverW, cutWmm) + 2 * HANDLE_MM;
      pageHmm = Math.max(coverH, cutHmm) + 2 * HANDLE_MM;
      const cx = pageWmm / 2, cy = pageHmm / 2;
      cutPts = shape === 'circle' ? ellipsePoints(cutWmm, cutHmm, cx, cy) : rectPoints(cutWmm, cutHmm, cx, cy, shape === 'rounded' ? radius : 0);
      reportW = cutWmm; reportH = cutHmm;

      const p1 = doc.addPage([mm(pageWmm), mm(pageHmm)]);

      // canvas final em px, no DPI alvo
      const canvasPxW = Math.round((coverW / 25.4) * DPI) || 1;
      const canvasPxH = Math.round((coverH / 25.4) * DPI) || 1;
      const imgPxW = Math.round((drawW / 25.4) * DPI) || 1;
      const imgPxH = Math.round((drawH / 25.4) * DPI) || 1;
      // posição (canto superior-esquerdo) da imagem dentro do canvas, em px — pode ser
      // negativa ou exceder o canvas; sharp().composite() corta automaticamente o que sobra.
      const imgLeftPx = Math.round((canvasPxW - imgPxW) / 2 + (offsetX / 25.4) * DPI);
      const imgTopPx = Math.round((canvasPxH - imgPxH) / 2 - (offsetY / 25.4) * DPI); // Y do PDF cresce p/ cima

      // cor de fundo: média dos 4 CANTOS da imagem ORIGINAL (mais robusto que 1 faixa —
      // evita capturar elementos do desenho central, como um anel colorido perto da borda)
      const cornerSize = Math.max(1, Math.min(Math.round(Math.min(imgW, imgH) * 0.03), imgW, imgH));
      async function cornerAvg(left: number, top: number) {
        const px = await sharp(srcBuf).extract({ left, top, width: cornerSize, height: cornerSize }).resize(1, 1).raw().toBuffer();
        return [px[0], px[1], px[2]];
      }
      const corners = await Promise.all([
        cornerAvg(0, 0),
        cornerAvg(Math.max(0, imgW - cornerSize), 0),
        cornerAvg(0, Math.max(0, imgH - cornerSize)),
        cornerAvg(Math.max(0, imgW - cornerSize), Math.max(0, imgH - cornerSize)),
      ]);
      const bg = {
        r: Math.round(corners.reduce((s, c) => s + c[0], 0) / 4),
        g: Math.round(corners.reduce((s, c) => s + c[1], 0) / 4),
        b: Math.round(corners.reduce((s, c) => s + c[2], 0) / 4),
      };

      // monta o canvas final: fundo sólido (cor dos cantos) + imagem composta na posição.
      // channels:3 (sem alpha) é compatível com o flatten() que drawImageCmyk já faz internamente.
      // .flatten() aqui também remove alfa da imagem de origem antes de compor, evitando
      // mismatch de canais entre o canvas (3 canais) e a imagem (que pode ter RGBA nativo).
      const resizedImg = await sharp(srcBuf).resize(imgPxW, imgPxH, { fit: 'cover' }).flatten({ background: bg }).toBuffer();
      const artBuf = await sharp({
        create: { width: canvasPxW, height: canvasPxH, channels: 3, background: bg },
      })
        .composite([{ input: resizedImg, left: imgLeftPx, top: imgTopPx }])
        .toBuffer();

      await drawImageCmyk(doc, p1, artBuf, {
        x: mm(cx - coverW / 2), y: mm(cy - coverH / 2),
        width: mm(coverW), height: mm(coverH), resizeWidth: canvasPxW,
      });
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
