// lib/groq-intent-classifier.ts
import { getAllFunctions } from '@/lib/functions-registry';
import { registerFunctionUsage } from '@/components/VoiceAssistant/handlers/functionUsage';

interface ClassifierDeps {
  companyId: string;
  functionSettings: Record<string, any>;
  playText: (text: string) => Promise<void>;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (modal: any) => void;
  sessionId: string | null;
  commandProcessor: any;
  activeFunctionContextRef: React.MutableRefObject<any>;
}

// Frases que claramente são conversa geral — pular GROQ e ir direto ao GPT
const CONVERSATION_PATTERNS = [
  'o que mais', 'além disso', 'alem disso', 'e também', 'e tambem',
  'pode também', 'pode tambem', 'consegue fazer', 'o que você faz',
  'o que voce faz', 'quais são', 'quais sao', 'quais funções',
  'quais funcoes', 'me conta', 'me fala', 'como você', 'como voce',
  'você pode', 'voce pode', 'você sabe', 'voce sabe', 'me explica',
  'o que é', 'o que e ', 'como funciona', 'me ajuda com',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
];

export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    const lower = transcript.toLowerCase().trim();

    // Filtro rápido: frases de conversa geral não precisam do GROQ
    if (CONVERSATION_PATTERNS.some(p => lower.includes(p))) {
      console.log('💬 GROQ: conversa geral detectada, pulando classificação');
      return false;
    }

    // Monta lista diretamente do registry — sem queries ao Supabase
    const allFunctions = getAllFunctions();
    const enabledFunctions = allFunctions
      .filter(fn => fn.voiceTriggers?.length)
      .map(fn => ({
        key: fn.functionKey,
        name: fn.name,
        triggers: fn.voiceTriggers!.slice(0, 3),
      }));

    if (!enabledFunctions.length) return false;

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, enabledFunctions }),
    });

    if (!response.ok) return false;

    const { functionKey } = await response.json();
    if (!functionKey) return false;

    console.log(`🤖 GROQ classificou: "${transcript}" → ${functionKey}`);

    // Dispara a função via evento
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey },
    }));

    await registerFunctionUsage(
      deps.companyId,
      functionKey,
      deps.functionSettings[functionKey]?.creditsPerUse ?? 0
    );

    return true;
  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
