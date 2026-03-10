'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Upload, Smartphone, QrCode, RefreshCw, Timer,
  CheckCircle, FileText, Image as ImageIcon, Mic,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'waiting_celular' | 'uploading_local' | 'success' | 'error';
type Tab   = 'celular' | 'local';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPENING_TEXT  = 'Envie um arquivo para o assistente. Diga "celular" para enviar pelo celular ou "arquivo" para selecionar um arquivo local.';
const EXPIRY_SECONDS = 600;
const AUTO_CLOSE_MS  = 3000;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_TYPES = 'image/*,application/pdf,text/plain,text/csv,.docx,.xlsx,.doc,.xls';

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

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EnviarArquivoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage,        setStage]        = useState<Stage>('idle');
  const [activeTab,    setActiveTab]    = useState<Tab>('celular');
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [timeLeft,     setTimeLeft]     = useState(EXPIRY_SECONDS);
  const [qrCodeUrl,    setQrCodeUrl]    = useState<string | null>(null);
  const [uploadUrl,    setUploadUrl]    = useState<string | null>(null);
  const [token,        setToken]        = useState<string | null>(null);
  const [receivedFile, setReceivedFile] = useState<{ name: string; type: string; size: number } | null>(null);

  const fileInputRef        = useRef<HTMLInputElement>(null);
  const channelRef          = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef           = useRef<Stage>('idle');
  const lastTabCommandRef   = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { statusRef.current = stage; }, [stage]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanupRealtime = useCallback(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (timerRef.current)   { clearTimeout(timerRef.current);   timerRef.current   = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (pollRef.current)    { clearInterval(pollRef.current);   pollRef.current    = null; }
  }, [supabase]);

  useEffect(() => {
    return () => {
      cleanupRealtime();
      if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    };
  }, [cleanupRealtime]);

  // ── Recebimento via celular ───────────────────────────────────────────────

  const handleFileReceived = useCallback((row: { file_name?: string; file_type?: string; file_size?: number }) => {
    cleanupRealtime();
    setReceivedFile({
      name: row.file_name ?? 'arquivo',
      type: row.file_type ?? 'application/octet-stream',
      size: row.file_size ?? 0,
    });
    setStage('success');
    playText('Arquivo recebido com sucesso!').catch(() => {});
    setTimeout(onClose, AUTO_CLOSE_MS);
  }, [cleanupRealtime, onClose, playText]);

  // ── Iniciar fluxo celular ─────────────────────────────────────────────────

  const startCelular = useCallback(async () => {
    setStage('idle');
    setQrCodeUrl(null);
    setErrorMsg(null);

    try {
      const expiresAt = new Date(Date.now() + EXPIRY_SECONDS * 1000).toISOString();

      const { data: row, error: dbError } = await supabase
        .from('companion_uploads')
        .insert({ company_id: data.companyId, expires_at: expiresAt })
        .select('token')
        .single();

      if (dbError || !row) throw new Error('Erro ao gerar QR Code.');

      const newToken = row.token as string;
      const url = `${window.location.origin}/arquivos?token=${newToken}`;

      const QRCode = (await import('qrcode')).default;
      const qr = await QRCode.toDataURL(url, {
        width: 200, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      setToken(newToken);
      setUploadUrl(url);
      setQrCodeUrl(qr);
      setStage('waiting_celular');
      setTimeLeft(EXPIRY_SECONDS);

      // Contagem regressiva
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { cleanupRealtime(); setStage('idle'); return 0; }
          return prev - 1;
        });
      }, 1000);

      // Timeout total
      timerRef.current = setTimeout(() => {
        if (statusRef.current === 'waiting_celular') { cleanupRealtime(); setStage('idle'); }
      }, EXPIRY_SECONDS * 1000);

      // Realtime
      const channel = supabase
        .channel(`enviar-arquivo-${newToken}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public',
          table: 'companion_uploads',
          filter: `token=eq.${newToken}`,
        }, async (payload) => {
          const updated = payload.new as { status: string; file_name?: string; file_type?: string; file_size?: number };
          if (updated.status === 'uploaded') {
            handleFileReceived(updated);
          }
        })
        .subscribe();
      channelRef.current = channel;

      // Polling fallback
      pollRef.current = setInterval(async () => {
        if (statusRef.current !== 'waiting_celular') { clearInterval(pollRef.current!); return; }
        const { data: pollRow } = await supabase
          .from('companion_uploads')
          .select('status, file_name, file_type, file_size')
          .eq('token', newToken)
          .single();
        if (pollRow?.status === 'uploaded') {
          clearInterval(pollRef.current!);
          handleFileReceived(pollRow);
        }
      }, 5000);

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao iniciar.');
      setStage('error');
    }
  }, [data.companyId, supabase, cleanupRealtime, handleFileReceived]);

  // Iniciar aba celular ao montar
  useEffect(() => {
    startCelular();
    playText(OPENING_TEXT).catch(() => {});
  }, []); // eslint-disable-line

  // ── Upload local ─────────────────────────────────────────────────────────

  const handleLocalFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg('Arquivo muito grande. Máximo 10MB.');
      setStage('error');
      return;
    }

    setStage('uploading_local');
    setErrorMsg(null);

    try {
      // 1. Criar registro no banco
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: row, error: dbError } = await supabase
        .from('companion_uploads')
        .insert({ company_id: data.companyId, expires_at: expiresAt })
        .select('token')
        .single();

      if (dbError || !row) throw new Error('Erro ao registrar arquivo.');

      const newToken = row.token as string;
      const ext = file.name.split('.').pop() ?? 'bin';
      const storagePath = `${newToken}/${Date.now()}.${ext}`;

      // 2. Upload para Storage
      const { error: uploadError } = await supabase
        .storage
        .from('companion-uploads')
        .upload(storagePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

      // 3. Atualizar status
      const { error: updateError } = await supabase
        .from('companion_uploads')
        .update({
          status: 'uploaded',
          storage_path: storagePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .eq('token', newToken);

      if (updateError) throw new Error('Erro ao confirmar upload.');

      setReceivedFile({ name: file.name, type: file.type, size: file.size });
      setStage('success');
      playText('Arquivo enviado com sucesso!').catch(() => {});
      setTimeout(onClose, AUTO_CLOSE_MS);

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao enviar arquivo.');
      setStage('error');
    }
  }, [data.companyId, supabase, onClose, playText]);

  // ── Troca de aba ─────────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'celular') {
      startCelular();
    } else {
      cleanupRealtime();
      setStage('idle');
    }
  }, [activeTab, startCelular, cleanupRealtime]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    cleanupRealtime();
    setStage('idle');
    setQrCodeUrl(null);
    setErrorMsg(null);
    setReceivedFile(null);
    setTimeLeft(EXPIRY_SECONDS);
    if (activeTab === 'celular') startCelular();
    playText(OPENING_TEXT).catch(() => {});
  }, [cleanupRealtime, activeTab, startCelular, playText]);

  // ── Voz ───────────────────────────────────────────────────────────────────

  const formatCountdown = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {}); return;
      }

      const TAB_MAP: Record<string, Tab> = {
        celular: 'celular', qrcode: 'celular', 'qr code': 'celular',
        arquivo: 'local', upload: 'local', local: 'local', computador: 'local',
      };
      const TAB_FEEDBACK: Record<Tab, string> = {
        celular: 'Aponte o celular para o QR Code.',
        local:   'Selecione um arquivo no computador.',
      };

      for (const [trigger, tab] of Object.entries(TAB_MAP)) {
        if (t.includes(trigger)) {
          if (lastTabCommandRef.current === tab) return;
          lastTabCommandRef.current = tab;
          handleTabChange(tab);
          playText(TAB_FEEDBACK[tab]).catch(() => {});
          if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
          tabCommandTimeoutRef.current = setTimeout(() => { lastTabCommandRef.current = null; }, 4000);
          return;
        }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
      active
        ? 'bg-indigo-600 text-white'
        : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Enviar Arquivo</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Success ── */}
        {stage === 'success' && receivedFile && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className={`w-14 h-14 flex items-center justify-center rounded-full ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <CheckCircle className={`w-7 h-7 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <p className={`text-base font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>Arquivo recebido!</p>
            <div className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl ${isDark ? 'bg-slate-700/60' : 'bg-gray-50 border border-gray-200'}`}>
              <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{fileIcon(receivedFile.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{receivedFile.name}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{formatSize(receivedFile.size)}</p>
              </div>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Fechando automaticamente...</p>
          </div>
        )}

        {/* ── Uploading local ── */}
        {stage === 'uploading_local' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Enviando arquivo...</p>
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
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Idle / Waiting ── */}
        {(stage === 'idle' || stage === 'waiting_celular') && (
          <div className="flex flex-col gap-4">

            {/* Abas */}
            <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <button onClick={() => handleTabChange('celular')} className={tabClass(activeTab === 'celular')}>
                <QrCode className="w-3.5 h-3.5" />Celular
              </button>
              <button onClick={() => handleTabChange('local')} className={tabClass(activeTab === 'local')}>
                <Upload className="w-3.5 h-3.5" />Upload Local
              </button>
            </div>

            {/* ── Aba Celular ── */}
            {activeTab === 'celular' && (
              <div className={`flex flex-col items-center gap-3 p-4 rounded-xl min-h-[220px] justify-center ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                {stage === 'idle' && (
                  <>
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Gerando QR Code...</p>
                  </>
                )}
                {stage === 'waiting_celular' && qrCodeUrl && (
                  <>
                    <div className={`p-2 rounded-2xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="QR Code para envio de arquivo" width={180} height={180} className="rounded-lg" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      <Timer className="w-3.5 h-3.5 shrink-0" />
                      <span>Expira em {formatCountdown(timeLeft)}</span>
                    </div>
                    <div className={`w-full h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(timeLeft / EXPIRY_SECONDS) * 100}%` }}
                      />
                    </div>
                    <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      Escaneie o QR Code com o celular e envie o arquivo
                    </p>
                    <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      Imagens, PDF, TXT, CSV, DOC, XLS — até 10MB
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Aba Upload Local ── */}
            {activeTab === 'local' && (
              <div
                className={`flex flex-col items-center gap-3 p-6 rounded-xl min-h-[220px] justify-center border-2 border-dashed cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-900/50 border-slate-600 hover:border-indigo-500' : 'bg-gray-50 border-gray-300 hover:border-indigo-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleLocalFile(file);
                }}
              >
                <Upload className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Arraste ou clique para selecionar
                </p>
                <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Imagens, PDF, TXT, CSV, DOC, XLS — até 10MB
                </p>
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
                >
                  Selecionar arquivo
                </button>
              </div>
            )}

            <VoiceHint
              commands={['"celular"', '"arquivo"', '"fechar"']}
              isDark={isDark}
            />
          </div>
        )}

        {/* Input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleLocalFile(file);
            e.target.value = '';
          }}
        />

      </div>
    </div>,
    document.body
  );
}
