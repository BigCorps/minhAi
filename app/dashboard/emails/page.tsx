'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mail, 
  Send,
  Inbox,
  Loader2, 
  AlertCircle,
  Settings,
  RefreshCw,
  Clock,
  User,
  Paperclip,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  body?: string;
  hasAttachments: boolean;
  isRead: boolean;
}

interface GoogleAccount {
  id: string;
  google_email: string;
  is_active: boolean;
}

interface Company {
  id: string;
  name: string;
  wake_word?: string;
}

function EmailsPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdFromUrl || '');
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const supabase = createClient();

  // Carregar empresas
  useEffect(() => {
    loadCompanies();
  }, []);

  // Atualizar URL quando mudar empresa
  useEffect(() => {
    if (selectedCompanyId) {
      const params = new URLSearchParams(window.location.search);
      params.set('companyId', selectedCompanyId);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      loadGoogleAccount(selectedCompanyId);
    } else {
      setGoogleAccount(null);
      setEmails([]);
      setSentEmails([]);
    }
  }, [selectedCompanyId]);

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, wake_word')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);

      if (data && data.length === 1 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  }

  async function loadGoogleAccount(companyId: string) {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGoogleAccount(data);
      
      if (data) {
        await loadEmails(companyId);
      } else {
        setEmails([]);
        setSentEmails([]);
      }
    } catch (error) {
      console.error('Erro ao carregar conta Google:', error);
      setEmails([]);
      setSentEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmails(companyId: string) {
    try {
      setLoadingEmails(true);
      
      // Buscar emails recebidos e enviados em paralelo
      const [inboxData, sentData] = await Promise.all([
        supabase.functions.invoke('listar-emails-google', {
          body: { company_id: companyId, type: 'inbox', max_results: 20 },
        }),
        supabase.functions.invoke('listar-emails-google', {
          body: { company_id: companyId, type: 'sent', max_results: 20 },
        }),
      ]);

      if (inboxData.error) {
        console.error('Erro ao buscar emails recebidos:', inboxData.error);
      } else {
        setEmails(inboxData.data?.emails || []);
      }

      if (sentData.error) {
        console.error('Erro ao buscar emails enviados:', sentData.error);
      } else {
        setSentEmails(sentData.data?.emails || []);
      }
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  }

  function handleGoToConnect() {
    const url = `/dashboard/google-connect${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`;
    router.push(url);
  }

  async function handleRefresh() {
    if (selectedCompanyId) {
      await loadEmails(selectedCompanyId);
    }
  }

  function toggleEmailExpand(emailId: string) {
    setExpandedEmail(expandedEmail === emailId ? null : emailId);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }

  const currentEmails = activeTab === 'inbox' ? emails : sentEmails;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Emails
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Visualize emails recebidos e enviados pelo assistente
                </p>
              </div>
              
              {/* Seletor de Assistente */}
              {companies.length > 0 && (
                <div className="w-64">
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
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && selectedCompanyId && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Sem assistente selecionado */}
          {!selectedCompanyId && !loading && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Escolha um assistente acima para visualizar os emails
              </p>
            </div>
          )}

          {/* Sem conta Google conectada */}
          {!loading && selectedCompanyId && !googleAccount && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Conta Google Não Conectada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Para visualizar emails, você precisa conectar uma conta Google primeiro.
              </p>
              <button
                onClick={handleGoToConnect}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Settings className="w-5 h-5" />
                Conectar Conta Google
              </button>
            </div>
          )}

          {/* Lista de Emails */}
          {!loading && selectedCompanyId && googleAccount && (
            <>
              {/* Info da conta + Tabs */}
              <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Conta conectada */}
                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Conectado como
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                          {googleAccount.google_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={loadingEmails}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
                        Atualizar
                      </button>
                      <button
                        onClick={handleGoToConnect}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      >
                        Gerenciar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'inbox'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                    Recebidos ({emails.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'sent'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Enviados ({sentEmails.length})
                  </button>
                </div>
              </div>

              {/* Lista de emails */}
              {loadingEmails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : currentEmails.length === 0 ? (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Nenhum email {activeTab === 'inbox' ? 'recebido' : 'enviado'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {activeTab === 'inbox' 
                      ? 'Você ainda não recebeu nenhum email'
                      : 'Você ainda não enviou nenhum email pelo assistente'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentEmails.map((email) => (
                    <div
                      key={email.id}
                      className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:border-blue-500/30 dark:hover:border-blue-500/30 transition"
                    >
                      {/* Header do email */}
                      <button
                        onClick={() => toggleEmailExpand(email.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {activeTab === 'inbox' ? email.from : email.to.join(', ')}
                              </p>
                              {email.hasAttachments && (
                                <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <h3 className={`text-sm mb-1 truncate ${
                              email.isRead 
                                ? 'text-gray-600 dark:text-gray-400' 
                                : 'font-semibold text-gray-900 dark:text-white'
                            }`}>
                              {email.subject || '(Sem assunto)'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-500 truncate">
                              {email.snippet}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(email.date)}
                            </div>
                            {expandedEmail === email.id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Corpo do email (expandido) */}
                      {expandedEmail === email.id && email.body && (
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                          <div 
                            className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: email.body }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <EmailsPageContent />
    </Suspense>
  );
}
