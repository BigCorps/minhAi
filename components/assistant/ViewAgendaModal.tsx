'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Loader2, AlertCircle, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

interface ViewAgendaModalProps {
  data: {
    companyId: string;
    initialView: 'month' | 'week' | 'day';
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

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

export default function ViewAgendaModal({
  data,
  onClose,
  theme = 'dark',
}: ViewAgendaModalProps) {
  const { companyId, initialView } = data;
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(initialView);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  
  const calendarRef = useRef<FullCalendar>(null);
  const supabase = createClient();
  const isDark = theme === 'dark';

  useEffect(() => {
    loadEvents();
  }, [companyId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  async function loadEvents() {
    try {
      setLoading(true);
      
      const { data: result, error } = await supabase.functions.invoke('listar-eventos-google', {
        body: { company_id: companyId },
      });

      if (error) throw error;

      if (!result.success) {
        showToast('Erro ao carregar eventos', 'error');
        return;
      }

      const calendarEvents: CalendarEvent[] = (result.events || []).map((event: any) => ({
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
      showToast('Erro ao carregar eventos', 'error');
    } finally {
      setLoading(false);
    }
  }

const handleNav = (action: 'prev' | 'next' | 'today') => {
  if (currentView === 'day') {
    // Navegação manual para visão diária
    const newDate = new Date(currentDate);
    
    if (action === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (action === 'next') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (action === 'today') {
      newDate.setTime(new Date().getTime());
    }
    
    setCurrentDate(newDate);
    setCurrentTitle(newDate.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }));
  } else {
    // Navegação via FullCalendar API para mês e semana
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi[action]();
      setCurrentDate(calendarApi.getDate());
      updateTitle(calendarApi.view.title);
    }
  }
};

  const updateTitle = (title: string) => {
    setCurrentTitle(title);
  };

  const handleViewChange = (view: 'month' | 'week' | 'day') => {
    setCurrentView(view);
    
    // Força recriação do calendário
    setCalendarKey(prev => prev + 1);
    
    // Atualiza título manualmente baseado na view
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        const newDate = calendarApi.getDate();
        setCurrentDate(newDate);
        updateTitle(calendarApi.view.title);
      }
    }, 50);
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
  };

  const handleDateClick = (info: any) => {
    setCurrentDate(new Date(info.dateStr));
    handleViewChange('day');
  };

  // Funções auxiliares para visão diária
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventDateStr = eventStart.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const groupEventsByPeriod = (events: CalendarEvent[]) => {
    const morning: CalendarEvent[] = [];
    const afternoon: CalendarEvent[] = [];
    const evening: CalendarEvent[] = [];
    const allDay: CalendarEvent[] = [];

    events.forEach(event => {
      if (event.allDay) {
        allDay.push(event);
        return;
      }

      const hour = new Date(event.start).getHours();
      if (hour < 12) morning.push(event);
      else if (hour < 18) afternoon.push(event);
      else evening.push(event);
    });

    return { morning, afternoon, evening, allDay };
  };

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // Definir view string para o FullCalendar
  const getCalendarView = () => {
    if (currentView === 'month') return 'dayGridMonth';
    if (currentView === 'week') return 'dayGridWeek';
    return 'dayGridMonth'; // fallback
  };

  // Renderizar visão diária customizada
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const { morning, afternoon, evening, allDay } = groupEventsByPeriod(dayEvents);

    const EventCard = ({ event }: { event: CalendarEvent }) => (
      <div
        onClick={() => setSelectedEvent({ 
          ...event, 
          start: event.start,
          end: event.end,
          title: event.title,
          allDay: event.allDay,
          extendedProps: event.extendedProps
        })}
        className={`p-2 rounded-lg cursor-pointer transition hover:opacity-80 ${
          isDark ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200'
        } border mb-2`}
      >
        <p className={`text-xs font-semibold ${textPrimary} line-clamp-1`}>
          {event.title}
        </p>
        {!event.allDay && (
          <p className={`text-[10px] ${textMuted} mt-0.5`}>
            {new Date(event.start).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        )}
      </div>
    );

    return (
      <div className="h-full flex flex-col">
        {/* Header da Data */}
        <div className={`text-center py-3 border-b ${border} flex-shrink-0`}>
          <p className={`text-sm ${textMuted} uppercase tracking-wide`}>
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
          </p>
          <p className={`text-2xl font-bold ${textPrimary} mt-1`}>
            {currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Eventos de Dia Inteiro */}
        {allDay.length > 0 && (
          <div className={`px-4 py-2 border-b ${border} flex-shrink-0`}>
            <p className={`text-xs font-medium uppercase tracking-wider ${textMuted} mb-2`}>
              Dia Inteiro
            </p>
            <div className="space-y-1">
              {allDay.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        )}

        {/* Grid de Períodos */}
        <div className="flex-1 grid grid-cols-3 gap-3 p-4 min-h-0">
          {/* Manhã */}
          <div className={`rounded-lg border ${border} ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} p-3 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Manhã</h3>
              <span className={`text-xs ${textMuted}`}>6h - 12h</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {morning.length > 0 ? (
                morning.map(event => <EventCard key={event.id} event={event} />)
              ) : (
                <p className={`text-xs ${textMuted} italic`}>Sem eventos</p>
              )}
            </div>
          </div>

          {/* Tarde */}
          <div className={`rounded-lg border ${border} ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} p-3 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Tarde</h3>
              <span className={`text-xs ${textMuted}`}>12h - 18h</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {afternoon.length > 0 ? (
                afternoon.map(event => <EventCard key={event.id} event={event} />)
              ) : (
                <p className={`text-xs ${textMuted} italic`}>Sem eventos</p>
              )}
            </div>
          </div>

          {/* Noite */}
          <div className={`rounded-lg border ${border} ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} p-3 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Noite</h3>
              <span className={`text-xs ${textMuted}`}>18h - 24h</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {evening.length > 0 ? (
                evening.map(event => <EventCard key={event.id} event={event} />)
              ) : (
                <p className={`text-xs ${textMuted} italic`}>Sem eventos</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
            animate-in slide-in-from-top duration-300`}
        >
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'success' && <Clock className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'error' && <X className="w-5 h-5 text-white flex-shrink-0" />}
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal Principal */}
      <div
        className={`relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Minha Agenda
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {events.length} evento(s) encontrado(s)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content SEM scroll */}
        <div className="flex-1 flex flex-col min-h-0 p-6">
          
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Controles do Calendário */}
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNav('prev')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleNav('today')}
                    className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => handleNav('next')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-lg font-semibold capitalize">
                  {currentTitle || currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>

                <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => handleViewChange('month')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'month'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => handleViewChange('week')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'week'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => handleViewChange('day')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'day'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Dia
                  </button>
                </div>
              </div>

              {/* Calendário ou Visão Diária */}
              <div className="flex-1 min-h-0">
                {currentView === 'day' ? (
                  renderDayView()
                ) : (
                  <div className={`h-full bg-white dark:bg-slate-800 rounded-xl p-4 border ${border}`}>
                    <style>{`
                      .fc {
                        height: 100% !important;
                      }
                      .fc-view-harness {
                        height: 100% !important;
                      }
                      .fc-scroller {
                        overflow: hidden !important;
                      }
                      .fc-daygrid-body {
                        height: 100% !important;
                      }
                      .fc-scrollgrid {
                        border: none !important;
                      }
                      .fc-col-header-cell {
                        font-size: 0.75rem !important;
                        padding: 0.5rem 0.25rem !important;
                      }
                      .fc-daygrid-day {
                        font-size: 0.75rem !important;
                      }
                      .fc-daygrid-day-number {
                        font-size: 0.75rem !important;
                        padding: 0.25rem !important;
                      }
                      .fc-event {
                        font-size: 0.65rem !important;
                        padding: 1px 3px !important;
                        margin: 1px 0 !important;
                      }
                      .fc-daygrid-event-harness {
                        margin-top: 1px !important;
                      }
                      
                      /* Ajustes para visão semanal */
                      .fc-dayGridWeek-view .fc-col-header-cell {
                        font-size: 0.7rem !important;
                      }
                      .fc-dayGridWeek-view .fc-daygrid-day-frame {
                        min-height: 80px !important;
                      }
                    `}</style>
                    <FullCalendar
                      key={calendarKey}
                      ref={calendarRef}
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView={getCalendarView()}
                      initialDate={currentDate}
                      headerToolbar={false}
                      events={events}
                      locale={ptBrLocale}
                      height="100%"
                      allDayText="Todo dia"
                      eventClick={handleEventClick}
                      dateClick={handleDateClick}
                      datesSet={(dateInfo) => {
                        updateTitle(dateInfo.view.title);
                        setCurrentDate(dateInfo.view.currentStart);
                      }}
                      dayMaxEvents={currentView === 'month' ? 2 : 5}
                      nowIndicator={true}
                      fixedWeekCount={false}
                      dayHeaderFormat={
                        currentView === 'week' 
                          ? { weekday: 'short', day: 'numeric', month: 'numeric' }
                          : { weekday: 'short' }
                      }
                      eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: false,
                        hour12: false,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Informação sobre eventos vazios */}
              {events.length === 0 && currentView !== 'day' && (
                <div className="text-center py-4">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className={`text-sm ${textMuted}`}>
                    Nenhum evento agendado neste período
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className={`${bg} rounded-xl p-6 max-w-md w-full border ${border} shadow-2xl max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className={`text-lg font-bold ${textPrimary}`}>
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Horário */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {selectedEvent.allDay ? (
                      'Dia inteiro'
                    ) : (
                      <>
                        {new Date(selectedEvent.start).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                        {selectedEvent.end && (
                          <> até {new Date(selectedEvent.end).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Localização */}
              {selectedEvent.extendedProps?.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${textPrimary}`}>
                    {selectedEvent.extendedProps.location}
                  </p>
                </div>
              )}

              {/* Descrição */}
              {selectedEvent.extendedProps?.description && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${textPrimary} whitespace-pre-wrap`}>
                    {selectedEvent.extendedProps.description}
                  </p>
                </div>
              )}

              {/* Participantes */}
              {selectedEvent.extendedProps?.attendees?.length > 0 && (
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textMuted} mb-2`}>
                    Participantes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.extendedProps.attendees.map((email: string, idx: number) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
