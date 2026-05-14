// components/dashboard/functions/GerarFilaConfigModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Bell, BarChart3, Settings, Tv, Play, CheckCircle2, Pause,
  XCircle, Users, Clock, TrendingUp, AlertCircle, Save,
  Hash, FileText, Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ------------------------------------
// Tipos locais
// ------------------------------------
interface FilaConfig {
  id: string;
  prefixo_senha: string;
  nome_tipo_atendimento: string;
  cor_fila: string;
  tempo_medio_atendimento: number;
  max_senhas_dia: number;
  reiniciar_numeracao_diariamente: boolean;
  ultimo_numero_gerado: number;
  fila_ativa: boolean;
  mensagem_fila_pausada: string;
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
  tempo_atendimento_minutos?: number;
}

// ------------------------------------
// Paletas — espelham FilaAtendimentoDisplay
// ------------------------------------
const FILA_COLORS = {
  dark: {
    bg: '#1e293b',
    bgSecondary: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    accent: '#000080',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  },
  light: {
    bg: '#ffffff',
    bgSecondary: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#cbd5e1',
    accent: '#000080',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  },
};

// ------------------------------------
// Componente principal
// ------------------------------------
export const GerarFilaConfigForm = ({
  companyId,
}: {
  settings?: any;
  onChange?: (key: string, value: any) => void;
  companyId: string;
  functionKey?: string;
  hasActivePlan?: boolean;
}) => {
  // Detectar tema do sistema para usar a paleta correta
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = prefersDark ? FILA_COLORS.dark : FILA_COLORS.light;

  const [activeTab, setActiveTab] = useState<
    'atendimento' | 'stats' | 'config' | 'painel'
  >('atendimento');

  const [config, setConfig] = useState<FilaConfig | null>(null);
  const [senhaAtual, setSenhaAtual] = useState<FilaSenha | null>(null);
  const [senhasAguardando, setSenhasAguardando] = useState<FilaSenha[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<FilaConfig>>({});

  const [stats, setStats] = useState({
    totalHoje: 0,
    finalizadas: 0,
    aguardando: 0,
    canceladas: 0,
    tempoMedioEspera: 0,
    tempoMedioAtendimento: 0,
  });

  const supabase = createClient();

  // ------------------------------------
  // Dados e Realtime
  // ------------------------------------
  useEffect(() => {
    carregarDados();

    const channel = supabase
      .channel('fila-config-modal')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_senhas',
          filter: `company_id=eq.${companyId}`,
        },
        () => carregarDados()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_configs',
          filter: `company_id=eq.${companyId}`,
        },
        () => carregarDados()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function carregarDados() {
    try {
      const { data: configData } = await supabase
        .from('fila_configs')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (configData) {
        setConfig(configData);
        setEditedConfig(configData);
      }

      const { data: senhaAtualData } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('gerada_em', { ascending: true })
        .limit(1)
        .maybeSingle();

      setSenhaAtual(senhaAtualData || null);

      const { data: senhasData } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .order('gerada_em', { ascending: true })
        .limit(20);

      setSenhasAguardando(senhasData || []);

      await carregarStats();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados da fila:', error);
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
      const finalizadas = senhasHoje.filter((s) => s.status === 'finalizado');
      const tempoEspera = finalizadas
        .filter((s) => s.tempo_espera_minutos)
        .map((s) => s.tempo_espera_minutos || 0);
      const tempoAtendimento = finalizadas
        .filter((s) => s.tempo_atendimento_minutos)
        .map((s) => s.tempo_atendimento_minutos || 0);

      setStats({
        totalHoje: senhasHoje.length,
        finalizadas: finalizadas.length,
        aguardando: senhasHoje.filter((s) => s.status === 'aguardando').length,
        canceladas: senhasHoje.filter((s) => s.status === 'cancelado').length,
        tempoMedioEspera:
          tempoEspera.length > 0
            ? Math.round(
                tempoEspera.reduce((a, b) => a + b, 0) / tempoEspera.length
              )
            : 0,
        tempoMedioAtendimento:
          tempoAtendimento.length > 0
            ? Math.round(
                tempoAtendimento.reduce((a, b) => a + b, 0) /
                  tempoAtendimento.length
              )
            : 0,
      });
    }
  }

  // ------------------------------------
  // Ações
  // ------------------------------------
  async function chamarProxima() {
    if (!config || senhasAguardando.length === 0) {
      showToast('Não há senhas aguardando', 'info');
      return;
    }

    try {
      if (
        senhaAtual &&
        (senhaAtual.status === 'chamando' ||
          senhaAtual.status === 'atendimento')
      ) {
        await supabase
          .from('fila_senhas')
          .update({
            status: 'finalizado',
            finalizada_em: new Date().toISOString(),
          })
          .eq('id', senhaAtual.id);
      }

      const proxima = senhasAguardando[0];

      await supabase
        .from('fila_senhas')
        .update({
          status: 'chamando',
          chamada_em: new Date().toISOString(),
        })
        .eq('id', proxima.id);

      speakSenha(proxima.senha_completa);
      showToast(`Senha ${proxima.senha_completa} chamada!`, 'success');

      setTimeout(async () => {
        await supabase
          .from('fila_senhas')
          .update({
            status: 'atendimento',
            atendimento_iniciado_em: new Date().toISOString(),
          })
          .eq('id', proxima.id);
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

      showToast(config.fila_ativa ? 'Fila pausada' : 'Fila retomada', 'info');
    } catch (error) {
      console.error('Erro ao pausar/retomar fila:', error);
      showToast('Erro ao alterar status da fila', 'error');
    }
  }

  async function cancelarSenha(senhaId: string) {
    try {
      await supabase
        .from('fila_senhas')
        .update({ status: 'cancelado' })
        .eq('id', senhaId);

      showToast('Senha cancelada', 'info');
    } catch (error) {
      console.error('Erro ao cancelar senha:', error);
      showToast('Erro ao cancelar senha', 'error');
    }
  }

  async function salvarConfiguracao() {
    setIsSavingConfig(true);

    try {
      if (config?.id) {
        // Já existe — update
        await supabase
          .from('fila_configs')
          .update(editedConfig)
          .eq('id', config.id);
      } else {
        // Não existe ainda — upsert pelo company_id
        await supabase.from('fila_configs').upsert(
          { company_id: companyId, ...editedConfig },
          { onConflict: 'company_id' }
        );
      }

      showToast('Configuração salva!', 'success');
      setEditMode(false);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showToast('Erro ao salvar configuração', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  }

  function speakSenha(senhaCompleta: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const prefixo = senhaCompleta[0];
    const numeros = senhaCompleta.slice(1).split('');
    const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ------------------------------------
  // Estilos compartilhados de input
  // ------------------------------------
  const inputStyle = (editable: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 12px',
    background: editable ? colors.bg : colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '14px',
    boxSizing: 'border-box',
    opacity: editable ? 1 : 0.7,
  });

  const labelStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '5px',
  };

  // ------------------------------------
  // Renderizações por aba
  // ------------------------------------
  const renderAtendimento = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Senha atual */}
      {senhaAtual ? (
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '20px',
          border: `2px solid ${colors.accent}`,
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Bell size={13} />
            Última Chamada
          </div>
          <div style={{ fontSize: '52px', fontWeight: 'bold', color: colors.accent, lineHeight: 1 }}>
            {senhaAtual.senha_completa}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '6px' }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        </div>
      ) : (
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '20px',
          border: `1px dashed ${colors.border}`,
          textAlign: 'center',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '13px' }}>
            Nenhuma senha sendo chamada
          </div>
        </div>
      )}

      {/* Lista aguardando */}
      <div>
        <div style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} />
          Aguardando ({senhasAguardando.length})
        </div>
        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {senhasAguardando.length === 0 ? (
            <div style={{ color: colors.textSecondary, fontSize: '13px', textAlign: 'center', padding: '16px' }}>
              Nenhuma senha aguardando
            </div>
          ) : (
            senhasAguardando.map((senha, index) => (
              <div
                key={senha.id}
                style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
                    {senha.senha_completa}
                  </span>
                  <span style={{ fontSize: '11px', color: colors.textSecondary, marginLeft: '8px' }}>
                    #{index + 1}
                  </span>
                </div>
                <button
                  onClick={() => cancelarSenha(senha.id)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.danger}`,
                    borderRadius: '5px',
                    padding: '4px 10px',
                    color: colors.danger,
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <XCircle size={11} />
                  Cancelar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          onClick={chamarProxima}
          disabled={senhasAguardando.length === 0}
          style={{
            background: senhasAguardando.length === 0 ? colors.border : colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: senhasAguardando.length === 0 ? 'not-allowed' : 'pointer',
            opacity: senhasAguardando.length === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Play size={15} />
          Chamar Próxima
        </button>

        <button
          onClick={finalizarAtendimento}
          disabled={!senhaAtual}
          style={{
            background: !senhaAtual ? colors.border : colors.success,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: !senhaAtual ? 'not-allowed' : 'pointer',
            opacity: !senhaAtual ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle2 size={15} />
          Finalizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          onClick={toggleFilaAtiva}
          style={{
            background: 'transparent',
            border: `2px solid ${config?.fila_ativa ? colors.warning : colors.success}`,
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: '600',
            color: config?.fila_ativa ? colors.warning : colors.success,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {config?.fila_ativa ? (
            <><Pause size={15} />Pausar Fila</>
          ) : (
            <><Play size={15} />Retomar Fila</>
          )}
        </button>

        <button
          onClick={() => window.open(`/fila/${companyId}`, '_blank')}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Tv size={15} />
          Abrir Painel
        </button>
      </div>
    </div>
  );

  const renderStats = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { icon: Users, label: 'Total Hoje', value: stats.totalHoje, color: colors.text },
          { icon: CheckCircle2, label: 'Finalizadas', value: stats.finalizadas, color: colors.success },
          { icon: Clock, label: 'Aguardando', value: stats.aguardando, color: colors.warning },
          { icon: XCircle, label: 'Canceladas', value: stats.canceladas, color: colors.danger },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '14px' }}>
            <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Icon size={13} />
              {label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '14px' }}>
        <div style={{ color: colors.text, fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <TrendingUp size={14} />
          Tempo Médio de Espera
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.accent }}>
          {stats.tempoMedioEspera} min
        </div>
      </div>

      <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '14px' }}>
        <div style={{ color: colors.text, fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} />
          Tempo Médio de Atendimento
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.accent }}>
          {stats.tempoMedioAtendimento} min
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Prefixo */}
      <div>
        <label style={labelStyle}>
          <Hash size={12} />
          Prefixo da Senha
        </label>
        <input
          type="text"
          value={editMode ? (editedConfig.prefixo_senha ?? '') : (config?.prefixo_senha ?? '')}
          onChange={(e) => setEditedConfig({ ...editedConfig, prefixo_senha: e.target.value.toUpperCase() })}
          disabled={!editMode}
          maxLength={2}
          style={inputStyle(editMode)}
        />
      </div>

      {/* Nome do tipo */}
      <div>
        <label style={labelStyle}>
          <FileText size={12} />
          Nome do Tipo de Atendimento
        </label>
        <input
          type="text"
          value={editMode ? (editedConfig.nome_tipo_atendimento ?? '') : (config?.nome_tipo_atendimento ?? '')}
          onChange={(e) => setEditedConfig({ ...editedConfig, nome_tipo_atendimento: e.target.value })}
          disabled={!editMode}
          style={inputStyle(editMode)}
        />
      </div>

      {/* Cor da fila */}
      <div>
        <label style={labelStyle}>
          Cor da Fila
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="color"
            value={editMode ? (editedConfig.cor_fila ?? '#3B82F6') : (config?.cor_fila ?? '#3B82F6')}
            onChange={(e) => setEditedConfig({ ...editedConfig, cor_fila: e.target.value })}
            disabled={!editMode}
            style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: editMode ? 'pointer' : 'default', background: 'none', padding: 0 }}
          />
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
            {editMode ? (editedConfig.cor_fila ?? '#3B82F6') : (config?.cor_fila ?? '#3B82F6')}
          </span>
        </div>
      </div>

      {/* Tempo médio */}
      <div>
        <label style={labelStyle}>
          <Clock size={12} />
          Tempo Médio de Atendimento (minutos)
        </label>
        <input
          type="number"
          min={1}
          value={editMode ? (editedConfig.tempo_medio_atendimento ?? 10) : (config?.tempo_medio_atendimento ?? 10)}
          onChange={(e) => setEditedConfig({ ...editedConfig, tempo_medio_atendimento: parseInt(e.target.value) || 1 })}
          disabled={!editMode}
          style={inputStyle(editMode)}
        />
      </div>

      {/* Máximo de senhas */}
      <div>
        <label style={labelStyle}>
          <Calendar size={12} />
          Máximo de Senhas por Dia
        </label>
        <input
          type="number"
          min={1}
          value={editMode ? (editedConfig.max_senhas_dia ?? 200) : (config?.max_senhas_dia ?? 200)}
          onChange={(e) => setEditedConfig({ ...editedConfig, max_senhas_dia: parseInt(e.target.value) || 1 })}
          disabled={!editMode}
          style={inputStyle(editMode)}
        />
      </div>

      {/* Mensagem pausada */}
      <div>
        <label style={labelStyle}>
          <AlertCircle size={12} />
          Mensagem quando Fila Pausada
        </label>
        <input
          type="text"
          value={editMode ? (editedConfig.mensagem_fila_pausada ?? '') : (config?.mensagem_fila_pausada ?? '')}
          onChange={(e) => setEditedConfig({ ...editedConfig, mensagem_fila_pausada: e.target.value })}
          disabled={!editMode}
          style={inputStyle(editMode)}
        />
      </div>

      {/* Reiniciar numeração */}
      <div style={{
        background: colors.bgSecondary,
        borderRadius: '8px',
        padding: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: colors.text, fontSize: '13px', fontWeight: '600' }}>
            Reiniciar numeração diariamente
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '11px', marginTop: '2px' }}>
            Zera o contador de senhas todo dia
          </div>
        </div>
        <button
          onClick={() => editMode && setEditedConfig({
            ...editedConfig,
            reiniciar_numeracao_diariamente: !editedConfig.reiniciar_numeracao_diariamente,
          })}
          disabled={!editMode}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            background: (editMode
              ? editedConfig.reiniciar_numeracao_diariamente
              : config?.reiniciar_numeracao_diariamente)
              ? colors.success
              : colors.border,
            cursor: editMode ? 'pointer' : 'default',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: (editMode
              ? editedConfig.reiniciar_numeracao_diariamente
              : config?.reiniciar_numeracao_diariamente)
              ? '22px'
              : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            display: 'block',
          }} />
        </button>
      </div>

      {/* Status da fila */}
      <div style={{
        background: colors.bgSecondary,
        borderRadius: '8px',
        padding: '14px',
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <AlertCircle size={12} />
          Status Atual da Fila
        </div>
        <div style={{
          color: config?.fila_ativa ? colors.success : colors.danger,
          fontSize: '15px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          {config?.fila_ativa ? (
            <><CheckCircle2 size={16} /> Ativa</>
          ) : (
            <><XCircle size={16} /> Pausada</>
          )}
        </div>
      </div>

      {/* Botões editar/salvar */}
      <div style={{ display: 'grid', gridTemplateColumns: editMode ? '1fr 1fr' : '1fr', gap: '10px', marginTop: '4px' }}>
        {editMode ? (
          <>
            <button
              onClick={salvarConfiguracao}
              disabled={isSavingConfig}
              style={{
                background: isSavingConfig ? colors.border : colors.success,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSavingConfig ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {isSavingConfig ? (
                <span>Salvando...</span>
              ) : (
                <><Save size={15} />Salvar</>
              )}
            </button>
            <button
              onClick={() => { setEditMode(false); setEditedConfig(config!); }}
              style={{
                background: 'transparent',
                border: `2px solid ${colors.danger}`,
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.danger,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <XCircle size={15} />
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            style={{
              background: 'transparent',
              border: `2px solid ${colors.accent}`,
              borderRadius: '8px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Settings size={15} />
            Editar Configurações
          </button>
        )}
      </div>
    </div>
  );

  const renderPainel = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ color: colors.text, fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Tv size={15} />
        Painel de Chamadas
      </div>

      {/* Preview senha atual */}
      <div style={{
        background: colors.bgSecondary,
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        border: `2px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          SENHA ATUAL
        </div>
        <div style={{ fontSize: '64px', fontWeight: 'bold', color: colors.accent, lineHeight: 1 }}>
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>
        {senhaAtual && (
          <div style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '10px' }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        )}
      </div>

      {/* Preview próximas */}
      <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
          PRÓXIMAS SENHAS
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {senhasAguardando.length === 0 ? (
            <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Nenhuma aguardando</span>
          ) : (
            senhasAguardando.slice(0, 6).map((senha) => (
              <div
                key={senha.id}
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: colors.text,
                  padding: '8px 16px',
                  background: colors.bg,
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {senha.senha_completa}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botão tela cheia */}
      <button
        onClick={() => window.open(`/fila/${companyId}`, '_blank')}
        style={{
          background: colors.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Tv size={16} />
        Abrir Painel em Tela Cheia
      </button>
    </div>
  );

  // ------------------------------------
  // Loading state
  // ------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ------------------------------------
  // Sem configuração criada ainda
  // ------------------------------------
  if (!config) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Nenhuma configuração de fila encontrada para esta empresa. Clique em
            "Criar Configuração" para começar.
          </p>
        </div>
        <button
          onClick={async () => {
            await supabase.from('fila_configs').upsert(
              {
                company_id: companyId,
                prefixo_senha: 'A',
                nome_tipo_atendimento: 'Atendimento Geral',
                cor_fila: '#3B82F6',
                tempo_medio_atendimento: 10,
                max_senhas_dia: 200,
                reiniciar_numeracao_diariamente: true,
                fila_ativa: true,
                mensagem_fila_pausada: 'Fila temporariamente pausada',
              },
              { onConflict: 'company_id' }
            );
            await carregarDados();
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Criar Configuração de Fila
        </button>
      </div>
    );
  }

  // ------------------------------------
  // Render principal
  // ------------------------------------
  const TABS = [
    { key: 'atendimento', label: 'Atendimento', Icon: Bell },
    { key: 'stats', label: 'Estatísticas', Icon: BarChart3 },
    { key: 'config', label: 'Configurações', Icon: Settings },
    { key: 'painel', label: 'Painel', Icon: Tv },
  ] as const;

  return (
    <div style={{ position: 'relative' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bgSecondary,
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        marginBottom: '0',
      }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: activeTab === key ? colors.bg : 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: activeTab === key ? colors.text : colors.textSecondary,
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: activeTab === key ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
      }}>
        {activeTab === 'atendimento' && renderAtendimento()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'painel' && renderPainel()}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            toast.type === 'success'
              ? colors.success
              : toast.type === 'error'
              ? colors.danger
              : colors.warning,
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
          fontSize: '13px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
