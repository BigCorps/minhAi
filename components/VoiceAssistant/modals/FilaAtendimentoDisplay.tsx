'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// Paletas de cores
const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  border: '#475569',
  accent: '#808000',
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
  accent: '#808000',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

interface FilaAtendimentoDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  isFullscreen?: boolean;
}

interface FilaConfig {
  id: string;
  prefixo_senha: string;
  nome_tipo_atendimento: string;
  tempo_medio_atendimento: number;
  max_senhas_dia: number;
  fila_ativa: boolean;
  mensagem_fila_pausada: string;
  ultimo_numero_gerado: number;
}

interface FilaSenha {
  id: string;
  senha_completa: string;
  numero: number;
  status: string;
  gerada_em: string;
  chamada_em?: string;
  atendimento_iniciado_em?: string;
  tempo_espera_minutos?: number;
}

export default function FilaAtendimentoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  isFullscreen = false,
}: FilaAtendimentoDisplayProps) {
  const colors = theme === 'dark' ? DARK : LIGHT;
  const { companyId } = data;

  // Estados
  const [activeTab, setActiveTab] = useState<'atendimento' | 'stats' | 'config' | 'painel'>('atendimento');
  const [config, setConfig] = useState<FilaConfig | null>(null);
  const [senhaAtual, setSenhaAtual] = useState<FilaSenha | null>(null);
  const [senhasAguardando, setSenhasAguardando] = useState<FilaSenha[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalHoje: 0,
    finalizadas: 0,
    aguardando: 0,
    canceladas: 0,
    tempoMedioEspera: 0,
    tempoMedioAtendimento: 0,
  });

  const supabase = createClient();

// ⚠️ TESTE: Forçar headers corretos
supabase.rest.headers = {
  ...supabase.rest.headers,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

  // Carregar configuração e senhas
  useEffect(() => {
    carregarDados();
    
    // Realtime
    const channel = supabase
      .channel('fila-atendimento')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_senhas',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        carregarDados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function carregarDados() {
    try {
      // Carregar config
      const { data: configData } = await supabase
        .from('fila_configs')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (configData) {
        setConfig(configData);
      }

      // Carregar senha em atendimento
      const { data: senhaAtualData } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('gerada_em', { ascending: true })
        .limit(1)
        .single();

      setSenhaAtual(senhaAtualData || null);

      // Carregar senhas aguardando
      const { data: senhasData } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .order('gerada_em', { ascending: true })
        .limit(20);

      setSenhasAguardando(senhasData || []);

      // Carregar stats
      await carregarStats();

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados da fila', 'error');
      setLoading(false);
    }
  }

  async function carregarStats() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data: senhasHoje } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('company_id', companyId)
      .gte('gerada_em', hoje.toISOString());

    if (senhasHoje) {
      const finalizadas = senhasHoje.filter(s => s.status === 'finalizado');
      const tempoEspera = finalizadas
        .filter(s => s.tempo_espera_minutos)
        .map(s => s.tempo_espera_minutos || 0);
      const tempoAtendimento = finalizadas
        .filter(s => s.tempo_atendimento_minutos)
        .map(s => s.tempo_atendimento_minutos || 0);

      setStats({
        totalHoje: senhasHoje.length,
        finalizadas: finalizadas.length,
        aguardando: senhasHoje.filter(s => s.status === 'aguardando').length,
        canceladas: senhasHoje.filter(s => s.status === 'cancelado').length,
        tempoMedioEspera: tempoEspera.length > 0 
          ? Math.round(tempoEspera.reduce((a, b) => a + b, 0) / tempoEspera.length) 
          : 0,
        tempoMedioAtendimento: tempoAtendimento.length > 0 
          ? Math.round(tempoAtendimento.reduce((a, b) => a + b, 0) / tempoAtendimento.length) 
          : 0,
      });
    }
  }

  // Funções principais
  async function chamarProxima() {
    if (!config || senhasAguardando.length === 0) {
      showToast('Não há senhas aguardando', 'info');
      return;
    }

    try {
      const proximaSenha = senhasAguardando[0];

      // Atualizar status para "chamando"
      await supabase
        .from('fila_senhas')
        .update({ 
          status: 'chamando',
          chamada_em: new Date().toISOString(),
        })
        .eq('id', proximaSenha.id);

      // TTS
      await speakSenha(proximaSenha.senha_completa);

      showToast(`Senha ${proximaSenha.senha_completa} chamada!`, 'success');

      // Após 3s, mudar para "atendimento"
      setTimeout(async () => {
        await supabase
          .from('fila_senhas')
          .update({ 
            status: 'atendimento',
            atendimento_iniciado_em: new Date().toISOString(),
          })
          .eq('id', proximaSenha.id);
      }, 3000);

    } catch (error) {
      console.error('Erro ao chamar senha:', error);
      showToast('Erro ao chamar senha', 'error');
    }
  }

  async function finalizarAtendimento() {
    if (!senhaAtual) {
      showToast('Nenhum atendimento em andamento', 'info');
      return;
    }

    try {
      await supabase
        .from('fila_senhas')
        .update({
          status: 'finalizado',
          finalizada_em: new Date().toISOString(),
        })
        .eq('id', senhaAtual.id);

      showToast('Atendimento finalizado!', 'success');
      
      if (playText) {
        await playText('Atendimento finalizado');
      }
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      showToast('Erro ao finalizar atendimento', 'error');
    }
  }

  async function toggleFilaAtiva() {
    if (!config) return;

    try {
      await supabase
        .from('fila_configs')
        .update({ fila_ativa: !config.fila_ativa })
        .eq('id', config.id);

      showToast(
        config.fila_ativa ? 'Fila pausada' : 'Fila retomada',
        'info'
      );
    } catch (error) {
      console.error('Erro ao pausar/retomar:', error);
      showToast('Erro ao alterar status da fila', 'error');
    }
  }

  async function cancelarSenha(senhaId: string) {
    try {
      await supabase
        .from('fila_senhas')
        .update({ status: 'cancelado' })
        .eq('id', senhaId);

      showToast('Senha cancelada', 'success');
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      showToast('Erro ao cancelar senha', 'error');
    }
  }

  // TTS especial para senhas
  async function speakSenha(senhaCompleta: string) {
    const prefixo = senhaCompleta[0];
    const numeros = senhaCompleta.slice(1).split('');
    const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;
    
    if (playText) {
      await playText(texto);
    } else {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Render de cada aba
  const renderAtendimento = () => (
    <div style={{ padding: '20px' }}>
      {/* Última chamada */}
      {senhaAtual && (
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${colors.accent}`,
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
            Última Chamada
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: colors.accent }}>
            {senhaAtual.senha_completa}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
            Status: {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        </div>
      )}

      {/* Aguardando */}
      <div style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
        Aguardando ({senhasAguardando.length} {senhasAguardando.length === 1 ? 'senha' : 'senhas'})
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
        {senhasAguardando.length === 0 ? (
          <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '40px' }}>
            Nenhuma senha aguardando
          </div>
        ) : (
          senhasAguardando.map((senha) => {
            const minutosEspera = Math.floor((Date.now() - new Date(senha.gerada_em).getTime()) / 60000);
            return (
              <div
                key={senha.id}
                style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>
                    {senha.senha_completa}
                  </div>
                  <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
                    há {minutosEspera} min
                  </div>
                </div>
                <button
                  onClick={() => cancelarSenha(senha.id)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.danger}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: colors.danger,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Cancelar
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Botões principais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <button
          onClick={chamarProxima}
          disabled={senhasAguardando.length === 0}
          style={{
            background: senhasAguardando.length > 0 ? colors.accent : colors.bgSecondary,
            color: senhasAguardando.length > 0 ? '#fff' : colors.textSecondary,
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: senhasAguardando.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          📢 Chamar Próxima
        </button>

        <button
          onClick={finalizarAtendimento}
          disabled={!senhaAtual}
          style={{
            background: senhaAtual ? colors.success : colors.bgSecondary,
            color: senhaAtual ? '#fff' : colors.textSecondary,
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: senhaAtual ? 'pointer' : 'not-allowed',
          }}
        >
          ✅ Finalizar Atendimento
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          onClick={toggleFilaAtiva}
          style={{
            background: 'transparent',
            border: `2px solid ${config?.fila_ativa ? colors.warning : colors.success}`,
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: config?.fila_ativa ? colors.warning : colors.success,
            cursor: 'pointer',
          }}
        >
          {config?.fila_ativa ? '⏸️ Pausar Fila' : '▶️ Retomar Fila'}
        </button>

        <button
          onClick={() => setActiveTab('painel')}
          style={{
            background: 'transparent',
            border: `2px solid ${colors.accent}`,
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: colors.accent,
            cursor: 'pointer',
          }}
        >
          📺 Abrir Painel TV
        </button>
      </div>
    </div>
  );

  const renderStats = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        📊 Estatísticas de Hoje
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Total de Senhas</div>
          <div style={{ color: colors.text, fontSize: '32px', fontWeight: 'bold' }}>{stats.totalHoje}</div>
        </div>

        <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Finalizadas</div>
          <div style={{ color: colors.success, fontSize: '32px', fontWeight: 'bold' }}>{stats.finalizadas}</div>
        </div>

        <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Aguardando</div>
          <div style={{ color: colors.warning, fontSize: '32px', fontWeight: 'bold' }}>{stats.aguardando}</div>
        </div>

        <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Canceladas</div>
          <div style={{ color: colors.danger, fontSize: '32px', fontWeight: 'bold' }}>{stats.canceladas}</div>
        </div>
      </div>

      <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
          Tempo Médio de Espera
        </div>
        <div style={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}>
          {stats.tempoMedioEspera} minutos
        </div>
      </div>

      <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
          Tempo Médio de Atendimento
        </div>
        <div style={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}>
          {stats.tempoMedioAtendimento} minutos
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        ⚙️ Configurações da Fila
      </div>

      {config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Prefixo
            </label>
            <input
              type="text"
              value={config.prefixo_senha}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                background: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Nome do Tipo de Atendimento
            </label>
            <input
              type="text"
              value={config.nome_tipo_atendimento}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                background: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Tempo Médio (minutos)
            </label>
            <input
              type="number"
              value={config.tempo_medio_atendimento}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                background: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Máximo de Senhas por Dia
            </label>
            <input
              type="number"
              value={config.max_senhas_dia}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                background: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginTop: '8px',
          }}>
            <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
              Status da Fila
            </div>
            <div style={{
              color: config.fila_ativa ? colors.success : colors.danger,
              fontSize: '16px',
              fontWeight: '600',
            }}>
              {config.fila_ativa ? '✅ Ativa' : '❌ Pausada'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPainel = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
        📺 Painel de Chamadas
      </div>

      <div style={{
        background: colors.bgSecondary,
        borderRadius: '12px',
        padding: '40px',
        marginBottom: '20px',
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
          SENHA ATUAL
        </div>
        <div style={{ fontSize: '72px', fontWeight: 'bold', color: colors.accent }}>
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>
        {senhaAtual && (
          <div style={{ color: colors.textSecondary, fontSize: '16px', marginTop: '12px' }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        )}
      </div>

      <div style={{
        background: colors.bgSecondary,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
          PRÓXIMAS SENHAS
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {senhasAguardando.slice(0, 5).map((senha) => (
            <div
              key={senha.id}
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: colors.text,
                padding: '12px 20px',
                background: colors.bg,
                borderRadius: '8px',
              }}
            >
              {senha.senha_completa}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => window.open(`/fila-painel/${companyId}`, '_blank')}
        style={{
          background: colors.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '16px 32px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Abrir em Tela Cheia
      </button>
    </div>
  );

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
        <div style={{ color: '#fff', fontSize: '18px' }}>Carregando...</div>
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
          maxWidth: '600px',
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
            Fila de Atendimento
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bgSecondary,
        }}>
          {(['atendimento', 'stats', 'config', 'painel'] as const).map((tab) => {
            const icons = {
              atendimento: '🔔',
              stats: '📊',
              config: '⚙️',
              painel: '📺',
            };
            const labels = {
              atendimento: 'Atendimento',
              stats: 'Estatísticas',
              config: 'Configurações',
              painel: 'Painel',
            };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: activeTab === tab ? colors.bg : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${colors.accent}` : 'none',
                  color: activeTab === tab ? colors.text : colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? '600' : '400',
                }}
              >
                {icons[tab]} {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'atendimento' && renderAtendimento()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'config' && renderConfig()}
          {activeTab === 'painel' && renderPainel()}
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

  return createPortal(content, document.body);
}
