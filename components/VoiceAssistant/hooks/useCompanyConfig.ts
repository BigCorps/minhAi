// ============================================================
// hooks/useCompanyConfig.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useCompanyConfig.ts
// ============================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface CompanyConfig {
  wakeWord: string;
  greeting: string;
  avatarType: 'face' | 'orb' | null;
  wakeWordEnabled: boolean;
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
  const [wakeWord, setWakeWord] = useState(wakeWordProp || 'gerente');
  const [greeting, setGreeting] = useState(greetingProp || 'Oi! Como posso ajudar?');
  const [avatarType, setAvatarType] = useState<'face' | 'orb' | null>(null);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);

  useEffect(() => {
    async function loadCompanyConfig() {
      if (!companyId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('wake_word, greeting_message, assistant_avatar_type, wake_word_enabled')
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
          setAvatarType((data.assistant_avatar_type as 'face' | 'orb') ?? 'face');
          setWakeWordEnabled(data.wake_word_enabled ?? true);

          console.log('✅ Config carregada — Wake word:', wakeWordFromDb);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar config:', error);
      }
    }

    loadCompanyConfig();
  }, [companyId, wakeWordProp, greetingProp]);

  return { wakeWord, greeting, avatarType, wakeWordEnabled };
}
