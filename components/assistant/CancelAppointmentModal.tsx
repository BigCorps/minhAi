'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, XCircle, Loader2, AlertCircle, Calendar, Clock, User, CheckCircle } from 'lucide-react';
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

export default function CancelAppointmentModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: CancelAppointmentModalProps) {
  const { companyId, transcript } = data;
  
  const [step, setStep] = useState<'search' | 'confirm' | 'success'>('search');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Campos de busca
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Motivo do cancelamento
  const [cancelReason, setCancelReason] = useState('');
  
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
      setStep('confirm');
      if (playText) {
        playText('Agendamento encontrado. Confirme o cancelamento.').catch(() => {});
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

  async function handleCancel() {
    if (!appointment) return;
    
    try {
      setCancelling(true);
      setError(null);

      const response = await supabase.functions.invoke('cancelar-agendamento', {
        body: {
          company_id: companyId,
          appointment_id: appointment.id,
          cancel_reason: cancelReason || undefined,
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
        setError(result.speech_text || 'Erro ao cancelar agendamento.');
        if (playText) {
          playText(result.speech_text || 'Erro ao cancelar agendamento.').catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Erro ao cancelar:', err);
      setError('Erro ao cancelar agendamento. Tente novamente.');
      if (playText) {
        playText('Erro ao cancelar agendamento. Tente novamente.').catch(() => {});
      }
    } finally {
      setCancelling(false);
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-red-950/40' : 'bg-red-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Cancelar Agendamento
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'search' && 'Encontre seu agendamento'}
                  {step === 'confirm' && 'Confirme o cancelamento'}
                  {step === 'success' && 'Cancelamento concluído'}
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
        <div className="h-1 bg-gray-200 dark:bg-slate-800">
          <div
            className="h-full bg-red-600 transition-all duration-300"
            style={{
              width:
                step === 'search' ? '33%' :
                step === 'confirm' ? '66%' : '100%'
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: SEARCH */}
          {step === 'search' && (
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

              <p className={`text-sm ${textMuted}`}>
                Para cancelar, informe o email ou telefone usado no agendamento:
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
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-red-500 focus:border-transparent transition disabled:opacity-50`}
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
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-red-500 focus:border-transparent transition disabled:opacity-50`}
                />
              </div>

              <button
                onClick={() => searchAppointment()}
                disabled={loading || (!customerEmail && !customerPhone)}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
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

          {/* STEP 2: CONFIRM */}
          {step === 'confirm' && appointment && (
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

              {/* Warning */}
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'} mb-1`}>
                      Atenção
                    </p>
                    <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Esta ação não pode ser desfeita. O agendamento será cancelado permanentemente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalhes do Agendamento */}
              <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-3`}>
                  Agendamento a ser Cancelado
                </h3>
                
                <div className="space-y-3">
                  {/* Data */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-xs ${textMuted} mb-0.5`}>Data</p>
                      <p className={`text-sm font-medium ${textPrimary}`}>
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                  </div>

                  {/* Horário */}
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-xs ${textMuted} mb-0.5`}>Horário</p>
                      <p className={`text-sm font-medium ${textPrimary}`}>
                        {formatTime(appointment.appointment_date)}
                      </p>
                    </div>
                  </div>

                  {/* Serviço */}
                  {appointment.service_type && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-xs ${textMuted} mb-0.5`}>Serviço</p>
                        <p className={`text-sm font-medium ${textPrimary}`}>
                          {appointment.service_type}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo do Cancelamento */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Motivo do cancelamento (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Imprevisto, mudança de planos, não poderei comparecer..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none`}
                />
                <p className={`text-xs ${textMuted} mt-1`}>
                  Opcional: Informe o motivo para ajudar a melhorar nossos serviços.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('search')}
                  disabled={cancelling}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } disabled:opacity-50`}
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Confirmar Cancelamento
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
                Agendamento Cancelado
              </h3>
              <p className={`text-sm ${textMuted} text-center max-w-md`}>
                Seu agendamento foi cancelado com sucesso. Esperamos vê-lo em uma próxima oportunidade.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className={`px-6 py-4 border-t ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <p className={`text-xs ${textMuted} text-center`}>
              {step === 'search' 
                ? 'Use o email ou telefone cadastrado no momento do agendamento.'
                : 'Tem certeza que deseja cancelar este agendamento?'
              }
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
