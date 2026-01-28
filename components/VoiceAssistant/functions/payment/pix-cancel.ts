// components/VoiceAssistant/functions/[category]/[nome].ts
import { FunctionHandler, FunctionContext } from '../types';

export const nomeFunctionHandler: FunctionHandler = {
  key: 'function_key',
  category: 'contact' | 'payment',
  triggers: ['trigger1', 'trigger2'],
  
  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    return this.triggers.some(t => lower.includes(t));
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    // Lógica da função
  },
  
  demo() {
    return {
      title: 'Nome',
      description: 'Descrição',
      steps: ['1. ...', '2. ...']
    };
  }
};
