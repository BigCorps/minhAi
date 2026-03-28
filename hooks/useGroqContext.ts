// hooks/useGroqContext.ts
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getAllFunctions } from '@/lib/functions-registry';

interface SlugProfileBasic {
  nome: string;
  email?: string | null;
  identificador?: string | null;
}

export function useGroqContext(
  companyId: string,
  profile?: SlugProfileBasic | null
) {
  const contextRef = useRef<string>('');

  useEffect(() => {
    if (!companyId) return;

    async function buildContext() {
      // 1. Funções do registry
      const registryFunctions = getAllFunctions().map(fn => ({
        key: fn.functionKey,
        name: fn.functionName,
        triggers: fn.voiceTriggers.slice(0, 3),
        example: fn.examplePhrases?.[0] ?? '',
      }));

      // 2. Funções habilitadas do banco para esta empresa
      const supabase = createClient();
      const { data: enabled } = await supabase
        .from('company_function_settings')
        .select('function_key')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      const enabledKeys = new Set([
        ...(enabled?.map(r => r.function_key) ?? []),
      ]);

      // 3. Buscar default_enabled do banco
      const { data: defaults } = await supabase
        .from('assistant_functions')
        .select('function_key, default_enabled')
        .eq('is_active', true);

      defaults?.forEach(r => {
        if (r.default_enabled) enabledKeys.add(r.function_key);
      });

      // 4. Montar lista final apenas das habilitadas
      const functionLines = registryFunctions
        .filter(fn => enabledKeys.has(fn.key))
        .map(fn => `- ${fn.name} → diga: "${fn.triggers[0]}" (ex: "${fn.example}")`)
        .join('\n');

      // 5. Contexto do perfil logado (se houver)
      const profileContext = profile
        ? `\nCliente logado: ${profile.nome}${profile.email ? ` (${profile.email})` : ''}${profile.identificador ? `, tel: ${profile.identificador}` : ''}`
        : '';

      contextRef.current = functionLines + profileContext;
      console.log(`✅ GROQ context carregado: ${enabledKeys.size} funções${profile ? ` | Cliente: ${profile.nome}` : ''}`);
    }

    buildContext();
  }, [companyId, profile]);

  return contextRef;
}
