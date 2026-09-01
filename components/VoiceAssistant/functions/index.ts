// components/VoiceAssistant/functions/index.ts

import { FunctionHandler, FunctionContext } from './types';

// Imports das funções de contato
import { whatsappQRHandler } from './contact/whatsapp';
import { instagramQRHandler } from './contact/instagram';

// Imports das funções de pagamento
import { pixGenerateHandler } from './payment/pix-generate';
import { pixConfirmHandler } from './payment/pix-confirm';
import { pixCancelHandler } from './payment/pix-cancel';

// ============================================
// FUNCTION REGISTRY
// ============================================

export const functionRegistry: FunctionHandler[] = [
  // Contato
  whatsappQRHandler,
  instagramQRHandler,
  
  // Pagamento
  pixGenerateHandler,
  pixConfirmHandler,
  pixCancelHandler,
];

// ============================================
// DETECT & EXECUTE
// ============================================

export async function detectAndExecuteFunction(
  transcript: string,
  context: FunctionContext,
  enabledFunctions: string[]
): Promise<boolean> {
  console.log('🔍 Detectando função:', transcript);
  console.log('✅ Funções ativas:', enabledFunctions);
  
  for (const fn of functionRegistry) {
    // Verificar se está ativada
    if (!enabledFunctions.includes(fn.key)) {
      console.log(`⏭️ Função ${fn.key} desativada`);
      continue;
    }
    
    // Detectar
    if (fn.detect(transcript)) {
      console.log(`✅ Função detectada: ${fn.key}`);
      
      try {
        await fn.execute(transcript, context);
        return true;
      } catch (error) {
        console.error(`❌ Erro ao executar função ${fn.key}:`, error);
        return false;
      }
    }
  }
  
  console.log('⚠️ Nenhuma função detectada');
  return false;
}

// ============================================
// GET DEMO
// ============================================

export function getFunctionDemo(functionKey: string) {
  const fn = functionRegistry.find(f => f.key === functionKey);
  return fn ? fn.demo() : null;
}

// ============================================
// GET FUNCTION BY KEY
// ============================================

export function getFunctionByKey(functionKey: string): FunctionHandler | null {
  return functionRegistry.find(f => f.key === functionKey) || null;
}

// ============================================
// LIST ALL FUNCTIONS
// ============================================

export function listAllFunctions(): FunctionHandler[] {
  return functionRegistry;
}
