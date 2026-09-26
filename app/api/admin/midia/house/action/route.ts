import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  const body = await request.json().catch(() => null) as { id?:string; action?:'activate'|'pause'|'delete' } | null;
  const id = String(body?.id || '').trim();
  const action = String(body?.action || '');
  if (!id || !['activate','pause','delete'].includes(action)) return platformAdminJson({ ok:false, error:'Ação inválida.' }, 400);

  const admin = adminMidia();
  const { data: before } = await admin.from('house_creatives').select('*').eq('id',id).maybeSingle();
  if (!before) return platformAdminJson({ ok:false, error:'Filler não encontrado.' }, 404);

  const nextStatus = action === 'activate' ? 'ready' : action === 'pause' ? 'paused' : 'deleted';
  const { data: after, error } = await admin.from('house_creatives').update({ status:nextStatus }).eq('id',id).select('*').single();
  if (error || !after) return platformAdminJson({ ok:false, error:'Não foi possível atualizar o filler.' }, 500);

  if (action === 'delete') {
    const storage = adminMidiaStorage();
    const { error: removeError } = await storage.storage.from('midia-assets').remove([before.storage_path]);
    if (removeError) console.error('[admin/midia/house/action] storage cleanup:', removeError);
  }
  await admin.rpc('notify_house_playlist', { p_action:`house_${action}` });
  await auditMidiaAdmin({ adminUserId: access.user.id, action:`house_${action}`, entityType:'house_creative', entityId:id, before, after });
  return platformAdminJson({ ok:true, status:nextStatus });
}
