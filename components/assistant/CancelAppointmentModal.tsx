'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Loader2, AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
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

  const supabase = createClient();

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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/listar-eventos-google`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            time_min: `${searchDate}T00:00:00`,
            time_max: `${searchDate}T23:59:59`,
          }),
        }
      );

      const result = await response.json();

      if (!result.success || !result.events || result.events.length === 0) {
        setError('Nenhum agendamento encontrado para esta data');
        setEvents([]);
        if (playText) {
          playText('Nenhum agendamento encontrado para esta data').catch(() => {});
        }
        return;
      }

      let filteredEvents = result.events;

      if (searchTime) {
        filteredEvents = filteredEvents.filter((event: Event) => {
          const eventTime = new Date(event.start.dateTime).toTimeString().substring(0, 5);
          return eventTime === searchTime;
        });
      }

      if (searchName) {
        const nameLower = searchName.toLowerCase();
        filteredEvents = filteredEvents.filter((event: Event) =>
          event.summary?.toLowerCase().includes(nameLower)
        );
      }

      if (filteredEvents.length === 0) {
        setError('Nenhum agendamento encontrado com os critérios informados');
        setEvents([]);
        if (playText) {
          playText('Nenhum agendamento encontrado').catch(() => {});
        }
        return;
      }

      setEvents(filteredEvents);
      
      if (filteredEvents.length === 1) {
        setSelectedEvent(filteredEvents[0]);
        setStep('confirm');
        if (playText) {
          playText('Agendamento encontrado. Confirme o cancelamento.').catch(() => {});
        }
      } else {
        setStep('select_event');
        if (playText) {
          playText(`Encontrei ${filteredEvents.length} agendamentos. Selecione qual deseja cancelar.`).catch(() => {});
        }
      }

    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Erro ao buscar agendamentos. Tente novamente.');
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
      // Chamar Edge Function para cancelar
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancelar-agendamento`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            event_id: selectedEvent.id,
            cancel_reason: cancelReason || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        if (playText) {
          await playText('Agendamento cancelado com sucesso.');
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
                  placeholder="Ex: João, Reunião..."
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-red-500 transition`}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !searchDate}
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
          {step === 'select_event' && (
            <div className="space-y-4">
              <p className={`text-sm ${textMuted} mb-3`}>
                Encontramos {events.length} agendamentos. Selecione qual deseja cancelar:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setStep('confirm');
                    }}
                    className={`w-full p-4 ${isDark ? 'bg-slate-800 hover:bg-slate-750' : 'bg-gray-50 hover:bg-gray-100'} border ${border} rounded-lg text-left transition`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${textPrimary} truncate`}>
                          {event.summary || 'Sem título'}
                        </div>
                        <div className={`text-sm ${textMuted}`}>
                          {new Date(event.start.dateTime).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('search')}
                className={`w-full py-3 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} rounded-lg font-semibold transition`}
              >
                Voltar à Busca
              </button>
            </div>
          )}

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
