'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Variant = 'inline' | 'persistent';

type Props = {
  messageId?: string;
  messageText?: string;
  variant?: Variant;
  label?: string;
};

const REASONS = [
  { key: 'ofensivo', label: 'Offensive or harmful / Ofensivo ou prejudicial' },
  { key: 'incorreto', label: 'Incorrect or misleading / Incorreto ou enganoso' },
  { key: 'inapropriado', label: 'Inappropriate content / Conteúdo inapropriado' },
  { key: 'spam', label: 'Spam or repetitive / Spam ou conteúdo repetitivo' },
  { key: 'outro', label: 'Other / Outro motivo' },
] as const;

function lastAIOutput(fallback?: string) {
  if (fallback?.trim()) return fallback.trim();

  try {
    const stored = sessionStorage.getItem('conviteia:last-ai-output');
    if (stored?.trim()) return stored.trim();
  } catch {
    // sessionStorage pode estar indisponível em contextos restritos.
  }

  return 'ConviteIA AI-generated invitation content or suggestion reported from the in-product reporting control.';
}

export default function ReportAIContent({
  messageId = 'conviteia-ai-content',
  messageText,
  variant = 'inline',
  label,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting]);

  function startReport() {
    setSubmitted(false);
    setError('');
    setOpen(true);
  }

  async function submit(reason: string) {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/conviteria/report-ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId,
          messageText: lastAIOutput(messageText).slice(0, 8000),
          reason,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro || 'Não foi possível enviar a denúncia.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a denúncia.');
    } finally {
      setSubmitting(false);
    }
  }

  const inline = variant === 'inline';
  const buttonLabel = label ?? (inline ? 'Denunciar / Report' : 'Report AI content / Denunciar conteúdo de IA');

  return (
    <>
      <button
        type="button"
        onClick={startReport}
        className={inline
          ? 'inline-flex items-center gap-1 text-[10px] opacity-30 transition-opacity hover:opacity-70'
          : 'inline-flex items-center gap-1.5 rounded-full border border-[#e8c6d6] bg-[#fffafb] px-3 py-1.5 text-[11px] font-semibold text-[#a04a63] transition hover:bg-[#fdf0f3]'}
        style={inline ? { color: '#7c5560' } : undefined}
        title="Report AI content / Denunciar conteúdo de IA"
        aria-label="Report AI content / Denunciar conteúdo de IA"
      >
        <Flag size={inline ? 10 : 12} />
        {buttonLabel}
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-2xl border border-[#e8c6d6] bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conviteia-report-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="conviteia-report-title" className="text-base font-bold text-[#40232c]">
                  Report AI content / Denunciar conteúdo de IA
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#7c5560]">
                  Reports are sent to BigCorps for review and appropriate action. / As denúncias são enviadas à BigCorps para análise e providências adequadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#7c5560] hover:bg-[#fff5f8]"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                <strong>Report submitted / Denúncia enviada</strong>
                <p className="mt-1">
                  Thank you. The report was sent to BigCorps for review and appropriate action. / Obrigado. A denúncia foi enviada à BigCorps para análise e providências adequadas.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold"
                >
                  Close / Fechar
                </button>
              </div>
            ) : (
              <>
                <p className="mt-5 text-sm font-medium text-[#40232c]">
                  Why are you reporting this content? / Por que você está denunciando este conteúdo?
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.key}
                      type="button"
                      disabled={submitting}
                      onClick={() => void submit(reason.key)}
                      className="flex items-center justify-between rounded-xl border border-[#ead7df] bg-white px-4 py-3 text-left text-sm text-[#40232c] transition hover:bg-[#fff5f8] disabled:cursor-wait disabled:opacity-60"
                    >
                      <span>{reason.label}</span>
                      {submitting && <Loader2 size={14} className="ml-3 shrink-0 animate-spin" />}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
