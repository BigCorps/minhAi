// app/dashboard/arquivos/ArquivosClient.tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import { Loader2 } from 'lucide-react';

export default function ArquivosClient() {
  const { selectedAssistantId: selectedCompanyId, selectedAssistantName } = useAssistant();
  const router = useRouter();

  // Redireciona automaticamente para os arquivos do assistente selecionado
  useEffect(() => {
    if (!loadingAssistants && selectedAssistantId) {
      router.replace(`/dashboard/arquivos/${selectedAssistantId}`);
    }
  }, [selectedAssistantId, loadingAssistants]);

  if (loadingAssistants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Só aparece se não tiver nenhum assistente criado
  if (!selectedAssistantId) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Arquivos e Cupons
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Selecione seu assistente para gerenciar cupons e outros arquivos
            </p>
          </div>

          <div className="rounded-xl shadow-lg p-12 text-center bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Nenhum assistente cadastrado
              </h3>
              <p className="mb-6 text-gray-600 dark:text-white/60">
                Você precisa criar um assistente antes de acessar os arquivos
              </p>
              <Link
                href="/dashboard/assistentes/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                + Criar Primeiro Assistente
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback enquanto o redirect acontece
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
