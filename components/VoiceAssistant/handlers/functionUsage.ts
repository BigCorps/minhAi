// ============================================================
// handlers/functionUsage.ts
// Caminho: components/assistant/VoiceAssistant/handlers/functionUsage.ts
// ============================================================
import { createClient } from '@/lib/supabase-browser';
import { registerPublicFunctionUsage } from '@/lib/register-public-function-usage';

// ── Cache de sessão ───────────────────────────────────────────
// Evita queries repetidas ao Supabase durante a mesma sessão do assistente.
// Os settings de função não mudam enquanto o assistente está ativo.
// Chave: `${companyId}:${functionKey}` → valor: boolean
const functionEnabledCache = new Map<string, boolean>();


/**
 * Limpa o cache de sessão.
 * Chame isso se os settings forem alterados em runtime
 * (ex: admin habilita/desabilita uma função enquanto o assistente está aberto).
 */
export function clearFunctionEnabledCache(): void {
  functionEnabledCache.clear();
  console.log('🗑️ Cache de funções limpo');
}

/**
 * Registra uso de função por contrato server-side.
 * O parâmetro creditsConsumed é mantido apenas para compatibilidade dos chamadores.
 */
export async function registerFunctionUsage(
  companyId: string,
  functionKey: string,
  creditsConsumed?: number
): Promise<void> {
  console.log('🔵 Registrando uso:', {
    functionKey,
    clientCreditsHint: creditsConsumed ?? null,
    companyId,
    billing: 'server-resolved',
  });

  const { error } = await registerPublicFunctionUsage({
    companyId,
    functionKey,
    source: 'voice_assistant',
  });

  if (error) {
    console.error('❌ ERRO registerPublicFunctionUsage:', error);
    return;
  }

  console.log('✅ Uso registrado com custo resolvido no servidor:', functionKey);
}

/**
 * Verifica se uma função está ativa globalmente e habilitada para a empresa.
 * ✅ Resultado cacheado por sessão — evita queries repetidas ao Supabase.
 */
export async function checkIfFunctionIsEnabled(
  companyId: string,
  functionKey: string
): Promise<boolean> {
  // ✅ Cache hit — retorna imediatamente sem query
  const cacheKey = `${companyId}:${functionKey}`;
  if (functionEnabledCache.has(cacheKey)) {
    const cached = functionEnabledCache.get(cacheKey)!;
    console.log(`⚡ Cache hit — ${functionKey}: ${cached ? '✅' : '❌'}`);
    return cached;
  }

  try {
    const supabase = createClient();

    // Busca is_active E default_enabled juntos
    const { data: func } = await supabase
      .from('assistant_functions')
      .select('is_active, default_enabled')
      .eq('function_key', functionKey)
      .single();

    if (!func || !func.is_active) {
      console.log(`⚠️ Função ${functionKey} não ativa globalmente`);
      functionEnabledCache.set(cacheKey, false);
      return false;
    }

    const { data: setting } = await supabase
      .from('company_function_settings')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('function_key', functionKey)
      .single();

    let result: boolean;

    if (!setting) {
      // Sem setting — usa default_enabled da função
      result = func.default_enabled ?? false;
      console.log(`${result ? '✅' : '❌'} Função ${functionKey} usando default_enabled: ${result}`);
    } else {
      result = setting.is_enabled;
      console.log(`${result ? '✅' : '❌'} Função ${functionKey} ${result ? 'habilitada' : 'desabilitada'}`);
    }

    // ✅ Armazena no cache para próximas chamadas
    functionEnabledCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error('Erro ao verificar função:', error);
    return false; // falha fechada — não cacheia erro para tentar novamente
  }
}

/**
 * Salva interação (pergunta + resposta) no histórico de conversas.
 * Gera o UUID no cliente para evitar .select('id') após o insert —
 * a policy de SELECT para anon exige auth.uid() e bloquearia a leitura.
 */
export async function saveInteractionToHistory(
  companyId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const supabase = createClient();
    const conversationId = crypto.randomUUID();

    const { error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        company_id: companyId,
        status: 'completed',
        total_messages: 2,
      });

    if (convError) {
      console.error('❌ Erro ao criar conversa:', convError);
      return;
    }

    await supabase.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: userMessage },
      { conversation_id: conversationId, role: 'assistant', content: assistantMessage },
    ]);

    console.log('✅ Salvo no histórico:', conversationId);
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}
