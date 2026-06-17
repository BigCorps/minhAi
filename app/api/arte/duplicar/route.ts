import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// ── Constantes ────────────────────────────────────────────────────────────
const FUNCTION_KEY  = 'duplicar_imagem';
const CREDITS       = 2;
const MARGIN_CM     = 1;   // margem de cada lado (cm)
const A4_W_CM       = 21;
const A4_H_CM       = 29.7;
const CM_TO_PT      = 28.3465;
const CM_TO_PX_72  = 72 / 2.54; // pontos por cm a 72dpi (para PDF)

// ── Helpers ───────────────────────────────────────────────────────────────
const cmToPt = (cm: number) => cm * CM_TO_PT;

function calcLayout(
  imgW: number, imgH: number,
  maxSizeCm: number, spacingMm: number,
  preset: string, manualCols?: number, manualRows?: number
) {
  const aspect      = imgW / imgH;
  const finalH      = maxSizeCm;
  const finalW      = maxSizeCm * aspect;
  const spacingCm   = spacingMm / 10;
  const availableW  = A4_W_CM  - 2 * MARGIN_CM;
  const availableH  = A4_H_CM  - 2 * MARGIN_CM;

  let perRow: number, perColumn: number;
  if (preset === 'custom' && manualCols && manualRows) {
    const maxCols = Math.floor((availableW + spacingCm) / (finalW + spacingCm));
    const maxRows = Math.floor((availableH + spacingCm) / (finalH + spacingCm));
    perRow    = Math.min(manualCols, maxCols);
    perColumn = Math.min(manualRows, maxRows);
  } else {
    perRow    = Math.floor((availableW + spacingCm) / (finalW + spacingCm));
    perColumn = Math.floor((availableH + spacingCm) / (finalH + spacingCm));
  }
  return { finalW, finalH, perRow, perColumn, spacingCm, totalImages: perRow * perColumn };
}

// ── Handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Auth — token explícito obrigatório no servidor
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    // 2. Lê body
    const { companyId, uploadPath, spec } = await req.json();
    const { maxSize, spacing, preset, manualCols, manualRows } = spec ?? {};

    if (!companyId || !uploadPath || !maxSize || spacing == null || !preset) {
      return NextResponse.json({ error: 'Parâmetros incompletos.' }, { status: 400 });
    }

    // 3. Confere posse: usuário é dono da empresa E uploadPath começa com companyId/
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: company } = await serviceClient
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!company) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    if (!uploadPath.startsWith(`${companyId}/`)) {
      return NextResponse.json({ error: 'Caminho inválido.' }, { status: 403 });
    }

    // 4. Baixa a alta com service role (navegador nunca recebe a alta)
    const { data: fileData, error: dlError } = await serviceClient
      .storage
      .from('arte-uploads')
      .download(uploadPath);

    if (dlError || !fileData) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem.' }, { status: 500 });
    }

    const imgBuffer = Buffer.from(await fileData.arrayBuffer());

    // 5. Processa com Sharp: obtém metadados + converte para JPEG RGB puro
    //    (O PDF gerado aqui é para impressão de prova/operacional, não é arquivo de gráfica
    //     com perfil CMYK — isso é responsabilidade da função Arte Final. Este PDF é um
    //     documento de impressão doméstica/plotagem em A4.)
    const meta = await sharp(imgBuffer).metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: 'Não foi possível ler as dimensões da imagem.' }, { status: 400 });
    }

    // flatten remove alpha antes de qualquer processamento
    const jpegBuffer = await sharp(imgBuffer)
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // 6. Calcula layout
    const layout = calcLayout(meta.width, meta.height, maxSize, spacing, preset, manualCols, manualRows);
    if (layout.totalImages === 0) {
      return NextResponse.json({ error: 'Imagem grande demais para o A4 com este tamanho.' }, { status: 400 });
    }

    // 7. Monta o PDF com pdf-lib
    const pdfDoc  = await PDFDocument.create();
    const page    = pdfDoc.addPage([cmToPt(A4_W_CM), cmToPt(A4_H_CM)]);
    const pdfImg  = await pdfDoc.embedJpg(jpegBuffer);
    const marginPt  = cmToPt(MARGIN_CM);
    const spacingPt = cmToPt(layout.spacingCm);
    const cellW     = cmToPt(layout.finalW);
    const cellH     = cmToPt(layout.finalH);
    const pageH     = cmToPt(A4_H_CM);

    for (let row = 0; row < layout.perColumn; row++) {
      for (let col = 0; col < layout.perRow; col++) {
        const x = marginPt + col * (cellW + spacingPt);
        // pdf-lib: y=0 é a base da página
        const y = pageH - marginPt - (row + 1) * cellH - row * spacingPt;
        page.drawImage(pdfImg, { x, y, width: cellW, height: cellH });
      }
    }

    const pdfBytes = await pdfDoc.save();

    // 8. Converte para base64 ANTES de cobrar (nada que possa falhar depois do gate)
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const fileName  = `duplicar-${layout.perRow}x${layout.perColumn}-${Date.now()}.pdf`;

    // 9. Cobra por último — fail-closed
    const { data: cobrancaRaw } = await serviceClient.rpc('cobrar_credito_se_suficiente', {
      p_company_id:  companyId,
      p_function_key: FUNCTION_KEY,
      p_credits:     CREDITS,
      p_metadata:    { preset, perRow: layout.perRow, perColumn: layout.perColumn, totalImages: layout.totalImages },
    });
    const cobranca = Array.isArray(cobrancaRaw) ? cobrancaRaw[0] : cobrancaRaw;

    if (!cobranca?.sucesso) {
      return NextResponse.json({ error: 'Créditos insuficientes.', saldo: cobranca?.saldo_anterior ?? 0 }, { status: 402 });
    }

    // 10. Entrega
    return NextResponse.json({
      success:    true,
      pdf_base64: pdfBase64,
      file_name:  fileName,
      saldo:      cobranca.saldo_novo,
      layout:     { perRow: layout.perRow, perColumn: layout.perColumn, totalImages: layout.totalImages },
    });

  } catch (err: any) {
    console.error('[duplicar] erro interno:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro interno.' }, { status: 500 });
  }
}
