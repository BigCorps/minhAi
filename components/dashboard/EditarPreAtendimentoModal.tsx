'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { X, Save, Plus, Trash2, FileText } from 'lucide-react';

interface Campo {
  id: string;
  label: string;
  tipo: 'texto' | 'textarea' | 'multipla_escolha';
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[];
  multiplo?: boolean;
  ordem: number;
}

interface EditarPreAtendimentoModalProps {
  formId: string | null;
  companyId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function EditarPreAtendimentoModal({
  formId,
  companyId,
  onClose,
  onSave,
}: EditarPreAtendimentoModalProps) {
  const isNew = !formId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [campos, setCampos] = useState<Campo[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!isNew && formId) {
      loadForm();
    }
  }, [isNew, formId]);

  async function loadForm() {
    try {
      setLoading(true);

      const { data: formData } = await supabase
        .from('pre_atendimento_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formData) {
        setNome(formData.nome);
        setDescricao(formData.descricao || '');
        setAtivo(formData.ativo);
        setCampos(formData.campos || []);
      }

      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
      setLoading(false);
    }
  }

  async function saveForm() {
    if (!nome.trim() || campos.length === 0) {
      alert('Preencha o nome e adicione pelo menos um campo');
      return;
    }

    try {
      setSaving(true);

      // Reordenar campos
      const camposOrdenados = campos.map((c, index) => ({ ...c, ordem: index + 1 }));

      if (isNew) {
        await supabase
          .from('pre_atendimento_forms')
          .insert({
            company_id: companyId,
            nome,
            descricao,
            ativo,
            campos: camposOrdenados,
          });
      } else {
        await supabase
          .from('pre_atendimento_forms')
          .update({
            nome,
            descricao,
            ativo,
            campos: camposOrdenados,
          })
          .eq('id', formId);
      }

      setSaving(false);
      onSave();
      onClose();

    } catch (error) {
      console.error('Erro:', error);
      setSaving(false);
    }
  }

  function addCampo() {
    setCampos([...campos, {
      id: `campo-${Date.now()}`,
      label: '',
      tipo: 'texto',
      obrigatorio: false,
      ordem: campos.length + 1,
    }]);
  }

  function removeCampo(index: number) {
    setCampos(campos.filter((_, i) => i !== index));
  }

  function updateCampo(index: number, key: keyof Campo, value: any) {
    const novos = [...campos];
    (novos[index] as any)[key] = value;
    setCampos(novos);
  }

  function addOpcao(index: number) {
    const novos = [...campos];
    if (!novos[index].opcoes) novos[index].opcoes = [];
    novos[index].opcoes!.push('');
    setCampos(novos);
  }

  function updateOpcao(campoIndex: number, opcaoIndex: number, valor: string) {
    const novos = [...campos];
    if (novos[campoIndex].opcoes) {
      novos[campoIndex].opcoes![opcaoIndex] = valor;
      setCampos(novos);
    }
  }

  function removeOpcao(campoIndex: number, opcaoIndex: number) {
    const novos = [...campos];
    if (novos[campoIndex].opcoes) {
      novos[campoIndex].opcoes = novos[campoIndex].opcoes!.filter((_, i) => i !== opcaoIndex);
      setCampos(novos);
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
            <FileText className="w-6 h-6 text-blue-500" />
            {isNew ? 'Novo Formulário' : 'Editar Formulário'}
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
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do Formulário *"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Formulário ativo</span>
            </label>
          </div>

          {/* Campos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Campos ({campos.length})</h3>
              <button
                onClick={addCampo}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {campos.map((campo, index) => (
                <div key={campo.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-2">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={campo.label}
                      onChange={(e) => updateCampo(index, 'label', e.target.value)}
                      placeholder="Label do campo..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => removeCampo(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 ml-8">
                    <select
                      value={campo.tipo}
                      onChange={(e) => updateCampo(index, 'tipo', e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-white"
                    >
                      <option value="texto">📝 Texto Curto</option>
                      <option value="textarea">📄 Texto Longo</option>
                      <option value="multipla_escolha">☑️ Múltipla Escolha</option>
                    </select>

                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={campo.obrigatorio}
                        onChange={(e) => updateCampo(index, 'obrigatorio', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-500 rounded"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Obrigatório</span>
                    </label>

                    {campo.tipo === 'multipla_escolha' && (
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={campo.multiplo || false}
                          onChange={(e) => updateCampo(index, 'multiplo', e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-500 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Seleção Múltipla</span>
                      </label>
                    )}
                  </div>

                  {(campo.tipo === 'texto' || campo.tipo === 'textarea') && (
                    <div className="ml-8">
                      <input
                        type="text"
                        value={campo.placeholder || ''}
                        onChange={(e) => updateCampo(index, 'placeholder', e.target.value)}
                        placeholder="Placeholder (opcional)"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {campo.tipo === 'multipla_escolha' && (
                    <div className="ml-8 space-y-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">Opções:</label>
                      {(campo.opcoes || []).map((opcao, opcaoIndex) => (
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
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Adicionar opção
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {campos.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhum campo adicionado</p>
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
            onClick={saveForm}
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
