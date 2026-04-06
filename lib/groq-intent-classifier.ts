// lib/groq-intent-classifier.ts

import { createClient } from '@/lib/supabase-browser';
import { getAllFunctions } from '@/lib/functions-registry';

interface ClassifierDeps {
  companyId: string;
  sessionId?: string | null;      // ← novo
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

    let sessionContext = null;
    const effectiveSessionId = deps.sessionId ?? `groq-${deps.companyId}`;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase
        .from('assistant_sessions')
        .select('context_summary, last_function_keys')
        .eq('id', effectiveSessionId)
          .eq('company_id', deps.companyId)
          .maybeSingle();

        if (sessionData) {
          sessionContext = {
            summary: sessionData.context_summary ?? '',
            lastFunctions: sessionData.last_function_keys ?? [],
          };
        }
      } catch (_e) { /* silencioso — memória é enhancement, não bloqueante */ }
    }

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, functionsContext, sessionContext }),
    });

    if (!response.ok) return false;

    const { response: groqResponse } = await response.json();

    if (!groqResponse) {
      console.log('💬 GROQ: conversa geral → GPT');
      return false;
    }

    console.log(`🤖 GROQ responde: "${groqResponse}"`);
    await deps.playText(groqResponse);
    deps.commandProcessor?.saveUnrecognizedHint(transcript);

    // ── Fase 2: atualizar memória após resposta do GROQ ──
    // Usa company_id como session_id quando não há sessionId
    // (interações via GROQ não passam pelo backend que gera o sessionId)
    const effectiveSessionId = deps.sessionId ?? `groq-${deps.companyId}`;
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-session-memory`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: effectiveSessionId,
          company_id: deps.companyId,
          user_message: transcript,
          assistant_message: groqResponse,
          function_key: null,
        }),
      }
    ).catch(() => {});

    return true;

  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
