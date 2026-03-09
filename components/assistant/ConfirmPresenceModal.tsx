'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Loader2, AlertCircle, Calendar, Clock, MapPin, User } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface ConfirmPresenceModalProps {
  data: {
    companyId: string;
    transcript?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function ConfirmPresenceModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ConfirmPresenceModalProps) {
  const { companyId, transcript } = data;
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Campos de busca
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const supabase = createClient();
  const isDark = theme === 'dark';
  
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    // Tentar buscar automaticamente se tiver email/telefone no transcript
    const emailMatch = transcript?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const phoneMatch = transcript?.match(/(\d{10,11})/);
    
    if (emailMatch) {
      setCustomerEmail(emailMatch[1]);
      searchAppointment(emailMatch[1], undefined);
    } else if (phoneMatch) {
      setCustomerPhone(phoneMatch[1]);
      searchAppointment(undefined, phoneMatch[1]);
    } else {
      setLoading(false);
    }
  }, []);

  async function searchAppointment(email?: string, phone?: string) {
    try {
      setLoading(true);
      setError(null);
      setSearchAttempted(true);
      
      const searchEmail = email || customerEmail;
      const searchPhone = phone || customerPhone;
      
      if (!searchEmail && !searchPhone) {
        setError('Por favor, informe seu email ou telefone.');
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('confirmar-presenca', {
        body: {
          company_id: companyId,
          customer_email: searchEmail || undefined,
          customer_phone: searchPhone || undefined,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;

      if (result.success) {
        if (result.already_confirmed) {
          setSuccess(true);
          setAppointment(result.appointment);
          if (playText) {
            playText(result.speech_text).catch(() => {});
          }
        } else {
          setAppointment(result.appointment);
        }
      } else {
        setError(result.speech_text || 'Agendamento não encontrado.');
        if (playText) {
          playText(result.speech_text || 'Agendamento não encontrado.').catch(() => {});
        }
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

  async function handleConfirm() {
    if (!appointment) return;
    
    try {
      setConfirming(true);
      setError(null);

      const response = await supabase.functions.invoke('confirmar-presenca', {
        body: {
          company_id: companyId,
          appointment_id: appointment.id,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;

      if (result.success) {
        setSuccess(true);
        if (playText) {
          playText(result.speech_text).catch(() => {});
        }
        
        // Fechar após 3 segundos
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(result.speech_text || 'Erro ao confirmar presença.');
        if (playText) {
          playText(result.speech_text || 'Erro ao confirmar presença.').catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Erro ao confirmar:', err);
      setError('Erro ao confirmar presença. Tente novamente.');
      if (playText) {
        playText('Erro ao confirmar presença. Tente novamente.').catch(() => {});
      }
    } finally {
      setConfirming(false);
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
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-green-950/40' : 'bg-green-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Confirmar Presença
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  Confirme sua presença no agendamento
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

        {/* Content */}
        <div className="p-6">
          {loading ? (
            // Loading State
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-green-500 mb-4" />
              <p className={`text-sm ${textMuted}`}>Buscando seu agendamento...</p>
            </div>
          ) : success ? (
            // Success State
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>
                Presença Confirmada!
              </h3>
              <p className={`text-sm ${textMuted} text-center`}>
                Sua presença foi confirmada com sucesso. Aguardamos você no horário marcado.
              </p>
            </div>
          ) : appointment ? (
            // Appointment Found - Show Details
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-3`}>
                  Detalhes do Agendamento
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

                  {/* Status */}
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-xs ${textMuted} mb-0.5`}>Status</p>
                      <p className={`text-sm font-medium ${textPrimary}`}>
                        {appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Confirmação */}
              {appointment.status !== 'confirmed' && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmar Presença
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            // Search Form
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
                Para confirmar sua presença, informe seu email ou telefone usado no agendamento:
              </p>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent transition`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
                <span className={`text-xs ${textMuted}`}>OU</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
              </div>

              {/* Telefone */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Telefone
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent transition`}
                />
              </div>

              {/* Botão de Busca */}
              <button
                onClick={() => searchAppointment()}
                disabled={!customerEmail && !customerPhone}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
              >
                Buscar Agendamento
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !success && (
          <div className={`px-6 py-4 border-t ${border} flex justify-end gap-3`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
