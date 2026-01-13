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
  companyName?: string;
}

// FAQs SUGERIDAS PADRÃO
const SUGGESTED_FAQS = [
  {
    category: 'Horário',
    question: 'Qual o horário de funcionamento?',
    answer: 'Funcionamos de segunda a sexta, das 9h às 18h.',
    variations: [
      'que horas abrem',
      'horário de atendimento',
      'quando funciona',
      'horario de funcionamento'
    ]
  },
  {
    category: 'Localização',
    question: 'Onde vocês ficam localizados?',
    answer: 'Estamos localizados na [Seu endereço completo].',
    variations: [
      'onde fica',
      'endereço',
      'localização',
      'como chegar'
    ]
  },
  {
    category: 'Contato',
    question: 'Como entrar em contato?',
    answer: 'Você pode nos contatar pelo telefone [seu telefone] ou email [seu email].',
    variations: [
      'telefone',
      'email',
      'whatsapp',
      'falar com vocês'
    ]
  },
  {
    category: 'Preços',
    question: 'Quais são os valores dos serviços?',
    answer: 'Nossos planos começam em R$ [valor]. Entre em contato para um orçamento personalizado.',
    variations: [
      'quanto custa',
      'preço',
      'valor',
      'orçamento'
    ]
  },
  {
    category: 'Pagamento',
    question: 'Quais formas de pagamento aceitam?',
    answer: 'Aceitamos cartão de crédito, débito, PIX e transferência bancária.',
    variations: [
      'como pagar',
      'aceita cartão',
      'aceita pix',
      'formas de pagamento'
    ]
  },
  {
    category: 'Agendamento',
    question: 'Como agendar um horário?',
    answer: 'Você pode agendar pelo nosso site, WhatsApp ou ligando diretamente.',
    variations: [
      'marcar horário',
      'fazer agendamento',
      'reservar',
      'agendar atendimento'
    ]
  },
];

export function FAQManager({ companyId, companyName = 'empresa' }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  
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
        setSelectedSuggestion(null);
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

  function useSuggestion(suggestion: any) {
    setSelectedSuggestion(suggestion);
    setFormData({
      question: suggestion.question,
      answer: suggestion.answer,
      variations: suggestion.variations.join('\n'),
      category: suggestion.category,
    });
    setShowNewForm(true);
    setShowSuggestions(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="text-center py-8">Carregando FAQs...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💬 Respostas Rápidas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure respostas automáticas para perguntas frequentes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Sugestões
          </button>
          <button
            onClick={() => {
              setShowNewForm(!showNewForm);
              setSelectedSuggestion(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova FAQ
          </button>
        </div>
      </div>

      {/* FAQs Sugeridas */}
      {showSuggestions && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-blue-900">💡 FAQs Sugeridas</h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Fechar
            </button>
          </div>
          <p className="text-sm text-blue-700">
            Clique em uma sugestão para personalizar e adicionar às suas FAQs
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {SUGGESTED_FAQS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => useSuggestion(suggestion)}
                className="text-left p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                    {suggestion.category}
                  </span>
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">
                  {suggestion.question}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {suggestion.answer}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulário Nova FAQ */}
      {showNewForm && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900">
              {selectedSuggestion ? '✏️ Personalize a FAQ' : '➕ Nova Resposta Rápida'}
            </h3>
            {selectedSuggestion && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Baseado em sugestão
              </span>
            )}
          </div>
          
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
              Resposta * <span className="text-xs text-gray-500">(personalize com os dados da sua {companyName})</span>
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
              💡 Adicione formas diferentes de fazer a mesma pergunta para o assistente entender melhor
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salvar FAQ
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setSelectedSuggestion(null);
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

      {/* Lista de FAQs */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          📋 Suas FAQs ({faqs.length})
        </h3>
        
        {faqs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="max-w-sm mx-auto">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-600 font-medium mb-2">Nenhuma FAQ cadastrada ainda</p>
              <p className="text-sm text-gray-500 mb-4">
                Comece adicionando respostas para as perguntas mais comuns dos seus clientes
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowSuggestions(true)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                >
                  Ver Sugestões
                </button>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-sm font-medium"
                >
                  Criar do Zero
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-gray-50 border rounded-xl p-5 ${
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
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900">{faq.question}</h4>
                          {faq.category && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {faq.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{faq.answer}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleToggleActive(faq.id, faq.is_active)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            faq.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {faq.is_active ? '✓ Ativa' : '○ Inativa'}
                        </button>
                        <button
                          onClick={() => startEdit(faq)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                          title="Deletar"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {faq.variations.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-semibold text-gray-600 mb-2">🔄 Variações reconhecidas:</p>
                        <div className="flex flex-wrap gap-2">
                          {faq.variations.map((v, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              "{v}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {faq.usage_count > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Usada {faq.usage_count}x pelos clientes
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dica de uso */}
      {faqs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">💡 Como funciona</p>
              <p className="text-blue-700">
                Quando um cliente fizer uma pergunta parecida com as FAQs cadastradas, o assistente responderá automaticamente em menos de 1 segundo! 
                As perguntas que não têm FAQ cadastrada serão respondidas pela IA (leva 2-3 segundos).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
