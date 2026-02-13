// components/FAQManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

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
}

interface FAQManagerProps {
  companyId: string;
}

export function FAQManager({ companyId }: FAQManagerProps) {
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
  });

  const supabase = createClient();

  useEffect(() => {
    loadFAQs();
  }, [companyId]);

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

      const faqData = {
        company_id: companyId,
        question: formData.question,
        answer: formData.answer,
        variations,
        category: formData.category || null,
        is_active: formData.is_active,
      };

      if (editingFaq) {
        // Atualizar FAQ existente
        const { error } = await supabase
          .from('faq_entries')
          .update(faqData)
          .eq('id', editingFaq.id);

        if (error) throw error;
      } else {
        // Criar nova FAQ
        const { error } = await supabase
          .from('faq_entries')
          .insert(faqData);

        if (error) throw error;
      }

      // Resetar formulário e recarregar lista
      setFormData({
        question: '',
        answer: '',
        variations: '',
        category: '',
        is_active: true,
      });
      setShowAddModal(false);
      setEditingFaq(null);
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
    });
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      variations: '',
      category: '',
      is_active: true,
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Respostas Rápidas (FAQs)
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-1">
            Configure perguntas frequentes e suas respostas automáticas
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
        >
          + Adicionar FAQ
        </button>
      </div>

      {/* Lista de FAQs */}
      {faqs.length === 0 ? (
        <div className="bg-white dark:bg-white/5 dark:border dark:border-white/10 rounded-xl shadow-md p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Nenhuma FAQ cadastrada
          </h3>
          <p className="text-gray-600 dark:text-white/60 mb-6">
            Comece adicionando perguntas frequentes e suas respostas
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition"
          >
            + Adicionar Primeira FAQ
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`bg-white dark:bg-white/5 dark:border dark:border-white/10 rounded-xl shadow-md p-6 transition ${
                !faq.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
                        {faq.category}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      faq.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {faq.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-white/70 mb-3">
                    {faq.answer}
                  </p>
                  {faq.variations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 dark:text-white/50 mb-2">
                        Variações da pergunta:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {faq.variations.map((variation, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded"
                          >
                            {variation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {faq.usage_count > 0 && (
                    <p className="text-sm text-gray-500 dark:text-white/50 mt-3">
                      Usada {faq.usage_count} {faq.usage_count === 1 ? 'vez' : 'vezes'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(faq)}
                    className="p-2 text-gray-600 dark:text-white/60 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    title={faq.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {faq.is_active ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(faq)}
                    className="p-2 text-gray-600 dark:text-white/60 hover:text-green-600 dark:hover:text-green-400 transition"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="p-2 text-gray-600 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 transition"
                    title="Excluir"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
          <div className="bg-white dark:bg-gray-900 dark:border dark:border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingFaq ? 'Editar FAQ' : 'Adicionar Nova FAQ'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                  Pergunta *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                  placeholder="Ex: Qual é o horário de funcionamento?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                  Resposta *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={4}
                  required
                  placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                  Variações da Pergunta (uma por linha)
                </label>
                <textarea
                  value={formData.variations}
                  onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Ex:&#10;Que horas vocês abrem?&#10;Horário de atendimento&#10;Quando posso ir aí?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Ex: Atendimento, Produtos, Entrega"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-green-600 dark:text-green-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-white/10 rounded focus:ring-green-500 dark:focus:ring-green-400"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-white/80">
                  FAQ ativa (responderá automaticamente)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition"
                >
                  {editingFaq ? 'Salvar Alterações' : 'Adicionar FAQ'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-semibold transition"
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