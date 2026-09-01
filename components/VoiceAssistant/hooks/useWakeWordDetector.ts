// ============================================================
// hooks/useWakeWordDetector.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useWakeWordDetector.ts
// ============================================================


import { useEffect, useRef } from 'react';
import { WakeWordDetector } from '@/components/VoiceAssistant/WakeWordDetector';
import { generateWakeWordVariations } from '@/lib/wake-word-generator';

const END_COMMANDS = [
  'tchau', 'obrigado', 'até logo', 'encerrar', 'finalizar',
  'pode parar', 'pare', 'desligar', 'adeus', 'valeu',
];

/**
 * Inicializa e reconfigura o WakeWordDetector sempre que a wake word mudar.
 * Gera variações automáticas e inclui fallbacks padrão.
 */
export function useWakeWordDetector(companyWakeWord: string, wakeWordEnabled: boolean = true, threshold: number = 0.75) {
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);

  useEffect(() => {
    if (!companyWakeWord || !wakeWordEnabled) {
      wakeWordDetectorRef.current = null;
      return;
    }

    console.log('🎯 Inicializando WakeWordDetector — wake word:', companyWakeWord);

    const generated = generateWakeWordVariations(companyWakeWord, true, []);

    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: [
        companyWakeWord,
        ...generated.variations.slice(0, 10),
        'gerente',
        'atendente',
        'minhaIA',
        'minhAi',
        'minheiai',
        'assistente',
        'alexa',
      ],
      threshold: threshold,
      contextWindow: 5,
      usePhoneticMatching: true,
      excludeWords: END_COMMANDS,
    });

    console.log('✅ WakeWordDetector inicializado');
  }, [companyWakeWord, threshold]);

  return { wakeWordDetectorRef, endCommands: END_COMMANDS };
}
