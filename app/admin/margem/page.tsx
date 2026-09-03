import AdminMargin from '@/components/admin/AdminMargin';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminMargin basePath={basePath} admin={admin} />;
}
