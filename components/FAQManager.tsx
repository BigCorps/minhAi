'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { MessageSquare, Plus, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  variations: string[];
  category: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  function_key?: string | null;
  function_params?: Record<string, unknown> | null;
}

interface AvailableFunction {
  function_key: string;
  function_name: string;
  short_description?: string | null;
  icon?: string | null;
}

interface FAQManagerClientProps {
  companyId: string;
  isDark: boolean;
}

export function FAQManagerClient({ companyId, isDark }: FAQManagerClientProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    variations: '',
    category: '',
    is_active: true,
    function_key: '',
    function_params_raw: '',
  });
  const [availableFunctions, setAvailableFunctions] = useState<AvailableFunction[]>([]);
  const [functionSuggestions, setFunctionSuggestions] = useState<AvailableFunction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadFAQs();
  }, [companyId]);

  useEffect(() => {
    async function loadFunctions() {
      const { data } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, short_description, icon')
        .eq('is_active', true)
        .order('function_name');
      if (data) setAvailableFunctions(data);
    }
    loadFunctions();
  }, []);

  async function loadFAQs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_entries')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const variations = formData.variations
        .split('\n')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      let parsedParams: Record<string, unknown> | null = null;
      if (formData.function_params_raw.trim()) {
        try {
          parsedParams = JSON.parse(formData.function_params_raw);
        } catch {
          alert('JSON de parâmetros inválido. Verifique o formato.');
          return;
        }
      }

      const faqData = {
        company_id: companyId,
        question: formData.question,
        answer: formData.answer,
        variations,
        category: formData.category || null,
        is_active: formData.is_active,
        function_key: formData.function_key || null,
        function_params: parsedParams,
      };

      if (editingFaq) {
        const { error } = await supabase
          .from('faq_entries')
          .update(faqData)
          .eq('id', editingFaq.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('faq_entries')
          .insert(faqData);

        if (error) throw error;
      }

      closeModal();
      loadFAQs();
    } catch (error) {
      console.error('Erro ao salvar FAQ:', error);
      alert('Erro ao salvar FAQ. Tente novamente.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta FAQ?')) return;

    try {
      const { error } = await supabase
        .from('faq_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadFAQs();
    } catch (error) {
      console.error('Erro ao excluir FAQ:', error);
      alert('Erro ao excluir FAQ. Tente novamente.');
    }
  }

  async function toggleActive(faq: FAQ) {
    try {
      const { error } = await supabase
        .from('faq_entries')
        .update({ is_active: !faq.is_active })
        .eq('id', faq.id);

      if (error) throw error;
      loadFAQs();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }

  function openEditModal(faq: FAQ) {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      variations: faq.variations.join('\n'),
      category: faq.category || '',
      is_active: faq.is_active,
      function_key: faq.function_key || '',
      function_params_raw: faq.function_params
        ? JSON.stringify(faq.function_params, null, 2)
        : '',
    });
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingFaq(null);
    setShowSuggestions(false);
    setFormData({
      question: '',
      answer: '',
      variations: '',
      category: '',
      is_active: true,
      function_key: '',
      function_params_raw: '',
    });
  }

  function handleFunctionKeyChange(val: string) {
    setFormData(prev => ({ ...prev, function_key: val }));
    if (val.length > 0) {
      const term = val.replace('/', '').toLowerCase();
      const filtered = availableFunctions.filter(fn =>
        fn.function_key.includes(term) ||
        fn.function_name.toLowerCase().includes(term)
      );
      setFunctionSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectFunction(fn: AvailableFunction) {
    setFormData(prev => ({ ...prev, function_key: fn.function_key }));
    setShowSuggestions(false);
  }

  function clearFunction() {
    setFormData(prev => ({ ...prev, function_key: '', function_params_raw: '' }));
    setShowSuggestions(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-gray-200 dark:bg-slate-800/50"></div>
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-slate-800/50"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Botão */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all flex items-center justify-between ${
        isDark
          ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl'
          : 'bg-white border-gray-200'
      }`}>
        <div>
          <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Respostas Rápidas
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            {faqs.length} {faqs.length === 1 ? 'pergunta cadastrada' : 'perguntas cadastradas'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adicionar
        </button>
      </div>

      {/* Lista de FAQs */}
      {faqs.length === 0 ? (
        <div className={`rounded-2xl shadow-lg p-12 text-center border transition-all ${
          isDark
            ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl'
            : 'bg-white border-gray-200'
        }`}>
          <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Nenhuma FAQ cadastrada
          </h3>
          <p className={`mb-6 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            Comece adicionando perguntas frequentes e suas respostas
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl font-semibold transition-all shadow-lg active:scale-95"
          >
            + Adicionar Primeira FAQ
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`rounded-2xl shadow-md p-6 border transition-all ${
                isDark
                  ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl'
                  : 'bg-white border-gray-200'
              } ${!faq.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        isDark
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {faq.category}
                      </span>
                    )}
                    {faq.function_key && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                        isDark
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        ⚡ {faq.function_key}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      faq.is_active
                        ? isDark
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-green-100 text-green-800'
                        : isDark
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {faq.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <p className={`mb-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    {faq.answer}
                  </p>

                  {faq.variations.length > 0 && (
                    <div className="mt-3">
                      <p className={`text-sm mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Variações da pergunta:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {faq.variations.map((variation, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs rounded ${
                              isDark
                                ? 'bg-slate-800 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {variation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {faq.usage_count > 0 && (
                    <p className={`text-sm mt-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      Usada {faq.usage_count} {faq.usage_count === 1 ? 'vez' : 'vezes'}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(faq)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'text-white/60 hover:text-blue-400 hover:bg-blue-500/10'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={faq.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {faq.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(faq)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'text-white/60 hover:text-green-400 hover:bg-green-500/10'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'text-white/60 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${
            isDark
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingFaq ? 'Editar FAQ' : 'Adicionar Nova FAQ'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Pergunta */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Pergunta *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                  placeholder="Ex: Qual é o horário de funcionamento?"
                />
              </div>

              {/* Resposta */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Resposta *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={4}
                  required
                  placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
                />
              </div>

              {/* Variações */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Variações da Pergunta (uma por linha)
                </label>
                <textarea
                  value={formData.variations}
                  onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={3}
                  placeholder={'Ex:\nQue horas vocês abrem?\nHorário de atendimento\nQuando posso ir aí?'}
                />
              </div>

              {/* Categoria */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Ex: Atendimento, Produtos, Entrega"
                />
              </div>

              {/* Função vinculada */}
              <div className="relative">
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Função vinculada (opcional)
                </label>
                <input
                  type="text"
                  value={formData.function_key}
                  onChange={(e) => handleFunctionKeyChange(e.target.value)}
                  onFocus={() => {
                    if (formData.function_key.length > 0 && functionSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Digite para buscar uma função..."
                />
                {showSuggestions && (
                  <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto ${
                    isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200'
                  }`}>
                    {functionSuggestions.map(fn => (
                      <button
                        key={fn.function_key}
                        type="button"
                        onMouseDown={() => selectFunction(fn)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          isDark
                            ? 'hover:bg-slate-700 text-white'
                            : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        <span className="font-medium">{fn.function_name}</span>
                        {fn.short_description && (
                          <span className={`ml-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            — {fn.short_description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {formData.function_key && (
                  <button
                    type="button"
                    onClick={clearFunction}
                    className={`mt-1 text-xs ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                  >
                    Remover função vinculada
                  </button>
                )}
              </div>

              {/* Parâmetros da função — só aparece se tiver function_key */}
              {formData.function_key && (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    Parâmetros da função (JSON, opcional)
                  </label>
                  <textarea
                    value={formData.function_params_raw}
                    onChange={(e) => setFormData({ ...formData, function_params_raw: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border font-mono text-sm transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDark
                        ? 'bg-slate-800 border-white/10 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows={3}
                    placeholder={'{ "valor": 100, "descricao": "Pedido" }'}
                  />
                </div>
              )}

              {/* FAQ ativa */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_active" className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  FAQ ativa (responderá automaticamente)
                </label>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl font-semibold transition-all active:scale-95"
                >
                  {editingFaq ? 'Salvar Alterações' : 'Adicionar FAQ'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
