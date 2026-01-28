// components/VoiceAssistant/functions/index.ts
import { FunctionHandler, FunctionContext } from './types';

export const functionRegistry: FunctionHandler[] = [
  whatsappQRHandler,
  instagramQRHandler,
  pixGenerateHandler,
  pixConfirmHandler,
  pixCancelHandler,
];

export async function detectAndExecuteFunction(
  transcript: string,
  context: FunctionContext,
  enabledFunctions: string[]
): Promise<boolean> {
  for (const fn of functionRegistry) {
    if (!enabledFunctions.includes(fn.key)) continue;
    
    if (fn.detect(transcript)) {
      console.log(`✅ Função detectada: ${fn.key}`);
      await fn.execute(transcript, context);
      return true;
    }
  }
  
  return false;
}
