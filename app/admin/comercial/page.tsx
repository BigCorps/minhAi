import AdminCommercial from "@/components/admin/AdminCommercial";
import { requirePlatformAdminPage } from "@/lib/platform-admin-page";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { admin, basePath } = await requirePlatformAdminPage();
  return <AdminCommercial admin={admin} basePath={basePath} />;
}
