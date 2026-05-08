// ============================================================
// handlers/functionUsage.ts
// Caminho: components/assistant/VoiceAssistant/handlers/functionUsage.ts
// ============================================================
import { createClient } from '@/lib/supabase-browser';

// ── Cache de sessão ───────────────────────────────────────────
// Evita queries repetidas ao Supabase durante a mesma sessão do assistente.
// Os settings de função não mudam enquanto o assistente está ativo.
// Chave: `${companyId}:${functionKey}` → valor: boolean
const functionEnabledCache = new Map<string, boolean>();

// Cache de créditos por função/empresa
// Chave: `${companyId}:${functionKey}` → valor: number
const functionCreditsCache = new Map<string, number>();

/**
 * Limpa o cache de sessão.
 * Chame isso se os settings forem alterados em runtime
 * (ex: admin habilita/desabilita uma função enquanto o assistente está aberto).
 */
export function clearFunctionEnabledCache(): void {
  functionEnabledCache.clear();
  functionCreditsCache.clear();
  console.log('🗑️ Cache de funções limpo');
}

/**
 * Busca o número de créditos por uso de uma função.
 * Respeita custom_credits_per_use da empresa, com fallback para credits_per_use global.
 * Resultado cacheado por sessão.
 */
async function getCreditsPerUse(companyId: string, functionKey: string): Promise<number> {
  const cacheKey = `${companyId}:${functionKey}`;
  if (functionCreditsCache.has(cacheKey)) {
    return functionCreditsCache.get(cacheKey)!;
  }
  try {
    const supabase = createClient();
    // Tenta buscar custom_credits_per_use da empresa primeiro
    const { data: setting } = await supabase
      .from('company_function_settings')
      .select('custom_credits_per_use')
      .eq('company_id', companyId)
      .eq('function_key', functionKey)
      .maybeSingle();

    if (setting?.custom_credits_per_use != null) {
      functionCreditsCache.set(cacheKey, setting.custom_credits_per_use);
      return setting.custom_credits_per_use;
    }

    // Fallback: credits_per_use global da função
    const { data: func } = await supabase
      .from('assistant_functions')
      .select('credits_per_use')
      .eq('function_key', functionKey)
      .maybeSingle();

    const credits = func?.credits_per_use ?? 0;
    functionCreditsCache.set(cacheKey, credits);
    return credits;
  } catch {
    return 0;
  }
}

/**
 * Registra uso de uma função no Supabase via RPC.
 * Debita créditos da empresa automaticamente.
 * Se creditsConsumed não for informado (undefined), busca o valor correto
 * do banco — útil quando chamado antes do hook useFunctionSettings carregar.
 */
export async function registerFunctionUsage(
  companyId: string,
  functionKey: string,
  creditsConsumed?: number
): Promise<void> {
  // Se não foi passado valor explícito, busca do banco (garante valor correto
  // mesmo quando o carrossel dispara antes do hook useFunctionSettings hidratar)
  const credits = creditsConsumed ?? await getCreditsPerUse(companyId, functionKey);
  console.log('🔵 Registrando uso:', { functionKey, creditsConsumed: credits, companyId });
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('register_function_usage', {
      p_company_id: companyId,
      p_function_key: functionKey,
      p_credits_consumed: credits,
    });
    if (error) {
      console.error('❌ ERRO RPC:', error);
      return;
    }
    console.log('✅ Uso registrado:', functionKey, credits, 'créditos — Resposta:', data);
  } catch (error) {
    console.error('❌ ERRO GERAL ao registrar uso:', error);
  }
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
 */
export async function saveInteractionToHistory(
  companyId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        company_id: companyId,
        status: 'completed',
        total_messages: 2,
      })
      .select('id')
      .single();

    if (convError) {
      console.error('❌ Erro ao criar conversa:', convError);
      return;
    }

    await supabase.from('messages').insert([
      { conversation_id: conv.id, role: 'user', content: userMessage },
      { conversation_id: conv.id, role: 'assistant', content: assistantMessage },
    ]);

    console.log('✅ Salvo no histórico:', conv.id);
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}
