import AdminAttention from '@/components/admin/AdminAttention';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminAttention basePath={basePath} admin={admin} />;
}
