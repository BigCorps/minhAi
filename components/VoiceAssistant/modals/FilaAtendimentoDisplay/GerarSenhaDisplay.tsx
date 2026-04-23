'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { triggerAutoPrint, formatQueueReceipt } from '@/lib/auto-print';
import { 
  MapPin, 
  Clock, 
  Bell, 
  RefreshCw, 
  XCircle 
} from 'lucide-react';

const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  border: '#475569',
  accent: '#000080',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  border: '#cbd5e1',
  accent: '#000080',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

interface GerarSenhaDisplayProps {
  data: { companyId: string; slug?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  /** Se true, exibe botão de impressão ao gerar senha (requer plano ativo) */
  printOnQueue?: boolean;
  hasActivePlan?: boolean;
}

interface FilaSenha {
  id: string;
  senha_completa: string;
  numero: number;
  gerada_em: string;
  status: string;
  chamada_em?: string;
}

interface FilaConfig {
  id: string;
  fila_ativa: boolean;
  mensagem_fila_pausada: string;
  tempo_medio_atendimento: number;
  prefixo_senha: string;
  ultimo_numero_gerado: number;
}

export default function GerarSenhaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  printOnQueue = false,
  hasActivePlan = false,
}: GerarSenhaDisplayProps) {
  const colors = theme === 'dark' ? DARK : LIGHT;
  const { companyId, slug } = data;

  const [loading, setLoading] = useState(true);
  const [senha, setSenha] = useState<FilaSenha | null>(null);
  const [posicao, setPosicao] = useState(0);
  const [ultimaChamada, setUltimaChamada] = useState<FilaSenha | null>(null);
  const [tempoEstimado, setTempoEstimado] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const supabase = createClient();
  
  const [companyNameStr, setCompanyNameStr] = useState('');

  const handleAutoPrint = async (senhaData: FilaSenha, pos: number, tempo: number) => {
    if (!hasActivePlan || !printOnQueue) return;

    const receiptContent = formatQueueReceipt({
      companyName: companyNameStr,
      senhaCompleta: senhaData.senha_completa,
      posicao: pos,
      tempoEstimado: tempo,
    });

    const result = await triggerAutoPrint({
      companyId,
      trigger: 'queue',
      content: receiptContent,
    });

    if (result.useWindowPrint) {
      window.print();
    } else if ((result as any).useThermalPrint && (result as any).thermalContent) {
      try {
        const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
        await thermalPrinterService.printText((result as any).thermalContent, { cut: true });
      } catch (e) { console.error('Erro impressão térmica:', e); }
    }
    // remota: edge já executou
  };

  // Detectar mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gerar senha automaticamente ao abrir
  useEffect(() => {
    gerarNovaSenha();
  }, []);

  // Timer de 15 segundos para fechar automaticamente
  useEffect(() => {
    if (!senha) return;

    const timer = setTimeout(() => {
      onClose();
    }, 15000); // 15 segundos

    return () => clearTimeout(timer);
  }, [senha, onClose]);

  // Gerar URL do QR Code via API interna sempre que a senha mudar
  useEffect(() => {
    if (senha && slug) {
      const acompanhamentoUrl = `https://${slug}.minhai.app/fila-acompanhamento/${senha.id}`;
      const url = `/api/qrcode?size=200&data=${encodeURIComponent(acompanhamentoUrl)}&color=%23000080&company_id=${companyId}`;
      setQrCodeUrl(url);
    }
  }, [senha, slug, companyId]);

  // Realtime para atualizar posição
  useEffect(() => {
    if (!senha) return;

    const channel = supabase
      .channel(`senha-${senha.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_senhas',
        filter: `company_id=eq.${companyId}`,
      }, async () => {
        await atualizarPosicao();
      })
      .subscribe();

    // Atualizar posição a cada 10s
    const interval = setInterval(atualizarPosicao, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [senha, companyId]);

  async function gerarNovaSenha() {
    try {
      setLoading(true);

      const { data: config, error: configError } = await supabase
        .from('fila_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('fila_ativa', true)
        .maybeSingle();

      if (configError) {
        console.error('Erro ao buscar config:', configError);
      }

      if (!config) {
        showToast('Fila não disponível no momento', 'error');
        setLoading(false);
        return;
      }

      // Verificar se fila está ativa
      if (!config.fila_ativa) {
        showToast(config.mensagem_fila_pausada || 'Fila pausada', 'error');
        setLoading(false);
        return;
      }

      // Incrementar número
      const proximoNumero = config.ultimo_numero_gerado + 1;
      const senhaCompleta = `${config.prefixo_senha}${proximoNumero.toString().padStart(3, '0')}`;

      // Criar senha
      const { data: novaSenha, error: senhaError } = await supabase
        .from('fila_senhas')
        .insert({
          company_id: companyId,
          fila_config_id: config.id,
          senha_completa: senhaCompleta,
          numero: proximoNumero,
          prefixo: config.prefixo_senha,
          status: 'aguardando',
        })
        .select()
        .single();

      if (senhaError || !novaSenha) {
        console.error('Erro ao criar senha:', senhaError);
        showToast('Erro ao gerar senha', 'error');
        setLoading(false);
        return;
      }

      // Atualizar último número
      await supabase
        .from('fila_configs')
        .update({ ultimo_numero_gerado: proximoNumero })
        .eq('id', config.id);

      setSenha(novaSenha);

      // TTS
      if (playText) {
        const prefixo = senhaCompleta[0];
        const numeros = senhaCompleta.slice(1).split('');
        const texto = `Sua senha é ${prefixo}. ${numeros.join('. ')}. Aguarde ser chamado.`;
        await playText(texto);
      }

      // Calcular posição e tempo
      await atualizarPosicao();

      setLoading(false);
      showToast('Senha gerada com sucesso!', 'success');

      // Impressão automática — dispara se print_on_queue estiver ativo
      if (printOnQueue && hasActivePlan) {
        // posicao e tempoEstimado ainda não foram atualizados no state (async)
        // usamos os valores calculados em atualizarPosicao via state updates
        // por isso chamamos com um pequeno delay para garantir que o state atualizou
        setTimeout(() => {
          handleAutoPrint(novaSenha, posicao, tempoEstimado);
        }, 300);
      }

    } catch (error) {
      console.error('Erro ao gerar senha:', error);
      showToast('Erro ao gerar senha', 'error');
      setLoading(false);
    }
  }

  async function atualizarPosicao() {
    if (!senha) return;

    try {
      // Calcular posição
      const { count } = await supabase
        .from('fila_senhas')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .lt('gerada_em', senha.gerada_em);

      setPosicao(count || 0);

      const { data: ultimaSenha, error: ultimaError } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('chamada_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimaError) {
        console.error('Erro ao buscar última senha:', ultimaError);
      }

      if (ultimaSenha) {
        setUltimaChamada(ultimaSenha);
      }

      const { data: config, error: configError } = await supabase
        .from('fila_configs')
        .select('tempo_medio_atendimento')
        .eq('company_id', companyId)
        .maybeSingle();

      if (configError) {
        console.error('Erro ao buscar config:', configError);
      }

      if (config) {
        setTempoEstimado((count || 0) * config.tempo_medio_atendimento);
      }

    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
    }
  }

  async function cancelarSenha() {
    if (!senha) return;

    try {
      await supabase
        .from('fila_senhas')
        .update({ status: 'cancelado' })
        .eq('id', senha.id);

      showToast('Senha cancelada', 'info');

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Erro ao cancelar:', error);
      showToast('Erro ao cancelar senha', 'error');
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Gerando senha...</div>
      </div>,
      document.body
    );
  }

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.bg,
          borderRadius: '16px',
          width: '100%',
          maxWidth: isMobile ? '500px' : '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: colors.text, fontSize: '20px', fontWeight: '600' }}>
            Sua Senha da Fila
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {senha && (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '20px',
            }}>
              {/* Lado Esquerdo: Senha + Informações */}
              <div style={{ flex: isMobile ? 'none' : '1' }}>
                {/* Número da senha */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '40px 20px',
                  marginBottom: '20px',
                  textAlign: 'center',
                  border: `2px solid ${colors.accent}`,
                }}>
                  <div style={{ fontSize: '72px', fontWeight: 'bold', color: colors.accent }}>
                    {senha.senha_completa}
                  </div>
                </div>

                {/* Informações */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ color: colors.textSecondary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin className="w-4 h-4" />
                      Posição na fila
                    </div>
                    <div style={{ color: colors.text, fontSize: '20px', fontWeight: '600' }}>
                      {posicao === 0 ? 'Você é o próximo!' : `${posicao}ª na fila`}
                    </div>
                  </div>

                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ color: colors.textSecondary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock className="w-4 h-4" />
                      Tempo estimado
                    </div>
                    <div style={{ color: colors.text, fontSize: '20px', fontWeight: '600' }}>
                      {tempoEstimado} minutos
                    </div>
                  </div>

                  {ultimaChamada && (
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell className="w-4 h-4" />
                        Última Chamada
                      </div>
                      <div style={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}>
                        {ultimaChamada.senha_completa}
                      </div>
                      <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                        {new Date(ultimaChamada.chamada_em || ultimaChamada.gerada_em).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões (só aparecem no mobile) */}
                {isMobile && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                      onClick={atualizarPosicao}
                      style={{
                        background: 'transparent',
                        border: `2px solid ${colors.accent}`,
                        borderRadius: '8px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </button>

                    <button
                      onClick={cancelarSenha}
                      style={{
                        background: 'transparent',
                        border: `2px solid ${colors.danger}`,
                        borderRadius: '8px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.danger,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </button>

                    {printOnQueue && (
                      <button
                        onClick={() => senha && handleAutoPrint(senha, posicao, tempoEstimado)}
                        disabled={!hasActivePlan}
                        style={{
                          gridColumn: '1 / -1',
                          background: hasActivePlan ? '#f97316' : '#d1d5db',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '16px',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: hasActivePlan ? '#fff' : '#9ca3af',
                          cursor: hasActivePlan ? 'pointer' : 'not-allowed',
                          opacity: hasActivePlan ? 1 : 0.6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                        title={!hasActivePlan ? 'Impressão disponível apenas para planos ativos' : undefined}
                      >
                        <svg style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {!hasActivePlan ? 'Impressão (plano inativo)' : 'Imprimir Senha'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Lado Direito: QR Code */}
              {qrCodeUrl && (
                <div style={{
                  flex: isMobile ? 'none' : '0 0 300px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '12px',
                  }}>
                    <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                      Escaneie para acompanhar
                    </div>
                    <div style={{
                      background: '#fff',
                      padding: '16px',
                      borderRadius: '8px',
                      display: 'inline-block',
                      marginBottom: '12px',
                    }}>
                      <img
                        src={qrCodeUrl}
                        alt="QR Code acompanhamento"
                        style={{ width: '200px', height: '200px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    
                    {/* Botão de link clicável */}
                    {slug && senha && (
                      <a
                        href={`https://minhai.app/fila-acompanhamento/${senha.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          background: colors.accent,
                          color: '#fff',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        Abrir Acompanhamento
                      </a>
                    )}
                  </div>

                  {/* Botões (só aparecem no desktop) */}
                  {!isMobile && (
                    <div style={{ width: '100%' }}>
                      <button
                        onClick={atualizarPosicao}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: `2px solid ${colors.accent}`,
                          borderRadius: '8px',
                          padding: '16px',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: colors.accent,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar Posição
                      </button>

                      <button
                        onClick={cancelarSenha}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: `2px solid ${colors.danger}`,
                          borderRadius: '8px',
                          padding: '16px',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: colors.danger,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: printOnQueue ? '12px' : '0',
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar Senha
                      </button>

                      {printOnQueue && (
                        <button
                          onClick={() => senha && handleAutoPrint(senha, posicao, tempoEstimado)}
                          disabled={!hasActivePlan}
                          style={{
                            width: '100%',
                            background: hasActivePlan ? '#f97316' : '#d1d5db',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '16px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: hasActivePlan ? '#fff' : '#9ca3af',
                            cursor: hasActivePlan ? 'pointer' : 'not-allowed',
                            opacity: hasActivePlan ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                          title={!hasActivePlan ? 'Impressão disponível apenas para planos ativos' : undefined}
                        >
                          <svg style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          {!hasActivePlan ? 'Impressão (plano inativo)' : 'Imprimir Senha'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? colors.success : toast.type === 'error' ? colors.danger : colors.warning,
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 400,
          }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );

  // Injeta o container do Turnstile no content antes de renderizar
  const contentWithTurnstile = (
    <>
      {content}
    </>
  );

  return createPortal(contentWithTurnstile, document.body);
}
