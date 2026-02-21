'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConnectionManager.tsx
// Adaptado do Poupeja para o eAi (Next.js App Router)
// Diferenças:
// - Usa createClient de @/lib/supabase-browser (padrão eAi)
// - Seletor de company (assistente) para vincular a conexão
// - Toggle de agent_enabled por conexão
// - state inclui company_id (user_uuid:company_uuid:random)
// - Redirect URI aponta para /auth/callback/facebook

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  AlertCircle,
  Instagram,
  Facebook,
  CheckCircle,
  Trash2,
  Phone,
  Share2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase-browser';

type Company = { id: string; name: string; slug: string };

type MetaConnection = {
  id: string;
  company_id: string;
  meta_page_id: string;
  page_name: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
  whatsapp_number_id: string | null;
  whatsapp_number: string | null;
  agent_enabled: boolean;
  credits_per_reply_facebook: number;
  credits_per_reply_instagram: number;
  credits_per_reply_whatsapp: number;
  created_at: string;
};

export function ConnectionManager() {
  const { toast } = useToast();
  const supabase = createClient();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------
  // Carregar companies do usuário
  // -------------------------------------------------------------------
  useEffect(() => {
    async function loadCompanies() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (data && data.length > 0) {
        setCompanies(data);
        setSelectedCompanyId(data[0].id);
      }
    }
    loadCompanies();
  }, []);

  // -------------------------------------------------------------------
  // Buscar conexões do assistente selecionado
  // -------------------------------------------------------------------
  const fetchConnections = useCallback(async (companyId?: string) => {
    const id = companyId || selectedCompanyId;
    if (!id) { setIsLoading(false); return []; }

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setConnections(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    setIsLoading(true);
    fetchConnections();
  }, [selectedCompanyId, fetchConnections]);

  // Realtime
  useEffect(() => {
    if (!selectedCompanyId) return;

    const channel = supabase
      .channel('meta_connections_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meta_connections',
        filter: `company_id=eq.${selectedCompanyId}`,
      }, () => { fetchConnections(); stopPolling(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCompanyId, fetchConnections]);

  // Window focus → recarregar
  useEffect(() => {
    const onFocus = () => fetchConnections();
    const onVisibility = () => { if (!document.hidden) fetchConnections(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchConnections]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const found = await fetchConnections();
      if (found && found.length > 0) stopPolling();
    }, 5000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    if (!isLoading && connections.length === 0) startPolling();
    else stopPolling();
    return stopPolling;
  }, [connections.length, isLoading]);

  // -------------------------------------------------------------------
  // Iniciar OAuth com Meta
  // -------------------------------------------------------------------
  const handleConnect = async () => {
    if (!selectedCompanyId) {
      toast({ title: 'Selecione um assistente', description: 'Escolha qual assistente receberá esta conexão.', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
      if (!META_APP_ID) throw new Error('META_APP_ID não configurado');

      // state = user_uuid:company_uuid:random (para identificação no callback)
      const state = `${user.id}:${selectedCompanyId}:${crypto.randomUUID().substring(0, 8)}`;
      const redirectUri = `${window.location.origin}/auth/callback/facebook`;

      const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
        'instagram_basic',
        'instagram_manage_messages',
        'whatsapp_business_management',
        'whatsapp_business_messaging',
      ].join(',');

      const oauthUrl =
        `https://www.facebook.com/v19.0/dialog/oauth` +
        `?client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code`;

      // Tentar popup primeiro, fallback para localStorage
      const result = await openOAuthWindow(oauthUrl);

      if (result.success) {
        toast({
          title: '✅ Conta Meta conectada!',
          description: 'As conexões aparecerão em instantes.',
          duration: 5000,
        });
        await fetchConnections();
        setTimeout(() => fetchConnections(), 1500);
        setTimeout(() => fetchConnections(), 4000);
      }
    } catch (err: any) {
      const isCancellation = err.message.includes('cancelada') || err.message.includes('fechado') || err.message.includes('closed');
      if (!isCancellation) {
        toast({ title: '❌ Erro', description: err.message, variant: 'destructive', duration: 7000 });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // -------------------------------------------------------------------
  // Abrir janela OAuth (popup com fallback para nova aba)
  // -------------------------------------------------------------------
  function openOAuthWindow(url: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      const width = 600, height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(url, 'MetaOAuth', `width=${width},height=${height},left=${left},top=${top}`);

      if (!popup || popup.closed) {
        // Popup bloqueado → abrir em nova aba com localStorage
        localStorage.removeItem('meta_connection_result');
        window.open(url, '_blank');

        // Polling do localStorage
        const lsInterval = setInterval(() => {
          const stored = localStorage.getItem('meta_connection_result');
          if (stored) {
            try {
              const data = JSON.parse(stored);
              const age = Date.now() - (data.timestamp || 0);
              if (age < 60_000) {
                localStorage.removeItem('meta_connection_result');
                clearInterval(lsInterval);
                data.success ? resolve({ success: true }) : reject(new Error(data.error || 'Erro desconhecido'));
              }
            } catch { /* ignore */ }
          }
        }, 1000);

        setTimeout(() => { clearInterval(lsInterval); reject(new Error('Tempo esgotado. Tente novamente.')); }, 120_000);
        return;
      }

      // Popup aberto com sucesso → escutar postMessage
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'meta_connection_success') {
          window.removeEventListener('message', messageHandler);
          resolve({ success: true });
        } else if (event.data?.type === 'meta_connection_error') {
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error || 'Erro na conexão'));
        }
      };

      window.addEventListener('message', messageHandler);

      // Detectar fechamento manual
      const closedCheck = setInterval(() => {
        if (popup.closed) {
          clearInterval(closedCheck);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Autenticação cancelada pelo usuário'));
        }
      }, 500);

      setTimeout(() => {
        clearInterval(closedCheck);
        window.removeEventListener('message', messageHandler);
        if (!popup.closed) popup.close();
        reject(new Error('Tempo esgotado. Tente novamente.'));
      }, 120_000);
    });
  }

  // -------------------------------------------------------------------
  // Toggle agent_enabled
  // -------------------------------------------------------------------
  const handleToggleAgent = async (connectionId: string, enabled: boolean) => {
    const { error: updateError } = await supabase
      .from('meta_connections')
      .update({ agent_enabled: enabled })
      .eq('id', connectionId);

    if (updateError) {
      toast({ title: 'Erro', description: updateError.message, variant: 'destructive' });
      return;
    }

    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, agent_enabled: enabled } : c))
    );

    toast({
      title: enabled ? '🤖 Agente ativado' : '⏸️ Agente pausado',
      description: enabled
        ? 'O assistente responderá automaticamente.'
        : 'O assistente não responderá até ser reativado.',
    });
  };

  // -------------------------------------------------------------------
  // Remover conexão
  // -------------------------------------------------------------------
  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;

    const { error: deleteError } = await supabase
      .from('meta_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      toast({ title: 'Erro', description: deleteError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Conta desconectada', description: 'A conexão foi removida com sucesso.' });
    await fetchConnections();
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="space-y-6">

      {/* Seletor de assistente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            Atendimentos Meta
          </CardTitle>
          <CardDescription>
            Conecte seu assistente ao WhatsApp Business, Instagram e Facebook Messenger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Assistente</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione um assistente" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompany && (
              <p className="text-xs text-muted-foreground">
                O agente deste assistente responderá automaticamente nas plataformas conectadas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conexões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="h-5 w-5 text-blue-600" />
            Conexões Meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && connections.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Carregando conexões...</p>
            </div>
          ) : error && connections.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={() => fetchConnections()}>Tentar Novamente</Button>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-muted/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                <Facebook className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhuma conta conectada</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Conecte sua conta do Facebook para ativar o agente no Instagram, WhatsApp e Messenger.
              </p>
              <Button onClick={handleConnect} size="lg" disabled={isConnecting || !selectedCompanyId}>
                {isConnecting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo...</>
                ) : (
                  <><Facebook className="mr-2 h-5 w-5" /> Conectar Conta Meta</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {connections.length} {connections.length === 1 ? 'conexão ativa' : 'conexões ativas'}
                </p>
                <Button variant="outline" onClick={handleConnect} disabled={isConnecting || !selectedCompanyId}>
                  {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...</> : <><Facebook className="mr-2 h-4 w-4" /> Conectar Nova Conta</>}
                </Button>
              </div>

              {connections.map((conn) => (
                <Card key={conn.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Página */}
                        <div className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-600" />
                          <p className="font-bold">{conn.page_name}</p>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>

                        {/* Plataformas conectadas */}
                        {conn.instagram_username && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Instagram className="h-4 w-4 text-pink-600" />
                            <span>@{conn.instagram_username}</span>
                          </div>
                        )}
                        {conn.whatsapp_number && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 text-green-600" />
                            <span>{conn.whatsapp_number}</span>
                          </div>
                        )}

                        {/* Créditos por resposta */}
                        <div className="text-xs text-muted-foreground pt-1">
                          Créditos por resposta: FB {conn.credits_per_reply_facebook} · IG {conn.credits_per_reply_instagram} · WA {conn.credits_per_reply_whatsapp}
                        </div>
                      </div>

                      {/* Controles */}
                      <div className="flex flex-col gap-3 items-end">
                        {/* Toggle do agente */}
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Agente</Label>
                          <Switch
                            checked={conn.agent_enabled}
                            onCheckedChange={(checked) => handleToggleAgent(conn.id, checked)}
                          />
                          <span className={`text-xs font-medium ${conn.agent_enabled ? 'text-green-500' : 'text-gray-400'}`}>
                            {conn.agent_enabled ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>

                        {/* Desconectar */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
