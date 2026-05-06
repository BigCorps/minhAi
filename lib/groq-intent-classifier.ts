// lib/groq-intent-classifier.ts — v3: confirmação via last_function_keys
import { createClient } from '@/lib/supabase-browser';

interface ClassifierDeps {
  companyId: string;
  sessionId?: string | null;
  playText: (text: string) => Promise<void>;
  groqContextRef: React.MutableRefObject<string>;
  commandProcessor: any;
  fallbackMessage?: string;
  forceResponse?: boolean;
  onFunctionDetected?: (functionKey: string) => void;
}

const GENERAL_CONVERSATION = [
  'tudo bem', 'tudo certo', 'obrigado', 'obrigada', 'valeu', 'tchau',
  'boa tarde', 'bom dia', 'boa noite',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
];

// ✅ PONTO A — confirmações que devem executar a última função sugerida
const CONFIRMATION_TRIGGERS = [
  'sim', 'pode', 'isso', 'quero', 'esse mesmo', 'esse',
  'pode ser', 'ok', 'tá bom', 'ta bom', 'claro', 'com certeza',
  'pode fazer', 'pode abrir', 'abre', 'faz isso', 'execute',
];

function isGeneralConversation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower === p.trim());
}

function isConfirmation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  // Confirmação pura: transcript é apenas uma palavra/frase curta de confirmação
  return CONFIRMATION_TRIGGERS.some(t => lower === t || lower === `${t}.` || lower === `${t}!`);
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

    const effectiveSessionId = deps.sessionId;
    let sessionContext: { summary: string; lastFunctions: string[] } | null = null;

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
      } catch { /* silencioso */ }
    }

    // ✅ PONTO A — se for confirmação pura E tiver função sugerida recentemente,
    // executa direto sem chamar o Groq — zero latência
    if (isConfirmation(transcript) && sessionContext?.lastFunctions?.length) {
      const lastFunctionKey = sessionContext.lastFunctions[sessionContext.lastFunctions.length - 1];
      console.log(`✅ Confirmação detectada → executando última função sugerida: ${lastFunctionKey}`);

      await deps.playText('Perfeito! Abrindo agora.');

      if (deps.onFunctionDetected) {
        setTimeout(() => deps.onFunctionDetected!(lastFunctionKey), 300);
      }

      // Limpa o last_function_keys da sessão para não re-executar na próxima fala
      if (effectiveSessionId) {
        const supabase = createClient();
        supabase
          .from('assistant_sessions')
          .update({ last_function_keys: [] })
          .eq('id', effectiveSessionId)
          .then(() => {})
          .catch(() => {});
      }

      return true;
    }

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        functionsContext,
        sessionContext,
        forceResponse: deps.forceResponse,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const { response: groqResponse, functionKey } = data;

    // Groq retornou null → pergunta é sobre empresa/produtos → cai pro GPT
    if (!groqResponse) {
      if (deps.forceResponse) {
        await deps.playText(deps.fallbackMessage ?? 'Não tenho informações sobre isso.');
        deps.commandProcessor?.saveUnrecognizedHint(transcript);
        return true;
      }
      console.log('💬 GROQ: pergunta geral → GPT');
      return false;
    }

    console.log(`🤖 GROQ responde: "${groqResponse}"${functionKey ? ` → executa: ${functionKey}` : ''}`);

    // Fala a resposta primeiro
    await deps.playText(groqResponse);

    // ✅ Se Groq identificou uma função, executa após falar
    if (functionKey && deps.onFunctionDetected) {
      console.log(`⚡ GROQ dispara função: ${functionKey}`);
      setTimeout(() => deps.onFunctionDetected!(functionKey), 300);

      // Salva na sessão para que uma possível confirmação futura saiba qual foi a última função
      if (effectiveSessionId) {
        const supabase = createClient();
        supabase
          .from('assistant_sessions')
          .update({ last_function_keys: [functionKey] })
          .eq('id', effectiveSessionId)
          .then(() => {})
          .catch(() => {});
      }
    } else if (!functionKey && effectiveSessionId) {
      // Groq fez uma pergunta de esclarecimento — salva contexto vazio
      // para não executar função antiga numa confirmação futura
      const supabase = createClient();
      supabase
        .from('assistant_sessions')
        .update({ last_function_keys: [] })
        .eq('id', effectiveSessionId)
        .then(() => {})
        .catch(() => {});
    }

    deps.commandProcessor?.saveUnrecognizedHint(transcript);

    // Salva memória em background
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
          function_key: functionKey ?? null,
        }),
      }
    ).catch(() => {});

    return true;

  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
