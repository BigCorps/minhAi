// app/api/arte/adesivo/route.ts
//
// Adesivo com recorte (die-cut). 2 páginas:
//   pág 1 = arte CMYK (ISO Coated v2) achatada em branco;
//   pág 2 = linha de corte vetorial (cor CMYK escolhida), traçada da silhueta (alfa) + recuo.
// Sela PDF/X-1a, cobra por último (fail-closed). Sem verso.

export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, cmyk } from 'pdf-lib';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { traceContour } from '@/lib/arte/contour';

const FUNCTION_KEY = 'gerar_adesivo_contorno';
const CREDITS = 8;
const SIMPLIFY_MM = 0.3;
const DPI = 300;
const mm = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ICC_PATH = path.join(process.cwd(), 'lib/arte/profiles/ISOcoated_v2_300_eci.icc');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s });

const CUT_COLORS: Record<string, ReturnType<typeof cmyk>> = {
  magenta: cmyk(0, 1, 0, 0),
  cyan: cmyk(1, 0, 0, 0),
  yellow: cmyk(0, 0, 1, 0),
  black: cmyk(0, 0, 0, 1),
};

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

    // 2. Body
    const { companyId, uploadPath, spec } = await req.json();
    if (!companyId || !uploadPath || !spec) return json({ error: 'Parâmetros faltando' }, 400);
    const artWmm = Number(spec.art_w_mm);
    const offsetMm = clamp(Number(spec.offset_mm ?? 3), 0, 10);
    const cutColor = CUT_COLORS[String(spec.cut_color ?? 'magenta')] ?? CUT_COLORS.magenta;
    const nome = spec.nome ? String(spec.nome).replace(/[^\w\-]+/g, '_') : 'adesivo';
    if (!(artWmm > 0)) return json({ error: 'Medida inválida' }, 400);

    // 3. Posse
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: company } = await admin.from('companies').select('user_id').eq('id', companyId).single();
    if (!company || company.user_id !== user.id) return json({ error: 'Sem permissão' }, 403);
    if (!String(uploadPath).startsWith(`${companyId}/`)) return json({ error: 'Caminho inválido' }, 403);

    if (!fs.existsSync(ICC_PATH)) return json({ error: 'Perfil ICC ausente no servidor' }, 500);

    // 4. Baixa a alta
    const { data: blob, error: dlErr } = await admin.storage.from('arte-uploads').download(uploadPath);
    if (dlErr || !blob) return json({ error: 'Arquivo não encontrado' }, 404);
    const srcBuf = Buffer.from(await blob.arrayBuffer());

    // 5. Traça o corte (silhueta + recuo). Sem alfa → retângulo.
    const cut = await traceContour(srcBuf, { offsetMm, simplifyMm: SIMPLIFY_MM, artWmm });
    const artHmm = cut.artHmm;

    // página = arte + margem (sempre acomoda o recuo)
    const margem = offsetMm + 5;
    const pageWmm = artWmm + 2 * margem;
    const pageHmm = artHmm + 2 * margem;

    // pontos do corte em mm (arte posicionada em (margem, margem); y p/ cima no PDF)
    const ptsMm = cut.outPx.map(([x, y]) => [
      margem + x * cut.mmPerPxX,
      margem + (cut.th - y) * cut.mmPerPxY,
    ] as [number, number]);
    const xs = ptsMm.map((p) => p[0]), ys = ptsMm.map((p) => p[1]);
    const bb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };

    // 6. Arte em CMYK (achata em branco — área do recuo vira borda branca do adesivo)
    const targetPx = Math.round((artWmm / 25.4) * DPI);
    const cmykBuf = await sharp(srcBuf)
      .resize({ width: targetPx, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .toColourspace('cmyk')
      .withMetadata({ icc: ICC_PATH })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // 7. PDF: pág 1 arte, pág 2 corte
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(cmykBuf);
    const setBoxes = (pg: any) => {
      pg.setMediaBox(0, 0, mm(pageWmm), mm(pageHmm));
      pg.setTrimBox(mm(bb.x), mm(bb.y), mm(bb.w), mm(bb.h));
      pg.setBleedBox(mm(Math.max(0, bb.x - 2)), mm(Math.max(0, bb.y - 2)), mm(bb.w + 4), mm(bb.h + 4));
    };

    const p1 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
    setBoxes(p1);
    p1.drawImage(img, { x: mm(margem), y: mm(margem), width: mm(artWmm), height: mm(artHmm) });

    const p2 = doc.addPage([mm(pageWmm), mm(pageHmm)]);
    setBoxes(p2);
    for (let i = 0; i < ptsMm.length - 1; i++) {
      p2.drawLine({
        start: { x: mm(ptsMm[i][0]), y: mm(ptsMm[i][1]) },
        end: { x: mm(ptsMm[i + 1][0]), y: mm(ptsMm[i + 1][1]) },
        thickness: 0.75, color: cutColor,
      });
    }

    const rgbPdf = await doc.save();

    // 8. Sela X-1a
    const form = new FormData();
    form.append('file', new Blob([rgbPdf], { type: 'application/pdf' }), 'adesivo.pdf');
    form.append('output_type', 'PDF/X-1a');
    form.append('output', 'adesivo-x1a');
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

    // 9. base64 ANTES de cobrar
    const b64 = x1aBuf.toString('base64');
    const fileName = `${nome}_${Math.round(artWmm)}x${Math.round(artHmm)}mm_recorte_x1a.pdf`;

    // 10. Cobra por último — RPC retorna TABLE → pegar [0]
    const { data: chargeRaw, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: FUNCTION_KEY,
      p_credits: CREDITS,
      p_metadata: { art: `${Math.round(artWmm)}x${Math.round(artHmm)}`, offset: offsetMm, has_alpha: cut.hasAlpha, pdfx_id: pdfxData.outputId },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
    if (!charge?.sucesso) return json({ error: 'Créditos insuficientes', saldo: charge?.saldo_anterior ?? 0, custo: CREDITS }, 402);

    return json({ success: true, pdf_base64: b64, file_name: fileName, saldo: charge.saldo_novo, has_alpha: cut.hasAlpha });

  } catch (e) {
    console.error('[api/arte/adesivo]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}