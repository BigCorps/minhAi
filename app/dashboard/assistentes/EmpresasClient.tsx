
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CopyLinkButton } from '@/components/CopyLinkButton';

interface AssistentesClientProps {
  companies: any[];
  user: any;
}

export default function AssistentesClient({ companies, user }: AssistentesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssistants = companies.filter(assistant =>
    assistant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold transition-colors text-gray-900 dark:text-white">
              Assistentes
            </h1>
            <p className="mt-2 transition-colors text-gray-600 dark:text-white/60">
              Gerencie seus assistentes virtuais e configurações personalizadas
            </p>
          </div>
          <Link
            href="/dashboard/assistentes/novo"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 font-semibold active:scale-95"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Assistente
          </Link>
        </div>

        {/* Barra de Busca */}
        <div className="mb-8">
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center transition-colors text-gray-400 group-focus-within:text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nome do assistente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 
              bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400
              dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-white/30 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssistants.map((assistant) => (
            <div
              key={assistant.id}
              className="group relative rounded-2xl border transition-all duration-300 p-6
              bg-white/80 border-gray-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5
              dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300
                bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <CopyLinkButton slug={assistant.id} />
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1 transition-colors text-gray-900 dark:text-white">
                {assistant.name}
              </h3>
              <p className="text-sm mb-6 font-mono transition-colors text-gray-500 dark:text-white/40">
                ID: {assistant.id.substring(0, 8)}...
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/dashboard/assistentes/${assistant.id}`}
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                  bg-gray-100 text-gray-700 hover:bg-gray-200
                  dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:border dark:border-white/5"
                >
                  ⚙️ Configurar
                </Link>
                <Link
                  href={`/dashboard/assistentes/${assistant.id}/chat`}
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                  bg-blue-50 text-blue-600 hover:bg-blue-100
                  dark:bg-blue-600/20 dark:text-blue-400 dark:hover:bg-blue-600/30 dark:border dark:border-blue-500/30"
                >
                  💬 Testar
                </Link>
              </div>
            </div>
          ))}

          {filteredAssistants.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl transition-colors
            border-gray-200 bg-white/50
            dark:border-white/10 dark:bg-white/5 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100 dark:bg-white/10">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhum assistente encontrado</p>
              <p className="text-gray-500 dark:text-white/40">Tente ajustar sua busca ou crie um novo assistente.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
