'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

type PageStatus = 'validating' | 'pending' | 'downloading' | 'downloaded' | 'expired' | 'error';

interface DownloadData {
  fileName: string;
  fileType: string;
  fileBase64: string;
  companyName: string;
  expiresAt: string;
  status: string;
}

function formatTimeLeft(expiresAt: string): string {
  const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Componente extraído — aceita token como prop ───────────────
// Reutilizado por /download/[token]/page.tsx e /link/[slug]/page.tsx
export function DownloadContent({ token }: { token: string }) {
  const [status, setStatus] = useState<PageStatus>('validating');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DownloadData | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function validateToken() {
      const { data: row, error: dbError } = await supabase
        .from('companion_downloads')
        .select('file_name, file_type, file_base64, status, expires_at, company_id, companies(name)')
        .eq('token', token)
        .single();

      if (dbError || !row) {
        setError('QR Code inválido ou não encontrado.');
        setStatus('error');
        return;
      }

      if (row.status === 'expired' || new Date(row.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      setData({
        fileName: row.file_name,
        fileType: row.file_type,
        fileBase64: row.file_base64,
        companyName: (row.companies as any)?.name ?? 'eAi',
        expiresAt: row.expires_at,
        status: row.status,
      });

      setTimeDisplay(formatTimeLeft(row.expires_at));
      setStatus(row.status === 'downloaded' ? 'downloaded' : 'pending');
    }

    validateToken();
  }, [token]); // eslint-disable-line

  // Countdown visual
  useEffect(() => {
    if (status !== 'pending' || !data) return;

    timerRef.current = setInterval(() => {
      setTimeDisplay(formatTimeLeft(data.expiresAt));
      if (new Date(data.expiresAt) < new Date()) {
        clearInterval(timerRef.current!);
        setStatus('expired');
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, data]);

  const handleDownload = async () => {
    if (!data) return;
    setStatus('downloading');

    try {
      const byteString = atob(data.fileBase64);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: data.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await supabase
        .from('companion_downloads')
        .update({ status: 'downloaded' })
        .eq('token', token);

      setStatus('downloaded');
    } catch (err: any) {
      setError('Erro ao baixar arquivo: ' + (err.message ?? 'Erro desconhecido.'));
      setStatus('error');
    }
  };

  if (status === 'validating') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Verificando QR Code...</p>
      </div>
    </PageWrapper>
  );

  if (status === 'expired') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">⏱️</div>
        <h2 className="text-xl font-bold text-white">Link expirado</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Este link expirou. O arquivo estava disponível por 10 minutos.
        </p>
        <p className="text-slate-500 text-xs mt-1">Volte ao assistente e gere um novo QR Code.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'downloading') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Baixando arquivo...</p>
        <p className="text-slate-500 text-xs">Aguarde um momento.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'downloaded') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500/20 text-4xl">✅</div>
        <h2 className="text-xl font-bold text-white">Arquivo baixado!</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          {data?.fileName ?? 'Arquivo'} foi salvo no seu dispositivo.
        </p>
        <button
          onClick={handleDownload}
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
        <div className="text-5xl">❌</div>
        <h2 className="text-xl font-bold text-white">Erro</h2>
        <p className="text-red-400 text-sm max-w-xs">{error}</p>
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
      <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-white">
            {data?.companyName || 'eAi - Funcionários de Voz'}
          </h1>
          <p className="text-slate-400 text-sm">Arquivo pronto para download</p>
        </div>

        <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">📄</div>
          <p className="text-white font-semibold text-base break-all">{data?.fileName}</p>
          <p className="text-slate-500 text-xs">{data?.fileType}</p>
          {timeDisplay && (
            <p className="text-amber-400 text-sm font-medium">⏱ Expira em {timeDisplay}</p>
          )}
        </div>

        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-semibold transition-all active:scale-95"
        >
          <span>⬇</span>
          <span>Baixar arquivo</span>
        </button>

        <div className="text-center">
          <p className="text-slate-600 text-xs">Seus dados são processados com segurança.</p>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Wrapper de layout ──────────────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

// ── Page default — token vem do segmento dinâmico da rota ──────
export default function DownloadPage({ params }: { params: { token: string } }) {
  return <DownloadContent token={params.token} />;
}
