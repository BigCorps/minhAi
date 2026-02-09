// app/dashboard/faqs/FAQsClient.tsx (Client Component)
'use client';

import Link from 'next/link';

interface FAQsClientProps {
  companies: any[];
  user: any; // Adicione esta linha
}

export default function FAQsClient({ companies }: FAQsClientProps) {
  // Removi o useState/useEffect de tema. 
  // O Tailwind aplicará o modo dark automaticamente com as classes 'dark:'.

  return (
    <div className="min-h-screen transition-colors duration-500 bg-gray-50 dark:bg-slate-950">
      
      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">          
          <h2 className="text-3xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
            💬 Gerenciar Respostas Rápidas
          </h2>
          <p className="transition-colors text-gray-600 dark:text-white/60">
            Selecione uma empresa para configurar as FAQs e respostas automáticas
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          /* Estado Vazio */
          <div className="rounded-xl shadow-lg p-12 text-center transition-colors bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl dark:border dark:border-white/10">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
                Nenhuma empresa cadastrada
              </h3>
              <p className="mb-6 transition-colors text-gray-600 dark:text-white/60">
                Você precisa criar uma empresa antes de configurar FAQs
              </p>
              <Link
                href="/dashboard/empresas/nova"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                + Criar Primeira Empresa
              </Link>
            </div>
          </div>
        ) : (
          /* Lista de Empresas */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/faqs/${company.id}`}
                className="block rounded-xl shadow-md p-6 hover:shadow-lg transition group bg-white hover:shadow-xl dark:bg-slate-800/50 dark:backdrop-blur-xl dark:border dark:border-white/10 dark:hover:border-purple-500/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 transition-colors text-gray-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
                      {company.name}
                    </h3>
                    {company.wake_word && (
                      <p className="text-sm transition-colors text-gray-500 dark:text-white/40">
                        🎤 Palavra: {company.wake_word}
                      </p>
                    )}
                  </div>
                  <svg className="w-6 h-6 transition-colors text-gray-400 group-hover:text-purple-600 dark:text-white/40 dark:group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className="pt-4 border-t transition-colors border-gray-100 dark:border-white/10">
                  <div className="flex items-center text-sm transition-colors text-gray-600 dark:text-white/60">
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