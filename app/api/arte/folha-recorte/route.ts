// app/api/arte/folha-recorte/route.ts
//
// Folha de Recorte: várias cópias da MESMA arte numa folha, cada uma com seu corte
// (square | rounded | circle | auto), repetindo o padrão do Adesivo com Recorte em grade.
// Pág 1 = arte CMYK repetida (drawImageCmyk, sequencial); pág 2 = N linhas de corte,
// uma por célula, cada uma como subpath/anel independente (nunca conectadas entre si —
// a faca não pode repassar no mesmo traço, e uma linha fantasma ligando adesivos vizinhos
// danificaria o material).
//
// Espaçamento entre CORTES (não entre artes) = max(espaçamento digitado, 2mm) — regra de
// segurança da faca/plotter (ver revendascan.com.br/pagina/grades-tutorial: distância mínima
// de um corte para o outro é 2mm, marca de corte não pode ficar colada uma na outra). A
// sangria é assunto interno de cada célula (quanto a arte extrapola o próprio corte) e não
// entra nessa soma — as artes/coberturas de células vizinhas PODEM se tocar ou sobrepor.
//
// Processamento sequencial simples (for loop) — sem paralelismo, sem teto de quantidade de
// células. O frontend avisa o usuário que pode demorar com grids grandes.

export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, cmyk as makeCmyk } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { traceContour } from '@/lib/arte/contour';
import { rectPoints, ellipsePoints, type CutShape } from '@/lib/arte/cutShapes';
import { drawImageCmyk } from '@/lib/arte/cmykImage';

const FUNCTION_KEY = 'gerar_folha_recorte';
const CREDITS = 10;
const SIMPLIFY_MM = 0.3;
const HANDLE_MM = 5;          // margem de papel ao redor da folha inteira
const MIN_CUT_GAP_MM = 2;     // distância mínima entre linhas de corte (segurança da faca)
const DPI = 300;
const PAGE_MAX_W_CM = 200;
const PAGE_MAX_H_CM = 120;

const mm = (v: number) => (v * 72) / 25.4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ICC_PATH = path.join(process.cwd(), 'lib/arte/profiles/ISOcoated_v2_300_eci.icc');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s });

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

    const shape: CutShape = ['square', 'rounded', 'circle', 'auto'].includes(spec.shape) ? spec.shape : 'square';
    const cutColorName = String(spec.cut_color ?? 'magenta');
    const [cr, cg, cb] = CUT_RGB[cutColorName] ?? CUT_RGB.magenta;
    const nome = spec.nome ? String(spec.nome).replace(/[^\w\-]+/g, '_') : 'folha-recorte';

    // página da folha: A4 fixo, ou personalizada (mesmo limite do Duplicar)
    const pageMode: 'a4' | 'custom_page' = spec.pageMode === 'custom_page' ? 'custom_page' : 'a4';
    let pageWmmFolha: number, pageHmmFolha: number;
    if (pageMode === 'custom_page') {
      const w = Number(spec.pageWidthCm), h = Number(spec.pageHeightCm);
      if (!(w > 0) || !(h > 0) || w > PAGE_MAX_W_CM || h > PAGE_MAX_H_CM) {
        return json({ error: `Página personalizada deve ter no máximo ${PAGE_MAX_W_CM}×${PAGE_MAX_H_CM}cm.` }, 400);
      }
      pageWmmFolha = w * 10; pageHmmFolha = h * 10;
    } else {
      pageWmmFolha = 210; pageHmmFolha = 297;
    }

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

    // cmyk da linha de corte
    const cutCmykRaw = await sharp(Buffer.from([Math.round(cr * 255), Math.round(cg * 255), Math.round(cb * 255)]), { raw: { width: 1, height: 1, channels: 3 } })
      .toColourspace('cmyk').raw().toBuffer();
    const cutCmyk = { c: cutCmykRaw[0] / 255, m: cutCmykRaw[1] / 255, y: cutCmykRaw[2] / 255, k: cutCmykRaw[3] / 255 };

    // ── 1) Resolve as medidas de UMA célula (corte + cobertura), igual ao Adesivo ──
    // anelLocal: pontos do corte de UMA célula, já centrados em (0,0) — somamos o
    // centro de cada posição da grade na hora de desenhar.
    let cutWmm: number, cutHmm: number, drawW: number, drawH: number, ringLocal: [number, number][], hasAlpha = true;

    if (shape === 'auto') {
      const artWmm = Number(spec.cut_w_mm ?? spec.art_w_mm);
      const offsetMm = clamp(Number(spec.offset_mm ?? 3), 0, 10);
      if (!(artWmm > 0)) return json({ error: 'Medida inválida' }, 400);
      const cut = await traceContour(srcBuf, { offsetMm, simplifyMm: SIMPLIFY_MM, artWmm });
      hasAlpha = cut.hasAlpha;
      const artHmm = cut.artHmm;
      drawW = artWmm; drawH = artHmm;
      // IMPORTANTE: a arte e o corte precisam manter a MESMA relação espacial relativa que
      // tinham no Adesivo original (ambos ancorados na mesma origem absoluta — a silhueta
      // pode ser assimétrica dentro do retângulo da imagem, ex: logo encostado à esquerda).
      // Por isso NÃO centralizamos o anel pelo seu próprio bounding box — em vez disso,
      // ancoramos ambos (arte e corte) na origem (0,0) = canto superior-esquerdo da arte,
      // exatamente como margem+x/margem+y faziam no Adesivo. O centro de célula (cx,cy)
      // vira o centro do RETÂNGULO DA ARTE (drawW×drawH), não do contorno.
      const ringMm = cut.outPx.map(([x, y]: [number, number]) => [x * cut.mmPerPxX - artWmm / 2, (cut.th - y) * cut.mmPerPxY - artHmm / 2] as [number, number]);
      const xs = ringMm.map((p: [number, number]) => p[0]), ys = ringMm.map((p: [number, number]) => p[1]);
      cutWmm = Math.max(...xs) - Math.min(...xs);
      cutHmm = Math.max(...ys) - Math.min(...ys);
      ringLocal = ringMm; // já relativo ao centro do retângulo da arte (0,0) = centro de drawW×drawH
    } else {
      const typedW = Number(spec.cut_w_mm), typedH = Number(spec.cut_h_mm);
      if (!(typedW > 0) || !(typedH > 0)) return json({ error: 'Medida inválida' }, 400);
      // Teto de sangria menor que no Adesivo individual (15mm): aqui há células vizinhas
      // na mesma folha, e sangria grande faz a cobertura de uma sobrepor a da vizinha em
      // excesso. 8mm mantém a sobreposição dentro de um limite razoável.
      const SANGRIA_MAX_MM = 8;
      const sangria = clamp(Number(spec.sangria_mm ?? 3), 0, SANGRIA_MAX_MM);
      const mode: 'externa' | 'interna' = spec.bleed_mode === 'interna' ? 'interna' : 'externa';

      let coverW: number, coverH: number;
      if (mode === 'interna') {
        coverW = typedW; coverH = typedH;
        cutWmm = Math.max(5, typedW - 2 * sangria); cutHmm = Math.max(5, typedH - 2 * sangria);
      } else {
        cutWmm = typedW; cutHmm = typedH;
        coverW = typedW + 2 * sangria; coverH = typedH + 2 * sangria;
      }
      const radius = clamp(Number(spec.radius_mm ?? 0), 0, Math.min(cutWmm, cutHmm) / 2);

      if (artAspect > coverW / coverH) { drawH = coverH; drawW = coverH * artAspect; }
      else { drawW = coverW; drawH = coverW / artAspect; }

      ringLocal = shape === 'circle' ? ellipsePoints(cutWmm, cutHmm, 0, 0) : rectPoints(cutWmm, cutHmm, 0, 0, shape === 'rounded' ? radius : 0);
    }

    // drawW/drawH = tamanho da arte (cobertura) de UMA célula; cutWmm/cutHmm = tamanho do corte
    // a célula "ocupada" no grid é o MAIOR entre arte e corte (a arte pode ser maior que o
    // corte por causa da sangria externa) — usamos isso só para a metragem de papel necessária,
    // já que artes vizinhas podem se tocar/sobrepor (você confirmou que é aceitável).
    const cellWmm = Math.max(drawW, cutWmm);
    const cellHmm = Math.max(drawH, cutHmm);

    // ── 2) Calcula o grid: espaçamento ENTRE CORTES = max(digitado, 2mm) ──
    const spacingDigitadoMm = Number(spec.spacing_mm ?? 2);
    const cutGapMm = Math.max(spacingDigitadoMm, MIN_CUT_GAP_MM);

    const availW = pageWmmFolha - 2 * HANDLE_MM;
    const availH = pageHmmFolha - 2 * HANDLE_MM;
    // a distância centro-a-centro entre células = tamanho do corte + o gap mínimo entre cortes
    const stepW = cutWmm + cutGapMm;
    const stepH = cutHmm + cutGapMm;
    const perRow = Math.max(0, Math.floor((availW - cellWmm) / stepW) + 1);
    const perColumn = Math.max(0, Math.floor((availH - cellHmm) / stepH) + 1);
    const totalCells = perRow * perColumn;
    if (totalCells === 0) {
      return json({ error: 'O tamanho do corte é grande demais para a página definida.' }, 400);
    }

    // ── 3) Centros de cada célula, com a grade centralizada na folha ──
    const gridWmm = (perRow - 1) * stepW + cellWmm;
    const gridHmm = (perColumn - 1) * stepH + cellHmm;
    const startX = (pageWmmFolha - gridWmm) / 2 + cellWmm / 2;
    const startY = (pageHmmFolha - gridHmm) / 2 + cellHmm / 2;
    const centers: { cx: number; cy: number }[] = [];
    for (let row = 0; row < perColumn; row++) {
      for (let col = 0; col < perRow; col++) {
        centers.push({ cx: startX + col * stepW, cy: startY + row * stepH });
      }
    }

    // ── 4) Monta o PDF: pág 1 = arte repetida; pág 2 = corte repetido ──
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([mm(pageWmmFolha), mm(pageHmmFolha)]);
    const targetPx = Math.round((drawW / 25.4) * DPI);

    // sequencial — sem paralelismo, conforme decidido (overhead por célula é pequeno;
    // chamadas concorrentes no mesmo doc/página trariam risco de ordem não-determinística)
    for (const { cx, cy } of centers) {
      await drawImageCmyk(doc, p1, srcBuf, {
        x: mm(cx - drawW / 2), y: mm(cy - drawH / 2), width: mm(drawW), height: mm(drawH), resizeWidth: targetPx,
      });
    }
    p1.setTrimBox(0, 0, mm(pageWmmFolha), mm(pageHmmFolha));

    const p2 = doc.addPage([mm(pageWmmFolha), mm(pageHmmFolha)]);
    p2.setTrimBox(0, 0, mm(pageWmmFolha), mm(pageHmmFolha));
    const col = makeCmyk(cutCmyk.c, cutCmyk.m, cutCmyk.y, cutCmyk.k);
    // cada célula desenha o SEU PRÓPRIO anel fechado — nunca conecta um anel ao próximo,
    // pois isso criaria uma linha fantasma entre adesivos vizinhos que danifica o material
    // no corte (a faca passaria por onde não deveria).
    for (const { cx, cy } of centers) {
      const ring = ringLocal.map(([dx, dy]) => [cx + dx, cy + dy] as [number, number]);
      for (let i = 0; i < ring.length - 1; i++) {
        p2.drawLine({
          start: { x: mm(ring[i][0]), y: mm(ring[i][1]) },
          end: { x: mm(ring[i + 1][0]), y: mm(ring[i + 1][1]) },
          thickness: 0.75, color: col,
        });
      }
    }

    const rgbPdf = await doc.save();

    // sela X-1a
    const form = new FormData();
    form.append('file', new Blob([rgbPdf], { type: 'application/pdf' }), 'folha-recorte.pdf');
    form.append('output_type', 'PDF/X-1a');
    form.append('output', 'folha-recorte-x1a');
    const pdfxRes = await fetch('https://api.pdfrest.com/pdfx', { method: 'POST', headers: { 'Api-Key': process.env.PDFREST_API_KEY!, 'Accept': 'application/json' }, body: form });
    const pdfxData = await pdfxRes.json();
    if (!pdfxRes.ok || !pdfxData.outputUrl) return json({ error: `Falha ao selar X-1a: ${pdfxData.error ?? pdfxRes.status}` }, 502);
    const x1aRes = await fetch(pdfxData.outputUrl, { headers: { 'Api-Key': process.env.PDFREST_API_KEY! } });
    if (!x1aRes.ok) return json({ error: 'Falha ao baixar X-1a' }, 502);
    const b64 = Buffer.from(await x1aRes.arrayBuffer()).toString('base64');
    const pageTag = pageMode === 'custom_page' ? `${(pageWmmFolha / 10).toFixed(0)}x${(pageHmmFolha / 10).toFixed(0)}cm` : 'a4';
    const fileName = `${nome}_${Math.round(cutWmm)}x${Math.round(cutHmm)}mm_${perRow}x${perColumn}_${pageTag}_x1a.pdf`;

    // cobra por último — RPC retorna TABLE → [0]
    const { data: chargeRaw, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId, p_function_key: FUNCTION_KEY, p_credits: CREDITS,
      p_metadata: {
        shape, size: `${Math.round(cutWmm)}x${Math.round(cutHmm)}`, perRow, perColumn, totalCells,
        sangria_mm: spec.sangria_mm ?? null, bleed_mode: spec.bleed_mode ?? null,
        cut_gap_mm: cutGapMm, page_mode: pageMode, has_alpha: hasAlpha, pdfx_id: pdfxData.outputId,
      },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
    if (!charge?.sucesso) return json({ error: 'Créditos insuficientes', saldo: charge?.saldo_anterior ?? 0, custo: CREDITS }, 402);

    return json({
      success: true, pdf_base64: b64, file_name: fileName, saldo: charge.saldo_novo, has_alpha: hasAlpha,
      layout: { perRow, perColumn, totalCells, cutWmm, cutHmm, cutGapMm },
    });

  } catch (e) {
    console.error('[api/arte/folha-recorte]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}
