import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  canConfigureQueue,
  queueId,
  resolveQueueActor,
  sanitizeQueueConfig,
} from '@/lib/queue-server';

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function authStatus(error?: string) {
  return error === 'forbidden' ? 403 : 401;
}

function cleanQueueCode(value: unknown): string {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{1,16}$/.test(code) ? code : '';
}

export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 400);
  }

  const action = String(body?.action || '').trim();
  const companyId = queueId(body?.company_id);
  if (!companyId) return jsonError('invalid_company_id', 400);

  const resolved = await resolveQueueActor(request, body, companyId);
  if (!resolved.actor) return jsonError(resolved.error || 'unauthorized', authStatus(resolved.error));

  const actor = resolved.actor;
  const admin = createAdminClient();

  if (action === 'authorize') {
    return NextResponse.json({ ok: true, actor_kind: actor.kind, profile_type: actor.profileType || null });
  }

  if (action === 'call_next') {
    const { data, error } = await admin.rpc('queue_call_next_server', {
      p_company_id: companyId,
      p_attendente_profile_id: actor.profileId || null,
    });
    if (error) return jsonError('queue_call_next_failed', 500);
    const payload = (data && typeof data === 'object' ? data : {}) as Record<string, any>;
    return NextResponse.json({ ticket: payload.ticket || null });
  }

  if (action === 'start_service') {
    const ticketId = queueId(body?.ticket_id);
    if (!ticketId) return jsonError('invalid_ticket_id', 400);

    const { data: existing, error: lookupError } = await admin
      .from('fila_senhas')
      .select('*')
      .eq('id', ticketId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (lookupError) return jsonError('ticket_lookup_failed', 500);
    if (!existing) return jsonError('ticket_not_found', 404);
    if (existing.status === 'atendimento') return NextResponse.json({ ticket: existing });
    if (existing.status !== 'chamando') return jsonError('invalid_ticket_state', 409);

    const patch: Record<string, unknown> = {
      status: 'atendimento',
      atendimento_iniciado_em: new Date().toISOString(),
    };
    if (actor.profileId) patch.atendente_profile_id = actor.profileId;

    const { data: updated, error: updateError } = await admin
      .from('fila_senhas')
      .update(patch)
      .eq('id', ticketId)
      .eq('company_id', companyId)
      .eq('status', 'chamando')
      .select('*')
      .maybeSingle();
    if (updateError) return jsonError('queue_start_service_failed', 500);
    if (!updated) return jsonError('invalid_ticket_state', 409);
    return NextResponse.json({ ticket: updated });
  }

  if (action === 'finalize') {
    const requestedTicketId = body?.ticket_id ? queueId(body.ticket_id) : '';
    if (body?.ticket_id && !requestedTicketId) return jsonError('invalid_ticket_id', 400);

    let query = admin
      .from('fila_senhas')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['chamando', 'atendimento']);

    if (requestedTicketId) query = query.eq('id', requestedTicketId);
    else query = query.order('atendimento_iniciado_em', { ascending: true, nullsFirst: false }).order('chamada_em', { ascending: true }).limit(1);

    const { data: ticket, error: lookupError } = await query.maybeSingle();
    if (lookupError) return jsonError('ticket_lookup_failed', 500);
    if (!ticket) return NextResponse.json({ ticket: null });

    const { data: updated, error: updateError } = await admin
      .from('fila_senhas')
      .update({ status: 'finalizado', finalizada_em: new Date().toISOString() })
      .eq('id', ticket.id)
      .eq('company_id', companyId)
      .in('status', ['chamando', 'atendimento'])
      .select('*')
      .maybeSingle();
    if (updateError) return jsonError('queue_finalize_failed', 500);
    return NextResponse.json({ ticket: updated || null });
  }

  if (action === 'cancel') {
    const requestedTicketId = body?.ticket_id ? queueId(body.ticket_id) : '';
    const queueCode = body?.senha_completa ? cleanQueueCode(body.senha_completa) : '';
    if (!requestedTicketId && !queueCode) return jsonError('ticket_identifier_required', 400);

    let query = admin
      .from('fila_senhas')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'aguardando');
    if (requestedTicketId) query = query.eq('id', requestedTicketId);
    else query = query.eq('senha_completa', queueCode);

    const { data: ticket, error: lookupError } = await query.order('gerada_em', { ascending: false }).limit(1).maybeSingle();
    if (lookupError) return jsonError('ticket_lookup_failed', 500);
    if (!ticket) return NextResponse.json({ ticket: null });

    const { data: updated, error: updateError } = await admin
      .from('fila_senhas')
      .update({ status: 'cancelado' })
      .eq('id', ticket.id)
      .eq('company_id', companyId)
      .eq('status', 'aguardando')
      .select('*')
      .maybeSingle();
    if (updateError) return jsonError('queue_cancel_failed', 500);
    return NextResponse.json({ ticket: updated || null });
  }

  if (action === 'set_active') {
    if (typeof body?.active !== 'boolean') return jsonError('invalid_active', 400);
    const configId = body?.config_id ? queueId(body.config_id) : '';
    if (body?.config_id && !configId) return jsonError('invalid_config_id', 400);

    let query = admin.from('fila_configs').select('id').eq('company_id', companyId);
    if (configId) query = query.eq('id', configId);
    else query = query.order('created_at', { ascending: true }).limit(1);
    const { data: config, error: configError } = await query.maybeSingle();
    if (configError) return jsonError('queue_config_lookup_failed', 500);
    if (!config) return jsonError('queue_config_not_found', 404);

    const { data: updated, error: updateError } = await admin
      .from('fila_configs')
      .update({ fila_ativa: body.active })
      .eq('id', config.id)
      .eq('company_id', companyId)
      .select('*')
      .maybeSingle();
    if (updateError) return jsonError('queue_set_active_failed', 500);
    return NextResponse.json({ config: updated });
  }

  if (action === 'save_config') {
    if (!canConfigureQueue(actor)) return jsonError('forbidden', 403);

    let patch;
    try {
      patch = sanitizeQueueConfig(body?.config);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'invalid_config', 400);
    }

    const configId = body?.config_id ? queueId(body.config_id) : '';
    if (body?.config_id && !configId) return jsonError('invalid_config_id', 400);

    let existing: Record<string, any> | null = null;
    if (configId) {
      const result = await admin
        .from('fila_configs')
        .select('*')
        .eq('id', configId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (result.error) return jsonError('queue_config_lookup_failed', 500);
      existing = result.data;
    } else {
      const result = await admin
        .from('fila_configs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (result.error) return jsonError('queue_config_lookup_failed', 500);
      existing = result.data;
    }

    if (existing) {
      if (Object.keys(patch).length === 0) return NextResponse.json({ config: existing });
      const { data: updated, error: updateError } = await admin
        .from('fila_configs')
        .update(patch)
        .eq('id', existing.id)
        .eq('company_id', companyId)
        .select('*')
        .maybeSingle();
      if (updateError) return jsonError('queue_config_save_failed', 409);
      return NextResponse.json({ config: updated });
    }

    const { data: created, error: createError } = await admin
      .from('fila_configs')
      .insert({ company_id: companyId, ...patch })
      .select('*')
      .single();
    if (createError) return jsonError('queue_config_save_failed', 409);
    return NextResponse.json({ config: created });
  }

  return jsonError('invalid_action', 400);
}
