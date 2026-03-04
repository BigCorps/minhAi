'use client';

import { useEffect, useState } from 'react';
import { Volume2, AlertCircle, CheckCircle } from 'lucide-react';

interface TranscriptFeedbackCardProps {
  lastTranscript: string;
  lastResponse: string;
  isListening: boolean;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  showCard?: boolean;
}

export function TranscriptFeedbackCard({
  lastTranscript,
  lastResponse,
  isListening,
  isProcessing,
  theme = 'dark',
  showCard = true,
}: TranscriptFeedbackCardProps) {
  const isDark = theme === 'dark';
  const [displayCard, setDisplayCard] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if ((lastTranscript || lastResponse) && showCard) {
      setDisplayCard(true);
      setFadeOut(false);
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setDisplayCard(false), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastTranscript, lastResponse, showCard]);

  if (!displayCard) return null;

  const hasTranscript = lastTranscript && lastTranscript.trim().length > 0;
  const hasResponse = lastResponse && lastResponse.trim().length > 0;

  return (
    <div className={`transition-all duration-300 ${fadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' : 'bg-white/50 border-gray-200 backdrop-blur-sm'}`}>
        <div className="flex items-center gap-2">
          <Volume2 className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Último reconhecimento</p>
        </div>
        {hasTranscript && (
          <div className="space-y-1">
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Você disse:</p>
            <p className={`text-sm font-medium px-3 py-2 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-300 border border-blue-700/30' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>"{lastTranscript}"</p>
          </div>
        )}
        {hasResponse && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Assistente respondeu:</p>
            </div>
            <p className={`text-sm px-3 py-2 rounded-lg line-clamp-2 ${isDark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{lastResponse}</p>
          </div>
        )}
        {hasTranscript && !hasResponse && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Nenhuma função foi ativada. Tente falar a palavra de ativação seguida de um comando.</p>
          </div>
        )}
      </div>
    </div>
  );
}
