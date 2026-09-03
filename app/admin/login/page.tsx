import AdminGoogleLogin from './AdminGoogleLogin';

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return <AdminGoogleLogin errorCode={params?.error ?? null} />;
}
