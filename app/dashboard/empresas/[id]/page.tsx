'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    async function loadCompany() {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        setCompany(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      wake_word: formData.get('wake_word') as string,
      greeting_message: formData.get('greeting_message') as string,
      system_prompt: formData.get('system_prompt') as string,
    };

    try {
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId);

      if (error) throw error;

      router.push('/dashboard/empresas');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      router.push('/dashboard/empresas');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Empresa não encontrada</h1>
          <Link
            href="/dashboard/empresas"
            className="text-primary-green hover:text-primary-green-dark"
          >
            ← Voltar para Empresas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="iTend" 
                  width={150} 
                  height={68}
                  className="rounded-lg cursor-pointer"
                />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                Editar Empresa
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard/empresas"
          className="inline-flex items-center text-primary-green hover:text-primary-green-dark mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para Empresas
        </Link>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={company.name}
                placeholder="Ex: Restaurante Bella Vista"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-900 mb-2">
                Slug (identificador único) *
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                defaultValue={company.slug}
                placeholder="restaurante-bella-vista"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL pública: <strong>itend.com.br/oi/{company.slug}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="wake_word" className="block text-sm font-medium text-gray-900 mb-2">
                Palavras de Ativação *
              </label>
              <input
                type="text"
                id="wake_word"
                name="wake_word"
                required
                defaultValue={company.wake_word}
                placeholder="Ex: olá assistente, oi gerente"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                ✨ <strong>Dica:</strong> Separe múltiplas palavras com vírgula (,)
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Exemplo: "olá assistente, oi gerente, ei sistema"
              </p>
            </div>

            <div>
              <label htmlFor="greeting_message" className="block text-sm font-medium text-gray-900 mb-2">
                Mensagem de Saudação *
              </label>
              <textarea
                id="greeting_message"
                name="greeting_message"
                required
                rows={3}
                defaultValue={company.greeting_message}
                placeholder="Ex: Olá! Como posso ajudar você hoje?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Frase após detectar palavras de ativação
              </p>
            </div>

            <div>
              <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-900 mb-2">
                Prompt do Assistente (Instruções) *
              </label>
              <textarea
                id="system_prompt"
                name="system_prompt"
                required
                rows={10}
                defaultValue={company.system_prompt || 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.'}
                placeholder="Defina como o assistente deve se comportar..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-green focus:border-transparent font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Instruções que definem o comportamento do assistente
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Excluir Empresa
            </button>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/empresas"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}