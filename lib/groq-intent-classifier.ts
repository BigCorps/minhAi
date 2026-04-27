// lib/groq-intent-classifier.ts
import { createClient } from '@/lib/supabase-browser';

interface ClassifierDeps {
  companyId: string;
  sessionId?: string | null;
  playText: (text: string) => Promise<void>;
  groqContextRef: React.MutableRefObject<string>;
  commandProcessor: any;
  fallbackMessage?: string;
  forceResponse?: boolean;
}

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
    if (isGeneralConversation(transcript)) {
      console.log('💬 GROQ pulado: conversa trivial');
      return false;
    }

    const functionsContext = deps.groqContextRef.current;
    if (!functionsContext) {
      console.log('⚠️ GROQ: contexto ainda não carregado');
      return false;
    }

    // ── Fase 2: buscar contexto de memória ──
    const effectiveSessionId = deps.sessionId;

let sessionContext = null;
if (effectiveSessionId) {
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
    } catch (_e) { /* silencioso */ }

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, functionsContext, sessionContext }),
    });

    if (!response.ok) return false;

    const { response: groqResponse } = await response.json();
if (!groqResponse) {
  if (deps.forceResponse) {
    await deps.playText(deps.fallbackMessage ?? 'Não tenho informações sobre isso.');
    deps.commandProcessor?.saveUnrecognizedHint(transcript);
    return true;
  }
  console.log('💬 GROQ: conversa geral → GPT');
  return false;
}

    console.log(`🤖 GROQ responde: "${groqResponse}"`);
    await deps.playText(groqResponse);
    deps.commandProcessor?.saveUnrecognizedHint(transcript);

    // ── Fase 2: salvar memória após resposta ──
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
