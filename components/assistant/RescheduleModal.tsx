'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchPublicAppointment, actOnPublicAppointment, listPublicCalendarAvailability } from '@/lib/calendar-client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

interface RescheduleModalProps {
  data: {
    companyId: string;
    transcript?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'search' | 'select_event' | 'select_date' | 'success';

interface Event {
  appointment_id: string;
  capability: string;
  summary: string;
  start: { dateTime: string };
}

export default function RescheduleModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RescheduleModalProps) {
  const { companyId, transcript } = data;
  
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos de busca
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [searchName, setSearchName] = useState('');

  // Eventos e seleção
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Nova data/hora
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';


  // Auto-extrair data/hora/nome do transcript
  useEffect(() => {
    if (!transcript) return;
    
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    if (/hoje/i.test(transcript)) {
      setSearchDate(hoje);
    } else if (/amanh[ãa]/i.test(transcript)) {
      setSearchDate(amanha);
    }
    
    const timeMatch = transcript.match(/(\d{1,2})[:h](\d{2})?/i);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const min = timeMatch[2] || '00';
      setSearchTime(`${hour}:${min}`);
    }
  }, [transcript]);

  const handleSearch = async () => {
    if (!searchDate) {
      setError('Por favor, informe a data do agendamento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointment = await searchPublicAppointment({ company_id: companyId, action: 'reschedule', date: searchDate, time: searchTime || undefined, name: searchName || undefined });
      const start = `${appointment.date}T${appointment.time}:00-03:00`;
      const event: Event = { appointment_id: appointment.appointment_id, capability: appointment.capability, summary: appointment.service_type,
        start: { dateTime: start } };
      setEvents([event]);
      setSelectedEvent(event);
      setStep('select_date');
      await loadCalendarEvents();
      if (playText) playText('Agendamento encontrado. Confira os dados antes de continuar.').catch(() => {});

    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar agendamentos. Tente novamente.');
      if (playText) {
        playText('Erro ao buscar agendamentos').catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const start = new Date();
      const busy = await listPublicCalendarAvailability({ company_id: companyId, time_min: start.toISOString(), time_max: new Date(start.getTime() + 59 * 86400000).toISOString() });
      setCalendarEvents(busy.map(block => ({ title: 'Ocupado', start: block.start, end: block.end, color: '#3b82f6' })));
    } catch (err) {
      console.error('Erro ao carregar eventos do calendário:', err);
    }
  };

  const handleDateClick = (info: any) => {
    setNewDate(info.dateStr);
  };

  const handleReschedule = async () => {
    if (!selectedEvent || !newDate || !newTime) {
      setError('Por favor, selecione uma nova data e horário');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newDateTime = `${newDate}T${newTime}:00-03:00`;
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) throw new Error('Informe uma duração entre 1 e 1440 minutos.');
      const duration = durationMinutes * 60000;
      const newEndDateTime = new Date(new Date(newDateTime).getTime() + duration).toISOString();

      await actOnPublicAppointment({ company_id: companyId, appointment_id: selectedEvent.appointment_id, action: 'reschedule', capability: selectedEvent.capability, new_start: new Date(newDateTime).toISOString(), new_end: newEndDateTime });
      const result = { success: true, speech_text: '' };

      if (result.success) {
        const dateStr = new Date(newDateTime).toLocaleDateString('pt-BR');
        const timeStr = new Date(newDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        if (playText) {
          await playText(`Agendamento reagendado com sucesso para o dia ${dateStr} às ${timeStr}.`).catch(() => {});
        }
        
        setStep('success');
        setTimeout(() => onClose(), 3000);
      } else {
        setError(result.speech_text || 'Erro ao reagendar');
        if (playText) {
          playText(result.speech_text || 'Erro ao reagendar').catch(() => {});
        }
      }

    } catch (err) {
      console.error('Erro ao reagendar:', err);
      setError('Erro ao reagendar. Tente novamente.');
      if (playText) {
        playText('Erro ao reagendar').catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  // Gerar slots de horário (8h-18h, 30min)
  const timeSlots = [];
  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Reagendar Compromisso</h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'search' && 'Busque seu agendamento'}
                  {step === 'select_event' && 'Selecione o agendamento'}
                  {step === 'select_date' && 'Escolha nova data e horário'}
                  {step === 'success' && 'Reagendado com sucesso'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`h-1 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ 
              width: step === 'search' ? '25%' : step === 'select_event' ? '50%' : step === 'select_date' ? '75%' : '100%' 
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* STEP 1: BUSCA */}
          {step === 'search' && (
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Data *</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 transition`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Horário (opcional)</label>
                <input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 transition`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Nome (opcional)</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Nome completo do cliente"
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition`}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !searchDate || (!searchTime && !searchName.trim())}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Agendamento'
                )}
              </button>
            </div>
          )}

          {/* STEP 2: SELEÇÃO DE EVENTO */}
          {/* STEP 3: SELEÇÃO DE NOVA DATA */}
          {step === 'select_date' && selectedEvent && (
            <div className="space-y-4">
              {/* Evento Atual */}
              <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-gray-50'} border ${border} rounded-lg`}>
                <p className={`text-xs ${textMuted} mb-2`}>Agendamento atual:</p>
                <div className={`font-medium ${textPrimary}`}>{selectedEvent.summary}</div>
                <div className={`text-sm ${textMuted}`}>
                  {new Date(selectedEvent.start.dateTime).toLocaleString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Calendário */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                    Selecione a nova data:
                  </label>
                  <div className={`${isDark ? 'dark-calendar' : ''}`}>
                    <FullCalendar
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      locale={ptBrLocale}
                      dateClick={handleDateClick}
                      events={calendarEvents}
                      height="auto"
                      headerToolbar={{
                        left: 'prev,next',
                        center: 'title',
                        right: '',
                      }}
                    />
                  </div>
                </div>

                {/* Horários */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                    Escolha o horário:
                  </label>
                  {newDate ? (
                    <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto p-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setNewTime(time)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            newTime === time
                              ? 'bg-blue-600 text-white'
                              : isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-8 text-center ${textMuted}`}>
                      Selecione uma data no calendário
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Duração do novo agendamento (minutos)</label>
                <input type="number" min={1} max={1440} value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary}`} />
              </div>

              {/* Resumo da Nova Data */}
              {newDate && newTime && (
                <div className={`p-4 ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'} border border-blue-600/20 rounded-lg`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Nova data e horário:</p>
                  <p className={`font-medium ${textPrimary}`}>
                    {new Date(`${newDate}T${newTime}`).toLocaleString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setStep(events.length > 1 ? 'select_event' : 'search');
                  }}
                  className={`flex-1 py-3 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} rounded-lg font-semibold transition`}
                >
                  Voltar
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={loading || !newDate || !newTime}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Reagendando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirmar Reagendamento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCESSO */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} flex items-center justify-center mb-4`}>
                <CheckCircle2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Reagendado com Sucesso!</h3>
              <p className={`text-sm ${textMuted} text-center`}>
                Seu compromisso foi reagendado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
