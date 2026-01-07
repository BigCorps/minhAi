import { createClient, getUser } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function EmpresasPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Empresas
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Voltar
              </Link>
              <Link
                href="/dashboard/empresas/nova"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                + Nova Empresa
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Nenhuma empresa cadastrada
            </h2>
            <p className="text-gray-600 mb-6">
              Crie sua primeira empresa para começar a usar o assistente de voz
            </p>
            <Link
              href="/dashboard/empresas/nova"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Criar Primeira Empresa
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Ativo
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {company.name}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{company.slug}</code>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-xs">Wake: <strong>{company.wake_word || 'olá assistente'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dashboard/empresas/${company.id}`}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/teste-wake-word`}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-center text-sm font-medium"
                  >
                    Testar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
