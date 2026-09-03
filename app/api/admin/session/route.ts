import {
  getPlatformAdminAccess,
} from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
} from '@/lib/platform-admin-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    return platformAdminAccessError(access.reason);
  }

  return platformAdminJson({
    ok: true,
    admin: {
      id: access.user.id,
      email: access.user.email ?? access.admin.email,
      name:
        access.user.user_metadata?.full_name ??
        access.user.user_metadata?.name ??
        null,
      avatar_url:
        access.user.user_metadata?.avatar_url ??
        access.user.user_metadata?.picture ??
        null,
    },
  });
}
