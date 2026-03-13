'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building, Loader2, AlertCircle, FileText, Download, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface ConsultarCnpjModalProps {
  data: {
    companyId: string;
    cnpjPrefill?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'input' | 'loading' | 'result';

interface ResultadoFormatado {
  label: string;
  value: string;
}

export default function ConsultarCnpjModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ConsultarCnpjModalProps) {
  const { companyId, cnpjPrefill } = data;
  
  const [step, setStep] = useState<Step>('input');
  const [cnpj, setCnpj] = useState(cnpjPrefill || '');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoFormatado[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // Formatar CNPJ automaticamente
  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handleConsultar = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      setError('Por favor, informe um CNPJ válido com 14 dígitos');
      if (playText) {
        playText('Por favor, informe um CNPJ válido com 14 dígitos').catch(() => {});
      }
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      // 1. Executar consulta
      const { data: execData, error: execError } = await supabase.functions.invoke('executar-consulta-eai', {
        body: {
          consulta: {
            id: 'cnpj_basico',
            nome: 'Dados CNPJ',
            custoOriginal: 2.00,
          },
          dadosEntrada: { cnpj: cnpjLimpo },
          userId: userData.user?.id,
          companyId,
        },
      });

      if (execError) throw execError;

      if (execData.status === 'SALDO_INSUFICIENTE') {
        setError('Saldo insuficiente. Recarregue seus créditos.');
        setStep('input');
        if (playText) {
          playText('Saldo insuficiente. Recarregue seus créditos.').catch(() => {});
        }
        return;
      }

      if (execData.status === 'PENDENTE_PIX') {
        setError('Esta consulta requer pagamento via PIX. Funcionalidade em desenvolvimento.');
        setStep('input');
        if (playText) {
          playText('Esta consulta requer pagamento via PIX. Funcionalidade em desenvolvimento.').catch(() => {});
        }
        return;
      }

      // 2. Confirmar e executar
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirmar-e-executar-consulta-eai', {
        body: { historicoId: execData.historicoId },
      });

      if (confirmError) throw confirmError;

      setResultado(confirmData.resultado || []);
      setPdfBase64(confirmData.pdfGerado || null);
      setStep('result');

      if (playText) {
        const razaoSocial = confirmData.resultado?.find((r: ResultadoFormatado) => r.label === 'Razão Social')?.value;
        if (razaoSocial) {
          playText(`Consulta realizada com sucesso. Razão social: ${razaoSocial}`).catch(() => {});
        } else {
          playText('Consulta realizada com sucesso.').catch(() => {});
        }
      }

    } catch (err: any) {
      console.error('Erro ao consultar CNPJ:', err);
      setError(err.message || 'Erro ao consultar CNPJ. Tente novamente.');
      setStep('input');
      if (playText) {
        playText('Erro ao consultar CNPJ. Tente novamente.').catch(() => {});
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBase64) return;
    
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `consulta-cnpj-${cnpj.replace(/\D/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (playText) {
      playText('PDF baixado com sucesso.').catch(() => {});
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-yellow-950/40' : 'bg-yellow-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Dados CNPJ</h2>
                <p className={`text-sm ${textMuted}`}>Consulta de dados cadastrais</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* STEP 1: INPUT */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-yellow-500 transition`}
                  autoFocus
                />
                <p className={`mt-1 text-xs ${textMuted}`}>
                  Digite apenas os números ou no formato 00.000.000/0000-00
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-blue-950/20' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Custo da consulta</p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      2 créditos serão consumidos ao realizar esta consulta
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConsultar}
                disabled={!cnpj || cnpj.replace(/\D/g, '').length !== 14}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Building className="w-5 h-5" />
                Consultar CNPJ
              </button>
            </div>
          )}

          {/* STEP 2: LOADING */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
              <p className={`text-lg font-medium ${textPrimary}`}>Consultando CNPJ...</p>
              <p className={`text-sm ${textMuted} mt-2`}>Aguarde enquanto buscamos os dados</p>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className={`font-semibold ${textPrimary}`}>Consulta realizada com sucesso</span>
                </div>
                {pdfBase64 && (
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </button>
                )}
              </div>

              <div className={`border ${border} rounded-lg overflow-hidden`}>
                <div className="max-h-[400px] overflow-y-auto">
                  {resultado.map((item, index) => (
                    <div
                      key={index}
                      className={`px-4 py-3 border-b ${border} last:border-b-0 ${
                        index % 2 === 0
                          ? isDark ? 'bg-slate-800/50' : 'bg-gray-50'
                          : isDark ? 'bg-slate-900' : 'bg-white'
                      }`}
                    >
                      {item.label === '---' ? (
                        <div className={`font-semibold ${textPrimary} text-sm`}>
                          {item.value}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div className={`text-sm font-medium ${textMuted}`}>
                            {item.label}
                          </div>
                          <div className={`col-span-2 text-sm ${textPrimary}`}>
                            {item.value}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className={`w-full py-3 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} rounded-lg font-semibold transition`}
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
