import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPlatformAdminAccess } from '@/lib/platform-admin';
import type { AdminIdentity } from '@/types/platform-admin-business';

function cleanHostname(value: string | null) {
  return (value ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
}

export async function requirePlatformAdminPage(): Promise<{
  basePath: '' | '/admin';
  admin: AdminIdentity;
}> {
  const requestHeaders = await headers();
  const hostname = cleanHostname(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
  );

  const basePath: '' | '/admin' =
    hostname === 'admin.minhai.app' ? '' : '/admin';

  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    const params = new URLSearchParams();
    if (access.reason !== 'unauthenticated') {
      params.set('error', access.reason);
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    redirect(`${basePath}/login${suffix}`);
  }

  return {
    basePath,
    admin: {
      id: access.user.id,
      email: access.user.email ?? access.admin.email,
      name:
        access.user.user_metadata?.full_name ??
        access.user.user_metadata?.name ??
        null,
      avatarUrl:
        access.user.user_metadata?.avatar_url ??
        access.user.user_metadata?.picture ??
        null,
    },
  };
}
