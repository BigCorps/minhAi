// lib/groq-intent-classifier.ts — v5: contexto pendente fora do isConfirmation
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

const CONFIRMATION_TRIGGERS = [
  'sim', 'pode', 'isso', 'quero', 'esse mesmo', 'esse',
  'pode ser', 'ok', 'tá bom', 'ta bom', 'claro', 'com certeza',
  'pode fazer', 'pode abrir', 'abre', 'faz isso', 'execute',
];

function detectPendingContext(groqResponse: string): string {
  const lower = groqResponse.toLowerCase();
  if (
    lower.includes('pix') ||
    lower.includes('débito') ||
    lower.includes('debito') ||
    lower.includes('crédito') ||
    lower.includes('credito') ||
    lower.includes('link')
  ) {
    return '__payment_choice__';
  }
  return '__clarification__';
}

function resolvePaymentMethod(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  if (lower.includes('pix')) return 'pix_generate';
  if (lower.includes('link')) return 'link_pagamento';
  if (lower.includes('débito') || lower.includes('debito')) return 'nfc_debito';
  if (lower.includes('crédito') || lower.includes('credito')) return 'nfc_credito';
  if (lower.includes('tef debito') || lower.includes('tef débito')) return 'tef_debito';
  if (lower.includes('tef credito') || lower.includes('tef crédito')) return 'tef_credito';
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
    let conversationHistory: Array<{ role: string; content: string }> = [];
    
    if (effectiveSessionId) {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase
          .from('assistant_sessions')
          .select('context_summary, last_function_keys, messages')
          .eq('id', effectiveSessionId)
          .eq('company_id', deps.companyId)
          .maybeSingle();
        if (sessionData) {
          sessionContext = {
            summary: sessionData.context_summary ?? '',
            lastFunctions: sessionData.last_function_keys ?? [],
          };
          // Histórico recente — últimas 6 trocas para contexto de preço/produto
          conversationHistory = (sessionData.messages ?? []).slice(-6);
        }
      } catch { /* silencioso */ }
    }

    // ── Resolução de contexto pendente (independente de confirmação) ──────────
    if (sessionContext?.lastFunctions?.length) {
      const lastFunctionKey = sessionContext.lastFunctions[sessionContext.lastFunctions.length - 1];

      // 1. Função pendente esperando valor numérico (ex: __pending__pix_generate)
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
        } else {
          // Sem valor numérico — tenta extrair preço do histórico de conversa
          const allMessages = conversationHistory;
          const priceInHistory = allMessages
            .slice()
            .reverse()
            .find(m => /R\$\s*\d+/.test(m.content));

          if (priceInHistory) {
            const priceMatch = priceInHistory.content.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/);
            if (priceMatch) {
              const amount = parseFloat(priceMatch[1].replace(',', '.'));
              console.log(`💡 Preço inferido do histórico: R$${amount}`);

              if (effectiveSessionId) {
                const supabase = createClient();
                supabase
                  .from('assistant_sessions')
                  .update({ last_function_keys: [] })
                  .eq('id', effectiveSessionId)
                  .then(() => {}).catch(() => {});
              }

              await deps.playText(`Gerando agora.`);
              if (deps.onFunctionDetected) {
                setTimeout(() => deps.onFunctionDetected!(`${pendingFunction}:${amount}`), 300);
              }
              return true;
            }
          }

          // Sem preço no histórico — pede o valor
          await deps.playText(`Qual o valor para ${pendingFunction === 'pix_generate' ? 'o PIX' : 'o link de pagamento'}?`);
          return true;
        }

          await deps.playText('Gerando agora.');

          if (deps.onFunctionDetected) {
            setTimeout(() => deps.onFunctionDetected!(`${pendingFunction}:${amount}`), 300);
          }
          return true;
        }
        // Sem valor numérico — cai pro Groq para perguntar o valor

      // 2. Aguardando escolha do método de pagamento (qualquer fala, não só confirmação)
      } else if (lastFunctionKey === '__payment_choice__') {
        const resolved = resolvePaymentMethod(transcript);
        if (resolved) {
          console.log(`💳 __payment_choice__ → "${transcript}" → ${resolved}`);

          // Salva como __pending__ aguardando o valor
          if (effectiveSessionId) {
            const supabase = createClient();
            supabase
              .from('assistant_sessions')
              .update({ last_function_keys: [`__pending__${resolved}`] })
              .eq('id', effectiveSessionId)
              .then(() => {}).catch(() => {});
          }

          await deps.playText('Ótimo! Qual o valor?');
          return true;
        }
        // Método não reconhecido — cai pro Groq
        console.log('💳 __payment_choice__ — método não reconhecido, seguindo para Groq');

      // 3. Confirmação de função normal (não token interno)
      } else if (!lastFunctionKey.startsWith('__') && isConfirmation(transcript)) {
        console.log(`✅ Confirmação detectada → executando: ${lastFunctionKey}`);
        await deps.playText('Perfeito! Abrindo agora.');
        if (deps.onFunctionDetected) {
          setTimeout(() => deps.onFunctionDetected!(lastFunctionKey), 300);
        }
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

    // ── Chama o GROQ para classificar a intenção ──────────────────────────────
    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        functionsContext,
        sessionContext,
        forceResponse: deps.forceResponse,
        conversationHistory,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const { response: groqResponse, functionKey } = data;

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

    await deps.playText(groqResponse);

    if (functionKey && deps.onFunctionDetected) {
      console.log(`⚡ GROQ dispara função: ${functionKey}`);

      const hasAmount = /\d+([,.]?\d{1,2})?/.test(transcript);
      
      // DEIXE APENAS ESTA DECLARAÇÃO COM A LISTA COMPLETA
      const functionsNeedingAmount = ['pix_generate', 'link_pagamento', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito'];
      const needsAmount = functionsNeedingAmount.includes(functionKey);

      // Se o transcript menciona produto junto com pagamento,
      // confirmar produto primeiro antes de executar o pagamento
      const hasProductMention = conversationHistory.some(m =>
        m.role === 'assistant' && /R\$\s*\d+/.test(m.content)
      );

      if (needsAmount && !hasProductMention) {
        // GPT ainda não informou o preço — deixa o GPT responder primeiro
        console.log(`⏸️ Pagamento solicitado mas sem preço no histórico — deixando GPT responder`);
        return false; // cai pro GPT
      }

      if (!hasAmount && needsAmount) {
        // Sem valor — salva como pendente, NÃO dispara ainda
        console.log(`⏳ Função ${functionKey} pendente — aguardando valor do cliente`);
        if (effectiveSessionId) {
          const supabase = createClient();
          supabase
            .from('assistant_sessions')
            .update({ last_function_keys: [functionKey] })
            .eq('id', effectiveSessionId)
            .then(() => {})
            .catch(() => {});
        }
      }
    } else if (!functionKey && effectiveSessionId) {
      // Groq fez pergunta de esclarecimento — detecta contexto e salva
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
