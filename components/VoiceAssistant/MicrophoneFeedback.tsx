'use client';

import { Mic, MicOff } from 'lucide-react';

interface MicrophoneFeedbackProps {
  isListening: boolean;
  isProcessing: boolean;
  isWakeWordDetected: boolean;
  volume?: number;
  theme?: 'dark' | 'light';
}

export function MicrophoneFeedback({
  isListening,
  isProcessing,
  isWakeWordDetected,
  volume = 0,
  theme = 'dark',
}: MicrophoneFeedbackProps) {
  const isDark = theme === 'dark';

  let bgColor = isDark ? 'bg-slate-700' : 'bg-gray-300';
  let iconColor = isDark ? 'text-slate-300' : 'text-gray-600';
  let glowColor = 'rgba(100, 100, 100, 0.3)';
  let pulseAnimation = '';

  if (isWakeWordDetected) {
    bgColor = 'bg-purple-600';
    iconColor = 'text-white';
    glowColor = 'rgba(147, 51, 234, 0.5)';
    pulseAnimation = 'animate-pulse';
  } else if (isProcessing) {
    bgColor = 'bg-emerald-600';
    iconColor = 'text-white';
    glowColor = 'rgba(16, 185, 129, 0.5)';
    pulseAnimation = 'animate-pulse';
  } else if (isListening) {
    bgColor = 'bg-blue-600';
    iconColor = 'text-white';
    glowColor = 'rgba(59, 130, 246, 0.5)';
    pulseAnimation = 'animate-pulse';
  }

  const volumeScale = Math.min(1, 0.8 + volume * 0.4);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`absolute w-16 h-16 rounded-full blur-lg transition-all duration-300 ${
          isWakeWordDetected || isProcessing || isListening ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundColor: glowColor,
          transform: `scale(${volumeScale})`,
        }}
      />

      <div
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${bgColor} ${pulseAnimation} shadow-lg`}
        style={{
          transform: `scale(${0.9 + volumeScale * 0.1})`,
        }}
      >
        {isListening || isProcessing || isWakeWordDetected ? (
          <Mic className={`w-6 h-6 ${iconColor}`} />
        ) : (
          <MicOff className={`w-6 h-6 ${iconColor}`} />
        )}
      </div>

      <div className="text-center">
        {isWakeWordDetected && (
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            Pronto para ouvir
          </p>
        )}
        {isProcessing && !isWakeWordDetected && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Processando...
          </p>
        )}
        {isListening && !isWakeWordDetected && !isProcessing && (
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Escutando...
          </p>
        )}
      </div>
    </div>
  );
}
