import AdminWhatsAppInbox from '@/components/admin/AdminWhatsAppInbox';
import { requirePlatformAdminPage } from '@/lib/platform-admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { basePath, admin } = await requirePlatformAdminPage();
  return <AdminWhatsAppInbox basePath={basePath} admin={admin} />;
}
