'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, ChevronDown, ChevronUp, Edit, Trash2, ToggleLeft, ToggleRight, FileText, MessageSquare } from 'lucide-react';

interface Form {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  campos: any[];
  created_at: string;
  _count?: number;
  _expanded?: boolean;
}

interface PreAtendimentoTabProps {
  companyId: string;
  onOpenModal: (formId: string | null) => void;
}

export default function PreAtendimentoTab({ companyId, onOpenModal }: PreAtendimentoTabProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [loadingRespostas, setLoadingRespostas] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadForms();
  }, [companyId]);

  async function loadForms() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pre_atendimento_forms')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar formulários:', error);
        return;
      }

      // Carregar contagem de respostas
      const formsComContagem = await Promise.all(
        (data || []).map(async (form) => {
          const { count } = await supabase
            .from('pre_atendimento_respostas')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);

          return { ...form, _count: count || 0 };
        })
      );

      setForms(formsComContagem);
      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
      setLoading(false);
    }
  }

  async function toggleExpanded(formId: string) {
    if (expandedId === formId) {
      setExpandedId(null);
      setRespostas([]);
    } else {
      setExpandedId(formId);
      await loadRespostas(formId);
    }
  }

  async function loadRespostas(formId: string) {
    try {
      setLoadingRespostas(true);

      const { data } = await supabase
        .from('pre_atendimento_respostas')
        .select('*')
        .eq('form_id', formId)
        .order('respondido_em', { ascending: false })
        .limit(10);

      setRespostas(data || []);
      setLoadingRespostas(false);

    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      setLoadingRespostas(false);
    }
  }

  async function toggleAtivo(formId: string, ativoAtual: boolean) {
    await supabase
      .from('pre_atendimento_forms')
      .update({ ativo: !ativoAtual })
      .eq('id', formId);

    loadForms();
  }

  async function deleteForm(formId: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;

    await supabase
      .from('pre_atendimento_forms')
      .delete()
      .eq('id', formId);

    loadForms();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Formulários de Pré-Atendimento ({forms.length})
        </h3>
        <button
          onClick={() => onOpenModal(null)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Novo Formulário
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhum formulário criado</p>
          <button
            onClick={() => onOpenModal(null)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Formulário
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div key={form.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Header do formulário */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {form.nome}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        form.ativo
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {form.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {form.descricao && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{form.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {form._count || 0} respostas
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {form.campos?.length || 0} campos
                      </span>
                      <span>Criado em {new Date(form.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleExpanded(form.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Ver respostas"
                    >
                      {expandedId === form.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleAtivo(form.id, form.ativo)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      {form.ativo ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <button
                      onClick={() => onOpenModal(form.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>

                    <button
                      onClick={() => deleteForm(form.id, form.nome)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accordion de Respostas */}
              {expandedId === form.id && (
                <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4">
                  {loadingRespostas ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  ) : respostas.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Últimas 10 respostas:
                      </div>
                      {respostas.map((resposta) => (
                        <div key={resposta.id} className="bg-white dark:bg-slate-800 rounded-lg p-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            {new Date(resposta.respondido_em).toLocaleString('pt-BR')}
                          </div>
                          <div className="space-y-2">
                            {Object.entries(resposta.respostas || {}).map(([campoId, valor]: [string, any]) => {
                              const campo = form.campos.find((c: any) => c.id === campoId);
                              if (!campo) return null;

                              return (
                                <div key={campoId} className="text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {campo.label}:
                                  </span>{' '}
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {Array.isArray(valor) ? valor.join(', ') : valor || '-'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
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
