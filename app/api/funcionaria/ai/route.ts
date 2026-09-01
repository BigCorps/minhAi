import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const { company_id, message, source = 'public' } = await request.json();
    const companyId = String(company_id || '').trim();
    const userMessage = String(message || '').trim();

    if (!companyId || !userMessage) {
      return NextResponse.json({ ok: false, error: 'company_id e message são obrigatórios' }, { status: 400 });
    }
    if (userMessage.length > 1500) {
      return NextResponse.json({ ok: false, error: 'Mensagem muito longa' }, { status: 400 });
    }

    const supabase = adminClient();
    const { data: company } = await supabase
      .from('companies')
      .select('id,name,slug,is_active,is_public,system_prompt,brand_description,business_hours,business_address,website,whatsapp_number')
      .eq('id', companyId)
      .maybeSingle();

    if (!company?.id || company.is_active !== true || company.is_public !== true) {
      return NextResponse.json({ ok: false, error: 'FuncionarIA não encontrada' }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from('funcionaria_company_settings')
      .select('ai_enabled')
      .eq('company_id', companyId)
      .maybeSingle();

    if (settings?.ai_enabled !== true) {
      return NextResponse.json({ ok: false, reason: 'ai_disabled' }, { status: 403 });
    }

    const { data: allowance } = await supabase.rpc('funcionaria_check_usage', {
      p_company_id: companyId,
      p_usage_key: 'ai_generation',
      p_units: 1,
    });

    if (!allowance?.ok) {
      return NextResponse.json({
        ok: false,
        reason: allowance?.reason || 'insufficient_credits',
        available_credits: allowance?.available_credits ?? 0,
        credits_required: allowance?.credits_required ?? 2,
      }, { status: 402 });
    }

    // Endpoint público: limita rajadas por empresa além da trava financeira.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from('funcionaria_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('usage_key', 'ai_generation')
      .gte('created_at', since);
    if ((count || 0) >= 30) {
      return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY não configurada' }, { status: 500 });
    }

    const systemPrompt = [
      `Você é a FuncionarIA da empresa "${company.name}".`,
      'Responda em português brasileiro, de forma curta, clara e útil.',
      'Você é a última camada de fallback: não invente preços, políticas, prazos, estoque ou condições que não estejam no contexto.',
      'Restrinja-se ao atendimento da empresa, compra, pagamento, agendamento e habilidades do estabelecimento.',
      'Se não houver informação suficiente, diga que não encontrou a informação e ofereça chamar um responsável.',
      company.brand_description ? `Sobre a empresa: ${company.brand_description}` : '',
      company.business_hours ? `Horários: ${company.business_hours}` : '',
      company.business_address ? `Endereço: ${company.business_address}` : '',
      company.system_prompt ? `Contexto adicional da empresa: ${company.system_prompt}` : '',
    ].filter(Boolean).join('\n');

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.25,
        max_tokens: 350,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      console.error('[FuncionarIA AI] OpenAI:', aiRes.status, detail.slice(0, 250));
      return NextResponse.json({ ok: false, error: 'Falha temporária na IA' }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const answer = String(aiData?.choices?.[0]?.message?.content || '').trim();
    if (!answer) {
      return NextResponse.json({ ok: false, error: 'Resposta vazia' }, { status: 502 });
    }

    const idempotencyKey = `ai:${companyId}:${randomUUID()}`;
    const { data: debit } = await supabase.rpc('funcionaria_consume_usage', {
      p_company_id: companyId,
      p_usage_key: 'ai_generation',
      p_units: 1,
      p_source: String(source || 'public').slice(0, 80),
      p_channel: source === 'widget' ? 'widget' : 'webapp',
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        model: 'gpt-4o-mini',
        prompt_tokens: aiData?.usage?.prompt_tokens ?? null,
        completion_tokens: aiData?.usage?.completion_tokens ?? null,
        total_tokens: aiData?.usage?.total_tokens ?? null,
      },
    });

    if (!debit?.ok) {
      console.warn('[FuncionarIA AI] resposta gerada, mas débito não concluído:', debit);
      return NextResponse.json({ ok: false, reason: debit?.reason || 'usage_debit_failed' }, { status: debit?.reason === 'insufficient_credits' ? 402 : 500 });
    }

    return NextResponse.json({
      ok: true,
      answer,
      credits_consumed: debit?.credits_consumed ?? allowance?.credits_required ?? 0,
      balance_after: debit?.balance_after ?? null,
    });
  } catch (error: any) {
    console.error('[FuncionarIA AI] erro:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
