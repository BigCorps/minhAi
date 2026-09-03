import AdminFinance from '@/components/admin/AdminFinance';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminFinance basePath={basePath} admin={admin} />;
}
