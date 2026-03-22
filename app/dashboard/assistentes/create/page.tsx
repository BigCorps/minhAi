// app/dashboard/assistentes/create/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Globe, Lock, CheckCircle, XCircle, AlertCircle, Sparkles, Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import SetupAssistantChat from '@/components/dashboard/SetupAssistantChat';
import { usePlayText } from '@/hooks/usePlayText';

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const { playText } = usePlayText();

  // ── Slug validation ──────────────────────────────────────
  const [slugValue, setSlugValue] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugError, setSlugError] = useState<string | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Setup bot ────────────────────────────────────────────
  const [showSetupBot, setShowSetupBot] = useState(false);
  const [setupCompanyId, setSetupCompanyId] = useState<string | null>(null);
  const [setupCompanyName, setSetupCompanyName] = useState('');
  const [setupSlug, setSetupSlug] = useState('');

  // ── Tema da página ───────────────────────────────────────
  const [pageTheme, setPageTheme] = useState<'dark' | 'light'>('light');
  useEffect(() => {
    const detect = () => {
      setPageTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      setSlugError(null);
      return;
    }
    setSlugStatus('checking');
    setSlugError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('companies')
        .select('id, slug')
        .eq('slug', slug)
        .single();

      if (error && error.code !== 'PGRST116') {
        setSlugStatus('idle');
        setSlugError('Erro ao verificar disponibilidade');
        return;
      }

      if (data) {
        setSlugStatus('taken');
        setSlugError('Este slug já está em uso. Escolha outro.');
      } else {
        setSlugStatus('available');
        setSlugError(null);
      }
    } catch {
      setSlugStatus('idle');
      setSlugError('Erro ao verificar disponibilidade');
    }
  };

  useEffect(() => {
    if (!isPublic) { setSlugStatus('idle'); setSlugError(null); return; }
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    if (slugValue.length < 3) {
      setSlugStatus('idle');
      setSlugError(slugValue.length > 0 ? 'Slug deve ter no mínimo 3 caracteres' : null);
      return;
    }
    checkTimeoutRef.current = setTimeout(() => checkSlugAvailability(slugValue), 500);
    return () => { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current); };
  }, [slugValue, isPublic]);

  // ── Criar assistente (manual) ────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPublic && slugStatus !== 'available') {
      setError('Por favor, escolha um slug disponível antes de continuar.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      slug: isPublic ? (formData.get('slug') as string) : '',
      logo_url: formData.get('logo_url') as string,
      wake_word: formData.get('wake_word') as string,
      greeting_message: formData.get('greeting_message') as string,
      is_public: isPublic,
    };

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar assistente');
      }

      const result = await response.json();
      const newCompanyId = result.company?.id;

      if (newCompanyId) {
        const supabase = createClient();
        const { error: funcError } = await supabase.rpc('initialize_company_functions', {
          p_company_id: newCompanyId,
        });
        if (funcError) console.error('⚠️ Erro ao inicializar funções:', funcError);
        else console.log('✅ Funções padrão inicializadas');
      }

      router.push('/dashboard/assistentes');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ── Criar assistente via bot ─────────────────────────────
  async function handleCriarComIA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPublic && slugStatus !== 'available') {
      setError('Por favor, escolha um slug disponível antes de continuar.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = isPublic ? (formData.get('slug') as string) : '';

    const data = {
      name,
      slug,
      logo_url: formData.get('logo_url') as string,
      wake_word: formData.get('wake_word') as string || 'olá assistente',
      greeting_message: formData.get('greeting_message') as string || 'Olá! Como posso ajudar você hoje?',
      is_public: isPublic,
    };

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar assistente');
      }

      const result = await response.json();
      const newCompanyId = result.company?.id;

      if (newCompanyId) {
        // Inicializar funções padrão
        const supabase = createClient();
        await supabase.rpc('initialize_company_functions', { p_company_id: newCompanyId });

        // Abrir o bot de setup
        setSetupCompanyId(newCompanyId);
        setSetupCompanyName(name);
        setSetupSlug(slug);
        setShowSetupBot(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
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

  const renderSlugStatusIcon = () => {
    if (!isPublic) return null;
    switch (slugStatus) {
      case 'checking': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'available': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'taken': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const canSubmit = !loading && (!isPublic || slugStatus === 'available');

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/dashboard/assistentes"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar para Assistentes
        </Link>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">

          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Assistente</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure as informações básicas do seu novo assistente virtual.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Nome e Slug */}
              <div className={`grid ${isPublic ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Assistente *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Ex: Assistente da Pizzaria"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                    onChange={(e) => {
                      if (isPublic) {
                        const generated = generateSlug(e.target.value);
                        setSlugValue(generated);
                        const slugInput = document.getElementById('slug') as HTMLInputElement;
                        if (slugInput) slugInput.value = generated;
                      }
                    }}
                  />
                </div>

                {isPublic && (
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Slug (URL Pública) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        required={isPublic}
                        placeholder="assistente-da-pizzaria"
                        value={slugValue}
                        onChange={(e) => setSlugValue(e.target.value)}
                        className={`w-full px-4 py-2.5 pr-12 bg-white dark:bg-slate-900 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white font-mono text-sm transition ${
                          slugStatus === 'available'
                            ? 'border-green-500 dark:border-green-500'
                            : slugStatus === 'taken'
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-300 dark:border-white/10'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {renderSlugStatusIcon()}
                      </div>
                    </div>
                    {slugStatus === 'available' && slugValue && (
                      <div className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Slug disponível! URL: <span className="ml-1 font-mono font-bold">eai.app.br/ia/{slugValue}</span>
                      </div>
                    )}
                    {slugError && (
                      <div className="mt-2 flex items-start text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                        <span>{slugError}</span>
                      </div>
                    )}
                    {slugStatus === 'checking' && slugValue && (
                      <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Verificando disponibilidade...
                      </div>
                    )}
                  </div>
                )}
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
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                />
              </div>

              {/* Visibilidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Visibilidade do Assistente
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isPublic
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                        : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500'
                    }`}
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <p className="font-bold text-sm">Público</p>
                      <p className="text-[10px] opacity-70">Acessível via link slug</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      !isPublic
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500'
                    }`}
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <p className="font-bold text-sm">Privado</p>
                      <p className="text-[10px] opacity-70">Acessível via link único</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Wake word */}
              <div>
                <label htmlFor="wake_word" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Palavras de Ativação *
                </label>
                <input
                  type="text"
                  id="wake_word"
                  name="wake_word"
                  required
                  defaultValue="olá assistente"
                  placeholder="Ex: olá assistente, oi gerente"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                />
                <p className="mt-1 text-xs text-gray-500">Separe múltiplas palavras com vírgula (,)</p>
              </div>

              {/* Greeting */}
              <div>
                <label htmlFor="greeting_message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem de Ativação *
                </label>
                <textarea
                  id="greeting_message"
                  name="greeting_message"
                  required
                  rows={3}
                  defaultValue="Olá! Como posso ajudar você hoje?"
                  placeholder="Frase que o assistente dirá ao ser ativado"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                />
              </div>
            </div>

            {/* ── Botões ─────────────────────────────────────────── */}
            <div className="mt-8 space-y-3">

              {/* Botão principal: Criar com IA */}
              <button
                type="button"
                disabled={!canSubmit}
                onClick={(e) => {
                  // Pegar form via closest
                  const form = (e.currentTarget as HTMLElement).closest('form') as HTMLFormElement;
                  if (form) handleCriarComIA({ ...e, currentTarget: form, preventDefault: () => {} } as any);
                }}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-xl transition font-bold shadow-lg text-white ${
                  !canSubmit
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-purple-500/20'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Criar e Configurar com IA
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                <span className="text-xs text-gray-400 dark:text-white/30">ou</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
              </div>

              {/* Linha inferior: Criar manual + Cancelar */}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl transition font-bold ${
                    !canSubmit
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-white/70'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Criar sem configurar
                </button>
                <Link
                  href="/dashboard/assistentes"
                  className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition font-bold"
                >
                  Cancelar
                </Link>
              </div>
            </div>

            {/* Aviso slug */}
            {isPublic && slugStatus !== 'available' && slugValue.length >= 3 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {slugStatus === 'taken'
                      ? 'Este slug já está em uso. Escolha outro nome para continuar.'
                      : 'Aguarde a verificação do slug para poder criar o assistente.'}
                  </p>
                </div>
              </div>
            )}

            {/* Explicação dos botões */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Criar e Configurar com IA</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Nosso assistente vai recomendar as melhores funções para o seu ramo de atividade e configurar tudo por você — WhatsApp, endereço, horários e muito mais — tudo por conversa.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Modal do Setup Bot ─────────────────────────────── */}
      {showSetupBot && setupCompanyId && (
        <SetupAssistantChat
          companyId={setupCompanyId}
          companyName={setupCompanyName}
          slug={setupSlug}
          theme={pageTheme}
          playText={playText}
          onClose={() => {
            setShowSetupBot(false);
            router.push('/dashboard/assistentes');
            router.refresh();
          }}
          onConcluido={() => {
            router.push('/dashboard/assistentes');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
