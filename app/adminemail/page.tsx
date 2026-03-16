// app/adminemail/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Mail, RefreshCw, CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react';

interface SystemEmailAccount {
  id: string;
  google_email: string;
  google_user_id: string;
  scopes: string[];
  is_active: boolean;
  expires_at: string;
  last_token_refresh: string;
  created_at: string;
}

function AdminEmailContent() {
  const [account, setAccount] = useState<SystemEmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // Verificar auth
  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) setAuthed(true);
    else setAuthed(false);
    setLoading(false); // ← ADICIONAR esta linha
  });
}, []);

  // Carregar conta sistema
  useEffect(() => {
    if (authed) loadAccount();
  }, [authed]);

  // Escutar popup OAuth
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data.type === 'google-auth-success') {
        setTimeout(() => loadAccount(true), 1000);
        setConnecting(false);
      } else if (event.data.type === 'google-auth-error') {
        alert(`Erro ao conectar: ${event.data.error}`);
        setConnecting(false);
      } else if (event.data.type === 'google-auth-cancelled') {
        setConnecting(false);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    return () => { if (pollingInterval) clearInterval(pollingInterval); };
  }, [pollingInterval]);

  async function loadAccount(forceReload = false) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_email_account')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setAccount(data);
      if (data && forceReload) console.log('✅ Conta sistema carregada');
    } catch (err) {
      console.error('Erro ao carregar conta sistema:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('google-auth-url', {
        body: { is_system: true },   // ← sem company_id
      });
      if (error) throw error;

      const { auth_url } = data;
      const width = 600, height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(auth_url, 'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`);

      const interval = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnecting(false);
          setPollingInterval(null);
          await loadAccount(true);
        } else {
          const { data: acc } = await supabase
            .from('system_email_account')
            .select('id')
            .eq('is_active', true)
            .maybeSingle();
          if (acc) {
            popup?.close();
            clearInterval(interval);
            setPollingInterval(null);
            setConnecting(false);
            await loadAccount(true);
          }
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (err: any) {
      alert(`Erro ao iniciar conexão: ${err.message}`);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar a conta de email do sistema eAi?')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('system_email_account')
        .update({ is_active: false })
        .eq('is_active', true);
      if (error) throw error;
      setAccount(null);
    } catch (err) {
      alert('Erro ao desconectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshToken() {
    try {
      setRefreshing(true);
      const { error } = await supabase.functions.invoke('google-refresh-token', {
        body: { is_system: true },   // ← sem company_id
      });
      if (error) throw error;
      await loadAccount(true);
      alert('Token renovado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao renovar token: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  function isTokenExpired() {
    if (!account) return false;
    return new Date(account.expires_at) < new Date();
  }

  function getTimeUntilExpiry() {
    if (!account) return '';
    const diff = new Date(account.expires_at).getTime() - Date.now();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 0) return 'Expirado';
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // Não autenticado
  if (!authed && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-12 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Acesso Restrito</h3>
          <p className="text-slate-400">Faça login para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Email do Sistema eAi</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13">
            Conta Gmail usada para envio de emails transacionais (indicações, confirmações de PIX, etc.)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !account ? (
          /* Não conectado */
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhuma conta conectada</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Conecte a conta <span className="text-blue-400 font-medium">@gmail.com</span> para habilitar envio de emails transacionais.
            </p>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectar @gmail.com
                </>
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-slate-700 text-left">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Permissão solicitada</p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Enviar emails via Gmail (gmail.send)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Conectado */
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Conta Conectada</h3>
                    <p className="text-blue-400 font-medium text-sm">{account.google_email}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status do Token', value: isTokenExpired() ? 'Expirado' : 'Válido', color: isTokenExpired() ? 'text-red-400' : 'text-green-400' },
                  { label: 'Expira em', value: getTimeUntilExpiry(), color: 'text-white' },
                  { label: 'Conectado em', value: formatDate(account.created_at), color: 'text-white' },
                  { label: 'Última renovação', value: account.last_token_refresh ? formatDate(account.last_token_refresh) : '—', color: 'text-white' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`font-semibold text-sm ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Renovando...' : 'Renovar Token Agora'}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Permissões Ativas</p>
              {account.scopes.includes('https://www.googleapis.com/auth/gmail.send') && (
                <div className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white">Enviar emails (gmail.send)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AdminEmailContent />
    </Suspense>
  );
}