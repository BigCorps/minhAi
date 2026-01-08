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

  // Buscar estatísticas
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(10);

  const totalCompanies = companies?.length || 0;

  // Buscar total de conversas
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .limit(100);

  const totalConversations = conversations?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.png" 
                alt="MeAtend" 
                width={150} 
                height={68}
                className="rounded-lg"
              />
              <h1 className="text-xl font-bold text-gray-900">
                Painel de Controle
              </h1>
            </div>

            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user.user_metadata?.name || user.email}!
          </h2>
          <p className="text-gray-600">
            Bem-vindo ao Painel de Controle do MeAtend
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/dashboard/empresas"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Empresas</h3>
                <p className="text-sm text-gray-500">{totalCompanies} {totalCompanies === 1 ? 'empresa' : 'empresas'}</p>
              </div>
            </div>
            <p className="text-gray-600">
              Gerenciar empresas, palavras de ativação e treinamentos.
            </p>
          </Link>

          <Link
            href="/dashboard/historico"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Histórico</h3>
                <p className="text-sm text-gray-500">{totalConversations} {totalConversations === 1 ? 'conversa' : 'conversas'}</p>
              </div>
            </div>
            <p className="text-gray-600">
              Ver perguntas e respostas para ajustar o prompt
            </p>
          </Link>

          <Link
            href="/teste-wake-word"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Testar Assistente</h3>
                <p className="text-sm text-gray-500">palavra de ativação</p>
              </div>
            </div>
            <p className="text-gray-600">
              Teste o assistente de voz com palavra de ativação
            </p>
          </Link>
        </div>

        {totalCompanies === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Comece Agora
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Crie sua primeira empresa para começar a usar o assistente de voz
                </p>
                <Link
                  href="/dashboard/empresas/nova"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                >
                  + Criar Primeira Empresa
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
