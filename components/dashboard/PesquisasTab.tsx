'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, ChevronDown, ChevronUp, Edit, Trash2, ToggleLeft, ToggleRight, Star, MessageSquare, BarChart3 } from 'lucide-react';

interface Pesquisa {
  id: string;
  titulo: string;
  descricao?: string;
  ativa: boolean;
  created_at: string;
  _count?: number;
  _expanded?: boolean;
}

interface PesquisasTabProps {
  companyId: string;
  onOpenModal: (pesquisaId: string | null) => void;
}

export default function PesquisasTab({ companyId, onOpenModal }: PesquisasTabProps) {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resultados, setResultados] = useState<any>(null);
  const [loadingResultados, setLoadingResultados] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadPesquisas();
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
        return;
      }

      // Carregar contagem de respostas
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
      setLoading(false);
    }
  }

  async function toggleExpanded(pesquisaId: string) {
    if (expandedId === pesquisaId) {
      setExpandedId(null);
      setResultados(null);
    } else {
      setExpandedId(pesquisaId);
      await loadResultados(pesquisaId);
    }
  }

  async function loadResultados(pesquisaId: string) {
    try {
      setLoadingResultados(true);

      // Carregar perguntas
      const { data: perguntas } = await supabase
        .from('pesquisa_perguntas')
        .select('*')
        .eq('pesquisa_id', pesquisaId)
        .order('ordem', { ascending: true });

      // Carregar respostas
      const { data: respostas } = await supabase
        .from('pesquisa_respostas')
        .select('*')
        .eq('pesquisa_id', pesquisaId);

      // Calcular estatísticas
      const stats = (perguntas || []).map((pergunta: any) => {
        const respostasPergunta = (respostas || []).filter((r: any) => r.pergunta_id === pergunta.id);

        if (pergunta.tipo === 'estrelas') {
          const notas = respostasPergunta.map((r: any) => r.nota).filter((n: any) => n);
          const media = notas.length > 0 ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(1) : 0;
          
          return {
            pergunta: pergunta.pergunta,
            tipo: pergunta.tipo,
            media,
            total: notas.length,
            distribuicao: [1, 2, 3, 4, 5].map(nota => ({
              nota,
              count: notas.filter((n: number) => n === nota).length,
            })),
          };
        }

        if (pergunta.tipo === 'multipla_escolha') {
          const opcoesCont: Record<string, number> = {};
          respostasPergunta.forEach((r: any) => {
            if (r.resposta) {
              opcoesCont[r.resposta] = (opcoesCont[r.resposta] || 0) + 1;
            }
          });

          return {
            pergunta: pergunta.pergunta,
            tipo: pergunta.tipo,
            total: respostasPergunta.length,
            opcoes: Object.entries(opcoesCont).map(([opcao, count]) => ({
              opcao,
              count,
              percentual: ((count / respostasPergunta.length) * 100).toFixed(0),
            })),
          };
        }

        if (pergunta.tipo === 'texto_livre') {
          return {
            pergunta: pergunta.pergunta,
            tipo: pergunta.tipo,
            total: respostasPergunta.length,
            respostas: respostasPergunta.slice(0, 5).map((r: any) => r.resposta),
          };
        }

        return null;
      }).filter(Boolean);

      setResultados(stats);
      setLoadingResultados(false);

    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      setLoadingResultados(false);
    }
  }

  async function toggleAtiva(pesquisaId: string, ativaAtual: boolean) {
    await supabase
      .from('pesquisas')
      .update({ ativa: !ativaAtual })
      .eq('id', pesquisaId);

    loadPesquisas();
  }

  async function deletePesquisa(pesquisaId: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"?`)) return;

    await supabase
      .from('pesquisas')
      .delete()
      .eq('id', pesquisaId);

    loadPesquisas();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pesquisas de Satisfação ({pesquisas.length})
        </h3>
        <button
          onClick={() => onOpenModal(null)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Nova Pesquisa
        </button>
      </div>

      {pesquisas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhuma pesquisa criada</p>
          <button
            onClick={() => onOpenModal(null)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Primeira Pesquisa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pesquisas.map((pesquisa) => (
            <div key={pesquisa.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Header da pesquisa */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {pesquisa.titulo}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pesquisa.ativa
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {pesquisa.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    {pesquisa.descricao && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{pesquisa.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {pesquisa._count || 0} respostas
                      </span>
                      <span>Criada em {new Date(pesquisa.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleExpanded(pesquisa.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Ver resultados"
                    >
                      {expandedId === pesquisa.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleAtiva(pesquisa.id, pesquisa.ativa)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      {pesquisa.ativa ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <button
                      onClick={() => onOpenModal(pesquisa.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>

                    <button
                      onClick={() => deletePesquisa(pesquisa.id, pesquisa.titulo)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accordion de Resultados */}
              {expandedId === pesquisa.id && (
                <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4">
                  {loadingResultados ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-500 border-t-transparent"></div>
                    </div>
                  ) : resultados && resultados.length > 0 ? (
                    <div className="space-y-6">
                      {resultados.map((stat: any, index: number) => (
                        <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                            {stat.pergunta}
                          </h5>

                          {stat.tipo === 'estrelas' && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-5 h-5 ${
                                        i < Math.round(stat.media)
                                          ? 'fill-yellow-500 text-yellow-500'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {stat.media}
                                </span>
                                <span className="text-sm text-gray-500">({stat.total} votos)</span>
                              </div>
                              <div className="space-y-1">
                                {stat.distribuicao.map((d: any) => (
                                  <div key={d.nota} className="flex items-center gap-2 text-sm">
                                    <span className="w-12 text-gray-600 dark:text-gray-400">{d.nota} ⭐</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                      <div
                                        className="bg-yellow-500 h-2 rounded-full"
                                        style={{ width: `${(d.count / stat.total) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="w-12 text-right text-gray-600 dark:text-gray-400">{d.count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {stat.tipo === 'multipla_escolha' && (
                            <div className="space-y-2">
                              {stat.opcoes.map((opcao: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{opcao.opcao}</span>
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{opcao.percentual}%</span>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${opcao.percentual}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className="text-sm text-gray-500 w-12 text-right">{opcao.count}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {stat.tipo === 'texto_livre' && (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {stat.total} respostas (mostrando últimas 5):
                              </p>
                              {stat.respostas.map((resposta: string, i: number) => (
                                <div key={i} className="bg-gray-50 dark:bg-slate-700 rounded p-3 text-sm text-gray-700 dark:text-gray-300">
                                  "{resposta}"
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma resposta ainda</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
