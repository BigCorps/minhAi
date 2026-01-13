'use client';

import { useState, useEffect } from 'react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  variations: string[];
  category: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface FAQManagerProps {
  companyId: string;
}

export function FAQManager({ companyId }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    variations: '',
    category: '',
  });

  useEffect(() => {
    loadFAQs();
  }, [companyId]);

  async function loadFAQs() {
    try {
      const response = await fetch(`/api/faq?companyId=${companyId}`);
      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const response = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          question: formData.question,
          answer: formData.answer,
          variations: formData.variations.split('\n').filter(v => v.trim()),
          category: formData.category || null,
        }),
      });

      if (response.ok) {
        setFormData({ question: '', answer: '', variations: '', category: '' });
        setShowNewForm(false);
        loadFAQs();
      }
    } catch (error) {
      console.error('Erro ao criar FAQ:', error);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const faq = faqs.find(f => f.id === id);
      if (!faq) return;

      const response = await fetch('/api/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          question: formData.question || faq.question,
          answer: formData.answer || faq.answer,
          variations: formData.variations 
            ? formData.variations.split('\n').filter(v => v.trim())
            : faq.variations,
          category: formData.category || faq.category,
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setFormData({ question: '', answer: '', variations: '', category: '' });
        loadFAQs();
      }
    } catch (error) {
      console.error('Erro ao atualizar FAQ:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta FAQ?')) return;

    try {
      const response = await fetch(`/api/faq?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadFAQs();
      }
    } catch (error) {
      console.error('Erro ao deletar FAQ:', error);
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      await fetch('/api/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: !currentStatus,
        }),
      });
      loadFAQs();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  }

  function startEdit(faq: FAQ) {
    setEditingId(faq.id);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      variations: faq.variations.join('\n'),
      category: faq.category || '',
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Respostas Rápidas (FAQ)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crie respostas automáticas para perguntas frequentes
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova FAQ
        </button>
      </div>

      {showNewForm && (
        <div className="bg-white border-2 border-orange-200 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-900">Nova Resposta Rápida</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pergunta Principal *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Ex: Qual o horário de funcionamento?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resposta *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variações da Pergunta (uma por linha)
            </label>
            <textarea
              value={formData.variations}
              onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
              placeholder="que horas abrem&#10;horário de atendimento&#10;quando funciona"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Adicione formas diferentes de fazer a mesma pergunta
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria (opcional)
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Horário, Preços, Localização"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!formData.question || !formData.answer}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salvar
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setFormData({ question: '', answer: '', variations: '', category: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {faqs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-600">Nenhuma FAQ cadastrada ainda</p>
            <p className="text-sm text-gray-500 mt-1">Clique em "Nova FAQ" para começar</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <div
              key={faq.id}
              className={`bg-white border rounded-xl p-6 ${
                !faq.is_active ? 'opacity-50' : ''
              }`}
            >
              {editingId === faq.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    value={formData.variations}
                    onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
                    rows={2}
                    placeholder="Variações (uma por linha)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdate(faq.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setFormData({ question: '', answer: '', variations: '', category: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{faq.question}</h3>
                      {faq.category && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(faq.id, faq.is_active)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          faq.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {faq.is_active ? 'Ativa' : 'Inativa'}
                      </button>
                      <button
                        onClick={() => startEdit(faq)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{faq.answer}</p>

                  {faq.variations.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Variações:</p>
                      <div className="flex flex-wrap gap-2">
                        {faq.variations.map((v, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-white text-gray-600 text-xs rounded border"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {faq.usage_count > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                      Usada {faq.usage_count}x
                    </p>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
