'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Loader2, AlertCircle, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
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
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  
  const calendarRef = useRef<FullCalendar>(null);
  const supabase = createClient();
  const isDark = theme === 'dark';

  // Detectar mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi[action]();
      setCurrentTitle(calendarApi.view.title);
    }
  };

  const handleViewChange = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setCurrentTitle(calendarApi.view.title);
      
      if (view === 'dayGridMonth') setCurrentView('month');
      else if (view === 'timeGridWeek') setCurrentView('week');
      else setCurrentView('day');
    }
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
  };

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const getViewString = () => {
    if (currentView === 'month') return 'dayGridMonth';
    if (currentView === 'week') return 'timeGridWeek';
    return 'timeGridDay';
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
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col`}
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

        {/* Content com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controles do Calendário */}
              <div className="flex items-center justify-between">
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
                  {currentTitle}
                </div>

                <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => handleViewChange('dayGridMonth')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'month'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => handleViewChange('timeGridWeek')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'week'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => handleViewChange('timeGridDay')}
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

              {/* FullCalendar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-white/10 overflow-hidden">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  initialView={getViewString()}
                  headerToolbar={false}
                  events={events}
                  locale={ptBrLocale}
                  height={
                    isMobile 
                      ? 350
                      : currentView === 'month' ? 500 : currentView === 'week' ? 450 : 400
                  }
                  contentHeight={
                    isMobile 
                      ? 300
                      : currentView === 'month' ? 450 : currentView === 'week' ? 400 : 350
                  }
                  allDayText="Dia inteiro"
                  eventClick={handleEventClick}
                  datesSet={(dateInfo) => {
                    setCurrentTitle(dateInfo.view.title);
                  }}
                  dayMaxEvents={3}
                  nowIndicator={true}
                  scrollTime="08:00:00"
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={true}
                  slotDuration="00:30:00"
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false,
                    hour12: false,
                  }}
                />
              </div>

              {/* Informação sobre eventos */}
              {events.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
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
            className={`${bg} rounded-xl p-6 max-w-md w-full border ${border} shadow-2xl`}
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
