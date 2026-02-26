'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface CreateEventModalProps {
  data: {
    companyId: string;
    prefilledData?: {
      date?: Date;
      time?: string;
      name?: string;
    };
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function CreateEventModal({
  data,
  onClose,
  theme = 'dark',
}: CreateEventModalProps) {
  const { companyId, prefilledData } = data;
  
  const [selectedDate, setSelectedDate] = useState<Date>(
    prefilledData?.date || new Date()
  );
  const [selectedTime, setSelectedTime] = useState(
    prefilledData?.time || ''
  );
  const [eventTitle, setEventTitle] = useState(
    prefilledData?.name || ''
  );
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  
  const supabase = createClient();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Listener para confirmação por voz
  useEffect(() => {
    let isActive = true;

    const handleVoiceConfirm = (event: any) => {
      console.log('🎤 [CreateEvent] Evento de confirmação por voz recebido:', event.detail);

      if (!isActive) {
        console.log('⚠️ Componente não está ativo');
        return;
      }

      if (isCreating) {
        console.log('⚠️ Já está enviando');
        return;
      }

      if (!selectedTime || !eventTitle) {
        console.log('⚠️ Dados incompletos:', { selectedTime, eventTitle });
        showToast('Por favor, preencha todos os campos antes de confirmar', 'warning');
        return;
      }

      console.log('✅ Confirmando criação do evento...');
      handleCreateEvent();
    };

    window.addEventListener('confirmCreateEvent', handleVoiceConfirm);

    return () => {
      isActive = false;
      window.removeEventListener('confirmCreateEvent', handleVoiceConfirm);
    };
  }, [isCreating, selectedTime, eventTitle, selectedDate]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
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

      // Calcular data/hora de fim (sempre 1 hora de duração)
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60);

      const { data: result, error } = await supabase.functions.invoke('criar-evento-calendario', {
        body: {
          company_id: companyId,
          summary: eventTitle,
          description: '',
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    setSelectedDate(newDate);
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

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
        data-modal-type="create-event"
        data-modal="create-event"
        role="dialog"
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 flex flex-col`}
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
                  Preencha os dados do seu compromisso
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
        <div className="p-6 space-y-4">
          
          {/* Info sobre Ver Agenda */}
          <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'} text-center`}>
              Veja as datas disponíveis na função <strong>Ver Agenda</strong>
            </p>
          </div>

          {/* Data Selecionada */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
              Data *
            </label>
            <input
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={handleDateChange}
              className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
            />
            <p className={`text-xs ${textMuted} mt-1`}>
              Data selecionada: {selectedDate.toLocaleDateString('pt-BR', { 
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
            <p className={`text-xs ${textMuted} mt-1`}>
              Duração: 1 hora
            </p>
          </div>

          {/* Nome */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
              Nome *
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
            />
          </div>

          {/* Botão de Criar */}
          <button
            onClick={handleCreateEvent}
            disabled={isCreating || !selectedTime || !eventTitle}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mt-6"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando evento...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Criar Evento
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
