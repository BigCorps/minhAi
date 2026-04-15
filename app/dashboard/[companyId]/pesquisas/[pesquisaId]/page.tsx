'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Star, List, MessageSquare } from 'lucide-react';

interface Pergunta {
  id?: string;
  ordem: number;
  pergunta: string;
  tipo: 'multipla_escolha' | 'texto_livre' | 'estrelas';
  opcoes?: string[];
  obrigatoria: boolean;
  _tempId?: string;
}

export default function EditarPesquisaPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.companyId as string;
  const pesquisaId = params?.pesquisaId as string;

  const isNew = pesquisaId === 'nova';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Dados da pesquisa
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativa, setAtiva] = useState(true);
  const [mensagemAgradecimento, setMensagemAgradecimento] = useState('Obrigado pela sua avaliação!');
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!isNew && companyId && pesquisaId) {
      loadPesquisa();
    }
  }, [isNew, companyId, pesquisaId]);

  async function loadPesquisa() {
    try {
      setLoading(true);

      // Carregar pesquisa
      const { data: pesquisaData, error: pesquisaError } = await supabase
        .from('pesquisas')
        .select('*')
        .eq('id', pesquisaId)
        .single();

      if (pesquisaError || !pesquisaData) {
        showToast('Pesquisa não encontrada', 'error');
        router.push(`/dashboard/${companyId}/pesquisas`);
        return;
      }

      setTitulo(pesquisaData.titulo);
      setDescricao(pesquisaData.descricao || '');
      setAtiva(pesquisaData.ativa);
      setMensagemAgradecimento(pesquisaData.mensagem_agradecimento || 'Obrigado pela sua avaliação!');

      // Carregar perguntas
      const { data: perguntasData, error: perguntasError } = await supabase
        .from('pesquisa_perguntas')
        .select('*')
        .eq('pesquisa_id', pesquisaId)
        .order('ordem', { ascending: true });

      if (perguntasError) {
        console.error('Erro ao carregar perguntas:', perguntasError);
      }

      setPerguntas(perguntasData || []);
      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao carregar pesquisa', 'error');
      setLoading(false);
    }
  }

  async function savePesquisa() {
    if (!titulo.trim()) {
      showToast('Digite um título para a pesquisa', 'error');
      return;
    }

    if (perguntas.length === 0) {
      showToast('Adicione pelo menos uma pergunta', 'error');
      return;
    }

    try {
      setSaving(true);

      let finalPesquisaId = pesquisaId;

      if (isNew) {
        // Criar nova pesquisa
        const { data: novaPesquisa, error: pesquisaError } = await supabase
          .from('pesquisas')
          .insert({
            company_id: companyId,
            titulo,
            descricao,
            ativa,
            mensagem_agradecimento: mensagemAgradecimento,
          })
          .select()
          .single();

        if (pesquisaError || !novaPesquisa) {
          console.error('Erro ao criar pesquisa:', pesquisaError);
          showToast('Erro ao criar pesquisa', 'error');
          setSaving(false);
          return;
        }

        finalPesquisaId = novaPesquisa.id;
      } else {
        // Atualizar pesquisa existente
        const { error: updateError } = await supabase
          .from('pesquisas')
          .update({
            titulo,
            descricao,
            ativa,
            mensagem_agradecimento: mensagemAgradecimento,
          })
          .eq('id', pesquisaId);

        if (updateError) {
          console.error('Erro ao atualizar pesquisa:', updateError);
          showToast('Erro ao atualizar pesquisa', 'error');
          setSaving(false);
          return;
        }

        // Excluir perguntas antigas
        await supabase
          .from('pesquisa_perguntas')
          .delete()
          .eq('pesquisa_id', pesquisaId);
      }

      // Inserir perguntas
      const perguntasParaInserir = perguntas.map((p, index) => ({
        pesquisa_id: finalPesquisaId,
        ordem: index + 1,
        pergunta: p.pergunta,
        tipo: p.tipo,
        opcoes: p.tipo === 'multipla_escolha' ? p.opcoes : null,
        obrigatoria: p.obrigatoria,
      }));

      const { error: perguntasError } = await supabase
        .from('pesquisa_perguntas')
        .insert(perguntasParaInserir);

      if (perguntasError) {
        console.error('Erro ao salvar perguntas:', perguntasError);
        showToast('Erro ao salvar perguntas', 'error');
        setSaving(false);
        return;
      }

      showToast('Pesquisa salva com sucesso!', 'success');
      setSaving(false);

      setTimeout(() => {
        router.push(`/dashboard/${companyId}/pesquisas`);
      }, 1000);

    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao salvar pesquisa', 'error');
      setSaving(false);
    }
  }

  function addPergunta() {
    const novaPergunta: Pergunta = {
      _tempId: `temp-${Date.now()}`,
      ordem: perguntas.length + 1,
      pergunta: '',
      tipo: 'estrelas',
      obrigatoria: false,
    };
    setPerguntas([...perguntas, novaPergunta]);
  }

  function removePergunta(index: number) {
    setPerguntas(perguntas.filter((_, i) => i !== index));
  }

  function updatePergunta(index: number, campo: keyof Pergunta, valor: any) {
    const novasPerguntas = [...perguntas];
    (novasPerguntas[index] as any)[campo] = valor;
    setPerguntas(novasPerguntas);
  }

  function addOpcao(index: number) {
    const novasPerguntas = [...perguntas];
    if (!novasPerguntas[index].opcoes) {
      novasPerguntas[index].opcoes = [];
    }
    novasPerguntas[index].opcoes!.push('');
    setPerguntas(novasPerguntas);
  }

  function updateOpcao(perguntaIndex: number, opcaoIndex: number, valor: string) {
    const novasPerguntas = [...perguntas];
    if (novasPerguntas[perguntaIndex].opcoes) {
      novasPerguntas[perguntaIndex].opcoes![opcaoIndex] = valor;
      setPerguntas(novasPerguntas);
    }
  }

  function removeOpcao(perguntaIndex: number, opcaoIndex: number) {
    const novasPerguntas = [...perguntas];
    if (novasPerguntas[perguntaIndex].opcoes) {
      novasPerguntas[perguntaIndex].opcoes = novasPerguntas[perguntaIndex].opcoes!.filter((_, i) => i !== opcaoIndex);
      setPerguntas(novasPerguntas);
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/${companyId}/pesquisas`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              {isNew ? 'Nova Pesquisa' : 'Editar Pesquisa'}
            </h1>

            <button
              onClick={savePesquisa}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Formulário */}
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informações Básicas
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título da Pesquisa *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Pesquisa de Satisfação"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição sobre a pesquisa..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem de Agradecimento
                </label>
                <input
                  type="text"
                  value={mensagemAgradecimento}
                  onChange={(e) => setMensagemAgradecimento(e.target.value)}
                  placeholder="Obrigado pela sua avaliação!"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ativa"
                  checked={ativa}
                  onChange={(e) => setAtiva(e.target.checked)}
                  className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="ativa" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pesquisa ativa (visível para clientes)
                </label>
              </div>
            </div>
          </div>

          {/* Perguntas */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Perguntas ({perguntas.length})
              </h2>
              <button
                onClick={addPergunta}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Pergunta
              </button>
            </div>

            <div className="space-y-4">
              {perguntas.map((pergunta, index) => (
                <div
                  key={pergunta.id || pergunta._tempId}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border-2 border-gray-200 dark:border-slate-600"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 mt-3">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={pergunta.pergunta}
                          onChange={(e) => updatePergunta(index, 'pergunta', e.target.value)}
                          placeholder="Digite a pergunta..."
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <select
                          value={pergunta.tipo}
                          onChange={(e) => updatePergunta(index, 'tipo', e.target.value)}
                          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
                        >
                          <option value="estrelas">⭐ Avaliação por Estrelas (1-5)</option>
                          <option value="multipla_escolha">📋 Múltipla Escolha</option>
                          <option value="texto_livre">✍️ Texto Livre</option>
                        </select>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={pergunta.obrigatoria}
                            onChange={(e) => updatePergunta(index, 'obrigatoria', e.target.checked)}
                            className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Obrigatória</span>
                        </label>
                      </div>

                      {/* Opções de múltipla escolha */}
                      {pergunta.tipo === 'multipla_escolha' && (
                        <div className="ml-10 space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Opções de resposta:
                          </label>
                          {(pergunta.opcoes || []).map((opcao, opcaoIndex) => (
                            <div key={opcaoIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opcao}
                                onChange={(e) => updateOpcao(index, opcaoIndex, e.target.value)}
                                placeholder={`Opção ${opcaoIndex + 1}`}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                              />
                              <button
                                onClick={() => removeOpcao(index, opcaoIndex)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOpcao(index)}
                            className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
                          >
                            + Adicionar opção
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removePergunta(index)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {perguntas.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta" para começar.
                </div>
              )}
            </div>
          </div>
        </div>

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
