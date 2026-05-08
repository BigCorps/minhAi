// lib/groq-intent-classifier.ts — v4: Fix 2 + Fix 3 (payment_choice + detectPendingContext)
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

// Confirmações que devem executar a última função sugerida
const CONFIRMATION_TRIGGERS = [
  'sim', 'pode', 'isso', 'quero', 'esse mesmo', 'esse',
  'pode ser', 'ok', 'tá bom', 'ta bom', 'claro', 'com certeza',
  'pode fazer', 'pode abrir', 'abre', 'faz isso', 'execute',
];

// Fix 2 — Detecta qual grupo de funções foi sugerido pela pergunta de esclarecimento
// Usado para salvar __payment_choice__ quando Groq pergunta "débito, crédito ou PIX?"
function detectPendingContext(groqResponse: string): string {
  const lower = groqResponse.toLowerCase();
  if (
    lower.includes('pix') ||
    lower.includes('débito') ||
    lower.includes('debito') ||
    lower.includes('crédito') ||
    lower.includes('credito')
  ) {
    return '__payment_choice__';
  }
  return '__clarification__';
}

// Fix 3 — Resolve método de pagamento a partir da resposta do cliente
// ex: "pix" → pix_generate | "débito" → nfc_debito | "crédito" → nfc_credito
function resolvePaymentMethod(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  if (lower.includes('pix')) return 'pix_generate';
  if (lower.includes('débito') || lower.includes('debito')) return 'nfc_debito';
  if (lower.includes('crédito') || lower.includes('credito')) return 'nfc_credito';
  return null;
}

function isGeneralConversation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower === p.trim());
}

function isConfirmation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
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

    // Se for confirmação pura E tiver função sugerida recentemente,
    // executa direto sem chamar o Groq — zero latência
    if (isConfirmation(transcript) && sessionContext?.lastFunctions?.length) {
      const lastFunctionKey = sessionContext.lastFunctions[sessionContext.lastFunctions.length - 1];

      // Função pendente esperando valor numérico (ex: link_pagamento sem valor)
      if (lastFunctionKey?.startsWith('__pending__')) {
        const pendingFunction = lastFunctionKey.replace('__pending__', '');
        const amountMatch = transcript.match(/(\d+(?:[,.]?\d{1,2})?)/);

        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(',', '.'));
          console.log(`💰 Valor ${amount} detectado → executando ${pendingFunction} com valor`);

          if (effectiveSessionId) {
            const supabase = createClient();
            supabase
              .from('assistant_sessions')
              .update({ last_function_keys: [] })
              .eq('id', effectiveSessionId)
              .then(() => {}).catch(() => {});
          }

          await deps.playText('Gerando agora.');

          if (deps.onFunctionDetected) {
            setTimeout(() => deps.onFunctionDetected!(`${pendingFunction}:${amount}`), 300);
          }
          return true;
        }
        // Sem valor numérico — cai pro Groq para perguntar o valor

      // Fix 3 — tratamento especial para __payment_choice__:
      // quando o cliente responde "pix", "débito" ou "crédito", resolve direto
      } else if (lastFunctionKey === '__payment_choice__') {
        const resolved = resolvePaymentMethod(transcript);
        if (resolved) {
          console.log(`💳 Fix3: __payment_choice__ → ${transcript} → ${resolved}`);
          await deps.playText('Abrindo agora.');
          if (deps.onFunctionDetected) {
            setTimeout(() => deps.onFunctionDetected!(resolved), 300);
          }
          if (effectiveSessionId) {
            const supabase = createClient();
            supabase
              .from('assistant_sessions')
              .update({ last_function_keys: [] })
              .eq('id', effectiveSessionId)
              .then(() => {}).catch(() => {});
          }
          return true;
        }
        // Não reconheceu o método — cai pro Groq
        console.log('💳 Fix3: __payment_choice__ — método não reconhecido, seguindo para Groq');
      } else {
        // Confirmação normal — executa última função sugerida
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

    // Se Groq identificou uma função, executa após falar
    if (functionKey && deps.onFunctionDetected) {
      console.log(`⚡ GROQ dispara função: ${functionKey}`);

      // Detecta se o transcript já contém um valor numérico
      const hasAmount = /\d+([,.]?\d{1,2})?/.test(transcript);

      setTimeout(() => deps.onFunctionDetected!(functionKey), 300);

      if (effectiveSessionId) {
        const supabase = createClient();
        const functionsNeedingAmount = ['pix_generate', 'link_pagamento', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito'];

        if (!hasAmount && functionsNeedingAmount.includes(functionKey)) {
          // Sem valor — salva como pendente esperando o próximo transcript
          console.log(`⏳ Função ${functionKey} pendente — aguardando valor`);
          supabase
            .from('assistant_sessions')
            .update({ last_function_keys: [`__pending__${functionKey}`] })
            .eq('id', effectiveSessionId)
            .then(() => {}).catch(() => {});
        } else {
          // Valor já informado ou função não precisa de valor — salva normalmente
          supabase
            .from('assistant_sessions')
            .update({ last_function_keys: [functionKey] })
            .eq('id', effectiveSessionId)
            .then(() => {})
            .catch(() => {});
        }
      }
    } else if (!functionKey && effectiveSessionId) {
      // Fix 2 — Groq fez uma pergunta de esclarecimento:
      // detecta o contexto pendente (ex: __payment_choice__) e salva na sessão
      // em vez de salvar array vazio, preservando o contexto para a próxima fala
      const pendingContext = detectPendingContext(groqResponse);
      console.log(`💬 Fix2: pergunta de esclarecimento → salvando contexto: ${pendingContext}`);
      const supabase = createClient();
      supabase
        .from('assistant_sessions')
        .update({ last_function_keys: [pendingContext] })
        .eq('id', effectiveSessionId)
        .then(() => {})
        .catch(() => {});
    }

    deps.commandProcessor?.saveUnrecognizedHint(transcript);

// Salva memória em background — só se tiver sessionId válido
    if (effectiveSessionId) {
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
    }

    return true;

  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
