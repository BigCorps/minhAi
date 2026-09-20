import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const url = new URL(request.url);
  const pageId = (url.searchParams.get('pageId') ?? '').trim();
  const fromId = (url.searchParams.get('fromId') ?? '').trim();
  if (!pageId || !fromId) {
    return platformAdminJson({ ok: false, error: 'thread_invalida' }, 400);
  }

  const admin = createAdminClient();
  const { data: thread, error: threadError } = await admin
    .from('bigcorps_whatsapp_threads')
    .select('page_id,from_id,sender_name,source,source_context,unread_count,last_message_text,last_inbound_at,last_outbound_at,last_auto_reply_at,last_read_at,created_at,updated_at')
    .eq('page_id', pageId)
    .eq('from_id', fromId)
    .maybeSingle();

  if (threadError || !thread) {
    return platformAdminJson({ ok: false, error: 'thread_nao_encontrada' }, 404);
  }

  const { data: convs, error: convError } = await admin
    .from('conversations')
    .select('id')
    .eq('meta_from_id', fromId)
    .eq('meta_page_id', pageId)
    .eq('meta_platform', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(20);

  if (convError) {
    console.error('[admin-whatsapp] Falha ao localizar conversations:', convError);
    return platformAdminUnavailable('whatsapp_messages_unavailable');
  }

  const convIds = (convs ?? []).map((c: any) => c.id);
  let messages: any[] = [];

  if (convIds.length) {
    const { data, error } = await admin
      .from('messages')
      .select('id,conversation_id,role,content,created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) {
      console.error('[admin-whatsapp] Falha ao carregar mensagens:', error);
      return platformAdminUnavailable('whatsapp_messages_unavailable');
    }
    messages = data ?? [];
  }

  await admin
    .from('bigcorps_whatsapp_threads')
    .update({ unread_count: 0, last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('page_id', pageId)
    .eq('from_id', fromId);

  return platformAdminJson({ ok: true, thread: { ...thread, unread_count: 0 }, messages });
}
