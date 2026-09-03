import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson, platformAdminUnavailable } from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';
import { getOpenAIAdminSnapshot } from '@/lib/platform-openai-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    'admin_platform_margin_snapshot'
  );

  if (error || !data) {
    console.error('[platform-admin] Falha em margem:', error);
    return platformAdminUnavailable('admin_margin_unavailable');
  }

  const payload = { ...(data as Record<string, unknown>), openai: await getOpenAIAdminSnapshot() };
  return platformAdminJson({ ok: true, data: payload });
}
