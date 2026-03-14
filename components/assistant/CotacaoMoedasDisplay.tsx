'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic, TrendingUp, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { generateConsultaPDF } from '@/lib/generatePDF';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

type Stage = 'input' | 'processing' | 'result' | 'error';

interface CurrencyOption {
  code: string;
  name: string;
  flag: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'Dólar Americano', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'Libra Esterlina', flag: '🇬🇧' },
  { code: 'JPY', name: 'Iene Japonês', flag: '🇯🇵' },
  { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'CAD', name: 'Dólar Canadense', flag: '🇨🇦' },
  { code: 'AUD', name: 'Dólar Australiano', flag: '🇦🇺' },
  { code: 'CHF', name: 'Franco Suíço', flag: '🇨🇭' },
  { code: 'CNY', name: 'Yuan Chinês', flag: '🇨🇳' },
  { code: 'BTC', name: 'Bitcoin', flag: '₿' },
];

const OPENING_TEXT = 'Consulta de cotação de moedas. Selecione a moeda desejada ou diga: dólar, euro, libra, fechar.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
      <Mic className="w-3.5 h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {commands.map(cmd => (
          <span key={cmd} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isDark ? 'bg-slate-600 text-blue-300' : 'bg-gray-200 text-blue-700'}`}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CotacaoMoedasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [downloadToken, setDownloadToken] = useState<string>('');
  const [resultadoFormatado, setResultadoFormatado] = useState<[string, string][]>([]);

  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

  const handleConsultar = useCallback(async () => {
    setStage('processing');
    setErrorMsg(null);

    try {
      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: { company_id: data.companyId, action: 'consultar_cambio', currency: selectedCurrency }
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      setResultData(res.result);
      setSpeechText(res.speech_text);
      setResultadoFormatado(res.resultado_formatado);
      setDownloadToken(res.download_token);

      // Gerar PDF no frontend
      const pdfDataUri = generateConsultaPDF('Cotação de Câmbio', res.resultado_formatado);
      const name = `cambio_${Date.now()}.pdf`;
      setFileName(name);
      setFileBase64(pdfDataUri);

      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao consultar cotação.');
      setStage('error');
    }
  }, [data.companyId, selectedCurrency, supabase, playText]);

  const handleCopy = useCallback(async () => {
    if (!resultData) return;
    const text = `${resultData.name}\nCompra: R$ ${resultData.bid}\nVenda: R$ ${resultData.ask}\nVariação: ${resultData.variation}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    playText('Cotação copiada.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [resultData, playText]);

  const handleDownloadPdf = useCallback(() => {
    if (!fileBase64) return;
    
    try {
      const a = document.createElement('a');
      a.href = fileBase64;
      a.download = fileName || `consulta_${Date.now()}.pdf`;
      a.click();
      
      playText('PDF baixado.').catch(() => {});
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      playText('Erro ao gerar PDF.').catch(() => {});
    }
  }, [fileBase64, fileName, playText]);

  const handleReset = useCallback(() => {
    setStage('input');
    setResultData(null);
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    setFileBase64('');
    setFileName('');
    setDownloadToken('');
    setResultadoFormatado([]);
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!resultData) return;
    setIsSendingEmail(true);
    try {
      const emailBody = `Cotação de ${resultData.name}\n\nCompra: R$ ${resultData.bid}\nVenda: R$ ${resultData.ask}\nVariação: ${resultData.variation}\nData: ${resultData.timestamp}`;
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: `Cotação: ${resultData.name}`, body: emailBody },
      });
      if (error) throw error;
      playText('Cotação enviada por email.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      if (stage === 'input') {
        const VOICE_MAP: Record<string, string> = {
          dolar: 'USD', 'dolar americano': 'USD',
          euro: 'EUR',
          libra: 'GBP',
          iene: 'JPY', japao: 'JPY',
          peso: 'ARS', argentina: 'ARS',
          canada: 'CAD', canadense: 'CAD',
          australia: 'AUD', australiano: 'AUD',
          franco: 'CHF', suico: 'CHF',
          yuan: 'CNY', china: 'CNY',
          bitcoin: 'BTC', btc: 'BTC',
        };

        for (const [trigger, code] of Object.entries(VOICE_MAP)) {
          if (t.includes(trigger)) {
            setSelectedCurrency(code);
            const curr = CURRENCIES.find(c => c.code === code);
            playText(`${curr?.name} selecionado.`).catch(() => {});
            return;
          }
        }

        if (['consultar', 'buscar', 'pesquisar', 'cotacao'].some(c => t.includes(c))) {
          handleConsultar();
          return;
        }
      }

      if (stage === 'result' && resultData) {
        if (['copiar', 'copia', 'copie'].some(c => t.includes(c))) {
          handleCopy(); return;
        }
        if (['baixar', 'download', 'salvar', 'pdf'].some(c => t.includes(c))) {
          handleDownloadPdf(); return;
        }
        if (['nova', 'nova consulta', 'novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
    }
  });

  const modalMaxWidth = stage === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cotação de Moedas</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Selecione a moeda para consultar a cotação atual:
            </p>

            {/* Grid de moedas */}
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setSelectedCurrency(curr.code);
                    playText(`${curr.name} selecionado.`).catch(() => {});
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedCurrency === curr.code
                      ? isDark
                        ? 'bg-red-600 text-white'
                        : 'bg-red-500 text-white'
                      : isDark
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg">{curr.flag}</span>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-semibold">{curr.code}</span>
                    <span className={`text-xs truncate ${selectedCurrency === curr.code ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {curr.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleConsultar}
              className="w-full py-3 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Consultar Cotação
            </button>

            <VoiceHint commands={['"dólar"', '"euro"', '"libra"', '"consultar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Consultando cotação...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && resultData && (
          <div className="flex flex-col gap-4">
            {/* Banner de sucesso */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>Cotação consultada!</span>
            </div>

            {/* Layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Coluna esquerda */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Card de resultado */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{CURRENCIES.find(c => c.code === resultData.currency)?.flag}</span>
                    <div>
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.name}</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{resultData.currency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Compra</p>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {resultData.bid}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Venda</p>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {resultData.ask}</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${resultData.variation?.startsWith('-') ? (isDark ? 'bg-red-900/30' : 'bg-red-50') : (isDark ? 'bg-green-900/30' : 'bg-green-50')}`}>
                    {resultData.variation?.startsWith('-') 
                      ? <TrendingDown className="w-4 h-4 text-red-500" />
                      : <TrendingUp className="w-4 h-4 text-green-500" />
                    }
                    <span className={`text-sm font-medium ${resultData.variation?.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                      {resultData.variation}
                    </span>
                  </div>

                  <p className={`text-xs mt-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Atualizado em {resultData.timestamp}
                  </p>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                  >
                    <Download className="w-4 h-4" />Baixar PDF
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <RefreshCw className="w-4 h-4" />Nova consulta
                  </button>

                  {googleConnected && (
                    <button
                      onClick={handleSendByEmail}
                      disabled={isSendingEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSendingEmail
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                        : <><Mail className="w-4 h-4" />Enviar por email</>
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Coluna direita — QR desktop */}
              <div className="hidden sm:flex flex-col shrink-0 w-56">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

              {/* QR mobile */}
              <div className="sm:hidden">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>
            </div>

            {/* Voice hint */}
            <VoiceHint
              commands={['"copiar"', '"baixar pdf"', '"nova consulta"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
