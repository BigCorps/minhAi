import { createClient, getUser } from '@/lib/supabase-server';
import { UserProfile } from '@/components/UserProfile';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  const { data: adminRecord } = await supabase
    .from('company_admins')
    .select(`
      company_id,
      companies (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .single();

  const company = adminRecord?.companies as any;
  const companyName = company?.name || 'Nenhuma empresa associada';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.png" 
                alt="Gerente IA" 
                width={40} 
                height={40}
                className="rounded-lg"
              />
              <h1 className="text-xl font-bold text-gray-900">
                Gerente IA
              </h1>
            </div>

            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user.user_metadata?.name || user.email}! 👋
          </h2>
          <p className="text-gray-600">
            Bem-vindo ao dashboard do Gerente IA
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/dashboard/empresas"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Empresas</h3>
            </div>
            <p className="text-gray-600">
              Gerenciar empresas, wake words e prompts personalizados
            </p>
          </Link>

          <Link
            href="/teste-wake-word"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Testar Assistente</h3>
            </div>
            <p className="text-gray-600">
              Teste o assistente de voz com wake word gratuito
            </p>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Autenticado</h3>
            </div>
            <p className="text-sm text-gray-600">Login realizado com sucesso</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Empresa</h3>
            </div>
            <p className="text-sm text-gray-600">
              {companyName}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">APIs</h3>
            </div>
            <p className="text-sm text-gray-600">
              {process.env.OPENAI_API_KEY ? 'OpenAI configurada' : 'Aguardando configuração'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
