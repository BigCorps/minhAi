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
export function useWakeWordDetector(companyWakeWord: string) {
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);

  useEffect(() => {
    if (!companyWakeWord) return;

    console.log('🎯 Inicializando WakeWordDetector — wake word:', companyWakeWord);

    const generated = generateWakeWordVariations(companyWakeWord, true, []);

    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: [
        companyWakeWord,
        ...generated.variations.slice(0, 10),
        'gerente',
        'atendente',
        'minha IA',
        'minhAi',
        'minheiai',
        'assistente',
        'alexa',
        'oi',
        'olá',
      ],
      threshold: 0.7,
      contextWindow: 5,
      usePhoneticMatching: true,
      excludeWords: END_COMMANDS,
    });

    console.log('✅ WakeWordDetector inicializado');
  }, [companyWakeWord]);

  return { wakeWordDetectorRef, endCommands: END_COMMANDS };
}
