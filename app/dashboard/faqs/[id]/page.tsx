// app/dashboard/faqs/[id]/page.tsx
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfile } from '@/components/UserProfile';
import { FAQManager } from '@/components/FAQManager';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function CompanyFAQsPage({ params }: PageProps) {
  // Resolver params (compatível com Next.js 14 e 15)
  const resolvedParams = await Promise.resolve(params);
  const companyId = resolvedParams.id;

  // Verificar autenticação
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  // Buscar empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  // Se a empresa não existe, retorna 404
  if (companyError || !company) {
    console.error('Empresa não encontrada:', companyError);
    notFound();
  }

  // Verificar permissões via company_admins (tabela principal de permissões)
  const { data: adminAccess, error: adminError } = await supabase
    .from('company_admins')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  // Se não tem acesso via company_admins, verifica se é o dono direto via companies.user_id
  const hasDirectOwnership = company.user_id === user.id;
  const hasAdminAccess = adminAccess && !adminError;

  // Usuário precisa ter acesso via company_admins OU ser o dono direto
  if (!hasAdminAccess && !hasDirectOwnership) {
    console.error('Acesso negado:', {
      userId: user.id,
      companyUserId: company.user_id,
      hasAdminAccess,
      hasDirectOwnership
    });
    redirect('/dashboard/faqs');
  }

  // Debug logs (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== FAQ Access Check ===');
    console.log('Company ID:', companyId);
    console.log('User ID:', user.id);
    console.log('Company Name:', company.name);
    console.log('Has Admin Access:', hasAdminAccess);
    console.log('Has Direct Ownership:', hasDirectOwnership);
    console.log('Access Granted:', hasAdminAccess || hasDirectOwnership);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent transition-colors duration-500">
      <header className="bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10 backdrop-blur-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="eAi" 
                  width={150} 
                  height={68}
                  className="rounded-lg cursor-pointer"
                />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-white/50">
                  Respostas Rápidas
                </p>
              </div>
            </div>
            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard/faqs"
            className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 mb-4 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para lista de empresas
          </Link>
        </div>

        <FAQManager companyId={companyId} />
      </div>
    </div>
  );
}