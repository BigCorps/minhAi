'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Volume2, Download, Play, Mic, Copy, Loader2, AlertCircle } from 'lucide-react';

const MAX_CHARS = 10000;
const CHARS_PER_CREDIT = 500;

function calcCredits(text: string) {
  return Math.ceil(Math.max(1, text.trim().length) / CHARS_PER_CREDIT);
}

interface Props {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function TextoEmAudioDisplay({ data, onClose, theme = 'dark' }: Props) {
  const { companyId } = data;
  const isDark = theme === 'dark';

  const [text, setText] = useState('');
  const [voice, setVoice] = useState<'feminina' | 'masculina'>('feminina');
  const [loading, setLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) textareaRef.current?.focus(); }, [mounted]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const credits = text.trim().length > 0 ? calcCredits(text) : 0;
  const charsLeft = MAX_CHARS - text.length;
  const overLimit = text.length > MAX_CHARS;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  async function handleGenerate() {
    if (!text.trim() || overLimit || loading) return;
    setLoading(true);
    setError('');
    setAudioBase64(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/texto-em-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, text, voice }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Erro ao gerar áudio');
      setAudioBase64(result.audio_base64);
      showToast('✅ Áudio gerado com sucesso!', 'success');
    } catch (e: any) {
      setError(e.message);
      showToast(e.message || 'Erro ao gerar áudio', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/mpeg;base64,${audioBase64}`;
    link.download = `audio-minhai-${Date.now()}.mp3`;
    link.click();
  }

  function handlePlayPreview() {
    if (!audioBase64) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audioRef.current = audio;
    audio.play();
  }

  function handleCopyText() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('✅ Texto copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setAudioBase64(null);
    setError('');
    setText('');
    textareaRef.current?.focus();
  }

  if (!mounted) return null;

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const surfaceBg = isDark ? 'bg-slate-800' : 'bg-gray-100';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
            animate-in slide-in-from-top duration-300`}>
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'success' && <Check className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'error' && <X className="w-5 h-5 text-white flex-shrink-0" />}
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-purple-950/40' : 'bg-purple-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Texto em Áudio</h2>
                <p className={`text-sm ${textMuted}`}>Google TTS Neural — pt-BR</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">

          {audioBase64 ? (
            /* ── Resultado ── */
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  ✅ Áudio gerado com sucesso!
                </p>
                <p className={`text-xs mt-1 ${textMuted}`}>
                  Voz <strong className={textPrimary}>{voice}</strong> · {text.trim().length} caracteres · {credits} crédito{credits > 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handlePlayPreview}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition
                    ${isDark ? 'border-purple-600 text-purple-400 hover:bg-purple-900/30' : 'border-purple-500 text-purple-600 hover:bg-purple-50'}`}
                >
                  <Play className="w-4 h-4" />
                  Ouvir prévia
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  Baixar MP3
                </button>
              </div>

              <button
                onClick={handleReset}
                className={`w-full px-4 py-2 rounded-lg border ${border} ${textMuted} text-sm font-medium hover:opacity-80 transition`}
              >
                Gerar outro áudio
              </button>
            </div>
          ) : (
            /* ── Formulário ── */
            <>
              {/* Seletor de voz */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>Voz</p>
                <div className="flex gap-2">
                  {(['feminina', 'masculina'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVoice(v)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition
                        ${voice === v
                          ? isDark ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-purple-500 bg-purple-50 text-purple-700'
                          : `${border} ${surfaceBg} ${textMuted}`}`}
                    >
                      <Mic className="w-4 h-4" />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Texto</p>
                  <div className="flex items-center gap-2">
                    {text.trim().length > 0 && (
                      <button
                        onClick={handleCopyText}
                        title="Copiar texto"
                        className={`p-1 rounded transition ${copied ? 'text-green-500' : textMuted}`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <span className={`text-xs ${overLimit ? 'text-red-500' : charsLeft < 1000 ? 'text-amber-400' : textMuted}`}>
                      {overLimit ? `−${Math.abs(charsLeft)}` : charsLeft.toLocaleString('pt-BR')} restantes
                    </span>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cole ou digite o texto que deseja transformar em áudio..."
                  rows={7}
                  className={`w-full px-4 py-3 rounded-lg border text-sm resize-vertical outline-none transition
                    ${surfaceBg} ${textPrimary}
                    ${overLimit ? 'border-red-500 focus:ring-red-500' : text.length > 0 ? 'border-purple-500 focus:ring-purple-500' : `${border} focus:ring-purple-500`}
                    focus:ring-2 focus:border-transparent`}
                />
              </div>

              {/* Info créditos */}
              {text.trim().length > 0 && !overLimit && (
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border
                  ${isDark ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                  <span className={`text-sm ${textMuted}`}>{text.trim().length.toLocaleString('pt-BR')} caracteres</span>
                  <span className={`text-sm font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    {credits} crédito{credits > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {text.trim().length > 0 && (
                <p className={`text-xs ${textMuted}`}>💡 1 crédito a cada 500 caracteres · máx. 10.000 por geração</p>
              )}

              {/* Erro */}
              {error && (
                <div className={`px-4 py-3 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} text-sm`}>
                  {error}
                </div>
              )}

              {/* Botão gerar */}
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || overLimit || loading}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Gerando áudio...</>
                ) : (
                  <>🔵 Gerar Áudio{credits > 0 ? ` — ${credits} crédito${credits > 1 ? 's' : ''}` : ''}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
