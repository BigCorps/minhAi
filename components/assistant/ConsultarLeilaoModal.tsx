// ARQUIVO: components/modals/ConsultarLeilaoModal.tsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { supabase } from '@/lib/supabase-browser';

const OPENING_TEXT = "Informe a placa do veículo para consultar o histórico de leilão";

const DARK = {
  bg: '#1a1a1a',
  card: '#2a2a2a',
  border: '#3a3a3a',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  accent: '#FFFF00',
  error: '#ff4444',
  success: '#00ff88',
};

const LIGHT = {
  bg: '#ffffff',
  card: '#f5f5f5',
  border: '#e0e0e0',
  text: '#000000',
  textMuted: '#666666',
  accent: '#FFCC00',
  error: '#cc0000',
  success: '#00aa55',
};

interface ConsultarLeilaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  playText: (text: string) => Promise<void>;
  placaPrefill?: string;
}

export function ConsultarLeilaoModal({
  isOpen,
  onClose,
  companyId,
  playText,
  placaPrefill = '',
}: ConsultarLeilaoModalProps) {
  const [placa, setPlaca] = useState(placaPrefill);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<[string, string][] | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDark = true;
  const colors = isDark ? DARK : LIGHT;

  useModalVoiceCommand({
    isOpen,
    openingText: OPENING_TEXT,
    playText,
    commands: [
      {
        patterns: /[A-Z]{3}[\s-]?\d[A-Z\d]\d{2}/i,
        action: (match) => {
          const placaLimpa = match[0].replace(/[\s-]/g, '').toUpperCase();
          setPlaca(placaLimpa);
        },
      },
    ],
  });

  const formatarPlaca = (valor: string) => {
    const limpo = valor.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
    
    if (limpo.length <= 3) return limpo;
    if (limpo.length <= 4) return `${limpo.slice(0, 3)}-${limpo.slice(3)}`;
    return `${limpo.slice(0, 3)}-${limpo.slice(3, 7)}`;
  };

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarPlaca(e.target.value);
    setPlaca(valorFormatado);
  };

  const validarPlaca = (placaStr: string): boolean => {
    const placaLimpa = placaStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (placaLimpa.length !== 7) return false;
    
    const padraoAntigo = /^[A-Z]{3}\d{4}$/;
    const padraoMercosul = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;
    
    return padraoAntigo.test(placaLimpa) || padraoMercosul.test(placaLimpa);
  };

  const handleConsultar = async () => {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (!validarPlaca(placaLimpa)) {
      setError('Placa inválida. Formato: ABC1234 ou ABC1D23.');
      playText('Placa inválida. Por favor, informe uma placa válida.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);
    setPdfBase64(null);

    try {
      const { data: execData, error: execError } = await supabase.functions.invoke(
        'executar-consulta-eai',
        {
          body: {
            consulta: {
              id: 'leilao',
              nome: 'Consultar Leilão',
              custoOriginal: 2.0,
            },
            dadosEntrada: { placa: placaLimpa },
            userId: (await supabase.auth.getUser()).data.user?.id,
            companyId,
          },
        }
      );

      if (execError) throw execError;

      if (execData.status === 'SALDO_INSUFICIENTE') {
        setError('Saldo de créditos insuficiente.');
        playText('Saldo de créditos insuficiente para realizar a consulta.');
        return;
      }

      if (execData.status === 'PENDENTE_PIX') {
        setError('Pagamento via PIX necessário. Funcionalidade não disponível neste modal.');
        playText('Pagamento via PIX necessário.');
        return;
      }

      if (execData.status === 'PAGO_AUTOMATICAMENTE' || execData.status === 'EXECUTADO_GRATUITAMENTE') {
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
          'confirmar-e-executar-consulta-eai',
          {
            body: { historicoId: execData.historicoId },
          }
        );

        if (confirmError) throw confirmError;

        setResultado(confirmData.resultado);
        setPdfBase64(confirmData.pdfGerado);
        
        const temLeilao = confirmData.resultado && confirmData.resultado.length > 0;
        if (temLeilao) {
          playText('Consulta realizada. Histórico de leilão encontrado.');
        } else {
          playText('Consulta realizada. Este veículo não possui histórico de leilão.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao consultar leilão:', err);
      setError(err.message || 'Erro ao consultar histórico de leilão.');
      playText('Erro ao consultar leilão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `consulta_leilao_${placa.replace(/[^A-Z0-9]/gi, '')}.pdf`;
    link.click();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🟡</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: colors.text, margin: 0 }}>
              Consultar Leilão
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: colors.textMuted,
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: colors.text,
              }}
            >
              Placa do Veículo
            </label>
            <input
              type="text"
              value={placa}
              onChange={handlePlacaChange}
              placeholder="ABC-1234 ou ABC-1D23"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '1rem',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.5rem' }}>
              Consulta histórico de leilões do veículo (pátio, data, comitente, índice de risco)
            </p>
          </div>

          {!resultado && (
            <button
              onClick={handleConsultar}
              disabled={loading || !placa}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: loading || !placa ? colors.border : colors.accent,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading || !placa ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
              }}
            >
              {loading ? 'Consultando...' : 'Consultar Histórico de Leilão'}
            </button>
          )}

          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
                borderRadius: '8px',
                color: colors.error,
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          {resultado && resultado.length > 0 && (
            <div
              style={{
                backgroundColor: colors.card,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: colors.text,
                  marginBottom: '1rem',
                }}
              >
                Histórico de Leilão
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resultado.map(([label, valor], index) => {
                  if (label === '---') {
                    return (
                      <div
                        key={index}
                        style={{
                          fontWeight: 'bold',
                          color: colors.accent,
                          marginTop: index > 0 ? '0.5rem' : 0,
                        }}
                      >
                        {valor}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '160px 1fr',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ color: colors.textMuted, fontSize: '0.875rem' }}>
                        {label}:
                      </span>
                      <span style={{ color: colors.text, fontWeight: '500' }}>{valor}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {resultado && resultado.length === 0 && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '8px',
                color: colors.success,
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              ✓ Este veículo não possui histórico de leilão registrado.
            </div>
          )}

          {pdfBase64 && (
            <button
              onClick={handleDownloadPdf}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: colors.success,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              📄 Baixar PDF
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
