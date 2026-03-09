// app/dashboard/arquivos/ArquivosClient.tsx
'use client';

import Link from 'next/link';

interface ArquivosClientProps {
  companies: any[];
  user: any;
}

export default function ArquivosClient({ companies }: ArquivosClientProps) {
  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
            Arquivos
          </h2>
          <p className="transition-colors text-gray-600 dark:text-white/60">
            Selecione uma empresa para gerenciar cupons e outros arquivos
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className="rounded-xl shadow-lg p-12 text-center transition-colors bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
                Nenhuma empresa cadastrada
              </h3>
              <p className="mb-6 transition-colors text-gray-600 dark:text-white/60">
                Você precisa criar uma empresa antes de acessar os arquivos
              </p>
              <Link
                href="/dashboard/empresas/nova"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold dark:bg-blue-500 dark:hover:bg-blue-600"
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
                href={`/dashboard/arquivos/${company.id}`}
                className="block rounded-xl shadow-md p-6 hover:shadow-lg transition group bg-white/80 hover:shadow-xl dark:bg-white/5 dark:border dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 transition-colors text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {company.name}
                    </h3>
                    {company.wake_word && (
                      <p className="text-sm transition-colors text-gray-500 dark:text-white/40">
                        Palavra: {company.wake_word}
                      </p>
                    )}
                  </div>
                  <svg className="w-6 h-6 transition-colors text-gray-400 group-hover:text-blue-600 dark:text-white/40 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="pt-4 border-t transition-colors border-gray-100 dark:border-white/10">
                  <div className="flex items-center text-sm transition-colors text-gray-600 dark:text-white/60">
                    <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Gerenciar Cupons
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