'use client';

import { useState, useEffect, useRef } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
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
  playText?: (text: string) => Promise<void>; // ✅ adicionar
}

export default function CreateEventModal({
  data,
  onClose,
  theme = 'dark',
  playText,
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

  const handleCreateEventRef = useRef<() => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});
  
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
        ;
      }

      console.log('✅ Confirmando criação do evento...');
      handleCreateEvent();
    };

    window.addEventListener('confirmCreateEvent', handleVoiceConfirm);

     () => {
      isActive = false;
      window.removeEventListener('confirmCreateEvent', handleVoiceConfirm);
    };
  }, [isCreating, selectedTime, eventTitle, selectedDate]);

// Recognition de voz ativo na tela de agendamento
useModalVoiceCommand({
  onTranscript: (transcript) => {
    console.log('🎤 [Agendamento] Ouviu:', transcript);

    const CONFIRM_TRIGGERS = [
      'confirmar', 'confirma', 'confirme', 'pode marcar', 'marcar', 'agendar',
      'criar evento', 'pode agendar', 'sim', 'correto', 'esta certo',
      'ta certo', 'ok', 'confirmar evento', 'confirmar agendamento',
    ];
    const CANCEL_TRIGGERS = ['cancelar', 'cancela', 'fechar', 'nao', 'sair'];

    const CORRECTION_PATTERNS = [
      {
        pattern: /(?:mud[ae]r?|alter[ae]r?|corrig[ie]r?|troc[ae]r?)\s+(?:o\s+)?nome\s+(?:para|pra)\s+(.+)/i,
        action: (match: RegExpMatchArray) => {
          const novoNome = match[1].trim();
          setEventTitle(novoNome);
          showToast(`Nome atualizado: ${novoNome}`, 'success');
        },
      },
      {
        pattern: /(?:mud[ae]r?|alter[ae]r?|corrig[ie]r?|troc[ae]r?)\s+(?:o\s+|a\s+)?(?:horario|hora)\s+(?:para|pra|as|às)?\s*(\d{1,2})(?:[h:]\s*(\d{2})?)?/i,
        action: (match: RegExpMatchArray) => {
          const hora = match[1].padStart(2, '0');
          const minuto = (match[2] || '00').padStart(2, '0');
          setSelectedTime(`${hora}:${minuto}`);
          showToast(`Horário atualizado: ${hora}:${minuto}`, 'success');
        },
      },
      {
        pattern: /(?:mud[ae]r?|alter[ae]r?|corrig[ie]r?|troc[ae]r?)\s+(?:o\s+|a\s+|para\s+)?(?:o\s+)?(?:data|dia)\s+(?:para|pra)?\s*(?:o\s+)?(?:dia\s+)?(\d{1,2})/i,
        action: (match: RegExpMatchArray) => {
          const dia = parseInt(match[1]);
          const novaData = new Date(selectedDate);
          novaData.setDate(dia);
          setSelectedDate(novaData);
          showToast(`Data atualizada: dia ${dia}`, 'success');
        },
      },
      {
        pattern: /(?:mud[ae]r?|alter[ae]r?)\s+para\s+(?:o\s+)?dia\s+(\d{1,2})/i,
        action: (match: RegExpMatchArray) => {
          const dia = parseInt(match[1]);
          const novaData = new Date(selectedDate);
          novaData.setDate(dia);
          setSelectedDate(novaData);
          showToast(`Data atualizada: dia ${dia}`, 'success');
        },
      },
    ];

    // Horário solto
    const horarioSolto = transcript.match(/(?:as)\s*(\d{1,2})(?:[h:]\s*(\d{2})?)?\s*(?:horas?)?/);
    if (horarioSolto && !selectedTime && !transcript.includes('mud') && !transcript.includes('alter')) {
      const hora = horarioSolto[1].padStart(2, '0');
      const minuto = (horarioSolto[2] || '00').padStart(2, '0');
      setSelectedTime(`${hora}:${minuto}`);
      showToast(`Horário definido: ${hora}:${minuto}`, 'success');
      return;
    }

    // Nome com contexto "com X"
    const nomeComContexto = transcript.match(
      /^(?:(.+?)\s+)?com\s+([a-záéíóúàâêôãõç][a-záéíóúàâêôãõç\s]{1,30})$/i
    );
    if (nomeComContexto && !transcript.includes('mud') && !transcript.includes('confirm') && !transcript.includes('cancel')) {
      const tipoEvento = nomeComContexto[1]?.trim();
      const nomeCliente = nomeComContexto[2]?.trim();
      const titulo = tipoEvento
        ? `${tipoEvento.charAt(0).toUpperCase() + tipoEvento.slice(1)} com ${nomeCliente.charAt(0).toUpperCase() + nomeCliente.slice(1)}`
        : nomeCliente.charAt(0).toUpperCase() + nomeCliente.slice(1);
      setEventTitle(titulo);
      showToast(`Evento definido: ${titulo}`, 'success');
      return;
    }

    // Dia solto
    const diaSolto = transcript.match(/(?:dia|no dia)\s+(\d{1,2})/);
    if (diaSolto && !transcript.includes('mud') && !transcript.includes('alter')) {
      const dia = parseInt(diaSolto[1]);
      const novaData = new Date(selectedDate);
      novaData.setDate(dia);
      setSelectedDate(novaData);
      showToast(`Data definida: dia ${dia}`, 'success');
      return;
    }

    // Correções
    for (const { pattern, action } of CORRECTION_PATTERNS) {
      const match = transcript.match(pattern);
      if (match) { action(match); return; }
    }

    // Confirmar
    if (CONFIRM_TRIGGERS.some(t => transcript.includes(t))) {
      handleCreateEventRef.current();
      return;
    }

    // Cancelar
    if (CANCEL_TRIGGERS.some(t => transcript.includes(t))) {
      onCloseRef.current();
    }
  }
});
  
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

      showToast('✅ Evento agendado com sucesso!', 'success');
      playText?.(`Evento agendado!`);
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

  useEffect(() => {
    handleCreateEventRef.current = handleCreateEvent;
  }, [selectedDate, selectedTime, eventTitle, isCreating]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
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

{/* Indicador de escuta ativa */}
<div className="flex justify-center">
  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
    isDark
      ? 'bg-green-900/30 text-green-300 border border-green-700'
      : 'bg-green-50 text-green-700 border border-green-200'
  }`}>
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    Ouvindo... confirme ou diga "muda o nome para..."
  </div>
</div>
          
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