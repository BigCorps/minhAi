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
    const { company_id, audio, duration_seconds, source = 'public' } = await request.json();
    const companyId = String(company_id || '').trim();
    const audioBase64 = String(audio || '').trim();
    const durationSeconds = Math.max(1, Math.min(60, Number(duration_seconds || 1)));
    const units = Math.max(1, Math.ceil(durationSeconds / 60));

    if (!companyId || !audioBase64) {
      return NextResponse.json({ ok: false, error: 'company_id e audio são obrigatórios' }, { status: 400 });
    }
    if (audioBase64.length > 7_000_000) {
      return NextResponse.json({ ok: false, error: 'Áudio muito grande' }, { status: 413 });
    }

    const supabase = adminClient();
    const { data: company } = await supabase
      .from('companies')
      .select('id,is_active,is_public')
      .eq('id', companyId)
      .maybeSingle();

    if (!company?.id || company.is_active !== true || company.is_public !== true) {
      return NextResponse.json({ ok: false, error: 'FuncionarIA não encontrada' }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from('funcionaria_company_settings')
      .select('voice_input_enabled')
      .eq('company_id', companyId)
      .maybeSingle();

    if (settings?.voice_input_enabled !== true) {
      return NextResponse.json({ ok: false, reason: 'voice_disabled' }, { status: 403 });
    }

    const { data: allowance } = await supabase.rpc('funcionaria_check_usage', {
      p_company_id: companyId,
      p_usage_key: 'stt_minute',
      p_units: units,
    });

    if (!allowance?.ok) {
      return NextResponse.json({
        ok: false,
        reason: allowance?.reason || 'insufficient_credits',
        available_credits: allowance?.available_credits ?? 0,
        credits_required: allowance?.credits_required ?? units,
      }, { status: 402 });
    }

    // Limite de proteção contra abuso do endpoint público. O saldo continua sendo a trava principal.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from('funcionaria_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('usage_key', 'stt_minute')
      .gte('created_at', since);
    if ((count || 0) >= 30) {
      return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
    }

    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      return NextResponse.json({ ok: false, error: 'GOOGLE_API_KEY não configurada' }, { status: 500 });
    }

    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'pt-BR',
          enableAutomaticPunctuation: true,
        },
        audio: { content: audioBase64 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[FuncionarIA STT] Google:', response.status, detail.slice(0, 250));
      return NextResponse.json({ ok: false, error: 'Não foi possível entender o áudio' }, { status: 502 });
    }

    const data = await response.json();
    const transcript = String(data?.results?.[0]?.alternatives?.[0]?.transcript || '').trim();
    if (!transcript) {
      return NextResponse.json({ ok: false, reason: 'empty_transcript' }, { status: 422 });
    }

    const { data: debit } = await supabase.rpc('funcionaria_consume_usage', {
      p_company_id: companyId,
      p_usage_key: 'stt_minute',
      p_units: units,
      p_source: String(source || 'public').slice(0, 80),
      p_channel: source === 'widget' ? 'widget' : 'webapp',
      p_idempotency_key: `stt:${companyId}:${randomUUID()}`,
      p_metadata: {
        duration_seconds: durationSeconds,
        audio_base64_bytes: audioBase64.length,
        language: 'pt-BR',
      },
    });

    if (!debit?.ok) {
      console.warn('[FuncionarIA STT] transcrição concluída, mas débito não concluído:', debit);
      return NextResponse.json({ ok: false, reason: debit?.reason || 'usage_debit_failed' }, { status: debit?.reason === 'insufficient_credits' ? 402 : 500 });
    }

    return NextResponse.json({
      ok: true,
      text: transcript,
      credits_consumed: debit.credits_consumed ?? allowance?.credits_required ?? units,
      balance_after: debit.balance_after ?? null,
    });
  } catch (error: any) {
    console.error('[FuncionarIA STT] erro:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
