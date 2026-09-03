import {
  getPlatformAdminAccess,
} from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Context = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    return platformAdminAccessError(access.reason);
  }

  const { userId } = await context.params;

  if (!UUID_RE.test(userId)) {
    return platformAdminJson(
      {
        ok: false,
        error: 'invalid_user_id',
      },
      400,
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    'admin_platform_user_detail',
    {
      p_user_id: userId,
    },
  );

  if (error) {
    console.error(
      '[platform-admin] Falha ao carregar perfil administrativo:',
      error,
    );

    return platformAdminUnavailable('admin_user_detail_unavailable');
  }

  if (!data) {
    return platformAdminJson(
      {
        ok: false,
        error: 'user_not_found',
      },
      404,
    );
  }

  return platformAdminJson({
    ok: true,
    data,
  });
}
