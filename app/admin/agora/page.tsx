import AdminNow from '@/components/admin/AdminNow';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminNow basePath={basePath} admin={admin} />;
}
