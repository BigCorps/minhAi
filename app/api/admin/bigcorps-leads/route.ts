import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS } from '@/lib/bigcorps-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function safeSearch(value: string | null) {
  return (value || '').trim().replace(/[(),]/g, ' ').slice(0, 120);
}

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || '').toLowerCase();
  const prioridade = (url.searchParams.get('prioridade') || '').toLowerCase();
  const search = safeSearch(url.searchParams.get('search'));
  const page = intParam(url.searchParams.get('page'), 1, 1, 100_000);
  const perPage = intParam(url.searchParams.get('perPage'), 25, 10, 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const admin = createAdminClient();
  let query = admin
    .from('bigcorps_leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if ((STATUS_OPTIONS as readonly string[]).includes(status)) query = query.eq('status', status);
  if ((PRIORIDADE_OPTIONS as readonly string[]).includes(prioridade)) query = query.eq('prioridade', prioridade);
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`nome.ilike.${pattern},empresa.ilike.${pattern},whatsapp.ilike.${pattern},email.ilike.${pattern},cidade.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[platform-admin] Falha ao listar Leads BigCorps:', error);
    return platformAdminUnavailable('bigcorps_leads_unavailable');
  }

  const total = count || 0;
  return platformAdminJson({
    ok: true,
    data: {
      items: data || [],
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    },
  });
}

export async function PATCH(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();
  const notas = String(body?.notas ?? '').trim().slice(0, 5000);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return platformAdminJson({ ok: false, error: 'invalid_id' }, 400);
  }
  if (!(STATUS_OPTIONS as readonly string[]).includes(status)) {
    return platformAdminJson({ ok: false, error: 'invalid_status' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bigcorps_leads')
    .update({ status, notas: notas || null })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[platform-admin] Falha ao atualizar Lead BigCorps:', error);
    return platformAdminJson({ ok: false, error: 'update_failed' }, 500);
  }

  return platformAdminJson({ ok: true, lead: data });
}
