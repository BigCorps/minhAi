// components/dashboard/vendas/EmitirNotaModalExpanded.tsx
// Modal expandido de emissão de NF-e com assistente conversacional

'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { X, ArrowLeft, ArrowRight, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import AssistenteFiscalChat from './AssistenteFiscalChat';
import PreviewNotaFiscal from './PreviewNotaFiscal';

interface DadosNota {
  destinatario: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  itens: Array<{
    nome: string;
    quantidade: number;
    valor_unitario: number;
    unidade: string;
    ncm?: string;
    cfop?: number;
    origem_produto?: number;
    produto_id?: string;
    ncm_sugerido?: boolean;
  }>;
}

interface EmitirNotaModalExpandedProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  pedidoId?: string; // opcional: se vier de pedido pago
  theme?: 'dark' | 'light';
}

type Step = 'form' | 'form_nfe' | 'confirming' | 'success' | 'error';

export default function EmitirNotaModalExpanded({
  isOpen,
  onClose,
  companyId,
  pedidoId,
  theme = 'dark',
}: EmitirNotaModalExpandedProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [step, setStep] = useState<Step>('form');
  const [tipoNota, setTipoNota] = useState<'nfce' | 'nfe'>('nfce'); // default NFCe
  const [dados, setDados] = useState<DadosNota | null>(null);
  const [statusAssistente, setStatusAssistente] = useState<'collecting' | 'ready' | 'error'>('collecting');
  const [isEmitting, setIsEmitting] = useState(false);
  const [notaEmitida, setNotaEmitida] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);

  const C = {
    bg: isDark ? '#0f172a' : '#ffffff',
    bgSecondary: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    accent: '#3b82f6',
    success: '#22c55e',
    error: '#ef4444',
  };

  // Carregar configuração da empresa
  useEffect(() => {
    if (!isOpen) return;

    const loadCompany = async () => {
      const { data } = await supabase
        .from('companies')
        .select('nfe_ativo, nfe_cnpj, nfe_crt, name')
        .eq('id', companyId)
        .single();

      setCompany(data);
    };

    loadCompany();
  }, [isOpen, companyId, supabase]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setTipoNota(pedidoId ? 'nfce' : 'nfce'); // default sempre NFCe
      setDados(null);
      setStatusAssistente('collecting');
      setIsEmitting(false);
      setNotaEmitida(null);
      setError(null);
    }
  }, [isOpen, pedidoId]);

  // TTS - play text safe
  const playText = useCallback(async (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);

      return new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
      });
    } catch (err) {
      console.error('Erro ao falar:', err);
    }
  }, []);

  // Callback quando assistente atualiza dados
  const handleDadosAtualizados = useCallback((novosDados: DadosNota | null, status: 'collecting' | 'ready' | 'error') => {
    setDados(novosDados);
    setStatusAssistente(status);
  }, []);

  // Avançar para próximo step
  const handleAvancar = useCallback(() => {
    if (step === 'form' && tipoNota === 'nfe') {
      // Se escolheu NF-e, vai para assistente
      setStep('form_nfe');
    } else if (step === 'form' && tipoNota === 'nfce') {
      // Se escolheu NFCe, emite direto
      setStep('confirming');
      emitirNFCe();
    } else if (step === 'form_nfe' && statusAssistente === 'ready') {
      // Se assistente coletou tudo, confirma emissão
      setStep('confirming');
      emitirNFe();
    }
  }, [step, tipoNota, statusAssistente]);

  // Emitir NFCe (modelo 65)
  const emitirNFCe = useCallback(async () => {
    if (!pedidoId) {
      setError('Pedido não encontrado');
      setStep('error');
      return;
    }

    setIsEmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/emitir-nota`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            pedido_id: pedidoId,
            tipo: 'nfce',
            modelo: '65',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao emitir NFCe');
      }

      const result = await response.json();
      setNotaEmitida(result);
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao emitir NFCe:', err);
      setError(err.message || 'Erro ao emitir nota fiscal');
      setStep('error');
    } finally {
      setIsEmitting(false);
    }
  }, [companyId, pedidoId]);

  // Emitir NFe (modelo 55)
  const emitirNFe = useCallback(async () => {
    if (!dados || statusAssistente !== 'ready') {
      setError('Dados incompletos para emissão');
      setStep('error');
      return;
    }

    setIsEmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/emitir-nota`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            tipo: 'nfe',
            modelo: '55',
            destinatario: dados.destinatario,
            itens: dados.itens,
            pedido_id: pedidoId, // opcional
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao emitir NF-e');
      }

      const result = await response.json();
      setNotaEmitida(result);
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao emitir NF-e:', err);
      setError(err.message || 'Erro ao emitir nota fiscal');
      setStep('error');
    } finally {
      setIsEmitting(false);
    }
  }, [companyId, dados, statusAssistente, pedidoId]);

  // Render steps
  const renderStep = () => {
    switch (step) {
      case 'form':
        return (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>
                Emitir Nota Fiscal
              </h2>
              <p className="text-sm" style={{ color: C.textMuted }}>
                Escolha o tipo de nota que deseja emitir
              </p>
            </div>

            {/* Seletor de tipo */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setTipoNota('nfce')}
                className="w-full p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: tipoNota === 'nfce' ? C.accent : C.border,
                  backgroundColor: tipoNota === 'nfce' ? `${C.accent}15` : C.bgSecondary,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold mb-1" style={{ color: C.text }}>
                      NFC-e (Cupom Fiscal)
                    </h3>
                    <p className="text-sm" style={{ color: C.textMuted }}>
                      Modelo 65 - Emissão automática a partir do pedido
                    </p>
                    <p className="text-xs mt-2" style={{ color: C.textMuted }}>
                      ✓ Ideal para vendas no balcão
                    </p>
                  </div>
                  {tipoNota === 'nfce' && (
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: C.accent }} />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoNota('nfe')}
                className="w-full p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: tipoNota === 'nfe' ? C.accent : C.border,
                  backgroundColor: tipoNota === 'nfe' ? `${C.accent}15` : C.bgSecondary,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold mb-1" style={{ color: C.text }}>
                      NF-e (Nota Fiscal Eletrônica)
                    </h3>
                    <p className="text-sm" style={{ color: C.textMuted }}>
                      Modelo 55 - Com assistente conversacional
                    </p>
                    <p className="text-xs mt-2" style={{ color: C.textMuted }}>
                      ✓ Ideal para envios e vendas com destinatário específico
                    </p>
                  </div>
                  {tipoNota === 'nfe' && (
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: C.accent }} />
                  )}
                </div>
              </button>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-colors"
                style={{
                  backgroundColor: C.bgSecondary,
                  color: C.text,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAvancar}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: C.accent,
                  color: '#ffffff',
                }}
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 'form_nfe':
        return (
          <div className="flex h-[600px]">
            {/* Chat à esquerda */}
            <div className="flex-1 border-r" style={{ borderColor: C.border }}>
              <AssistenteFiscalChat
                companyId={companyId}
                theme={theme}
                playText={playText}
                onDadosAtualizados={handleDadosAtualizados}
              />
            </div>

            {/* Preview à direita */}
            <div className="w-[400px]">
              <PreviewNotaFiscal
                dados={dados}
                theme={theme}
              />
            </div>

            {/* Botões fixos no footer */}
            <div
              className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t flex gap-3"
              style={{ backgroundColor: C.bg, borderColor: C.border }}
            >
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: C.bgSecondary,
                  color: C.text,
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleAvancar}
                disabled={statusAssistente !== 'ready'}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: C.accent,
                  color: '#ffffff',
                }}
              >
                Emitir NF-e
              </button>
            </div>
          </div>
        );

      case 'confirming':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-16 h-16 animate-spin mb-4" style={{ color: C.accent }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>
              Emitindo nota fiscal...
            </h3>
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              Aguarde enquanto processamos sua nota
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${C.success}20` }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: C.success }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.text }}>
                Nota emitida com sucesso!
              </h3>
              <p className="text-sm" style={{ color: C.textMuted }}>
                {notaEmitida?.chave_acesso && `Chave: ${notaEmitida.chave_acesso}`}
              </p>
            </div>

            {notaEmitida?.danfe_url && (
              <a
                href={notaEmitida.danfe_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 rounded-xl font-semibold text-center mb-3 transition-colors"
                style={{
                  backgroundColor: C.accent,
                  color: '#ffffff',
                }}
              >
                Baixar DANFE
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-semibold transition-colors"
              style={{
                backgroundColor: C.bgSecondary,
                color: C.text,
              }}
            >
              Fechar
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${C.error}20` }}
              >
                <X className="w-8 h-8" style={{ color: C.error }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.text }}>
                Erro ao emitir nota
              </h3>
              <p className="text-sm" style={{ color: C.error }}>
                {error || 'Erro desconhecido'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-semibold transition-colors"
              style={{
                backgroundColor: C.bgSecondary,
                color: C.text,
              }}
            >
              Fechar
            </button>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: C.overlay }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isEmitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: C.bg }}
      >
        {/* Header */}
        {step !== 'confirming' && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: C.border }}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" style={{ color: C.accent }} />
              <div>
                <h2 className="text-lg font-bold" style={{ color: C.text }}>
                  Emissão de Nota Fiscal
                </h2>
                <p className="text-xs" style={{ color: C.textMuted }}>
                  {company?.name}
                </p>
              </div>
            </div>
            {!isEmitting && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: C.textMuted,
                }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="relative">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
