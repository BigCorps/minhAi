import AdminCosts from '@/components/admin/AdminCosts';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminCosts basePath={basePath} admin={admin} />;
}
