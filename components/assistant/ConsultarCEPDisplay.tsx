'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic, MapPin, ExternalLink } from 'lucide-react';
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

const OPENING_TEXT = 'Consulta de CEP. Digite o CEP desejado ou diga o CEP em voz alta.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
      <Mic className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
        {commands.map(cmd => (
          <span key={cmd} className={`px-1 md:px-1.5 py-0.5 rounded font-mono text-[9px] md:text-[11px] ${isDark ? 'bg-slate-600 text-blue-300' : 'bg-gray-200 text-blue-700'}`}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ConsultarCEPDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cep, setCep] = useState<string>('');
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [downloadToken, setDownloadToken] = useState<string>('');
  const [resultadoFormatado, setResultadoFormatado] = useState<[string, string][]>([]);
  const [mapsQrCodeUrl, setMapsQrCodeUrl] = useState<string>('');

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

  const formatCep = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Gerar URL do Google Maps
  const getMapsUrl = (endereco: any) => {
    const query = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.localidade} - ${endereco.uf}, ${endereco.cep}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Gerar URL do Google Maps Embed
  const getMapEmbedUrl = (endereco: any) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const query = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.localidade} - ${endereco.uf}, ${endereco.cep}`;
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}`;
  };

  const handleConsultar = useCallback(async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setErrorMsg('CEP deve ter 8 dígitos.');
      playText('CEP inválido. Digite 8 dígitos.').catch(() => {});
      return;
    }

    setStage('processing');
    setErrorMsg(null);

    try {
      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: { company_id: data.companyId, action: 'consultar_cep', cep: cleanCep }
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      setResultData(res.result);
      setSpeechText(res.speech_text);
      setResultadoFormatado(res.resultado_formatado);
      setDownloadToken(res.download_token);

      // Gerar QR Code do Google Maps
      const mapsUrl = getMapsUrl(res.result);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mapsUrl)}&margin=5`;
      setMapsQrCodeUrl(qrUrl);

      // Gerar PDF no frontend
      const pdfDataUri = generateConsultaPDF('Consultar CEP', res.resultado_formatado);
      const name = `cep_${cleanCep}_${Date.now()}.pdf`;
      setFileName(name);
      setFileBase64(pdfDataUri);

      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao consultar CEP.');
      setStage('error');
    }
  }, [cep, data.companyId, supabase, playText]);

  const handleCopy = useCallback(async () => {
    if (!resultData) return;
    const text = `CEP: ${resultData.cep}\nLogradouro: ${resultData.logradouro}\nBairro: ${resultData.bairro}\nCidade: ${resultData.localidade}\nUF: ${resultData.uf}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    playText('Endereço copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [resultData, playText]);

  const handleDownloadPdf = useCallback(() => {
    if (!fileBase64) return;
    try {
      const a = document.createElement('a');
      a.href = fileBase64;
      a.download = fileName || `cep_${Date.now()}.pdf`;
      a.click();
      playText('PDF baixado.').catch(() => {});
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      playText('Erro ao baixar PDF.').catch(() => {});
    }
  }, [fileBase64, fileName, playText]);

  const handleOpenMaps = useCallback(() => {
    if (!resultData) return;
    const url = getMapsUrl(resultData);
    window.open(url, '_blank', 'noopener,noreferrer');
    playText('Abrindo no Google Maps.').catch(() => {});
  }, [resultData, playText]);

  const handleReset = useCallback(() => {
    setStage('input');
    setCep('');
    setResultData(null);
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    setFileBase64('');
    setFileName('');
    setDownloadToken('');
    setResultadoFormatado([]);
    setMapsQrCodeUrl('');
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!resultData) return;
    setIsSendingEmail(true);
    try {
      const emailBody = `Consulta CEP: ${resultData.cep}\n\nLogradouro: ${resultData.logradouro}\nBairro: ${resultData.bairro}\nCidade: ${resultData.localidade}\nUF: ${resultData.uf}\nComplemento: ${resultData.complemento || '-'}`;
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: `Consulta CEP: ${resultData.cep}`, body: emailBody },
      });
      if (error) throw error;
      playText('Consulta enviada por email.').catch(() => {});
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
        const numbers = t.replace(/\D/g, '');
        if (numbers.length === 8) {
          setCep(formatCep(numbers));
          playText(`CEP ${formatCep(numbers)} digitado.`).catch(() => {});
          return;
        }
        if (['consultar', 'buscar', 'pesquisar'].some(c => t.includes(c))) {
          handleConsultar();
          return;
        }
      }

      if (stage === 'result') {
        if (['copiar', 'copia'].some(c => t.includes(c))) { handleCopy(); return; }
        if (['baixar', 'pdf', 'download'].some(c => t.includes(c))) { handleDownloadPdf(); return; }
        if (['maps', 'mapa', 'abrir'].some(c => t.includes(c))) { handleOpenMaps(); return; }
        if (['nova', 'outro', 'novamente'].some(c => t.includes(c))) { handleReset(); return; }
        if (googleConnected && ['email', 'enviar'].some(c => t.includes(c))) { handleSendByEmail(); return; }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'de novo'].some(c => t.includes(c))) {
          handleReset();
          return;
        }
      }
    }
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] rounded-xl md:rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-3 md:px-6 py-2.5 md:py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 md:gap-3">
            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
            <div>
              <h2 className={`text-sm md:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Consultar CEP
              </h2>
              <p className={`text-[10px] md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Buscar endereço completo
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
            {stage === 'result' && (
              <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-medium ${isDark ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                {timeLeft}s
              </div>
            )}
            <button
              onClick={onClose}
              className={`p-1 md:p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-60px)] md:max-h-[calc(90vh-80px)] p-3 md:p-6">
          
          {/* ── Input ── */}
          {stage === 'input' && (
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="relative">
                <MapPin className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                  className={`w-full pl-10 md:pl-11 pr-3 md:pr-4 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm ${isDark ? 'bg-slate-900 text-white placeholder-slate-500 border border-slate-700' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200'}`}
                  onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
                />
              </div>

              {errorMsg && (
                <div className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleConsultar}
                disabled={cep.replace(/\D/g, '').length !== 8}
                className="w-full py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Consultar CEP
              </button>

              <VoiceHint commands={['"01310100"', '"consultar"', '"fechar"']} isDark={isDark} />
            </div>
          )}

          {/* ── Processing ── */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center gap-3 md:gap-4 py-6 md:py-8">
              <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-xs md:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Consultando CEP...</p>
            </div>
          )}

          {/* ── Result ── */}
          {stage === 'result' && resultData && (
            <div className="flex flex-col gap-2 md:gap-4">
              {/* Banner */}
              <div className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span>CEP encontrado!</span>
              </div>

              {/* Layout Desktop e Mobile */}
              <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
                
                {/* Coluna Principal */}
                <div className="flex flex-col gap-2 md:gap-3 flex-1 min-w-0">
                  
                  {/* Mapa Embed */}
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <div className={`rounded-lg md:rounded-xl overflow-hidden ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                      <iframe
                        src={getMapEmbedUrl(resultData)}
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="md:h-64"
                      />
                    </div>
                  )}

                  {/* Card de dados */}
                  <div className={`p-3 md:p-4 rounded-lg md:rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                      <div>
                        <p className={`text-[10px] md:text-xs mb-0.5 md:mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>CEP</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.cep}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] md:text-xs mb-0.5 md:mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Logradouro</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.logradouro}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] md:text-xs mb-0.5 md:mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Bairro</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.bairro}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] md:text-xs mb-0.5 md:mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cidade/UF</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.localidade} - {resultData.uf}</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões - Layout Compacto Mobile */}
                  <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {copied ? <Check className="w-3 h-3 md:w-4 md:h-4 text-green-400" /> : <Copy className="w-3 h-3 md:w-4 md:h-4" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      className="flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />PDF
                    </button>
                    <button
                      onClick={handleOpenMaps}
                      className="flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />Maps
                    </button>
                    <button
                      onClick={handleReset}
                      className={`flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />Novo
                    </button>
                  </div>

                  {googleConnected && (
                    <button
                      onClick={handleSendByEmail}
                      disabled={isSendingEmail}
                      className="w-full flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSendingEmail
                        ? <><Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />Enviando...</>
                        : <><Mail className="w-3 h-3 md:w-4 md:h-4" />Enviar por email</>
                      }
                    </button>
                  )}
                </div>

                {/* Coluna QR Codes - Desktop */}
                <div className="hidden lg:flex flex-col gap-2 shrink-0 w-48">
                  {/* QR PDF */}
                  <ResultDownloadQR
                    companyId={data.companyId}
                    fileName={fileName}
                    fileType="application/pdf"
                    fileBase64={fileBase64}
                    isDark={isDark}
                    enabled={stage === 'result' && !!fileBase64}
                  />

                  {/* QR Maps */}
                  {mapsQrCodeUrl && (
                    <div className={`rounded-xl border p-3 flex flex-col items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Abrir no Maps</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <img src={mapsQrCodeUrl} alt="QR Google Maps" width={120} height={120} className="rounded" />
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Codes - Mobile */}
                <div className="lg:hidden grid grid-cols-2 gap-2">
                  {/* QR PDF */}
                  <div className="scale-90 origin-top">
                    <ResultDownloadQR
                      companyId={data.companyId}
                      fileName={fileName}
                      fileType="application/pdf"
                      fileBase64={fileBase64}
                      isDark={isDark}
                      enabled={stage === 'result' && !!fileBase64}
                    />
                  </div>

                  {/* QR Maps */}
                  {mapsQrCodeUrl && (
                    <div className={`rounded-lg border p-2 flex flex-col items-center gap-1.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <div className={`flex items-center gap-1 text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <MapPin className="w-3 h-3" />
                        <span>Abrir Maps</span>
                      </div>
                      <div className="p-1.5 bg-white rounded shadow-sm">
                        <img src={mapsQrCodeUrl} alt="QR Google Maps" width={100} height={100} className="rounded" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice hint */}
              <VoiceHint
                commands={['"copiar"', '"pdf"', '"maps"', '"novo"', ...(googleConnected ? ['"email"'] : []), '"fechar"']}
                isDark={isDark}
              />
            </div>
          )}

          {/* ── Error ── */}
          {stage === 'error' && (
            <div className="flex flex-col gap-3 md:gap-4">
              <div className={`px-2 md:px-3 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {errorMsg}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />Tentar novamente
              </button>
              <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}