// ============================================================
// hooks/useFunctionSettings.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useFunctionSettings.ts
// ============================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { FunctionSettings } from '../types';

/**
 * Carrega configurações de cada função (créditos, habilitado, etc.)
 * com JOIN entre assistant_functions e company_function_settings.
 */
export function useFunctionSettings(companyId: string): Record<string, FunctionSettings> {
  const [functionSettings, setFunctionSettings] = useState<Record<string, FunctionSettings>>({});

  useEffect(() => {
    async function loadFunctionSettings() {
      if (!companyId) return;

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('assistant_functions')
          .select(`
            function_key,
            save_to_history,
            credits_per_use,
            company_function_settings!inner(
              is_enabled,
              custom_credits_per_use
            )
          `)
          .eq('company_function_settings.company_id', companyId)
          .eq('is_active', true);

        if (error || !data) {
          // Fallback: buscar sem join
          const { data: fallback } = await supabase
            .from('assistant_functions')
            .select('function_key, save_to_history, credits_per_use')
            .eq('is_active', true);

          if (fallback) {
            const settings: Record<string, FunctionSettings> = {};
            fallback.forEach(f => {
              settings[f.function_key] = {
                saveToHistory: f.save_to_history,
                creditsPerUse: f.credits_per_use,
                isEnabled: true,
              };
            });
            setFunctionSettings(settings);
            console.log('✅ Function settings (fallback) carregados');
          }
          return;
        }

        const settings: Record<string, FunctionSettings> = {};
        data.forEach(f => {
          const companySetting = f.company_function_settings?.[0];
          settings[f.function_key] = {
            saveToHistory: f.save_to_history,
            creditsPerUse: companySetting?.custom_credits_per_use ?? f.credits_per_use,
            isEnabled: companySetting?.is_enabled ?? true,
          };
        });

        setFunctionSettings(settings);
        console.log('✅ Function settings carregados');
      } catch (error) {
        console.error('❌ Erro ao carregar function settings:', error);
      }
    }

    loadFunctionSettings();
  }, [companyId]);

  return functionSettings;
}