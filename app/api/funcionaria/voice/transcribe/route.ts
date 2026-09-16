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

    // Limite de proteção contra abuso do endpoint público, antes de qualquer reserva/custo.
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

    // PHASE5_STT_PREPAID_RESERVATION — reserva crédito ANTES da chamada Google.
    const idempotencyKey = `stt:${companyId}:${randomUUID()}`;
    const { data: reservation, error: reservationError } = await supabase.rpc('funcionaria_consume_usage', {
      p_company_id: companyId,
      p_usage_key: 'stt_minute',
      p_units: units,
      p_source: String(source || 'public').slice(0, 80),
      p_channel: source === 'widget' ? 'widget' : 'webapp',
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        phase: '5',
        billing_mode: 'prepaid_reservation',
        duration_seconds: durationSeconds,
        audio_base64_bytes: audioBase64.length,
        language: 'pt-BR',
        provider: 'Google Speech-to-Text',
      },
    });

    if (reservationError || !reservation?.ok) {
      const reason = reservation?.reason || 'usage_reservation_failed';
      return NextResponse.json({
        ok: false,
        reason,
        available_credits: reservation?.available_credits ?? 0,
        credits_required: reservation?.credits_required ?? units,
      }, { status: reason === 'insufficient_credits' ? 402 : 409 });
    }

    async function refund(reason: string, metadata: Record<string, unknown> = {}) {
      if (!reservation?.usage_event_id) return;
      const { error } = await supabase.rpc('funcionaria_refund_usage', {
        p_usage_event_id: reservation.usage_event_id,
        p_reason: reason,
        p_metadata: metadata,
      });
      if (error) console.warn('[FuncionarIA STT] estorno falhou:', error.message);
    }

    let response: Response;
    try {
      response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleKey}`, {
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
    } catch (error: any) {
      await refund('google_stt_network_error', { message: String(error?.message || error).slice(0, 160) });
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      await refund('google_stt_http_error', { status: response.status });
      console.error('[FuncionarIA STT] Google:', response.status, detail.slice(0, 250));
      return NextResponse.json({ ok: false, error: 'Não foi possível entender o áudio' }, { status: 502 });
    }

    let data: any;
    try {
      data = await response.json();
    } catch (error: any) {
      await refund('google_stt_invalid_json', { message: String(error?.message || error).slice(0, 160) });
      return NextResponse.json({ ok: false, error: 'Resposta inválida do reconhecimento de voz' }, { status: 502 });
    }

    const transcript = String(data?.results?.[0]?.alternatives?.[0]?.transcript || '').trim();
    if (!transcript) {
      await refund('google_stt_empty_transcript');
      return NextResponse.json({ ok: false, reason: 'empty_transcript' }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      text: transcript,
      credits_consumed: reservation?.credits_consumed ?? 0,
      balance_after: reservation?.balance_after ?? null,
    });
  } catch (error: any) {
    console.error('[FuncionarIA STT] erro:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
