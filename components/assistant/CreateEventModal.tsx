'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Calendar as CalendarIcon, Clock, FileText, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

type EventStep = 'select_date' | 'enter_details' | 'confirmation';

interface CreateEventModalProps {
  data: {
    companyId: string;
    initialView: 'month' | 'week' | 'day';
    transcript?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function CreateEventModal({
  data,
  onClose,
  theme = 'dark',
}: CreateEventModalProps) {
  const { companyId, initialView, transcript } = data;
  
  const [step, setStep] = useState<EventStep>('select_date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [duration, setDuration] = useState('60'); // minutos
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [currentView, setCurrentView] = useState(initialView);
  const [currentTitle, setCurrentTitle] = useState('');
  
  const calendarRef = useRef<FullCalendar>(null);
  const supabase = createClient();
  const isDark = theme === 'dark';

  // Detectar mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(new Date(info.dateStr));
    setStep('enter_details');
  };

  const handleCreateEvent = async () => {
    if (!selectedDate || !selectedTime || !eventTitle) {
      showToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    setIsCreating(true);

    try {
      // Montar data/hora de início
      const [hours, minutes] = selectedTime.split(':');
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0);

      // Calcular data/hora de fim
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

      const { data: result, error } = await supabase.functions.invoke('criar-evento-calendario', {
        body: {
          company_id: companyId,
          summary: eventTitle,
          description: eventDescription,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      });

      if (error) throw error;

      if (!result.success) {
        showToast(result.speech_text || 'Erro ao criar evento', 'error');
        return;
      }

      showToast('✅ Evento criado com sucesso!', 'success');
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('Erro ao criar evento:', error);
      showToast('Erro ao criar evento. Tente novamente.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

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
          {toast.type === 'success' && <Check className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'error' && <X className="w-5 h-5 text-white flex-shrink-0" />}
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-green-950/40' : 'bg-green-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Marcar Evento
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'select_date' && 'Passo 1: Selecione a data'}
                  {step === 'enter_details' && 'Passo 2: Detalhes do evento'}
                  {step === 'confirmation' && 'Passo 3: Confirmação'}
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

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-slate-800 flex-shrink-0">
          <div
            className="h-full bg-green-600 transition-all duration-300"
            style={{
              width:
                step === 'select_date' ? '33%' :
                step === 'enter_details' ? '66%' :
                '100%',
            }}
          />
        </div>

        {/* Content com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Selecionar Data */}
          {step === 'select_date' && (
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
                        ? 'bg-green-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => handleViewChange('timeGridWeek')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'week'
                        ? 'bg-green-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => handleViewChange('timeGridDay')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      currentView === 'day'
                        ? 'bg-green-500 text-white'
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
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={getViewString()}
                  headerToolbar={false}
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
                  dateClick={handleDateClick}
                  selectable={true}
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
                />
              </div>
            </div>
          )}

          {/* STEP 2: Detalhes do Evento */}
          {step === 'enter_details' && (
            <div className="space-y-4">
              {/* Data Selecionada */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <p className={`text-xs ${textMuted}`}>Data selecionada:</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {selectedDate?.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              {/* Horário */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Horário *
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              {/* Duração */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Duração
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h 30min</option>
                  <option value="120">2 horas</option>
                  <option value="180">3 horas</option>
                </select>
              </div>

              {/* Título */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ex: Reunião com cliente"
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none`}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('select_date')}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep('confirmation')}
                  disabled={!selectedTime || !eventTitle}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Revisar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmação */}
          {step === 'confirmation' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${border} space-y-3`}>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Data:</p>
                  <p className={`text-sm font-semibold ${textPrimary}`}>
                    {selectedDate?.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <div className={`border-t ${border} pt-3`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Horário:</p>
                  <p className={`text-sm font-semibold ${textPrimary}`}>
                    {selectedTime} ({duration} minutos)
                  </p>
                </div>

                <div className={`border-t ${border} pt-3`}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Título:</p>
                  <p className={`text-sm font-semibold ${textPrimary}`}>{eventTitle}</p>
                </div>

                {eventDescription && (
                  <div className={`border-t ${border} pt-3`}>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Descrição:</p>
                    <p className={`text-sm ${textPrimary}`}>{eventDescription}</p>
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                  ✅ Confirme para criar o evento no Google Calendar
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('enter_details')}
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium transition disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
