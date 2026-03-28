import { createClient } from '@/lib/supabase-browser';
import { getAllFunctions } from '@/lib/functions-registry';

interface ClassifierDeps {
  companyId: string;
  playText: (text: string) => Promise<void>;
  groqContextRef: React.MutableRefObject<string>;
  commandProcessor: any;
}

// Frases que claramente são conversa geral — pular GROQ
const GENERAL_CONVERSATION = [
  'tudo bem', 'tudo certo', 'obrigado', 'obrigada', 'valeu', 'tchau',
  'boa tarde', 'bom dia', 'boa noite',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
];

function isGeneralConversation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower === p.trim());
}

export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    // Conversa trivial → GPT direto
    if (isGeneralConversation(transcript)) {
      console.log('💬 GROQ pulado: conversa trivial');
      return false;
    }

    const functionsContext = deps.groqContextRef.current;

    // Contexto ainda não carregado → GPT
    if (!functionsContext) {
      console.log('⚠️ GROQ: contexto ainda não carregado');
      return false;
    }

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, functionsContext }),
    });

    if (!response.ok) return false;

    const { response: groqResponse } = await response.json();

    if (!groqResponse) {
      console.log('💬 GROQ: conversa geral → GPT');
      return false;
    }

    console.log(`🤖 GROQ responde: "${groqResponse}"`);

    // Fala a resposta do GROQ para o cliente
    await deps.playText(groqResponse);

    // Salva o hint para o sistema continuar aprendendo
    deps.commandProcessor?.saveUnrecognizedHint(transcript);

    return true;

  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
