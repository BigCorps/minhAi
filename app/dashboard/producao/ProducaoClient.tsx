'use client';

import Link from 'next/link';

interface ProducaoClientProps {
  companies: any[];
  user: any;
}

export default function ProducaoClient({ companies }: ProducaoClientProps) {
  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
            Fichas de Produção
          </h2>
          <p className="transition-colors text-gray-600 dark:text-white/60">
            Selecione seu assistente para gerenciar fichas técnicas e custos de receitas
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className="rounded-xl shadow-lg p-12 text-center transition-colors bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
                Nenhum assistente cadastrado
              </h3>
              <p className="mb-6 transition-colors text-gray-600 dark:text-white/60">
                Você precisa criar um assistente antes de acessar as fichas de produção
              </p>
              <Link
                href="/dashboard/assistentes/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                + Criar Primeiro Assistente
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/producao/${company.id}`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Gerenciar Fichas de Produção
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
