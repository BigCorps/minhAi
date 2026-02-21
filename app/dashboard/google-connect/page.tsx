'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { Mail, Calendar, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

export default function GoogleConnectPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const supabase = createClient();

  // Carregar empresas
  useEffect(() => {
    loadCompanies();
  }, []);

  // Carregar conta Google quando empresa selecionada
  useEffect(() => {
    if (selectedCompanyId) {
      loadGoogleAccount(selectedCompanyId);
    } else {
      setGoogleAccount(null);
    }
  }, [selectedCompanyId]);

  // Escutar mensagens do popup OAuth
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data.type === 'google-auth-success') {
        console.log('✅ Autorização bem-sucedida:', event.data);
        if (selectedCompanyId) {
          setTimeout(() => {
            loadGoogleAccount(selectedCompanyId, true);
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
  }, [selectedCompanyId]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, wake_word')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);

      // Auto-selecionar primeira empresa se houver apenas uma
      if (data && data.length === 1) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  }

  async function loadGoogleAccount(companyId: string, forceReload = false) {
    try {
      if (forceReload) {
        setLoading(true);
      } else {
        setLoading(true);
      }
      
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
    if (!selectedCompanyId) {
      alert('Selecione um assistente primeiro');
      return;
    }

    try {
      setConnecting(true);

      // Chamar Edge Function para gerar URL de autorização
      const { data, error } = await supabase.functions.invoke('google-auth-url', {
        body: { company_id: selectedCompanyId },
      });

      if (error) throw error;

      const { auth_url } = data;

      // Abrir popup de autorização
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        auth_url,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Iniciar polling para verificar se a conta foi conectada
      const interval = setInterval(async () => {
        // Verificar se popup ainda está aberto
        if (popup?.closed) {
          clearInterval(interval);
          setConnecting(false);
          setPollingInterval(null);
          // Verificar uma última vez se conectou
          await loadGoogleAccount(selectedCompanyId, true);
        } else {
          // Verificar se conectou (sem mostrar loading)
          const { data: accountData } = await supabase
            .from('google_accounts')
            .select('id')
            .eq('company_id', selectedCompanyId)
            .eq('is_active', true)
            .maybeSingle();
          
          if (accountData) {
            // Conectou! Fechar popup e recarregar
            popup?.close();
            clearInterval(interval);
            setPollingInterval(null);
            setConnecting(false);
            await loadGoogleAccount(selectedCompanyId, true);
          }
        }
      }, 2000); // Verificar a cada 2 segundos

      setPollingInterval(interval);

    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      alert(`Erro ao iniciar conexão: ${error.message}`);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!selectedCompanyId || !googleAccount) return;

    const confirm = window.confirm(
      'Tem certeza que deseja desconectar esta conta Google? ' +
      'Você não poderá mais enviar emails ou criar eventos no calendário até reconectar.'
    );

    if (!confirm) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('google_accounts')
        .update({ is_active: false })
        .eq('company_id', selectedCompanyId);

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
    if (!selectedCompanyId) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase.functions.invoke('google-refresh-token', {
        body: { company_id: selectedCompanyId },
      });

      if (error) throw error;

      alert('Token renovado com sucesso!');
      loadGoogleAccount(selectedCompanyId, true);
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
              Conecte sua conta Google para enviar emails e gerenciar calendário
            </p>
          </div>

          {/* Seletor de Assistente */}
          <div className="mb-6 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Selecione o Assistente
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-white text-gray-900 border-gray-300 dark:bg-slate-800 dark:text-white dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um assistente...</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name} {company.wake_word ? `(${company.wake_word})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {loading && selectedCompanyId && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Status da Conexão */}
          {!loading && selectedCompanyId && (
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
                      Conecte sua conta Google para habilitar envio de emails e 
                      gerenciamento de calendário por voz.
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

                    {/* Permissões */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Permissões que serão solicitadas:
                      </p>
                      <div className="grid md:grid-cols-2 gap-3 text-left max-w-md mx-auto">
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                          <span>Enviar e ler emails (Gmail)</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <span>Gerenciar calendário e eventos</span>
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

                    {/* Informações */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Status do Token
                        </p>
                        <p className={`font-semibold ${
                          isTokenExpired() 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {isTokenExpired() ? 'Expirado' : 'Válido'}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Tempo até expirar
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {getTimeUntilExpiry()}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Conectado em
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(googleAccount.created_at)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Última renovação
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(googleAccount.last_token_refresh)}
                        </p>
                      </div>
                    </div>

                    {/* Botão Renovar Token */}
                    <button
                      onClick={handleRefreshToken}
                      disabled={refreshing}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Renovando...' : 'Renovar Token Agora'}
                    </button>
                  </div>

                  {/* Permissões Ativas */}
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Permissões Autorizadas
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/gmail.send') && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Enviar emails
                          </span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/gmail.readonly') && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Ler emails
                          </span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/calendar') && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Acessar calendário
                          </span>
                        </div>
                      )}
                      {googleAccount.scopes.includes('https://www.googleapis.com/auth/calendar.events') && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Criar/editar eventos
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sem assistente selecionado */}
          {!selectedCompanyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Selecione um assistente para gerenciar a conexão Google
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
