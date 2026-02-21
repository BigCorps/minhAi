// ============================================================
// hooks/useCompanyConfig.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useCompanyConfig.ts
// ============================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface CompanyConfig {
  wakeWord: string;
  greeting: string;
}

/**
 * Carrega wake word e saudação da empresa a partir do banco.
 * Faz fallback para os props caso não encontre no banco.
 */
export function useCompanyConfig(
  companyId: string,
  wakeWordProp: string,
  greetingProp: string
): CompanyConfig {
  const [wakeWord, setWakeWord] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    async function loadCompanyConfig() {
      if (!companyId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('wake_word, greeting_message')
          .eq('id', companyId)
          .single();

        if (error) {
          console.error('❌ Erro ao carregar config:', error);
          return;
        }

        if (data) {
          const wakeWordFromDb = data.wake_word || wakeWordProp || 'gerente';
          const greetingFromDb = data.greeting_message || greetingProp || 'Oi! Como posso ajudar?';

          setWakeWord(wakeWordFromDb);
          setGreeting(greetingFromDb);

          console.log('✅ Config carregada — Wake word:', wakeWordFromDb);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar config:', error);
      }
    }

    loadCompanyConfig();
  }, [companyId, wakeWordProp, greetingProp]);

  return { wakeWord, greeting };
}