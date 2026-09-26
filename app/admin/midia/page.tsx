import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminMidiaPanel from '@/components/admin/AdminMidiaPanel';
import AdminMidiaCreatives from '@/components/admin/AdminMidiaCreatives';
import { getPlatformAdminAccess } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

function cleanHostname(value: string | null) {
  return (value ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
}

type Props = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function AdminMidiaPage({ searchParams }: Props) {
  const requestHeaders = await headers();
  const hostname = cleanHostname(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  const basePath: '' | '/admin' = hostname === 'admin.minhai.app' ? '' : '/admin';
  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    const params = new URLSearchParams();
    if (access.reason !== 'unauthenticated') params.set('error', access.reason);
    redirect(`${basePath}/login${params.size ? `?${params.toString()}` : ''}`);
  }

  const params = searchParams ? await searchParams : undefined;
  const user = access.user;
  const admin = {
    id: user.id,
    email: user.email ?? access.admin.email,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  };

  if (params?.view === 'criativos') {
    return <AdminMidiaCreatives basePath={basePath} admin={admin} />;
  }

  return <AdminMidiaPanel basePath={basePath} admin={admin} />;
}
