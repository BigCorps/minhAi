import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_WINDOW_MS = 10 * 60_000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function companyId(value: unknown) {
  return typeof value === 'string' && UUID.test(value.trim()) ? value.trim() : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

async function resolveManager(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data: company, error: companyError } = await admin.from('companies')
    .select('id,is_active,is_public,email_contato').eq('id', id).maybeSingle();
  if (companyError) throw new Error('lookup_failed');
  if (!company || company.is_active !== true) return { error: 'company_not_found', status: 404 } as const;

  const [profileResult, configResult, funcionariaResult] = await Promise.all([
    admin.from('company_profiles').select('nome,email,telefone')
      .eq('company_id', id).eq('tipo', 'gerente').eq('is_active', true).limit(1).maybeSingle(),
    admin.from('company_function_settings').select('config')
      .eq('company_id', id).eq('function_key', 'chamar_gerente').maybeSingle(),
    admin.from('funcionaria_company_settings').select('company_id').eq('company_id', id).maybeSingle(),
  ]);
  if (profileResult.error || configResult.error || funcionariaResult.error) throw new Error('lookup_failed');
  const isFuncionarIA = Boolean(funcionariaResult.data);
  // Mesma disponibilidade pública de /api/public/company.
  if (company.is_public !== true && !isFuncionarIA) return { error: 'company_not_public', status: 403 } as const;

  const profile = profileResult.data;
  const config = configResult.data?.config || {};
  const email = String(profile?.email || '').trim() || String(company.email_contato || '').trim();
  const phone = String(profile?.telefone || '').replace(/\D/g, '');
  return {
    manager: {
      name: String(profile?.nome || (isFuncionarIA ? 'Responsável' : 'Gerente')),
      email,
      phone,
      isFuncionarIA,
      channels: {
        email: config.notificar_email !== false && Boolean(email),
        sms: config.notificar_sms === true && Boolean(phone),
      },
    },
  } as const;
}

export async function GET(request: NextRequest) {
  const id = companyId(request.nextUrl.searchParams.get('company_id'));
  if (!id) return json({ ok: false, reason: 'invalid_company_id' }, 400);
  try {
    const resolved = await resolveManager(createAdminClient(), id);
    if ('error' in resolved) return json({ ok: false, reason: resolved.error }, resolved.status);
    return json({ ok: true, manager_name: resolved.manager.name, channels: resolved.manager.channels });
  } catch {
    return json({ ok: false, reason: 'configuration_unavailable' }, 503);
  }
}

export async function POST(request: NextRequest) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, reason: 'invalid_request' }, 400);
  }
  const id = companyId(input?.company_id);
  if (!id) return json({ ok: false, reason: 'invalid_company_id' }, 400);
  if (typeof input?.reason !== 'string') return json({ ok: false, reason: 'reason_required' }, 400);
  const reason = input.reason.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
  if (!reason) return json({ ok: false, reason: 'reason_required' }, 400);
  if (reason.length > 500) return json({ ok: false, reason: 'reason_too_long' }, 400);

  try {
    const admin = createAdminClient();
    const resolved = await resolveManager(admin, id);
    if ('error' in resolved) return json({ ok: false, reason: resolved.error }, resolved.status);
    const manager = resolved.manager;
    if (!manager.channels.email && !manager.channels.sms) return json({ ok: false, reason: 'no_channel' }, 409);

    if (manager.channels.email) {
      const { count, error } = await admin.from('email_logs').select('id', { count: 'exact', head: true })
        .eq('company_id', id).eq('email_type', 'manager_assistance').eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - EMAIL_WINDOW_MS).toISOString());
      // Falhar fechado: indisponibilidade da consulta nunca autoriza envio.
      if (error || count === null) return json({ ok: false, reason: 'notification_unavailable' }, 503);
      if (count >= 3) return json({ ok: false, reason: 'rate_limited' }, 429);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // SMS usa o caminho público existente da Edge, preservando também seu
    // limite legado (a autenticação service_role contornaria esse limite).
    const smsKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || (manager.channels.email && !serviceRole) || (manager.channels.sms && !smsKey)) {
      return json({ ok: false, reason: 'notification_unavailable' }, 503);
    }

    async function notify(edge: string, key: string, body: Record<string, unknown>) {
      try {
        const response = await fetch(`${url}/functions/v1/${edge}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(40_000),
        });
        const payload = await response.json().catch(() => null);
        if (response.ok && payload && !payload.error && payload.ok !== false && payload.success !== false) {
          return { ok: true, reason: null };
        }
        return {
          ok: false,
          reason: response.status === 402 ? 'insufficient_credits'
            : response.status === 429 ? 'rate_limited' : 'notification_failed',
        };
      } catch {
        return { ok: false, reason: 'notification_failed' };
      }
    }

    const tasks: Array<Promise<{ channel: 'email' | 'sms'; ok: boolean; reason: string | null }>> = [];
    if (manager.channels.email) {
      const subject = manager.isFuncionarIA ? '🔔 Cliente aguardando — FuncionarIA' : '🔔 Chamada de Gerente - minhAi';
      const message = manager.isFuncionarIA
        ? 'Um cliente está aguardando atendimento pela FuncionarIA. Por favor, verifique o atendimento.'
        : 'Você foi chamado(a) por um usuário. Por favor, verifique o atendimento.';
      const signature = manager.isFuncionarIA ? 'Enviado pela FuncionarIA' : 'Enviado via minhAi';
      // Escapar inclusive o nome cadastrado: a Edge pode renderizar o corpo como HTML.
      const body = `Olá ${escapeHtml(manager.name)},\n\n${message}\n\nMotivo:\n${escapeHtml(reason)}\n\n---\n${signature}`;
      tasks.push(notify('enviar-email-google-v2', serviceRole!, {
        company_id: id, to: manager.email, subject, body, email_type: 'manager_assistance',
      }).then(result => ({ channel: 'email' as const, ...result })));
    }
    if (manager.channels.sms) {
      tasks.push(notify('send-sms-gerente', smsKey!, {
        company_id: id, number: manager.phone, gerente_nome: manager.name, motivo: reason,
        usage_idempotency_key: `funcionaria-manager-sms:${id}:${randomUUID()}`,
      }).then(result => ({ channel: 'sms' as const, ...result })));
    }
    const results = await Promise.all(tasks);
    const notified = results.filter(result => result.ok).map(result => result.channel);
    if (notified.length) return json({ ok: true, notified });
    const failure = results.find(result => result.reason === 'rate_limited')
      || results.find(result => result.reason === 'insufficient_credits') || results[0];
    const status = failure.reason === 'rate_limited' ? 429 : failure.reason === 'insufficient_credits' ? 402 : 502;
    return json({ ok: false, reason: failure.reason || 'notification_failed' }, status);
  } catch {
    return json({ ok: false, reason: 'notification_unavailable' }, 503);
  }
}

function methodNotAllowed() {
  return NextResponse.json({ ok: false, reason: 'method_not_allowed' }, {
    status: 405, headers: { 'Cache-Control': 'no-store', Allow: 'GET, POST' },
  });
}

export { methodNotAllowed as HEAD, methodNotAllowed as OPTIONS, methodNotAllowed as PUT,
  methodNotAllowed as PATCH, methodNotAllowed as DELETE };
