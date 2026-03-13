// =================================================================================
// ARQUIVO: components/modals/ConsultarCpfModal.tsx
// DESCRIÇÃO: Modal para consulta de dados de CPF via API
// PADRÃO: Padrão 10 (read-only result) - eAi
// =================================================================================

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/hooks/useModalVoiceCommand';
import { supabase } from '@/lib/supabase-browser';

const OPENING_TEXT = "Informe o CPF que deseja consultar";

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

interface ConsultarCpfModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  playText: (text: string) => Promise<void>;
  cpfPrefill?: string;
}

export function ConsultarCpfModal({
  isOpen,
  onClose,
  companyId,
  playText,
  cpfPrefill = '',
}: ConsultarCpfModalProps) {
  const [cpf, setCpf] = useState(cpfPrefill);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<[string, string][] | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDark = true; // ou detectar tema do sistema
  const colors = isDark ? DARK : LIGHT;

  useModalVoiceCommand({
    isOpen,
    openingText: OPENING_TEXT,
    playText,
    commands: [
      {
        patterns: /\d{11}|\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}/,
        action: (match) => {
          const cpfLimpo = match[0].replace(/\D/g, '');
          setCpf(cpfLimpo);
        },
      },
    ],
  });

  const formatarCpf = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCpf(e.target.value);
    setCpf(valorFormatado);
  };

  const validarCpf = (cpfStr: string): boolean => {
    const cpfLimpo = cpfStr.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;

    return true;
  };

  const handleConsultar = async () => {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!validarCpf(cpfLimpo)) {
      setError('CPF inválido. Verifique e tente novamente.');
      playText('CPF inválido. Por favor, informe um CPF válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);
    setPdfBase64(null);

    try {
      // 1. Chamar edge function executar-consulta-eai
      const { data: execData, error: execError } = await supabase.functions.invoke(
        'executar-consulta-eai',
        {
          body: {
            consulta: {
              id: 'cpf_dados',
              nome: 'Dados CPF',
              custoOriginal: 2.0,
            },
            dadosEntrada: { cpf: cpfLimpo },
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

      // 2. Se PAGO_AUTOMATICAMENTE, buscar resultado
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
        playText('Consulta realizada com sucesso. Dados do CPF exibidos.');
      }
    } catch (err: any) {
      console.error('Erro ao consultar CPF:', err);
      setError(err.message || 'Erro ao consultar CPF.');
      playText('Erro ao consultar CPF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `consulta_cpf_${cpf.replace(/\D/g, '')}.pdf`;
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
        {/* Header */}
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
              Consultar CPF
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

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Input CPF */}
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
              CPF
            </label>
            <input
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
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
              }}
            />
          </div>

          {/* Botão Consultar */}
          {!resultado && (
            <button
              onClick={handleConsultar}
              disabled={loading || !cpf}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: loading || !cpf ? colors.border : colors.accent,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading || !cpf ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
              }}
            >
              {loading ? 'Consultando...' : 'Consultar CPF'}
            </button>
          )}

          {/* Error */}
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

          {/* Resultado */}
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
                Resultado da Consulta
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
                        gridTemplateColumns: '140px 1fr',
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

          {/* Botão Download PDF */}
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
