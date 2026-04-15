'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Star, MessageSquare, BarChart3, Edit, Trash2, ToggleLeft, ToggleRight, Eye } from 'lucide-react';

interface Pesquisa {
  id: string;
  titulo: string;
  descricao?: string;
  ativa: boolean;
  created_at: string;
  _count?: number;
}

export default function PesquisasPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.companyId as string;

  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (companyId) {
      loadPesquisas();
    }
  }, [companyId]);

  async function loadPesquisas() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pesquisas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pesquisas:', error);
        showToast('Erro ao carregar pesquisas', 'error');
        return;
      }

      // Carregar contagem de respostas para cada pesquisa
      const pesquisasComContagem = await Promise.all(
        (data || []).map(async (pesquisa) => {
          const { count } = await supabase
            .from('pesquisa_respostas')
            .select('*', { count: 'exact', head: true })
            .eq('pesquisa_id', pesquisa.id);

          return { ...pesquisa, _count: count || 0 };
        })
      );

      setPesquisas(pesquisasComContagem);
      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao carregar pesquisas', 'error');
      setLoading(false);
    }
  }

  async function toggleAtiva(pesquisaId: string, ativaAtual: boolean) {
    try {
      const { error } = await supabase
        .from('pesquisas')
        .update({ ativa: !ativaAtual })
        .eq('id', pesquisaId);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao atualizar pesquisa', 'error');
        return;
      }

      showToast(ativaAtual ? 'Pesquisa desativada' : 'Pesquisa ativada', 'success');
      loadPesquisas();

    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao atualizar pesquisa', 'error');
    }
  }

  async function deletePesquisa(pesquisaId: string, titulo: string) {
    if (!confirm(`Tem certeza que deseja excluir a pesquisa "${titulo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pesquisas')
        .delete()
        .eq('id', pesquisaId);

      if (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir pesquisa', 'error');
        return;
      }

      showToast('Pesquisa excluída com sucesso', 'success');
      loadPesquisas();

    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao excluir pesquisa', 'error');
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              Pesquisas e Avaliações
            </h1>
            <button
              onClick={() => router.push(`/dashboard/${companyId}/pesquisas/nova`)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Pesquisa
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Crie pesquisas de satisfação e colete avaliações dos seus clientes
          </p>
        </div>

        {/* Lista de Pesquisas */}
        {pesquisas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhuma pesquisa criada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Comece criando sua primeira pesquisa de satisfação
            </p>
            <button
              onClick={() => router.push(`/dashboard/${companyId}/pesquisas/nova`)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Criar Primeira Pesquisa
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {pesquisas.map((pesquisa) => (
              <div
                key={pesquisa.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {pesquisa.titulo}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pesquisa.ativa
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {pesquisa.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    {pesquisa.descricao && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {pesquisa.descricao}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>{pesquisa._count || 0} respostas</span>
                      </div>
                      <div className="text-gray-400 dark:text-gray-600">
                        Criada em {new Date(pesquisa.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/${companyId}/pesquisas/${pesquisa.id}/resultados`)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Ver resultados"
                    >
                      <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    <button
                      onClick={() => toggleAtiva(pesquisa.id, pesquisa.ativa)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title={pesquisa.ativa ? 'Desativar' : 'Ativar'}
                    >
                      {pesquisa.ativa ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <button
                      onClick={() => router.push(`/dashboard/${companyId}/pesquisas/${pesquisa.id}`)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>

                    <button
                      onClick={() => deletePesquisa(pesquisa.id, pesquisa.titulo)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`px-6 py-4 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
