// app/dashboard/faqs/FAQsClient.tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import { Loader2 } from 'lucide-react';

export default function FAQsClient() {
  const { selectedAssistantId, loadingAssistants } = useAssistant();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAssistants && selectedAssistantId) {
      router.replace(`/dashboard/faqs/${selectedAssistantId}`);
    }
  }, [selectedAssistantId, loadingAssistants]);

  if (loadingAssistants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!selectedAssistantId) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Perguntas e Respostas (FAQ)
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Selecione uma empresa para configurar as perguntas frequentes automáticas
            </p>
          </div>

          <div className="rounded-xl shadow-lg p-12 text-center bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Nenhum assistente cadastrado
              </h3>
              <p className="mb-6 text-gray-600 dark:text-white/60">
                Você precisa criar um assistente antes de configurar FAQs
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
