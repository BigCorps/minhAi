import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm']);

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  const body = await request.json().catch(() => null) as { id?:string } | null;
  const id = String(body?.id || '').trim();
  if (!id) return platformAdminJson({ ok:false, error:'Filler não informado.' }, 400);

  const admin = adminMidia();
  const { data: creative } = await admin.from('house_creatives').select('*').eq('id',id).maybeSingle();
  if (!creative || creative.status !== 'uploading') return platformAdminJson({ ok:false, error:'Upload não encontrado ou já finalizado.' }, 409);

  const storage = adminMidiaStorage();
  const { data: info, error: infoError } = await storage.storage.from('midia-assets').info(creative.storage_path);
  const actualSize = Number(info?.size ?? 0);
  const actualMime = String(info?.contentType ?? creative.mime_type).toLowerCase();
  if (infoError || !actualSize || actualSize > MAX_BYTES || !ALLOWED.has(actualMime)) {
    await Promise.all([
      storage.storage.from('midia-assets').remove([creative.storage_path]),
      admin.from('house_creatives').update({ status:'failed' }).eq('id',id),
    ]);
    return platformAdminJson({ ok:false, error:'O arquivo enviado não passou na validação.' }, 400);
  }

  const { data: after, error } = await admin.from('house_creatives').update({ status:'ready', size_bytes:actualSize, mime_type:actualMime }).eq('id',id).select('*').single();
  if (error || !after) return platformAdminJson({ ok:false, error:'Não foi possível ativar o filler.' }, 500);
  await admin.rpc('notify_house_playlist', { p_action:'house_ready' });
  await auditMidiaAdmin({ adminUserId: access.user.id, action:'house_ready', entityType:'house_creative', entityId:id, before:creative, after });
  return platformAdminJson({ ok:true });
}
