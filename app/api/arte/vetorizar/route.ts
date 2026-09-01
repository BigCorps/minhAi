// app/api/arte/vetorizar/route.ts
//
// FUNÇÃO NOVA, fora do pipeline do gerar_arte_final. A vetorização
// (potrace-plus) e o PDF (jsPDF + svg2pdf.js, RGB simples) já aconteceram
// inteiros no navegador — decisão confirmada: sem CMYK/ICC, sem selagem
// PDF/X-1a. Não há "alta" pra baixar do bucket nem arquivo pra montar aqui.
//
// Esta rota só existe pra cumprir "não cobra no client": autentica, confere
// posse da empresa e cobra 1 crédito de forma atômica e fail-closed. Se a
// cobrança falhar, retorna 402 e o client não libera os downloads.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FUNCTION_KEY = 'vetorizar_imagem';
const CREDITS = 1;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s });

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Configuração do servidor incompleta' }, 500);
    }

    // 1. Auth pelo token explícito — getUser() sem argumento não lê o header no edge/Node.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Não autenticado' }, 401);
    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401);

    const { companyId, mode, width, height } = await req.json();
    if (!companyId) return json({ error: 'Parâmetros faltando' }, 400);

    // 2. Confere posse — nunca confia no companyId cru do body.
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: company } = await admin.from('companies').select('user_id').eq('id', companyId).single();
    if (!company || company.user_id !== user.id) return json({ error: 'Sem permissão' }, 403);

    // 3. Cobra — fail-closed, uma vez, por último (não há nada a gerar antes;
    // o SVG/PDF já está na memória do navegador).
    const { data: charge, error: chErr } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: FUNCTION_KEY,
      p_credits: CREDITS,
      p_metadata: { mode: mode ?? null, width: width ?? null, height: height ?? null },
    });
    if (chErr) return json({ error: 'Falha na cobrança' }, 500);
    const row = Array.isArray(charge) ? charge[0] : charge;
    if (!row?.sucesso) return json({ error: 'Créditos insuficientes', saldo: row?.saldo_anterior ?? 0, custo: CREDITS }, 402);

    // 4. Entrega — só a confirmação.
    return json({ success: true, saldo: row.saldo_novo });

  } catch (e) {
    console.error('[api/arte/vetorizar]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}
