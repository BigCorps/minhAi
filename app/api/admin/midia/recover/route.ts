import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  const admin = adminMidia();
  const { data, error } = await admin.rpc('recover_missed_occurrences', { p_screen_id: null, p_limit: 200 });
  if (error) {
    console.error('[admin/midia/recover]', error);
    return platformAdminJson({ ok: false, error: 'Não foi possível executar a recuperação.' }, 500);
  }
  const row = Array.isArray(data) ? data[0] : data;
  await auditMidiaAdmin({ adminUserId: access.user.id, action: 'recovery_run', entityType: 'maintenance', after: row });
  return platformAdminJson({ ok: true, data: row });
}
