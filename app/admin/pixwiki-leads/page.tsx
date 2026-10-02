import AdminPixWikiLeads from '@/components/admin/AdminPixWikiLeads';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminPixWikiLeads basePath={basePath} admin={admin} />;
}
