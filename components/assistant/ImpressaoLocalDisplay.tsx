// ============================================================
// ImpressaoLocalDisplay.tsx
// Caminho: eAi/components/assistant/ImpressaoLocalDisplay.tsx
//
// Modal para Impressão Local (Nativa) - 1 crédito
// - Upload de arquivo ou foto via CameraCapture
// - Opção de cobrança via PIX ou desconto de créditos
// - Abertura de impressão nativa do sistema
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, AlertCircle, Printer,
  Loader2, Mic, Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import CameraCapture from '@/components/assistant/CameraCapture';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
// ✅ CORREÇÃO: Adicionado 'waiting_attendant' aos stages
type Stage = 'upload' | 'processing' | 'payment' | 'waiting_attendant' | 'printing' | 'success' | 'error';

interface Props {
  data: { 
    companyId: string;
    functionKey: string; // 'impressao_local'
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
  // ✅ CORREÇÃO: Adicionado 'manual' ao tipo
  payment_method: 'pix' | 'credits' | 'manual';
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

export default function ImpressaoLocalDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('upload');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  // ✅ CORREÇÃO: Renomeado chargeEnabled → manualPaymentEnabled
  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(false);
  const [pricePerPage, setPricePerPage] = useState(0.50);
  const [printFileUrl, setPrintFileUrl] = useState<string | null>(null);

  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Buscar configurações ────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: company } = await supabase
        .from('companies')
        // ✅ CORREÇÃO: Renomeado print_charge_enabled → manual_payment_enabled
        .select('manual_payment_enabled, print_price_per_page')
        .eq('id', data.companyId)
        .single();

      if (company) {
        // ✅ CORREÇÃO: Renomeado setChargeEnabled → setManualPaymentEnabled
        setManualPaymentEnabled(company.manual_payment_enabled ?? false);
        setPricePerPage(company.print_price_per_page ?? 0.50);
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

  // ── Limpar blob URL ao desmontar ────────────────────────
  useEffect(() => {
    return () => {
      if (printFileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(printFileUrl);
      }
    };
  }, [printFileUrl]);

  // ── Upload de arquivo ───────────────────────────────────
  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');

    try {
      let fileType = 'image/jpeg';
      let fileName = `impressao_${Date.now()}.jpg`;

      if (base64.startsWith('JVBERi')) {
        fileType = 'application/pdf';
        fileName = `impressao_${Date.now()}.pdf`;
      }

      const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-print-file', {
        body: {
          base64,
          companyId: data.companyId,
          fileName,
          functionKey: data.functionKey,
          pricePerPage,
          // ✅ CORREÇÃO: Renomeado chargeEnabled → manualPaymentEnabled, 'pix'/'credits' → 'manual'/'pix'
          paymentMethod: manualPaymentEnabled ? 'manual' : 'pix',
        },
      });

      if (uploadError || !uploadResult?.success) {
        throw new Error(uploadResult?.error || 'Erro ao processar arquivo');
      }

      const job = uploadResult.job;
      const filePath = uploadResult.filePath;
      const estimatedPages = uploadResult.pagesCount;
      const totalAmount = estimatedPages * pricePerPage;
      const sizeBytes = Math.round((base64.length * 3) / 4);

      console.log('✅ Arquivo processado. Job ID:', job.id);

      setFilePreview({
        name: fileName,
        type: fileType,
        size: sizeBytes,
        pages: estimatedPages,
        base64,
      });

      // ✅ CORREÇÃO: payment_method usa 'manual' | 'pix'
      setPrintJob({
        id: job.id,
        file_url: filePath,
        pages_count: estimatedPages,
        total_amount: totalAmount,
        payment_method: manualPaymentEnabled ? 'manual' : 'pix',
      });

      console.log('🔍 Debug preço:', {
        estimatedPages,
        pricePerPage,
        totalAmount,
        pagesCountRaw: uploadResult.pagesCount,
      });

      // ✅ CORREÇÃO: Fluxo manual vs PIX automático
      if (manualPaymentEnabled) {
        // Modo manual: mostra mensagem para atendente processar
        setStage('waiting_attendant');
      } else {
        // Modo autoatendimento: gera PIX automático
        setStage('payment');
        await generatePix(job.id, totalAmount);
      }

    } catch (err: any) {
      console.error('❌ Erro no upload:', err);
      setErrorMsg(err.message ?? 'Erro ao processar arquivo.');
      setStage('error');
    }
  }, [data.companyId, manualPaymentEnabled, pricePerPage, supabase]);

  // ── Gerar PIX ───────────────────────────────────────────
  const generatePix = async (jobId: string, amount: number) => {
    try {
      await playText(`Gerando cobrança de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via PIX...`);

      const { data: pixResult, error } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: data.companyId,
          amount_cents: Math.round(amount * 100),
          description: `Impressão - ${filePreview?.pages ?? 1} pág`,
          print_job_id: jobId,
        },
      });

      if (error) throw error;

      console.log('🔍 pixResult completo:', JSON.stringify(pixResult));

      setPixData({
        qr_code: pixResult.pix_code,        // ← era qr_code, edge retorna pix_code
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

  // ── Processar impressão ─────────────────────────────────
  // paymentMethod é passado como parâmetro para evitar leitura de state desatualizado
  // ✅ CORREÇÃO: Adicionado 'manual' ao tipo do parâmetro
  const processPrint = async (jobId: string, fileUrl: string, paymentMethod: 'pix' | 'credits' | 'manual') => {
    try {
      if (!jobId) throw new Error('Job de impressão não foi criado');

      const { data: result, error } = await supabase.functions.invoke('processar-impressao', {
        body: {
          jobId,
          companyId: data.companyId,
          paymentMethod, // ← vem do parâmetro, nunca do state
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error ?? 'Falha ao processar impressão');
      }

      // Baixar arquivo como blob para evitar erro cross-origin no iframe
      const { data: fileData } = supabase.storage
        .from('print-files')
        .getPublicUrl(fileUrl);

      if (fileData?.publicUrl) {
        try {
          const response = await fetch(fileData.publicUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setPrintFileUrl(blobUrl);
        } catch {
          // Fallback: usar URL pública diretamente (sem print automático)
          setPrintFileUrl(fileData.publicUrl);
        }
      }

      setStage('success');
      await playText('Arquivo pronto! Clique em imprimir ou aguarde.');

    } catch (err: any) {
      console.error('❌ Erro ao processar impressão:', err);
      setErrorMsg(err.message ?? 'Erro ao processar impressão.');
      setStage('error');
    }
  };

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

      if (stage === 'success') {
        if (['fechar', 'concluir', 'ok'].some(c => t.includes(c))) {
          onClose();
          return;
        }
      }
    }
  });

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

      {/* ── STAGE: PAYMENT — PIXConfirmationModal sobreposto ao modal principal ── */}
      {stage === 'payment' && pixData?.qr_code && pixData?.qr_code_url && printJob && (
        <PIXConfirmationModal
          transactionId={pixData.transaction_id}
          amount={printJob.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          qrCodeUrl={pixData.qr_code_url}
          pixCode={pixData.qr_code}
          companyName={pixData.company_name}
          theme={theme}
          onConfirm={async () => {
            await playText('Pagamento confirmado! Preparando impressão...');
            setStage('printing');
            // Passa fileUrl e paymentMethod diretamente — não depende do state printJob
            await processPrint(printJob.id, printJob.file_url, 'pix');
          }}
          onCancel={async () => {
            onClose();
          }}
        />
      )}

      {/* ── Modal principal (sempre visível exceto no loading de PIX) ── */}
      {stage !== 'payment' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Printer className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Impressão Local
                </h2>
              </div>
              <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── STAGE: UPLOAD ── */}
            {stage === 'upload' && (
              <div className="flex flex-col gap-3">
                <CameraCapture
                  onCapture={handleCapture}
                  onCancel={onClose}
                  theme={theme}
                  companyId={data.companyId}
                  instructions="Envie o arquivo para impressão."
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
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Processando arquivo...
                </p>
              </div>
            )}

            {/* ── STAGE: PRINTING ── */}
            {stage === 'printing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className={`w-12 h-12 animate-spin ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Preparando impressão...
                </p>
              </div>
            )}

            {/* ── STAGE: WAITING_ATTENDANT ── */}
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
                    ({printJob?.pages_count} página{printJob && printJob.pages_count > 1 ? 's' : ''} × {pricePerPage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
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
              <div className="flex flex-col gap-4">

                {/* Preview inline do PDF */}
                {printFileUrl && (
                  <iframe
                    ref={iframeRef}
                    src={printFileUrl}
                    className={`w-full h-72 rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                    onLoad={() => {
                      // Aciona impressão automaticamente quando o PDF carrega
                      iframeRef.current?.contentWindow?.print();
                    }}
                  />
                )}

                <div className="text-center">
                  <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Arquivo pronto para impressão
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    A janela de impressão deve abrir automaticamente
                  </p>
                </div>

                <button
                  onClick={() => iframeRef.current?.contentWindow?.print()}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white`}
                >
                  <Printer className="w-5 h-5" />
                  Imprimir agora
                </button>

                <button
                  onClick={onClose}
                  className={`w-full py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  Concluir
                </button>
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

function InfoRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-xs font-medium uppercase tracking-wider flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  );
}
