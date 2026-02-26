'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Calendar as CalendarIcon,
  Mail,
  Link2, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCw,
  Clock,
  User,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send
} from 'lucide-react';

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    attendees?: string[];
  };
}

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

function AgendaPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdFromUrl || '');
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  
  // Estados do Calendário
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('Calendário');
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>('dayGridMonth');
  const calendarRef = useRef<FullCalendar>(null);

  // Estados de Emails
  const [emails, setEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailTab, setEmailTab] = useState<'inbox' | 'sent'>('inbox');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Estados gerais
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'email'>('calendar');
  
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
      setEvents([]);
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
        // Carregar eventos e emails em paralelo
        await Promise.all([
          loadGoogleEvents(companyId),
          loadEmails(companyId),
        ]);
      } else {
        setEvents([]);
        setEmails([]);
        setSentEmails([]);
      }
    } catch (error) {
      console.error('Erro ao carregar conta Google:', error);
      setEvents([]);
      setEmails([]);
      setSentEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadGoogleEvents(companyId: string) {
    try {
      setLoadingEvents(true);
      
      const { data, error } = await supabase.functions.invoke('listar-eventos-google', {
        body: { company_id: companyId },
      });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        throw error;
      }

      const calendarEvents: CalendarEvent[] = (data?.events || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Sem título',
        start: event.start.dateTime || event.start.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start.dateTime,
        backgroundColor: '#4285F4',
        borderColor: '#4285F4',
        textColor: '#FFFFFF',
        extendedProps: {
          description: event.description,
          location: event.location,
          attendees: event.attendees?.map((a: any) => a.email) || [],
        },
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadEmails(companyId: string) {
    try {
      setLoadingEmails(true);
      
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
      if (activeTab === 'calendar') {
        await loadGoogleEvents(selectedCompanyId);
      } else {
        await loadEmails(selectedCompanyId);
      }
    }
  }

  // Funções do Calendário
  function handleNav(action: 'prev' | 'next' | 'today') {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi[action]();
      setCurrentTitle(calendarApi.view.title);
    }
  }

  function handleViewChange(view: 'dayGridMonth' | 'timeGridWeek' | 'listWeek') {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setActiveView(view);
      setCurrentTitle(calendarApi.view.title);
    }
  }

  // Funções de Emails
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

  const currentEmails = emailTab === 'inbox' ? emails : sentEmails;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
<div className="flex items-start justify-between gap-4 mb-6">
  
  {/* Lado Esquerdo */}
  <div className="flex-1">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 whitespace-nowrap">
      Agenda Google | Gmail
    </h1>

    <p className="text-gray-600 dark:text-gray-400">
      Gerencie calendário e emails integrados com Google
    </p>
  </div>

  {/* Lado Direito */}
  <div className="flex flex-col items-end shrink-0">
    {companies.length > 0 && (
      <select
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
        className="w-40 px-4 py-2 rounded-lg border bg-white text-gray-900 border-gray-300 dark:bg-slate-800 dark:text-white dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">Selecione...</option>
        {companies.map(company => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    )}
  </div>
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
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Escolha um assistente acima para visualizar a agenda e emails
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
                Para visualizar calendário e emails, você precisa conectar uma conta Google primeiro.
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

          {/* Conteúdo Principal */}
          {!loading && selectedCompanyId && googleAccount && (
            <>
              {/* Info da conta + Tabs Principais */}
              <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Conta conectada */}
                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-green-600 dark:text-green-400" />
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
                        disabled={loadingEvents || loadingEmails}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${(loadingEvents || loadingEmails) ? 'animate-spin' : ''}`} />
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

                {/* Tabs Principais: Calendário / Email */}
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'calendar'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Calendário ({events.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('email')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'email'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Emails ({emails.length + sentEmails.length})
                  </button>
                </div>
              </div>

              {/* CALENDÁRIO */}
              {activeTab === 'calendar' && (
                <>
                  {/* Controles do Calendário */}
                  <div className="mb-4 p-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleNav('prev')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleNav('today')}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                        >
                          Hoje
                        </button>
                        <button
                          onClick={() => handleNav('next')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {currentTitle}
                      </div>

                      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => handleViewChange('dayGridMonth')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            activeView === 'dayGridMonth'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          Mês
                        </button>
                        <button
                          onClick={() => handleViewChange('timeGridWeek')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            activeView === 'timeGridWeek'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          Semana
                        </button>
                        <button
                          onClick={() => handleViewChange('listWeek')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            activeView === 'listWeek'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          Lista
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FullCalendar */}
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={false}
                        events={events}
                        locale={ptBrLocale}
                        height="auto"
                        allDayText="Dia inteiro"
                        buttonText={{
                          today: 'Hoje',
                          month: 'Mês',
                          week: 'Semana',
                          list: 'Lista',
                        }}
                        eventClassNames="cursor-pointer"
                        eventClick={(info) => {
                          console.log('Evento clicado:', info.event);
                        }}
                        datesSet={(dateInfo) => {
                          setCurrentTitle(dateInfo.view.title);
                          setActiveView(dateInfo.view.type as any);
                        }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* EMAILS */}
              {activeTab === 'email' && (
                <>
                  {/* Tabs de Email: Recebidos / Enviados */}
                  <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="flex border-b border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => setEmailTab('inbox')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                          emailTab === 'inbox'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Inbox className="w-4 h-4" />
                        Recebidos ({emails.length})
                      </button>
                      <button
                        onClick={() => setEmailTab('sent')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                          emailTab === 'sent'
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
                        Nenhum email {emailTab === 'inbox' ? 'recebido' : 'enviado'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {emailTab === 'inbox' 
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
                                    {emailTab === 'inbox' ? email.from : email.to.join(', ')}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AgendaPageContent />
    </Suspense>
  );
}
