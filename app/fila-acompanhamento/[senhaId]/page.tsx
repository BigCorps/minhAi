'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import { MapPin, Clock, Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface FilaAcompanhamentoPageProps {
  params: Promise<{ senhaId: string }>;
}

interface FilaSenha {
  id: string;
  senha_completa: string;
  status: string;
  gerada_em: string;
  chamada_em?: string;
  company_id: string;
}

interface FilaConfig {
  tempo_medio_atendimento: number;
}

const STATUS_LABELS = {
  aguardando: 'Aguardando',
  chamando: 'Sendo Chamada',
  atendimento: 'Em Atendimento',
  finalizado: 'Finalizada',
  cancelado: 'Cancelada',
};

const STATUS_ICONS = {
  aguardando: Clock,
  chamando: Bell,
  atendimento: AlertCircle,
  finalizado: CheckCircle,
  cancelado: XCircle,
};

const STATUS_COLORS = {
  aguardando: '#f59e0b',
  chamando: '#000080',
  atendimento: '#3b82f6',
  finalizado: '#10b981',
  cancelado: '#ef4444',
};

export default function FilaAcompanhamentoPage({ params }: FilaAcompanhamentoPageProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [senhaId, setSenhaId] = useState<string | null>(null);
  const [senha, setSenha] = useState<FilaSenha | null>(null);
  const [posicao, setPosicao] = useState(0);
  const [tempoEstimado, setTempoEstimado] = useState(0);
  const [ultimaChamada, setUltimaChamada] = useState<FilaSenha | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const theme = mounted ? (resolvedTheme as 'dark' | 'light' || 'dark') : 'dark';

  const colors = theme === 'dark' ? {
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    accent: '#000080',
  } : {
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#cbd5e1',
    accent: '#000080',
  };

  // Mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Await params
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSenhaId(resolvedParams.senhaId);
    }
    unwrapParams();
  }, [params]);

  // Carregar senha
  useEffect(() => {
    if (!senhaId) return;

    carregarSenha();
  }, [senhaId]);

  // Realtime
  useEffect(() => {
    if (!senha) return;

    const channel = supabase
      .channel(`acompanhamento-${senha.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_senhas',
        filter: `id=eq.${senha.id}`,
      }, async (payload) => {
        if (payload.new) {
          setSenha(payload.new as FilaSenha);
          await atualizarPosicao();
        }
      })
      .subscribe();

    // Atualizar a cada 10s
    const interval = setInterval(atualizarPosicao, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [senha]);

  async function carregarSenha() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('id', senhaId)
        .single();

      if (error || !data) {
        console.error('Erro ao carregar senha:', error);
        setLoading(false);
        return;
      }

      setSenha(data);
      await atualizarPosicao();
      setLoading(false);

    } catch (error) {
      console.error('Erro:', error);
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
        .eq('company_id', senha.company_id)
        .eq('status', 'aguardando')
        .lt('gerada_em', senha.gerada_em);

      setPosicao(count || 0);

      // Última chamada
      const { data: ultimaSenha } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', senha.company_id)
        .in('status', ['chamando', 'atendimento'])
        .order('chamada_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimaSenha) {
        setUltimaChamada(ultimaSenha);
      }

      // Tempo estimado
      const { data: config } = await supabase
        .from('fila_configs')
        .select('tempo_medio_atendimento')
        .eq('company_id', senha.company_id)
        .maybeSingle();

      if (config) {
        setTempoEstimado((count || 0) * config.tempo_medio_atendimento);
      }

    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
    }
  }

  if (loading || !mounted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4 ${
            theme === 'dark' 
              ? 'border-blue-500/30 border-t-blue-500' 
              : 'border-blue-600/30 border-t-blue-600'
          }`}></div>
          <div className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (!senha) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Senha não encontrada
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[senha.status as keyof typeof STATUS_ICONS] || Clock;
  const statusColor = STATUS_COLORS[senha.status as keyof typeof STATUS_COLORS] || '#6b7280';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '10px',
          }}>
            Acompanhamento de Senha
          </div>
          <div style={{
            fontSize: '20px',
            color: colors.text,
            fontWeight: '600',
          }}>
            minhAi.app
          </div>
        </div>

        {/* Senha */}
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '20px',
          textAlign: 'center',
          border: `3px solid ${statusColor}`,
          boxShadow: theme === 'dark' 
            ? '0 10px 40px rgba(0,0,0,0.5)' 
            : '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: statusColor,
            marginBottom: '20px',
            lineHeight: 1,
          }}>
            {senha.senha_completa}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: statusColor,
            fontSize: '18px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            <StatusIcon className="w-6 h-6" />
            {STATUS_LABELS[senha.status as keyof typeof STATUS_LABELS] || senha.status}
          </div>
        </div>

        {/* Informações */}
        {senha.status === 'aguardando' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  color: colors.textSecondary,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <MapPin className="w-5 h-5" />
                  Posição na fila
                </div>
                <div style={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}>
                  {posicao === 0 ? 'Você é o próximo!' : `${posicao}ª`}
                </div>
              </div>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  color: colors.textSecondary,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Clock className="w-5 h-5" />
                  Tempo estimado
                </div>
                <div style={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}>
                  {tempoEstimado} min
                </div>
              </div>
            </div>

            {ultimaChamada && (
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{
                  color: colors.textSecondary,
                  fontSize: '12px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <Bell className="w-4 h-4" />
                  Última senha chamada
                </div>
                <div style={{ color: colors.text, fontSize: '32px', fontWeight: 'bold' }}>
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
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: '12px',
          marginTop: '30px',
        }}>
          Atualização automática a cada 10 segundos
        </div>
      </div>
    </div>
  );
}
