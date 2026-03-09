'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Step = 'search' | 'select' | 'success';

interface Event {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export default function ConfirmPresenceModal({
  companyId,
  onClose,
  playText,
}: {
  companyId: string;
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Campos de busca
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [searchName, setSearchName] = useState('');

  // Eventos encontrados
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const supabase = createClientComponentClient();

  // Auto-extrair data/hora/nome do transcript
  useEffect(() => {
    const transcript = (window as any).lastTranscript || '';
    
    // Tentar extrair data (hoje, amanhã, ou dd/mm)
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    if (/hoje/i.test(transcript)) {
      setSearchDate(hoje);
    } else if (/amanh[ãa]/i.test(transcript)) {
      setSearchDate(amanha);
    }
    
    // Tentar extrair horário (ex: "14h", "às 10h30")
    const timeMatch = transcript.match(/(\d{1,2})[:h](\d{2})?/i);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const min = timeMatch[2] || '00';
      setSearchTime(`${hour}:${min}`);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchDate) {
      setError('Por favor, informe a data do agendamento');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Buscar eventos do Google Calendar nessa data
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
        return;
      }

      let filteredEvents = result.events;

      // Filtrar por horário se informado
      if (searchTime) {
        filteredEvents = filteredEvents.filter((event: Event) => {
          const eventTime = new Date(event.start.dateTime).toTimeString().substring(0, 5);
          return eventTime === searchTime;
        });
      }

      // Filtrar por nome se informado
      if (searchName) {
        const nameLower = searchName.toLowerCase();
        filteredEvents = filteredEvents.filter((event: Event) =>
          event.summary?.toLowerCase().includes(nameLower)
        );
      }

      if (filteredEvents.length === 0) {
        setError('Nenhum agendamento encontrado com os critérios informados');
        setEvents([]);
        return;
      }

      setEvents(filteredEvents);
      
      if (filteredEvents.length === 1) {
        // Se encontrou apenas 1, seleciona automaticamente
        setSelectedEvent(filteredEvents[0]);
        setStep('select');
      } else {
        setStep('select');
      }

    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError('');

    try {
      // Aqui você pode adicionar lógica para marcar como confirmado
      // Por exemplo, adicionar uma nota no evento ou salvar em uma tabela
      
      await playText?.(`Presença confirmada para ${selectedEvent.summary} no dia ${new Date(selectedEvent.start.dateTime).toLocaleDateString('pt-BR')}.`);
      
      setStep('success');
      setTimeout(() => onClose(), 3000);

    } catch (err) {
      console.error('Erro ao confirmar presença:', err);
      setError('Erro ao confirmar presença. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Confirmar Presença</h2>
              <p className="text-sm text-slate-400">Confirme seu agendamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: BUSCA */}
          {step === 'search' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Horário (opcional)
                </label>
                <input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Ex: João, Reunião..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !searchDate}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? 'Buscando...' : 'Buscar Agendamento'}
              </button>
            </div>
          )}

          {/* STEP 2: SELEÇÃO/CONFIRMAÇÃO */}
          {step === 'select' && (
            <div className="space-y-4">
              {events.length > 1 && !selectedEvent && (
                <>
                  <p className="text-sm text-slate-400 mb-3">
                    Encontramos {events.length} agendamentos. Selecione um:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-left transition"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">
                              {event.summary || 'Sem título'}
                            </div>
                            <div className="text-sm text-slate-400">
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
                </>
              )}

              {selectedEvent && (
                <>
                  <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{selectedEvent.summary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {new Date(selectedEvent.start.dateTime).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {new Date(selectedEvent.start.dateTime).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedEvent(null);
                        setStep('search');
                      }}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition"
                    >
                      {loading ? 'Confirmando...' : 'Confirmar Presença'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: SUCESSO */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Presença Confirmada!
              </h3>
              <p className="text-slate-400 text-sm">
                Seu agendamento foi confirmado com sucesso.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
