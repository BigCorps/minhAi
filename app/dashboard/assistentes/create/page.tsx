// app/dashboard/assistentes/create/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Globe, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  
  // 🆕 Estados para validação de slug
  const [slugValue, setSlugValue] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugError, setSlugError] = useState<string | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🆕 Verificar disponibilidade do slug
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
      
      // Verificar se slug já existe
      const { data, error } = await supabase
        .from('companies')
        .select('id, slug')
        .eq('slug', slug)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found (ok)
        console.error('Erro ao verificar slug:', error);
        setSlugStatus('idle');
        setSlugError('Erro ao verificar disponibilidade');
        return;
      }

      if (data) {
        // Slug já existe
        setSlugStatus('taken');
        setSlugError('Este slug já está em uso. Escolha outro.');
      } else {
        // Slug disponível
        setSlugStatus('available');
        setSlugError(null);
      }
    } catch (err) {
      console.error('Erro na verificação:', err);
      setSlugStatus('idle');
      setSlugError('Erro ao verificar disponibilidade');
    }
  };

  // 🆕 Debounce para não fazer request a cada letra
  useEffect(() => {
    if (!isPublic) {
      setSlugStatus('idle');
      setSlugError(null);
      return;
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (slugValue.length < 3) {
      setSlugStatus('idle');
      setSlugError(slugValue.length > 0 ? 'Slug deve ter no mínimo 3 caracteres' : null);
      return;
    }

    // Aguardar 500ms após parar de digitar
    checkTimeoutRef.current = setTimeout(() => {
      checkSlugAvailability(slugValue);
    }, 500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [slugValue, isPublic]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // 🆕 Validação final do slug antes de submeter
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

      // Inicializar funções padrão
      if (newCompanyId) {
        console.log('🔧 Inicializando funções padrão para empresa:', newCompanyId);
        
        const supabase = createClient();
        const { error: funcError } = await supabase.rpc('initialize_company_functions', {
          p_company_id: newCompanyId
        });

        if (funcError) {
          console.error('⚠️ Erro ao inicializar funções:', funcError);
        } else {
          console.log('✅ Funções padrão inicializadas com sucesso');
        }
      }

      router.push('/dashboard/assistentes');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  function generateSlug(name: string) {
    const generated = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return generated;
  }

  // 🆕 Ícone do status do slug
  const renderSlugStatusIcon = () => {
    if (!isPublic) return null;

    switch (slugStatus) {
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'taken':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

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
          <div className="px-8 py-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Novo Assistente
            </h1>
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
                    placeholder="Ex: Suporte eAi"
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
                        placeholder="suporte-eai"
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
                    
                    {/* 🆕 Feedback de validação */}
                    {slugStatus === 'available' && slugValue && (
                      <div className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Slug disponível! URL: <span className="ml-1 font-mono font-bold">minhai.app/ia/{slugValue}</span>
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
                  defaultValue="olá assistente"
                  placeholder="Ex: olá assistente, oi gerente"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                />
                <p className="mt-1 text-xs text-gray-500">Separe múltiplas palavras com vírgula (,)</p>
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
                  defaultValue="Olá! Como posso ajudar você hoje?"
                  placeholder="Frase que o assistente dirá ao ser ativado"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                disabled={loading || (isPublic && slugStatus !== 'available')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl transition font-bold shadow-lg ${
                  loading || (isPublic && slugStatus !== 'available')
                    ? 'bg-gray-400 cursor-not-allowed text-white/70'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Criar Assistente
              </button>
              <Link
                href="/dashboard/assistentes"
                className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition font-bold"
              >
                Cancelar
              </Link>
            </div>
            
            {/* 🆕 Aviso se slug não está disponível */}
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
          </form>
        </div>
      </div>
    </div>
  );
}
