import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import AdminUserDetailView from '@/components/admin/AdminUserDetail';
import { getPlatformAdminAccess } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanHostname(value: string | null) {
  return (value ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
}

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function AdminUserPage({ params }: Props) {
  const requestHeaders = await headers();
  const hostname = cleanHostname(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
  );

  const basePath: '' | '/admin' =
    hostname === 'admin.minhai.app' ? '' : '/admin';

  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    const query = new URLSearchParams();
    if (access.reason !== 'unauthenticated') {
      query.set('error', access.reason);
    }

    redirect(
      `${basePath}/login${query.size ? `?${query.toString()}` : ''}`,
    );
  }

  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    notFound();
  }

  return (
    <AdminUserDetailView
      userId={userId}
      basePath={basePath}
      adminEmail={access.user.email ?? access.admin.email}
    />
  );
}
