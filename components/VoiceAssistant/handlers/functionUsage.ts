// ============================================================
// handlers/functionUsage.ts
// Caminho: components/assistant/VoiceAssistant/handlers/functionUsage.ts
// ============================================================

import { createClient } from '@/lib/supabase-browser';

/**
 * Registra uso de uma função no Supabase via RPC.
 * Debita créditos da empresa automaticamente.
 */
export async function registerFunctionUsage(
  companyId: string,
  functionKey: string,
  creditsConsumed: number
): Promise<void> {
  console.log('🔵 Registrando uso:', { functionKey, creditsConsumed, companyId });

  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('register_function_usage', {
      p_company_id: companyId,
      p_function_key: functionKey,
      p_credits_consumed: creditsConsumed,
    });

    if (error) {
      console.error('❌ ERRO RPC:', error);
      return;
    }

    console.log('✅ Uso registrado:', functionKey, creditsConsumed, 'créditos — Resposta:', data);
  } catch (error) {
    console.error('❌ ERRO GERAL ao registrar uso:', error);
  }
}

/**
 * Verifica se uma função está ativa globalmente e habilitada para a empresa.
 */
export async function checkIfFunctionIsEnabled(
  companyId: string,
  functionKey: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: func } = await supabase
      .from('assistant_functions')
      .select('is_active')
      .eq('function_key', functionKey)
      .single();

    if (!func || !func.is_active) {
      console.log(`⚠️ Função ${functionKey} não ativa globalmente`);
      return false;
    }

    const { data: setting } = await supabase
      .from('company_function_settings')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('function_key', functionKey)
      .single();

    if (!setting) {
      console.log(`✅ Função ${functionKey} habilitada (sem setting específico)`);
      return true;
    }

    console.log(
      `${setting.is_enabled ? '✅' : '❌'} Função ${functionKey} ${setting.is_enabled ? 'habilitada' : 'desabilitada'}`
    );
    return setting.is_enabled;
  } catch (error) {
    console.error('Erro ao verificar função:', error);
    return true;
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