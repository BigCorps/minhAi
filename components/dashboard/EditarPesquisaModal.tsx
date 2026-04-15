'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { X, Save, Plus, Trash2, Star } from 'lucide-react';

interface Pergunta {
  id?: string;
  ordem: number;
  pergunta: string;
  tipo: 'multipla_escolha' | 'texto_livre' | 'estrelas';
  opcoes?: string[];
  obrigatoria: boolean;
  _tempId?: string;
}

interface EditarPesquisaModalProps {
  pesquisaId: string | null;
  companyId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function EditarPesquisaModal({
  pesquisaId,
  companyId,
  onClose,
  onSave,
}: EditarPesquisaModalProps) {
  const isNew = !pesquisaId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativa, setAtiva] = useState(true);
  const [mensagemAgradecimento, setMensagemAgradecimento] = useState('Obrigado pela sua avaliação!');
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!isNew && pesquisaId) {
      loadPesquisa();
    }
  }, [isNew, pesquisaId]);

  async function loadPesquisa() {
    try {
      setLoading(true);

      const { data: pesquisaData } = await supabase
        .from('pesquisas')
        .select('*')
        .eq('id', pesquisaId)
        .single();

      if (pesquisaData) {
        setTitulo(pesquisaData.titulo);
        setDescricao(pesquisaData.descricao || '');
        setAtiva(pesquisaData.ativa);
        setMensagemAgradecimento(pesquisaData.mensagem_agradecimento || 'Obrigado pela sua avaliação!');
      }

      const { data: perguntasData } = await supabase
        .from('pesquisa_perguntas')
        .select('*')
        .eq('pesquisa_id', pesquisaId)
        .order('ordem', { ascending: true });

      setPerguntas(perguntasData || []);
      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
      setLoading(false);
    }
  }

  async function savePesquisa() {
    if (!titulo.trim() || perguntas.length === 0) {
      alert('Preencha o título e adicione pelo menos uma pergunta');
      return;
    }

    try {
      setSaving(true);

      let finalPesquisaId = pesquisaId;

      if (isNew) {
        const { data: novaPesquisa } = await supabase
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

        finalPesquisaId = novaPesquisa?.id;
      } else {
        await supabase
          .from('pesquisas')
          .update({ titulo, descricao, ativa, mensagem_agradecimento: mensagemAgradecimento })
          .eq('id', pesquisaId);

        await supabase
          .from('pesquisa_perguntas')
          .delete()
          .eq('pesquisa_id', pesquisaId);
      }

      const perguntasParaInserir = perguntas.map((p, index) => ({
        pesquisa_id: finalPesquisaId,
        ordem: index + 1,
        pergunta: p.pergunta,
        tipo: p.tipo,
        opcoes: p.tipo === 'multipla_escolha' ? p.opcoes : null,
        obrigatoria: p.obrigatoria,
      }));

      await supabase
        .from('pesquisa_perguntas')
        .insert(perguntasParaInserir);

      setSaving(false);
      onSave();
      onClose();

    } catch (error) {
      console.error('Erro:', error);
      setSaving(false);
    }
  }

  function addPergunta() {
    setPerguntas([...perguntas, {
      _tempId: `temp-${Date.now()}`,
      ordem: perguntas.length + 1,
      pergunta: '',
      tipo: 'estrelas',
      obrigatoria: false,
    }]);
  }

  function removePergunta(index: number) {
    setPerguntas(perguntas.filter((_, i) => i !== index));
  }

  function updatePergunta(index: number, campo: keyof Pergunta, valor: any) {
    const novas = [...perguntas];
    (novas[index] as any)[campo] = valor;
    setPerguntas(novas);
  }

  function addOpcao(index: number) {
    const novas = [...perguntas];
    if (!novas[index].opcoes) novas[index].opcoes = [];
    novas[index].opcoes!.push('');
    setPerguntas(novas);
  }

  function updateOpcao(perguntaIndex: number, opcaoIndex: number, valor: string) {
    const novas = [...perguntas];
    if (novas[perguntaIndex].opcoes) {
      novas[perguntaIndex].opcoes![opcaoIndex] = valor;
      setPerguntas(novas);
    }
  }

  function removeOpcao(perguntaIndex: number, opcaoIndex: number) {
    const novas = [...perguntas];
    if (novas[perguntaIndex].opcoes) {
      novas[perguntaIndex].opcoes = novas[perguntaIndex].opcoes!.filter((_, i) => i !== opcaoIndex);
      setPerguntas(novas);
    }
  }

  const content = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            {isNew ? 'Nova Pesquisa' : 'Editar Pesquisa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da Pesquisa *"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
            />

            <input
              type="text"
              value={mensagemAgradecimento}
              onChange={(e) => setMensagemAgradecimento(e.target.value)}
              placeholder="Mensagem de agradecimento"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ativa}
                onChange={(e) => setAtiva(e.target.checked)}
                className="w-4 h-4 text-yellow-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pesquisa ativa</span>
            </label>
          </div>

          {/* Perguntas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Perguntas ({perguntas.length})</h3>
              <button
                onClick={addPergunta}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {perguntas.map((pergunta, index) => (
                <div key={pergunta.id || pergunta._tempId} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-2">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={pergunta.pergunta}
                      onChange={(e) => updatePergunta(index, 'pergunta', e.target.value)}
                      placeholder="Pergunta..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => removePergunta(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 ml-8">
                    <select
                      value={pergunta.tipo}
                      onChange={(e) => updatePergunta(index, 'tipo', e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-white"
                    >
                      <option value="estrelas">⭐ Estrelas (1-5)</option>
                      <option value="multipla_escolha">📋 Múltipla Escolha</option>
                      <option value="texto_livre">✍️ Texto Livre</option>
                    </select>

                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={pergunta.obrigatoria}
                        onChange={(e) => updatePergunta(index, 'obrigatoria', e.target.checked)}
                        className="w-3.5 h-3.5 text-yellow-500 rounded"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Obrigatória</span>
                    </label>
                  </div>

                  {pergunta.tipo === 'multipla_escolha' && (
                    <div className="ml-8 space-y-2">
                      {(pergunta.opcoes || []).map((opcao, opcaoIndex) => (
                        <div key={opcaoIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opcao}
                            onChange={(e) => updateOpcao(index, opcaoIndex, e.target.value)}
                            placeholder={`Opção ${opcaoIndex + 1}`}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => removeOpcao(index, opcaoIndex)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOpcao(index)}
                        className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                      >
                        + Adicionar opção
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {perguntas.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma pergunta adicionada</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={savePesquisa}
            disabled={saving}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
