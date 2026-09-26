import { NextResponse } from 'next/server';
import {
  adminMidia,
  canMidiaScreenPlay,
  getMidiaDeviceContext,
  hashMidiaIp,
  midiaIp,
  verifyMidiaProofToken,
} from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProofInput = {
  eventId?: string;
  occurrenceId?: string;
  proofToken?: string;
  startedAt?: string;
  endedAt?: string;
  playedMs?: number;
  offline?: boolean;
  appVersion?: string;
};

function permanentError(message: string) {
  return [
    'occurrence_not_found', 'device_screen_mismatch', 'occurrence_not_scheduled',
    'invalid_client_timing', 'invalid_play_duration', 'play_outside_window',
    'settlement_unavailable', 'settlement_overdelivery',
  ].some((item) => message.includes(item));
}

export async function POST(request: Request) {
  const ctx = await getMidiaDeviceContext(request);
  if (!ctx) return NextResponse.json({ error: 'player_unauthorized' }, { status: 401 });
  if (!canMidiaScreenPlay(ctx)) return NextResponse.json({ error: 'player_inactive' }, { status: 409 });

  const body = await request.json().catch(() => null) as { events?: ProofInput[] } | null;
  const events = Array.isArray(body?.events) ? body!.events.slice(0, 100) : [];
  if (!events.length) return NextResponse.json({ error: 'proof_events_required' }, { status: 400 });

  const cleanIds = [...new Set(events
    .map((event) => String(event.occurrenceId || '').trim())
    .filter((id) => UUID_RE.test(id)))];

  const admin = adminMidia();
  const { data: occurrences, error: occurrenceError } = cleanIds.length
    ? await admin
        .from('campaign_occurrences')
        .select('id,screen_id,display_seconds,status')
        .in('id', cleanIds)
    : { data: [], error: null };

  if (occurrenceError) {
    console.error('[midia/player/proof] occurrences:', occurrenceError);
    return NextResponse.json({ error: 'proof_unavailable' }, { status: 500 });
  }

  const occurrenceById = new Map((occurrences ?? []).map((row) => [row.id, row]));
  const ipHash = hashMidiaIp(midiaIp(request));
  const results: Array<{ eventId: string; occurrenceId: string; status: 'accepted' | 'duplicate' | 'rejected'; earnedCents?: number; reason?: string }> = [];

  for (const event of events) {
    const eventId = String(event.eventId || '').trim();
    const occurrenceId = String(event.occurrenceId || '').trim();
    const proofToken = String(event.proofToken || '').trim();
    const startedAt = String(event.startedAt || '').trim();
    const endedAt = String(event.endedAt || '').trim();
    const playedMs = Math.floor(Number(event.playedMs || 0));
    const row = occurrenceById.get(occurrenceId);

    if (!UUID_RE.test(eventId) || !row || row.screen_id !== ctx.screen.id || !proofToken) {
      results.push({ eventId, occurrenceId, status: 'rejected', reason: 'proof_invalid' });
      continue;
    }

    if (!verifyMidiaProofToken({
      occurrenceId,
      screenId: ctx.screen.id,
      deviceId: ctx.device.id,
      displaySeconds: Number(row.display_seconds),
    }, proofToken)) {
      results.push({ eventId, occurrenceId, status: 'rejected', reason: 'proof_signature_invalid' });
      continue;
    }

    const started = new Date(startedAt);
    const ended = new Date(endedAt);
    if (!Number.isFinite(started.getTime()) || !Number.isFinite(ended.getTime()) || !Number.isSafeInteger(playedMs) || playedMs <= 0) {
      results.push({ eventId, occurrenceId, status: 'rejected', reason: 'proof_timing_invalid' });
      continue;
    }

    const { data, error } = await admin.rpc('record_play_event', {
      p_occurrence_id: occurrenceId,
      p_device_id: ctx.device.id,
      p_client_event_id: eventId,
      p_client_started_at: started.toISOString(),
      p_client_ended_at: ended.toISOString(),
      p_played_ms: playedMs,
      p_offline: Boolean(event.offline),
      p_app_version: String(event.appVersion || ctx.device.app_version || '').slice(0, 40),
      p_ip_hash: ipHash,
    });

    if (error) {
      const message = String(error.message || '');
      if (permanentError(message)) {
        results.push({ eventId, occurrenceId, status: 'rejected', reason: message.split('\n')[0].slice(0, 100) });
        continue;
      }
      console.error('[midia/player/proof] rpc:', occurrenceId, error);
      return NextResponse.json({ error: 'proof_unavailable', results }, { status: 503 });
    }

    const result = Array.isArray(data) ? data[0] : data;
    results.push({
      eventId,
      occurrenceId,
      status: result?.already_processed ? 'duplicate' : 'accepted',
      earnedCents: Number(result?.publisher_earned_cents ?? 0),
    });
  }

  return NextResponse.json({
    ok: true,
    accepted: results.filter((item) => item.status === 'accepted').length,
    duplicate: results.filter((item) => item.status === 'duplicate').length,
    rejected: results.filter((item) => item.status === 'rejected').length,
    results,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
