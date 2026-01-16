import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfile } from '@/components/UserProfile';

export default async function FAQsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  // Buscar empresas do usuário
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="iTend" 
                  width={150} 
                  height={68}
                  className="rounded-lg cursor-pointer"
                />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                Respostas Rápidas
              </h1>
            </div>

            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-primary-green hover:text-primary-green-dark mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Dashboard
          </Link>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            💬 Gerenciar Respostas Rápidas
          </h2>
          <p className="text-gray-600">
            Selecione uma empresa para configurar as FAQs e respostas automáticas
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Nenhuma empresa cadastrada
              </h3>
              <p className="text-gray-600 mb-6">
                Você precisa criar uma empresa antes de configurar FAQs
              </p>
              <Link
                href="/dashboard/empresas/nova"
                className="inline-block px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
              >
                + Criar Primeira Empresa
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/faqs/${company.id}`}
                className="block bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-green transition">
                      {company.name}
                    </h3>
                    {company.wake_word && (
                      <p className="text-sm text-gray-500">
                        🎤 Palavra: {company.wake_word}
                      </p>
                    )}
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-green transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Configurar FAQs
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}