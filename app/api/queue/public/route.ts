import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { queueId, signQueueCancelToken, verifyQueueCancelToken } from '@/lib/queue-server';

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function mapGenerateError(message: string) {
  if (message.includes('queue_paused')) return jsonError('queue_paused', 409);
  if (message.includes('queue_daily_limit_reached')) return jsonError('queue_daily_limit_reached', 429);
  if (message.includes('queue_not_available')) return jsonError('queue_not_available', 404);
  if (message.includes('queue_forbidden')) return jsonError('queue_forbidden', 403);
  return jsonError('queue_generate_failed', 500);
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

  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) return jsonError('company_lookup_failed', 500);
  if (!company || company.is_active === false) return jsonError('company_not_found', 404);

  if (action === 'generate') {
    const { data, error } = await admin.rpc('queue_generate_ticket_server', {
      p_company_id: companyId,
    });

    if (error) return mapGenerateError(String(error.message || ''));

    const payload = (data && typeof data === 'object' ? data : {}) as Record<string, any>;
    const ticket = payload.ticket;
    if (!ticket?.id) return jsonError('queue_generate_failed', 500);

    let cancelToken: string;
    try {
      cancelToken = signQueueCancelToken(String(ticket.id), companyId);
    } catch {
      return jsonError('queue_mutation_secret_missing', 500);
    }

    return NextResponse.json({
      ticket,
      cancel_token: cancelToken,
      tempo_medio_atendimento: Number(payload.tempo_medio_atendimento || 0),
    });
  }

  if (action === 'cancel') {
    const ticketId = queueId(body?.ticket_id);
    if (!ticketId) return jsonError('invalid_ticket_id', 400);
    if (!verifyQueueCancelToken(body?.cancel_token, ticketId, companyId)) {
      return jsonError('invalid_cancel_token', 403);
    }

    const { data: ticket, error: ticketError } = await admin
      .from('fila_senhas')
      .select('id,company_id,status')
      .eq('id', ticketId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (ticketError) return jsonError('ticket_lookup_failed', 500);
    if (!ticket) return jsonError('ticket_not_found', 404);
    if (ticket.status !== 'aguardando') return jsonError('ticket_not_cancellable', 409);

    const { data: updated, error: updateError } = await admin
      .from('fila_senhas')
      .update({ status: 'cancelado' })
      .eq('id', ticketId)
      .eq('company_id', companyId)
      .eq('status', 'aguardando')
      .select('id,status')
      .maybeSingle();

    if (updateError) return jsonError('queue_cancel_failed', 500);
    if (!updated) return jsonError('ticket_not_cancellable', 409);
    return NextResponse.json({ ok: true, ticket: updated });
  }

  return jsonError('invalid_action', 400);
}
