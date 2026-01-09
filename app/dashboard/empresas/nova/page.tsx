'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
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
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar empresa');
      }

      router.push('/dashboard/empresas');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/empresas"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Voltar
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Nova Empresa
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                placeholder="Ex: Restaurante Bella Vista"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onChange={(e) => {
                  const slugInput = document.getElementById('slug') as HTMLInputElement;
                  if (slugInput) {
                    slugInput.value = generateSlug(e.target.value);
                  }
                }}
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
                placeholder="restaurante-bella-vista"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Será usado na URL pública: <strong>itend.com.br/oi/seu-slug</strong>
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
                defaultValue="olá assistente"
                placeholder="Ex: olá assistente, oi gerente, ei computador"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                ✨ <strong>Dica:</strong> Separe múltiplas palavras com vírgula (,)
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Exemplo: "olá assistente, oi gerente, ei sistema"
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  'olá assistente',
                  'oi gerente',
                  'ei sistema',
                  'olá assistente, oi gerente',
                  'atenção, ei computador'
                ].map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('wake_word') as HTMLInputElement;
                      if (input) input.value = word;
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition"
                  >
                    {word}
                  </button>
                ))}
              </div>
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
                defaultValue="Olá! Como posso ajudar você hoje?"
                placeholder="Ex: Olá! Como posso ajudar você hoje?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Frase que o assistente dirá após detectar as palavras de ativação
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
                rows={8}
                defaultValue="Você é um assistente virtual prestativo que ajuda os clientes. Responda de forma clara, objetiva e educada. Use um tom profissional e amigável."
                placeholder="Defina como o assistente deve se comportar, que informações ele tem acesso, como deve responder..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Instruções que definem o comportamento do assistente. Seja específico sobre o que ele deve fazer.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Criando...' : 'Criar Empresa'}
            </button>
            <Link
              href="/dashboard/empresas"
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
