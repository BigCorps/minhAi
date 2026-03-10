'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Mail, Loader2, Mic, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import CameraCapture from '@/components/assistant/CameraCapture';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
type Stage = 'capturing' | 'extracting' | 'validating' | 'result' | 'error';

interface ValidationResult {
  valid: boolean;
  reason?: string; // NOT_FOUND | INACTIVE | EXPIRED | EXHAUSTED
  cupom?: {
    code: string;
    discount_type: string;
    discount_value: number;
    times_used: number;
    max_uses: number | null;
    expires_at: string | null;
    referred_by_identifier: string | null;
  };
  speech_text?: string;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

function useCameraProcess() {
  const supabase = createClient();
  // Passo 1: IA extrai o código de texto da imagem
  const extractCode = async (base64: string, companyId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('camera-process', {
      body: { action: 'cupom', image: base64, company_id: companyId },
    });
    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error ?? 'Falha ao extrair código');
    const code = (data.result as string).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) throw new Error('Não foi possível identificar um código no cupom.');
    return code;
  };
  return { extractCode };
}

const OPENING_TEXT = 'Fotografe o cupom ou voucher. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 30;

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

function formatDiscount(type: string, value: number): string {
  if (type === 'percent' || type === 'percentage') return `${value}% de desconto`;
  if (type === 'fixed_amount') return `R$ ${Number(value).toFixed(2).replace('.', ',')} de desconto`;
  if (type === 'free_product') return 'produto grátis';
  if (type === 'eai_credits') return `${value} créditos eAi`;
  return `${value} de desconto`;
}

const REASON_TEXT: Record<string, string> = {
  NOT_FOUND:  'Cupom não encontrado.',
  INACTIVE:   'Este cupom está inativo.',
  EXPIRED:    'Este cupom expirou.',
  EXHAUSTED:  'Este cupom atingiu o limite de usos.',
};

export default function ValidarCupomDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [extractedCode, setExtractedCode] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechText, setSpeechText] = useState<string>('');

  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { extractCode } = useCameraProcess();
  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    return () => {
      if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    };
  }, []);

  // Auto-close 30s após resultado
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

  const handleCapture = useCallback(async (base64: string) => {
    // ── Passo 1: IA lê o código do cupom na imagem ──────────────
    setStage('extracting');
    let code: string;
    try {
      code = await extractCode(base64, data.companyId);
      setExtractedCode(code);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Não foi possível ler o código do cupom.');
      setStage('error');
      playText('Não foi possível ler o código. Tente novamente.').catch(() => {});
      return;
    }

    // ── Passo 2: validar-cupom consulta o banco ──────────────────
    setStage('validating');
    try {
      const { data: result, error } = await supabase.functions.invoke('validar-cupom', {
        body: { company_id: data.companyId, code },
      });
      if (error) throw new Error(error.message);

      const v: ValidationResult = result;
      setValidation(v);

      const speech = v.speech_text
        ?? (v.valid && v.cupom
          ? `Cupom ${code} válido! ${formatDiscount(v.cupom.discount_type, v.cupom.discount_value)} aplicado.`
          : `Cupom inválido. ${v.reason ? REASON_TEXT[v.reason] ?? v.reason : ''}`);
      setSpeechText(speech);
      setStage('result');
      playText(speech).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao validar cupom.');
      setStage('error');
      playText('Erro ao validar cupom. Tente novamente.').catch(() => {});
    }
  }, [data.companyId, extractCode, supabase, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setExtractedCode(null);
    setValidation(null);
    setErrorMsg(null);
    setSpeechText('');
    if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    lastTabCommandRef.current = null;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!validation) return;
    setIsSendingEmail(true);
    const body = validation.valid && validation.cupom
      ? `Código: ${validation.cupom.code}\nStatus: Válido\nDesconto: ${formatDiscount(validation.cupom.discount_type, validation.cupom.discount_value)}\nUsos: ${validation.cupom.times_used}${validation.cupom.max_uses ? ` / ${validation.cupom.max_uses}` : ''}\nCliente: ${validation.cupom.referred_by_identifier ?? '—'}`
      : `Código: ${extractedCode}\nStatus: Inválido\nMotivo: ${validation?.reason ? REASON_TEXT[validation.reason] ?? validation.reason : 'Desconhecido'}`;
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Validar Cupom', body },
      });
      if (error) throw error;
      playText('Enviado por email.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  const TAB_COMMANDS: Record<string, string[]> = {
    webcam:    ['webcam', 'computador', 'camera do computador'],
    mobile:    ['camera', 'camara', 'meu celular', 'telefone'],
    upload:    ['arquivo', 'upload', 'galeria'],
    companion: ['celular', 'qr code', 'qrcode', 'enviar do celular'],
  };
  const TAB_FEEDBACK: Record<string, string> = {
    webcam:    'Webcam ativada.',
    mobile:    'Câmera do celular selecionada.',
    upload:    'Selecione um arquivo de imagem.',
    companion: 'Aponte o celular para o QR Code.',
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(cmd => t.includes(cmd))) { onClose(); return; }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(cmd => t.includes(cmd))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {}); return;
      }
      if (stage === 'capturing') {
        for (const [tab, triggers] of Object.entries(TAB_COMMANDS)) {
          if (triggers.some(tr => t.includes(tr))) {
            if (lastTabCommandRef.current === tab) return;
            lastTabCommandRef.current = tab;
            setCameraTab(tab as Tab);
            playText(TAB_FEEDBACK[tab]).catch(() => {});
            if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
            tabCommandTimeoutRef.current = setTimeout(() => { lastTabCommandRef.current = null; }, 4000);
            return;
          }
        }
      }
      if (stage === 'result') {
        if (['novo cupom', 'novo', 'outra', 'tentar novamente', 'novamente'].some(cmd => t.includes(cmd))) { handleReset(); return; }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(cmd => t.includes(cmd))) { handleSendByEmail(); return; }
      }
      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(cmd => t.includes(cmd))) { handleReset(); return; }
      }
    }
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Validar Cupom</h2>
          <div className="flex items-center gap-3">
            {stage === 'result' && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                {timeLeft}s
              </span>
            )}
            <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Capturing ── */}
        {stage === 'capturing' && (
          <div className="flex flex-col gap-3">
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Fotografe o cupom ou voucher."
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Extracting: IA lendo código ── */}
        {stage === 'extracting' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Lendo o código do cupom...</p>
          </div>
        )}

        {/* ── Validating: consultando banco ── */}
        {stage === 'validating' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className={`font-mono font-bold text-lg tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {extractedCode}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Verificando no sistema...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && validation && (
          <div className="flex flex-col gap-4">

            {/* Código */}
            <div className={`text-center p-3 rounded-xl font-mono text-xl font-bold tracking-widest ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
              {validation.cupom?.code ?? extractedCode}
            </div>

            {/* Status — válido */}
            {validation.valid && validation.cupom ? (
              <>
                <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl text-center ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>Cupom válido!</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                    {formatDiscount(validation.cupom.discount_type, validation.cupom.discount_value)}
                  </div>
                  {validation.cupom.referred_by_identifier && (
                    <p className={`text-xs mt-1 font-normal ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                      Cupom de {validation.cupom.referred_by_identifier}
                    </p>
                  )}
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <p className={`font-medium mb-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Usos</p>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {validation.cupom.times_used}{validation.cupom.max_uses ? ` / ${validation.cupom.max_uses}` : ' / ∞'}
                    </p>
                  </div>
                  <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <p className={`font-medium mb-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Validade</p>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {validation.cupom.expires_at
                        ? new Date(validation.cupom.expires_at).toLocaleDateString('pt-BR')
                        : 'Sem expiração'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Status — inválido */
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{validation.reason ? REASON_TEXT[validation.reason] ?? validation.reason : 'Cupom inválido.'}</span>
              </div>
            )}

            {/* Novo cupom + Enviar email */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <RefreshCw className="w-4 h-4" />Novo cupom
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

            <VoiceHint
              commands={['"novo cupom"', '"repetir"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`flex items-start gap-2 px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
