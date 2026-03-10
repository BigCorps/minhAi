'use client';

import { useCompanionDownload } from '@/components/VoiceAssistant/hooks/useCompanionDownload';

interface ResultDownloadQRProps {
  companyId: string;
  fileName: string;
  fileType: string;
  fileBase64: string;
  isDark: boolean;
  enabled: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ResultDownloadQR({
  companyId,
  fileName,
  fileType,
  fileBase64,
  isDark,
  enabled,
}: ResultDownloadQRProps) {
  const { status, qrCodeUrl, timeLeft, reset } = useCompanionDownload({
    companyId,
    fileName,
    fileType,
    fileBase64,
    enabled,
  });

  const progressPercent = Math.round((timeLeft / 600) * 100);

  // ── Estado: gerando ──────────────────────────────────────────
  if (status === 'idle' || status === 'generating') {
    return (
      <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
        <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          📱 Baixar no celular
        </p>
        <div className={`w-[140px] h-[140px] rounded-xl flex items-center justify-center ${
          isDark ? 'bg-slate-700' : 'bg-slate-200'
        }`}>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Gerando QR Code...
        </p>
      </div>
    );
  }

  // ── Estado: expirado ─────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
        <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          📱 Baixar no celular
        </p>
        <div className="text-3xl">⏱️</div>
        <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Link expirado
        </p>
        <button
          onClick={reset}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all active:scale-95"
        >
          Gerar novo link
        </button>
      </div>
    );
  }

  // ── Estado: baixado ──────────────────────────────────────────
  if (status === 'downloaded') {
    return (
      <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
        <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          📱 Baixar no celular
        </p>
        <div className="w-14 h-14 flex items-center justify-center rounded-full bg-green-500/20 text-3xl">
          ✅
        </div>
        <p className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
          Baixado no celular!
        </p>
        <button
          onClick={reset}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
        >
          Gerar novo link
        </button>
      </div>
    );
  }

  // ── Estado: erro ─────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 ${
        isDark ? 'bg-slate-800 border-red-900/50' : 'bg-red-50 border-red-200'
      }`}>
        <p className="text-xs font-semibold text-red-400">Erro ao gerar QR</p>
        <button
          onClick={reset}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── Estado: ready (QR visível) ───────────────────────────────
  return (
    <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
    }`}>
      {/* Título */}
      <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        📱 Baixar no celular
      </p>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <img
            src={qrCodeUrl}
            alt="QR Code para download"
            width={140}
            height={140}
            className="rounded-lg"
          />
        </div>
      )}

      {/* Countdown */}
      <p className={`text-xs font-medium ${
        timeLeft < 60 ? 'text-red-400' : isDark ? 'text-amber-400' : 'text-amber-600'
      }`}>
        ⏱ Expira em {formatTime(timeLeft)}
      </p>

      {/* Barra de progresso */}
      <div className={`w-full h-1.5 rounded-full overflow-hidden ${
        isDark ? 'bg-slate-700' : 'bg-slate-200'
      }`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft < 60 ? 'bg-red-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Instrução */}
      <p className={`text-xs text-center leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Escaneie para baixar<br />o arquivo no celular
      </p>
    </div>
  );
}
