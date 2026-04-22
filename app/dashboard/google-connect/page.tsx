'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';
import { Mail, Calendar, RefreshCw, CheckCircle, XCircle, Loader2, Image, HardDrive, Youtube } from 'lucide-react';

interface GoogleAccount {
  id: string;
  company_id: string;
  google_email: string;
  google_user_id: string;
  scopes: string[];
  is_active: boolean;
  expires_at: string;
  last_token_refresh: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  wake_word?: string;
}

function GoogleConnectPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');
  const popupRef = useRef<Window | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const supabase = createClient();

  useEffect(() => {
    if (companyIdFromUrl) {
      loadCompany(companyIdFromUrl);
      loadGoogleAccount(companyIdFromUrl);
    }
  }, [companyIdFromUrl]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (['google-auth-success', 'google-auth-error', 'google-auth-cancelled'].includes(event.data.type)) {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
          popupRef.current = null;
        }
      }

      if (event.data.type === 'google-auth-success') {
        console.log('✅ Autorização bem-sucedida:', event.data);
        if (companyIdFromUrl) {
          setTimeout(() => {
            loadGoogleAccount(companyIdFromUrl, true);
          }, 1000);
        }
        setConnecting(false);
      } else if (event.data.type === 'google-auth-error') {
        console.error('❌ Erro na autorização:', event.data.error);
        alert(`Erro ao conectar conta: ${event.data.error}`);
        setConnecting(false);
      } else if (event.data.type === 'google-auth-cancelled') {
        console.log('⚠️ Autorização cancelada pelo usuário');
        setConnecting(false);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [companyIdFromUrl]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  async function loadCompany(companyId: string) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, wake_word')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  }

  async function loadGoogleAccount(companyId: string, forceReload = false) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('google_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGoogleAccount(data);

      if (data && forceReload) {
        console.log('✅ Conta Google carregada após conexão');
      }
    } catch (error) {
      console.error('Erro ao carregar conta Google:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!companyIdFromUrl) {
      alert('ID da empresa não fornecido');
      return;
    }

    try {
      setConnecting(true);

      const { data, error } = await supabase.functions.invoke('google-auth-url', {
        body: { company_id: companyIdFromUrl },
      });

      if (error) throw error;

      const { auth_url } = data;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        auth_url,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      popupRef.current = popup;

      const interval = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnecting(false);
          setPollingInterval(null);
          await loadGoogleAccount(companyIdFromUrl, true);
        } else {
          const { data: accountData } = await supabase
            .from('google_accounts')
            .select('id')
            .eq('company_id', companyIdFromUrl)
            .eq('is_active', true)
            .maybeSingle();

          if (accountData) {
            popup?.close();
            clearInterval(interval);
            setPollingInterval(null);
            setConnecting(false);
            await loadGoogleAccount(companyIdFromUrl, true);
          }
        }
      }, 2000);

      setPollingInterval(interval);

    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      alert(`Erro ao iniciar conexão: ${error.message}`);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!companyIdFromUrl || !googleAccount) return;

    const confirm = window.confirm(
      'Tem certeza que deseja desconectar esta conta Google? ' +
      'Você não poderá mais usar os serviços Google até reconectar.'
    );

    if (!confirm) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('google_accounts')
        .update({ is_active: false })
        .eq('company_id', companyIdFromUrl);

      if (error) throw error;

      setGoogleAccount(null);
      alert('Conta desconectada com sucesso!');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      alert('Erro ao desconectar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshToken() {
    if (!companyIdFromUrl) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase.functions.invoke('google-refresh-token', {
        body: { company_id: companyIdFromUrl },
      });

      if (error) throw error;

      alert('Token renovado com sucesso!');
      loadGoogleAccount(companyIdFromUrl, true);
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      alert(`Erro ao renovar token: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isTokenExpired() {
    if (!googleAccount) return false;
    return new Date(googleAccount.expires_at) < new Date();
  }

  function getTimeUntilExpiry() {
    if (!googleAccount) return '';
    const now = new Date();
    const expiry = new Date(googleAccount.expires_at);
    const diff = expiry.getTime() - now.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 0) return 'Expirado';
    if (minutes < 60) return `${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  if (!companyIdFromUrl) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-8">
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center max-w-md">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Assistente não especificado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Acesse esta página a partir do painel para conectar uma conta Google.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Conexão com Google
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {company ? (
                <>Gerenciar conexão Google para <span className="font-semibold">{company.name}</span></>
              ) : (
                'Conecte sua conta Google para usar os serviços integrados'
              )}
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {!loading && (
            <>
              {/* Não Conectado */}
              {!googleAccount && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Conta Google Não Conectada
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Conecte sua conta Google para enviar emails, gerenciar seu calendário, ler arquivos no Drive e músicas e vídeos do YouTube com comandos simples.
                    </p>

                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Conectar com Google
                        </>
                      )}
                    </button>

                    {/* Permissões solicitadas */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Permissões que serão solicitadas:
                      </p>
                      <div className="grid md:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                          <span>Enviar emails (Gmail)</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <span>Gerenciar calendário e eventos</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <HardDrive className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                          <span>Ler arquivos (Google Drive)</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Youtube className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                          <span>Acessar vídeos (YouTube)</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C7.58 3 4 6.58 4 11c0 2.83 1.42 5.33 3.57 6.84L6 20h12l-1.57-2.16C18.58 16.33 20 13.83 20 11c0-4.42-3.58-8-8-8zm0 2c3.31 0 6 2.69 6 6 0 2.22-1.21 4.16-3 5.19V18H9v-1.81C7.21 15.16 6 13.22 6 11c0-3.31 2.69-6 6-6z"/>
                          </svg>
                          <span>Controlar dispositivos Smart Home</span>
                        </div>
                        {/* ✅ NOVO — Google Meet */}
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                            <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#00832d"/>
                            <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#0066da"/>
                            <path d="M15 10.5v3L17 15v-6l-2 1.5z" fill="#e94235"/>
                          </svg>
                          <span>Criar reuniões (Google Meet)</span>
                        </div>
                        {/* ✅ NOVO — Google Business */}
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Gerenciar perfil no Google Business</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conectado */}
              {googleAccount && (
                <div className="space-y-6">
                  {/* Status Card */}
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Conta Conectada
                          </h3>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">
                            {googleAccount.google_email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status do Token</p>
                        <p className={`font-semibold ${isTokenExpired() ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isTokenExpired() ? 'Expirado' : 'Válido'}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tempo até expirar</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{getTimeUntilExpiry()}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conectado em</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatDate(googleAccount.created_at)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Última renovação</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatDate(googleAccount.last_token_refresh)}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleRefreshToken}
                      disabled={refreshing}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Renovando...' : 'Renovar Token Agora'}
                    </button>
                  </div>

                  {/* Permissões Autorizadas */}
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Permissões Autorizadas
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/gmail.send') && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Enviar emails</span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/calendar') && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Acessar calendário</span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/calendar.events') && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Criar/editar eventos</span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/drive.file') && (
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <HardDrive className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Google Drive</span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/youtube.readonly') && (
                        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">YouTube</span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/sdm.service') && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C7.58 3 4 6.58 4 11c0 2.83 1.42 5.33 3.57 6.84L6 20h12l-1.57-2.16C18.58 16.33 20 13.83 20 11c0-4.42-3.58-8-8-8zm0 2c3.31 0 6 2.69 6 6 0 2.22-1.21 4.16-3 5.19V18H9v-1.81C7.21 15.16 6 13.22 6 11c0-3.31 2.69-6 6-6z"/>
                          </svg>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Smart Home</span>
                        </div>
                      )}
                      {/* ✅ NOVO — Google Meet */}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/meetings.space.created') && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#00832d"/>
                            <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#0066da"/>
                            <path d="M15 10.5v3L17 15v-6l-2 1.5z" fill="#e94235"/>
                          </svg>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Google Meet</span>
                        </div>
                      )}
                      {/* ✅ NOVO — Google Business Profile */}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/business.manage') && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Google Business</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoogleConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <GoogleConnectPageContent />
    </Suspense>
  );
}