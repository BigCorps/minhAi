'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function ProducaoClient() {
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
            router.replace(`/dashboard/producao/${selectedAssistantId}`);
          }
          setCheckingType(false);
        });
    }
  }, [selectedAssistantId, loadingAssistants, router]);

  if (loadingAssistants || checkingType) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isVendas) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Linha de Produção
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Fichas técnicas e custos de receitas
            </p>
          </div>
          <div className="rounded-xl shadow-lg p-12 text-center bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Não disponível na versão Vendas
              </h3>
              <p className="text-gray-600 dark:text-white/60">
                A Linha de Produção é exclusiva da versão Smart. Na versão Vendas, gerencie seus produtos diretamente na seção Vendas e Produtos.
              </p>
              <Link
                href="/dashboard/vendas"
                className="inline-block mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition font-semibold"
              >
                Ir para Vendas e Produtos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAssistantId) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Linha de Produção
            </h2>
            <p className="text-gray-600 dark:text-white/60">
              Selecione seu assistente para gerenciar fichas técnicas e custos de receitas
            </p>
          </div>
          <div className="rounded-xl shadow-lg p-12 text-center bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Nenhum assistente cadastrado
              </h3>
              <p className="mb-6 text-gray-600 dark:text-white/60">
                Você precisa criar um assistente antes de acessar as guias de produção
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
