import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson, platformAdminUnavailable } from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    'admin_platform_now_snapshot'
  );

  if (error || !data) {
    console.error('[platform-admin] Falha em agora:', error);
    return platformAdminUnavailable('admin_now_unavailable');
  }

  const payload = data;
  return platformAdminJson({ ok: true, data: payload });
}
