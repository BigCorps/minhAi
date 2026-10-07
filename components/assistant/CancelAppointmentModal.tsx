'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Loader2, AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { searchPublicAppointment, actOnPublicAppointment, listPublicCalendarAvailability } from '@/lib/calendar-client';

interface CancelAppointmentModalProps {
  data: {
    companyId: string;
    transcript?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'search' | 'select_event' | 'confirm' | 'success';

interface Event {
  appointment_id: string;
  capability: string;
  summary: string;
  start: { dateTime: string };
}

export default function CancelAppointmentModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: CancelAppointmentModalProps) {
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
  const [cancelReason, setCancelReason] = useState('');

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
      const appointment = await searchPublicAppointment({ company_id: companyId, action: 'cancel', date: searchDate, time: searchTime || undefined, name: searchName || undefined });
      const start = `${appointment.date}T${appointment.time}:00-03:00`;
      const event: Event = { appointment_id: appointment.appointment_id, capability: appointment.capability, summary: appointment.service_type,
        start: { dateTime: start } };
      setEvents([event]);
      setSelectedEvent(event);
      setStep('confirm');
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

  const handleCancel = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError(null);

    try {
      await actOnPublicAppointment({ company_id: companyId, appointment_id: selectedEvent.appointment_id, action: 'cancel', capability: selectedEvent.capability, reason: cancelReason || undefined });
      const result = { success: true, speech_text: '' };

      if (result.success) {
        if (playText) {
          await playText('Agendamento cancelado com sucesso.').catch(() => {});
        }
        
        setStep('success');
        setTimeout(() => onClose(), 3000);
      } else {
        setError(result.speech_text || 'Erro ao cancelar agendamento');
        if (playText) {
          playText(result.speech_text || 'Erro ao cancelar').catch(() => {});
        }
      }

    } catch (err) {
      console.error('Erro ao cancelar:', err);
      setError('Erro ao cancelar agendamento. Tente novamente.');
      if (playText) {
        playText('Erro ao cancelar agendamento').catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-red-950/40' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Cancelar Agendamento</h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'search' && 'Busque seu agendamento'}
                  {step === 'select_event' && 'Selecione o agendamento'}
                  {step === 'confirm' && 'Confirme o cancelamento'}
                  {step === 'success' && 'Cancelado com sucesso'}
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
            className="h-full bg-red-600 transition-all duration-300"
            style={{ 
              width: step === 'search' ? '33%' : step === 'select_event' ? '66%' : '100%' 
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* STEP 1: BUSCA */}
          {step === 'search' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Data *</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-red-500 transition`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Horário (opcional)</label>
                <input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-red-500 transition`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Nome (opcional)</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Nome completo do cliente"
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-red-500 transition`}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !searchDate || (!searchTime && !searchName.trim())}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
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
          {/* STEP 3: CONFIRMAÇÃO */}
          {step === 'confirm' && selectedEvent && (
            <div className="space-y-4">
              {/* Aviso */}
              <div className={`p-4 ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border border-red-600/20 rounded-lg`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-red-200' : 'text-red-800'} mb-1`}>
                      Atenção!
                    </p>
                    <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                      Esta ação não pode ser desfeita. O agendamento será cancelado permanentemente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalhes do Evento */}
              <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-gray-50'} border ${border} rounded-lg space-y-3`}>
                <p className={`text-xs ${textMuted} mb-2`}>Agendamento a ser cancelado:</p>
                
                <div className={`flex items-center gap-2 ${textPrimary}`}>
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedEvent.summary}</span>
                </div>
                
                <div className={`flex items-center gap-2 ${textMuted} text-sm`}>
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(selectedEvent.start.dateTime).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 ${textMuted} text-sm`}>
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedEvent.start.dateTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Motivo (opcional) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Motivo do cancelamento (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-red-500 transition resize-none`}
                />
              </div>

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
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Confirmar Cancelamento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCESSO */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-red-900/30' : 'bg-red-100'} flex items-center justify-center mb-4`}>
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Agendamento Cancelado</h3>
              <p className={`text-sm ${textMuted} text-center`}>
                O agendamento foi cancelado com sucesso.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
