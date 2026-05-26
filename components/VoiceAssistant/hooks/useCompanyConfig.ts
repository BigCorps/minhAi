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
  ttsVoice: string;
  presenceGreetingEnabled: boolean;
  inactivityTimeoutSeconds: number;
  inactivityAction: 'feature_highlight' | 'offers_panel' | 'restart';
  vadVolumeThreshold: number;
  vadSilenceThreshold: number;
  wakeWordSensitivity: number;
}

/**
 * Carrega wake word, saudação e configurações de comportamento da empresa.
 * Faz fallback para os props / defaults caso não encontre no banco.
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
  const [ttsVoice, setTtsVoice] = useState('pt-BR-Neural2-B');
  // Fase 4 — defaults espelham os defaults do banco (Fase 1)
  const [presenceGreetingEnabled, setPresenceGreetingEnabled] = useState(false);
  const [inactivityTimeoutSeconds, setInactivityTimeoutSeconds] = useState(300);
  const [inactivityAction, setInactivityAction] = useState<'feature_highlight' | 'offers_panel' | 'restart'>('feature_highlight');

  useEffect(() => {
    async function loadCompanyConfig() {
      if (!companyId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select(`
            wake_word,
            greeting_message,
            assistant_avatar_type,
            wake_word_enabled,
            presence_greeting_enabled,
            inactivity_timeout_seconds,
            inactivity_action,
            tts_voice
          `)
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
          setTtsVoice(data.tts_voice ?? 'pt-BR-Neural2-B');

          // Fase 4 — novos campos com fallback para defaults do banco
          setPresenceGreetingEnabled(data.presence_greeting_enabled ?? false);
          setInactivityTimeoutSeconds(data.inactivity_timeout_seconds ?? 300);
          setInactivityAction(
            (data.inactivity_action as 'feature_highlight' | 'offers_panel' | 'restart') ?? 'feature_highlight'
          );

          console.log('✅ Config carregada — Wake word:', wakeWordFromDb, '| Presença:', data.presence_greeting_enabled, '| Inatividade:', data.inactivity_timeout_seconds, 's →', data.inactivity_action);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar config:', error);
      }
    }

    loadCompanyConfig();
  }, [companyId, wakeWordProp, greetingProp]);

  return {
    wakeWord,
    greeting,
    avatarType,
    wakeWordEnabled,
    ttsVoice,
    presenceGreetingEnabled,
    inactivityTimeoutSeconds,
    inactivityAction,
  };
}
