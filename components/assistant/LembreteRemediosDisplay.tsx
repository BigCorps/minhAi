'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Paletas de cor (inline styles)
// ============================================================================

const DARK = {
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(15,23,42,0.6)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  inputBg: 'rgba(30,41,59,0.8)',
  inputBorder: 'rgba(255,255,255,0.1)',
  buttonPrimary: '#FFA500',
  buttonPrimaryHover: '#FF8C00',
  buttonSecondary: 'rgba(255,255,255,0.1)',
  buttonSecondaryHover: 'rgba(255,255,255,0.15)',
};

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  inputBg: '#f1f5f9',
  inputBorder: '#cbd5e1',
  buttonPrimary: '#FFA500',
  buttonPrimaryHover: '#FF8C00',
  buttonSecondary: '#e2e8f0',
  buttonSecondaryHover: '#cbd5e1',
};

// ============================================================================
// Interfaces
// ============================================================================

interface Props {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

// ============================================================================
// Componente
// ============================================================================

export default function LembreteRemediosDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [nomeRemedio, setNomeRemedio] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [horarioPrimeiraDose, setHorarioPrimeiraDose] = useState('');
  const [tipoDuracao, setTipoDuracao] = useState<'dias' | 'comprimidos'>('dias');
  const [valorDuracao, setValorDuracao] = useState('');
  const [modoLembrete, setModoLembrete] = useState<'assistente' | 'calendario' | 'ambos'>('assistente');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  const handleSaveRef = useRef<() => void>(() => {});

  // ── Mount: fala abertura + checa Google + busca config da função ─────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    playText?.('Configure o lembrete de remédio. Preencha os campos ou use comandos de voz.').catch(() => {});

    // Busca configuração da função para pegar modo_lembrete
    supabase
      .from('company_function_settings')
      .select('config')
      .eq('company_id', companyId)
      .eq('function_key', 'lembrete_remedios')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config?.modo_lembrete) {
          setModoLembrete(data.config.modo_lembrete);
        }
      });

    // Verifica se Google está conectado (com escopo de calendar)
    supabase
      .from('google_accounts')
      .select('id, scopes')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        const hasCalendarScope = data?.scopes?.some((scope: string) => scope.includes('calendar'));
        setGoogleConnected(!!(data && hasCalendarScope));
      });
  }, []);

  // ── Toast auto-hide ───────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ── Voice commands ─────────────────────────────────────────────────────────
  useModalVoiceCommand({
    onTranscript: (transcript) => {
      const lower = transcript.toLowerCase().trim();
      
      if (lower.includes('salvar') || lower.includes('confirmar')) {
        handleSaveRef.current();
      } else if (lower.includes('cancelar') || lower.includes('fechar')) {
        onClose();
      }
    },
  });

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [nomeRemedio, intervaloHoras, horarioPrimeiraDose, tipoDuracao, valorDuracao, modoLembrete, isSaving]);

  // ── Cálculo de horários diários ───────────────────────────────────────────
  const calcularHorariosDiarios = (): string[] => {
    if (!intervaloHoras || !horarioPrimeiraDose) return [];
    
    const intervalo = parseInt(intervaloHoras);
    if (isNaN(intervalo) || intervalo <= 0 || intervalo > 24) return [];
    
    const [horaInicial, minutoInicial] = horarioPrimeiraDose.split(':').map(Number);
    const horarios: string[] = [];
    
    // Sempre começa do horário informado e distribui ao longo de 24h
    let horaAtual = horaInicial;
    let minutoAtual = minutoInicial;
    
    // Adiciona o primeiro horário
    horarios.push(`${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`);
    
    // Calcula quantas doses cabem em 24h
    const dosesPorDia = Math.floor(24 / intervalo);
    
    // Adiciona os demais horários
    for (let i = 1; i < dosesPorDia; i++) {
      horaAtual = (horaInicial + (intervalo * i)) % 24;
      const horarioFormatado = `${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`;
      horarios.push(horarioFormatado);
    }
    
    // Ordena os horários
    return horarios.sort();
  };

  // ── Cálculo de total de dias ──────────────────────────────────────────────
  const calcularTotalDias = (): number => {
    if (!valorDuracao || !intervaloHoras) return 0;
    
    const valor = parseInt(valorDuracao);
    if (isNaN(valor) || valor <= 0) return 0;
    
    if (tipoDuracao === 'dias') {
      return valor;
    } else {
      // comprimidos
      const intervalo = parseInt(intervaloHoras);
      const dosesPorDia = Math.floor(24 / intervalo);
      return Math.ceil(valor / dosesPorDia);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validações
    if (!nomeRemedio.trim()) {
      setToast({ message: 'Informe o nome do remédio', type: 'error' });
      return;
    }
    if (!intervaloHoras) {
      setToast({ message: 'Informe o intervalo entre doses', type: 'error' });
      return;
    }
    if (!horarioPrimeiraDose) {
      setToast({ message: 'Informe o horário da primeira dose', type: 'error' });
      return;
    }
    if (!valorDuracao) {
      setToast({ message: `Informe ${tipoDuracao === 'dias' ? 'o total de dias' : 'a quantidade de comprimidos'}`, type: 'error' });
      return;
    }

    const horariosDiarios = calcularHorariosDiarios();
    if (horariosDiarios.length === 0) {
      setToast({ message: 'Não foi possível calcular os horários', type: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Salva no banco (apenas horários diários)
      const { error: insertError } = await supabase.from('lembretes_remedios').insert({
        company_id: companyId,
        nome_remedio: nomeRemedio.trim(),
        horarios: horariosDiarios,
        modo_lembrete: modoLembrete,
      });

      if (insertError) throw insertError;

      // 2. Se modo incluir calendario, cria TODOS os eventos até o fim do tratamento
      if ((modoLembrete === 'calendario' || modoLembrete === 'ambos') && googleConnected) {
        const totalDias = calcularTotalDias();
        const dataInicio = new Date();
        
        // Para cada dia
        for (let dia = 0; dia < totalDias; dia++) {
          const dataAtual = new Date(dataInicio);
          dataAtual.setDate(dataAtual.getDate() + dia);
          
          // Para cada horário do dia
          for (const horario of horariosDiarios) {
            const [hora, minuto] = horario.split(':').map(Number);
            const dataEvento = new Date(dataAtual);
            dataEvento.setHours(hora, minuto, 0, 0);
            
            // Cria evento no Google Calendar
            await supabase.functions.invoke('criar-evento-calendario', {
              body: {
                company_id: companyId,
                summary: `💊 ${nomeRemedio}`,
                description: `Lembrete de remédio - Dia ${dia + 1}/${totalDias}`,
                start_time: dataEvento.toISOString(),
                end_time: new Date(dataEvento.getTime() + 15 * 60000).toISOString(), // +15 min
              },
            });
          }
        }
      }

      // 3. ✅ DESCONTAR CRÉDITO - Buscar company para pegar user_id
      const { data: companyData } = await supabase
        .from('companies')
        .select('user_id')
        .eq('id', companyId)
        .single();

      if (companyData?.user_id) {
        // Buscar créditos atuais
        const { data: creditsData } = await supabase
          .from('user_credits')
          .select('available_credits, total_used')
          .eq('user_id', companyData.user_id)
          .single();

        if (creditsData && creditsData.available_credits >= 1) {
          // Descontar 1 crédito
          await supabase
            .from('user_credits')
            .update({
              available_credits: creditsData.available_credits - 1,
              total_used: (creditsData.total_used || 0) + 1,
              last_interaction_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', companyData.user_id);

          console.log('✅ 1 crédito descontado');
        }
      }

      setToast({ message: '✅ Lembrete salvo com sucesso!', type: 'success' });
      playText?.('Lembrete de remédio configurado com sucesso!').catch(() => {});
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('Erro ao salvar lembrete:', error);
      setToast({ message: 'Erro ao salvar lembrete', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Preview de horários ────────────────────────────────────────────────────
  const horariosDiarios = calcularHorariosDiarios();
  const totalDias = calcularTotalDias();
  const dosesPorDia = horariosDiarios.length;
  const totalDoses = tipoDuracao === 'comprimidos' 
    ? parseInt(valorDuracao || '0') 
    : dosesPorDia * totalDias;

  // ── Render ────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          style={{
            background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#f59e0b',
          }}
        >
          <span className="text-white font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${colors.border}`,
            background: colors.cardBg,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone SVG inline */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: colors.buttonPrimary }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Lembrete de Remédios
              </h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Configure os horários do tratamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition"
            style={{
              background: colors.buttonSecondary,
              color: colors.textPrimary,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Indicador de escuta ativa */}
          <div className="flex justify-center">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: `${colors.buttonPrimary}20`,
                border: `1px solid ${colors.buttonPrimary}50`,
                color: colors.textPrimary,
              }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors.buttonPrimary }} />
              Ouvindo... diga "salvar" para confirmar
            </div>
          </div>

          {/* Campo 1: Nome do Remédio */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Nome do Remédio *
            </label>
            <input
              type="text"
              value={nomeRemedio}
              onChange={(e) => setNomeRemedio(e.target.value)}
              placeholder="Ex: Paracetamol 500mg"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.textPrimary,
                focusRing: colors.buttonPrimary,
              }}
            />
          </div>

          {/* Campo 2: Intervalo entre doses */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Intervalo entre doses *
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={intervaloHoras}
                onChange={(e) => setIntervaloHoras(e.target.value)}
                placeholder="8"
                min="1"
                max="24"
                className="flex-1 px-4 py-3 rounded-lg text-sm outline-none focus:ring-2"
                style={{
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.textPrimary,
                }}
              />
              <div
                className="flex items-center px-4 rounded-lg text-sm font-medium"
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                horas
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Tempo entre cada dose (ex: 8h = 3x ao dia)
            </p>
          </div>

          {/* Campo 3: Horário da primeira dose */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Horário da primeira dose *
            </label>
            <input
              type="time"
              value={horarioPrimeiraDose}
              onChange={(e) => setHorarioPrimeiraDose(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.textPrimary,
              }}
            />
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              A partir deste horário, os lembretes serão calculados
            </p>
          </div>

          {/* Campo 4: Duração do tratamento */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Duração do tratamento *
            </label>
            <div className="flex gap-3 mb-2">
              <button
                onClick={() => setTipoDuracao('dias')}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: tipoDuracao === 'dias' ? colors.buttonPrimary : colors.buttonSecondary,
                  color: tipoDuracao === 'dias' ? '#ffffff' : colors.textPrimary,
                }}
              >
                Total de dias
              </button>
              <button
                onClick={() => setTipoDuracao('comprimidos')}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: tipoDuracao === 'comprimidos' ? colors.buttonPrimary : colors.buttonSecondary,
                  color: tipoDuracao === 'comprimidos' ? '#ffffff' : colors.textPrimary,
                }}
              >
                Quantidade de comprimidos
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                value={valorDuracao}
                onChange={(e) => setValorDuracao(e.target.value)}
                placeholder={tipoDuracao === 'dias' ? '7' : '21'}
                min="1"
                className="flex-1 px-4 py-3 rounded-lg text-sm outline-none focus:ring-2"
                style={{
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.textPrimary,
                }}
              />
              <div
                className="flex items-center px-4 rounded-lg text-sm font-medium"
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                {tipoDuracao === 'dias' ? 'dias' : 'comprimidos'}
              </div>
            </div>
          </div>

          {/* Preview dos horários */}
          {horariosDiarios.length > 0 && valorDuracao && (
            <div
              className="p-4 rounded-lg border"
              style={{
                background: colors.cardBg,
                borderColor: colors.border,
              }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: colors.textPrimary }}>
                Resumo do tratamento
              </h4>
              <div className="space-y-2 text-sm" style={{ color: colors.textSecondary }}>
                <p>• <strong>Horários diários:</strong> {horariosDiarios.join(', ')}</p>
                <p>• <strong>Doses por dia:</strong> {dosesPorDia}x</p>
                <p>• <strong>Duração:</strong> {totalDias} dia{totalDias !== 1 ? 's' : ''}</p>
                <p>• <strong>Total de doses:</strong> {totalDoses} comprimido{totalDoses !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Botão de Salvar */}
          <button
            onClick={handleSave}
            disabled={isSaving || !nomeRemedio || !intervaloHoras || !horarioPrimeiraDose || !valorDuracao}
            className="w-full px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: colors.buttonPrimary,
              color: '#ffffff',
            }}
          >
            {isSaving ? 'Salvando todas as datas...' : 'Salvar Lembrete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
