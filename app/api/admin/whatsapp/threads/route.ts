import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCES = new Set(['conviteia', 'pixwiki', 'minhai', 'outros']);

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const url = new URL(request.url);
  const source = url.searchParams.get('source')?.trim() || '';
  const unreadOnly = url.searchParams.get('unread') === '1';
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase().slice(0, 120);

  const admin = createAdminClient();
  let query = admin
    .from('bigcorps_whatsapp_threads')
    .select('page_id,from_id,sender_name,source,source_context,unread_count,last_message_text,last_inbound_at,last_outbound_at,last_auto_reply_at,last_read_at,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(250);

  if (source && SOURCES.has(source)) query = query.eq('source', source);
  if (unreadOnly) query = query.gt('unread_count', 0);

  const { data, error } = await query;
  if (error) {
    console.error('[admin-whatsapp] Falha ao listar threads:', error);
    return platformAdminUnavailable('whatsapp_inbox_unavailable');
  }

  const rows = (data ?? []).filter((row: any) => {
    if (!search) return true;
    const haystack = [
      row.sender_name,
      row.from_id,
      row.last_message_text,
      row.source,
      row.source_context?.eventoLabel,
      row.source_context?.eventoSlug,
      row.source_context?.contatoNome,
      row.source_context?.companyName,
      row.source_context?.companySlug,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
  });

  const summary = (data ?? []).reduce((acc: any, row: any) => {
    acc.total += 1;
    if (Number(row.unread_count || 0) > 0) acc.unread += 1;
    if (row.source === 'conviteia') acc.conviteia += 1;
    if (row.source === 'pixwiki') acc.pixwiki += 1;
    if (row.source === 'minhai') acc.minhai += 1;
    return acc;
  }, { total: 0, unread: 0, conviteia: 0, pixwiki: 0, minhai: 0 });

  return platformAdminJson({ ok: true, data: rows, summary });
}

export async function PATCH(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as any;
  const pageId = String(body?.pageId ?? '').trim();
  const fromId = String(body?.fromId ?? '').trim();
  if (!pageId || !fromId) {
    return platformAdminJson({ ok: false, error: 'thread_invalida' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('bigcorps_whatsapp_threads')
    .update({ unread_count: 0, last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('page_id', pageId)
    .eq('from_id', fromId);

  if (error) {
    console.error('[admin-whatsapp] Falha ao marcar leitura:', error);
    return platformAdminUnavailable('whatsapp_read_unavailable');
  }

  return platformAdminJson({ ok: true });
}
