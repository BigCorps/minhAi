'use client';

import { useState, useEffect, useRef, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Timer, CheckCircle, XCircle, FileText, Download } from 'lucide-react';

type PageStatus = 'validating' | 'pending' | 'downloading' | 'downloaded' | 'expired' | 'error';

interface DownloadData {
  fileName: string;
  fileType: string;
  fileBase64: string;
  expiresAt: string;
}

function formatTimeLeft(expiresAt: string): string {
  const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function DownloadPageContent({ token }: { token: string }) {
  const [status, setStatus] = useState<PageStatus>('validating');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DownloadData | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('');
  const [autoCountdown, setAutoCountdown] = useState(10);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoDownloaded = useRef(false);

  const supabase = createClient();

  const triggerDownload = async (downloadData: DownloadData, tkn: string) => {
    if (hasAutoDownloaded.current) return;
    hasAutoDownloaded.current = true;

    setStatus('downloading');

    try {
      const byteString = atob(downloadData.fileBase64);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: downloadData.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadData.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await supabase
        .from('companion_downloads')
        .update({ status: 'downloaded' })
        .eq('token', tkn);

      setStatus('downloaded');
    } catch (err: any) {
      hasAutoDownloaded.current = false;
      setError('Erro ao baixar arquivo: ' + (err.message ?? 'Erro desconhecido.'));
      setStatus('error');
    }
  };

  useEffect(() => {
    async function validateToken() {
      const { data: row, error: dbError } = await supabase
        .from('companion_downloads')
        .select('file_name, file_type, file_base64, status, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (dbError) {
        setError(`Erro: ${dbError.message} (código: ${dbError.code})`);
        setStatus('error');
        return;
      }

      if (!row) {
        setError('QR Code inválido ou não encontrado.');
        setStatus('error');
        return;
      }

      if (row.status === 'expired' || new Date(row.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      const downloadData: DownloadData = {
        fileName: row.file_name,
        fileType: row.file_type,
        fileBase64: row.file_base64,
        expiresAt: row.expires_at,
      };

      setData(downloadData);
      setTimeDisplay(formatTimeLeft(row.expires_at));
      setStatus(row.status === 'downloaded' ? 'downloaded' : 'pending');
    }

    validateToken();
  }, [token]); // eslint-disable-line

  // Countdown de expiração
  useEffect(() => {
    if (status !== 'pending' || !data) return;

    expiryTimerRef.current = setInterval(() => {
      setTimeDisplay(formatTimeLeft(data.expiresAt));
      if (new Date(data.expiresAt) < new Date()) {
        clearInterval(expiryTimerRef.current!);
        setStatus('expired');
      }
    }, 1000);

    return () => { if (expiryTimerRef.current) clearInterval(expiryTimerRef.current); };
  }, [status, data]);

  // Auto-download em 10 segundos
  useEffect(() => {
    if (status !== 'pending' || !data) return;

    setAutoCountdown(10);

    autoTimerRef.current = setInterval(() => {
      setAutoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(autoTimerRef.current!);
          triggerDownload(data, token);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [status, data]); // eslint-disable-line

  if (status === 'validating') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Verificando link...</p>
      </div>
    </PageWrapper>
  );

  if (status === 'expired') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-500/20">
          <Timer className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Link expirado</h2>
        <p className="text-slate-400 text-sm">Este link expirou. O arquivo estava disponível por 10 minutos.</p>
        <p className="text-slate-500 text-xs mt-1">Volte ao assistente e gere um novo QR Code.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'downloading') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Baixando arquivo...</p>
      </div>
    </PageWrapper>
  );

  if (status === 'downloaded') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Arquivo baixado!</h2>
        <p className="text-slate-400 text-sm">{data?.fileName ?? 'Arquivo'} foi salvo no seu dispositivo.</p>
        <button
          onClick={() => { hasAutoDownloaded.current = false; data && triggerDownload(data, token); }}
          className="mt-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-all active:scale-95 border border-slate-600"
        >
          Baixar novamente
        </button>
        <p className="text-slate-600 text-xs mt-2">Pode fechar esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'error') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500/20">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Erro</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </PageWrapper>
  );

  // status === 'pending'
  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-6 w-full">

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-bold text-white">Arquivo pronto!</h1>
          <p className="text-slate-400 text-sm">O download iniciará automaticamente</p>
        </div>

        {/* Card do arquivo */}
        <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-indigo-500/20">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-white font-semibold text-base break-all">{data?.fileName}</p>
          <p className="text-slate-500 text-xs">{data?.fileType}</p>
          {timeDisplay && (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <Timer className="w-3.5 h-3.5 shrink-0" />
              <span>Link expira em {timeDisplay}</span>
            </div>
          )}
        </div>

        {/* Countdown auto-download */}
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-slate-400 text-sm">
            Baixando em{' '}
            <span className="text-indigo-400 font-bold text-lg">{autoCountdown}s</span>
          </p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
              style={{ width: `${((10 - autoCountdown) / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Botão imediato */}
        <button
          onClick={() => {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current);
            data && triggerDownload(data, token);
          }}
          className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-semibold transition-all active:scale-95"
        >
          <Download className="w-5 h-5" />
          <span>Baixar agora</span>
        </button>

        <p className="text-slate-600 text-xs text-center">Seus dados são processados com segurança.</p>
      </div>
    </PageWrapper>
  );
}

export default function DownloadPage({ params }: { params: { token: string } | Promise<{ token: string }> }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  return <DownloadPageContent token={resolvedParams.token} />;
}
