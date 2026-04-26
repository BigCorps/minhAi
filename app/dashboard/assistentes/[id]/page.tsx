'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Globe, Lock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditarAssistentePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<any>(null);

  useEffect(() => {
    async function loadAssistant() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Erro ao carregar assistente');
      } else {
        setAssistant(data);
      }
      setLoading(false);
    }

    loadAssistant();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const inactivityRaw = formData.get('inactivity_timeout_seconds') as string;
    const inactivitySeconds = parseInt(inactivityRaw, 10);

    const data = {
      name: formData.get('name') as string,
      logo_url: formData.get('logo_url') as string,
      wake_word: formData.get('wake_word') as string,
      greeting_message: formData.get('greeting_message') as string,
      assistant_role: formData.get('assistant_role') as string,
      hide_disabled_functions_carousel: formData.get('hide_disabled_functions_carousel') === 'on',
      carousel_auto_scroll: formData.get('carousel_auto_scroll') === 'on',
      assistant_avatar_type: formData.get('assistant_avatar_type') as string,
      wake_word_enabled: formData.get('wake_word_enabled') === 'on',
      // Novos campos — Fase 1
      presence_greeting_enabled: formData.get('presence_greeting_enabled') === 'on',
      inactivity_timeout_seconds: isNaN(inactivitySeconds) ? 300 : Math.min(3600, Math.max(30, inactivitySeconds)),
      inactivity_action: formData.get('inactivity_action') as string,
    };

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('companies')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      router.push('/dashboard/assistentes');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assistente não encontrado</h2>
          <Link href="/dashboard/assistentes" className="text-blue-600 hover:underline mt-2 inline-block">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <Link
          href="/dashboard/assistentes"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar para Assistentes
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Assistente</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edite as informações e comportamento do seu assistente virtual.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Grid de 2 colunas no desktop, 1 no mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── COLUNA ESQUERDA ── */}
            <div className="space-y-6">

              {/* Card: Identidade */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Identidade</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nome, logo e função do assistente</p>
                </div>
                <div className="p-6 space-y-5">

                  {/* Nome */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome do Assistente *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      defaultValue={assistant.name}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    />
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Link do Logo (URL da Imagem)
                    </label>
                    <input
                      type="url"
                      id="logo_url"
                      name="logo_url"
                      defaultValue={assistant.logo_url}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    />
                  </div>

                  {/* Função do Assistente */}
                  <div>
                    <label htmlFor="assistant_role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Função do Assistente *
                    </label>
                    <select
                      id="assistant_role"
                      name="assistant_role"
                      required
                      defaultValue={assistant.assistant_role || 'Assistente IA'}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    >
                      <option value="Assistente IA">Minha IA</option>
                      <option value="Assistente IA">Assistente IA</option>
                      <option value="Funcionário IA">Funcionário IA</option>
                      <option value="Atendente IA">Atendente IA</option>
                      <option value="Gerente IA">Gerente IA</option>
                      <option value="Auxiliar IA">Auxiliar IA</option>
                      <option value="Secretário IA">Secretário IA</option>
                      <option value="Operador IA">Operador IA</option>
                      <option value="Agente IA">Agente IA</option>
                      <option value="Coordenador IA">Vendedor IA</option>
                      <option value="Coordenador IA">Recepcionista IA</option>
                      <option value="Analista IA">Analista IA</option>
                      <option value="Consultor IA">Consultor IA</option>
                      <option value="Coordenador IA">Divulgador IA</option>
                      <option value="Coordenador IA">Coordenador IA</option>
                    </select>
                  </div>

                  {/* Visibilidade (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Visibilidade (definida na criação)
                    </label>
                    <div className="flex items-center p-4 rounded-xl border-2 border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                      {assistant.is_public ? (
                        <>
                          <Globe className="w-5 h-5 mr-3 text-green-500 shrink-0" />
                          <div>
                            <p className="font-bold text-sm">Público</p>
                            <p className="text-[10px] opacity-70">Acessível via link slug: {assistant.slug}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 mr-3 text-amber-500 shrink-0" />
                          <div>
                            <p className="font-bold text-sm">Privado</p>
                            <p className="text-[10px] opacity-70">Acessível apenas via link único de proprietário</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Voz e Ativação */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Voz e Ativação</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Wake word e mensagem de saudação</p>
                </div>
                <div className="p-6 space-y-5">

                  {/* Palavras de Ativação */}
                  <div>
                    <label htmlFor="wake_word" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Palavras de Ativação *
                    </label>
                    <input
                      type="text"
                      id="wake_word"
                      name="wake_word"
                      required
                      defaultValue={assistant.wake_word}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    />
                  </div>

                  {/* Mensagem de Ativação */}
                  <div>
                    <label htmlFor="greeting_message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mensagem de Ativação *
                    </label>
                    <textarea
                      id="greeting_message"
                      name="greeting_message"
                      required
                      rows={3}
                      defaultValue={assistant.greeting_message}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition resize-none"
                    />
                  </div>

                  {/* Wake Word Enabled */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                    <div>
                      <label htmlFor="wake_word_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ativação por palavra-chave
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Quando desativado, o assistente entra em escuta contínua (modo Alexa). Não recomendado para ambientes barulhentos.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="wake_word_enabled"
                      name="wake_word_enabled"
                      defaultChecked={assistant.wake_word_enabled ?? true}
                      className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ── COLUNA DIREITA ── */}
            <div className="space-y-6">

              {/* Card: Visual */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Visual</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avatar e carrossel de funções</p>
                </div>
                <div className="p-6 space-y-5">

                  {/* Avatar */}
                  <div>
                    <label htmlFor="assistant_avatar_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Avatar do Assistente
                    </label>
                    <select
                      id="assistant_avatar_type"
                      name="assistant_avatar_type"
                      defaultValue={assistant.assistant_avatar_type ?? 'face'}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    >
                      <option value="face">Rosto (expressões animadas)</option>
                      <option value="orb">Orbe (formato abstrato)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      O Rosto exibe olhos e expressões. O Orbe é mais minimalista e abstrato.
                    </p>
                  </div>

                  {/* Ocultar Funções Desabilitadas */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                    <div>
                      <label htmlFor="hide_disabled_functions_carousel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ocultar funções desabilitadas no carrossel
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Funções desabilitadas não aparecem no carrossel
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="hide_disabled_functions_carousel"
                      name="hide_disabled_functions_carousel"
                      defaultChecked={assistant.hide_disabled_functions_carousel ?? false}
                      className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>

                  {/* Rolagem Automática */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                    <div>
                      <label htmlFor="carousel_auto_scroll" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Carrossel com rolagem automática
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        O carrossel rola automaticamente de forma contínua
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="carousel_auto_scroll"
                      name="carousel_auto_scroll"
                      defaultChecked={assistant.carousel_auto_scroll ?? true}
                      className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Comportamento do Assistente — NOVO */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Comportamento do Assistente</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inatividade, presença e ações automáticas</p>
                </div>
                <div className="p-6 space-y-5">

                  {/* Saudação por Presença */}
                  <div className="flex items-start justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                    <div className="flex-1 pr-4">
                      <label htmlFor="presence_greeting_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Saudação automática por câmera
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Detecta a presença de uma pessoa pela câmera e reproduz a mensagem de ativação automaticamente, sem precisar da wake word.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="presence_greeting_enabled"
                      name="presence_greeting_enabled"
                      defaultChecked={assistant.presence_greeting_enabled ?? false}
                      className="h-5 w-5 mt-0.5 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>

                  {/* Tempo de Inatividade */}
                  <div>
                    <label htmlFor="inactivity_timeout_seconds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tempo de inatividade (segundos)
                    </label>
                    <input
                      type="number"
                      id="inactivity_timeout_seconds"
                      name="inactivity_timeout_seconds"
                      min={30}
                      max={3600}
                      defaultValue={assistant.inactivity_timeout_seconds ?? 300}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Após este tempo sem interação, a ação abaixo será executada. Mínimo: 30s · Máximo: 3600s (1h).
                    </p>
                  </div>

                  {/* Ação de Inatividade */}
                  <div>
                    <label htmlFor="inactivity_action" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ação ao detectar inatividade
                    </label>
                    <select
                      id="inactivity_action"
                      name="inactivity_action"
                      defaultValue={assistant.inactivity_action ?? 'feature_highlight'}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    >
                      <option value="feature_highlight">Exibir dica de função aleatória</option>
                      <option value="offers_panel">Abrir painel de ofertas</option>
                      <option value="restart">Reiniciar o assistente</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      "Painel de ofertas" requer a função <strong>Painel de Ofertas</strong> habilitada e configurada.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Botões de ação — largura total */}
          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-bold shadow-lg shadow-blue-500/20"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Salvar Alterações
            </button>
            <Link
              href="/dashboard/assistentes"
              className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition font-bold"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
