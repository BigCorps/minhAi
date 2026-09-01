'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// ─── Ícones inline ────────────────────────────────────────────────────────────

function IconX({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconMic({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function IconDownload({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconMail({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconRefresh({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}
function IconQr({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="5" y="5" width="3" height="3" />
      <rect x="16" y="5" width="3" height="3" /><rect x="5" y="16" width="3" height="3" />
      <path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" /><path d="M21 14v3" />
    </svg>
  );
}
function IconSettings({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconChevronDown({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconChevronUp({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'input' | 'generating' | 'result' | 'error';

interface QROptions {
  size: 200 | 300 | 400;
  color: string;
  bgColor: string;
  showLogo: boolean;
}

interface Props {
  data: {
    companyId: string;
    prefillContent?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPENING_TEXT = 'Gerar QR Code. Diga ou digite o texto ou link que deseja converter em QR Code.';

const QR_COLORS = [
  { label: 'Azul',    value: '#000080' },
  { label: 'Preto',   value: '#000000' },
  { label: 'Roxo',    value: '#6d28d9' },
  { label: 'Verde',   value: '#065f46' },
  { label: 'Vermelho',value: '#991b1b' },
  { label: 'Custom',  value: 'custom'  },
];

const BG_COLORS = [
  { label: 'Branco',  value: '#ffffff' },
  { label: 'Creme',   value: '#fef9ef' },
  { label: 'Preto',   value: '#000000' },
  { label: 'Cinza',   value: '#f3f4f6' },
  { label: 'Custom',  value: 'custom'  },
];

const DEFAULT_OPTIONS: QROptions = {
  size: 300,
  color: '#000080',
  bgColor: '#ffffff',
  showLogo: true,
};

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: isDark ? 'rgba(51,65,85,0.5)' : '#f9fafb', color: isDark ? '#94a3b8' : '#6b7280' }}
    >
      <IconMic className="w-3.5 h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {commands.map(cmd => (
          <span
            key={cmd}
            className="px-1.5 py-0.5 rounded font-mono text-[11px]"
            style={{ background: isDark ? '#475569' : '#e5e7eb', color: isDark ? '#93c5fd' : '#1d4ed8' }}
          >
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Botão de seleção de tamanho */
function SizeButton({
  label, sublabel, value, selected, isDark, onClick,
}: {
  label: string; sublabel: string; value: number;
  selected: boolean; isDark: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all"
      style={{
        background: selected
          ? '#2563eb'
          : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
        color: selected ? '#fff' : (isDark ? '#94a3b8' : '#6b7280'),
        border: selected ? 'none' : `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
      }}
    >
      <span className="font-bold">{label}</span>
      <span className="opacity-70">{sublabel}</span>
    </button>
  );
}

/** Swatches de cor + input hex */
function ColorPicker({
  label, colors, selected, customHex, isDark,
  onSelect, onCustomChange,
}: {
  label: string;
  colors: { label: string; value: string }[];
  selected: string;
  customHex: string;
  isDark: boolean;
  onSelect: (v: string) => void;
  onCustomChange: (v: string) => void;
}) {
  const isCustomActive = !colors.slice(0, -1).some(c => c.value === selected);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {colors.map(c => {
          if (c.value === 'custom') {
            return (
              <button
                key="custom"
                title="Cor personalizada"
                onClick={() => onSelect(customHex)}
                className="w-7 h-7 rounded-lg border-2 flex items-center justify-center overflow-hidden transition-all"
                style={{
                  borderColor: isCustomActive ? '#2563eb' : (isDark ? '#475569' : '#d1d5db'),
                  background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                  padding: 0,
                }}
              >
                {/* empty — visual only */}
              </button>
            );
          }
          return (
            <button
              key={c.value}
              title={c.label}
              onClick={() => onSelect(c.value)}
              className="w-7 h-7 rounded-lg border-2 transition-all"
              style={{
                background: c.value,
                borderColor: selected === c.value ? '#2563eb' : (isDark ? '#475569' : '#d1d5db'),
                boxShadow: selected === c.value ? '0 0 0 2px rgba(37,99,235,0.3)' : 'none',
              }}
            />
          );
        })}

        {/* Input hex — aparece sempre, mas destaque quando custom ativo */}
        <input
          type="color"
          value={isCustomActive ? selected : customHex}
          onChange={e => {
            onCustomChange(e.target.value);
            onSelect(e.target.value);
          }}
          className="w-7 h-7 rounded-lg cursor-pointer border-2"
          style={{
            padding: 1,
            borderColor: isCustomActive ? '#2563eb' : (isDark ? '#475569' : '#d1d5db'),
            background: isDark ? '#1e293b' : '#fff',
          }}
          title="Escolher cor exata"
        />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GerarQRCodeDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [isKioskMode, setIsKioskMode] = useState(false);
  useEffect(() => {
    try {
      const session = sessionStorage.getItem('eai:kioskSession');
      if (session) setIsKioskMode(JSON.parse(session)?.active === true);
    } catch {}
    const handleKiosk = (e: CustomEvent) => setIsKioskMode(e.detail?.active === true);
    window.addEventListener('eai:kioskModeChange', handleKiosk as EventListener);
    return () => window.removeEventListener('eai:kioskModeChange', handleKiosk as EventListener);
  }, []);

  const [stage,       setStage]       = useState<Stage>(data.prefillContent ? 'generating' : 'input');
  const [inputText,   setInputText]   = useState(data.prefillContent ?? '');
  const [qrDataUrl,   setQrDataUrl]   = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [emailSent,   setEmailSent]   = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions]         = useState<QROptions>(DEFAULT_OPTIONS);
  const [customQrColor,  setCustomQrColor]  = useState('#000080');
  const [customBgColor,  setCustomBgColor]  = useState('#ffffff');

  const dictatingRef  = useRef(false);
  const transcriptRef = useRef('');

  // Sinalizar abertura/fechamento
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis.cancel();
    };
  }, []);

  // ── Montar URL do QR ─────────────────────────────────────────────────────────

  const buildQrUrl = useCallback((text: string, opts: QROptions) => {
    const params = new URLSearchParams({
      size:       String(opts.size),
      data:       text,
      color:      opts.color,
      bg:         opts.bgColor,
      company_id: data.companyId,
    });
    if (!opts.showLogo) params.set('no_logo', '1');
    return `/api/qrcode?${params.toString()}`;
  }, [data.companyId]);

  // ── Gerar QR ─────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (text: string, opts: QROptions = options) => {
    const trimmed = text.trim();
    if (!trimmed) {
      playText('Digite ou diga o texto para gerar o QR Code.').catch(() => {});
      return;
    }
    setStage('generating');
    setErrorMsg(null);
    try {
      setQrDataUrl(buildQrUrl(trimmed, opts));
      setStage('result');
      playText('QR Code gerado! Diga "baixar" para salvar ou "email" para enviar.').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar QR Code.');
      setStage('error');
      playText('Erro ao gerar o QR Code. Tente novamente.').catch(() => {});
    }
  }, [options, buildQrUrl, playText]);

  // Quando as opções mudam e já existe um resultado, regenera o preview
  const handleOptionChange = useCallback((newOpts: QROptions) => {
    setOptions(newOpts);
    if (stage === 'result' && inputText.trim()) {
      setQrDataUrl(buildQrUrl(inputText.trim(), newOpts));
    }
  }, [stage, inputText, buildQrUrl]);

  // Auto-gerar com prefill
  useEffect(() => {
    if (data.prefillContent) handleGenerate(data.prefillContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Download ──────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      playText('QR Code baixado.').catch(() => {});
    } catch {
      playText('Erro ao baixar o QR Code.').catch(() => {});
    }
  }, [qrDataUrl, playText]);

  // ── Email ─────────────────────────────────────────────────────────────────────

  const handleSendEmail = useCallback(async () => {
    if (!qrDataUrl || sendingEmail) return;
    setSendingEmail(true);
    setEmailSent(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) throw new Error('Usuário sem email cadastrado.');

      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: data.companyId,
          to: email,
          subject: 'Seu QR Code — minhAi',
          body: `<p>Segue o QR Code gerado por minhAi.</p><p><strong>Conteúdo:</strong> ${inputText}</p><br><img src="${qrDataUrl}" alt="QR Code" width="250" />`,
          attachments: [
            { filename: 'qrcode.png', content: base64, encoding: 'base64', contentType: 'image/png' },
          ],
        },
      });
      if (error) throw new Error(error.message);

      setEmailSent(true);
      playText('QR Code enviado para o seu email.').catch(() => {});
    } catch {
      playText('Não foi possível enviar o email. Tente novamente.').catch(() => {});
    } finally {
      setSendingEmail(false);
    }
  }, [qrDataUrl, sendingEmail, supabase, data.companyId, inputText, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('input');
    setInputText('');
    setQrDataUrl(null);
    setErrorMsg(null);
    setEmailSent(false);
    transcriptRef.current = '';
    dictatingRef.current = false;
    playText('Digite ou diga o novo texto para o QR Code.').catch(() => {});
  }, [playText]);

  // ── Voz ───────────────────────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) { onClose(); return; }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {}); return;
      }

      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) { handleDownload(); return; }
        if (['email', 'enviar email', 'manda email'].some(c => t.includes(c))) { handleSendEmail(); return; }
        if (['novo', 'gerar outro', 'outro qr', 'nova consulta', 'tentar novamente'].some(c => t.includes(c))) { handleReset(); return; }
        // Opções por voz na tela de resultado
        if (t.includes('pequeno'))  { handleOptionChange({ ...options, size: 200 }); return; }
        if (t.includes('medio') || t.includes('médio')) { handleOptionChange({ ...options, size: 300 }); return; }
        if (t.includes('grande'))   { handleOptionChange({ ...options, size: 400 }); return; }
        if (t.includes('sem logo')) { handleOptionChange({ ...options, showLogo: false }); return; }
        if (t.includes('com logo')) { handleOptionChange({ ...options, showLogo: true  }); return; }
        return;
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) { handleReset(); return; }
        return;
      }

      if (stage === 'input') {
        if (['gerar', 'criar qr', 'gerar qr', 'confirmar', 'confirma', 'ok'].some(c => t.includes(c))) {
          if (inputText.trim()) { handleGenerate(inputText); return; }
          playText('Primeiro diga o texto para o QR Code.').catch(() => {}); return;
        }
        if (['limpar', 'apagar', 'limpa'].some(c => t.includes(c))) {
          setInputText(''); transcriptRef.current = '';
          playText('Texto apagado.').catch(() => {}); return;
        }

        const END_TRIGGERS = ['pronto', 'fim', 'acabou', 'terminou', 'concluir'];
        const isEnd = END_TRIGGERS.some(e => t === e || t.endsWith(e));
        if (isEnd) {
          let final = transcriptRef.current;
          END_TRIGGERS.forEach(e => {
            final = final.replace(new RegExp(`\\s*${e}\\s*$`, 'gi'), '');
          });
          final = final.trim();
          transcriptRef.current = final;
          setInputText(final);
          if (final) playText('Texto registrado. Diga "gerar" para criar o QR Code.').catch(() => {});
          return;
        }

        transcriptRef.current = (transcriptRef.current + ' ' + transcript).trim();
        setInputText(transcriptRef.current);
      }
    },
  });

  // ─── Tokens de cor ────────────────────────────────────────────────────────────

  const BG         = isDark ? '#1e293b' : '#ffffff';
  const BORDER     = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb';
  const TEXT       = isDark ? '#f1f5f9' : '#111827';
  const SUB        = isDark ? '#94a3b8' : '#6b7280';
  const INPUT_BG   = isDark ? '#0f172a' : '#f9fafb';
  const INPUT_BORDER = isDark ? '#334155' : '#d1d5db';
  const DIVIDER    = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const OPT_BG     = isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc';

  // ─── Painel de opções ─────────────────────────────────────────────────────────

  const OptionsPanel = (
    <div
      className="flex flex-col gap-4 px-1 pb-1"
      style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: 14, marginTop: 4 }}
    >
      {/* Tamanho */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium" style={{ color: SUB }}>Tamanho</span>
        <div className="flex gap-2">
          {([
            { label: 'P', sublabel: '200px', value: 200 },
            { label: 'M', sublabel: '300px', value: 300 },
            { label: 'G', sublabel: '400px', value: 400 },
          ] as const).map(s => (
            <SizeButton
              key={s.value}
              label={s.label}
              sublabel={s.sublabel}
              value={s.value}
              selected={options.size === s.value}
              isDark={isDark}
              onClick={() => handleOptionChange({ ...options, size: s.value })}
            />
          ))}
        </div>
      </div>

      {/* Cor do QR */}
      <ColorPicker
        label="Cor do QR"
        colors={QR_COLORS}
        selected={options.color}
        customHex={customQrColor}
        isDark={isDark}
        onSelect={v => handleOptionChange({ ...options, color: v })}
        onCustomChange={setCustomQrColor}
      />

      {/* Cor do fundo */}
      <ColorPicker
        label="Cor do fundo"
        colors={BG_COLORS}
        selected={options.bgColor}
        customHex={customBgColor}
        isDark={isDark}
        onSelect={v => handleOptionChange({ ...options, bgColor: v })}
        onCustomChange={setCustomBgColor}
      />

      {/* Logo */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium" style={{ color: SUB }}>Incluir logo</span>
          <span className="text-[11px]" style={{ color: isDark ? '#475569' : '#9ca3af' }}>
            Logo da sua empresa no centro
          </span>
        </div>
        {/* Toggle */}
        <button
          onClick={() => handleOptionChange({ ...options, showLogo: !options.showLogo })}
          className="relative w-10 h-5 rounded-full transition-colors duration-200"
          style={{ background: options.showLogo ? '#2563eb' : (isDark ? '#334155' : '#d1d5db') }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
            style={{ left: options.showLogo ? '22px' : '2px' }}
          />
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-0"
        style={{
          background: BG,
          border: BORDER,
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <IconQr className="w-5 h-5" style={{ color: '#3b82f6' }} />
            <h2 className="text-lg font-bold" style={{ color: TEXT }}>Gerar QR Code</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: SUB }}>
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stage: input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: SUB }}>
              Digite ou dite o texto, URL ou qualquer conteúdo para gerar o QR Code.
            </p>

            <textarea
              className="w-full rounded-xl px-3 py-3 text-sm resize-none outline-none transition-colors"
              style={{
                background: INPUT_BG,
                border: `1px solid ${INPUT_BORDER}`,
                color: TEXT,
                minHeight: 90,
              }}
              placeholder="Ex: https://meusite.com.br"
              value={inputText}
              onChange={e => { setInputText(e.target.value); transcriptRef.current = e.target.value; }}
            />

            {/* Botão de opções colapsável */}
            <button
              onClick={() => setShowOptions(v => !v)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-colors"
              style={{
                background: OPT_BG,
                border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                color: SUB,
              }}
            >
              <div className="flex items-center gap-2">
                <IconSettings className="w-4 h-4" />
                <span>Opções avançadas</span>
                {/* Badges das opções ativas */}
                <div className="flex gap-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: isDark ? '#1e3a5f' : '#dbeafe', color: isDark ? '#60a5fa' : '#1d4ed8' }}
                  >
                    {options.size}px
                  </span>
                  <span
                    className="w-4 h-4 rounded border"
                    style={{ background: options.color, borderColor: isDark ? '#475569' : '#d1d5db', display: 'inline-block' }}
                  />
                </div>
              </div>
              {showOptions
                ? <IconChevronUp className="w-4 h-4" />
                : <IconChevronDown className="w-4 h-4" />
              }
            </button>

            {showOptions && OptionsPanel}

            <button
              onClick={() => handleGenerate(inputText)}
              disabled={!inputText.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: inputText.trim() ? '#2563eb' : (isDark ? '#1e3a5f' : '#bfdbfe'),
                color: inputText.trim() ? '#ffffff' : (isDark ? '#60a5fa' : '#3b82f6'),
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <IconQr className="w-4 h-4" />
              Gerar QR Code
            </button>

            <VoiceHint commands={['"gerar"', '"limpar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Stage: generating ── */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: SUB }}>Gerando QR Code...</p>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && qrDataUrl && (
          <div className="flex flex-col items-center gap-4">
            {/* Preview com fundo checkerboard quando bg é branco, pra mostrar bem */}
            <div
              className="p-3 rounded-2xl"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Code gerado"
                width={220}
                height={220}
                className="rounded-lg"
                key={qrDataUrl} // força re-render ao mudar opções
              />
            </div>

            {inputText && (
              <p className="text-xs text-center truncate max-w-full px-2" style={{ color: SUB }}>
                {inputText.length > 60 ? inputText.slice(0, 60) + '…' : inputText}
              </p>
            )}

            {/* Opções colapsáveis também no resultado — para ajuste rápido */}
            <button
              onClick={() => setShowOptions(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors self-center"
              style={{
                background: OPT_BG,
                border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                color: SUB,
              }}
            >
              <IconSettings className="w-3.5 h-3.5" />
              Ajustar opções
              {showOptions ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
            </button>

            {showOptions && (
              <div className="w-full rounded-xl p-3" style={{ background: OPT_BG, border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}` }}>
                {OptionsPanel}
              </div>
            )}

            {!isKioskMode && (
              <>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: '#2563eb', color: '#ffffff' }}
                  >
                    <IconDownload className="w-4 h-4" />
                    Baixar PNG
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || emailSent}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: emailSent
                        ? (isDark ? '#166534' : '#dcfce7')
                        : (isDark ? '#1e3a5f' : '#eff6ff'),
                      color: emailSent
                        ? (isDark ? '#86efac' : '#166534')
                        : (isDark ? '#60a5fa' : '#2563eb'),
                      cursor: sendingEmail || emailSent ? 'default' : 'pointer',
                      opacity: sendingEmail ? 0.7 : 1,
                    }}
                  >
                    {sendingEmail
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <IconMail className="w-4 h-4" />}
                    {emailSent ? 'Enviado!' : 'Enviar email'}
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ color: SUB, background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                >
                  <IconRefresh className="w-3.5 h-3.5" />
                  Gerar novo QR Code
                </button>

                <VoiceHint
                  commands={['"baixar"', '"email"', '"pequeno"', '"grande"', '"sem logo"', '"novo"', '"fechar"']}
                  isDark={isDark}
                />
              </>
            )}
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div
              className="px-3 py-3 rounded-xl text-sm"
              style={{
                background: isDark ? 'rgba(127,29,29,0.3)' : '#fef2f2',
                border: `1px solid ${isDark ? '#b91c1c' : '#fecaca'}`,
                color: isDark ? '#fca5a5' : '#dc2626',
              }}
            >
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#2563eb', color: '#ffffff' }}
            >
              <IconRefresh className="w-4 h-4" />
              Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
