import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

const CLASSES = new Set(['standard','movement','premium','led']);
const STATUSES = new Set(['draft','active','paused','suspended','archived']);
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as any;
  const screenId = String(body?.screenId || '').trim();
  const inventoryClass = String(body?.inventoryClass || '').trim();
  const status = String(body?.status || '').trim();
  const priceFactor = Number(body?.priceFactor);
  const networkInventoryPercent = Number(body?.networkInventoryPercent);
  const acceptingAds = Boolean(body?.acceptingAds);
  const activeStartTime = String(body?.activeStartTime || '').trim().slice(0,5);
  const activeEndTime = String(body?.activeEndTime || '').trim().slice(0,5);

  if (!screenId || !CLASSES.has(inventoryClass) || !STATUSES.has(status)) {
    return platformAdminJson({ ok: false, error: 'Classificação ou status inválido.' }, 400);
  }
  if (!Number.isFinite(priceFactor) || priceFactor < 0.5 || priceFactor > 100) {
    return platformAdminJson({ ok: false, error: 'O fator de preço deve ficar entre 0,50 e 100.' }, 400);
  }
  if (!Number.isFinite(networkInventoryPercent) || networkInventoryPercent < 0 || networkInventoryPercent > 80) {
    return platformAdminJson({ ok: false, error: 'O inventário da rede deve ficar entre 0% e 80%.' }, 400);
  }
  if (!TIME_RE.test(activeStartTime) || !TIME_RE.test(activeEndTime) || activeStartTime >= activeEndTime) {
    return platformAdminJson({ ok: false, error: 'Horário operacional inválido.' }, 400);
  }

  const admin = adminMidia();
  const { data: before } = await admin.from('screens').select('*').eq('id', screenId).maybeSingle();
  if (!before) return platformAdminJson({ ok: false, error: 'Tela não encontrada.' }, 404);

  const commercialMode = String(before.commercial_mode);
  const safeNetwork = commercialMode === 'private' ? 0 : Math.max(1, networkInventoryPercent);
  const { error: screenError } = await admin.from('screens').update({
    inventory_class: inventoryClass,
    price_factor: Math.round(priceFactor * 100) / 100,
    network_inventory_percent: safeNetwork,
    status,
  }).eq('id', screenId);
  if (screenError) {
    console.error('[admin/midia/screens] screen:', screenError);
    return platformAdminJson({ ok: false, error: 'Não foi possível atualizar a tela.' }, 500);
  }

  const { error: settingsError } = await admin.from('screen_ad_settings').update({
    accepting_ads: commercialMode === 'private' ? false : acceptingAds,
    active_start_time: `${activeStartTime}:00`,
    active_end_time: `${activeEndTime}:00`,
  }).eq('screen_id', screenId);
  if (settingsError) {
    console.error('[admin/midia/screens] settings:', settingsError);
    return platformAdminJson({ ok: false, error: 'A tela foi atualizada, mas o horário comercial não.' }, 500);
  }

  await admin.rpc('notify_screen_playlist', { p_screen_id: screenId, p_action: 'admin_screen_updated' });
  const { data: after } = await admin.from('screens').select('*').eq('id', screenId).maybeSingle();
  await auditMidiaAdmin({
    adminUserId: access.user.id,
    action: 'screen_updated',
    entityType: 'screen',
    entityId: screenId,
    before,
    after,
    metadata: { acceptingAds, activeStartTime, activeEndTime },
  });

  return platformAdminJson({ ok: true });
}
