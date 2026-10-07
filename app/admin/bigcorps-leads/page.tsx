import AdminBigCorpsLeads from '@/components/admin/AdminBigCorpsLeads';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminBigCorpsLeads admin={admin} basePath={basePath} />;
}
