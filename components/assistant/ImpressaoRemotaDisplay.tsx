// ============================================================
// ImpressaoRemotaDisplay.tsx
// Caminho: eAi/components/assistant/ImpressaoRemotaDisplay.tsx
//
// Modal para Impressão Remota (PrintNode) - 3 créditos
// - Upload de arquivo ou foto via CameraCapture
// - Seletor P&B / Colorida com preços dinâmicos
// - Envio automático para PrintNode (sem interação do cliente)
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, AlertCircle, Cloud, 
  Loader2, Mic, Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import CameraCapture from '@/components/assistant/CameraCapture';
import PIXConfirmationModal from '@/components/assistant/PixConfirmationModal';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
// waiting_attendant só é usado quando manualPaymentEnabled = true
type Stage = 'upload' | 'processing' | 'payment' | 'waiting_attendant' | 'printing' | 'success' | 'error';

interface Props {
  data: { 
    companyId: string;
    functionKey: string; // 'impressao_remota'
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

interface FilePreview {
  name: string;
  type: string;
  size: number;
  pages: number;
  base64: string;
}

interface PrintJob {
  id: string;
  file_url: string;
  pages_count: number;
  total_amount: number;
  payment_method: 'pix' | 'credits' | 'manual';
  printnode_job_id?: string;
}

interface PixData {
  qr_code: string;
  qr_code_url: string;
  transaction_id: string;
  company_name?: string;
}

const AUTO_CLOSE_DURATION = 30000; // 30s

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

export default function ImpressaoRemotaDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('upload');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraTab, setCameraTab] = useState<Tab>('companion');

  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(false);

  // ✅ NOVO: Estados de cor e preços separados
  const [printMode, setPrintMode] = useState<'bw' | 'color'>('bw');
  const [colorEnabled, setColorEnabled] = useState(false);
  const [priceBW, setPriceBW] = useState(0.30);
  const [priceColor, setPriceColor] = useState(0.80);
  const [printerNameBW, setPrinterNameBW] = useState<string>('');
  const [printerNameColor, setPrinterNameColor] = useState<string>('');

  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Buscar configurações ────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: company } = await supabase
        .from('companies')
        // ✅ NOVO: Busca campos de cor e IDs separados
        .select('manual_payment_enabled, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color')
        .eq('id', data.companyId)
        .single();

      if (company) {
        setManualPaymentEnabled(company.manual_payment_enabled ?? false);
        setColorEnabled(company.print_color_enabled ?? false);
        setPriceBW(company.print_price_bw ?? 0.30);
        setPriceColor(company.print_price_color ?? 0.80);

        // Se colorida não habilitada, força P&B
        if (!company.print_color_enabled) {
          setPrintMode('bw');
        }

        // ✅ NOVO: Buscar nomes das impressoras via edge function
        if (company.printnode_computer_id) {
          try {
            const { data: printerInfo } = await supabase.functions.invoke('test-printnode-computer', {
              body: { computerId: company.printnode_computer_id },
            });

            if (printerInfo?.success && printerInfo.printers) {
              if (company.printnode_printer_id_bw) {
                const printerBW = printerInfo.printers.find(
                  (p: any) => p.id === parseInt(company.printnode_printer_id_bw)
                );
                if (printerBW) setPrinterNameBW(printerBW.name || 'Impressora P&B');
              }

              if (company.printnode_printer_id_color) {
                const printerColor = printerInfo.printers.find(
                  (p: any) => p.id === parseInt(company.printnode_printer_id_color)
                );
                if (printerColor) setPrinterNameColor(printerColor.name || 'Impressora Colorida');
              }
            }
          } catch (err) {
            console.error('Erro ao buscar impressoras:', err);
          }
        }
      }
    })();
  }, [data.companyId, supabase]);

  // ── Auto-close após sucesso ─────────────────────────────
  useEffect(() => {
    if (stage === 'success') {
      const timer = setTimeout(() => onClose(), AUTO_CLOSE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [stage, onClose]);

  // ── Upload de arquivo ───────────────────────────────────
  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');

    try {
      let fileType = 'image/jpeg';
      let fileName = `remota_${Date.now()}.jpg`;

      if (base64.startsWith('JVBERi')) {
        fileType = 'application/pdf';
        fileName = `remota_${Date.now()}.pdf`;
      }

      // ✅ NOVO: Preço dinâmico baseado no modo selecionado
      const currentPricePerPage = printMode === 'bw' ? priceBW : priceColor;

      const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-print-file', {
        body: {
          base64,
          companyId: data.companyId,
          fileName,
          functionKey: data.functionKey,
          pricePerPage: currentPricePerPage,
          paymentMethod: manualPaymentEnabled ? 'manual' : 'pix',
          printMode,  // ✅ NOVO: envia modo para salvar no job
        },
      });

      if (uploadError || !uploadResult?.success) {
        throw new Error(uploadResult?.error || 'Erro ao processar arquivo');
      }

      const job = uploadResult.job;
      const filePath = uploadResult.filePath;
      const estimatedPages = uploadResult.pagesCount;
      const totalAmount = estimatedPages * currentPricePerPage;
      const sizeBytes = Math.round((base64.length * 3) / 4);

      console.log('✅ Arquivo processado. Job ID:', job.id, '| modo:', printMode);

      setFilePreview({
        name: fileName,
        type: fileType,
        size: sizeBytes,
        pages: estimatedPages,
        base64,
      });

      setPrintJob({
        id: job.id,
        file_url: filePath,
        pages_count: estimatedPages,
        total_amount: totalAmount,
        payment_method: manualPaymentEnabled ? 'manual' : 'pix',
      });

if (manualPaymentEnabled) {
  // Cobrança manual: libera impressão direto, atendente cobra fora do sistema
  setStage('printing');
  await processPrint(job.id, 'manual');
} else {
  setStage('payment');
  await generatePix(job.id, totalAmount);
}

    } catch (err: any) {
      console.error('❌ Erro no upload:', err);
      setErrorMsg(err.message ?? 'Erro ao processar arquivo.');
      setStage('error');
    }
  }, [data.companyId, manualPaymentEnabled, printMode, priceBW, priceColor, supabase]);

  // ── Gerar PIX ───────────────────────────────────────────
  const generatePix = async (jobId: string, amount: number) => {
    try {
      await playText(`Gerando cobrança de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via PIX...`);

      const { data: pixResult, error } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: data.companyId,
          amount_cents: Math.round(amount * 100),
          description: `Impressão Remota ${printMode === 'bw' ? 'P&B' : 'Colorida'} - ${filePreview?.pages ?? 1} pág`,
          print_job_id: jobId,
        },
      });

      if (error) throw error;

      setPixData({
        qr_code: pixResult.pix_code,
        qr_code_url: pixResult.qr_code_url,
        transaction_id: pixResult.transaction_id,
        company_name: pixResult.company_name,
      });

      await playText('QR Code gerado. Escaneie para pagar ou diga: copiar para copiar o código PIX.');

    } catch (err: any) {
      console.error('❌ Erro ao gerar PIX:', err);
      setErrorMsg('Erro ao gerar PIX. Tente novamente.');
      setStage('error');
    }
  };

  // ── Processar impressão (PrintNode) ─────────────────────
  const processPrint = async (jobId: string, paymentMethod: 'pix' | 'credits' | 'manual') => {
    try {
      if (!jobId) throw new Error('Job de impressão não foi criado');

      await playText('Enviando para impressora remota...');

      const { data: result, error } = await supabase.functions.invoke('processar-impressao', {
        body: {
          jobId,
          companyId: data.companyId,
          paymentMethod,
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error ?? 'Falha ao processar impressão');
      }

      setPrintJob(prev => prev ? { ...prev, printnode_job_id: result.printNodeJobId } : null);
      setStage('success');

      const activePrinter = printMode === 'bw' ? printerNameBW : printerNameColor;
      await playText(
        result.hasPrintNode
          ? `Documento enviado para ${activePrinter || 'impressora remota'}. A impressão será feita automaticamente.`
          : 'Impressão processada com sucesso.'
      );

    } catch (err: any) {
      console.error('❌ Erro ao processar impressão:', err);
      setErrorMsg(err.message ?? 'Erro ao processar impressão.');
      setStage('error');
    }
  };

  // ── Comandos de voz ─────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: async (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose();
        return;
      }

      if (stage === 'upload') {
        const TAB_MAP: Record<string, Tab> = {
          'celular': 'companion',
          'webcam': 'webcam',
          'camera': 'mobile',
          'arquivo': 'upload',
        };

        for (const [trigger, tab] of Object.entries(TAB_MAP)) {
          if (t.includes(trigger)) {
            setCameraTab(tab);
            return;
          }
        }

        // ✅ NOVO: Comandos de voz para modo de impressão
        if (['preto', 'branco', 'cinza', 'monocromatico'].some(c => t.includes(c))) {
          setPrintMode('bw');
          await playText('Modo preto e branco selecionado.');
          return;
        }

        if (['colorido', 'colorida', 'cor', 'cores'].some(c => t.includes(c))) {
          if (colorEnabled) {
            setPrintMode('color');
            await playText('Modo colorido selecionado.');
          } else {
            await playText('Impressão colorida não disponível.');
          }
          return;
        }
      }

      if (stage === 'success') {
        if (['fechar', 'concluir', 'ok'].some(c => t.includes(c))) {
          onClose();
          return;
        }
      }
    }
  });

  // Nome da impressora ativa
  const activePrinterName = printMode === 'bw' ? printerNameBW : printerNameColor;

  // ── Renderização ────────────────────────────────────────
  return createPortal(
    <>
      {/* ── STAGE: PAYMENT aguardando pixData ── */}
      {stage === 'payment' && (!pixData?.qr_code || !pixData?.qr_code_url) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Gerando QR Code PIX...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE: PAYMENT — PIXConfirmationModal ── */}
      {stage === 'payment' && pixData?.qr_code && pixData?.qr_code_url && printJob && (
        <PIXConfirmationModal
          transactionId={pixData.transaction_id}
          amount={printJob.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          qrCodeUrl={pixData.qr_code_url}
          pixCode={pixData.qr_code}
          companyName={pixData.company_name}
          theme={theme}
          onConfirm={async () => {
            await playText('Pagamento confirmado! Enviando para impressora remota...');
            setStage('printing');
            await processPrint(printJob.id, 'pix');
          }}
          onCancel={async () => {
            onClose();
          }}
        />
      )}

      {/* ── Modal principal (todos os outros stages) ── */}
      {stage !== 'payment' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Cloud className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <Zap className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                </div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Impressão Remota
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                  PrintNode
                </span>
              </div>
              <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── STAGE: UPLOAD ── */}
            {stage === 'upload' && (
              <div className="flex flex-col gap-3">

                {/* Banner informativo */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-indigo-900/30 border border-indigo-700 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`}>
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Impressão 100% automática.</strong> O documento será enviado para {activePrinterName || 'a impressora configurada'} sem nenhuma interação do cliente.
                  </span>
                </div>

                {/* ✅ NOVO: Seletor P&B / Colorida (só aparece se colorida habilitada) */}
                {colorEnabled && (
                  <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <button
                      onClick={() => setPrintMode('bw')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                        printMode === 'bw'
                          ? isDark
                            ? 'bg-slate-600 text-white shadow-md'
                            : 'bg-white text-gray-900 shadow-md'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-2xl">⚫</span>
                        <span>Preto e Branco</span>
                        <span className={`text-xs ${printMode === 'bw' ? (isDark ? 'text-slate-300' : 'text-gray-700') : 'text-slate-500'}`}>
                          {priceBW.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/pág
                        </span>
                        {printerNameBW && (
                          <span className={`text-xs truncate max-w-full ${printMode === 'bw' ? (isDark ? 'text-slate-400' : 'text-gray-500') : 'text-slate-600'}`}>
                            → {printerNameBW}
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => setPrintMode('color')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                        printMode === 'color'
                          ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white shadow-md'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-2xl">🌈</span>
                        <span>Colorida</span>
                        <span className={`text-xs ${printMode === 'color' ? 'text-white/90' : 'text-slate-500'}`}>
                          {priceColor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/pág
                        </span>
                        {printerNameColor && (
                          <span className={`text-xs truncate max-w-full ${printMode === 'color' ? 'text-white/80' : 'text-slate-600'}`}>
                            → {printerNameColor}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                )}

                <CameraCapture
                  onCapture={handleCapture}
                  onCancel={onClose}
                  theme={theme}
                  companyId={data.companyId}
                  instructions="Envie o arquivo para impressão automática."
                  acceptPdf={true}
                  activeTab={cameraTab}
                  onTabChange={setCameraTab}
                  enabledTabs={['companion', 'upload']}
                />

                <VoiceHint
                  commands={colorEnabled
                    ? ['"preto e branco"', '"colorida"', '"celular"', '"arquivo"', '"fechar"']
                    : ['"celular"', '"arquivo"', '"fechar"']
                  }
                  isDark={isDark}
                />
              </div>
            )}

            {/* ── STAGE: PROCESSING ── */}
            {stage === 'processing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Processando arquivo...
                </p>
              </div>
            )}

            {/* ── STAGE: PRINTING ── */}
            {stage === 'printing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <Loader2 className={`w-12 h-12 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <Cloud className={`w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? 'text-indigo-300' : 'text-indigo-500'}`} />
                </div>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Enviando para {activePrinterName || 'impressora remota'}...
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  A impressão será automática
                </p>
              </div>
            )}

            {/* ── STAGE: WAITING_ATTENDANT (apenas quando manualPaymentEnabled = true) ── */}
            {stage === 'waiting_attendant' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                }`}>
                  <AlertCircle className={`w-8 h-8 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>

                <div className="text-center">
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Aguarde o Atendente
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    O valor da impressão é: {printJob?.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    ({printJob?.pages_count} página{printJob && printJob.pages_count > 1 ? 's' : ''} × {(printMode === 'bw' ? priceBW : priceColor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    Modo: {printMode === 'bw' ? 'Preto e Branco' : 'Colorida'}
                  </p>
                  <p className={`text-xs mt-3 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    O atendente irá processar o pagamento e liberar a impressão
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* ── STAGE: SUCCESS ── */}
            {stage === 'success' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Impressão Enviada!
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    O documento será impresso automaticamente em {activePrinterName || 'impressora remota'}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {printMode === 'bw' ? '⚫ Preto e Branco' : '🌈 Colorida'}
                  </p>
                  {printJob?.printnode_job_id && (
                    <p className={`text-xs mt-2 font-mono ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      Job ID: {printJob.printnode_job_id}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  Concluir
                </button>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Fechando automaticamente em {Math.ceil(AUTO_CLOSE_DURATION / 1000)}s
                </p>
              </div>
            )}

            {/* ── STAGE: ERROR ── */}
            {stage === 'error' && (
              <div className="flex flex-col gap-4">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{errorMsg}</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  Fechar
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/* ─── Sub-components ─── */

function InfoRow({ label, value, isDark, highlight = false }: { label: string; value: string; isDark: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-xs font-medium uppercase tracking-wider flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-sm truncate ${
        highlight
          ? isDark ? 'text-indigo-400 font-semibold' : 'text-indigo-600 font-semibold'
          : isDark ? 'text-gray-200' : 'text-gray-700'
      }`}>
        {value}
      </span>
    </div>
  );
}
