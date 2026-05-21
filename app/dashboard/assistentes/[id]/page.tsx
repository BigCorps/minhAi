'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Globe, Lock, AlertCircle, Code } from 'lucide-react'; // Adicione 'Code'
import WidgetConfigModal from '@/components/dashboard/assistentes/WidgetConfigModal'; // Importe o modal
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
  const isVendas = assistant?.assistant_type === 'vendas';
  const [availableFunctions, setAvailableFunctions] = useState<{function_key: string; function_name: string; short_description?: string}[]>([]);
  const [startupFunctionKey, setStartupFunctionKey] = useState('');
  const [showStartupSuggestions, setShowStartupSuggestions] = useState(false);
  const [startupSuggestions, setStartupSuggestions] = useState<typeof availableFunctions>([]);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

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
        setStartupFunctionKey(data.startup_function_key ?? '');
      }

      // Carregar funções disponíveis para autocomplete
      const { data: fns } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, short_description')
        .eq('is_active', true)
        .order('function_name');
      if (fns) setAvailableFunctions(fns);
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
      tts_voice: formData.get('tts_voice') as string,
      modo_fila_enabled: formData.get('modo_fila_enabled') === 'on',
      modo_vendas_enabled: formData.get('modo_vendas_enabled') === 'on',
      modo_links_enabled: formData.get('modo_links_enabled') === 'on',
      startup_function_key: startupFunctionKey.trim() || null,
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
            <div className="flex flex-col gap-6">

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
              <div className="flex flex-col flex-1 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Voz e Ativação</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Wake word e mensagem de saudação</p>
                </div>
                <div className="flex flex-col flex-1 p-6 space-y-5">

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
                  <div className="flex flex-col flex-1">
                    <label htmlFor="greeting_message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mensagem de Saudação *
                    </label>
                    <textarea
                      id="greeting_message"
                      name="greeting_message"
                      required
                      rows={3}
                      defaultValue={assistant.greeting_message}
                      className="flex-1 w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition resize-none"
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

                  {/* Voz do Assistente */}
                  <div>
                    <label htmlFor="tts_voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Voz do Assistente
                    </label>
                    <select
                      id="tts_voice"
                      name="tts_voice"
                      defaultValue={assistant.tts_voice ?? 'pt-BR-Neural2-B'}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    >
                      <option value="pt-BR-Neural2-B">Masculino</option>
                      <option value="pt-BR-Neural2-A">Feminino</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Voz Neural de alta qualidade em português brasileiro.
                    </p>
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

              {/* Card: Função de Boas-vindas */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Função de Boas-vindas</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Função executada automaticamente quando um novo cliente é detectado pela câmera ou envia a primeira mensagem via Meta
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Função de inicialização
                    </label>
                    <input
                      type="text"
                      value={startupFunctionKey}
                      onChange={e => {
                        const val = e.target.value;
                        setStartupFunctionKey(val);
                        if (val.length > 0) {
                          const term = val.toLowerCase();
                          const filtered = availableFunctions.filter(fn =>
                            fn.function_key.includes(term) ||
                            fn.function_name.toLowerCase().includes(term)
                          );
                          setStartupSuggestions(filtered);
                          setShowStartupSuggestions(filtered.length > 0);
                        } else {
                          setShowStartupSuggestions(false);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowStartupSuggestions(false), 150)}
                      placeholder="Ex: modo_venda, minha_conta, agendar_compromisso..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition font-mono text-sm"
                    />
                    {showStartupSuggestions && (
                      <div className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10">
                        {startupSuggestions.map(fn => (
                          <button
                            key={fn.function_key}
                            type="button"
                            onMouseDown={() => {
                              setStartupFunctionKey(fn.function_key);
                              setShowStartupSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white transition"
                          >
                            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2">{fn.function_key}</span>
                            <span className="font-medium">{fn.function_name}</span>
                            {fn.short_description && (
                              <span className="text-gray-400 ml-2 text-xs">— {fn.short_description}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {startupFunctionKey && (
                      <button
                        type="button"
                        onClick={() => { setStartupFunctionKey(''); setShowStartupSuggestions(false); }}
                        className="mt-1 text-xs text-red-500 hover:text-red-600 transition"
                      >
                        Remover função de inicialização
                      </button>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {isVendas
                        ? 'Recomendado: modo_venda (abre catálogo) ou minha_conta (login do cliente)'
                        : 'Deixe em branco para desativar. Só executa quando presença é detectada pela câmera ou na primeira mensagem Meta.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card: Módulos */}
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Módulos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ative ou desative os módulos disponíveis no assistente</p>
                </div>
                <div className="p-6 space-y-3">

                  {/* Modo Fila — oculto na versão Vendas */}
                  {!isVendas && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <label htmlFor="modo_fila_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Modo Fila
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Gerenciamento de fila de atendimento
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="modo_fila_enabled"
                        name="modo_fila_enabled"
                        defaultChecked={assistant.modo_fila_enabled ?? false}
                        className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                      />
                    </div>
                  )}

                  {/* Modo Vendas — sempre ativo e travado na versão Vendas */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div>
                        <label htmlFor="modo_vendas_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Modo Vendas
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {isVendas ? 'Sempre ativo na versão Vendas' : 'Loja virtual e módulo de pedidos'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="modo_vendas_enabled"
                      name="modo_vendas_enabled"
                      defaultChecked={isVendas ? true : (assistant.modo_vendas_enabled ?? false)}
                      disabled={isVendas}
                      className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Link na Bio — oculto na versão Vendas */}
                  {!isVendas && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div>
                          <label htmlFor="modo_links_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Link na Bio
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Página pública de links da empresa
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="modo_links_enabled"
                        name="modo_links_enabled"
                        defaultChecked={assistant.modo_links_enabled ?? false}
                        className="h-5 w-5 ml-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                      />
                    </div>
                  )}

                  {/* Badge informativo versão Vendas */}
                  {isVendas && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Versão Vendas: Modo Fila e Link na Bio não estão disponíveis. O Modo Vendas é sempre ativo.
                      </p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

           {/* Botões de ação — largura total */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-bold shadow-lg shadow-blue-500/20"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Salvar Alterações
            </button>

            {/* NOVO: Botão do Widget */}
            <button
              type="button"
              onClick={() => setIsWidgetModalOpen(true)}
              className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition font-bold"
            >
              <Code className="w-5 h-5 mr-2 text-blue-500" />
              Inserir Widget no Site
            </button>

            <Link
              href="/dashboard/assistentes"
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition font-bold text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>

{/* NOVO: Componente do Modal */}
<WidgetConfigModal 
  isOpen={isWidgetModalOpen}
  onClose={() => setIsWidgetModalOpen(false)}
  company={assistant} // Passa o objeto completo carregado do banco aqui
  onUpdateSuccess={() => {
    // Recarrega os dados do assistente na página pai para atualizar o estado local instantaneamente
    router.refresh(); 
  }}
/>
      </div>
    </div>
  );
}

