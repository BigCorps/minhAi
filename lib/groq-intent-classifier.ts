// lib/groq-intent-classifier.ts
import { getAllFunctions } from '@/lib/functions-registry';
import { checkIfFunctionIsEnabled, registerFunctionUsage } from '@/components/VoiceAssistant/handlers/functionUsage';

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

export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    const allFunctions = getAllFunctions();

    // Monta lista das funções habilitadas para esta empresa
    const enabledFunctions: { key: string; name: string; triggers: string[] }[] = [];
    for (const fn of allFunctions) {
      const enabled = await checkIfFunctionIsEnabled(deps.companyId, fn.functionKey);
      if (enabled && fn.voiceTriggers?.length) {
        enabledFunctions.push({
          key: fn.functionKey,
          name: fn.name,
          triggers: fn.voiceTriggers.slice(0, 5),
        });
      }
    }

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

    // Dispara a função via evento (o VoiceAssistantWithWakeWord já sabe tratar)
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