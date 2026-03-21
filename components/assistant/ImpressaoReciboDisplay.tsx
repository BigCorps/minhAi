// ============================================================
// ImpressaoReciboDisplay.tsx
// Caminho: eAi/components/assistant/ImpressaoReciboDisplay.tsx
//
// Modal para Impressão Recibo (Térmica) - 1 crédito
// - Upload de arquivo ou foto via CameraCapture
// - Opção de cobrança via PIX ou desconto de créditos
// - Impressão direta em impressora térmica USB/Bluetooth
// - Suporta ESC/POS (Epson, Bematech, Elgin, Daruma)
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Copy, Check, AlertCircle, Receipt, Usb, 
  Loader2, Mic, Bluetooth, Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import CameraCapture from '@/components/assistant/CameraCapture';
import { thermalPrinterService } from '@/lib/thermal-printer-service';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
type Stage = 'upload' | 'processing' | 'payment' | 'printing' | 'success' | 'error';

interface Props {
  data: { 
    companyId: string;
    functionKey: string; // 'impressao_recibo'
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
  payment_method: 'pix' | 'credits';
}

interface PixData {
  qr_code: string;
  qr_code_url: string;
  transaction_id: string;
}

const OPENING_TEXT = 'Envie um arquivo ou tire uma foto para impressão de recibo. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
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

export default function ImpressaoReciboDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('upload');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  const [chargeEnabled, setChargeEnabled] = useState(false);
  const [pricePerPage, setPricePerPage] = useState(0.50);
  const [printerName, setPrinterName] = useState<string>('');
  const [printerConnected, setPrinterConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'usb' | 'bluetooth' | null>(null);

  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Buscar configurações + verificar impressora térmica ──
  useEffect(() => {
    (async () => {
      const { data: company } = await supabase
        .from('companies')
        .select('print_charge_enabled, print_price_per_page, thermal_printer_id, thermal_connection_type')
        .eq('id', data.companyId)
        .single();

      if (company) {
        setChargeEnabled(company.print_charge_enabled ?? false);
        setPricePerPage(company.print_price_per_page ?? 0.50);

        // Verificar se impressora térmica está conectada
        if (company.thermal_printer_id) {
          const connectedPrinter = thermalPrinterService.getConnectedPrinter();
          
          if (connectedPrinter && connectedPrinter.id === company.thermal_printer_id) {
            setPrinterConnected(true);
            setPrinterName(connectedPrinter.name);
            setConnectionType(connectedPrinter.type as 'usb' | 'bluetooth');
          } else {
            // Tentar reconectar
            try {
              const printers = await thermalPrinterService.detectPrinters();
              const targetPrinter = printers.find(p => p.id === company.thermal_printer_id);
              
              if (targetPrinter) {
                if (targetPrinter.type === 'usb') {
                  // USB precisa de permissão do usuário
                  setPrinterName(targetPrinter.name);
                  setConnectionType('usb');
                } else if (targetPrinter.type === 'bluetooth') {
                  await thermalPrinterService.connectBluetooth(targetPrinter);
                  setPrinterConnected(true);
                  setPrinterName(targetPrinter.name);
                  setConnectionType('bluetooth');
                }
              }
            } catch {
              setPrinterName('Impressora Térmica');
            }
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

const handleCapture = useCallback(async (base64: string) => {
  setStage('processing');

  try {
    // Detectar tipo e nome do arquivo
    let fileType = 'image/jpeg';
    let fileName = `impressao_${Date.now()}.jpg`;

    if (base64.startsWith('JVBERi')) {
      fileType = 'application/pdf';
      fileName = `impressao_${Date.now()}.pdf`;
    }

    // Upload + criar job via Edge Function (bypassa RLS)
    const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-print-file', {
      body: {
        base64,
        companyId: data.companyId,
        fileName,
        functionKey: data.functionKey,
        pricePerPage,
        paymentMethod: chargeEnabled ? 'pix' : 'credits',
      },
    });

    if (uploadError || !uploadResult?.success) {
      throw new Error(uploadResult?.error || 'Erro ao processar arquivo');
    }

    // Dados retornados pela Edge Function
    const job = uploadResult.job;
    const filePath = uploadResult.filePath;
    const estimatedPages = uploadResult.pagesCount;  // ← única declaração
    const totalAmount = estimatedPages * pricePerPage;

    console.log('✅ Arquivo processado. Job ID:', job.id);

    const sizeBytes = Math.round((base64.length * 3) / 4); // estimativa do tamanho

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
      payment_method: chargeEnabled ? 'pix' : 'credits',
    });

    if (chargeEnabled) {
      setStage('payment');
      await generatePix(job.id, totalAmount);
    } else {
      setStage('printing');
      await processPrint(job.id);
    }

  } catch (err: any) {
    console.error('❌ Erro no upload:', err);
    setErrorMsg(err.message ?? 'Erro ao processar arquivo.');
    setStage('error');
  }
}, [data.companyId, chargeEnabled, pricePerPage, supabase]);

  // ── Gerar PIX ───────────────────────────────────────────
  const generatePix = async (jobId: string, amount: number) => {
    try {
      await playText(`Gerando cobrança de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via PIX...`);

      const { data: pixResult, error } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: data.companyId,
          amount_cents: Math.round(amount * 100),
          description: `Impressão Recibo - ${filePreview?.pages} pág`,
          print_job_id: jobId,
        },
      });

      if (error) throw error;

      setPixData({
        qr_code: pixResult.qr_code,
        qr_code_url: pixResult.qr_code_url,
        transaction_id: pixResult.transaction_id,
      });

      await playText('QR Code gerado. Escaneie para pagar ou diga: copiar para copiar o código PIX.');

    } catch (err: any) {
      console.error('❌ Erro ao gerar PIX:', err);
      setErrorMsg('Erro ao gerar PIX. Tente novamente.');
      setStage('error');
    }
  };

  // ── Confirmar PIX ───────────────────────────────────────
  const handleConfirmPix = async () => {
    if (!pixData || !filePreview) return;

    try {
      await playText('Verificando pagamento...');

      const { data: result, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: pixData.transaction_id },
      });

      if (error) throw error;

      if (!result.success) {
        await playText('PIX ainda não foi pago. Aguarde após o pagamento e diga: confirmar.');
        return;
      }

      await playText('Pagamento confirmado! Preparando impressão térmica...');
      setStage('printing');
      await processPrint(printJob!.id, filePreview.base64);

    } catch (err: any) {
      console.error('❌ Erro ao confirmar PIX:', err);
      await playText('Erro ao confirmar pagamento.');
    }
  };

  // ── Processar impressão (Térmica ESC/POS) ───────────────
  const processPrint = async (jobId: string, contentBase64: string) => {
    try {
      await playText('Preparando impressão térmica...');

      // 1. Processar pagamento/créditos via Edge Function
      const { data: result, error } = await supabase.functions.invoke('processar-impressao', {
        body: {
          jobId,
          companyId: data.companyId,
          paymentMethod: printJob!.payment_method,
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error ?? 'Falha ao processar impressão');
      }

      // 2. Converter conteúdo para texto/imagem para impressão térmica
      let printContent = '';
      
      if (contentBase64.startsWith('JVBERi')) {
        // PDF - extrair texto ou converter primeira página
        printContent = '──── RECIBO ────\n\n';
        printContent += `Arquivo: ${filePreview?.name}\n`;
        printContent += `Páginas: ${filePreview?.pages}\n`;
        printContent += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
        printContent += '────────────────\n';
      } else {
        // Imagem - imprimir como recibo simples
        printContent = '──── RECIBO ────\n\n';
        printContent += `${new Date().toLocaleString('pt-BR')}\n\n`;
        printContent += 'Imagem capturada\n';
        printContent += '────────────────\n';
      }

      // 3. Verificar conexão com impressora
      if (!printerConnected) {
        // Se USB, pedir permissão
        if (connectionType === 'usb') {
          const printer = await thermalPrinterService.requestUSBPrinter();
          if (printer) {
            setPrinterConnected(true);
            setPrinterName(printer.name);
          } else {
            throw new Error('Permissão de impressora USB negada');
          }
        } else {
          throw new Error('Impressora térmica não conectada');
        }
      }

      // 4. Imprimir na térmica
      await thermalPrinterService.printText(printContent, {
        align: 'center',
        bold: true,
        cut: true,
      });

      setStage('success');
      await playText('Recibo impresso com sucesso!');

    } catch (err: any) {
      console.error('❌ Erro ao processar impressão:', err);
      setErrorMsg(err.message ?? 'Erro ao processar impressão.');
      setStage('error');
    }
  };

  // ── Copiar PIX ──────────────────────────────────────────
  const handleCopyPix = useCallback(async () => {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    await playText('Código PIX copiado.');
    setTimeout(() => setCopied(false), 2000);
  }, [pixData, playText]);

  // ── Comandos de voz ─────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
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
      }

      if (stage === 'payment' && pixData) {
        if (['copiar', 'copia', 'copie'].some(c => t.includes(c))) {
          handleCopyPix();
          return;
        }
        if (['confirmar', 'confirma', 'pago'].some(c => t.includes(c))) {
          handleConfirmPix();
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

  const modalMaxWidth = stage === 'payment' ? 'max-w-sm sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Receipt className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Impressão Recibo
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>
              Térmica
            </span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STAGE: UPLOAD ── */}
        {stage === 'upload' && (
          <div className="flex flex-col gap-3">
            {/* Status da impressora */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              printerConnected 
                ? isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'
                : isDark ? 'bg-amber-900/30 border border-amber-700 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              {printerConnected ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Impressora conectada:</strong> {printerName} via {connectionType === 'usb' ? 'USB' : 'Bluetooth'}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Impressora será conectada no momento da impressão
                  </span>
                </>
              )}
            </div>

            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Envie o arquivo para impressão do recibo."
              acceptPdf={true}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
              enabledTabs={['companion', 'upload']}
            />
            <VoiceHint commands={['"celular"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── STAGE: PROCESSING ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Processando arquivo...
            </p>
          </div>
        )}

        {/* ── STAGE: PAYMENT (PIX) ── */}
        {stage === 'payment' && pixData && printJob && (
          <div className="flex flex-col gap-4">
            {/* Desktop: layout horizontal */}
            <div className="hidden sm:flex gap-6">
              <div className="flex-shrink-0">
                <div className="relative w-64 h-64 bg-white rounded-xl p-4 shadow-sm">
                  <img src={pixData.qr_code_url} alt="QR Code PIX" className="w-full h-full object-contain" />
                  {copied && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/95 rounded-xl">
                      <Check className="w-12 h-12 text-white" />
                      <span className="text-white font-bold mt-1">Copiado!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className={`px-4 py-3 rounded-lg ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
                  <p className={`text-xs uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Valor a Pagar
                  </p>
                  <p className={`text-4xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {printJob.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <InfoRow label="Arquivo" value={filePreview?.name ?? ''} isDark={isDark} />
                  <InfoRow label="Páginas" value={`${printJob.pages_count} página${printJob.pages_count > 1 ? 's' : ''}`} isDark={isDark} />
                  <InfoRow label="Impressora" value={printerName || 'Térmica'} isDark={isDark} />
                  <InfoRow label="Tipo" value="Térmica (1 crédito)" isDark={isDark} highlight />
                </div>

                <div className="flex items-center gap-2">
                  <div
                    onClick={handleCopyPix}
                    className={`flex-1 px-3 py-2 rounded-lg cursor-pointer font-mono text-xs truncate ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                  >
                    {pixData.qr_code.substring(0, 40)}…
                  </div>
                  <button
                    onClick={handleCopyPix}
                    className={`p-2.5 rounded-lg ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleConfirmPix}
                  className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirmar Pagamento
                </button>
              </div>
            </div>

            {/* Mobile: layout vertical */}
            <div className="sm:hidden flex flex-col gap-4">
              <div className={`px-4 py-3 rounded-lg ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
                <p className={`text-xs uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Valor a Pagar
                </p>
                <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {printJob.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              <div className="flex justify-center">
                <div className="relative w-56 h-56 bg-white rounded-xl p-3 shadow-sm">
                  <img src={pixData.qr_code_url} alt="QR Code PIX" className="w-full h-full object-contain" />
                  {copied && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/95 rounded-xl">
                      <Check className="w-10 h-10 text-white" />
                      <span className="text-white font-bold text-sm">Copiado!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <InfoRow label="Arquivo" value={filePreview?.name ?? ''} isDark={isDark} />
                <InfoRow label="Páginas" value={`${printJob.pages_count}`} isDark={isDark} />
                <InfoRow label="Impressora" value={printerName || 'Térmica'} isDark={isDark} />
              </div>

              <div className="flex items-center gap-2">
                <div
                  onClick={handleCopyPix}
                  className={`flex-1 px-3 py-2 rounded-lg cursor-pointer font-mono text-xs truncate ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  {pixData.qr_code.substring(0, 30)}…
                </div>
                <button
                  onClick={handleCopyPix}
                  className={`p-2.5 rounded-lg ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleConfirmPix}
                className="w-full py-3 rounded-lg bg-green-600 text-white font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirmar Pagamento
              </button>
            </div>

            <VoiceHint commands={['"copiar"', '"confirmar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── STAGE: PRINTING ── */}
        {stage === 'printing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Loader2 className={`w-12 h-12 animate-spin ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <Receipt className={`w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? 'text-green-300' : 'text-green-500'}`} />
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Imprimindo recibo em {printerName || 'impressora térmica'}...
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Aguarde a impressão
            </p>
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
                Recibo Impresso!
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Recibo impresso em {printerName || 'impressora térmica'}
              </p>
              <div className={`flex items-center justify-center gap-2 mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {connectionType === 'usb' ? (
                  <><Usb className="w-3.5 h-3.5" /> USB</>
                ) : (
                  <><Bluetooth className="w-3.5 h-3.5" /> Bluetooth</>
                )}
              </div>
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
    </div>,
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
          ? isDark ? 'text-green-400 font-semibold' : 'text-green-600 font-semibold'
          : isDark ? 'text-gray-200' : 'text-gray-700'
      }`}>
        {value}
      </span>
    </div>
  );
}
