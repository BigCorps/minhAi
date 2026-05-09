// app/dashboard/faqs/FAQsClient.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function FAQsClient() {
  const { selectedAssistantId, loadingAssistants } = useAssistant();
  const router = useRouter();

const [isVendas, setIsVendas] = useState(false);
  const [checkingType, setCheckingType] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!loadingAssistants && selectedAssistantId) {
      setCheckingType(true);
      supabase
        .from('companies')
        .select('assistant_type')
        .eq('id', selectedAssistantId)
        .single()
        .then(({ data }) => {
          if (data?.assistant_type === 'vendas') {
            setIsVendas(true);
          } else {
            router.replace(`/dashboard/faqs/${selectedAssistantId}`);
          }
          setCheckingType(false);
        });
    }
  }, [selectedAssistantId, loadingAssistants, router]);

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
              Comandos e Execuções 
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Selecione uma empresa para configurar os perguntas frequentes em respostas automáticas e execuções de funções.
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

if (isVendas) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Respostas Rápidas
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Configuração de respostas automáticas
            </p>
          </div>
          <div className="rounded-xl shadow-lg p-12 text-center bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime-100 dark:bg-lime-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Não disponível na versão Vendas
              </h3>
              <p className="text-gray-600 dark:text-white/60">
                Na versão Vendas, o assistente usa IA com contexto de produtos e o prompt configurado para responder automaticamente. Não é necessário configurar FAQs separadamente.
              </p>
              <Link
                href="/dashboard/functions"
                className="inline-block mt-6 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-black rounded-lg transition font-semibold"
              >
                Configurar Assistente Vendas
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
