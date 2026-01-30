import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfile } from '@/components/UserProfile';
import { FAQManager } from '@/components/FAQManager';

export default async function CompanyFAQsPage({ params }: { params: { id: string } }) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  // Buscar empresa
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!company) {
    redirect('/dashboard/faqs');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
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
                <h1 className="text-xl font-bold text-gray-900">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-500">
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
            className="inline-flex items-center text-primary-green hover:text-primary-green-dark mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para lista de empresas
          </Link>
        </div>

        <FAQManager companyId={params.id} />
      </div>
    </div>
  );
}
