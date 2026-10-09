import { createAdminClient } from '@/lib/supabase-server';
import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson, platformAdminUnavailable } from '@/lib/platform-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  const admin = createAdminClient();
  const url = new URL(request.url);
  const threadId = String(url.searchParams.get('thread') || '');

  if (threadId) {
    const [{ data: thread, error: threadError }, { data: messages, error: messageError }] = await Promise.all([
      admin.from('bigcorps_support_threads').select('*').eq('id', threadId).maybeSingle(),
      admin.from('bigcorps_support_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(200),
    ]);
    if (threadError || messageError) return platformAdminUnavailable('support_admin_unavailable');
    return platformAdminJson({ ok: true, data: { thread, messages: messages || [] } });
  }

  const { data, error } = await admin
    .from('bigcorps_support_threads')
    .select('id,product,host,path,user_id,company_id,status,human_requested,last_message_at,created_at')
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return platformAdminUnavailable('support_admin_unavailable');

  const summary = {
    total: data?.length || 0,
    waiting: data?.filter((x) => x.status === 'waiting_human').length || 0,
    open: data?.filter((x) => x.status === 'open' || x.status === 'human').length || 0,
  };
  return platformAdminJson({ ok: true, data: { threads: data || [], summary } });
}

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  if (new URL(request.url).origin !== request.headers.get('origin')) {
    return platformAdminJson({ ok: false, error: 'origin_rejected' }, 403);
  }
  const body = await request.json().catch(() => ({}));
  const id = String(body?.threadId || '');
  const action = String(body?.action || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return platformAdminJson({ ok: false, error: 'invalid_thread' }, 400);

  const admin = createAdminClient();
  if (action === 'reply') {
    const content = String(body?.message || '').trim().slice(0, 4000);
    if (!content) return platformAdminJson({ ok: false, error: 'message_required' }, 400);
    const { error } = await admin.from('bigcorps_support_messages').insert({
      thread_id: id,
      role: 'human',
      source: 'admin',
      content,
    });
    if (error) return platformAdminUnavailable('support_reply_failed');
    await admin.from('bigcorps_support_threads').update({
      status: 'human',
      human_requested: true,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    return platformAdminJson({ ok: true });
  }

  if (action === 'resolve' || action === 'reopen') {
    const status = action === 'resolve' ? 'resolved' : 'open';
    const { error } = await admin.from('bigcorps_support_threads').update({
      status,
      human_requested: action === 'resolve' ? false : true,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return platformAdminUnavailable('support_status_failed');
    return platformAdminJson({ ok: true });
  }

  return platformAdminJson({ ok: false, error: 'invalid_action' }, 400);
}
