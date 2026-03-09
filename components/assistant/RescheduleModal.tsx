'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Loader2, AlertCircle, Clock, RefreshCw, MapPin, User, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
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

export default function RescheduleModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RescheduleModalProps) {
  const { companyId, transcript } = data;
  
  const [step, setStep] = useState<'search' | 'select_date' | 'confirm' | 'success'>(transcript ? 'search' : 'search');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Campos de busca
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Nova data/hora
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  
  const calendarRef = useRef<FullCalendar>(null);
  const supabase = createClient();
  const isDark = theme === 'dark';
  
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    // Tentar extrair email/telefone do transcript
    if (transcript) {
      const emailMatch = transcript.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const phoneMatch = transcript.match(/(\d{10,11})/);
      
      if (emailMatch) {
        setCustomerEmail(emailMatch[1]);
        searchAppointment(emailMatch[1], undefined);
      } else if (phoneMatch) {
        setCustomerPhone(phoneMatch[1]);
        searchAppointment(undefined, phoneMatch[1]);
      }
    }
  }, []);

  async function searchAppointment(email?: string, phone?: string) {
    try {
      setLoading(true);
      setError(null);
      
      const searchEmail = email || customerEmail;
      const searchPhone = phone || customerPhone;
      
      if (!searchEmail && !searchPhone) {
        setError('Por favor, informe seu email ou telefone.');
        setLoading(false);
        return;
      }

      // Buscar agendamento via Supabase
      let query = supabase
        .from('customer_appointments')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['scheduled', 'confirmed', 'rescheduled'])
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(1);

      if (searchEmail) {
        query = query.eq('customer_email', searchEmail);
      } else if (searchPhone) {
        query = query.eq('customer_phone', searchPhone);
      }

      const { data: appointments, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!appointments || appointments.length === 0) {
        setError('Nenhum agendamento encontrado com esses dados.');
        if (playText) {
          playText('Não encontrei nenhum agendamento com esses dados.').catch(() => {});
        }
        setLoading(false);
        return;
      }

      setAppointment(appointments[0]);
      setStep('select_date');
      if (playText) {
        playText('Agendamento encontrado! Selecione a nova data e horário.').catch(() => {});
      }
    } catch (err: any) {
      console.error('Erro ao buscar agendamento:', err);
      setError('Erro ao buscar agendamento. Tente novamente.');
      if (playText) {
        playText('Erro ao buscar agendamento. Tente novamente.').catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDateClick(info: any) {
    const clickedDate = new Date(info.dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate < today) {
      setError('Não é possível reagendar para datas passadas.');
      return;
    }
    
    setSelectedDate(clickedDate);
    setError(null);
  }

  async function handleReschedule() {
    if (!appointment || !selectedDate || !selectedTime) {
      setError('Por favor, selecione uma data e horário.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const [hours, minutes] = selectedTime.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const response = await supabase.functions.invoke('reagendar-compromisso', {
        body: {
          company_id: companyId,
          appointment_id: appointment.id,
          new_date: newDate.toISOString().split('T')[0],
          new_time: selectedTime,
          reschedule_reason: reason || undefined,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;

      if (result.success) {
        setStep('success');
        if (playText) {
          playText(result.speech_text).catch(() => {});
        }
        
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(result.speech_text || 'Erro ao reagendar.');
        if (playText) {
          playText(result.speech_text || 'Erro ao reagendar.').catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Erro ao reagendar:', err);
      setError('Erro ao reagendar. Tente novamente.');
      if (playText) {
        playText('Erro ao reagendar. Tente novamente.').catch(() => {});
      }
    } finally {
      setProcessing(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Gerar horários disponíveis (8h às 18h, intervalo de 30min)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Reagendar Compromisso
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'search' && 'Encontre seu agendamento'}
                  {step === 'select_date' && 'Escolha nova data e horário'}
                  {step === 'confirm' && 'Confirme o reagendamento'}
                  {step === 'success' && 'Reagendamento concluído'}
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

        {/* Progress */}
        <div className="h-1 bg-gray-200 dark:bg-slate-800 flex-shrink-0">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width:
                step === 'search' ? '25%' :
                step === 'select_date' ? '50%' :
                step === 'confirm' ? '75%' : '100%'
            }}
          />
        </div>

        {/* Content com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: SEARCH */}
          {step === 'search' && (
            <div className="space-y-4 max-w-md mx-auto">
              {error && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                }`}>
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                    {error}
                  </p>
                </div>
              )}

              <p className={`text-sm ${textMuted}`}>
                Para reagendar, informe o email ou telefone usado no agendamento:
              </p>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={loading}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
                <span className={`text-xs ${textMuted}`}>OU</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Telefone
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={loading}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50`}
                />
              </div>

              <button
                onClick={() => searchAppointment()}
                disabled={loading || (!customerEmail && !customerPhone)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
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

          {/* STEP 2: SELECT DATE */}
          {step === 'select_date' && appointment && (
            <div className="space-y-4">
              {error && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                }`}>
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                    {error}
                  </p>
                </div>
              )}

              {/* Agendamento Atual */}
              <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>
                  Agendamento Atual:
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    <span className={textMuted}>{formatDate(appointment.appointment_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span className={textMuted}>{formatTime(appointment.appointment_date)}</span>
                  </div>
                </div>
              </div>

              {/* Calendário */}
              <div className={`rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} p-4`}>
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>
                  Selecione a nova data:
                </h3>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  locale={ptBrLocale}
                  height={400}
                  dateClick={handleDateClick}
                  selectable={true}
                  validRange={{
                    start: new Date().toISOString().split('T')[0]
                  }}
                />
              </div>

              {/* Seleção de Horário */}
              {selectedDate && (
                <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>
                    Selecione o horário:
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {generateTimeSlots().map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          selectedTime === time
                            ? 'bg-blue-600 text-white'
                            : isDark
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo (opcional) */}
              {selectedDate && selectedTime && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                    Motivo do reagendamento (opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Compromisso imprevisto, necessidade de alterar horário..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none`}
                  />
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('search')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  }`}
                >
                  Voltar
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={!selectedDate || !selectedTime || processing}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Reagendando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Confirmar Reagendamento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>
                Reagendamento Concluído!
              </h3>
              <p className={`text-sm ${textMuted} text-center max-w-md`}>
                Seu compromisso foi reagendado com sucesso. Aguardamos você no novo horário.
              </p>
              {selectedDate && selectedTime && (
                <div className={`mt-4 p-4 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${textMuted} mb-2`}>Novo horário:</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {selectedTime}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
