import AdminSupport from '@/components/admin/AdminSupport';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminSupport basePath={basePath} admin={admin} />;
}
