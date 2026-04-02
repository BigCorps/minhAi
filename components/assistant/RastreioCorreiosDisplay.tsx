'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

const DARK = {
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(51,65,85,0.6)',
  text: '#ffffff',
  textMuted: '#94a3b8',
  buttonBg: '#800080',
  buttonHover: '#9333ea',
};

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  buttonBg: '#800080',
  buttonHover: '#9333ea',
};

type Stage = 'input' | 'processing' | 'result' | 'error';

interface RastreioData {
  codigo: string;
  status: string;
  data: string;
  hora: string;
  local: string;
  mensagem?: string;
}

interface RastreioCorreiosDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

// ✅ USAR playText DO SISTEMA
declare global {
  interface Window {
    playText?: (text: string) => void;
  }
}

export default function RastreioCorreiosDisplay({
  data,
  onClose,
  theme = 'dark',
}: RastreioCorreiosDisplayProps) {
  const palette = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [codigo, setCodigo] = useState('');
  const [rastreio, setRastreio] = useState<RastreioData | null>(null);
  const [error, setError] = useState('');

  // ✅ USAR playText DO SISTEMA
  const playText = (text: string) => {
    if (window.playText) {
      window.playText(text);
    }
  };

  useEffect(() => {
    window.speechSynthesis?.cancel();
    const texto = 'Digite o código de rastreio da sua encomenda dos Correios.';
    playText(texto);
  }, []);

  const handleVoiceCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase();

      if (cmd.includes('fechar') || cmd.includes('sair')) {
        handleClose();
      } else if (cmd.includes('repetir') || cmd.includes('novamente')) {
        handleReset();
      }
    },
    [stage]
  );

  useModalVoiceCommand(handleVoiceCommand);

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  const handleReset = () => {
    setStage('input');
    setCodigo('');
    setRastreio(null);
    setError('');
  };

  const handleRastrear = async () => {
    const codigoLimpo = codigo.trim().toUpperCase();

    if (!codigoLimpo || codigoLimpo.length < 13) {
      setError('Código inválido. Deve ter 13 caracteres (ex: AA123456789BR).');
      return;
    }

    setStage('processing');
    setError('');

    try {
      // ✅ USAR EDGE FUNCTION
      const { data: rastreioResponse, error: edgeError } = await supabase.functions.invoke(
        'rastreio-correios',
        {
          body: { codigo: codigoLimpo },
        }
      );

      if (edgeError || !rastreioResponse) {
        throw new Error(edgeError?.message || 'Erro ao rastrear encomenda');
      }

      if (rastreioResponse.error) {
        throw new Error(rastreioResponse.error);
      }

      if (!rastreioResponse.objetos || rastreioResponse.objetos.length === 0) {
        throw new Error('Nenhuma informação encontrada para este código.');
      }

      const objeto = rastreioResponse.objetos[0];
const eventos = rastreioResponse.tracking || [];

if (eventos.length === 0) {
  throw new Error('Nenhum evento de rastreamento disponível.');
}

// Último evento (mais recente)
const ultimo = eventos[0];

const rastreioInfo: RastreioData = {
  codigo: codigoLimpo,
  status: ultimo.status || 'Status não disponível',
  data: ultimo.data || '-',
  hora: ultimo.hora || '-',
  local: ultimo.local || 'Local não informado',
  mensagem: ultimo.observacao || undefined,
};

      setRastreio(rastreioInfo);
      setStage('result');

      // ✅ USAR playText DO SISTEMA
      playText(`Rastreamento encontrado. Status atual: ${rastreioInfo.status}. Local: ${rastreioInfo.local}.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao rastrear encomenda.');
      setStage('error');
    }
  };

  const getStatusColor = () => {
    if (!rastreio) return palette.textMuted;
    const status = rastreio.status.toLowerCase();
    if (status.includes('entregue')) return '#10b981';
    if (status.includes('saiu para entrega')) return '#3b82f6';
    if (status.includes('postado') || status.includes('recebido')) return '#f59e0b';
    return palette.text;
  };

  const getStatusIcon = () => {
    if (!rastreio) return '📦';
    const status = rastreio.status.toLowerCase();
    if (status.includes('entregue')) return '✅';
    if (status.includes('saiu para entrega')) return '🚚';
    if (status.includes('postado') || status.includes('recebido')) return '📬';
    return '📦';
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '42rem',
          backgroundColor: palette.bg,
          borderRadius: '1rem',
          border: `1px solid ${palette.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🟣</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: palette.text }}>
                Rastreio Correios
              </h2>
              <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>
                {stage === 'input' && 'Digite o código de rastreio'}
                {stage === 'processing' && 'Consultando...'}
                {stage === 'result' && 'Status encontrado'}
                {stage === 'error' && 'Erro na consulta'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: palette.textMuted,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* INPUT */}
          {stage === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: palette.text }}>
                  Código de Rastreio
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ex: AA123456789BR"
                  maxLength={13}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.cardBg,
                    color: palette.text,
                    fontSize: '1rem',
                    letterSpacing: '0.05em',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: palette.textMuted, marginTop: '0.5rem' }}>
                  Digite o código de 13 caracteres (ex: AA123456789BR)
                </p>
              </div>

              <button
                onClick={handleRastrear}
                disabled={codigo.trim().length < 13}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  fontWeight: '600',
                  border: 'none',
                  cursor: codigo.trim().length >= 13 ? 'pointer' : 'not-allowed',
                  opacity: codigo.trim().length >= 13 ? 1 : 0.5,
                }}
              >
                Rastrear
              </button>
            </div>
          )}

          {/* PROCESSING */}
          {stage === 'processing' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  margin: '0 auto',
                  border: '4px solid rgba(128,0,128,0.2)',
                  borderTopColor: '#800080',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ marginTop: '1rem', color: palette.textMuted }}>
                Consultando rastreamento...
              </p>
            </div>
          )}

          {/* RESULT */}
          {stage === 'result' && rastreio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Card principal */}
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.cardBg,
                  border: `2px solid ${getStatusColor()}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>{getStatusIcon()}</span>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>Código</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: palette.text }}>
                      {rastreio.codigo}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: getStatusColor(),
                      marginBottom: '0.5rem',
                    }}
                  >
                    {rastreio.status}
                  </p>
                  {rastreio.mensagem && (
                    <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>
                      {rastreio.mensagem}
                    </p>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    backgroundColor: palette.cardBg,
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: palette.textMuted }}>Data</p>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: palette.text }}>
                    {rastreio.data}
                  </p>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    backgroundColor: palette.cardBg,
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: palette.textMuted }}>Hora</p>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: palette.text }}>
                    {rastreio.hora}
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.cardBg,
                }}
              >
                <p style={{ fontSize: '0.75rem', color: palette.textMuted }}>Local</p>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: palette.text }}>
                  {rastreio.local}
                </p>
              </div>

              <button
                onClick={handleReset}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Rastrear Outro Código
              </button>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1rem' }}>{error}</p>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
