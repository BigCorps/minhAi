'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { 
  Bell, 
  BarChart3, 
  Settings, 
  Tv, 
  Play, 
  CheckCircle2, 
  Pause, 
  XCircle,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Save,
  Hash,
  FileText,
  Calendar,
} from 'lucide-react';

// Paletas de cores
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
  tempo_atendimento_minutos?: number;
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

  // Estados de edição
  const [editMode, setEditMode] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<FilaConfig>>({});

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

  // Carregar configuração e senhas
  useEffect(() => {
    carregarDados();
    
    // Realtime com logging
    const channel = supabase
      .channel('fila-atendimento')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_senhas',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        console.log('📡 Realtime evento recebido:', payload);
        // Forçar recarregamento imediato
        carregarDados();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_configs',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        console.log('📡 Config atualizada:', payload);
        carregarDados();
      })
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function carregarDados() {
    try {
      // ✅ CORREÇÃO: Usar .maybeSingle() em vez de .single()
      const { data: configData, error: configError } = await supabase
        .from('fila_configs')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (configError) {
        console.error('Erro ao carregar config:', configError);
      }

      if (configData) {
        setConfig(configData);
        setEditedConfig(configData);
      }

      // ✅ CORREÇÃO: Usar .maybeSingle() em vez de .single()
      const { data: senhaAtualData, error: senhaError } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('gerada_em', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (senhaError) {
        console.error('Erro ao carregar senha atual:', senhaError);
      }

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

      showToast('Senha cancelada', 'info');
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      showToast('Erro ao cancelar senha', 'error');
    }
  }

  async function salvarConfiguracao() {
    if (!config) return;

    try {
      await supabase
        .from('fila_configs')
        .update(editedConfig)
        .eq('id', config.id);

      showToast('Configuração salva!', 'success');
      setEditMode(false);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar configuração', 'error');
    }
  }

  async function speakSenha(senhaCompleta: string) {
    const prefixo = senhaCompleta[0];
    const numeros = senhaCompleta.slice(1).split('');
    const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;

    if (playText) {
      await playText(texto);
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
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

  // Renderizações das abas
  const renderAtendimento = () => (
    <div style={{ padding: '20px' }}>
      {/* Última Chamada */}
      {senhaAtual && (
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${colors.accent}`,
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bell className="w-4 h-4" />
            ÚLTIMA CHAMADA
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: colors.accent, marginBottom: '8px' }}>
            {senhaAtual.senha_completa}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        </div>
      )}

      {/* Lista de Aguardando */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: colors.text, fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users className="w-5 h-5" />
          Aguardando ({senhasAguardando.length})
        </div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {senhasAguardando.length === 0 ? (
            <div style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              Nenhuma senha aguardando
            </div>
          ) : (
            senhasAguardando.map((senha, index) => (
              <div
                key={senha.id}
                style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
                    {senha.senha_completa}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    Posição: {index + 1}
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
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <XCircle className="w-3 h-3" />
                  Cancelar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <button
          onClick={chamarProxima}
          disabled={senhasAguardando.length === 0}
          style={{
            background: senhasAguardando.length === 0 ? colors.border : colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: senhasAguardando.length === 0 ? 'not-allowed' : 'pointer',
            opacity: senhasAguardando.length === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Play className="w-5 h-5" />
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
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !senhaAtual ? 'not-allowed' : 'pointer',
            opacity: !senhaAtual ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {config?.fila_ativa ? (
            <>
              <Pause className="w-5 h-5" />
              Pausar Fila
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Retomar Fila
            </>
          )}
        </button>

        <button
          onClick={() => window.open(`/fila/${companyId}`, '_blank')}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Tv className="w-5 h-5" />
          Abrir Painel
        </button>
      </div>
    </div>
  );

  const renderStats = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          background: colors.bgSecondary,
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users className="w-4 h-4" />
            Total Hoje
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.text }}>
            {stats.totalHoje}
          </div>
        </div>

        <div style={{
          background: colors.bgSecondary,
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 className="w-4 h-4" />
            Finalizadas
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.success }}>
            {stats.finalizadas}
          </div>
        </div>

        <div style={{
          background: colors.bgSecondary,
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock className="w-4 h-4" />
            Aguardando
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.warning }}>
            {stats.aguardando}
          </div>
        </div>

        <div style={{
          background: colors.bgSecondary,
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <XCircle className="w-4 h-4" />
            Canceladas
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.danger }}>
            {stats.canceladas}
          </div>
        </div>
      </div>

      <div style={{
        background: colors.bgSecondary,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
      }}>
        <div style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp className="w-4 h-4" />
          Tempo Médio de Espera
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: colors.accent }}>
          {stats.tempoMedioEspera} min
        </div>
      </div>

      <div style={{
        background: colors.bgSecondary,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <div style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock className="w-4 h-4" />
          Tempo Médio de Atendimento
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: colors.accent }}>
          {stats.tempoMedioAtendimento} min
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div style={{ padding: '20px' }}>
      {config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Hash className="w-4 h-4" />
              Prefixo da Senha
            </label>
            <input
              type="text"
              value={editMode ? editedConfig.prefixo_senha : config.prefixo_senha}
              onChange={(e) => setEditedConfig({ ...editedConfig, prefixo_senha: e.target.value })}
              disabled={!editMode}
              maxLength={1}
              style={{
                width: '100%',
                padding: '12px',
                background: editMode ? colors.bg : colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FileText className="w-4 h-4" />
              Nome do Tipo de Atendimento
            </label>
            <input
              type="text"
              value={editMode ? editedConfig.nome_tipo_atendimento : config.nome_tipo_atendimento}
              onChange={(e) => setEditedConfig({ ...editedConfig, nome_tipo_atendimento: e.target.value })}
              disabled={!editMode}
              style={{
                width: '100%',
                padding: '12px',
                background: editMode ? colors.bg : colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Clock className="w-4 h-4" />
              Tempo Médio (minutos)
            </label>
            <input
              type="number"
              value={editMode ? editedConfig.tempo_medio_atendimento : config.tempo_medio_atendimento}
              onChange={(e) => setEditedConfig({ ...editedConfig, tempo_medio_atendimento: parseInt(e.target.value) })}
              disabled={!editMode}
              style={{
                width: '100%',
                padding: '12px',
                background: editMode ? colors.bg : colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ color: colors.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Calendar className="w-4 h-4" />
              Máximo de Senhas por Dia
            </label>
            <input
              type="number"
              value={editMode ? editedConfig.max_senhas_dia : config.max_senhas_dia}
              onChange={(e) => setEditedConfig({ ...editedConfig, max_senhas_dia: parseInt(e.target.value) })}
              disabled={!editMode}
              style={{
                width: '100%',
                padding: '12px',
                background: editMode ? colors.bg : colors.bgSecondary,
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
            <div style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle className="w-4 h-4" />
              Status da Fila
            </div>
            <div style={{
              color: config.fila_ativa ? colors.success : colors.danger,
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {config.fila_ativa ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Ativa
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Pausada
                </>
              )}
            </div>
          </div>

          {/* Botões de Edição */}
          <div style={{ display: 'grid', gridTemplateColumns: editMode ? '1fr 1fr' : '1fr', gap: '12px', marginTop: '12px' }}>
            {editMode ? (
              <>
                <button
                  onClick={salvarConfiguracao}
                  style={{
                    background: colors.success,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Save className="w-5 h-5" />
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedConfig(config);
                  }}
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
                  <XCircle className="w-5 h-5" />
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
                <Settings className="w-5 h-5" />
                Editar Configurações
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPainel = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Tv className="w-6 h-6" />
        Painel de Chamadas
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
        onClick={() => window.open(`/fila/${companyId}`, '_blank')}
        style={{
          background: colors.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '16px 32px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Tv className="w-5 h-5" />
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
              atendimento: Bell,
              stats: BarChart3,
              config: Settings,
              painel: Tv,
            };
            const labels = {
              atendimento: 'Atendimento',
              stats: 'Estatísticas',
              config: 'Configurações',
              painel: 'Painel',
            };

            const Icon = icons[tab];

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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Icon className="w-4 h-4" />
                {labels[tab]}
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
