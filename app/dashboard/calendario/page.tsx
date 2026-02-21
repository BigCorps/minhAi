'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Calendar as CalendarIcon, 
  Link2, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCw
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

function CalendarioPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdFromUrl || '');
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('Calendário');
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>('dayGridMonth');
  
  const calendarRef = useRef<FullCalendar>(null);
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
        await loadGoogleEvents(companyId);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao carregar conta Google:', error);
      setEvents([]);
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

  function handleGoToConnect() {
    const url = `/dashboard/google-connect${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`;
    router.push(url);
  }

  async function handleRefresh() {
    if (selectedCompanyId) {
      await loadGoogleEvents(selectedCompanyId);
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Calendário
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Visualize e gerencie eventos do Google Calendar
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
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Escolha um assistente acima para visualizar o calendário
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
                Para visualizar eventos do calendário, você precisa conectar uma conta Google primeiro.
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

          {/* Calendário */}
          {!loading && selectedCompanyId && googleAccount && (
            <>
              {/* Info da conta conectada */}
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/30">
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
                      disabled={loadingEvents}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`} />
                      Atualizar
                    </button>
                    <button
                      onClick={handleGoToConnect}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      Gerenciar Conexão
                    </button>
                  </div>
                </div>
              </div>

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
                      // TODO: Abrir modal com detalhes
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
        </div>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <CalendarioPageContent />
    </Suspense>
  );
}
